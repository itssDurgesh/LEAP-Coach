// ─────────────────────────────────────────────────────────────
// Leap Coach — domain model
// These types mirror the (future) Supabase schema 1:1 so the mock
// data layer can be swapped for real queries with minimal changes.
// ─────────────────────────────────────────────────────────────

export type Role = "student" | "professional" | "entrepreneur";
export type Gender = "male" | "female" | "non_binary" | "prefer_not";

// Sub-admin permissions. A user with isAdmin=true and NO `permissions` array is the
// full owner; a sub-admin has isAdmin=true and is limited to the listed permissions.
export type Permission =
  | "content"
  | "team"
  | "homepage"
  | "sessions"
  | "discussion" // legacy: the global Discussion board was removed; kept so old sub-admin records still type-check
  | "articles"
  | "announcements"
  | "payments";

export const PERMISSIONS: { id: Permission; label: string; hint: string }[] = [
  { id: "content", label: "Coaching topics", hint: "Create & edit topics, questions & workbooks (publishing needs owner approval)" },
  { id: "articles", label: "Articles", hint: "Write & publish articles shown to learners" },
  { id: "announcements", label: "Announcements", hint: "Post announcements broadcast to all learners" },
  { id: "team", label: "Team", hint: "Manage team members" },
  { id: "homepage", label: "Homepage", hint: "Edit the public homepage" },
  { id: "sessions", label: "Live sessions", hint: "Schedule & manage sessions" },
  { id: "payments", label: "Payments & subscriptions", hint: "View payments, revenue & subscriptions; retry failed grants (refunds & pricing stay owner-only)" },
];

type AdminLike = { isAdmin?: boolean; permissions?: Permission[] | null } | null | undefined;

/** The full owner: an admin with no restricted permission set. */
export function isOwner(u: AdminLike): boolean {
  return !!u?.isAdmin && u.permissions == null;
}

/** Whether an admin/sub-admin may perform an action. Owners can do everything. */
export function hasPermission(u: AdminLike, p: Permission): boolean {
  if (!u?.isAdmin) return false;
  if (u.permissions == null) return true; // owner
  return u.permissions.includes(p);
}

export const ROLES: { id: Role; label: string; tagline: string; icon: string }[] = [
  { id: "student", label: "Student", tagline: "Academic skill-building, exam prep & career readiness", icon: "GraduationCap" },
  { id: "professional", label: "Professional", tagline: "Leadership, negotiation, strategy & executive skills", icon: "Briefcase" },
  { id: "entrepreneur", label: "Entrepreneur", tagline: "Business strategy, growth, fundraising & scaling", icon: "Rocket" },
];

// Admin-extensible leadership tracks (course filter categories)
export interface LeadershipTrack {
  id: string;
  label: string;
}

export const DEFAULT_TRACKS: LeadershipTrack[] = [
  { id: "leading_self", label: "Leading Self" },
  { id: "leading_people", label: "Leading People" },
  { id: "leading_upwards", label: "Leading Upwards" },
  { id: "leading_peers", label: "Leading Peers" },
  { id: "leading_cultures", label: "Leading Cultures" },
  { id: "leading_organizations", label: "Leading Organizations" },
];

// Learning-credit tiers (credits → tag)
export interface CreditTier {
  min: number;
  label: string;
  color: "neutral" | "navy" | "gold" | "success";
}

// Badge tiers by total learning credits (each completed topic is worth up to 100).
//   Aspirant 0–500 · Learner 501–1000 · Advanced 1001–1999 · Star ≥ 2000
export const CREDIT_TIERS: CreditTier[] = [
  { min: 0, label: "Aspirant", color: "neutral" },
  { min: 501, label: "Learner", color: "navy" },
  { min: 1001, label: "Advanced", color: "gold" },
  { min: 2000, label: "Star", color: "success" },
];

export function tierForCredits(credits: number): CreditTier {
  return [...CREDIT_TIERS].reverse().find((t) => credits >= t.min) ?? CREDIT_TIERS[0];
}

