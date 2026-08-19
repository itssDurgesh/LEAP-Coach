"use client";

import * as React from "react";
import {
  Announcement,
  AppNotification,
  Article,
  Assignment,
  Book,
  CommunityPost,
  Coupon,
  Course,
  CourseRating,
  DailyTip,
  Enrollment,
  Faq,
  Gender,
  LeadershipTrack,
  LiveSession,
  Note,
  NotificationType,
  Payment,
  Permission,
  PostComment,
  PricingTiers,
  Question,
  RecommendedResource,
  Role,
  SiteContent,
  Submission,
  TeamMember,
  User,
  Video,
  VideoComment,
  VideoProgress,
} from "@/lib/types";
import { DEFAULT_TRACKS, DEFAULT_PRICING, DEFAULT_SITE_CONTENT, DEFAULT_PRIVACY_POLICY, courseCategories, isOwner, hasPermission } from "@/lib/types";
import { courseAccessExpiry, isCourseAccessExpired } from "@/lib/access";
import {
  ADMIN_PASSWORD,
  seedArticles,
  seedBooks,
  seedComments,
  seedCommunity,
  seedCoupons,
  seedCourses,
  seedEnrollments,
  seedNotes,
  seedNotifications,
  seedProgress,
  seedResources,
  seedSessions,
  seedSubmissions,
  seedTeam,
  seedTips,
  seedUsers,
  seedVideoComments,
  seedAnnouncements,
  seedFaqs,
} from "@/lib/mock/seed";
import { getSupabase, setSupabaseTokenGetter } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import * as db from "@/lib/supabase/db";
import { normalizeCode } from "@/lib/coupons";
import { topicCredit, topicComplete } from "@/lib/credits";
import { baseUsername, uniqueUsername } from "@/lib/username";
import type { AuthBridge } from "@/lib/auth/types";

const STORAGE_KEY = "leap-coach-state-v1";
// Per-user stale-while-revalidate cache for Supabase mode: paint instantly from the
// last snapshot on reload, then refresh in the background. Keyed by user id so one
// account never sees another's cached data.
const SB_CACHE_PREFIX = "leap-sb-cache-v1:";

// Real backend = Clerk for auth + Supabase for data. Active only when both are
// configured; otherwise the whole app runs on the localStorage mock. Clerk owns
// session resolution and OAuth redirects, so the old `?code=`/`#access_token`
// URL-sniffing race machinery is gone.
const realMode = isClerkConfigured && isSupabaseConfigured;

const PASS_MARK = 60;
const MAX_ATTEMPTS = 10;

// Learning credits are earned per TOPIC (max 100 each), finalized once the learner
// completes the topic and keeping the best result. Total learningCredits = the sum
// of every topic's best credit. Pure so the local state update and the Supabase
// write both derive from the exact same computation.
function applyTopicCredit(
  users: User[],
  courses: Course[],
  courseId: string,
  userId: string,
  submissions: Submission[],
  progress: VideoProgress[],
): { users: User[]; patch: { learning_credits: number; topic_credits: Record<string, number> } | null } {
  const course = courses.find((c) => c.id === courseId);
  if (!course || !topicComplete(course, userId, submissions, progress)) return { users, patch: null };
  const user = users.find((u) => u.id === userId);
  if (!user) return { users, patch: null };
  const prev = user.topicCredits?.[courseId] ?? 0;
  const credit = topicCredit(course, userId, submissions).credit;
  if (credit <= prev) return { users, patch: null }; // no improvement (or a question-less topic) → nothing to record
  const topicCredits = { ...(user.topicCredits ?? {}), [courseId]: credit };
  const learningCredits = Object.values(topicCredits).reduce((sum, v) => sum + v, 0);
  const nextUsers = users.map((u) =>
    u.id === userId ? { ...u, topicCredits, learningCredits, lastActiveAt: new Date().toISOString() } : u,
  );
  return { users: nextUsers, patch: { learning_credits: learningCredits, topic_credits: topicCredits } };
}

interface AppState {
  users: User[];
  courses: Course[];
  tracks: LeadershipTrack[];
  tips: DailyTip[];
  sessions: LiveSession[];
  resources: RecommendedResource[];
  community: CommunityPost[];
  comments: PostComment[];
  videoComments: VideoComment[];
  notifications: AppNotification[];
  teamMembers: TeamMember[];
  books: Book[];
  articles: Article[];
  announcements: Announcement[];
  faqs: Faq[];
  privacyPolicy: string;
  siteContent: SiteContent;
  enrollments: Enrollment[];
  progress: VideoProgress[];
  submissions: Submission[];
  notes: Note[];
  courseRatings: CourseRating[];
  coupons: Coupon[];
  payments: Payment[];
  pricing: PricingTiers;
  currentUserId: string | null;
}

function seedState(): AppState {
  return {
    users: seedUsers,
    courses: seedCourses,
    tracks: DEFAULT_TRACKS,
    tips: seedTips,
    sessions: seedSessions,
    resources: seedResources,
    community: seedCommunity,
    comments: seedComments,
    videoComments: seedVideoComments,
    notifications: seedNotifications,
    teamMembers: seedTeam,
    books: seedBooks,
    articles: seedArticles,
    announcements: seedAnnouncements,
    faqs: seedFaqs,
    privacyPolicy: DEFAULT_PRIVACY_POLICY,
    siteContent: DEFAULT_SITE_CONTENT,
    enrollments: seedEnrollments,
    progress: seedProgress,
    submissions: seedSubmissions,
    notes: seedNotes,
    courseRatings: [],
    coupons: seedCoupons,
    payments: [],
    pricing: DEFAULT_PRICING,
    currentUserId: null,
  };
}

function emptyState(): AppState {
  return {
    users: [], courses: [], tracks: DEFAULT_TRACKS, tips: [], sessions: [], resources: [],
    community: [], comments: [], videoComments: [], notifications: [], teamMembers: [], books: [], articles: [],
    announcements: [], faqs: [], privacyPolicy: DEFAULT_PRIVACY_POLICY,
    siteContent: DEFAULT_SITE_CONTENT, enrollments: [], progress: [], submissions: [], notes: [], courseRatings: [], coupons: [],
    payments: [], pricing: DEFAULT_PRICING, currentUserId: null,
  };
}

// A lighter copy of the state for the localStorage paint-cache: drop heavy video
// transcripts (they're refetched by loadAll) so JSON.stringify stays fast and we don't
// blow the ~5MB localStorage quota. Used for the Supabase-mode snapshot only.
function cacheSnapshot(state: AppState): AppState {
  return {
    ...state,
    courses: state.courses.map((c) =>
      c.videos.some((v) => v.transcript)
        ? { ...c, videos: c.videos.map((v) => (v.transcript ? { ...v, transcript: "" } : v)) }
        : c,
    ),
  };
}

export interface SignUpData {
  name: string;
  email: string;
  password?: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  phoneVerified?: boolean;
  company?: string;
  nationality?: string;
  region?: string;
  role?: Role | null;
}

type AuthResult = { ok: boolean; error?: string; user?: User; needsVerification?: boolean };

