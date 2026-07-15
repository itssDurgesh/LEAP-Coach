import { createClient } from "@supabase/supabase-js";
import { ENV, MAX_CONTEXT_CHARS } from "./env";

// Service-role client — bypasses RLS. SERVER ONLY (this is a standalone process,
// never shipped to a browser). Every data read below is scoped to a single user id;
// the bot performs NO writes to LMS/user content — its only writes are to its own
// linking tables (telegram_links / telegram_link_tokens), which is connection state.
export const sb = createClient(ENV.SUPABASE_URL, ENV.SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─────────────────────────── linking ───────────────────────────

/**
 * Redeem a one-time link token from a /start deep link: validates it's unused and
 * unexpired, binds chat ↔ user, and marks the token used. Returns the LEAP user id,
 * or null when the token is invalid/expired/used.
 */
export async function redeemToken(
  token: string,
  chatId: number,
  telegramUsername: string | null,
): Promise<string | null> {
  const { data: row } = await sb
    .from("telegram_link_tokens")
    .select("user_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return null;

  const { error } = await sb.from("telegram_links").upsert(
    {
      user_id: row.user_id,
      chat_id: chatId,
      telegram_username: telegramUsername,
      linked_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("[bot] link upsert failed:", error.message);
    return null;
  }
  await sb.from("telegram_link_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
  return row.user_id as string;
}

/** Resolve which LEAP user owns this chat (and bump last_seen). null = not linked. */
export async function getLinkedUserId(chatId: number): Promise<string | null> {
  const { data } = await sb.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
  if (!data) return null;
  void sb.from("telegram_links").update({ last_seen_at: new Date().toISOString() }).eq("chat_id", chatId);
  return data.user_id as string;
}

export async function unlinkChat(chatId: number): Promise<void> {
  await sb.from("telegram_links").delete().eq("chat_id", chatId);
}

// ─────────────────────────── account snapshot ───────────────────────────

// Keep in sync with CREDIT_TIERS in lib/types.ts.
const CREDIT_TIERS: { min: number; label: string }[] = [
  { min: 2000, label: "Star" },
  { min: 1001, label: "Advanced" },
  { min: 501, label: "Learner" },
  { min: 0, label: "Aspirant" },
];
const creditTier = (c: number) => CREDIT_TIERS.find((t) => c >= t.min)?.label ?? "Aspirant";
const planLabel = (count: number) => (count >= 3 ? "Max" : count === 2 ? "Pro+" : count === 1 ? "Pro" : "Free");

export interface AccountSnapshot {
  name: string;
  username?: string;
  role?: string;
  plan: string;
  planCategories: number;
  validUntil?: string | null;
  credits: number;
  tier: string;
  ownedCourses: string[];
  completedCourses: string[];
  inProgress: { title: string; done: number; total: number }[];
  marks: { course: string; assignment: string; score: number; passed: boolean; attempt: number; date: string }[];
}

/** Everything the bot may tell a user ABOUT THEIR OWN ACCOUNT. Scoped to userId. */
export async function getAccountSnapshot(userId: string): Promise<AccountSnapshot> {
  const [profileRes, passesRes, purchasesRes, enrollRes, progressRes, subsRes, coursesRes, videosRes, assignRes] =
    await Promise.all([
      sb.from("profiles").select("name, username, role, learning_credits, subscription_plan, subscription_valid_until").eq("id", userId).maybeSingle(),
      sb.from("category_passes").select("category").eq("user_id", userId),
      sb.from("course_purchases").select("course_id").eq("user_id", userId),
      sb.from("enrollments").select("course_id, completed_at").eq("user_id", userId),
      sb.from("video_progress").select("course_id, completed").eq("user_id", userId),
      sb.from("submissions").select("course_id, assignment_id, score, passed, attempt_number, submitted_at").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(50),
      sb.from("courses").select("id, title, category, categories"),
      sb.from("videos").select("course_id"),
      sb.from("assignments").select("id, title"),
    ]);

  const p: any = profileRes.data ?? {};
  const cats = (passesRes.data ?? []).map((r: any) => r.category);
  const catSet = new Set<string>(cats);
  const ownedIds = new Set((purchasesRes.data ?? []).map((r: any) => r.course_id));
  const courses = (coursesRes.data ?? []) as any[];
  const titleOf = new Map<string, string>(courses.map((c) => [c.id, c.title]));
  const assignTitle = new Map<string, string>(((assignRes.data ?? []) as any[]).map((a) => [a.id, a.title]));

  const credits = p.learning_credits ?? 0;
  const planCount = p.subscription_plan === "all_access" ? 3 : catSet.size;

  const courseCats = (c: any): string[] => (c.categories?.length ? c.categories : [c.category]).filter(Boolean);
  const owns = (c: any) => ownedIds.has(c.id) || courseCats(c).some((cat) => catSet.has(cat));
  const ownedCourses = courses.filter(owns).map((c) => c.title);

  const totalByCourse = new Map<string, number>();
  for (const v of (videosRes.data ?? []) as any[]) totalByCourse.set(v.course_id, (totalByCourse.get(v.course_id) ?? 0) + 1);
  const doneByCourse = new Map<string, number>();
  for (const r of (progressRes.data ?? []) as any[]) if (r.completed) doneByCourse.set(r.course_id, (doneByCourse.get(r.course_id) ?? 0) + 1);

  const completedCourses: string[] = [];
  const inProgress: AccountSnapshot["inProgress"] = [];
  for (const e of (enrollRes.data ?? []) as any[]) {
    const title = titleOf.get(e.course_id) ?? "Untitled topic";
    const total = totalByCourse.get(e.course_id) ?? 0;
    const done = doneByCourse.get(e.course_id) ?? 0;
    if (e.completed_at || (total > 0 && done >= total)) completedCourses.push(title);
    else inProgress.push({ title, done, total });
  }

  const marks = ((subsRes.data ?? []) as any[]).slice(0, 25).map((s) => ({
    course: titleOf.get(s.course_id) ?? "Untitled topic",
    assignment: assignTitle.get(s.assignment_id) ?? "Assessment",
    score: Math.round(Number(s.score)),
    passed: !!s.passed,
    attempt: s.attempt_number ?? 1,
    date: (s.submitted_at ?? "").slice(0, 10),
  }));

  return {
    name: p.name ?? "",
    username: p.username ?? undefined,
    role: p.role ?? undefined,
    plan: planLabel(planCount),
    planCategories: planCount,
    validUntil: p.subscription_valid_until ?? null,
    credits,
    tier: creditTier(credits),
    ownedCourses,
    completedCourses,
    inProgress,
    marks,
  };
}

// ─────────────────────────── lecture-content RAG ───────────────────────────

const stop = new Set(["what","when","where","which","about","this","that","with","have","does","tell","from","your","mine","much","many","could","would","there","their","them","they"]);

/**
 * Build grounded lecture context for a question, drawn ONLY from videos in topics the
 * user can access (purchased, category-pass, or enrolled). Ranks videos by keyword
 * overlap with the question and returns a bounded transcript/summary digest.
 */
export async function getCourseContext(userId: string, question: string): Promise<string> {
  const [passesRes, purchasesRes, enrollRes, coursesRes] = await Promise.all([
    sb.from("category_passes").select("category").eq("user_id", userId),
    sb.from("course_purchases").select("course_id").eq("user_id", userId),
    sb.from("enrollments").select("course_id").eq("user_id", userId),
    sb.from("courses").select("id, title, category, categories"),
  ]);
  const catSet = new Set<string>((passesRes.data ?? []).map((r: any) => r.category));
  const accessible = new Set<string>();
  for (const r of (purchasesRes.data ?? []) as any[]) accessible.add(r.course_id);
  for (const r of (enrollRes.data ?? []) as any[]) accessible.add(r.course_id);
  for (const c of (coursesRes.data ?? []) as any[]) {
    const cc = (c.categories?.length ? c.categories : [c.category]).filter(Boolean);
    if (cc.some((cat: string) => catSet.has(cat))) accessible.add(c.id);
  }
  if (accessible.size === 0) return "";

  const titleOf = new Map<string, string>(((coursesRes.data ?? []) as any[]).map((c) => [c.id, c.title]));
  const { data: vids } = await sb
    .from("videos")
    .select("course_id, title, summary, transcript")
    .in("course_id", Array.from(accessible));

  const terms = question.toLowerCase().match(/[a-z0-9]{4,}/g)?.filter((t) => !stop.has(t)) ?? [];
  const scored = ((vids ?? []) as any[]).map((v) => {
    const hay = `${v.title ?? ""} ${v.summary ?? ""} ${v.transcript ?? ""}`.toLowerCase();
    const score = terms.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // If nothing matched, still pass a few summaries so general questions have grounding.
  const picked = scored.filter((s) => s.score > 0).slice(0, 4);
  const top = picked.length ? picked : scored.slice(0, 3);

  let out = "";
  for (const { v } of top) {
    const course = titleOf.get(v.course_id) ?? "Topic";
    const body = (v.transcript || v.summary || "").slice(0, 1500);
    const block = `### ${course} — ${v.title}\n${v.summary ? `Summary: ${v.summary}\n` : ""}${body}\n\n`;
    if (out.length + block.length > MAX_CONTEXT_CHARS) break;
    out += block;
  }
  return out.trim();
}

// ─────────────────────────── pull-on-request data (announcements, sessions, trending, FAQ, pricing) ───────────────────────────

export interface AnnouncementItem {
  title: string;
  body: string;
  date: string; // YYYY-MM-DD
  ageHours: number;
  targetRole: string;
}
/** Published announcements for this user's role within the last `days` (default 14), newest first. */
export async function getAnnouncements(role: string | undefined, days = 14): Promise<AnnouncementItem[]> {
  const sinceISO = new Date(Date.now() - days * 864e5).toISOString();
  const { data } = await sb
    .from("announcements")
    .select("title, body, target_role, created_at, published")
    .eq("published", true)
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: false })
    .limit(30);
  const now = Date.now();
  return ((data ?? []) as any[])
    .filter((a) => a.target_role === "all" || !role || a.target_role === role)
    .map((a) => ({
      title: a.title ?? "",
      body: a.body ?? "",
      date: (a.created_at ?? "").slice(0, 10),
      ageHours: Math.round((now - new Date(a.created_at).getTime()) / 36e5),
      targetRole: a.target_role ?? "all",
    }));
}

export interface SessionItem {
  title: string;
  startsAt: string;
  date: string;
  role: string;
  instructor?: string;
}
/** Live sessions for this user's role from the last 24h onward (recent + upcoming), soonest first. */
export async function getLiveSessions(role: string | undefined): Promise<SessionItem[]> {
  const sinceISO = new Date(Date.now() - 864e5).toISOString();
  const { data } = await sb
    .from("live_sessions")
    .select("title, starts_at, target_role, instructor_name")
    .gte("starts_at", sinceISO)
    .order("starts_at", { ascending: true })
    .limit(20);
  return ((data ?? []) as any[])
    .filter((s) => s.target_role === "all" || !role || s.target_role === role)
    .map((s) => ({
      title: s.title ?? "",
      startsAt: s.starts_at,
      date: (s.starts_at ?? "").slice(0, 10),
      role: s.target_role ?? "all",
      instructor: s.instructor_name ?? undefined,
    }));
}

/** Titles of published, trending topics. */
export async function getTrendingTopics(): Promise<string[]> {
  const { data } = await sb
    .from("courses")
    .select("title, trending, published")
    .eq("published", true)
    .eq("trending", true)
    .limit(15);
  return ((data ?? []) as any[]).map((c) => c.title);
}

/** Published FAQ entries (question + answer), in display order. */
export async function getFaqs(): Promise<{ question: string; answer: string }[]> {
  const { data } = await sb
    .from("faqs")
    .select("question, answer, published, order_index")
    .eq("published", true)
    .order("order_index", { ascending: true })
    .limit(30);
  return ((data ?? []) as any[]).map((f) => ({ question: f.question ?? "", answer: f.answer ?? "" }));
}

export interface Pricing {
  cat1: number;
  cat2: number;
  cat3: number;
  perTopicFrom: number;
}
/** Admin-set plan pricing (single row). */
export async function getPricing(): Promise<Pricing | null> {
  const { data } = await sb.from("pricing_tiers").select("cat1, cat2, cat3, per_topic_from").eq("id", 1).maybeSingle();
  if (!data) return null;
  return { cat1: data.cat1, cat2: data.cat2, cat3: data.cat3, perTopicFrom: data.per_topic_from ?? 999 };
}

// ─────────────────────────── notifications helpers (unused while push is off) ───────────────────────────

export async function chatsForRole(role: string | null | undefined): Promise<number[]> {
  if (!role || role === "all") {
    const { data } = await sb.from("telegram_links").select("chat_id");
    return ((data ?? []) as any[]).map((r) => Number(r.chat_id));
  }
  const { data } = await sb.from("telegram_links").select("chat_id, profiles!inner(role)").eq("profiles.role", role);
  return ((data ?? []) as any[]).map((r) => Number(r.chat_id));
}

export async function chatForUser(userId: string): Promise<number | null> {
  const { data } = await sb.from("telegram_links").select("chat_id").eq("user_id", userId).maybeSingle();
  return data ? Number(data.chat_id) : null;
}
