"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

let cached: SupabaseClient | null = null;

// The current Clerk session-token getter, set by AppProvider via the auth
// bridge. The data client below reads it on every request so RLS can authorize
// the user. Logged out (or mock) → returns null → anonymous (public reads only).
type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

/** AppProvider calls this with the Clerk token getter once auth is wired up. */
export function setSupabaseTokenGetter(getter: TokenGetter | null) {
  tokenGetter = getter;
}

/**
 * Returns the browser Supabase **data** client (auth is handled by Clerk), or
 * null when Supabase isn't configured (mock mode). The client carries the Clerk
 * session JWT via the accessToken option, so Postgres RLS sees the Clerk user id.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      // Clerk owns sessions — don't let supabase-js persist or refresh its own.
      accessToken: async () => (tokenGetter ? await tokenGetter() : null),
    });
  }
  return cached;
}
