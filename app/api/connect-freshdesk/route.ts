// POST /api/connect-freshdesk
// 1. Validates the Freshdesk credentials.
// 2. Encrypts + saves them to the settings table (service role).
// 3. Best-effort: registers a ticket-created webhook on the customer's
//    Freshdesk that points at our freshdesk-webhook edge function.
//
// NOTE on automatic webhook creation: Freshdesk does not expose a fully
// documented, plan-agnostic public endpoint to create automation/observer
// webhooks. We attempt the automation-rules endpoint and, if it is not
// available, return the webhook URL so the user can paste it into
// Freshdesk → Admin → Automations. Credentials are still saved either way.

import { NextResponse } from "next/server";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

interface Body {
  userId?: string;
  domain?: string;
  key?: string;
}

function normalizeDomain(domain: string): string {
  let d = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!d.includes(".")) d = `${d}.freshdesk.com`;
  return d;
}

function webhookUrl(userId: string): string | null {
  // Only meaningful once Supabase is configured — the inbound pipeline
  // lives in the Supabase edge function, not on Vercel.
  if (!isSupabaseConfigured()) return null;
  const q = `?user_id=${encodeURIComponent(userId)}`;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/freshdesk-webhook${q}`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, domain, key } = body;
  if (!userId || !domain || !key) {
    return NextResponse.json(
      { ok: false, error: "Missing userId, domain, or API key" },
      { status: 400 }
    );
  }

  const host = normalizeDomain(domain);
  const auth = "Basic " + Buffer.from(`${key}:X`).toString("base64");

  // ── 1. Validate credentials ──
  try {
    const check = await fetch(`https://${host}/api/v2/agents/me`, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
    });
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: "Freshdesk authentication failed — check your domain and key" },
        { status: 200 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not reach Freshdesk — check your domain" },
      { status: 200 }
    );
  }

  // ── 2. Encrypt + persist credentials (only if Supabase is set up) ──
  // The front-end always saves the credentials locally; Supabase is
  // optional and only needed for the automated inbound pipeline.
  if (isSupabaseConfigured()) {
    try {
      const supabase = supabaseAdmin();
      const { error } = await supabase.from("settings").upsert(
        {
          user_id: userId,
          freshdesk_domain: host,
          freshdesk_key_encrypted: encrypt(key),
        },
        { onConflict: "user_id" }
      );
      if (error) {
        return NextResponse.json(
          { ok: false, error: `Could not save settings: ${error.message}` },
          { status: 200 }
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Backend error";
      return NextResponse.json({ ok: false, error: msg }, { status: 200 });
    }
  } else {
    // No Supabase yet — the Freshdesk credentials are valid and saved
    // locally by the client. Report success without the automated pipeline.
    return NextResponse.json({
      ok: true,
      message: `Connected to ${host}. Saved locally — connect Supabase later to enable automatic replies.`,
      webhookUrl: null,
    });
  }

  // ── 3. Best-effort webhook registration ──
  const hookUrl = webhookUrl(userId);
  let webhookMessage = `Connected to ${host}.`;
  if (hookUrl) {
    try {
      // Freshdesk automation (ticket creation rule) that posts to our webhook.
      const ruleRes = await fetch(
        `https://${host}/api/v2/automations/1/rules`,
        {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Replyloop — new ticket",
            position: 1,
            active: true,
            actions: [
              {
                field_name: "trigger_webhook",
                request_type: "POST",
                url: hookUrl,
                custom_headers: {},
              },
            ],
          }),
        }
      );
      webhookMessage = ruleRes.ok
        ? `Connected to ${host} and registered the new-ticket webhook automatically.`
        : `Connected to ${host}. Add this webhook URL in Freshdesk → Admin → Automations: ${hookUrl}`;
    } catch {
      webhookMessage = `Connected to ${host}. Add this webhook URL in Freshdesk → Admin → Automations: ${hookUrl}`;
    }
  }

  return NextResponse.json({ ok: true, message: webhookMessage, webhookUrl: hookUrl });
}