interface AppContextValue extends AppState {
  hydrated: boolean;
  currentUser: User | null;
  supabaseMode: boolean;
  // auth
  signIn(email: string, password?: string): Promise<AuthResult>;
  signUp(data: SignUpData): Promise<AuthResult>;
  verifyEmailCode(code: string): Promise<AuthResult>;
  resendEmailCode(): Promise<{ ok: boolean; error?: string }>;
  adminSignIn(email: string, password: string): Promise<AuthResult>;
  oauthSignIn(provider: "google"): Promise<{ ok: boolean; error?: string }>;
  /** Forgot password: email a 6-digit reset code to the account's address. */
  requestPasswordReset(email: string): Promise<{ ok: boolean; error?: string }>;
  /** Verify the emailed code + save the new password (kept in Clerk); signs in on success. */
  resetPassword(code: string, newPassword: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  setRole(role: Role): void;
  // access / enrollment
  isEnrolled(courseId: string, userId?: string): boolean;
  hasAccess(courseId: string, userId?: string): boolean;
  // entitlement to a course IGNORING time-expiry (owns it / subscription / category / free)
  hasGrant(courseId: string, userId?: string): boolean;
  // when the user's access to this topic lapses = latest 1-year window across their entitlements; null = never (free/lifetime)
  courseExpiresAt(courseId: string, userId?: string): string | null;
  // restart a free topic's enrollment timestamp (paid access is time-boxed and must be re-purchased to renew)
  renewEnrollment(courseId: string): void;
  enrollFree(courseId: string): void;
  // skipPersist: the grant was already written server-side (after verified payment),
  // so only update in-memory state — don't fire a client Supabase write.
  purchaseCourse(courseId: string, skipPersist?: boolean): void;
  subscribeAllAccess(skipPersist?: boolean): void;
  // category-bundle pass: grant access to all topics in the given categories.
  purchaseBundle(categories: Role[], skipPersist?: boolean): void;
  savePricing(tiers: PricingTiers): void;
  // progress
  isVideoCompleted(videoId: string, userId?: string): boolean;
  markVideoComplete(videoId: string): void;
  isVideoUnlocked(courseId: string, order: number, userId?: string): boolean;
  courseProgress(courseId: string, userId?: string): { completed: number; total: number; pct: number };
  // assignments
  assignmentUnlocked(assignmentId: string, userId?: string): boolean;
  assignmentResult(
    assignmentId: string,
    userId?: string,
  ): { attempts: number; passed: boolean; bestScore: number; last?: Submission };
  // attempts: tries-per-question from the interactive checkpoint (1 = first-try correct),
  // used for the topic performance rating. Optional for backward compatibility.
  submitAssignment(
    assignmentId: string,
    answers: Record<string, string>,
    attempts?: Record<string, number>,
  ): Submission;
  // notes
  notesFor(videoId: string, userId?: string): Note[];
  notesForCourse(courseId: string, userId?: string): Note[];
  // ratings — one per learner per topic; the DB trigger recomputes course.rating
  myRatingFor(courseId: string, userId?: string): CourseRating | undefined;
  /** True once every video AND every gated checkpoint in the topic is done. */
  isCourseComplete(courseId: string, userId?: string): boolean;
  submitCourseRating(courseId: string, stars: number, review?: string): void;
  addNote(videoId: string, text: string): void;
  deleteNote(noteId: string): void;
  // community
  postMessage(text: string): void;
  editMessage(id: string, text: string): void;
  deleteMessage(id: string): void;
  toggleLike(id: string): void;
  // discussion board — threaded comments
  commentsFor(postId: string): PostComment[];
  addComment(postId: string, text: string, parentId?: string | null, mentionIds?: string[]): void;
  editComment(id: string, text: string): void;
  deleteComment(id: string): void;
  toggleCommentLike(id: string): void;
  // per-video discussion (YouTube-style comments under a topic video)
  videoCommentsFor(videoId: string): VideoComment[];
  addVideoComment(videoId: string, courseId: string, text: string, parentId?: string | null, mentionIds?: string[]): void;
  editVideoComment(id: string, text: string): void;
  deleteVideoComment(id: string): void;
  toggleVideoCommentLike(id: string): void;
  // notifications
  markNotificationRead(id: string): void;
  markAllNotificationsRead(): void;
  // profile — self-service account editing
  updateProfileInfo(patch: Partial<User>): void;
  // sessions
  toggleAttendance(sessionId: string): void;
  // admin — courses
  saveCourse(course: Course): void;
  deleteCourse(courseId: string): void;
  togglePublish(courseId: string): void;
  toggleTrending(courseId: string): void;
  approveCourse(courseId: string): void;
  rejectCourse(courseId: string): void;
  saveQuestion(courseId: string, assignmentId: string, question: Question): void;
  deleteQuestion(courseId: string, assignmentId: string, questionId: string): void;
  // admin — tips / tracks / sessions / users
  saveTip(tip: DailyTip): void;
  deleteTip(tipId: string): void;
  addTrack(label: string): string;
  saveSession(s: LiveSession): void;
  deleteSession(id: string): void;
  markSessionNotified(id: string, notifiedAt: string | null, notifiedUserIds: string[]): void;
  setBanned(userId: string, banned: boolean): Promise<{ ok: boolean; error?: string }>;
  deleteUser(userId: string): Promise<{ ok: boolean; error?: string }>;
  setSubAdmin(userId: string, permissions: Permission[]): Promise<{ ok: boolean; error?: string }>;
  revokeAdmin(userId: string): Promise<{ ok: boolean; error?: string }>;
  // admin — coupons
  saveCoupon(coupon: Coupon): void;
  deleteCoupon(code: string): void;
  getCoupon(code: string): Coupon | undefined;
  // payments — owner refund + admin retry of a flagged (grant_failed) payment
  refundPayment(paymentId: string): Promise<{ ok: boolean; error?: string }>;
  retryGrant(paymentId: string): Promise<{ ok: boolean; error?: string }>;
  // live refresh of the payments list (for the admin payments/subscriptions dashboard)
  refreshPayments(): Promise<void>;
  // admin — homepage CMS / team / books
  saveSiteContent(content: SiteContent): Promise<{ ok: boolean; error?: string }>;
  saveTeamMember(member: TeamMember): void;
  deleteTeamMember(id: string): void;
  saveBook(book: Book): void;
  saveArticle(article: Article): void;
  deleteArticle(id: string): void;
  // admin — announcements
  saveAnnouncement(a: Announcement): void;
  deleteAnnouncement(id: string): void;
  markAnnouncementNotified(id: string, notifiedAt: string | null, notifiedUserIds: string[]): void;
  // admin — FAQ + privacy
  saveFaq(f: Faq): void;
  deleteFaq(id: string): void;
  savePrivacyPolicy(text: string): void;
  deleteBook(id: string): void;
  // lookups
  getCourse(id: string): Course | undefined;
  getCourseBySlug(slug: string): Course | undefined;
  getVideoById(id: string): { course: Course; video: Video } | undefined;
  resetDemo(): void;
}

const AppContext = React.createContext<AppContextValue | null>(null);

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function AppProvider({ auth, children }: { auth: AuthBridge; children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(realMode ? emptyState : seedState);
  const [hydrated, setHydrated] = React.useState(false);
  // Sign-up extras (age/gender/phone/…) collected before the profile row exists;
  // applied by the hydration effect once Clerk has a session + the row is provisioned.
  const pendingSignup = React.useRef<SignUpData | null>(null);

  // Feed the Clerk session-token getter to the Supabase data client so every query
  // carries the user's JWT (for RLS). Set during render so it's in place before the
  // hydration effect's loadAll runs.
  if (realMode) setSupabaseTokenGetter(auth.getToken);

  // ── Hydration: Clerk session → Supabase data, or localStorage (mock) ──
  React.useEffect(() => {
    // Mock mode: hydrate the seeded state from localStorage.
    if (!realMode) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...seedState(), ...(JSON.parse(raw) as Partial<AppState>) });
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
      return;
    }

    // Real mode: wait for Clerk to resolve the session, then load from Supabase.
    if (!auth.isLoaded) return;
    const sb = getSupabase();
    if (!sb) {
      setHydrated(true);
      return;
    }
    const userId = auth.userId;

    // Instant paint from this user's cached snapshot (stale-while-revalidate), so
    // pages don't sit on a spinner waiting for the full load on every reload.
    if (userId) {
      try {
        const raw = localStorage.getItem(SB_CACHE_PREFIX + userId);
        if (raw) {
          const cached = JSON.parse(raw) as Partial<AppState>;
          setState((s) => ({ ...s, ...cached, currentUserId: userId }));
          setHydrated(true);
        }
      } catch {
        /* ignore corrupt cache */
      }
    }

    let active = true;
    (async () => {
      // First sign-in: provision the profile row keyed by the Clerk user id (the
      // old auth.users → handle_new_user trigger is gone). No-op if it already exists.
      // Run in parallel with loadAll — ensureProfile is an ignoreDuplicates upsert so
      // it's safe to race; and loadAll's fetchUser fallback (below) covers the case
      // where the new row isn't in the initial profiles result yet.
      const ensurePromise =
        userId && auth.identity
          ? db.ensureProfile(sb, userId, auth.identity.email, auth.identity.name).then(
              ({ error }) => { if (error) console.error("[supabase] ensureProfile", error); },
              (e: unknown) => { console.error("[supabase] ensureProfile", e); },
            )
          : Promise.resolve();

      const [data] = await Promise.all([db.loadAll(sb), ensurePromise]);
      if (!active) return;

      // Guarantee the signed-in user is in `users` (loadAll can miss a just-created
      // row due to RLS/replication lag) — else currentUser is null and guards bounce.
      let users = data.users;
      if (userId && !users.some((u) => u.id === userId)) {
        const me = await db.fetchUser(sb, userId);
        if (!active) return;
        if (me) users = [...users, me];
      }

      // Suspended account → sign out and stay logged out.
      if (userId && users.find((u) => u.id === userId)?.banned) {
        pendingSignup.current = null;
        await auth.signOut();
        if (!active) return;
        setState((s) => ({ ...s, currentUserId: null }));
        setHydrated(true);
        return;
      }

      // Apply any pending sign-up extras now that the row exists + token is active.
      const pending = pendingSignup.current;
      if (userId && pending) {
        pendingSignup.current = null;
        const taken = new Set(users.map((u) => u.username).filter(Boolean) as string[]);
        const username = uniqueUsername(baseUsername(pending.name, pending.email), taken);
        const patch = {
          name: pending.name,
          username,
          age: pending.age ?? null,
          gender: pending.gender ?? null,
          phone: pending.phone ?? null,
          phone_verified: pending.phoneVerified ?? false,
          company: pending.company ?? null,
          nationality: pending.nationality ?? null,
          region: pending.region ?? null,
        };
        Promise.resolve(db.updateProfile(sb, userId, patch)).catch((e) => console.error("[supabase]", e));
        users = users.map((u) =>
          u.id === userId
            ? {
                ...u,
                name: pending.name,
                username,
                age: pending.age,
                gender: pending.gender,
                phone: pending.phone,
                phoneVerified: pending.phoneVerified ?? false,
                company: pending.company,
                nationality: pending.nationality,
                region: pending.region,
              }
            : u,
        );
      }

      setState((s) => ({
        ...s,
        ...data,
        users,
        pricing: data.pricing ?? s.pricing,
        siteContent: data.siteContent ? { ...DEFAULT_SITE_CONTENT, ...data.siteContent } : s.siteContent,
        privacyPolicy: data.privacyPolicy ?? DEFAULT_PRIVACY_POLICY,
        currentUserId: userId,
      }));
      setHydrated(true);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoaded, auth.userId]);

  // ── Persist to localStorage, DEBOUNCED (mock mode only) ──
  // Serializing the whole app state on every state change is wasteful; debounce so a
  // burst of changes (or a background poll) writes at most once per ~500ms.
  React.useEffect(() => {
    if (!hydrated || realMode) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* ignore quota errors */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [state, hydrated]);

  // ── Cache the per-user snapshot (Supabase mode) for instant reloads — DEBOUNCED + slimmed ──
  React.useEffect(() => {
    if (!hydrated || !realMode || !state.currentUserId) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(SB_CACHE_PREFIX + state.currentUserId, JSON.stringify(cacheSnapshot(state)));
      } catch {
        /* ignore quota errors — falls back to a full load next time */
      }
    }, 500);
    return () => clearTimeout(id);
  }, [state, hydrated]);

  // ── Ensure the signed-in user has a unique @username (tagging resolves by handle).
  // Covers OAuth signups and profiles created before usernames existed.
  React.useEffect(() => {
    if (!hydrated) return;
    const u = state.users.find((x) => x.id === state.currentUserId);
    if (!u || u.username) return;
    const taken = new Set(state.users.map((x) => x.username).filter(Boolean) as string[]);
    const username = uniqueUsername(baseUsername(u.name, u.email), taken);
    setState((s) => ({
      ...s,
      users: s.users.map((x) => (x.id === u.id ? { ...x, username } : x)),
    }));
    const sb = getSupabase();
    if (sb) Promise.resolve(db.updateProfile(sb, u.id, { username })).then(undefined, (e) => console.error("[supabase]", e));
  }, [hydrated, state.currentUserId, state.users]);

  // ── Notification polling (real mode): replies/@mentions reach the bell
  // without a full reload — refresh every 60s and whenever the tab regains focus.
  React.useEffect(() => {
    if (!hydrated || !realMode || !state.currentUserId) return;
    const sb = getSupabase();
    if (!sb) return;
    const uid = state.currentUserId;
    let active = true;
    const refresh = async () => {
      try {
        const mine = await db.fetchNotifications(sb, uid);
        if (!active) return;
        setState((s) => (s.currentUserId === uid ? { ...s, notifications: mine } : s));
      } catch {
        /* transient network error — next tick will retry */
      }
    };
    const id = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [hydrated, state.currentUserId]);

  const value = React.useMemo<AppContextValue>(() => {
    const sb = getSupabase();
    const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;
    const who = (userId?: string) => userId ?? state.currentUserId ?? "";

    // ── helpers ──
    const getCourse = (id: string) => state.courses.find((c) => c.id === id);
    const getCourseBySlug = (slug: string) => state.courses.find((c) => c.slug === slug);
    const getVideoById = (id: string) => {
      for (const c of state.courses) {
        const v = c.videos.find((x) => x.id === id);
        if (v) return { course: c, video: v };
      }
      return undefined;
    };

    const isEnrolled = (courseId: string, userId?: string) =>
      state.enrollments.some((e) => e.userId === who(userId) && e.courseId === courseId);

    // Entitlement to a course, IGNORING time-expiry (owns it / all-access / category pass / free).
    const hasGrant = (courseId: string, userId?: string) => {
      const course = getCourse(courseId);
      if (!course) return false;
      if (course.price === 0) return true;
      const u = state.users.find((x) => x.id === who(userId));
      if (!u) return false;
      if (u.subscriptionPlan === "all_access") return true;
      if (courseCategories(course).some((c) => (u.ownedCategories ?? []).includes(c))) return true; // category pass
      return u.ownedCourseIds.includes(courseId);
    };

    // A subscription-type entitlement (free / all-access / category pass). À-la-carte
    // ownership does NOT count — those buyers must re-purchase to restart expired access.
    const subEntitled = (courseId: string, userId?: string) => {
      const course = getCourse(courseId);
      if (!course) return false;
      if (course.price === 0) return true;
      const u = state.users.find((x) => x.id === who(userId));
      if (!u) return false;
      if (u.subscriptionPlan === "all_access") return true;
      return courseCategories(course).some((c) => (u.ownedCategories ?? []).includes(c));
    };

    // When this user's access to the topic lapses = the LATEST one-year window
    // across every entitlement that grants it (à-la-carte purchase, catalog pass,
    // all-access). null = never expires (free topic / undated legacy entitlement).
    const courseExpiresAt = (courseId: string, userId?: string) =>
      courseAccessExpiry(state.users.find((x) => x.id === who(userId)), getCourse(courseId));
    const courseExpired = (courseId: string, userId?: string) =>
      isCourseAccessExpired(state.users.find((x) => x.id === who(userId)), getCourse(courseId));

    // Access = a valid entitlement AND the per-course timer hasn't lapsed (applies to everyone).
    const hasAccess = (courseId: string, userId?: string) =>
      hasGrant(courseId, userId) && !courseExpired(courseId, userId);

    const isVideoCompleted = (videoId: string, userId?: string) =>
      state.progress.some((p) => p.userId === who(userId) && p.videoId === videoId && p.completed);

    const assignmentResult = (assignmentId: string, userId?: string) => {
      const subs = state.submissions
        .filter((s) => s.userId === who(userId) && s.assignmentId === assignmentId)
        .sort((a, b) => a.attemptNumber - b.attemptNumber);
      const passed = subs.some((s) => s.passed);
      const bestScore = subs.reduce((m, s) => Math.max(m, s.score), 0);
      return { attempts: subs.length, passed, bestScore, last: subs[subs.length - 1] };
    };

    const isVideoUnlocked = (courseId: string, order: number, userId?: string) => {
      const course = getCourse(courseId);
      if (!course) return false;
      if (order <= 1) return true;
      const prev = course.videos.find((v) => v.order === order - 1);
      if (!prev || !isVideoCompleted(prev.id, userId)) return false;
      const gate = course.assignments.find((a) => a.afterVideoOrder === prev.order);
      if (gate) {
        const r = assignmentResult(gate.id, userId);
        if (!r.passed && r.attempts < MAX_ATTEMPTS) return false;
      }
      return true;
    };

    const courseProgress = (courseId: string, userId?: string) => {
      const course = getCourse(courseId);
      const total = course?.videos.length ?? 0;
      const completed = course
        ? course.videos.filter((v) => isVideoCompleted(v.id, userId)).length
        : 0;
      return { completed, total, pct: total ? Math.round((completed / total) * 100) : 0 };
    };

    const assignmentUnlocked = (assignmentId: string, userId?: string) => {
      for (const c of state.courses) {
        const a = c.assignments.find((x) => x.id === assignmentId);
        if (a) {
          const gateVideo = c.videos.find((v) => v.order === a.afterVideoOrder);
          return gateVideo ? isVideoCompleted(gateVideo.id, userId) : false;
        }
      }
      return false;
    };

    // ── state setters ──
    const patchUser = (userId: string, fn: (u: User) => User) =>
      setState((s) => ({ ...s, users: s.users.map((u) => (u.id === userId ? fn(u) : u)) }));

    const fire = (p: PromiseLike<unknown> | undefined) => {
      if (p) Promise.resolve(p).then(undefined, (e) => console.error("[supabase]", e));
    };

    // Owner-only user mutations (grant/revoke/ban/delete) go through a service-role
    // route: profiles.is_admin/permissions/banned are pinned by the DB trigger for
    // browser writes, so a direct client update silently no-ops. See app/api/admin/users.
    const adminUserAction = async (payload: {
      action: "grant" | "revoke" | "ban" | "delete";
      userId: string;
      permissions?: Permission[];
      banned?: boolean;
    }): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || "The change couldn't be saved." };
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error — the change couldn't be saved." };
      }
    };

    return {
      ...state,
      hydrated,
      currentUser,
      supabaseMode: realMode,

      // ── auth (Clerk in real mode; in-state demo accounts in mock mode) ──
      async signIn(email, password) {
        if (realMode) {
          const r = await auth.signInWithPassword(email, password ?? "");
          if (!r.ok) return { ok: false, error: r.error };
          // Clerk's session is now active; the hydration effect loads this user's
          // data. Show the loader until then so guards don't see a null user.
          setHydrated(false);
          return { ok: true };
        }
        const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) return { ok: false, error: "No account found for that email." };
        if (u.banned) return { ok: false, error: "This account has been suspended." };
        setState((s) => ({ ...s, currentUserId: u.id }));
        return { ok: true, user: u };
      },
      async signUp(data) {
        if (realMode) {
          // Stash the profile extras; the hydration effect persists them once Clerk
          // has a session and the profile row is provisioned.
          pendingSignup.current = data;
          const r = await auth.signUp(data.email, data.password ?? "", data.name);
          if (!r.ok) {
            pendingSignup.current = null;
            return { ok: false, error: r.error };
          }
          // Email verification needed: keep pendingSignup stashed; the UI collects the
          // code and calls verifyEmailCode(). No session yet, so don't show the loader.
          if (r.needsVerification) return { ok: true, needsVerification: true };
          setHydrated(false);
          return { ok: true };
        }
        const exists = state.users.some(
          (x) => x.email.toLowerCase() === data.email.trim().toLowerCase(),
        );
        if (exists) return { ok: false, error: "An account with that email already exists." };
        const newUser: User = {
          id: uid("u"),
          name: data.name,
          username: uniqueUsername(
            baseUsername(data.name, data.email),
            new Set(state.users.map((u) => u.username).filter(Boolean) as string[]),
          ),
          email: data.email.trim(),
          role: data.role ?? null,
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          phoneVerified: data.phoneVerified ?? false,
          company: data.company,
          nationality: data.nationality,
          region: data.region,
          learningCredits: 0,
          subscriptionPlan: "none",
          ownedCourseIds: [],
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, users: [...s.users, newUser], currentUserId: newUser.id }));
        return { ok: true, user: newUser };
      },
      async verifyEmailCode(code) {
        if (!realMode) return { ok: true };
        const r = await auth.verifyEmailCode(code);
        if (!r.ok) return { ok: false, error: r.error };
        // Session is active now; show the loader until the hydration effect provisions
        // the profile, applies the stashed sign-up extras, and loads the user.
        setHydrated(false);
        return { ok: true };
      },
      async resendEmailCode() {
        if (!realMode) return { ok: true };
        return auth.resendEmailCode();
      },
      async adminSignIn(email, password) {
        if (realMode) {
          // No separate admin password in Clerk mode — admin is the profiles.is_admin
          // flag. Sign in via Clerk; AdminShell admits the user iff their loaded
          // profile is an admin, else bounces back to /admin/login.
          const r = await auth.signInWithPassword(email, password);
          if (!r.ok) return { ok: false, error: r.error };
          setHydrated(false);
          return { ok: true };
        }
        const u = state.users.find(
          (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.isAdmin,
        );
        if (!u) return { ok: false, error: "Not an admin account." };
        if (password !== ADMIN_PASSWORD) return { ok: false, error: "Incorrect password." };
        setState((s) => ({ ...s, currentUserId: u.id }));
        return { ok: true, user: u };
      },
      async oauthSignIn(provider) {
        if (!realMode) return { ok: false, error: "Sign-in is not configured." };
        // Clerk redirects the browser to the provider; control returns via /sso-callback.
        return auth.signInOAuth(provider);
      },
      async requestPasswordReset(email) {
        if (realMode) return auth.requestPasswordReset(email);
        // Mock mode: just confirm the account exists — no email is actually sent.
        const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) return { ok: false, error: "No account found for that email." };
        return { ok: true };
      },
      async resetPassword(code, newPassword) {
        if (realMode) {
          const r = await auth.resetPassword(code, newPassword);
          if (!r.ok) return { ok: false, error: r.error };
          // Clerk activated the new session; show the loader until the profile loads.
          setHydrated(false);
          return { ok: true };
        }
        // Mock mode stores no passwords (any password signs in), so there's nothing
        // to update — accept and let the UI route back to sign-in.
        return { ok: true };
      },
      async signOut() {
        if (realMode) {
          // Clerk clears the session and redirects to "/" (afterSignOutUrl). Don't
          // pre-null currentUserId in real mode — that makes AdminShell's "not an admin"
          // effect fire and bounce to /admin/login, racing the sign-out redirect.
          await auth.signOut();
          return;
        }
        setState((s) => ({ ...s, currentUserId: null }));
      },
      setRole(role) {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, role }));
        if (sb) fire(db.updateProfile(sb, currentUser.id, { role }));
      },

      // ── access / enroll ──
      isEnrolled,
      hasAccess,
      hasGrant,
      courseExpiresAt,
      enrollFree(courseId) {
        if (!currentUser || isEnrolled(courseId)) return;
        setState((s) => ({
          ...s,
          enrollments: [
            ...s.enrollments,
            { userId: currentUser.id, courseId, enrolledAt: new Date().toISOString() },
          ],
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c,
          ),
        }));
        if (sb) fire(db.enroll(sb, currentUser.id, courseId));
      },
      renewEnrollment(courseId) {
        // Restart the access timer for a subscription/category/free entitlement.
        // À-la-carte buyers aren't eligible here — they re-purchase (which resets it).
        if (!currentUser || !subEntitled(courseId)) return;
        const at = new Date().toISOString();
        setState((s) => {
          const exists = s.enrollments.some((e) => e.userId === currentUser.id && e.courseId === courseId);
          return {
            ...s,
            enrollments: exists
              ? s.enrollments.map((e) =>
                  e.userId === currentUser.id && e.courseId === courseId ? { ...e, enrolledAt: at, completedAt: null } : e,
                )
              : [...s.enrollments, { userId: currentUser.id, courseId, enrolledAt: at }],
          };
        });
        if (sb) fire(db.reEnroll(sb, currentUser.id, courseId));
      },
      purchaseCourse(courseId, skipPersist) {
        if (!currentUser) return;
        const wasEnrolled = isEnrolled(courseId);
        const at = new Date().toISOString();
        patchUser(currentUser.id, (u) => ({
          ...u,
          ownedCourseIds: u.ownedCourseIds.includes(courseId)
            ? u.ownedCourseIds
            : [...u.ownedCourseIds, courseId],
          // (Re)purchase restarts this topic's 1-year access window.
          coursePurchasedAt: { ...(u.coursePurchasedAt ?? {}), [courseId]: at },
        }));
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id === courseId
              ? { ...c, purchaseCount: c.purchaseCount + 1, enrolledCount: c.enrolledCount + (wasEnrolled ? 0 : 1) }
              : c,
          ),
          // (Re)purchase restarts the access timer (matters for time-boxed à-la-carte courses).
          enrollments: wasEnrolled
            ? s.enrollments.map((e) =>
                e.userId === currentUser.id && e.courseId === courseId ? { ...e, enrolledAt: at, completedAt: null } : e,
              )
            : [...s.enrollments, { userId: currentUser.id, courseId, enrolledAt: at }],
        }));
        if (sb && !skipPersist) {
          fire(db.purchase(sb, currentUser.id, courseId));
          fire(db.reEnroll(sb, currentUser.id, courseId));
        }
      },
      subscribeAllAccess(skipPersist) {
        if (!currentUser) return;
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        patchUser(currentUser.id, (u) => ({
          ...u,
          subscriptionPlan: "all_access",
          subscriptionValidUntil: validUntil.toISOString(),
        }));
        if (sb && !skipPersist)
          fire(db.updateProfile(sb, currentUser.id, {
            subscription_plan: "all_access",
            subscription_valid_until: validUntil.toISOString(),
          }));
      },
      purchaseBundle(categories, skipPersist) {
        if (!currentUser || !categories.length) return;
        const merged = Array.from(new Set([...(currentUser.ownedCategories ?? []), ...categories]));
        const ALL: Role[] = ["student", "professional", "entrepreneur"];
        const allThree = ALL.every((r) => merged.includes(r));
        const now = new Date().toISOString();
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        // Each purchased catalog (re)starts its own 1-year window from now.
        const passStamps = Object.fromEntries(categories.map((c) => [c, now]));
        patchUser(currentUser.id, (u) => ({
          ...u,
          ownedCategories: merged,
          categoryPassAt: { ...(u.categoryPassAt ?? {}), ...passStamps },
          ...(allThree
            ? { subscriptionPlan: "all_access" as const, subscriptionValidUntil: validUntil.toISOString() }
            : {}),
        }));
        if (sb && !skipPersist) {
          for (const c of categories) fire(db.grantCategoryPass(sb, currentUser.id, c));
          if (allThree)
            fire(db.updateProfile(sb, currentUser.id, {
              subscription_plan: "all_access",
              subscription_valid_until: validUntil.toISOString(),
            }));
        }
      },

      // ── progress ──
      isVideoCompleted,
      isVideoUnlocked,
      courseProgress,
      markVideoComplete(videoId) {
        if (!currentUser) return;
        const user = currentUser;
        const found = getVideoById(videoId);
        const dur = found?.video.durationSeconds ?? 0;
        const courseId = found?.course.id ?? "";
        // Mark this video complete on top of an arbitrary progress list.
        const withVideoDone = (base: VideoProgress[]): VideoProgress[] => {
          const existing = base.find((p) => p.userId === user.id && p.videoId === videoId);
          return existing
            ? base.map((p) =>
                p === existing
                  ? { ...p, completed: true, watchSeconds: dur, completedAt: new Date().toISOString() }
                  : p,
              )
            : [
                ...base,
                { userId: user.id, videoId, courseId, completed: true, watchSeconds: dur, completedAt: new Date().toISOString() },
              ];
        };
        setState((s) => {
          const progress = withVideoDone(s.progress);
          // Completing the last video can finalize the topic → (re)compute its credit.
          const { users } = applyTopicCredit(s.users, s.courses, courseId, user.id, s.submissions, progress);
          return { ...s, progress, users };
        });
        if (sb) {
          fire(db.completeVideo(sb, { userId: user.id, videoId, courseId, watchSeconds: dur }));
          const { patch } = applyTopicCredit(state.users, state.courses, courseId, user.id, state.submissions, withVideoDone(state.progress));
          if (patch) fire(db.updateProfile(sb, user.id, patch));
        }
      },

      // ── assignments ──
      assignmentUnlocked,
      assignmentResult,
      submitAssignment(assignmentId, answers, attempts) {
        let assignment: Assignment | undefined;
        let courseId = "";
        for (const c of state.courses) {
          const a = c.assignments.find((x) => x.id === assignmentId);
          if (a) {
            assignment = a;
            courseId = c.id;
            break;
          }
        }
        const userId = state.currentUserId ?? "";
        const prior = assignmentResult(assignmentId);
        const feedback = (assignment?.questions ?? []).map((q) => {
          const given = (answers[q.id] ?? "").trim().toLowerCase();
          const correct = given === q.correctAnswer.trim().toLowerCase();
          const tries = attempts?.[q.id];
          return {
            questionId: q.id,
            correct,
            explanation: correct
              ? `Correct — ${q.explanation}`
              : `Not quite. ${q.explanation} (Correct answer: "${q.correctAnswer}")`,
            // Per-question retry metrics (from the interactive checkpoint) feed the topic rating.
            ...(tries != null ? { attempts: tries, solved: correct } : {}),
          };
        });
        const correctCount = feedback.filter((f) => f.correct).length;
        const score = feedback.length ? Math.round((correctCount / feedback.length) * 100) : 0;
        const passed = score >= PASS_MARK;
        const submission: Submission = {
          id: uid("sub"),
          userId,
          assignmentId,
          courseId,
          answers,
          score,
          passed,
          feedback,
          attemptNumber: prior.attempts + 1,
          submittedAt: new Date().toISOString(),
        };
        setState((s) => {
          const newSubs = [...s.submissions, submission];
          // Answering a checkpoint can finalize the topic → (re)compute its credit (best kept).
          const { users } = applyTopicCredit(s.users, s.courses, courseId, userId, newSubs, s.progress);
          return { ...s, submissions: newSubs, users };
        });
        if (sb) {
          fire(db.insertSubmission(sb, submission));
          const { patch } = applyTopicCredit(state.users, state.courses, courseId, userId, [...state.submissions, submission], state.progress);
          if (patch) fire(db.updateProfile(sb, userId, patch));
        }
        return submission;
      },

      // ── notes ──
      notesFor(videoId, userId) {
        return state.notes
          .filter((n) => n.userId === who(userId) && n.videoId === videoId)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      },
      notesForCourse(courseId, userId) {
        const course = getCourse(courseId);
        if (!course) return [];
        const videoIds = new Set(course.videos.map((v) => v.id));
        return state.notes
          .filter((n) => n.userId === who(userId) && videoIds.has(n.videoId))
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)); // oldest first across the topic
      },
      myRatingFor(courseId, userId) {
        const uidNow = userId ?? currentUser?.id;
        if (!uidNow) return undefined;
        return state.courseRatings.find((r) => r.courseId === courseId && r.userId === uidNow);
      },
      isCourseComplete(courseId, userId) {
        const uidNow = userId ?? currentUser?.id;
        if (!uidNow) return false;
        const course = state.courses.find((c) => c.id === courseId);
        if (!course || !course.videos.length) return false;
        const allVideos = course.videos.every((v) =>
          state.progress.some((p) => p.userId === uidNow && p.videoId === v.id && p.completed),
        );
        if (!allVideos) return false;
        // A topic is not finished while a checkpoint is still unpassed.
        return course.assignments.every((a) =>
          state.submissions.some((sub) => sub.userId === uidNow && sub.assignmentId === a.id && sub.passed),
        );
      },
      submitCourseRating(courseId, stars, review) {
        if (!currentUser) return;
        const clamped = Math.max(1, Math.min(5, Math.round(stars)));
        const existing = state.courseRatings.find(
          (r) => r.courseId === courseId && r.userId === currentUser.id,
        );
        const rating: CourseRating = {
          id: existing?.id ?? uid("rating"),
          userId: currentUser.id,
          courseId,
          stars: clamped,
          review: review?.trim() ? review.trim() : null,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setState((s) => ({
          ...s,
          courseRatings: [...s.courseRatings.filter((r) => r.id !== rating.id), rating],
          // Mirror the aggregate locally so the UI updates at once. Supabase recomputes
          // the authoritative value via trigger and the next loadAll overwrites this.
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            const others = s.courseRatings.filter((r) => r.courseId === courseId && r.id !== rating.id);
            const all = [...others, rating];
            const avg = all.reduce((sum, r) => sum + r.stars, 0) / all.length;
            return { ...c, rating: Math.round(avg * 100) / 100, ratingCount: all.length };
          }),
        }));
        if (sb) fire(db.upsertCourseRating(sb, rating));
      },
      addNote(videoId, text) {
        if (!currentUser || !text.trim()) return;
        const note: Note = {
          id: uid("note"),
          userId: currentUser.id,
          videoId,
          text: text.trim(),
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, notes: [note, ...s.notes] }));
        if (sb) fire(db.insertNote(sb, note));
      },
      deleteNote(noteId) {
        setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== noteId) }));
        if (sb) fire(db.deleteNote(sb, noteId));
      },

      // ── community ──
      postMessage(text) {
        if (!currentUser || !text.trim()) return;
        const post: CommunityPost = {
          id: uid("p"),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.isAdmin ? "admin" : (currentUser.role ?? "student"),
          text: text.trim(),
          createdAt: new Date().toISOString(),
          likedBy: [],
        };
        setState((s) => ({ ...s, community: [post, ...s.community] }));
        if (sb) fire(db.insertPost(sb, post));
      },
      editMessage(id, text) {
        setState((s) => ({
          ...s,
          community: s.community.map((p) =>
            p.id === id ? { ...p, text: text.trim(), editedAt: new Date().toISOString() } : p,
          ),
        }));
        if (sb) fire(db.updatePost(sb, id, text.trim()));
      },
      deleteMessage(id) {
        setState((s) => ({ ...s, community: s.community.filter((p) => p.id !== id) }));
        if (sb) fire(db.deletePost(sb, id));
      },
      toggleLike(id) {
        if (!currentUser) return;
        const post = state.community.find((p) => p.id === id);
        const liked = post ? post.likedBy.includes(currentUser.id) : false;
        setState((s) => ({
          ...s,
          community: s.community.map((p) =>
            p.id === id
              ? {
                  ...p,
                  likedBy: liked
                    ? p.likedBy.filter((x) => x !== currentUser.id)
                    : [...p.likedBy, currentUser.id],
                }
              : p,
          ),
        }));
        if (sb) fire(db.setLike(sb, id, currentUser.id, !liked));
      },

      // ── discussion board: threaded comments ──
      commentsFor(postId) {
        return state.comments
          .filter((c) => c.postId === postId)
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      },
      addComment(postId, text, parentId, mentionIds) {
        if (!currentUser || !text.trim()) return;
        const id = uid("cm");
        const createdAt = new Date().toISOString();
        const mentions = (mentionIds ?? []).filter((m) => m && m !== currentUser.id);
        const comment: PostComment = {
          id,
          postId,
          parentId: parentId ?? null,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.isAdmin ? "admin" : (currentUser.role ?? "student"),
          text: text.trim(),
          mentions,
          createdAt,
          likedBy: [],
        };
        // Notification recipients — an @mention wins over a plain reply for the same person.
        const recipients = new Map<string, NotificationType>();
        for (const m of mentions) recipients.set(m, "mention");
        if (parentId) {
          const parent = state.comments.find((c) => c.id === parentId);
          if (parent && parent.userId !== currentUser.id && !recipients.has(parent.userId))
            recipients.set(parent.userId, "reply");
        } else {
          const post = state.community.find((p) => p.id === postId);
          if (post && post.userId !== currentUser.id && !recipients.has(post.userId))
            recipients.set(post.userId, "reply");
        }
        const preview = text.trim().slice(0, 120);
        const notifs: AppNotification[] = [...recipients.entries()].map(([rid, type]) => ({
          id: uid("nt"),
          userId: rid,
          type,
          actorId: currentUser.id,
          actorName: currentUser.name,
          postId,
          commentId: id,
          preview,
          read: false,
          createdAt,
        }));
        setState((s) => ({
          ...s,
          comments: [...s.comments, comment],
          notifications: [...notifs, ...s.notifications],
        }));
        if (sb) {
          fire(db.insertComment(sb, comment));
          for (const n of notifs) fire(db.insertNotification(sb, n));
        }
      },
      editComment(id, text) {
        if (!text.trim()) return;
        setState((s) => ({
          ...s,
          comments: s.comments.map((c) =>
            c.id === id ? { ...c, text: text.trim(), editedAt: new Date().toISOString() } : c,
          ),
        }));
        if (sb) fire(db.updateComment(sb, id, text.trim()));
      },
      deleteComment(id) {
        // remove the comment and any direct replies to it
        setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id && c.parentId !== id) }));
        if (sb) fire(db.deleteComment(sb, id));
      },
      toggleCommentLike(id) {
        if (!currentUser) return;
        const c = state.comments.find((x) => x.id === id);
        const liked = c ? c.likedBy.includes(currentUser.id) : false;
        setState((s) => ({
          ...s,
          comments: s.comments.map((x) =>
            x.id === id
              ? {
                  ...x,
                  likedBy: liked
                    ? x.likedBy.filter((u) => u !== currentUser.id)
                    : [...x.likedBy, currentUser.id],
                }
              : x,
          ),
        }));
        if (sb) fire(db.setCommentLike(sb, id, currentUser.id, !liked));
      },

      // ── per-video discussion (YouTube-style comments under a topic video) ──
      videoCommentsFor(videoId) {
        return state.videoComments
          .filter((c) => c.videoId === videoId)
          .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      },
      addVideoComment(videoId, courseId, text, parentId, mentionIds) {
        if (!currentUser || !text.trim()) return;
        const id = uid("vc");
        const createdAt = new Date().toISOString();
        const mentions = (mentionIds ?? []).filter((m) => m && m !== currentUser.id);
        const comment: VideoComment = {
          id,
          videoId,
          courseId,
          parentId: parentId ?? null,
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.isAdmin ? "admin" : (currentUser.role ?? "student"),
          text: text.trim(),
          mentions,
          createdAt,
          likedBy: [],
        };
        // Notification recipients — an @mention wins over a plain reply for the same person.
        const recipients = new Map<string, NotificationType>();
        for (const m of mentions) recipients.set(m, "mention");
        if (parentId) {
          const parent = state.videoComments.find((c) => c.id === parentId);
          if (parent && parent.userId !== currentUser.id && !recipients.has(parent.userId))
            recipients.set(parent.userId, "reply");
        }
        const preview = text.trim().slice(0, 120);
        const notifs: AppNotification[] = [...recipients.entries()].map(([rid, type]) => ({
          id: uid("nt"),
          userId: rid,
          type,
          actorId: currentUser.id,
          actorName: currentUser.name,
          videoId,
          courseId,
          commentId: id,
          preview,
          read: false,
          createdAt,
        }));
        setState((s) => ({
          ...s,
          videoComments: [...s.videoComments, comment],
          notifications: [...notifs, ...s.notifications],
        }));
        if (sb) {
          fire(db.insertVideoComment(sb, comment));
          for (const n of notifs) fire(db.insertNotification(sb, n));
        }
      },
      editVideoComment(id, text) {
        if (!text.trim()) return;
        setState((s) => ({
          ...s,
          videoComments: s.videoComments.map((c) =>
            c.id === id ? { ...c, text: text.trim(), editedAt: new Date().toISOString() } : c,
          ),
        }));
        if (sb) fire(db.updateVideoComment(sb, id, text.trim()));
      },
      deleteVideoComment(id) {
        // remove the comment and any direct replies to it
        setState((s) => ({ ...s, videoComments: s.videoComments.filter((c) => c.id !== id && c.parentId !== id) }));
        if (sb) fire(db.deleteVideoComment(sb, id));
      },
      toggleVideoCommentLike(id) {
        if (!currentUser) return;
        const c = state.videoComments.find((x) => x.id === id);
        const liked = c ? c.likedBy.includes(currentUser.id) : false;
        setState((s) => ({
          ...s,
          videoComments: s.videoComments.map((x) =>
            x.id === id
              ? {
                  ...x,
                  likedBy: liked
                    ? x.likedBy.filter((u) => u !== currentUser.id)
                    : [...x.likedBy, currentUser.id],
                }
              : x,
          ),
        }));
        if (sb) fire(db.setVideoCommentLike(sb, id, currentUser.id, !liked));
      },

      // ── notifications ──
      markNotificationRead(id) {
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        }));
        if (sb) fire(db.markNotificationRead(sb, id));
      },
      markAllNotificationsRead() {
        if (!currentUser) return;
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) =>
            n.userId === currentUser.id ? { ...n, read: true } : n,
          ),
        }));
        if (sb) fire(db.markAllNotificationsRead(sb, currentUser.id));
      },

      // ── profile (self-service account editing) ──
      updateProfileInfo(patch) {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, ...patch }));
        if (sb) {
          const p: Record<string, unknown> = {};
          if (patch.name !== undefined) p.name = patch.name;
          if (patch.username !== undefined) p.username = patch.username ?? null;
          if (patch.headline !== undefined) p.headline = patch.headline ?? null;
          if (patch.bio !== undefined) p.bio = patch.bio ?? null;
          if (patch.age !== undefined) p.age = patch.age ?? null;
          if (patch.gender !== undefined) p.gender = patch.gender ?? null;
          if (patch.company !== undefined) p.company = patch.company ?? null;
          if (patch.region !== undefined) p.region = patch.region ?? null;
          if (patch.phone !== undefined) p.phone = patch.phone ?? null;
          if (patch.nationality !== undefined) p.nationality = patch.nationality ?? null;
          if (patch.avatarUrl !== undefined) p.avatar_url = patch.avatarUrl ?? null;
          if (Object.keys(p).length) fire(db.updateProfile(sb, currentUser.id, p));
        }
      },

      // ── sessions ──
      toggleAttendance(sessionId) {
        if (!currentUser) return;
        const sess = state.sessions.find((x) => x.id === sessionId);
        const attending = sess ? sess.attendeeIds.includes(currentUser.id) : false;
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((x) =>
            x.id === sessionId
              ? {
                  ...x,
                  attendeeIds: attending
                    ? x.attendeeIds.filter((u) => u !== currentUser.id)
                    : [...x.attendeeIds, currentUser.id],
                }
              : x,
          ),
        }));
        if (sb) fire(db.setAttendance(sb, sessionId, currentUser.id, !attending));
      },

      // ── admin: courses ──
      saveCourse(course) {
        if (!hasPermission(currentUser, "content")) return;
        // Sub-admins (admins limited by a permission set) can't publish directly —
        // their topic is sent to the owner for approval.
        const sub = !!currentUser?.isAdmin && !isOwner(currentUser);
        const finalCourse: Course = sub
          ? { ...course, published: false, pendingApproval: true, submittedBy: currentUser!.id }
          : { ...course, pendingApproval: course.pendingApproval ?? false };
        setState((s) => ({
          ...s,
          courses: s.courses.some((c) => c.id === finalCourse.id)
            ? s.courses.map((c) => (c.id === finalCourse.id ? finalCourse : c))
            : [finalCourse, ...s.courses],
        }));
        if (sb) fire(db.saveCourse(sb, finalCourse));
      },
      deleteCourse(courseId) {
        if (!isOwner(currentUser)) return; // owner-only: sub-admins can't delete topics
        setState((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== courseId) }));
        if (sb) fire(db.deleteCourse(sb, courseId));
      },
      togglePublish(courseId) {
        if (!isOwner(currentUser)) return; // publishing is owner-only (sub-admins go via approval)
        const c = getCourse(courseId);
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: !x.published } : x)),
        }));
        if (sb && c) fire(db.updateCourse(sb, courseId, { published: !c.published }));
      },
      toggleTrending(courseId) {
        if (!isOwner(currentUser)) return;
        const c = getCourse(courseId);
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, trending: !x.trending } : x)),
        }));
        if (sb && c) fire(db.updateCourse(sb, courseId, { trending: !c.trending }));
      },
      approveCourse(courseId) {
        if (!isOwner(currentUser) || !getCourse(courseId)) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: true, pendingApproval: false } : x)),
        }));
        if (sb) fire(db.updateCourse(sb, courseId, { published: true, pending_approval: false }));
      },
      rejectCourse(courseId) {
        if (!isOwner(currentUser) || !getCourse(courseId)) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: false, pendingApproval: false } : x)),
        }));
        if (sb) fire(db.updateCourse(sb, courseId, { published: false, pending_approval: false }));
      },
      saveQuestion(courseId, assignmentId, question) {
        if (!hasPermission(currentUser, "content")) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  assignments: c.assignments.map((a) =>
                    a.id !== assignmentId
                      ? a
                      : {
                          ...a,
                          questions: a.questions.some((q) => q.id === question.id)
                            ? a.questions.map((q) => (q.id === question.id ? question : q))
                            : [...a.questions, question],
                        },
                  ),
                },
          ),
        }));
        if (sb) fire(db.saveQuestion(sb, assignmentId, question));
      },
      deleteQuestion(courseId, assignmentId, questionId) {
        if (!hasPermission(currentUser, "content")) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id !== courseId
              ? c
              : {
                  ...c,
                  assignments: c.assignments.map((a) =>
                    a.id !== assignmentId
                      ? a
                      : { ...a, questions: a.questions.filter((q) => q.id !== questionId) },
                  ),
                },
          ),
        }));
        if (sb) fire(db.deleteQuestion(sb, questionId));
      },

      // ── admin: tips / tracks / sessions / users ──
      saveTip(tip) {
        if (!hasPermission(currentUser, "content")) return;
        setState((s) => ({
          ...s,
          tips: s.tips.some((t) => t.id === tip.id)
            ? s.tips.map((t) => (t.id === tip.id ? tip : t))
            : [...s.tips, tip],
        }));
        if (sb) fire(db.saveTip(sb, tip));
      },
      deleteTip(tipId) {
        if (!hasPermission(currentUser, "content")) return;
        setState((s) => ({ ...s, tips: s.tips.filter((t) => t.id !== tipId) }));
        if (sb) fire(db.deleteTip(sb, tipId));
      },
      addTrack(label) {
        const id = label.trim().toLowerCase().replace(/\s+/g, "_");
        const track = { id, label: label.trim() };
        setState((s) => (s.tracks.some((t) => t.id === id) ? s : { ...s, tracks: [...s.tracks, track] }));
        if (sb) fire(db.addTrack(sb, track));
        return id;
      },
      saveSession(sess) {
        if (!hasPermission(currentUser, "sessions")) return;
        setState((s) => ({
          ...s,
          sessions: s.sessions.some((x) => x.id === sess.id)
            ? s.sessions.map((x) => (x.id === sess.id ? sess : x))
            : [sess, ...s.sessions],
        }));
        if (sb) fire(db.saveSession(sb, sess));
      },
      deleteSession(id) {
        if (!hasPermission(currentUser, "sessions")) return;
        setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
        if (sb) fire(db.deleteSession(sb, id));
      },
      // Local-only sync after the broadcast route recorded delivery server-side.
      markSessionNotified(id, notifiedAt, notifiedUserIds) {
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, notifiedAt, notifiedUserIds } : x)),
        }));
      },
      async setBanned(userId, banned) {
        if (!isOwner(currentUser)) return { ok: false, error: "Only the owner can do that." };
        const prev = state.users.find((u) => u.id === userId);
        patchUser(userId, (u) => ({ ...u, banned }));
        if (!realMode) return { ok: true };
        const r = await adminUserAction({ action: "ban", userId, banned });
        if (!r.ok && prev) patchUser(userId, () => prev); // roll back on server failure
        return r;
      },
      async deleteUser(userId) {
        if (!isOwner(currentUser)) return { ok: false, error: "Only the owner can do that." };
        const prev = state.users.find((u) => u.id === userId);
        setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
        if (!realMode) return { ok: true };
        const r = await adminUserAction({ action: "delete", userId });
        if (!r.ok && prev) setState((s) => (s.users.some((u) => u.id === userId) ? s : { ...s, users: [...s.users, prev] }));
        return r;
      },
      async setSubAdmin(userId, permissions) {
        if (!isOwner(currentUser)) return { ok: false, error: "Only the owner can do that." };
        const prev = state.users.find((u) => u.id === userId);
        patchUser(userId, (u) => ({ ...u, isAdmin: true, permissions }));
        if (!realMode) return { ok: true };
        const r = await adminUserAction({ action: "grant", userId, permissions });
        if (!r.ok && prev) patchUser(userId, () => prev);
        return r;
      },
      async revokeAdmin(userId) {
        if (!isOwner(currentUser)) return { ok: false, error: "Only the owner can do that." };
        const prev = state.users.find((u) => u.id === userId);
        patchUser(userId, (u) => ({ ...u, isAdmin: false, permissions: null }));
        if (!realMode) return { ok: true };
        const r = await adminUserAction({ action: "revoke", userId });
        if (!r.ok && prev) patchUser(userId, () => prev);
        return r;
      },

      // ── admin: coupons ──
      saveCoupon(coupon) {
        if (!isOwner(currentUser)) return;
        const c: Coupon = { ...coupon, code: normalizeCode(coupon.code) };
        setState((s) => ({
          ...s,
          coupons: s.coupons.some((x) => x.code === c.code)
            ? s.coupons.map((x) => (x.code === c.code ? c : x))
            : [c, ...s.coupons],
        }));
        if (sb) fire(db.saveCoupon(sb, c));
      },
      deleteCoupon(code) {
        if (!isOwner(currentUser)) return;
        const c = normalizeCode(code);
        setState((s) => ({ ...s, coupons: s.coupons.filter((x) => x.code !== c) }));
        if (sb) fire(db.deleteCoupon(sb, c));
      },
      getCoupon(code) {
        const c = normalizeCode(code);
        return state.coupons.find((x) => x.code === c);
      },

      // ── payments: owner refund + admin retry (server enforces auth too) ──
      async refundPayment(paymentId) {
        if (!isOwner(currentUser)) return { ok: false, error: "Owner access required." };
        try {
          const res = await fetch("/api/payments/razorpay/refund", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          const r = await res.json();
          if (!r.ok) return { ok: false, error: r.error ?? "Refund failed." };
          setState((s) => ({
            ...s,
            payments: s.payments.map((p) =>
              p.id === paymentId ? { ...p, status: "refunded", refundedAt: new Date().toISOString() } : p,
            ),
          }));
          return { ok: true };
        } catch {
          return { ok: false, error: "Refund request failed." };
        }
      },
      async retryGrant(paymentId) {
        if (!currentUser?.isAdmin) return { ok: false, error: "Admin access required." };
        try {
          const res = await fetch("/api/payments/razorpay/retry-grant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          const r = await res.json();
          if (!r.ok) return { ok: false, error: r.error ?? "Retry failed." };
          setState((s) => ({
            ...s,
            payments: s.payments.map((p) => (p.id === paymentId ? { ...p, grantStatus: "granted" } : p)),
          }));
          return { ok: true };
        } catch {
          return { ok: false, error: "Retry request failed." };
        }
      },
      async refreshPayments() {
        if (!currentUser?.isAdmin || !sb) return;
        try {
          const payments = await db.fetchPayments(sb);
          setState((s) => ({ ...s, payments }));
        } catch (e) {
          console.error("[supabase] refreshPayments", e);
        }
      },
      savePricing(tiers) {
        if (!isOwner(currentUser)) return;
        setState((s) => ({ ...s, pricing: tiers }));
        if (sb) {
          fire(db.savePricing(sb, tiers));
          fire(db.saveUpgradeInfoFlag(sb, tiers.showUpgradeInfo !== false));
        }
      },

      // ── admin: homepage CMS / team / books ──
      async saveSiteContent(content) {
        if (!hasPermission(currentUser, "homepage"))
          return { ok: false, error: "You don't have permission to edit the homepage." };
        setState((s) => ({ ...s, siteContent: content }));
        if (sb) {
          const { error } = await db.saveSiteContent(sb, content);
          if (error) {
            console.error("[supabase] saveSiteContent", error);
            return { ok: false, error: error.message };
          }
        }
        return { ok: true };
      },
      saveTeamMember(member) {
        if (!hasPermission(currentUser, "team")) return;
        setState((s) => ({
          ...s,
          teamMembers: s.teamMembers.some((m) => m.id === member.id)
            ? s.teamMembers.map((m) => (m.id === member.id ? member : m))
            : [...s.teamMembers, member],
        }));
        if (sb) fire(db.saveTeamMember(sb, member));
      },
      deleteTeamMember(id) {
        if (!hasPermission(currentUser, "team")) return;
        setState((s) => ({ ...s, teamMembers: s.teamMembers.filter((m) => m.id !== id) }));
        if (sb) fire(db.deleteTeamMember(sb, id));
      },
      saveBook(book) {
        if (!hasPermission(currentUser, "homepage")) return;
        setState((s) => ({
          ...s,
          books: s.books.some((b) => b.id === book.id)
            ? s.books.map((b) => (b.id === book.id ? book : b))
            : [...s.books, book],
        }));
        if (sb) fire(db.saveBook(sb, book));
      },
      deleteBook(id) {
        if (!hasPermission(currentUser, "homepage")) return;
        setState((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
        if (sb) fire(db.deleteBook(sb, id));
      },

      // ── admin: articles ──
      saveArticle(article) {
        if (!hasPermission(currentUser, "articles")) return;
        setState((s) => ({
          ...s,
          articles: s.articles.some((a) => a.id === article.id)
            ? s.articles.map((a) => (a.id === article.id ? article : a))
            : [article, ...s.articles],
        }));
        if (sb) {
          fire(db.saveArticle(sb, article));
          fire(db.setArticleArchived(sb, article.id, article.archived ?? false));
        }
      },
      deleteArticle(id) {
        if (!hasPermission(currentUser, "articles")) return;
        setState((s) => ({ ...s, articles: s.articles.filter((a) => a.id !== id) }));
        if (sb) fire(db.deleteArticle(sb, id));
      },

      // ── admin: announcements ──
      saveAnnouncement(a) {
        if (!hasPermission(currentUser, "announcements")) return;
        setState((s) => ({
          ...s,
          announcements: s.announcements.some((x) => x.id === a.id)
            ? s.announcements.map((x) => (x.id === a.id ? a : x))
            : [a, ...s.announcements],
        }));
        if (sb) fire(db.saveAnnouncement(sb, a));
      },
      deleteAnnouncement(id) {
        if (!hasPermission(currentUser, "announcements")) return;
        setState((s) => ({ ...s, announcements: s.announcements.filter((a) => a.id !== id) }));
        if (sb) fire(db.deleteAnnouncement(sb, id));
      },
      // Local-only sync after the broadcast route recorded delivery server-side.
      markAnnouncementNotified(id, notifiedAt, notifiedUserIds) {
        setState((s) => ({
          ...s,
          announcements: s.announcements.map((a) => (a.id === id ? { ...a, notifiedAt, notifiedUserIds } : a)),
        }));
      },

      // ── admin: FAQ + privacy (gated under the "homepage" site-content permission) ──
      saveFaq(f) {
        if (!hasPermission(currentUser, "homepage")) return;
        setState((s) => ({
          ...s,
          faqs: (s.faqs.some((x) => x.id === f.id)
            ? s.faqs.map((x) => (x.id === f.id ? f : x))
            : [...s.faqs, f]
          ).sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt < b.createdAt ? -1 : 1)),
        }));
        if (sb) fire(db.saveFaq(sb, f));
      },
      deleteFaq(id) {
        if (!hasPermission(currentUser, "homepage")) return;
        setState((s) => ({ ...s, faqs: s.faqs.filter((f) => f.id !== id) }));
        if (sb) fire(db.deleteFaq(sb, id));
      },
      savePrivacyPolicy(text) {
        if (!hasPermission(currentUser, "homepage")) return;
        setState((s) => ({ ...s, privacyPolicy: text }));
        if (sb) fire(db.savePrivacyPolicy(sb, text));
      },

      // ── lookups ──
      getCourse,
      getCourseBySlug,
      getVideoById,
      resetDemo() {
        if (realMode) return;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setState(seedState());
      },
    };
  }, [state, hydrated, auth]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
