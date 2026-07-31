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
 * POST /api/admin/courses — owner-only publish / approval transitions.
 *
 * WHY a server route: `courses admin write` is an RLS policy gated on is_admin(),
 * which resolves the caller from `auth.jwt() ->> 'sub'`. When that doesn't resolve
 * for a browser request, an UPDATE matches zero rows and PostgREST returns success
 * with no error — the optimistic UI flips, nothing persists, and learners keep
 * seeing the old state. The service role bypasses RLS, so these writes always stick
 * and a missing row is reported as a real 404 instead of a silent no-op.
 *
 * Body: { action, courseId }
 *   action = "approve" | "reject" | "publish" | "unpublish"
 */
const AdminCourseSchema = z.object({
  action: z.enum(["approve", "reject", "publish", "unpublish"]),
  courseId: z.string().min(1).max(100),
});

// approve/reject also clear the sub-admin submission flag; a plain publish toggle
// leaves pending_approval untouched.
const PATCH: Record<z.infer<typeof AdminCourseSchema>["action"], Record<string, boolean>> = {
  approve: { published: true, pending_approval: false },
  reject: { published: false, pending_approval: false },
  publish: { published: true },
  unpublish: { published: false },
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

  // Caller must be the OWNER (admin with no restricted permission set) — same rule
  // as the client `isOwner` guard. Sub-admins submit for approval, they don't publish.
  const { data: caller, error: callerErr } = await sb
    .from("profiles")
    .select("is_admin, permissions")
    .eq("id", callerId)
    .maybeSingle();
  if (callerErr) return apiError(500, "Could not verify your account.");
  if (!caller?.is_admin || caller.permissions != null) {
    return apiError(403, "Only the owner can publish or approve topics.");
  }

  try {
    const { data, error } = await sb
      .from("courses")
      .update(PATCH[action])
      .eq("id", courseId)
      .select("id, published, pending_approval")
      .maybeSingle();
    if (error) throw error;
    if (!data) return apiError(404, "That topic no longer exists.");
    return NextResponse.json({ ok: true, course: data });
  } catch (e) {
    logError(`admin/courses:${action}`, e);
    return apiError(500, "The change couldn't be saved. Please try again.");
  }
}
