"use client";

import * as React from "react";
import {
  AppNotification,
  Article,
  Assignment,
  Book,
  CommunityPost,
  Coupon,
  Course,
  DailyTip,
  Enrollment,
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
import { DEFAULT_TRACKS, DEFAULT_PRICING, DEFAULT_SITE_CONTENT, courseCategories, isOwner, hasPermission } from "@/lib/types";
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
} from "@/lib/mock/seed";
import { getSupabase, setSupabaseTokenGetter } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isClerkConfigured } from "@/lib/clerk/config";
import * as db from "@/lib/supabase/db";
import { normalizeCode } from "@/lib/coupons";
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

const CREDITS_PER_VIDEO = 15;
const CREDITS_PER_ASSIGNMENT = 60;
const PASS_MARK = 60;
const MAX_ATTEMPTS = 10;

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
  siteContent: SiteContent;
  enrollments: Enrollment[];
  progress: VideoProgress[];
  submissions: Submission[];
  notes: Note[];
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
    siteContent: DEFAULT_SITE_CONTENT,
    enrollments: seedEnrollments,
    progress: seedProgress,
    submissions: seedSubmissions,
    notes: seedNotes,
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
    siteContent: DEFAULT_SITE_CONTENT, enrollments: [], progress: [], submissions: [], notes: [], coupons: [],
    payments: [], pricing: DEFAULT_PRICING, currentUserId: null,
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
  signOut(): Promise<void>;
  setRole(role: Role): void;
  // access / enrollment
  isEnrolled(courseId: string, userId?: string): boolean;
  hasAccess(courseId: string, userId?: string): boolean;
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
  setBanned(userId: string, banned: boolean): void;
  deleteUser(userId: string): void;
  setSubAdmin(userId: string, permissions: Permission[]): void;
  revokeAdmin(userId: string): void;
  // admin — coupons
  saveCoupon(coupon: Coupon): void;
  deleteCoupon(code: string): void;
  getCoupon(code: string): Coupon | undefined;
  // payments — owner refund + admin retry of a flagged (grant_failed) payment
  refundPayment(paymentId: string): Promise<{ ok: boolean; error?: string }>;
  retryGrant(paymentId: string): Promise<{ ok: boolean; error?: string }>;
  // admin — homepage CMS / team / books
  saveSiteContent(content: SiteContent): Promise<{ ok: boolean; error?: string }>;
  saveTeamMember(member: TeamMember): void;
  deleteTeamMember(id: string): void;
  saveBook(book: Book): void;
  saveArticle(article: Article): void;
  deleteArticle(id: string): void;
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
      if (userId && auth.identity) {
        try {
          await db.ensureProfile(sb, userId, auth.identity.email, auth.identity.name);
        } catch (e) {
          console.error("[supabase] ensureProfile", e);
        }
      }

      const data = await db.loadAll(sb);
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
        currentUserId: userId,
      }));
      setHydrated(true);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isLoaded, auth.userId]);

  // ── Persist to localStorage (mock mode only) ──
  React.useEffect(() => {
    if (!hydrated || realMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  // ── Cache the per-user snapshot (Supabase mode) for instant reloads ──
  React.useEffect(() => {
    if (!hydrated || !realMode || !state.currentUserId) return;
    try {
      localStorage.setItem(SB_CACHE_PREFIX + state.currentUserId, JSON.stringify(state));
    } catch {
      /* ignore quota errors — falls back to a full load next time */
    }
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

    const hasAccess = (courseId: string, userId?: string) => {
      const course = getCourse(courseId);
      if (!course) return false;
      if (course.price === 0) return true;
      const u = state.users.find((x) => x.id === who(userId));
      if (!u) return false;
      if (u.subscriptionPlan === "all_access") return true;
      if (courseCategories(course).some((c) => (u.ownedCategories ?? []).includes(c))) return true; // category pass
      return u.ownedCourseIds.includes(courseId);
    };

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
      purchaseCourse(courseId, skipPersist) {
        if (!currentUser) return;
        const wasEnrolled = isEnrolled(courseId);
        patchUser(currentUser.id, (u) => ({
          ...u,
          ownedCourseIds: u.ownedCourseIds.includes(courseId)
            ? u.ownedCourseIds
            : [...u.ownedCourseIds, courseId],
        }));
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) =>
            c.id === courseId
              ? { ...c, purchaseCount: c.purchaseCount + 1, enrolledCount: c.enrolledCount + (wasEnrolled ? 0 : 1) }
              : c,
          ),
          enrollments: wasEnrolled
            ? s.enrollments
            : [...s.enrollments, { userId: currentUser.id, courseId, enrolledAt: new Date().toISOString() }],
        }));
        if (sb && !skipPersist) {
          fire(db.purchase(sb, currentUser.id, courseId));
          if (!wasEnrolled) fire(db.enroll(sb, currentUser.id, courseId));
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
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        patchUser(currentUser.id, (u) => ({
          ...u,
          ownedCategories: merged,
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
        const already = isVideoCompleted(videoId);
        const found = getVideoById(videoId);
        const dur = found?.video.durationSeconds ?? 0;
        setState((s) => {
          const existing = s.progress.find(
            (p) => p.userId === currentUser.id && p.videoId === videoId,
          );
          const progress = existing
            ? s.progress.map((p) =>
                p === existing
                  ? { ...p, completed: true, watchSeconds: dur, completedAt: new Date().toISOString() }
                  : p,
              )
            : [
                ...s.progress,
                {
                  userId: currentUser.id,
                  videoId,
                  courseId: found?.course.id ?? "",
                  completed: true,
                  watchSeconds: dur,
                  completedAt: new Date().toISOString(),
                },
              ];
          return {
            ...s,
            progress,
            users: already
              ? s.users
              : s.users.map((u) =>
                  u.id === currentUser.id
                    ? { ...u, learningCredits: u.learningCredits + CREDITS_PER_VIDEO, lastActiveAt: new Date().toISOString() }
                    : u,
                ),
          };
        });
        if (sb) {
          fire(db.completeVideo(sb, { userId: currentUser.id, videoId, courseId: found?.course.id ?? "", watchSeconds: dur }));
          if (!already)
            fire(db.updateProfile(sb, currentUser.id, { learning_credits: currentUser.learningCredits + CREDITS_PER_VIDEO }));
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
        const awardCredits = passed && !prior.passed;
        setState((s) => ({
          ...s,
          submissions: [...s.submissions, submission],
          users: awardCredits
            ? s.users.map((u) =>
                u.id === userId
                  ? { ...u, learningCredits: u.learningCredits + CREDITS_PER_ASSIGNMENT, lastActiveAt: new Date().toISOString() }
                  : u,
              )
            : s.users,
        }));
        if (sb) {
          fire(db.insertSubmission(sb, submission));
          if (awardCredits && currentUser)
            fire(db.updateProfile(sb, userId, { learning_credits: currentUser.learningCredits + CREDITS_PER_ASSIGNMENT }));
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
      setBanned(userId, banned) {
        if (!isOwner(currentUser)) return;
        patchUser(userId, (u) => ({ ...u, banned }));
        if (sb) fire(db.setBanned(sb, userId, banned));
      },
      deleteUser(userId) {
        if (!isOwner(currentUser)) return;
        setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
        if (sb) fire(db.deleteUserProfile(sb, userId));
      },
      setSubAdmin(userId, permissions) {
        if (!isOwner(currentUser)) return;
        patchUser(userId, (u) => ({ ...u, isAdmin: true, permissions }));
        if (sb) fire(db.updateProfile(sb, userId, { is_admin: true, permissions }));
      },
      revokeAdmin(userId) {
        if (!isOwner(currentUser)) return;
        patchUser(userId, (u) => ({ ...u, isAdmin: false, permissions: null }));
        if (sb) fire(db.updateProfile(sb, userId, { is_admin: false, permissions: null }));
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
      savePricing(tiers) {
        if (!isOwner(currentUser)) return;
        setState((s) => ({ ...s, pricing: tiers }));
        if (sb) fire(db.savePricing(sb, tiers));
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
        if (sb) fire(db.saveArticle(sb, article));
      },
      deleteArticle(id) {
        if (!hasPermission(currentUser, "articles")) return;
        setState((s) => ({ ...s, articles: s.articles.filter((a) => a.id !== id) }));
        if (sb) fire(db.deleteArticle(sb, id));
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
