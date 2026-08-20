import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { apiError, logError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";
import { rejectIfBanned } from "@/lib/api/banned";

export const runtime = "nodejs";

const TOKEN_TTL_MIN = 10;

/**
 * POST /api/telegram/link — the signed-in user tapped "Allow" on the Telegram toggle.
 * Mints a fresh, single-use token bound to their Clerk user id and returns the bot
 * deep link. The bot redeems the token on /start to bind chat ↔ account. Each call
 * mints a brand-new token (older unused ones for this user are cleared first).
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

  // Throttle token minting per user to prevent link-token flooding.
  // A suspended account keeps a valid Clerk session until it reloads, so the
  // client-side sign-out is not an authorization boundary.
  const banned = await rejectIfBanned(userId);
  if (banned) return banned;

  const limited = enforceRate(req, "telegram", userId);
  if (limited) return limited;

  const sb = getServiceClient();
  if (!sb) return apiError(503, "Database not configured.");

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "LeapCoachbot";
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();

  // Clear any prior unused tokens for this user so only the newest is valid.
  await sb.from("telegram_link_tokens").delete().eq("user_id", userId).is("used_at", null);

  const { error } = await sb
    .from("telegram_link_tokens")
    .insert({ token, user_id: userId, expires_at: expiresAt });
  if (error) {
    logError("telegram/link", error.message);
    return apiError(500, "Could not start linking.");
  }

  return NextResponse.json({
    deepLink: `https://t.me/${botUsername}?start=${token}`,
    botUsername,
    expiresInMinutes: TOKEN_TTL_MIN,
  });
}
