import "server-only"; // holds Resend/Gmail credentials — must never reach the browser
import nodemailer from "nodemailer";

/**
 * Provider-agnostic broadcast email sender — SERVER ONLY.
 *
 * Providers are tried in PRIORITY ORDER (best deliverability first):
 *   1. RESEND_API_KEY                    → Resend BATCH API (up to 100 messages per
 *      HTTP call), from EMAIL_FROM (a verified domain — see docs/EMAIL.md).
 *   2. GMAIL_USER + GMAIL_APP_PASSWORD   → Gmail SMTP via nodemailer (~500/day).
 *
 * If the primary provider fails for a recipient (e.g. Resend is down / quota hit),
 * that recipient is automatically retried through the next configured provider. The
 * caller gets a PER-RECIPIENT result so it can record who actually received the mail
 * and retry only the rest later.
 *
 * Every email targets exactly one recipient (its own `to`), rendered per-recipient so
 * it can carry that learner's unsubscribe link. Replies go to EMAIL_REPLY_TO.
 */

export type EmailProvider = "resend" | "gmail";

/** Configured providers in priority order (Resend first, Gmail as fallback). */
export function providersInOrder(): EmailProvider[] {
  const list: EmailProvider[] = [];
  if (process.env.RESEND_API_KEY) list.push("resend");
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) list.push("gmail");
  return list;
}

export const emailProvider = (): EmailProvider | null => providersInOrder()[0] ?? null;
export const isEmailConfigured = () => providersInOrder().length > 0;

const REPLY_TO = () => process.env.EMAIL_REPLY_TO || "info.leapcoach@gmail.com";

function fromAddress(provider: EmailProvider): string {
  if (provider === "gmail") return `LEAP Coach <${process.env.GMAIL_USER}>`;
  return process.env.EMAIL_FROM || "LEAP Coach <announcements@leapcoach.in>";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** RFC 8058 one-click unsubscribe headers for a given endpoint URL. */
function unsubHeaders(oneClickUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export interface NotifyRecipient {
  id: string; // profile id — recorded as "delivered" so retries can skip it
  email: string;
  unsubscribeUrl: string; // user-facing confirm page, rendered in the email footer
  oneClickUrl: string; // machine endpoint for the List-Unsubscribe header
}

export interface RecipientResult {
  id: string;
  email: string;
  ok: boolean;
  error?: string;
  provider?: EmailProvider; // which provider delivered it
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  errors: string[]; // first few distinct failure reasons, for the admin toast/log
  results: RecipientResult[]; // per-recipient outcome
}

const RESEND_BATCH_SIZE = 100; // Resend's /emails/batch hard limit

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ── Resend (batch) ────────────────────────────────────────────────────────────
async function postResendBatch(batch: NotifyRecipient[], subject: string, render: (u: string) => string): Promise<void> {
  const payload = batch.map((r) => ({
    from: fromAddress("resend"),
    to: [r.email],
    reply_to: REPLY_TO(),
    subject,
    html: render(r.unsubscribeUrl),
    headers: unsubHeaders(r.oneClickUrl),
  }));
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function sendAllViaResend(recipients: NotifyRecipient[], subject: string, render: (u: string) => string): Promise<RecipientResult[]> {
  const out: RecipientResult[] = [];
  const batches = chunk(recipients, RESEND_BATCH_SIZE);
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(600); // stay under Resend's 2 req/sec
    try {
      await postResendBatch(batches[i], subject, render);
      for (const r of batches[i]) out.push({ id: r.id, email: r.email, ok: true, provider: "resend" });
    } catch (e) {
      for (const r of batches[i]) out.push({ id: r.id, email: r.email, ok: false, error: errMsg(e), provider: "resend" });
    }
  }
  return out;
}

// ── Gmail (SMTP, one at a time) ─────────────────────────────────────────────────
let gmailTransport: nodemailer.Transporter | null = null;
function getGmailTransport(): nodemailer.Transporter {
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return gmailTransport;
}

async function sendAllViaGmail(recipients: NotifyRecipient[], subject: string, render: (u: string) => string): Promise<RecipientResult[]> {
  const out: RecipientResult[] = [];
  const t = getGmailTransport();
  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    if (i > 0) await sleep(250); // gentle pacing — personal Gmail throttles rapid sends
    try {
      await t.sendMail({
        from: fromAddress("gmail"),
        to: r.email,
        replyTo: REPLY_TO(),
        subject,
        html: render(r.unsubscribeUrl),
        headers: unsubHeaders(r.oneClickUrl),
      });
      out.push({ id: r.id, email: r.email, ok: true, provider: "gmail" });
    } catch (e) {
      out.push({ id: r.id, email: r.email, ok: false, error: errMsg(e), provider: "gmail" });
    }
  }
  return out;
}

function sendViaProvider(provider: EmailProvider, recipients: NotifyRecipient[], subject: string, render: (u: string) => string) {
  return provider === "resend" ? sendAllViaResend(recipients, subject, render) : sendAllViaGmail(recipients, subject, render);
}

/**
 * Send one email per recipient, trying providers in priority order and falling back
 * to the next provider for anyone the previous one couldn't reach. Returns a
 * per-recipient result so the caller can persist who was delivered.
 */
export async function sendBroadcast(args: {
  recipients: NotifyRecipient[];
  subject: string;
  render: (unsubscribeUrl: string) => string;
}): Promise<BroadcastResult> {
  const providers = providersInOrder();
  if (!providers.length) throw new Error("No email provider configured.");

  // De-dupe on email while keeping the first recipient (its id + unsubscribe token).
  const seen = new Set<string>();
  const unique = args.recipients.filter((r) => {
    const key = r.email.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byId = new Map<string, RecipientResult>();
  let pending = unique;
  for (const provider of providers) {
    if (pending.length === 0) break;
    const res = await sendViaProvider(provider, pending, args.subject, args.render);
    for (const r of res) byId.set(r.id, r); // later provider's success overwrites earlier failure
    pending = pending.filter((rec) => !byId.get(rec.id)?.ok);
  }

  const results = [...byId.values()];
  const sent = results.filter((r) => r.ok).length;
  const errors: string[] = [];
  for (const r of results) {
    if (!r.ok && r.error && !errors.includes(r.error) && errors.length < 3) errors.push(r.error);
  }
  return { sent, failed: results.length - sent, errors, results };
}
