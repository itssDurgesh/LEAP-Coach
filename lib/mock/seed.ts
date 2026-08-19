import {
  Announcement,
  AppNotification,
  Article,
  Book,
  CommunityPost,
  Coupon,
  Course,
  DailyTip,
  Enrollment,
  Faq,
  LiveSession,
  Note,
  PostComment,
  RecommendedResource,
  Submission,
  TeamMember,
  User,
  VideoComment,
  VideoProgress,
} from "@/lib/types";

/**
 * Mock-mode seed data — intentionally EMPTY.
 *
 * The app boots in one of two modes (see AppProvider):
 *
 *   realMode = isClerkConfigured && isSupabaseConfigured
 *     → initial state is emptyState(), all content comes from Supabase.
 *   mock mode (no keys)
 *     → initial state is seedState(), built from the arrays below.
 *
 * These arrays used to hold a full demo catalogue: 8 fabricated courses, 10 fake
 * learners with invented credentials, plus fake payments, notifications, articles
 * and comments. None of it ever rendered in production, but shipping fabricated
 * users and course content in a public repo is not something we want, and a
 * deploy that lost its env vars would silently fall back to showing it as if it
 * were real.
 *
 * They are kept as empty exports rather than deleted so mock mode still boots
 * (with an empty app) and local development without keys doesn't crash. To work
 * with sample data locally, populate these arrays temporarily — do not commit it.
 */

export const seedCourses: Course[] = [];
export const seedUsers: User[] = [];
export const seedEnrollments: Enrollment[] = [];
export const seedProgress: VideoProgress[] = [];
export const seedSubmissions: Submission[] = [];
export const seedNotes: Note[] = [];
export const seedTips: DailyTip[] = [];
export const seedSessions: LiveSession[] = [];
export const seedResources: RecommendedResource[] = [];
export const seedCommunity: CommunityPost[] = [];
export const seedCoupons: Coupon[] = [];
export const seedTeam: TeamMember[] = [];
export const seedBooks: Book[] = [];
export const seedComments: PostComment[] = [];
export const seedVideoComments: VideoComment[] = [];
export const seedNotifications: AppNotification[] = [];
export const seedAnnouncements: Announcement[] = [];
export const seedFaqs: Faq[] = [];
export const seedArticles: Article[] = [];