export type SubscriptionPlan = "none" | "all_access" | "per_course";

// Category-bundle pricing (INR), admin-editable. Price is by the COUNT of
// categories chosen: 1 → cat1, 2 → cat2, 3 → cat3 (= all-access).
export interface PricingTiers {
  cat1: number; // single-category pass
  cat2: number; // any two categories
  cat3: number; // all three categories (all-access)
  perTopicFrom: number; // "starting from" price shown on the per-topic plan
  showUpgradeInfo?: boolean; // admin: show learners the "why this price?" explainer on the upgrade card
}

export const DEFAULT_PRICING: PricingTiers = { cat1: 6000, cat2: 10000, cat3: 17000, perTopicFrom: 999, showUpgradeInfo: true };

/** Price for a bundle given how many categories are selected. */
export function bundlePrice(tiers: PricingTiers, count: number): number {
  return count >= 3 ? tiers.cat3 : count === 2 ? tiers.cat2 : tiers.cat1;
}

/**
 * Upgrade price = pay the difference. Adding `addCount` categories to the `ownedCount`
 * already held costs the resulting tier minus what the current tier already cost.
 * A fresh buyer (ownedCount 0) just pays the full bundle for what they pick.
 * e.g. own 1 (cat1=6k) → go Max (cat3=17k) → pay 11k. Never below 0.
 */
export function upgradePrice(tiers: PricingTiers, ownedCount: number, addCount: number): number {
  const target = Math.min(3, ownedCount + addCount);
  const current = ownedCount > 0 ? bundlePrice(tiers, ownedCount) : 0;
  return Math.max(0, bundlePrice(tiers, target) - current);
}

export interface User {
  id: string;
  name: string;
  username?: string; // unique handle (@username) used in the discussion board
  email: string;
  role: Role | null; // null until profile selection
  avatarUrl?: string | null;
  age?: number;
  gender?: Gender;
  phone?: string;
  phoneVerified?: boolean;
  company?: string; // company / college
  nationality?: string;
  region?: string; // for demographics analytics
  headline?: string; // short tagline shown on the profile
  bio?: string; // longer "about me" for the public profile
  learningCredits: number; // total = sum of topicCredits (kept in sync when a topic is finalized)
  topicCredits?: Record<string, number>; // courseId -> best credit earned for that topic (0–100)
  subscriptionPlan: SubscriptionPlan;
  subscriptionValidUntil?: string | null; // all-access expiry = its purchase date + 1 year
  ownedCourseIds: string[]; // topics ever purchased à-la-carte (ownership record; access is time-boxed)
  coursePurchasedAt?: Record<string, string>; // courseId -> ISO date of the latest à-la-carte purchase (drives its 1-year expiry)
  ownedCategories?: Role[]; // category passes ever bought — unlock every topic in the category
  categoryPassAt?: Partial<Record<Role, string>>; // category -> ISO date the pass was (re)bought (drives its 1-year expiry)
  banned?: boolean;
  isAdmin?: boolean;
  permissions?: Permission[] | null; // present => sub-admin limited to these; absent => full owner
  createdAt: string;
  lastActiveAt: string;
}

// ── Plan tier shown to the user (by how many catalogs/categories they own) ──
// Free = none · Pro = 1 catalog · Pro+ = 2 · Max = all 3 (all-access).
export type PlanTier = "free" | "pro" | "proPlus" | "max";
export interface PlanInfo {
  tier: PlanTier;
  label: string; // "Free" | "Pro" | "Pro+" | "Max"
  categories: number; // 0–3 catalogs unlocked
}

