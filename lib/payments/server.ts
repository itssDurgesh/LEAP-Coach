import "server-only"; // build error if this (service-role pricing) module is imported into client code
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { applyDiscount, evaluateCoupon, normalizeCode, type CouponTarget } from "@/lib/coupons";
import { bundlePrice, upgradePrice, DEFAULT_PRICING, type Coupon, type PricingTiers, type Role } from "@/lib/types";

const ALL_ROLES: Role[] = ["student", "professional", "entrepreneur"];

// Service-role client (bypasses RLS). Server-only.
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service, { auth: { persistSession: false } });
}

export type Plan = "course" | "bundle" | "all";

export interface PriceQuote {
  ok: boolean;
  reason?: string;
  plan: Plan;
  courseId?: string;
  categories?: Role[];
  baseAmountInr: number;
  finalAmountInr: number;
  discountPercent: number;
  couponCode?: string;
}

async function pricingTiers(sb: SupabaseClient): Promise<PricingTiers> {
  const { data } = await sb.from("pricing_tiers").select("cat1,cat2,cat3,per_topic_from").eq("id", 1).maybeSingle();
  return data
    ? { cat1: data.cat1, cat2: data.cat2, cat3: data.cat3, perTopicFrom: data.per_topic_from ?? DEFAULT_PRICING.perTopicFrom }
    : DEFAULT_PRICING;
}

/** Sanitize a category list to the valid roles, de-duplicated. */
function cleanCategories(input?: Role[]): Role[] {
  return Array.from(new Set((input ?? []).filter((c) => ALL_ROLES.includes(c))));
}

/** The categories a buyer already owns (all-access ⇒ all three). Drives pay-the-difference upgrades. */
async function ownedCategories(sb: SupabaseClient, userId?: string): Promise<Set<Role>> {
  if (!userId) return new Set();
  const { data: prof } = await sb.from("profiles").select("subscription_plan").eq("id", userId).maybeSingle();
  if (prof?.subscription_plan === "all_access") return new Set(ALL_ROLES);
  const { data } = await sb.from("category_passes").select("category").eq("user_id", userId);
  return new Set(((data ?? []) as { category: Role }[]).map((r) => r.category).filter((c) => ALL_ROLES.includes(c)));
}

function rowToCoupon(r: Record<string, unknown>): Coupon {
  return {
    code: r.code as string,
    discountPercent: r.discount_percent as number,
    category: r.category as Coupon["category"],
    active: r.active as boolean,
    maxRedemptions: (r.max_redemptions as number | null) ?? null,
    redemptions: (r.redemptions as number) ?? 0,
    expiresAt: (r.expires_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

/**
 * Authoritatively price a purchase (base price from DB, optional coupon applied).
 * Used by both the coupon-validate preview and the order-creation route, so the
 * client can never fake an amount or a discount.
 */
export async function quotePrice(input: {
  plan: Plan;
  courseId?: string;
  categories?: Role[];
  couponCode?: string;
  userId?: string; // buyer — enables pay-the-difference upgrades from what they already own
}): Promise<PriceQuote> {
  const sb = adminClient();
  const categories = cleanCategories(input.categories);
  // The categories actually granted/charged (bundle upgrades drop ones already owned).
  let resultCategories: Role[] = categories;

  // 1) Base amount + the coupon target (what's being bought).
  let baseAmountInr: number;
  let target: CouponTarget;
  if (input.plan === "course") {
    if (!input.courseId) return base(input, 0, "Missing course.");
    const { data } = await sb.from("courses").select("price,category").eq("id", input.courseId).maybeSingle();
    if (!data) return base(input, 0, "Course not found.");
    if ((data.price ?? 0) <= 0) return base(input, 0, "This topic is free.");
    baseAmountInr = data.price as number;
    target = { type: "course", category: data.category as Role };
  } else if (input.plan === "bundle") {
    if (categories.length < 1) return base(input, 0, "Select at least one category.");
    const tiers = await pricingTiers(sb);
    const owned = await ownedCategories(sb, input.userId);
    // Only charge for / grant the categories they don't already hold (pay the difference).
    resultCategories = categories.filter((c) => !owned.has(c));
    if (resultCategories.length === 0) return base(input, 0, "You already own these categories.");
    const ownedCount = Math.min(3, owned.size);
    baseAmountInr = upgradePrice(tiers, ownedCount, resultCategories.length);
    target = ownedCount + resultCategories.length >= 3 ? { type: "all" } : { type: "bundle", categories: resultCategories };
  } else {
    // "all" = all three categories (pay the difference if they already own some)
    const tiers = await pricingTiers(sb);
    const owned = await ownedCategories(sb, input.userId);
    const ownedCount = Math.min(3, owned.size);
    if (ownedCount >= 3) return base(input, 0, "You already have all-access.");
    baseAmountInr = upgradePrice(tiers, ownedCount, 3 - ownedCount);
    target = { type: "all" };
  }

  // 2) Optional coupon.
  let discountPercent = 0;
  let couponCode: string | undefined;
  if (input.couponCode && input.couponCode.trim()) {
    const code = normalizeCode(input.couponCode);
    const { data } = await sb.from("coupons").select("*").eq("code", code).maybeSingle();
    if (!data) return { ...base(input, baseAmountInr), ok: false, reason: "Invalid coupon code." };
    const coupon = rowToCoupon(data);
    const check = evaluateCoupon(coupon, target);
    if (!check.ok) return { ...base(input, baseAmountInr), ok: false, reason: check.reason };
    discountPercent = coupon.discountPercent;
    couponCode = coupon.code;
  }

  return {
    ok: true,
    plan: input.plan,
    courseId: input.courseId,
    categories: input.plan === "bundle" ? resultCategories : undefined,
    baseAmountInr,
    finalAmountInr: applyDiscount(baseAmountInr, discountPercent),
    discountPercent,
    couponCode,
  };
}

function base(
  input: { plan: Plan; courseId?: string; categories?: Role[] },
  baseAmountInr: number,
  reason?: string,
): PriceQuote {
  return {
    ok: !reason,
    reason,
    plan: input.plan,
    courseId: input.courseId,
    categories: input.categories,
    baseAmountInr,
    finalAmountInr: baseAmountInr,
    discountPercent: 0,
  };
}

/**
 * Increment a coupon's redemption count by one, ATOMICALLY (best-effort, service
 * role). Uses the increment_coupon_redemption RPC so simultaneous redemptions can't
 * lose updates the way a read-then-write would.
 */
export async function incrementCouponRedemption(sb: SupabaseClient, code: string): Promise<void> {
  const { error } = await sb.rpc("increment_coupon_redemption", { p_code: code });
  if (error) console.error("[coupon] increment failed", error);
}
