import { createClient } from "@supabase/supabase-js";
import { SiteContent, DEFAULT_SITE_CONTENT } from "@/lib/types";
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * Server-side read of the admin-edited homepage content (public RLS read, anon key).
 * The landing page passes this into the hero components so the SAVED content is in the
 * initial server-rendered HTML — no flash of default text before the client store
 * hydrates. Returns null in mock mode (then components fall back to the store/defaults).
 */
export async function fetchSiteContentServer(): Promise<SiteContent | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await sb.from("site_content").select("content").eq("id", 1).maybeSingle();
    if (!data?.content) return null;
    // Merge with defaults exactly like the client load, so SSR and post-hydration
    // render identical objects (no React hydration mismatch).
    return { ...DEFAULT_SITE_CONTENT, ...(data.content as Partial<SiteContent>) };
  } catch {
    return null;
  }
}