export function planFor(u: Pick<User, "subscriptionPlan" | "ownedCategories"> | null | undefined): PlanInfo {
  const count = u?.subscriptionPlan === "all_access" ? 3 : new Set(u?.ownedCategories ?? []).size;
  if (count >= 3) return { tier: "max", label: "Max", categories: 3 };
  if (count === 2) return { tier: "proPlus", label: "Pro+", categories: 2 };
  if (count === 1) return { tier: "pro", label: "Pro", categories: 1 };
  return { tier: "free", label: "Free", categories: 0 };
}

// ── Profile completion (required before any purchase/upgrade) ──
// name & email are captured at signup; these are the extra fields a learner must add.
type ProfileFields = Pick<User, "age" | "gender" | "phone" | "company" | "nationality">;
export function missingProfileFields(u: ProfileFields | null | undefined): string[] {
  const missing: string[] = [];
  if (!u?.age) missing.push("Age");
  if (!u?.gender) missing.push("Gender");
  if (!u?.phone?.trim()) missing.push("Phone number");
  if (!u?.company?.trim()) missing.push("Company / college");
  if (!u?.nationality?.trim()) missing.push("Country / nationality");
  return missing;
}
export function isProfileComplete(u: ProfileFields | null | undefined): boolean {
  return missingProfileFields(u).length === 0;
}

// Discount coupon. `category` scopes eligibility: a Role limits it to that
// category's topics (+ that single-category pass); "all" applies to everything,
// including the top all-access plan.
export interface Coupon {
  code: string; // unique, stored uppercase
  discountPercent: number; // 1–100
  category: Role | "all";
  active: boolean;
  maxRedemptions: number | null; // null = unlimited
  redemptions: number;
  expiresAt: string | null; // ISO date, or null = no expiry
  createdAt: string;
}

// A recorded Razorpay payment / receipt. Written server-side only (verify route +
// webhook). grantStatus flags captured-but-not-granted payments for admin follow-up.
export type PaymentStatus = "captured" | "refunded" | "failed";
export type GrantStatus = "granted" | "grant_failed" | "pending";

export interface Payment {
  id: string; // our receipt id, rcpt_…
  userId: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  plan: string | null; // 'course' | 'bundle' | 'all'
  courseId: string | null;
  categories: Role[];
  couponCode: string | null;
  amountInr: number;
  currency: string;
  status: PaymentStatus;
  grantStatus: GrantStatus;
  source: "verify" | "webhook";
  createdAt: string;
  refundedAt: string | null;
}

export interface Resource {
  id: string;
  title: string;
  type: "book" | "article" | "link" | "pdf";
  author?: string;
  url: string;
}

export interface Video {
  id: string;
  courseId: string;
  title: string;
  order: number; // 1-based
  durationSeconds: number;
  muxPlaybackId: string; // mock for now
  transcript: string;
  summary: string; // short summary used for AI context + roadmap
  notesPdfName?: string; // notes file name
  notesPdfUrl?: string | null; // uploaded notes (data URL or storage URL)
  resources: Resource[];
}

export type QuestionType = "mcq" | "fill_blank";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string; // for fill_blank, contains "____"
  options: string[]; // choices / word bank
  correctAnswer: string;
  explanation: string;
}

