import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.leapcoach.in";

/** Pull the token from the query string or a JSON body (one-click providers post to the URL). */
async function readToken(req: Request): Promise<string | null> {
  const q = new URL(req.url).searchParams.get("token");
  if (q) return q;
  try {
    const body = await req.json();
    if (body && typeof body.token === "string") return body.token;
  } catch {
    /* not JSON (e.g. RFC 8058 form post) — fall through */
  }
  return null;
}

/**
 * POST /api/unsubscribe — flip profiles.email_opt_out for the token's owner.
 * Called both by the confirm page and by mailbox one-click (List-Unsubscribe-Post).
 * Idempotent: already-opted-out returns ok.
 */
export async function POST(req: Request) {
  // Throttle per IP — the token is unguessable, but this stops endpoint hammering.
  const limited = enforceRate(req, "default", null);
  if (limited) return limited;

  const token = await readToken(req);
  const userId = token ? verifyUnsubscribeToken(token) : null;
  if (!userId) return apiError(400, "This unsubscribe link is invalid or expired.");

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Not available.");

  const { error } = await sb.from("profiles").update({ email_opt_out: true }).eq("id", userId);
  if (error) {
    logError("unsubscribe", error.message);
    return apiError(500, "Could not update your preference — please try again.");
  }

  return NextResponse.json({ ok: true });
}

/** A raw GET (some clients follow the header as a link) → send the user to the confirm page. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(`${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`);
}
