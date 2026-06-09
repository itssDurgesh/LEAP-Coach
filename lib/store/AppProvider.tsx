"use client";

import * as React from "react";
import {
  AppNotification,
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
  VideoProgress,
} from "@/lib/types";
import { DEFAULT_TRACKS, DEFAULT_PRICING, DEFAULT_SITE_CONTENT, courseCategories, isOwner } from "@/lib/types";
import {
  ADMIN_PASSWORD,
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
} from "@/lib/mock/seed";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import * as db from "@/lib/supabase/db";
import { normalizeCode } from "@/lib/coupons";
import { baseUsername, uniqueUsername } from "@/lib/username";

const STORAGE_KEY = "leap-coach-state-v1";
// Per-user stale-while-revalidate cache for Supabase mode: paint instantly from the
// last snapshot on reload, then refresh in the background. Keyed by user id so one
// account never sees another's cached data.
const SB_CACHE_PREFIX = "leap-sb-cache-v1:";

// Captured at module-eval time — i.e. BEFORE the first React render calls
// getSupabase(), whose detectSessionInUrl strips the OAuth `?code=`/`#access_token`
// from the URL. Reading the flag here (not inside the effect, which runs after that
// render) is the only reliable way to know we landed on a Google/LinkedIn callback.
const OAUTH_CALLBACK =
  typeof window !== "undefined" &&
  (/[?&]code=/.test(window.location.search) || /[#&]access_token=/.test(window.location.hash));

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
  notifications: AppNotification[];
  teamMembers: TeamMember[];
  books: Book[];
  siteContent: SiteContent;
  enrollments: Enrollment[];
  progress: VideoProgress[];
  submissions: Submission[];
  notes: Note[];
  coupons: Coupon[];
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
    notifications: seedNotifications,
    teamMembers: seedTeam,
    books: seedBooks,
    siteContent: DEFAULT_SITE_CONTENT,
    enrollments: seedEnrollments,
    progress: seedProgress,
    submissions: seedSubmissions,
    notes: seedNotes,
    coupons: seedCoupons,
    pricing: DEFAULT_PRICING,
    currentUserId: null,
  };
}

