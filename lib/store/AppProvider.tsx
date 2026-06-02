"use client";

import * as React from "react";
import {
  Assignment,
  CommunityPost,
  Course,
  DailyTip,
  Enrollment,
  Gender,
  LeadershipTrack,
  LiveSession,
  Note,
  Question,
  RecommendedResource,
  Role,
  Submission,
  User,
  Video,
  VideoProgress,
} from "@/lib/types";
import { DEFAULT_TRACKS } from "@/lib/types";
import {
  ADMIN_PASSWORD,
  seedCommunity,
  seedCourses,
  seedEnrollments,
  seedNotes,
  seedProgress,
  seedResources,
  seedSessions,
  seedSubmissions,
  seedTips,
  seedUsers,
} from "@/lib/mock/seed";

const STORAGE_KEY = "leap-coach-state-v1";
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
  enrollments: Enrollment[];
  progress: VideoProgress[];
  submissions: Submission[];
  notes: Note[];
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
    enrollments: seedEnrollments,
    progress: seedProgress,
    submissions: seedSubmissions,
    notes: seedNotes,
    currentUserId: null,
  };
}

export interface SignUpData {
  name: string;
  email: string;
  age?: number;
  gender?: Gender;
  phone?: string;
  phoneVerified?: boolean;
  company?: string;
  nationality?: string;
  region?: string;
  role?: Role | null;
}