export interface Assignment {
  id: string;
  courseId: string;
  afterVideoOrder: number; // unlocks after this video order (2, 4, 6 …)
  title: string;
  questions: Question[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Role; // primary category (kept for badges & analytics)
  categories?: Role[]; // all categories this topic belongs to (multi-select)
  instructorName: string;
  instructorTitle: string;
  instructorBio: string;
  instructorInitials: string;
  hashtags: string[]; // exactly 4, admin-authored
  tracks: string[]; // LeadershipTrack ids
  level: "Beginner" | "Intermediate" | "Advanced";
  rating: number; // 0–5
  ratingCount: number;
  enrolledCount: number;
  purchaseCount: number; // for admin trending tracker
  price: number; // per-course lifetime price (INR); 0 = free
  trending: boolean;
  published: boolean;
  accent: number; // 0–5, picks a brand gradient for the thumbnail
  thumbnailUrl?: string | null; // uploaded cover image (overrides the gradient)
  workbookName?: string | null; // final workbook file name (PDF/DOCX)
  workbookUrl?: string | null; // final workbook (data URL or storage URL)
  accessDurationDays?: number | null; // access expires this many days after a learner enrolls; null/0 = lifetime
  pendingApproval?: boolean; // a sub-admin submitted this; awaiting owner approval
  submittedBy?: string | null; // user id of the sub-admin who submitted it
  videos: Video[];
  assignments: Assignment[];
  createdAt: string;
}

/** All categories a topic belongs to (falls back to its primary category). */
export function courseCategories(c: Pick<Course, "category" | "categories">): Role[] {
  return c.categories && c.categories.length ? c.categories : [c.category];
}

/**
 * A topic is the learner's own when they enrolled in it, bought it à-la-carte,
 * hold a category pass that covers it, or are on the all-access plan.
 */
export function ownsTopic(
  u: Pick<User, "subscriptionPlan" | "ownedCourseIds" | "ownedCategories">,
  c: Pick<Course, "id" | "category" | "categories" | "published">,
  enrolled: boolean,
): boolean {
  return (
    enrolled ||
    u.ownedCourseIds.includes(c.id) ||
    (u.subscriptionPlan === "all_access" && c.published) ||
    courseCategories(c).some((cat) => (u.ownedCategories ?? []).includes(cat))
  );
}

export interface DailyTip {
  id: string;
  text: string;
  author: string;
  targetRole: Role | "all";
  active: boolean;
}

export interface LiveSession {
  id: string;
  title: string;
  courseTitle?: string;
  instructorName: string;
  startsAt: string; // ISO
  durationMins: number;
  meetLink: string;
  description: string;
  targetRole: Role | "all";
  attendeeIds: string[]; // users who voted to attend
  capacity: number;
  notifiedAt?: string | null; // when this session was first emailed to its audience (null = never)
  notifiedUserIds?: string[]; // profile ids already emailed — retry only targets the rest
}

export interface RecommendedResource {
  id: string;
  title: string;
  type: "book" | "article";
  author: string;
  blurb: string;
  targetRole: Role | "all";
  accent: number;
}

// ── Mutable / per-user state (would live in Supabase rows) ──

export interface Enrollment {
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string | null;
}

export interface VideoProgress {
  userId: string;
  videoId: string;
  courseId: string;
  completed: boolean;
  watchSeconds: number;
  completedAt?: string | null;
}

export interface QuestionFeedback {
  questionId: string;
  correct: boolean;
  explanation: string;
  // ── interactive checkpoint (hint-and-retry) metrics ──
  attempts?: number; // tries the learner used on this question (1 = solved first try)
  solved?: boolean; // got it right within the retry limit (vs. answer revealed after 4 tries)
}

export interface Submission {
  id: string;
  userId: string;
  assignmentId: string;
  courseId: string;
  answers: Record<string, string>; // questionId -> answer
  score: number; // 0–100
  passed: boolean;
  feedback: QuestionFeedback[];
  attemptNumber: number;
  submittedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  videoId: string;
  text: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userRole: Role | "admin";
  text: string;
  createdAt: string;
  editedAt?: string | null;
  likedBy: string[];
}

// ── Discussion board: threaded comments / replies on a post ──
export interface PostComment {
  id: string;
  postId: string;
  parentId: string | null; // null = top-level comment; otherwise a reply to that comment
  userId: string;
  userName: string;
  userRole: Role | "admin";
  text: string;
  mentions: string[]; // user ids @mentioned in the text
  createdAt: string;
  editedAt?: string | null;
  likedBy: string[];
}

// ── Per-video discussion: YouTube-style comments under a topic video ──
// Threaded one reply level (like the old board), with @mentions + notifications.
export interface VideoComment {
  id: string;
  videoId: string;
  courseId: string; // so the bell / links can resolve the player URL
  parentId: string | null; // null = top-level comment; otherwise a reply
  userId: string;
  userName: string;
  userRole: Role | "admin";
  text: string;
  mentions: string[]; // user ids @mentioned in the text
  createdAt: string;
  editedAt?: string | null;
  likedBy: string[];
}

// ── In-app notifications (reply / @mention on a video discussion) ──
export type NotificationType = "reply" | "mention";
export interface AppNotification {
  id: string;
  userId: string; // recipient
  type: NotificationType;
  actorId: string;
  actorName: string;
  // Discussion context. videoId/courseId point at the per-video discussion (current);
  // postId is legacy (the removed global board) and kept optional for old rows.
  videoId?: string | null;
  courseId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  preview: string; // short snippet of the comment text
  read: boolean;
  createdAt: string;
}

// ── Articles (written by the admin, shown to learners on /articles) ──
// An inline picture an admin drops into the article body. Referenced from `content`
// by a short [[image:id]] token so the body text stays readable (the heavy data-URL or
// external URL lives here, not inline in the editor textarea).
export interface ArticleImage {
  id: string;
  url: string; // uploaded data URL or an external image URL
  alt?: string; // optional caption / alt text
}

export interface Article {
  id: string;
  title: string;
  excerpt: string; // short teaser shown on cards (derived from content if empty)
  content: string; // plain text; blank lines = paragraphs; [[image:id]] = inline image
  coverUrl?: string | null;
  images?: ArticleImage[]; // inline images referenced from content via [[image:id]]
  authorId: string;
  authorName: string;
  published: boolean;
  archived?: boolean; // hidden from learners & the catalog, kept for the admin's records
  createdAt: string;
  updatedAt: string;
}

export type ArticleBlock =
  | { kind: "text"; text: string }
  | { kind: "image"; image: ArticleImage };

/**
 * Split an article body into ordered render blocks: text paragraphs (separated by
 * blank lines) and inline images (resolved from `images` via the [[image:id]] token).
 * Tokens whose image was removed are skipped.
 */
export function parseArticleBody(a: Article): ArticleBlock[] {
  const byId = new Map((a.images ?? []).map((im) => [im.id, im]));
  const blocks: ArticleBlock[] = [];
  for (const para of a.content.split(/\n{2,}/)) {
    const re = /\[\[image:([^\]]+)\]\]/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(para))) {
      const before = para.slice(last, m.index).trim();
      if (before) blocks.push({ kind: "text", text: before });
      const img = byId.get(m[1]);
      if (img) blocks.push({ kind: "image", image: img });
      last = m.index + m[0].length;
    }
    const rest = para.slice(last).trim();
    if (rest) blocks.push({ kind: "text", text: rest });
  }
  return blocks;
}

