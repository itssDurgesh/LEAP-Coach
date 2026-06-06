// ─────────────────────────────────────────────────────────────
// Leap Coach — domain model
// These types mirror the (future) Supabase schema 1:1 so the mock
// data layer can be swapped for real queries with minimal changes.
// ─────────────────────────────────────────────────────────────

export type Role = "student" | "professional" | "entrepreneur";
export type Gender = "male" | "female" | "non_binary" | "prefer_not";

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
}

export const DEFAULT_PRICING: PricingTiers = { cat1: 6000, cat2: 10000, cat3: 17000 };

/** Price for a bundle given how many categories are selected. */
export function bundlePrice(tiers: PricingTiers, count: number): number {
  return count >= 3 ? tiers.cat3 : count === 2 ? tiers.cat2 : tiers.cat1;
}

export interface User {
  id: string;
  name: string;
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
  learningCredits: number;
  subscriptionPlan: SubscriptionPlan;
  subscriptionValidUntil?: string | null;
  ownedCourseIds: string[]; // per-course lifetime purchases
  ownedCategories?: Role[]; // category passes — unlock every topic in the category
  banned?: boolean;
  isAdmin?: boolean;
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
  notesPdfName?: string; // mock "uploaded PDF"
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
  category: Role;
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
  videos: Video[];
  assignments: Assignment[];
  createdAt: string;
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
