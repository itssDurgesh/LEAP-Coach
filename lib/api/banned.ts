import { getServiceClient } from "@/lib/supabase/admin";
import { apiError, logError } from "@/lib/api/errors";
import type { NextResponse } from "next/server";

/**
 * Reject a suspended account.
 *
 * `profiles.banned` was only ever enforced in the browser: AppProvider signs a
 * banned learner out on hydration, and the email broadcast filters them from its
 * audience. Nothing checked it server-side, so a banned user whose Clerk session
 * was still valid could keep calling the API directly — spending Gemini quota,
 * starting payments, linking Telegram — simply by not reloading the page.
 *
 * Reads through the service role because `profiles.banned` is pinned by the
 * protect_privileged_cols trigger and RLS shouldn't decide an authorization
 * question. Fails OPEN on an infrastructure error: a Supabase blip should not
 * lock every learner out of the product, and the client-side sign-out still
 * applies. It fails CLOSED on an actual `banned = true`.
 *
 * Usage, right after the auth() check in a route:
 *
 *   const blocked = await rejectIfBanned(userId);
 *   if (blocked) return blocked;
 */
export async function rejectIfBanned(userId: string | null): Promise<NextResponse | null> {
  if (!userId) return null; // unauthenticated paths are handled by the caller

  try {
    const sb = getServiceClient();
    // No service client (Supabase unconfigured) — nothing to check against.
    if (!sb) return null;

    const { data, error } = await sb
      .from("profiles")
      .select("banned")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      logError("api/banned", error);
      return null; // fail open — see note above
    }
    if (data?.banned) {
      return apiError(403, "This account has been suspended. Please contact support.");
    }
    return null;
  } catch (e) {
    logError("api/banned", e);
    return null;
  }
}
