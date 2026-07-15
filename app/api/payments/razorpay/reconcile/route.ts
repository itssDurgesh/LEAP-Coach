import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { processPayment } from "@/lib/payments/grant";
import { parseJson } from "@/lib/api/validate";
import { logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation — the last safety net behind /verify and the webhook.
//
// Sweeps every payment Razorpay captured in the last N hours and cross-checks it
// against our `payments` table:
//   • captured at Razorpay but missing here  → record + grant from the order notes
//     (exactly what the webhook would have done had it not been missed/down).
//   • refunded at Razorpay but 'captured' here → mark the receipt refunded.
//
// Callable two ways:
//   • POST by a signed-in admin (the "Reconcile" use case from Admin → Payments).
//   • GET/POST with `Authorization: Bearer <PAYMENTS_RECONCILE_SECRET>` — for a
//     scheduled job (e.g. Vercel cron, which sends its CRON_SECRET this way).
// Everything is idempotent (processPayment keys on razorpay_payment_id), so
// running it repeatedly — or concurrently with the webhook — is safe.
// ─────────────────────────────────────────────────────────────────────────────

const BodySchema = z.object({ hours: z.number().int().min(1).max(720).optional() });

const DEFAULT_WINDOW_HOURS = 48;
const PAGE_SIZE = 100; // Razorpay's max count per list call
const MAX_PAGES = 10;

interface RzpPayment {
  id: string;
  order_id?: string;
  amount?: number;
  amount_refunded?: number;
  status?: string; // created | authorized | captured | refunded | failed
}

async function isAuthorized(req: NextRequest, admin: SupabaseClient): Promise<boolean> {
  // (a) Scheduled job with the shared secret.
  const secret = process.env.PAYMENTS_RECONCILE_SECRET || process.env.CRON_SECRET;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (secret && bearer && bearer === secret) return true;

  // (b) A signed-in admin (owner or sub-admin — same bar as retry-grant: this only
  // records money already captured and grants what was already paid for).
  try {
    const { userId } = await auth();
    if (!userId) return false;
    const { data: me } = await admin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    return !!me?.is_admin;
  } catch {
    return false;
  }
}

async function reconcile(req: NextRequest, hours: number): Promise<NextResponse> {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!keyId || !keySecret || !url || !service) {
    return NextResponse.json({ ok: false, error: "Server not configured." }, { status: 500 });
  }
  const admin = createClient(url, service, { auth: { persistSession: false } });

  if (!(await isAuthorized(req, admin))) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });
  }
  const limited = enforceRate(req, "admin", null, { ok: false });
  if (limited) return limited;

  const rzpAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const rzpGet = async <T>(path: string): Promise<T> => {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      headers: { Authorization: `Basic ${rzpAuth}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`razorpay ${res.status}: ${await res.text().catch(() => "")}`);
    return (await res.json()) as T;
  };

  const now = Math.floor(Date.now() / 1000);
  const from = now - hours * 3600;

  let scanned = 0;
  let alreadyRecorded = 0;
  let recovered = 0;
  let granted = 0;
  let refundsSynced = 0;
  let unattributed = 0;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const list = await rzpGet<{ items: RzpPayment[] }>(
        `/payments?from=${from}&to=${now}&count=${PAGE_SIZE}&skip=${page * PAGE_SIZE}`,
      );
      const items = list.items ?? [];
      if (items.length === 0) break;

      const interesting = items.filter((p) => p.status === "captured" || p.status === "refunded");
      scanned += interesting.length;
      if (interesting.length) {
        const { data: known } = await admin
          .from("payments")
          .select("razorpay_payment_id, status")
          .in("razorpay_payment_id", interesting.map((p) => p.id));
        const knownById = new Map((known ?? []).map((r) => [r.razorpay_payment_id as string, r.status as string]));

        for (const p of interesting) {
          const localStatus = knownById.get(p.id);

          // Refunded at Razorpay (e.g. from the dashboard) but not marked here → sync.
          if (p.status === "refunded") {
            if (localStatus && localStatus !== "refunded") {
              await admin
                .from("payments")
                .update({
                  status: "refunded",
                  refunded_at: new Date().toISOString(),
                  refund_amount_inr: Math.round((p.amount_refunded ?? p.amount ?? 0) / 100),
                })
                .eq("razorpay_payment_id", p.id);
              refundsSynced++;
            }
            continue;
          }

          // Captured and already recorded → nothing to do.
          if (localStatus) {
            alreadyRecorded++;
            continue;
          }

          // Captured at Razorpay with NO receipt here — the case this route exists for.
          if (!p.order_id) {
            unattributed++;
            continue;
          }
          const order = await rzpGet<{
            notes?: { userId?: string; plan?: string; courseId?: string; categories?: string; couponCode?: string };
          }>(`/orders/${p.order_id}`);
          const notes = order.notes ?? {};
          if (!notes.userId) {
            unattributed++; // not one of our orders (or created before notes carried the buyer)
            continue;
          }
          const result = await processPayment(admin, {
            userId: notes.userId,
            razorpayOrderId: p.order_id,
            razorpayPaymentId: p.id,
            amountInr: Math.round((p.amount ?? 0) / 100),
            plan: notes.plan,
            courseId: notes.courseId || undefined,
            categories: (notes.categories || "").split(",").filter(Boolean),
            couponCode: notes.couponCode || undefined,
            source: "webhook",
            notes: { reconciled: true },
          });
          recovered++;
          if (result.grantStatus === "granted") granted++;
        }
      }
      if (items.length < PAGE_SIZE) break;
    }
  } catch (e) {
    logError("payments/reconcile", e);
    return NextResponse.json(
      { ok: false, error: "Reconciliation failed part-way.", scanned, alreadyRecorded, recovered, granted, refundsSynced, unattributed },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, windowHours: hours, scanned, alreadyRecorded, recovered, granted, refundsSynced, unattributed });
}

export async function POST(req: NextRequest) {
  // Body is optional — a bare POST reconciles the default window.
  const parsed = await parseJson(req, BodySchema);
  const hours = parsed.ok ? parsed.data.hours ?? DEFAULT_WINDOW_HOURS : DEFAULT_WINDOW_HOURS;
  return reconcile(req, hours);
}

// GET supports schedulers that can't send a body (Vercel cron hits GET with
// `Authorization: Bearer <CRON_SECRET>`). Window via ?hours=…
export async function GET(req: NextRequest) {
  const h = Number(req.nextUrl.searchParams.get("hours"));
  const hours = Number.isFinite(h) && h >= 1 && h <= 720 ? Math.floor(h) : DEFAULT_WINDOW_HOURS;
  return reconcile(req, hours);
}
