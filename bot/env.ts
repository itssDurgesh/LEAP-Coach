import { config } from "dotenv";
import path from "node:path";

// The bot is a standalone process (not Next.js), so it must load env itself.
// Next's convention is .env.local; fall back to .env.
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

function required(name: string, ...fallbacks: string[]): string {
  for (const n of [name, ...fallbacks]) {
    const v = process.env[n];
    if (v) return v;
  }
  const names = [name, ...fallbacks].join(" or ");
  console.error(`[bot] Missing required env var: ${names}. Add it to .env.local and retry.`);
  process.exit(1);
}

export const ENV = {
  BOT_TOKEN: required("TELEGRAM_BOT_TOKEN"),
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  SERVICE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
  // One shared Gemini key for the whole project: the bot reuses the web app's
  // GEMINI_API_KEY. BOT_GEMINI_API_KEY is still honored as an optional override
  // for anyone who wants a separate key/quota for the bot.
  GEMINI_KEY: required("GEMINI_API_KEY", "BOT_GEMINI_API_KEY"),
  // Same shared model as the in-app tutor; override with GEMINI_MODEL (or
  // BOT_GEMINI_MODEL for a bot-only override).
  GEMINI_MODEL: process.env.BOT_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
};

/** Keep transcript context bounded so token cost / latency stay predictable. */
export const MAX_CONTEXT_CHARS = 6000;
