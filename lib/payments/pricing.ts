import "server-only"; // read server-side only — never bundle a Supabase client into the browser
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PRICING, type PricingTiers } from "@/lib/types";

/**
 * The live category-bundle prices, read straight from Supabase on the SERVER.
 *
 * This is the single source of truth for every price shown across the site. The pricing
 * page renders it server-side (so the admin-set value is correct on the very first paint —
 * no client round-trip, no flash of a placeholder), and the public `GET /api/pricing`
 * route returns it for any other surface.
 *
 * `pricing_tiers` is a singleton row (id = 1) that the admin editor upserts in place, so
 * admin edits always win. `DEFAULT_PRICING` is only a last-resort bootstrap fallback:
 * Supabase isn't configured (mock mode), or the row is missing on a brand-new install.
 * The `pricing read` RLS policy is public, so the anon key is enough (least privilege).
 */
export async function fetchPricing(): Promise<PricingTiers> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return DEFAULT_PRICING; // mock mode — no DB configured

  try {
    const sb = createClient(url, anon, { auth: { persistSession: false } });
    // select("*") so an un-migrated optional column (e.g. show_upgrade_info) can't error the read.
    const { data } = await sb.from("pricing_tiers").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_PRICING;
    return {
      cat1: data.cat1 ?? DEFAULT_PRICING.cat1,
      cat2: data.cat2 ?? DEFAULT_PRICING.cat2,
      cat3: data.cat3 ?? DEFAULT_PRICING.cat3,
      perTopicFrom: data.per_topic_from ?? DEFAULT_PRICING.perTopicFrom,
      showUpgradeInfo: data.show_upgrade_info ?? true,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}
