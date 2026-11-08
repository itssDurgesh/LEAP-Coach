import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { canSignPlayback, playbackPolicy, type PlaybackPolicy } from "@/lib/mux/playback";
import { parseJson } from "@/lib/api/validate";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/admin/mux/playback-ids { ids }: for Content Studio, whether each Mux
 * playback id is signed (plays only with this server's tokens) or public (anyone
 * who has the id can watch), or unknown to Mux; and whether this server can sign
 * at all. Admins who edit topics only.
 */
const Body = z.object({ ids: z.array(z.string().min(1).max(200)).min(1).max(100) });

/** Ask Mux about a few ids at a time. */
async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function POST(req: Request) {
  if (!isClerkConfigured) return apiError(503, "Needs the app in real (Clerk + Supabase) mode.");
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
  const parsed = await parseJson(req, Body);
  if (!parsed.ok) return apiError(400, parsed.error);

  const { data: caller, error } = await sb.from("profiles").select("is_admin, permissions, banned").eq("id", callerId).maybeSingle();
  if (error) {
    logError("admin/mux/playback-ids", error);
    return apiError(500, "Could not verify your account.");
  }
  const perms = caller?.permissions as string[] | null | undefined;
  if (!caller?.is_admin || caller.banned || (perms != null && !perms.includes("content"))) {
    return apiError(403, "Only admins who edit topics can check playback ids.");
  }

  const ids = Array.from(new Set(parsed.data.ids.map((id) => id.trim()).filter(Boolean)));
  const found = await inBatches(ids, 8, async (id) => [id, await playbackPolicy(id)] as [string, PlaybackPolicy]);
  return NextResponse.json(
    { signing: canSignPlayback(), policies: Object.fromEntries(found) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
