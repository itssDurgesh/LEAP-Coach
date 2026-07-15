import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { quotePrice } from "@/lib/payments/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { parseJson } from "@/lib/api/validate";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const CouponSchema = z.object({
  code: z.string().min(1).max(64),
  plan: z.enum(["course", "bundle", "all"]),
  courseId: z.string().max(100).optional(),
  categories: z.array(z.enum(["student", "professional", "entrepreneur"])).max(3).optional(),
});

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, fallback: true });

  // Throttle coupon-preview calls (per IP) to prevent code-guessing / enumeration.
  const limited = enforceRate(req, "payment", null, { ok: false });
  if (limited) return limited;

  const parsed = await parseJson(req, CouponSchema);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  const body = parsed.data;

  // Bind to the buyer so a bundle/upgrade preview prices the difference correctly.
  let userId: string | undefined;
  if (isClerkConfigured) {
    try {
      const a = await auth();
      userId = a.userId ?? undefined;
    } catch {
      userId = undefined;
    }
  }

  const q = await quotePrice({
    plan: body.plan,
    courseId: body.courseId,
    categories: body.categories,
    couponCode: body.code,
    userId,
  });
  if (!q.ok || !q.couponCode) {
    return NextResponse.json({ ok: false, error: q.reason ?? "Invalid coupon code." });
  }
  return NextResponse.json({
    ok: true,
    code: q.couponCode,
    discountPercent: q.discountPercent,
    baseAmountInr: q.baseAmountInr,
    finalAmountInr: q.finalAmountInr,
  });
}