function emptyState(): AppState {
  return {
    users: [], courses: [], tracks: DEFAULT_TRACKS, tips: [], sessions: [], resources: [],
    community: [], comments: [], notifications: [], teamMembers: [], books: [],
    siteContent: DEFAULT_SITE_CONTENT, enrollments: [], progress: [], submissions: [], notes: [], coupons: [],
    pricing: DEFAULT_PRICING, currentUserId: null,
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

type AuthResult = { ok: boolean; error?: string; user?: User };

interface AppContextValue extends AppState {
  hydrated: boolean;
  currentUser: User | null;
  supabaseMode: boolean;
  // auth
  signIn(email: string, password?: string): Promise<AuthResult>;
  signUp(data: SignUpData): Promise<AuthResult>;
  adminSignIn(email: string, password: string): Promise<AuthResult>;
  oauthSignIn(provider: "google" | "linkedin"): Promise<{ ok: boolean; error?: string }>;
  signOut(): void;
  setRole(role: Role): void;
  verifyPhone(): void;
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
  submitAssignment(assignmentId: string, answers: Record<string, string>): Submission;
  // notes
  notesFor(videoId: string, userId?: string): Note[];
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
  seedDemoContent(): Promise<void>;
  // admin — homepage CMS / team / books
  saveSiteContent(content: SiteContent): void;
  saveTeamMember(member: TeamMember): void;
  deleteTeamMember(id: string): void;
  saveBook(book: Book): void;
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AppState>(isSupabaseConfigured ? emptyState : seedState);
  const [hydrated, setHydrated] = React.useState(false);

  // ── Hydration: Supabase (real) or localStorage (mock) ──
  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setState({ ...seedState(), ...(JSON.parse(raw) as Partial<AppState>) });
      } catch {
        /* ignore corrupt storage */
      }
      setHydrated(true);
      return;
    }

    let active = true;
    // Which user the in-memory data is currently loaded for. `undefined` = not loaded yet.
    let loadedFor: string | null | undefined = undefined;

    const reload = (userId: string | null) => {
      // Instant paint from the cached snapshot for this user, so admin pages don't sit
      // on a spinner waiting for the full load on every reload (stale-while-revalidate).
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
      // Defer out of the auth callback: doing Supabase queries *inside* onAuthStateChange
      // holds GoTrue's auth lock and deadlocks those queries. setTimeout(0) releases it first.
      setTimeout(async () => {
        const data = await db.loadAll(sb);
        if (!active) return;
        // Guarantee the signed-in user is in `users` — otherwise currentUser is null
        // and guarded pages bounce to /login even with a valid session. loadAll can
        // miss a brand-new OAuth profile (new-user trigger lag / RLS scoping), so fetch
        // it directly as a fallback.
        let users = data.users;
        if (userId && !users.some((u) => u.id === userId)) {
          const me = await db.fetchUser(sb, userId);
          if (!active) return;
          if (me) users = [...users, me];
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
      }, 0);
    };

    // Run a full load exactly once per distinct signed-in identity.
    const finalize = (userId: string | null) => {
      if (!active || (loadedFor !== undefined && userId === loadedFor)) return;
      loadedFor = userId; // mark synchronously so duplicate events don't re-trigger loadAll
      reload(userId);
    };

    // Authoritative initial auth state. getSession() internally awaits Supabase's
    // detectSessionInUrl PKCE exchange, so on a Google/LinkedIn redirect it resolves to
    // the REAL signed-in user — not the transient logged-out state the old URL-sniffing
    // path raced against (which bounced new OAuth users to /login).
    sb.auth
      .getSession()
      .then(({ data }) => {
        const userId = data.session?.user?.id ?? null;
        // OAuth landing but no session resolved yet → wait for the SIGNED_IN below
        // instead of finalizing logged-out (which would bounce /select-role to /login).
        if (!userId && OAUTH_CALLBACK && loadedFor === undefined) return;
        finalize(userId);
      })
      .catch(() => {
        if (loadedFor === undefined && !OAUTH_CALLBACK) finalize(null);
      });

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      // The initial state is owned by getSession() above.
      if (event === "INITIAL_SESSION") return;
      // TOKEN_REFRESHED and focus-triggered SIGNED_IN events keep the same user — don't
      // re-fetch the entire app state on every tab refocus, just keep the session current.
      if (event === "TOKEN_REFRESHED" || (loadedFor !== undefined && userId === loadedFor)) {
        if (!active) return;
        setHydrated(true);
        setState((s) => ({ ...s, currentUserId: userId ?? s.currentUserId }));
        return;
      }
      finalize(userId);
    });

    // Safety net: if an OAuth exchange stalls (or fails), don't hang on the loader
    // forever — finalize a logged-out state after a few seconds.
    const fallback = OAUTH_CALLBACK
      ? setTimeout(() => {
          if (active && loadedFor === undefined) finalize(null);
        }, 6000)
      : undefined;

    return () => {
      active = false;
      if (fallback) clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  // ── Persist to localStorage (mock mode only) ──
  React.useEffect(() => {
    if (!hydrated || isSupabaseConfigured) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  // ── Cache the per-user snapshot (Supabase mode) for instant reloads ──
  React.useEffect(() => {
    if (!hydrated || !isSupabaseConfigured || !state.currentUserId) return;
    try {
      localStorage.setItem(SB_CACHE_PREFIX + state.currentUserId, JSON.stringify(state));
    } catch {
      /* ignore quota errors — falls back to a full load next time */
    }
  }, [state, hydrated]);

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
      supabaseMode: isSupabaseConfigured,

      // ── auth ──
      async signIn(email, password) {
        if (sb) {
          const { data, error } = await sb.auth.signInWithPassword({
            email: email.trim(),
            password: password ?? "",
          });
          if (error) return { ok: false, error: error.message };
          const u = data.user ? await db.fetchUser(sb, data.user.id) : null;
          if (u?.banned) {
            await sb.auth.signOut();
            return { ok: false, error: "This account has been suspended." };
          }
          if (u)
            setState((s) => ({
              ...s,
              currentUserId: u.id,
              users: s.users.some((x) => x.id === u.id) ? s.users : [...s.users, u],
            }));
          return { ok: true, user: u ?? undefined };
        }
        const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) return { ok: false, error: "No account found for that email." };
        if (u.banned) return { ok: false, error: "This account has been suspended." };
        setState((s) => ({ ...s, currentUserId: u.id }));
        return { ok: true, user: u };
      },
      async signUp(data) {
        if (sb) {
          const { data: d, error } = await sb.auth.signUp({
            email: data.email.trim(),
            password: data.password ?? "",
            options: { data: { name: data.name } },
          });
          if (error) return { ok: false, error: error.message };
          if (d.user) {
            const username = uniqueUsername(
              baseUsername(data.name, data.email),
              new Set(state.users.map((u) => u.username).filter(Boolean) as string[]),
            );
            fire(
              db.updateProfile(sb, d.user.id, {
                name: data.name,
                username,
                age: data.age ?? null,
                gender: data.gender ?? null,
                phone: data.phone ?? null,
                phone_verified: data.phoneVerified ?? false,
                company: data.company ?? null,
                nationality: data.nationality ?? null,
                region: data.region ?? null,
              }),
            );
          }
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
      async adminSignIn(email, password) {
        if (sb) {
          const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
          if (error) return { ok: false, error: error.message };
          const u = data.user ? await db.fetchUser(sb, data.user.id) : null;
          if (!u?.isAdmin) {
            await sb.auth.signOut();
            return { ok: false, error: "Not an admin account." };
          }
          setState((s) => ({
            ...s,
            currentUserId: u.id,
            users: s.users.some((x) => x.id === u.id) ? s.users : [...s.users, u],
          }));
          return { ok: true, user: u };
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
        if (!sb) return { ok: false, error: "Sign-in is not configured." };
        const { error } = await sb.auth.signInWithOAuth({
          provider: provider === "linkedin" ? "linkedin_oidc" : "google",
          options: {
            redirectTo: typeof window !== "undefined" ? `${window.location.origin}/select-role` : undefined,
          },
        });
        // On success the browser redirects; we only return here if it failed
        // (e.g. the provider isn't enabled in Supabase).
        if (error)
          return {
            ok: false,
            error:
              /not enabled|unsupported provider/i.test(error.message)
                ? `${provider === "linkedin" ? "LinkedIn" : "Google"} sign-in isn't enabled yet. Please use email, or try again later.`
                : error.message,
          };
        return { ok: true };
      },
      signOut() {
        if (sb) {
          fire(sb.auth.signOut());
          setState((s) => ({ ...s, currentUserId: null }));
          return;
        }
        setState((s) => ({ ...s, currentUserId: null }));
      },
      setRole(role) {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, role }));
        if (sb) fire(db.updateProfile(sb, currentUser.id, { role }));
      },
      verifyPhone() {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, phoneVerified: true }));
        if (sb) fire(db.updateProfile(sb, currentUser.id, { phone_verified: true }));
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
      submitAssignment(assignmentId, answers) {
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
          return {
            questionId: q.id,
            correct,
            explanation: correct
              ? `Correct — ${q.explanation}`
              : `Not quite. ${q.explanation} (Correct answer: "${q.correctAnswer}")`,
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
        setState((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== courseId) }));
        if (sb) fire(db.deleteCourse(sb, courseId));
      },
      togglePublish(courseId) {
        const c = getCourse(courseId);
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: !x.published } : x)),
        }));
        if (sb && c) fire(db.updateCourse(sb, courseId, { published: !c.published }));
      },
      toggleTrending(courseId) {
        const c = getCourse(courseId);
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, trending: !x.trending } : x)),
        }));
        if (sb && c) fire(db.updateCourse(sb, courseId, { trending: !c.trending }));
      },
      approveCourse(courseId) {
        if (!getCourse(courseId)) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: true, pendingApproval: false } : x)),
        }));
        if (sb) fire(db.updateCourse(sb, courseId, { published: true, pending_approval: false }));
      },
      rejectCourse(courseId) {
        if (!getCourse(courseId)) return;
        setState((s) => ({
          ...s,
          courses: s.courses.map((x) => (x.id === courseId ? { ...x, published: false, pendingApproval: false } : x)),
        }));
        if (sb) fire(db.updateCourse(sb, courseId, { published: false, pending_approval: false }));
      },
      saveQuestion(courseId, assignmentId, question) {
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
        setState((s) => ({
          ...s,
          tips: s.tips.some((t) => t.id === tip.id)
            ? s.tips.map((t) => (t.id === tip.id ? tip : t))
            : [...s.tips, tip],
        }));
        if (sb) fire(db.saveTip(sb, tip));
      },
      deleteTip(tipId) {
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
        setState((s) => ({
          ...s,
          sessions: s.sessions.some((x) => x.id === sess.id)
            ? s.sessions.map((x) => (x.id === sess.id ? sess : x))
            : [sess, ...s.sessions],
        }));
        if (sb) fire(db.saveSession(sb, sess));
      },
      deleteSession(id) {
        setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
        if (sb) fire(db.deleteSession(sb, id));
      },
      setBanned(userId, banned) {
        patchUser(userId, (u) => ({ ...u, banned }));
        if (sb) fire(db.setBanned(sb, userId, banned));
      },
      deleteUser(userId) {
        setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
        if (sb) fire(db.deleteUserProfile(sb, userId));
      },
      setSubAdmin(userId, permissions) {
        patchUser(userId, (u) => ({ ...u, isAdmin: true, permissions }));
        if (sb) fire(db.updateProfile(sb, userId, { is_admin: true, permissions }));
      },
      revokeAdmin(userId) {
        patchUser(userId, (u) => ({ ...u, isAdmin: false, permissions: null }));
        if (sb) fire(db.updateProfile(sb, userId, { is_admin: false, permissions: null }));
      },

      // ── admin: coupons ──
      saveCoupon(coupon) {
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
        const c = normalizeCode(code);
        setState((s) => ({ ...s, coupons: s.coupons.filter((x) => x.code !== c) }));
        if (sb) fire(db.deleteCoupon(sb, c));
      },
      getCoupon(code) {
        const c = normalizeCode(code);
        return state.coupons.find((x) => x.code === c);
      },
      savePricing(tiers) {
        setState((s) => ({ ...s, pricing: tiers }));
        if (sb) fire(db.savePricing(sb, tiers));
      },

      // ── admin: homepage CMS / team / books ──
      saveSiteContent(content) {
        setState((s) => ({ ...s, siteContent: content }));
        if (sb) fire(db.saveSiteContent(sb, content));
      },
      saveTeamMember(member) {
        setState((s) => ({
          ...s,
          teamMembers: s.teamMembers.some((m) => m.id === member.id)
            ? s.teamMembers.map((m) => (m.id === member.id ? member : m))
            : [...s.teamMembers, member],
        }));
        if (sb) fire(db.saveTeamMember(sb, member));
      },
      deleteTeamMember(id) {
        setState((s) => ({ ...s, teamMembers: s.teamMembers.filter((m) => m.id !== id) }));
        if (sb) fire(db.deleteTeamMember(sb, id));
      },
      saveBook(book) {
        setState((s) => ({
          ...s,
          books: s.books.some((b) => b.id === book.id)
            ? s.books.map((b) => (b.id === book.id ? book : b))
            : [...s.books, book],
        }));
        if (sb) fire(db.saveBook(sb, book));
      },
      deleteBook(id) {
        setState((s) => ({ ...s, books: s.books.filter((b) => b.id !== id) }));
        if (sb) fire(db.deleteBook(sb, id));
      },

      async seedDemoContent() {
        if (!sb || !currentUser?.isAdmin) return;
        for (const t of DEFAULT_TRACKS) await db.addTrack(sb, t);
        for (const c of seedCourses) await db.saveCourse(sb, c);
        for (const t of seedTips) await db.saveTip(sb, t);
        for (const r of seedResources) await db.upsertResource(sb, r);
        for (const sess of seedSessions) await db.saveSession(sb, sess);
        for (const c of seedCoupons) await db.saveCoupon(sb, c);
        for (const m of seedTeam) await db.saveTeamMember(sb, m);
        for (const b of seedBooks) await db.saveBook(sb, b);
        await db.saveSiteContent(sb, DEFAULT_SITE_CONTENT);
        await db.savePricing(sb, state.pricing);
        const data = await db.loadAll(sb);
        setState((s) => ({
          ...s,
          ...data,
          pricing: data.pricing ?? s.pricing,
          siteContent: data.siteContent ? { ...DEFAULT_SITE_CONTENT, ...data.siteContent } : s.siteContent,
        }));
      },

      // ── lookups ──
      getCourse,
      getCourseBySlug,
      getVideoById,
      resetDemo() {
        if (isSupabaseConfigured) return;
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setState(seedState());
      },
    };
  }, [state, hydrated]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
