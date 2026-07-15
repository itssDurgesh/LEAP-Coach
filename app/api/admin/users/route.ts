import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/types";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/admin/users — owner-only privileged user management.
 *
 * WHY a server route: is_admin / permissions / banned on `profiles` are pinned by
 * the `protect_privileged_cols` trigger for any caller Postgres doesn't see as an
 * admin. A browser write (Clerk-JWT'd) is silently reverted whenever is_admin()
 * doesn't resolve for that request, so grant/revoke/ban appeared to "not work".
 * The service role is exempt from the trigger and RLS, so these writes always stick.
 *
 * Body: { action, userId, permissions?, banned? }
 *   action = "grant" | "revoke" | "ban" | "delete"
 */
const AdminUserSchema = z.object({
  action: z.enum(["grant", "revoke", "ban", "delete"]),
  userId: z.string().min(1).max(100),
  permissions: z.array(z.string().max(64)).max(50).optional(),
  banned: z.boolean().optional(),
});

const VALID_PERMS = new Set<string>(PERMISSIONS.map((p) => p.id));

export async function POST(req: Request) {
  if (!isClerkConfigured) {
    return NextResponse.json({ error: "User management needs the app in real (Clerk + Supabase) mode." }, { status: 503 });
  }
  let callerId: string | null = null;
  try {
    ({ userId: callerId } = await auth());
  } catch {
    callerId = null;
  }
  if (!callerId) return apiError(401, "Not authenticated.");

  // Throttle privileged user-management calls per caller.
  const limited = enforceRate(req, "admin", callerId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Server not configured for this action.");

  const parsed = await parseJson(req, AdminUserSchema);
  if (!parsed.ok) return apiError(400, parsed.error);
  const body = parsed.data;
  const { action, userId } = body;

  // Caller must be the OWNER (admin with no restricted permission set) — same rule
  // as the client `isOwner` guard and the `requires="owner"` page gate.
  const { data: caller, error: callerErr } = await sb
    .from("profiles")
    .select("is_admin, permissions")
    .eq("id", callerId)
    .maybeSingle();
  if (callerErr) return NextResponse.json({ error: "Could not verify your account." }, { status: 500 });
  const callerIsOwner = !!caller?.is_admin && caller.permissions == null;
  if (!callerIsOwner) return NextResponse.json({ error: "Only the owner can manage users." }, { status: 403 });

  // Never let the owner lock themselves out.
  if (userId === callerId && action !== "grant") {
    return NextResponse.json({ error: "You can't revoke, ban, or delete your own owner account." }, { status: 400 });
  }

  // Guard the target: an owner (is_admin + null permissions) is never demotable/bannable here.
  const { data: target } = await sb
    .from("profiles")
    .select("is_admin, permissions")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "That learner no longer exists." }, { status: 404 });
  const targetIsOwner = !!target.is_admin && target.permissions == null;
  if (targetIsOwner && action !== "grant") {
    return NextResponse.json({ error: "You can't modify another owner." }, { status: 400 });
  }

  try {
    if (action === "delete") {
      const { error } = await sb.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    } else if (action === "ban") {
      const { error } = await sb.from("profiles").update({ banned: !!body.banned }).eq("id", userId);
      if (error) throw error;
    } else if (action === "grant") {
      const perms = (body.permissions ?? []).filter((p) => VALID_PERMS.has(p));
      const { error } = await sb.from("profiles").update({ is_admin: true, permissions: perms }).eq("id", userId);
      if (error) throw error;
    } else {
      // revoke
      const { error } = await sb.from("profiles").update({ is_admin: false, permissions: null }).eq("id", userId);
      if (error) throw error;
    }
  } catch (e) {
    logError(`admin/users:${action}`, e);
    return apiError(500, "The change couldn't be saved. Please try again.");
  }

  return NextResponse.json({ ok: true });
}