/** Card teaser: the explicit excerpt, or the first ~160 chars of the content (image tokens stripped). */
export function articleExcerpt(a: Article): string {
  if (a.excerpt.trim()) return a.excerpt.trim();
  const flat = a.content.replace(/\[\[image:[^\]]+\]\]/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

// ── Announcements (admin broadcast → learners read on /announcements) ──
export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetRole: Role | "all"; // who sees it
  pinned: boolean; // pinned ones sort to the top
  published: boolean; // drafts are admin-only
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  notifiedAt?: string | null; // when this announcement was first emailed to its audience (null = never)
  notifiedUserIds?: string[]; // profile ids already emailed — retry only targets the rest
}

// ── FAQ (admin-managed Q&A shown on the public /faq page) ──
/** One learner's rating of one topic. Aggregated into courses.rating by a DB trigger. */
export interface CourseRating {
  id: string;
  userId: string;
  courseId: string;
  stars: number; // 1–5
  review?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number; // display order (lower first)
  published: boolean; // drafts are admin-only
  createdAt: string;
  updatedAt: string;
}

// ── Privacy policy (single admin-editable page shown at /privacy) ──
export const DEFAULT_PRIVACY_POLICY = `Your privacy matters to us at LEAP Coach.

What we collect
We collect the information you provide when you create an account (such as your name, email, and profile details) and data about your learning activity (topics enrolled, progress, and assessment results) so we can personalise your coaching experience.

How we use it
We use your information to run the platform, track your learning progress, process payments, send you announcements and updates you have opted into, and improve our content and services.

Sharing
We do not sell your personal data. We share information only with the service providers that help us operate the platform (for example, payment and hosting providers) and where required by law.

Your choices
You can view and edit your profile at any time, and contact us to request access to or deletion of your data.

Contact
For any privacy questions, email us at info.leapcoach@gmail.com.`;

