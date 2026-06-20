// ════════════════════════════════════════════════════════════════
// Supabase client setup.
//
//  - supabaseBrowser():  anon client for use in Client Components.
//  - supabaseAdmin():    service-role client for server-only code
//                        (API routes, edge functions). NEVER import
//                        this into a Client Component.
// ════════════════════════════════════════════════════════════════

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser/anon Supabase client. Safe to use from Client Components.
 * Returns a singleton so we don't create a new connection per render.
 */
let browserClient: SupabaseClient<Database> | null = null;
export function supabaseBrowser(): SupabaseClient<Database> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }
  if (!browserClient) {
    browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}

/**
 * Service-role Supabase client. Server-only — bypasses RLS.
 * Use inside API routes and trusted server code.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars."
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
