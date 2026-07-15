import { Bot } from "grammy";
import { ENV } from "./env";
import {
  redeemToken,
  getLinkedUserId,
  unlinkChat,
  getAccountSnapshot,
  getAnnouncements,
  getLiveSessions,
  getTrendingTopics,
  getFaqs,
  getPricing,
} from "./supabase";
import { askGemini, buildSystem, type Turn, type BotExtras } from "./gemini";

const bot = new Bot(ENV.BOT_TOKEN);

// Short per-chat conversation memory (last few turns) for a natural back-and-forth.
const histories = new Map<number, Turn[]>();

const LINK_PROMPT =
  "👋 Welcome to LEAP Coach!\n\nTo check your courses, marks, plan and progress here, link your account:\n1) Open the LEAP Coach website and sign in\n2) Go to Account settings\n3) Turn on the Telegram toggle and tap “Allow”.\n\nThat opens this chat with a secure link — then you're all set.";

// Reply for an UNREGISTERED (not-linked) person who sends a normal message.
const UNREGISTERED_REPLY =
  "There are many relevant topics on our platform 📚\nVisit www.leapcoach.in to explore.\n\n(To ask about your own courses, marks and progress here, link your account from the LEAP Coach website → Account → Telegram toggle.)";

const HELP =
  "I'm your LEAP Coach support assistant 🤝\n\nJust ask me about:\n• Your plan, credits & progress\n• Topics you own & what's trending\n• Announcements & live sessions\n• FAQs, pricing & plans\n\nFor learning the topics themselves, visit www.leapcoach.in.\nFor payments, email info.leapcoach@gmail.com.\n\nCommands:\n/me — your account summary\n/help — this message\n/unlink — disconnect this chat";

/**
 * Decide which pull-on-request data a message needs (keyword intent), then fetch only
 * those in parallel. Keeps prompts lean and avoids fetching everything every message.
 */
async function fetchExtras(text: string, role?: string): Promise<BotExtras> {
  const t = text.toLowerCase();
  const dateish = /yesterday|days? (ago|back)|last (few )?days|this week|earlier this week|on \w+day|\d{1,2}(st|nd|rd|th)?/.test(t);
  const need = {
    announcements: dateish || /announce|announcement|news|notice|bulletin|update/.test(t),
    sessions: /live session|session|webinar|workshop|office hour|meeting|\bmeet\b|\bclass\b|upcoming|next session/.test(t),
    trending: /trend|popular|\bhot\b/.test(t),
    faqs: /\bfaq\b|frequently|how do i|how to use|\bhelp\b/.test(t),
    pricing: /price|pricing|cost|\bfee\b|charge|how much|rupee|₹/.test(t),
    plans: /\bplan\b|subscription|upgrade|catalog|\bpro\b|\bmax\b|\btier\b/.test(t),
  };
  const extras: BotExtras = {};
  const jobs: Promise<void>[] = [];
  if (need.announcements) jobs.push(getAnnouncements(role).then((a) => void (extras.announcements = a)));
  if (need.sessions) jobs.push(getLiveSessions(role).then((s) => void (extras.sessions = s)));
  if (need.trending) jobs.push(getTrendingTopics().then((tt) => void (extras.trending = tt)));
  if (need.faqs) jobs.push(getFaqs().then((f) => void (extras.faqs = f)));
  if (need.pricing || need.plans) jobs.push(getPricing().then((p) => void (extras.pricing = p)));
  await Promise.all(jobs);
  return extras;
}

bot.command("start", async (ctx) => {
  const token = (ctx.match ?? "").trim();
  const chatId = ctx.chat.id;
  const tgUser = ctx.from?.username ?? null;

  if (token) {
    const userId = await redeemToken(token, chatId, tgUser);
    if (!userId) {
      await ctx.reply(
        "⚠️ That link has expired or was already used.\n\nOpen LEAP Coach → Account → switch the Telegram toggle on again to get a fresh link.",
      );
      return;
    }
    const snap = await getAccountSnapshot(userId);
    await ctx.reply(
      `✅ Linked! Hi ${snap.name || "there"} — your LEAP Coach account is now connected.\n\n${HELP}`,
    );
    return;
  }

  const existing = await getLinkedUserId(chatId);
  await ctx.reply(existing ? `You're already linked. ${HELP}` : LINK_PROMPT);
});

bot.command("help", async (ctx) => {
  const linked = await getLinkedUserId(ctx.chat.id);
  await ctx.reply(linked ? HELP : LINK_PROMPT);
});

bot.command("unlink", async (ctx) => {
  await unlinkChat(ctx.chat.id);
  histories.delete(ctx.chat.id);
  await ctx.reply("🔌 Disconnected. I won't send notifications or read your account until you link again from the website.");
});

bot.command("me", async (ctx) => {
  const userId = await getLinkedUserId(ctx.chat.id);
  if (!userId) return ctx.reply(LINK_PROMPT);
  const s = await getAccountSnapshot(userId);
  const lines = [
    `👤 ${s.name}${s.username ? ` (@${s.username})` : ""}`,
    `🎟️ Plan: ${s.plan}${s.validUntil ? ` (valid till ${String(s.validUntil).slice(0, 10)})` : ""}`,
    `⭐ Credits: ${s.credits} — ${s.tier}`,
    `✅ Completed: ${s.completedCourses.length ? s.completedCourses.join(", ") : "none yet"}`,
    `📚 In progress: ${s.inProgress.length ? s.inProgress.map((c) => `${c.title} (${c.done}/${c.total})`).join(", ") : "none"}`,
  ];
  if (s.marks.length) {
    lines.push("📝 Recent marks:");
    for (const m of s.marks.slice(0, 5)) lines.push(`   • ${m.course} — ${m.assignment}: ${m.score}% ${m.passed ? "✅" : "❌"}`);
  }
  await ctx.reply(lines.join("\n"));
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  if (text.startsWith("/")) return; // unknown command

  const userId = await getLinkedUserId(chatId);
  if (!userId) return ctx.reply(UNREGISTERED_REPLY);

  await ctx.replyWithChatAction("typing");
  try {
    const snap = await getAccountSnapshot(userId);
    const extras = await fetchExtras(text, snap.role);
    const system = buildSystem(snap, text, extras);
    const history = histories.get(chatId) ?? [];
    let reply = await askGemini(system, history, text);
    if (!reply) reply = "I'm not sure how to answer that — try asking about your courses, marks, plan, or progress.";
    histories.set(chatId, [...history, { role: "user", text }, { role: "model", text: reply }].slice(-8));
    await ctx.reply(reply);
  } catch (e: any) {
    console.error("[bot] reply failed:", e?.message ?? e);
    await ctx.reply("⚠️ I couldn't reach the AI just now. Please try again in a moment.");
  }
});

bot.catch((err) => console.error("[bot] error:", err.error));

async function main() {
  // Push notifications are intentionally OFF — the bot is pull-based: it answers
  // announcements / live sessions / etc. only when the user asks. (notify.ts is kept
  // for reference; re-enable startNotifier here if proactive alerts are ever wanted.)

  // Long-polling: the bot dials out to Telegram, so no public URL is needed — ideal
  // for localhost. On a public host you can switch to webhooks instead.
  await bot.start({
    onStart: (me) => console.log(`[bot] @${me.username} is live (long polling). Ctrl+C to stop.`),
  });
}

main().catch((e) => {
  console.error("[bot] fatal:", e);
  process.exit(1);
});
