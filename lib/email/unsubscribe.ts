import "server-only"; // HMAC signing secret — server only
import crypto from "crypto";

/**
 * Stateless unsubscribe tokens — SERVER ONLY.
 *
 * Each broadcast email carries a per-recipient unsubscribe link whose token is an
 * HMAC of the recipient's (opaque) profile id. No table is needed: the unsubscribe
 * route verifies the signature and flips `profiles.email_opt_out`. The recipient's
 * email is never placed in the URL.
 *
 * The signing secret falls back through existing server secrets so no extra env is
 * required in real mode, but you can set EMAIL_UNSUBSCRIBE_SECRET to rotate it
 * independently (see docs/EMAIL.md).
 */

const SITE_URL = () => process.env.NEXT_PUBLIC_SITE_URL || "https://www.leapcoach.in";

function secret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

/** `<b64url(userId)>.<hmac>` — opaque, tamper-evident. */
function makeUnsubscribeToken(userId: string): string {
  const p = b64url(Buffer.from(userId, "utf8"));
  return `${p}.${sign(p)}`;
}

/** Returns the userId if the token is valid, else null. Constant-time compare. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!secret()) return null;
  const [p, sig] = (token || "").split(".");
  if (!p || !sig) return null;
  const expected = sign(p);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const userId = fromB64url(p).toString("utf8");
    return userId || null;
  } catch {
    return null;
  }
}

/** User-facing page that shows a confirm button (avoids email-client prefetch auto-unsubscribes). */
export const unsubscribePageUrl = (userId: string) =>
  `${SITE_URL()}/unsubscribe?token=${encodeURIComponent(makeUnsubscribeToken(userId))}`;

/** One-click endpoint for the RFC 8058 List-Unsubscribe / List-Unsubscribe-Post header. */
export const unsubscribeOneClickUrl = (userId: string) =>
  `${SITE_URL()}/api/unsubscribe?token=${encodeURIComponent(makeUnsubscribeToken(userId))}`;
