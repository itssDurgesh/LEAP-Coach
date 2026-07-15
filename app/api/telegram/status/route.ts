import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk/config";
import { getServiceClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api/errors";
import { enforceRate } from "@/lib/api/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/telegram/status — is the signed-in user's account linked to Telegram?
 * Drives the toggle's on/off state in account settings.
 */
export async function GET(req: Request) {
  if (!isClerkConfigured) return NextResponse.json({ linked: false, configured: false });

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
  if (!sb) return NextResponse.json({ linked: false, configured: false });

  const { data } = await sb
    .from("telegram_links")
    .select("telegram_username, linked_at")
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    linked: !!data,
    configured: true,
    telegramUsername: data?.telegram_username ?? null,
    botUsername: process.env.TELEGRAM_BOT_USERNAME || "LeapCoachbot",
  });
}
