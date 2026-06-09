// ─────────────────────────────────────────────────────────────
// Leap Coach — domain model
// These types mirror the (future) Supabase schema 1:1 so the mock
// data layer can be swapped for real queries with minimal changes.
// ─────────────────────────────────────────────────────────────

export type Role = "student" | "professional" | "entrepreneur";
export type Gender = "male" | "female" | "non_binary" | "prefer_not";

// Sub-admin permissions. A user with isAdmin=true and NO `permissions` array is the
// full owner; a sub-admin has isAdmin=true and is limited to the listed permissions.
export type Permission = "content" | "team" | "homepage" | "sessions" | "discussion";

export const PERMISSIONS: { id: Permission; label: string; hint: string }[] = [
  { id: "content", label: "Coaching topics", hint: "Create & edit topics, questions & workbooks (publishing needs owner approval)" },
  { id: "team", label: "Team", hint: "Manage team members" },
  { id: "homepage", label: "Homepage", hint: "Edit the public homepage" },
  { id: "sessions", label: "Live sessions", hint: "Schedule & manage sessions" },
  { id: "discussion", label: "Discussion board", hint: "Moderate posts" },
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

export const CREDIT_TIERS: CreditTier[] = [
  { min: 0, label: "Aspirant", color: "neutral" },
  { min: 150, label: "Achiever", color: "navy" },
  { min: 400, label: "High Performer", color: "gold" },
  { min: 800, label: "Rising Star", color: "gold" },
  { min: 1500, label: "Leap Star", color: "success" },
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
}

export const DEFAULT_PRICING: PricingTiers = { cat1: 6000, cat2: 10000, cat3: 17000, perTopicFrom: 999 };

/** Price for a bundle given how many categories are selected. */
export function bundlePrice(tiers: PricingTiers, count: number): number {
  return count >= 3 ? tiers.cat3 : count === 2 ? tiers.cat2 : tiers.cat1;
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
  learningCredits: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionValidUntil?: string | null;
  ownedCourseIds: string[]; // per-course lifetime purchases
  ownedCategories?: Role[]; // category passes — unlock every topic in the category
  banned?: boolean;
  isAdmin?: boolean;
  permissions?: Permission[] | null; // present => sub-admin limited to these; absent => full owner
  createdAt: string;
  lastActiveAt: string;
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

// ── In-app notifications (reply / @mention on the discussion board) ──
export type NotificationType = "reply" | "mention";
export interface AppNotification {
  id: string;
  userId: string; // recipient
  type: NotificationType;
  actorId: string;
  actorName: string;
  postId: string;
  commentId?: string | null;
  preview: string; // short snippet of the comment text
  read: boolean;
  createdAt: string;
}

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
    "High-quality, evidence-based coaching for students, professionals, and entrepreneurs — structured topics, a personal AI tutor on every video, and assessments that actually teach.",
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
