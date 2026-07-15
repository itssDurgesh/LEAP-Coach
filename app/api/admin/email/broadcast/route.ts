import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { isEmailConfigured, sendBroadcast, type NotifyRecipient } from "@/lib/email/send";
import { renderBroadcastEmail } from "@/lib/email/template";
import { unsubscribePageUrl, unsubscribeOneClickUrl } from "@/lib/email/unsubscribe";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300; // large lists batch 100/call, but keep headroom

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.leapcoach.in";

type Kind = "announcement" | "session";

const BroadcastSchema = z.object({
  kind: z.enum(["announcement", "session"]),
  id: z.string().max(100).optional(), // required for a real send — the announcement / live_session to notify
  resendAll: z.boolean().optional(), // re-blast the WHOLE audience (default: only those not yet delivered)
  test: z.boolean().optional(), // send only to the calling admin (uses the fields below, no marking)
  // fields used ONLY for a test send (composed content isn't persisted yet):
  title: z.string().max(300).optional(),
  body: z.string().max(20_000).optional(),
  targetRole: z.string().max(40).optional(),
  startsAt: z.string().max(64).optional(),
  durationMins: z.number().int().min(0).max(100_000).optional(),
  instructorName: z.string().max(200).optional(),
  courseTitle: z.string().max(300).optional(),
  meetLink: z.string().max(1000).optional(),
});

interface Composed {
  subject: string;
  render: (unsubscribeUrl: string) => string;
}

/** Build the subject + per-recipient HTML renderer for an announcement or session. */
function compose(
  kind: Kind,
  rec: {
    title: string;
    body?: string;
    startsAt?: string | null;
    durationMins?: number | null;
    instructorName?: string | null;
    courseTitle?: string | null;
    meetLink?: string | null;
  },
): Composed {
  const isSession = kind === "session";
  const when = rec.startsAt
    ? new Date(rec.startsAt).toLocaleString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : null;

  const title = rec.title.trim();
  const subject = isSession
    ? `Live session: ${title}${when ? ` — ${when}` : ""}`
    : `${title} · LEAP Coach`;

  const render = (unsubscribeUrl: string) =>
    renderBroadcastEmail({
      kicker: isSession ? "Live session" : "Announcement",
      title,
      body: (rec.body || "").trim() || (isSession ? "Join us live — reserve your spot now." : ""),
      detailLines: isSession
        ? [
            when ? `🗓  ${when}` : "",
            rec.durationMins ? `⏱  ${rec.durationMins} minutes` : "",
            rec.instructorName ? `🎓  ${rec.instructorName}${rec.courseTitle ? ` · ${rec.courseTitle}` : ""}` : "",
          ]
        : [],
      cta: isSession
        ? { label: "Join the live session", url: rec.meetLink || `${SITE_URL}/sessions` }
        : { label: "Read on LEAP Coach", url: `${SITE_URL}/announcements` },
      unsubscribeUrl,
    });

  return { subject, render };
}

/**
 * POST /api/admin/email/broadcast — email an announcement or live session to its
 * audience. Owner or a sub-admin holding the matching permission only.
 *
 * Two modes:
 *   • test:true            → send only to the calling admin, using the composed
 *                            fields in the body (no dedupe, doesn't mark notified_at).
 *   • { kind, id }         → fetch the record server-side, refuse if it was already
 *                            notified (unless force:true), resolve recipients from
 *                            profiles (audience role · not banned · not admin · not
 *                            opted out), batch-send, then stamp notified_at.
 * The client never supplies recipient addresses.
 */
