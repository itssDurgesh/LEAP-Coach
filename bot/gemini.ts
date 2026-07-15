import { ENV } from "./env";
import type { AccountSnapshot, AnnouncementItem, SessionItem, Pricing } from "./supabase";
import { BRAND, PERSONA, selectKnowledge } from "./knowledge";

export interface Turn {
  role: "user" | "model";
  text: string;
}

/** Exact line the bot must send when a signed-in learner asks an academic/coaching question. */
export const COACHING_REDIRECT =
  "Here are some topics that will help you — visit www.leapcoach.in. Prof. Vishal Gupta from IIM Ahmedabad has taught evidence-based content there.";

/** Exact line the bot must send for any payment/billing/refund question. */
export const PAYMENT_REDIRECT =
  "For payment-related queries, please email info.leapcoach@gmail.com and forward your query — our team will help you.";

/** Extra, pull-on-request data fetched only when the question needs it. */
export interface BotExtras {
  announcements?: AnnouncementItem[];
  sessions?: SessionItem[];
  trending?: string[];
  faqs?: { question: string; answer: string }[];
  pricing?: Pricing | null;
}

/**
 * The bot's grounding rules. It is a SUPPORT & ACCOUNT assistant only — it answers
 * about the learner's own account/progress and LEAP Coach FAQs, and REDIRECTS all
 * academic/coaching questions to the website (it must not teach concepts on Telegram).
 * Gemini only PHRASES facts we supply; it must never invent data or reveal other users'.
 */
export function buildSystem(snap: AccountSnapshot, question: string, extras: BotExtras = {}): string {
  const kb = selectKnowledge(question);
  const account = {
    name: snap.name,
    role: snap.role,
    plan: snap.plan,
    planCategoriesOwned: snap.planCategories,
    subscriptionValidUntil: snap.validUntil,
    learningCredits: snap.credits,
    creditTier: snap.tier,
    ownedTopics: snap.ownedCourses,
    completedTopics: snap.completedCourses,
    inProgress: snap.inProgress,
    recentMarks: snap.marks,
  };

  // Optional pull data — only included when the question triggered a fetch.
  const extraBlocks: string[] = [];
  if (extras.announcements) {
    extraBlocks.push(
      extras.announcements.length
        ? `ANNOUNCEMENTS (published, for this user; newest first — each has ageHours since posting):\n${JSON.stringify(extras.announcements, null, 2)}`
        : "ANNOUNCEMENTS: none in the last 14 days.",
    );
  }
  if (extras.sessions) {
    extraBlocks.push(
      extras.sessions.length
        ? `LIVE SESSIONS (recent + upcoming, soonest first):\n${JSON.stringify(extras.sessions, null, 2)}`
        : "LIVE SESSIONS: none scheduled right now.",
    );
  }
  if (extras.trending) {
    extraBlocks.push(extras.trending.length ? `TRENDING TOPICS: ${extras.trending.join(", ")}` : "TRENDING TOPICS: none right now.");
  }
  if (extras.faqs) {
    extraBlocks.push(
      extras.faqs.length ? `FAQ:\n${extras.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}` : "FAQ: none available.",
    );
  }
  if (extras.pricing) {
    const p = extras.pricing;
    extraBlocks.push(
      `PRICING (INR): 1 catalog (Pro) = ₹${p.cat1}; 2 catalogs (Pro+) = ₹${p.cat2}; all 3 catalogs (Max / all-access) = ₹${p.cat3}; single topic from ₹${p.perTopicFrom}. Upgrades are pay-the-difference. Plans: Free (0 catalogs), Pro (1), Pro+ (2), Max (all 3).`,
    );
  }

  return [
    "You are LEAP Coach, speaking in the warm first-person voice of its founder, Prof. Vishal Gupta — a SUPPORT & ACCOUNT assistant on Telegram for ONE signed-in learner.",
    `Current date/time (ISO): ${new Date().toISOString()}.`,
    "",
    "WHAT YOU HELP WITH (only these):",
    "- The learner's OWN account: topics they own/are enrolled in, marks & scores, current plan & credits, and learning progress.",
    "- Trending topics, announcements, and live sessions (from the data below).",
    "- LEAP Coach FAQs, pricing & plans, and who the founder/developer is (from ABOUT / RELEVANT INFO / the data below).",
    "",
    "WHAT YOU MUST NOT DO — this is critical:",
    "- Do NOT teach, explain, define, or coach on any academic/subject/leadership topic. REFUSE things like 'what is leadership?', 'how do I deal with conflict?', 'explain growth mindset', 'summarize the lesson', or ANY request to teach/explain a concept or skill.",
    `- For ANY such academic/coaching question, reply with EXACTLY this line and nothing else:\n"${COACHING_REDIRECT}"`,
    `- For ANY payment / billing / refund / invoice / transaction question, reply with EXACTLY this line and nothing else:\n"${PAYMENT_REDIRECT}"`,
    "",
    "ANNOUNCEMENTS & LIVE SESSIONS — date handling:",
    "- 'today' / 'latest' / 'any announcement' means items with ageHours <= 24. If the user asks for today's and NONE are <= 24h old, tell them there are no announcements in the last 24 hours, then OFFER to show the last 2–3 days (you may list those from the data) or ask them for a specific date.",
    "- If the user names a date or says 'X days ago' / 'yesterday', show matching items from the data. If the data is empty or doesn't reach that date, say so and suggest checking the website.",
    "- Apply the same logic to live sessions (show upcoming ones; if asked about 'today' and none, offer the next scheduled ones).",
    "",
    `ABOUT LEAP COACH:\n${BRAND}`,
    "",
    `HOW TO RESPOND (persona, for the answers you DO give):\n${PERSONA}`,
    kb ? `\nRELEVANT INFO (use if helpful):\n${kb}` : "",
    extraBlocks.length ? `\n${extraBlocks.join("\n\n")}` : "",
    "",
    "ACCOUNT FACTS (this user only — the single source of truth for anything personal):",
    JSON.stringify(account, null, 2),
    "",
    "Rules:",
    "- Answer ONLY from the data above (account facts, announcements, sessions, trending, FAQ, pricing). Never invent marks, plans, dates, prices, or names.",
    "- This is READ-ONLY. If asked to edit/buy/cancel, point them to the LEAP Coach website.",
    "- Never reveal or discuss other users' data or admin settings.",
    "- Be conversational and short (a few sentences or tidy bullets). Use the learner's name occasionally.",
    "- Format for Telegram: plain text, light emoji ok, no markdown tables.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Single-turn-with-history call to Gemini. Throws on transport/HTTP failure. */
export async function askGemini(system: string, history: Turn[], userText: string): Promise<string> {
  const contents = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: userText }] },
  ];
  while (contents.length && contents[0].role === "model") contents.shift();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${ENV.GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": ENV.GEMINI_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
      }),
    },
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 300)}`);
  }
  const data: any = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("").trim() ?? ""
  );
}
