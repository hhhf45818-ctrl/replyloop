// ════════════════════════════════════════════════════════════════
// freshdesk-webhook
// Receives a webhook from Freshdesk when a new ticket arrives, saves
// the ticket to the database, then invokes the process-ticket function.
//
// The registered webhook URL carries ?user_id=<uuid> so we know which
// Replyloop account the ticket belongs to. As a fallback, we match the
// ticket's Freshdesk domain against the settings table.
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

// deno-lint-ignore no-explicit-any
function pick(obj: any, ...paths: string[]): string | null {
  for (const path of paths) {
    let cur = obj;
    for (const part of path.split(".")) {
      cur = cur?.[part];
      if (cur === undefined || cur === null) break;
    }
    if (cur !== undefined && cur !== null && cur !== "") return String(cur);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  // Freshdesk lets users shape the webhook body freely, so accept several shapes.
  // deno-lint-ignore no-explicit-any
  const p = payload as any;
  const fdTicketId = pick(p, "freshdesk_webhook.ticket_id", "ticket_id", "ticket.id", "id");
  const subject = pick(p, "freshdesk_webhook.ticket_subject", "subject", "ticket.subject") || "(no subject)";
  const body = pick(p, "freshdesk_webhook.ticket_description", "description", "ticket.description_text", "ticket.description", "body") || "";
  const fromEmail = pick(p, "freshdesk_webhook.ticket_contact_email", "from_email", "ticket.requester.email", "email");
  const fromName = pick(p, "freshdesk_webhook.ticket_contact_name", "from_name", "ticket.requester.name", "name") || "Customer";
  const domain = pick(p, "freshdesk_webhook.domain", "domain", "freshdesk_domain");

  // Resolve the owning user.
  const url = new URL(req.url);
  let userId = url.searchParams.get("user_id");
  if (!userId && domain) {
    const { data } = await supabase
      .from("settings")
      .select("user_id")
      .eq("freshdesk_domain", domain)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    return json({ ok: false, error: "Could not resolve user_id for this webhook" }, 400);
  }

  // Save the ticket (pending until processed).
  const { data: inserted, error } = await supabase
    .from("tickets")
    .insert({
      user_id: userId,
      freshdesk_ticket_id: fdTicketId,
      subject,
      body,
      from_email: fromEmail,
      from_name: fromName,
      action_taken: "pending",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return json({ ok: false, error: error?.message || "Insert failed" }, 500);
  }

  // Fire-and-forget the processing function.
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/process-ticket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ ticketId: inserted.id, userId }),
    });
  } catch (e) {
    console.error("process-ticket invoke failed", e);
  }

  return json({ ok: true, ticketId: inserted.id });
});
