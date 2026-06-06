import { NextRequest, NextResponse } from "next/server";
import { quotePrice } from "@/lib/payments/server";

export const runtime = "nodejs";

interface Body {
  code: string;
  plan: "course" | "all";
  courseId?: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, fallback: true });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body.code?.trim()) return NextResponse.json({ ok: false, error: "Enter a coupon code." }, { status: 400 });

  const q = await quotePrice({ plan: body.plan, courseId: body.courseId, couponCode: body.code });
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
