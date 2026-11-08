import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { canOpenCourse } from "@/lib/learning/server";
import { isMuxPlaybackId, playbackGrant } from "@/lib/mux/playback";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/leap/playback { videoId, retry? }: what the lesson player needs to play
 * one Mux video: its playback id and, when that id is signed, tokens that expire
 * (lib/mux/playback.ts). Only for a learner who may open the topic, by the same
 * rule as every other paid read (canOpenCourse); a banned account opens nothing.
 *
 * The playback id comes from the database, not the browser's copy of the topic,
 * so a session whose id the admin replaced (public → signed) plays the new one.
 *
 * `retry`: Mux refused what the player had (an expired token, or an id that was
 * replaced), so ask Mux again instead of trusting what this server remembers.
 */
const Body = z.object({
  videoId: z.string().min(1).max(100),
  retry: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  // The local demo plays its videos straight from the topic data.
  if (!isClerkConfigured || !isSupabaseConfigured) return apiError(503, "Videos play without a server check here.");

  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return apiError(401, "Not authenticated.");
  const limited = enforceRate(req, "default", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Server not configured for this action.");
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return apiError(400, parsed.error);
  const { videoId, retry } = parsed.data;

  try {
    const { data: video, error } = await sb
      .from("videos")
      .select("course_id, mux_playback_id, duration_seconds")
      .eq("id", videoId)
      .maybeSingle();
    if (error) throw error;
    if (!video) return apiError(404, "That session no longer exists.");

    // Whether this learner may watch comes first; nothing about the video is sent otherwise.
    const open = await canOpenCourse(sb, userId, video.course_id);
    if (open === null) return apiError(500, "Could not load this video. Please try again.");
    if (!open) return apiError(403, "This session is part of a topic you don't have access to.");

    const playbackId = String(video.mux_playback_id ?? "").trim();
    if (!isMuxPlaybackId(playbackId)) return apiError(404, "This session has no video yet.");
    const grant = await playbackGrant(playbackId, video.duration_seconds, { fresh: retry });
    return NextResponse.json(grant, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    logError("leap/playback", e);
    return apiError(500, "Could not load this video. Please try again.");
  }
}
