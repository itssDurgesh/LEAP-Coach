import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { incrementCouponRedemption } from "@/lib/payments/server";

export const runtime = "nodejs";

interface VerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function POST(req: NextRequest) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return NextResponse.json({ ok: false, fallback: true });

  let b: VerifyBody;
  try {
    b = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ ok: false, error: "Missing verification fields." }, { status: 400 });
  }

  // 1) Verify the Razorpay signature: HMAC-SHA256(order_id|payment_id, key_secret).
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  const ea = Buffer.from(expected);
  const sa = Buffer.from(razorpay_signature);
  if (ea.length !== sa.length || !crypto.timingSafeEqual(ea, sa)) {
    return NextResponse.json({ ok: false, error: "Signature mismatch." }, { status: 400 });
  }

  // 2) Identify the authenticated user from their Supabase access token.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });
  }
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const {
    data: { user },
  } = await createClient(url, anon).auth.getUser(token);
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  // 3) Confirm with Razorpay that the payment is real, captured/authorized, and matches the order.
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  let plan: string | undefined;
  let courseId: string | undefined;
  let categories: string[] = [];
  let couponCode: string | undefined;
  try {
    const [orderRes, payRes] = await Promise.all([
      fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
      fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      }),
    ]);
    if (!orderRes.ok || !payRes.ok) return NextResponse.json({ ok: false, error: "Could not confirm payment." }, { status: 502 });
    const order = (await orderRes.json()) as {
      amount: number;
      notes?: { plan?: string; courseId?: string; categories?: string; couponCode?: string };
    };
    const payment = (await payRes.json()) as { order_id: string; status: string; amount: number };

    const valid =
      payment.order_id === razorpay_order_id &&
      payment.amount === order.amount &&
      (payment.status === "captured" || payment.status === "authorized");
    if (!valid) return NextResponse.json({ ok: false, error: "Payment not completed." }, { status: 400 });

    // The plan/courseId/categories/coupon come from the server-created order's notes — not the client.
    plan = order.notes?.plan;
    courseId = order.notes?.courseId || undefined;
    categories = (order.notes?.categories || "").split(",").filter(Boolean);
    couponCode = order.notes?.couponCode || undefined;
  } catch (e) {
    console.error("[razorpay] confirm error", e);
    return NextResponse.json({ ok: false, error: "Could not confirm payment." }, { status: 502 });
  }

  // 4) Grant access authoritatively with the service role (bypasses RLS).
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const setAllAccess = async () => {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      await admin
        .from("profiles")
        .update({ subscription_plan: "all_access", subscription_valid_until: validUntil.toISOString() })
        .eq("id", user.id);
    };

    if (plan === "all") {
      await admin.from("category_passes").upsert(
        ["student", "professional", "entrepreneur"].map((c) => ({ user_id: user.id, category: c })),
        { onConflict: "user_id,category" },
      );
      await setAllAccess();
      if (courseId)
        await admin.from("enrollments").upsert({ user_id: user.id, course_id: courseId }, { onConflict: "user_id,course_id" });
    } else if (plan === "bundle") {
      const cats = categories.filter((c) => ["student", "professional", "entrepreneur"].includes(c));
      if (!cats.length) return NextResponse.json({ ok: false, error: "Nothing to grant." }, { status: 400 });
      await admin.from("category_passes").upsert(
        cats.map((c) => ({ user_id: user.id, category: c })),
        { onConflict: "user_id,category" },
      );
      // If the user now owns all three categories, mark all-access.
      const { data: owned } = await admin.from("category_passes").select("category").eq("user_id", user.id);
      const set = new Set((owned ?? []).map((r) => r.category as string));
      if (["student", "professional", "entrepreneur"].every((c) => set.has(c))) await setAllAccess();
    } else if (courseId) {
      await admin.from("course_purchases").upsert({ user_id: user.id, course_id: courseId }, { onConflict: "user_id,course_id" });
      await admin.from("enrollments").upsert({ user_id: user.id, course_id: courseId }, { onConflict: "user_id,course_id" });
    } else {
      return NextResponse.json({ ok: false, error: "Nothing to grant." }, { status: 400 });
    }
    // Count the coupon redemption now that access is granted (best-effort).
    if (couponCode) await incrementCouponRedemption(admin, couponCode);
  } catch (e) {
    console.error("[razorpay] grant error", e);
    return NextResponse.json({ ok: false, error: "Could not grant access." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan, courseId });
}