// ── Team / mentors (Team page + homepage mentors strip) ──
export type TeamGroup = "founder" | "mentor" | "associate" | "intern" | "advisor";
export const TEAM_GROUPS: { id: TeamGroup; label: string }[] = [
  { id: "founder", label: "Founder" },
  { id: "mentor", label: "Mentor" },
  { id: "associate", label: "Research Associate" },
  { id: "intern", label: "Intern" },
  { id: "advisor", label: "Advisor" },
];
export interface TeamLinks {
  linkedin?: string;
  youtube?: string;
  instagram?: string;
  site?: string;
  email?: string;
}
export interface TeamMember {
  id: string;
  name: string;
  title: string; // role line, e.g. "Founder · Professor, IIM Ahmedabad"
  group: TeamGroup;
  photoUrl?: string | null;
  bio: string; // ~150-word write-up
  vision?: string | null; // optional (shown for the founder)
  links?: TeamLinks;
  featured: boolean; // show in the homepage "mentors" strip
  order: number; // display order
  active: boolean;
  createdAt: string;
}

// ── Book showcase (homepage + About page), admin-managed ──
export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string | null;
  blurb: string;
  link?: string | null;
  order: number;
  active: boolean;
}

// ── Editable homepage / site content (admin-managed singleton) ──
export interface SiteStat {
  value: string;
  label: string;
}
export interface SiteContent {
  heroEyebrow: string; // the L·E·A·P typewriter line
  heroTitle: string;
  heroHighlights: string[]; // phrases inside heroTitle rendered in gold
  heroSubtitle: string;
  heroQuote: string;
  professorName: string;
  professorTitle: string;
  stats: SiteStat[]; // the landing stat bar
  professorStats: SiteStat[]; // the achievement grid in the "Meet your mentor" section
  mentorsHeading: string;
  mentorsSubheading: string;
  booksHeading: string;
  booksSubheading: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroEyebrow: "Leadership Excellence and Authentic Performance",
  heroTitle: "Scaling Human Wisdom through High Performance Stars",
  heroHighlights: ["Human Wisdom", "High Performance Stars"],
  heroSubtitle:
    "High-quality, evidence-based coaching for students, professionals, and entrepreneurs: structured topics, a personal AI tutor on every video, and assessments that teach as well as test.",
  heroQuote: "Lead from your values, not from fear of judgement.",
  professorName: "Prof. Vishal Gupta",
  professorTitle: "Professor, IIM Ahmedabad",
  stats: [
    { value: "6+", label: "Expert Mentors" },
    { value: "40+", label: "Coaching Topics" },
    { value: "3", label: "Learning Paths" },
    { value: "AI", label: "Enhanced Learning" },
  ],
  professorStats: [
    { value: "67", label: "Research publications" },
    { value: "3,500+", label: "Citations" },
    { value: "4", label: "Books authored" },
    { value: "250K+", label: "Coursera learners" },
    { value: "300K+", label: "Professionals trained" },
    { value: "35+", label: "Organisations engaged" },
  ],
  mentorsHeading: "Meet the people behind LEAP",
  mentorsSubheading: "Mentors, researchers, and coaches dedicated to building high-performance stars.",
  booksHeading: "Books by our mentors",
  booksSubheading: "Go deeper with the books that shaped the LEAP philosophy.",
};
