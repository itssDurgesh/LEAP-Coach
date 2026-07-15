import "server-only"; // reads profile emails via the service role
import type { SupabaseClient } from "@supabase/supabase-js";
import { isEmailConfigured, sendTransactional } from "@/lib/email/send";
import { ROLES } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Payment notifications — best-effort, NEVER throw, never block a grant.
//
//   • notifyPaymentGranted → receipt email to the buyer once access is live.
//   • notifyGrantFailed    → alert to the owner(s) when a captured payment lands
//     in grant_failed, so recovery doesn't depend on someone watching the
//     Admin → Payments page. Override recipients with PAYMENT_ALERT_EMAIL
//     (comma-separated); defaults to every owner profile (admin, no scoped perms).
//
// Silently no-ops when no email provider is configured (see docs/EMAIL.md).
// ─────────────────────────────────────────────────────────────────────────────

export interface PaymentEmailInput {
  userId: string;
  paymentId: string; // our receipt id, rcpt_…
  amountInr: number;
  plan?: string;
  courseId?: string;
  categories?: string[];
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const catLabel = (id: string) => ROLES.find((r) => r.id === id)?.label ?? id;

/** Human description of what was bought, for the email body. */
async function itemLabel(admin: SupabaseClient, input: PaymentEmailInput): Promise<string> {
  if (input.plan === "all") return "All-Access Pass — every coaching topic, for one year";
  if (input.plan === "bundle") {
    const cats = (input.categories ?? []).map(catLabel).join(", ");
    return `Catalog pass (1 year): ${cats || "selected categories"}`;
  }
  if (input.courseId) {
    const { data } = await admin.from("courses").select("title").eq("id", input.courseId).maybeSingle();
    return data?.title ? `“${data.title}” — one year of access` : "Topic purchase — one year of access";
  }
  return "LEAP Coach purchase";
}

function wrap(body: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;max-width:560px;margin:0 auto;padding:24px">
    <p style="font-size:18px;font-weight:bold;margin:0 0 16px;color:#111827">LEAP Coach</p>
    ${body}
    <p style="margin-top:24px;font-size:12px;color:#6b7280">This is an automated message from LEAP Coach.</p>
  </div>`;
}

/** Receipt to the buyer — sent once, on the first successful grant. */
export async function notifyPaymentGranted(admin: SupabaseClient, input: PaymentEmailInput): Promise<void> {
  try {
    if (!isEmailConfigured()) return;
    const { data: buyer } = await admin.from("profiles").select("name,email").eq("id", input.userId).maybeSingle();
    if (!buyer?.email) return;
    const item = await itemLabel(admin, input);
    const html = wrap(`
      <p>Hi ${buyer.name || "there"},</p>
      <p>Thanks for your purchase — your payment was received and your access is now active.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Item</td><td style="padding:4px 0">${item}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Amount</td><td style="padding:4px 0"><strong>${inr(input.amountInr)}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Receipt</td><td style="padding:4px 0">${input.paymentId}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Date</td><td style="padding:4px 0">${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td></tr>
      </table>
      <p>Your access runs for one year from today. You can view this receipt anytime under <strong>Account → Payment receipts</strong>.</p>`);
    await sendTransactional({ to: buyer.email, subject: `Your LEAP Coach receipt — ${inr(input.amountInr)}`, html });
  } catch (e) {
    console.error("[payments/notify] receipt email failed", e);
  }
}

/** Alert to the owner(s) when a captured payment could not be granted. */
export async function notifyGrantFailed(admin: SupabaseClient, input: PaymentEmailInput): Promise<void> {
  try {
    if (!isEmailConfigured()) return;
    let recipients = (process.env.PAYMENT_ALERT_EMAIL ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!recipients.length) {
      const { data: owners } = await admin
        .from("profiles")
        .select("email")
        .eq("is_admin", true)
        .is("permissions", null);
      recipients = (owners ?? []).map((o) => o.email as string).filter(Boolean);
    }
    if (!recipients.length) return;
    const { data: buyer } = await admin.from("profiles").select("name,email").eq("id", input.userId).maybeSingle();
    const item = await itemLabel(admin, input);
    const html = wrap(`
      <p><strong style="color:#b91c1c">A captured payment could not be granted automatically.</strong></p>
      <p>The buyer has paid but does not have access yet. The webhook will keep retrying;
      if it doesn't resolve in a few minutes, open <strong>Admin → Payments</strong> and click
      <strong>Retry grant</strong> on the flagged receipt.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Receipt</td><td style="padding:4px 0">${input.paymentId}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Buyer</td><td style="padding:4px 0">${buyer?.name ?? input.userId}${buyer?.email ? ` (${buyer.email})` : ""}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Item</td><td style="padding:4px 0">${item}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#6b7280">Amount</td><td style="padding:4px 0"><strong>${inr(input.amountInr)}</strong></td></tr>
      </table>
      <p>The buyer was told their payment is safe and access is being finalized — they will not be charged twice.</p>`);
    for (const to of recipients) {
      await sendTransactional({ to, subject: `⚠ Payment needs attention — access not granted (${input.paymentId})`, html });
    }
  } catch (e) {
    console.error("[payments/notify] grant-failed alert failed", e);
  }
}
