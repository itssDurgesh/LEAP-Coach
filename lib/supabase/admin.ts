import "server-only"; // build error if this (service-role) module is ever imported into client code
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS, so it must never be
 * imported into client code or exposed to the browser. Used by the Telegram link
 * routes (and the standalone bot has its own equivalent) to read/write the closed
 * telegram_* tables and to read a linked user's data.
 *
 * Returns null when Supabase or the service key isn't configured (mock mode), so
 * callers can degrade gracefully instead of throwing at import time.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (cached) return cached;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  cached = createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