export async function POST(req: Request) {
  if (!isClerkConfigured) {
    return NextResponse.json({ error: "Emailing needs the app in real (Clerk + Supabase) mode." }, { status: 503 });
  }
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return apiError(401, "Not authenticated.");

  // Throttle broadcast sends per admin (very tight — this fans out real email).
  const limited = enforceRate(req, "email", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Database not configured.");

  const parsed = await parseJson(req, BroadcastSchema);
  if (!parsed.ok) return apiError(400, parsed.error);
  const body = parsed.data;

  // ── Caller must be an admin with the matching permission (owner = permissions null)
  const { data: caller } = await sb
    .from("profiles")
    .select("email, is_admin, permissions")
    .eq("id", userId)
    .maybeSingle();
  const needed = body.kind === "announcement" ? "announcements" : "sessions";
  const allowed =
    caller?.is_admin && (caller.permissions == null || (caller.permissions as string[]).includes(needed));
  if (!allowed) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't configured yet — add RESEND_API_KEY or Gmail credentials to .env.local (see docs/EMAIL.md)." },
      { status: 503 },
    );
  }

  const table = body.kind === "announcement" ? "announcements" : "live_sessions";

  // ── TEST: compose from the request body, send only to the caller ─────────────
  if (body.test) {
    if (!body.title?.trim()) return NextResponse.json({ error: "Add a title first." }, { status: 400 });
    if (!caller?.email) return NextResponse.json({ error: "Your profile has no email." }, { status: 400 });
    const { subject, render } = compose(body.kind, {
      title: body.title,
      body: body.body,
      startsAt: body.startsAt,
      durationMins: body.durationMins,
      instructorName: body.instructorName,
      courseTitle: body.courseTitle,
      meetLink: body.meetLink,
    });
    const me: NotifyRecipient = {
      id: userId,
      email: caller.email,
      unsubscribeUrl: unsubscribePageUrl(userId),
      oneClickUrl: unsubscribeOneClickUrl(userId),
    };
    try {
      const result = await sendBroadcast({ recipients: [me], subject, render });
      return NextResponse.json({ ok: result.failed === 0, sent: result.sent, failed: result.failed, test: true, errors: result.errors });
    } catch (e) {
      logError("email/broadcast:test", e);
      return NextResponse.json({ error: "Sending failed — check server logs." }, { status: 500 });
    }
  }

  // ── REAL SEND: fetch the record by id ────────────────────────────────────────
  if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { data: rec, error: recErr } = await sb.from(table).select("*").eq("id", body.id).maybeSingle();
  if (recErr) return NextResponse.json({ error: "Could not load the item." }, { status: 500 });
  if (!rec) return NextResponse.json({ error: "That item no longer exists." }, { status: 404 });
  if (body.kind === "announcement" && rec.published === false) {
    return NextResponse.json({ error: "Publish the announcement before emailing it." }, { status: 400 });
  }

  // Resolve the CURRENT audience server-side: role · not admin · not banned · not opted out.
  const { data: rows, error: rowsErr } = await sb.from("profiles").select("id, email, role, banned, is_admin, email_opt_out");
  if (rowsErr) return NextResponse.json({ error: "Could not load learners." }, { status: 500 });
  const target = rec.target_role && rec.target_role !== "all" ? rec.target_role : null;
  const eligible: NotifyRecipient[] = (rows ?? [])
    .filter((r) => !r.is_admin && !r.banned && !r.email_opt_out && r.email && (!target || r.role === target))
    .map((r) => ({
      id: r.id as string,
      email: r.email as string,
      unsubscribeUrl: unsubscribePageUrl(r.id as string),
      oneClickUrl: unsubscribeOneClickUrl(r.id as string),
    }));
  if (eligible.length === 0) {
    return NextResponse.json({ error: "No learners match this audience (all opted out, banned, or none in this role)." }, { status: 400 });
  }

  // Delivery ledger: pending = everyone not yet reached (unless the admin re-blasts all).
  const delivered = new Set<string>(Array.isArray(rec.notified_user_ids) ? (rec.notified_user_ids as string[]) : []);
  const deliveredBefore = delivered.size;
  const pending = body.resendAll ? eligible : eligible.filter((r) => !delivered.has(r.id));
  if (pending.length === 0) {
    return NextResponse.json({
      ok: true,
      nothingToSend: true, // everyone eligible has already received it
      deliveredNow: 0,
      failedNow: 0,
      totalEligible: eligible.length,
      alreadyDelivered: deliveredBefore,
      remaining: 0,
      notifiedAt: rec.notified_at ?? null,
      notifiedUserIds: [...delivered],
    });
  }

  const { subject, render } = compose(body.kind, {
    title: rec.title ?? "",
    body: rec.body ?? rec.description ?? "",
    startsAt: rec.starts_at,
    durationMins: rec.duration_mins,
    instructorName: rec.instructor_name,
    courseTitle: rec.course_title,
    meetLink: rec.meet_link,
  });

  let result;
  try {
    result = await sendBroadcast({ recipients: pending, subject, render });
  } catch (e) {
    logError("email/broadcast", e);
    return NextResponse.json({ error: "Sending failed — check server logs." }, { status: 500 });
  }

  // Merge the newly-delivered ids and persist. notified_at marks the FIRST successful send.
  for (const r of result.results) if (r.ok) delivered.add(r.id);
  const notifiedUserIds = [...delivered];
  let notifiedAt: string | null = rec.notified_at ?? null;
  if (result.sent > 0) {
    if (!notifiedAt) notifiedAt = new Date().toISOString();
    const { error: markErr } = await sb
      .from(table)
      .update({ notified_at: notifiedAt, notified_user_ids: notifiedUserIds })
      .eq("id", body.id);
    if (markErr) logError("email/broadcast", markErr);
  }

  return NextResponse.json({
    ok: result.failed === 0 && result.sent > 0,
    deliveredNow: result.sent,
    failedNow: result.failed,
    totalEligible: eligible.length,
    alreadyDelivered: deliveredBefore, // delivered before this run
    remaining: eligible.filter((r) => !delivered.has(r.id)).length,
    notifiedAt,
    notifiedUserIds,
    errors: result.errors,
  });
}