interface AppContextValue extends AppState {
  hydrated: boolean;
  currentUser: User | null;
  // auth
  signIn(email: string): { ok: boolean; error?: string };
  signUp(data: SignUpData): { ok: boolean; error?: string };
  adminSignIn(email: string, password: string): { ok: boolean; error?: string };
  signOut(): void;
  setRole(role: Role): void;
  verifyPhone(): void;
  // access / enrollment
  isEnrolled(courseId: string, userId?: string): boolean;
  hasAccess(courseId: string, userId?: string): boolean;
  enrollFree(courseId: string): void;
  purchaseCourse(courseId: string): void;
  subscribeAllAccess(): void;
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
  // sessions
  toggleAttendance(sessionId: string): void;
  // admin — courses
  saveCourse(course: Course): void;
  deleteCourse(courseId: string): void;
  togglePublish(courseId: string): void;
  toggleTrending(courseId: string): void;
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
  const [state, setState] = React.useState<AppState>(seedState);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...seedState(), ...(JSON.parse(raw) as Partial<AppState>) });
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist on change (after hydration).
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state, hydrated]);

  const value = React.useMemo<AppContextValue>(() => {
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

    const touch = (userId: string) =>
      patchUser(userId, (u) => ({ ...u, lastActiveAt: new Date().toISOString() }));

    return {
      ...state,
      hydrated,
      currentUser,

      // ── auth ──
      signIn(email) {
        const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) return { ok: false, error: "No account found for that email." };
        if (u.banned) return { ok: false, error: "This account has been suspended." };
        setState((s) => ({ ...s, currentUserId: u.id }));
        touch(u.id);
        return { ok: true };
      },
      signUp(data) {
        const exists = state.users.some(
          (x) => x.email.toLowerCase() === data.email.trim().toLowerCase(),
        );
        if (exists) return { ok: false, error: "An account with that email already exists." };
        const newUser: User = {
          id: uid("u"),
          name: data.name,
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
        return { ok: true };
      },
      adminSignIn(email, password) {
        const u = state.users.find(
          (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.isAdmin,
        );
        if (!u) return { ok: false, error: "Not an admin account." };
        if (password !== ADMIN_PASSWORD) return { ok: false, error: "Incorrect password." };
        setState((s) => ({ ...s, currentUserId: u.id }));
        return { ok: true };
      },
      signOut() {
        setState((s) => ({ ...s, currentUserId: null }));
      },
      setRole(role) {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, role }));
      },
      verifyPhone() {
        if (!currentUser) return;
        patchUser(currentUser.id, (u) => ({ ...u, phoneVerified: true }));
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
      },
      purchaseCourse(courseId) {
        if (!currentUser) return;
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
              ? { ...c, purchaseCount: c.purchaseCount + 1, enrolledCount: c.enrolledCount + (isEnrolled(courseId) ? 0 : 1) }
              : c,
          ),
          enrollments: isEnrolled(courseId)
            ? s.enrollments
            : [...s.enrollments, { userId: currentUser.id, courseId, enrolledAt: new Date().toISOString() }],
        }));
      },
      subscribeAllAccess() {
        if (!currentUser) return;
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        patchUser(currentUser.id, (u) => ({
          ...u,
          subscriptionPlan: "all_access",
          subscriptionValidUntil: validUntil.toISOString(),
        }));
      },

      // ── progress ──
      isVideoCompleted,
      isVideoUnlocked,
      courseProgress,
      markVideoComplete(videoId) {
        if (!currentUser) return;
        const already = isVideoCompleted(videoId);
        const found = getVideoById(videoId);
        setState((s) => {
          const existing = s.progress.find(
            (p) => p.userId === currentUser.id && p.videoId === videoId,
          );
          const dur = found?.video.durationSeconds ?? 0;
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
        setState((s) => ({
          ...s,
          notes: [
            { id: uid("note"), userId: currentUser.id, videoId, text: text.trim(), createdAt: new Date().toISOString() },
            ...s.notes,
          ],
        }));
      },
      deleteNote(noteId) {
        setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== noteId) }));
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
      },
      editMessage(id, text) {
        setState((s) => ({
          ...s,
          community: s.community.map((p) =>
            p.id === id ? { ...p, text: text.trim(), editedAt: new Date().toISOString() } : p,
          ),
        }));
      },
      deleteMessage(id) {
        setState((s) => ({ ...s, community: s.community.filter((p) => p.id !== id) }));
      },
      toggleLike(id) {
        if (!currentUser) return;
        setState((s) => ({
          ...s,
          community: s.community.map((p) =>
            p.id === id
              ? {
                  ...p,
                  likedBy: p.likedBy.includes(currentUser.id)
                    ? p.likedBy.filter((x) => x !== currentUser.id)
                    : [...p.likedBy, currentUser.id],
                }
              : p,
          ),
        }));
      },

      // ── sessions ──
      toggleAttendance(sessionId) {
        if (!currentUser) return;
        setState((s) => ({
          ...s,
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  attendeeIds: sess.attendeeIds.includes(currentUser.id)
                    ? sess.attendeeIds.filter((x) => x !== currentUser.id)
                    : [...sess.attendeeIds, currentUser.id],
                }
              : sess,
          ),
        }));
      },

      // ── admin: courses ──
      saveCourse(course) {
        setState((s) => ({
          ...s,
          courses: s.courses.some((c) => c.id === course.id)
            ? s.courses.map((c) => (c.id === course.id ? course : c))
            : [course, ...s.courses],
        }));
      },
      deleteCourse(courseId) {
        setState((s) => ({ ...s, courses: s.courses.filter((c) => c.id !== courseId) }));
      },
      togglePublish(courseId) {
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) => (c.id === courseId ? { ...c, published: !c.published } : c)),
        }));
      },
      toggleTrending(courseId) {
        setState((s) => ({
          ...s,
          courses: s.courses.map((c) => (c.id === courseId ? { ...c, trending: !c.trending } : c)),
        }));
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
      },

      // ── admin: tips / tracks / sessions / users ──
      saveTip(tip) {
        setState((s) => ({
          ...s,
          tips: s.tips.some((t) => t.id === tip.id)
            ? s.tips.map((t) => (t.id === tip.id ? tip : t))
            : [...s.tips, tip],
        }));
      },
      deleteTip(tipId) {
        setState((s) => ({ ...s, tips: s.tips.filter((t) => t.id !== tipId) }));
      },
      addTrack(label) {
        const id = label.trim().toLowerCase().replace(/\s+/g, "_");
        setState((s) =>
          s.tracks.some((t) => t.id === id)
            ? s
            : { ...s, tracks: [...s.tracks, { id, label: label.trim() }] },
        );
        return id;
      },
      saveSession(sess) {
        setState((s) => ({
          ...s,
          sessions: s.sessions.some((x) => x.id === sess.id)
            ? s.sessions.map((x) => (x.id === sess.id ? sess : x))
            : [sess, ...s.sessions],
        }));
      },
      deleteSession(id) {
        setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) }));
      },
      setBanned(userId, banned) {
        patchUser(userId, (u) => ({ ...u, banned }));
      },
      deleteUser(userId) {
        setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
      },

      // ── lookups ──
      getCourse,
      getCourseBySlug,
      getVideoById,
      resetDemo() {
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
