// ════════════════════════════════════════════════════════════════
// send-reply
//  - Posts the reply to the Freshdesk ticket via the Freshdesk API
//  - Updates the ticket status in the database
//  - Logs everything
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { decrypt } from "../_shared/crypto.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let input: { ticketId?: string; userId?: string; replyText?: string };
  try {
    input = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }
  const { ticketId, userId, replyText } = input;
  if (!ticketId || !userId || !replyText) {
    return json({ ok: false, error: "Missing ticketId, userId, or replyText" }, 400);
  }

  // Load ticket + settings
  const { data: ticket } = await supabase
    .from("tickets")
    .select("freshdesk_ticket_id")
    .eq("id", ticketId)
    .single();

  const { data: settings } = await supabase
    .from("settings")
    .select("freshdesk_domain, freshdesk_key_encrypted")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ticket?.freshdesk_ticket_id) {
    return json({ ok: false, error: "Ticket has no Freshdesk ID" }, 400);
  }
  if (!settings?.freshdesk_domain || !settings?.freshdesk_key_encrypted) {
    return json({ ok: false, error: "Freshdesk not connected for this user" }, 400);
  }

  let freshdeskKey: string;
  try {
    freshdeskKey = await decrypt(settings.freshdesk_key_encrypted);
  } catch (e) {
    console.error("freshdesk key decrypt failed", e);
    return json({ ok: false, error: "Could not decrypt Freshdesk key" }, 500);
  }

  const auth = "Basic " + btoa(`${freshdeskKey}:X`);
  const replyUrl = `https://${settings.freshdesk_domain}/api/v2/tickets/${ticket.freshdesk_ticket_id}/reply`;

  try {
    const res = await fetch(replyUrl, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyText.replace(/\n/g, "<br>") }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Freshdesk reply failed", res.status, errText);
      await supabase
        .from("tickets")
        .update({ action_taken: "escalated" })
        .eq("id", ticketId);
      return json({ ok: false, error: `Freshdesk returned ${res.status}` }, 200);
    }
  } catch (e) {
    console.error("Freshdesk reply request failed", e);
    return json({ ok: false, error: "Could not reach Freshdesk" }, 200);
  }

  await supabase
    .from("tickets")
    .update({ action_taken: "replied" })
    .eq("id", ticketId);

  console.log(`✓ Replied to Freshdesk ticket ${ticket.freshdesk_ticket_id} (ticket ${ticketId})`);
  return json({ ok: true });
});
