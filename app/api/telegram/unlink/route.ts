import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/telegram/unlink — disconnect the signed-in user's Telegram binding.
 * Deletes the link row (and any pending tokens). The bot stops pushing to that chat;
 * relinking later mints a brand-new token.
 */
export async function POST(req: Request) {
  if (!isClerkConfigured) {
    return apiError(503, "Auth not configured.");
  }
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }
  if (!userId) return apiError(401, "Not authenticated.");

  const limited = enforceRate(req, "telegram", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Database not configured.");

  await sb.from("telegram_link_tokens").delete().eq("user_id", userId);
  const { error } = await sb.from("telegram_links").delete().eq("user_id", userId);
  if (error) {
    logError("telegram/unlink", error.message);
    return apiError(500, "Could not unlink.");
  }

  return NextResponse.json({ ok: true, linked: false });
}
