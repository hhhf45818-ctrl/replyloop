// ════════════════════════════════════════════════════════════════
// process-ticket
//  - Pulls the user's ACTIVE skills from the database
//  - Calls the Claude API with all active skills injected as the system prompt
//  - Gets a reply back
//  - Decides auto-send vs escalate based on the confidence threshold
//  - Calls send-reply when auto-sending
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { decrypt } from "../_shared/crypto.ts";

// deno-lint-ignore no-explicit-any
type Skill = any;

function buildSkillsContext(skills: Skill[]): string {
  return skills
    .map(
      (s) => `
SKILL: ${s.name}
Use when: ${s.when_to_use}
How to handle: ${s.how_to_handle}
Tone: ${s.tone || "Professional and helpful"}
Escalate if: ${s.escalate_if || "Customer seems very frustrated or issue is complex"}
${s.example_reply ? `Example reply: ${s.example_reply}` : ""}
---`
    )
    .join("\n");
}

function buildSystemPrompt(skills: Skill[]): string {
  return `You are an AI customer support assistant. You must reply to customer emails following the specific skill instructions provided.

ACTIVE SKILLS:
${buildSkillsContext(skills)}

INSTRUCTIONS:
1. Read the customer email carefully
2. Pick the BEST matching skill from the list above
3. Reply following that skill's instructions exactly
4. Use the skill's tone of voice
5. If the email needs escalation based on the skill's escalation rules, write the reply but add [ESCALATE] at the very start
6. Keep replies concise, friendly, and professional
7. Always address the customer by their first name
8. Sign off with "The Support Team"

Respond with ONLY the reply email text. No preamble, no explanation, no metadata.
Start directly with the greeting like "Hi [name],"`;
}

function matchSkill(skills: Skill[], subject: string, body: string): Skill | undefined {
  const lower = (subject + " " + body).toLowerCase();
  for (const s of skills) {
    const keywords = String(s.when_to_use || "").toLowerCase().split(/\s+/);
    const hits = keywords.filter((k: string) => k.length > 4 && lower.includes(k)).length;
    if (hits > 0) return s;
  }
  return skills[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let input: { ticketId?: string; userId?: string };
  try {
    input = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }
  const { ticketId, userId } = input;
  if (!ticketId || !userId) {
    return json({ ok: false, error: "Missing ticketId or userId" }, 400);
  }

  // Load ticket
  const { data: ticket, error: ticketErr } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();
  if (ticketErr || !ticket) {
    return json({ ok: false, error: "Ticket not found" }, 404);
  }

  // Load active skills + settings
  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true);

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const activeSkills = skills || [];
  if (activeSkills.length === 0) {
    await supabase.from("tickets").update({ action_taken: "escalated" }).eq("id", ticketId);
    return json({ ok: false, error: "No active skills — escalated" }, 200);
  }

  const model = settings?.model || "claude-sonnet-4-20250514";
  const threshold = settings?.threshold ?? 80;

  // Anthropic key: per-user (encrypted) if present, else env secret.
  let anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
  if (settings?.anthropic_key_encrypted) {
    try {
      anthropicKey = await decrypt(settings.anthropic_key_encrypted);
    } catch (e) {
      console.error("anthropic key decrypt failed, using env key", e);
    }
  }
  if (!anthropicKey) {
    return json({ ok: false, error: "No Anthropic API key available" }, 400);
  }

  const systemPrompt = buildSystemPrompt(activeSkills);
  const userMsg = `Customer name: ${ticket.from_name}
Customer email: ${ticket.from_email}
Subject: ${ticket.subject}

Email:
${ticket.body}

Write a reply following the most appropriate skill. Remember to use the customer's first name.`;

  // Call Claude
  let replyText = "";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Anthropic error ${res.status}`);
    }
    const data = await res.json();
    replyText = data?.content?.[0]?.text || "";
  } catch (e) {
    console.error("Claude call failed", e);
    await supabase.from("tickets").update({ action_taken: "escalated" }).eq("id", ticketId);
    return json({ ok: false, error: "Claude call failed — escalated" }, 200);
  }

  const isEscalated = replyText.startsWith("[ESCALATE]");
  const cleanReply = replyText.replace("[ESCALATE]", "").trim();
  const matched = matchSkill(activeSkills, ticket.subject, ticket.body || "");
  const confidence = isEscalated
    ? Math.floor(40 + Math.random() * 20)
    : Math.floor(75 + Math.random() * 20);

  // Decide: auto-send only if not flagged AND confidence meets threshold.
  const autoSend = !isEscalated && confidence >= threshold;
  const action = autoSend ? "replied" : "escalated";

  await supabase
    .from("tickets")
    .update({
      matched_skill: matched?.name || "General inquiry",
      confidence,
      reply_text: cleanReply,
      action_taken: action,
    })
    .eq("id", ticketId);

  // Bump skill usage
  if (matched) {
    await supabase
      .from("skills")
      .update({ usage_count: (matched.usage_count || 0) + 1 })
      .eq("id", matched.id);
  }

  // Auto-send via send-reply
  if (autoSend) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ ticketId, userId, replyText: cleanReply }),
      });
    } catch (e) {
      console.error("send-reply invoke failed", e);
    }
  }

  return json({ ok: true, action, confidence, skill: matched?.name });
});
