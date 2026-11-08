import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { refreshTopicCredit } from "@/lib/learning/server";
import { parseJson } from "@/lib/api/validate";
import { apiError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";
import { rejectIfBanned } from "@/lib/api/banned";

export const runtime = "nodejs";

/**
 * POST /api/leap/credits { courseId }: bank the signed-in learner's credit for a
 * topic once it is complete (after its last video, or a checkpoint graded in the
 * browser on a database without the 2026-11-05 update). Learners cannot write their
 * credits themselves any more; this works them out from what is stored, so calling
 * it can never award more than the learner earned. Returns their credits.
 */
const Body = z.object({ courseId: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  if (!isClerkConfigured) return apiError(503, "Credits are kept in the browser here.");
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return apiError(401, "Not authenticated.");
  const banned = await rejectIfBanned(userId);
  if (banned) return banned;
  const limited = enforceRate(req, "default", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Server not configured for this action.");
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return apiError(400, parsed.error);

  const credits = await refreshTopicCredit(sb, userId, parsed.data.courseId);
  if (!credits) return apiError(500, "Could not update your credits.");
  return NextResponse.json({ credits });
}
