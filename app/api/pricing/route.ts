import { NextResponse } from "next/server";
import { fetchPricing } from "@/lib/payments/pricing";

export const runtime = "nodejs";
// Always render fresh so a price change in Admin → Plans & Coupons reflects immediately.
export const dynamic = "force-dynamic";

/**
 * Public: the live category-bundle prices set in Admin → Plans & Coupons.
 * Returns { cat1, cat2, cat3, perTopicFrom, showUpgradeInfo }. Consumed by the
 * server-rendered pricing page and available to any other surface (widgets, the bot,
 * future pages) that needs the current prices without a hardcoded value.
 */
export async function GET() {
  const pricing = await fetchPricing();
  return NextResponse.json(pricing, { headers: { "Cache-Control": "no-store" } });
}
