import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/admin/courses: the owner's publish, approval and featuring switches.
 *
 * WHY a server route: `courses admin write` is an RLS policy gated on is_admin(),
 * which finds the caller from `auth.jwt() ->> 'sub'`. When that does not resolve
 * for a browser request (an expired or missing session token), the UPDATE matches
 * zero rows and PostgREST still answers with success and no error: the screen
 * flipped, nothing was saved, and learners kept seeing the old state. The service
 * role is not subject to RLS, so these writes stick, and a row that is not there
 * is reported as a 404 instead of passing as a save.
 *
 * Body: { action, courseId }
 *   action = "approve" | "reject" | "publish" | "unpublish" | "feature" | "unfeature"
 */
const AdminCourseSchema = z.object({
  action: z.enum(["approve", "reject", "publish", "unpublish", "feature", "unfeature"]),
  courseId: z.string().min(1).max(100),
});

type Action = z.infer<typeof AdminCourseSchema>["action"];

// approve/reject also settle a sub-admin's submission; a plain publish switch
// leaves pending_approval as it is.
const PATCH: Record<Action, Record<string, boolean>> = {
  approve: { published: true, pending_approval: false },
  reject: { published: false, pending_approval: false },
  publish: { published: true },
  unpublish: { published: false },
  feature: { trending: true },
  unfeature: { trending: false },
};

export async function POST(req: Request) {
  if (!isClerkConfigured) {
    return apiError(503, "Publishing needs the app in real (Clerk + Supabase) mode.");
  }
  let callerId: string | null = null;
  try {
    ({ userId: callerId } = await auth());
  } catch {
    callerId = null;
  }
  if (!callerId) return apiError(401, "Not authenticated.");

  const limited = enforceRate(req, "admin", callerId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Server not configured for this action.");

  const parsed = await parseJson(req, AdminCourseSchema);
  if (!parsed.ok) return apiError(400, parsed.error);
  const { action, courseId } = parsed.data;

  // The caller must be the OWNER (an admin with no permission list), the same rule
  // as the browser's isOwner guard. Sub-admins submit topics for approval instead.
  const { data: caller, error: callerErr } = await sb
    .from("profiles")
    .select("is_admin, permissions, banned")
    .eq("id", callerId)
    .maybeSingle();
  if (callerErr) return apiError(500, "Could not verify your account.");
  if (!caller?.is_admin || caller.permissions != null || caller.banned) {
    return apiError(403, "Only the owner can publish, approve or feature topics.");
  }

  try {
    const { data, error } = await sb
      .from("courses")
      .update(PATCH[action])
      .eq("id", courseId)
      .select("id, published, pending_approval, trending")
      .maybeSingle();
    if (error) throw error;
    if (!data) return apiError(404, "That topic no longer exists.");
    return NextResponse.json({ ok: true, course: data });
  } catch (e) {
    logError(`admin/courses:${action}`, e);
    return apiError(500, "The change couldn't be saved. Please try again.");
  }
}
