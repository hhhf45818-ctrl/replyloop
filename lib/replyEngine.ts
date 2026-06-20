// ════════════════════════════════════════════════════════════════
// The reply engine: turns the user's ACTIVE skills into a Claude
// system prompt. Used by the Test Replyloop page; the process-ticket
// edge function implements the identical logic in Deno.
// ════════════════════════════════════════════════════════════════

import type { Skill } from "./types";

/** Render every active skill into the structured context block. */
export function buildSkillsContext(activeSkills: Skill[]): string {
  return activeSkills
    .map(
      (s) => `
SKILL: ${s.name}
Use when: ${s.trigger}
How to handle: ${s.handle}
Tone: ${s.tone || "Professional and helpful"}
Escalate if: ${s.escalate || "Customer seems very frustrated or issue is complex"}
${s.example ? `Example reply: ${s.example}` : ""}
---`
    )
    .join("\n");
}

/** Full system prompt with all active skills injected. */
export function buildSystemPrompt(activeSkills: Skill[]): string {
  return `You are an AI customer support assistant. You must reply to customer emails following the specific skill instructions provided.

ACTIVE SKILLS:
${buildSkillsContext(activeSkills)}

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

/** Build the user message describing the incoming email. */
export function buildUserMessage(input: {
  name: string;
  email: string;
  subject: string;
  body: string;
}): string {
  return `Customer name: ${input.name}
Customer email: ${input.email}
Subject: ${input.subject}

Email:
${input.body}

Write a reply following the most appropriate skill. Remember to use the customer's first name.`;
}

/**
 * Heuristic: pick which active skill most likely matched, based on the
 * email text overlapping a skill's trigger keywords.
 */
export function matchSkill(
  activeSkills: Skill[],
  subject: string,
  body: string
): Skill | undefined {
  const lower = (subject + " " + body).toLowerCase();
  for (const s of activeSkills) {
    const keywords = s.trigger.toLowerCase().split(/\s+/);
    const hits = keywords.filter((k) => k.length > 4 && lower.includes(k)).length;
    if (hits > 0) return s;
  }
  return activeSkills[0];
}
