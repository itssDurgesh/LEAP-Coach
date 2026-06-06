import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CommunityPost,
  Coupon,
  Course,
  DailyTip,
  Enrollment,
  LeadershipTrack,
  LiveSession,
  Note,
  PricingTiers,
  Question,
  RecommendedResource,
  Role,
  Submission,
  User,
  Video,
  VideoProgress,
} from "@/lib/types";

type Row = Record<string, any>;
const rows = async (q: any): Promise<Row[]> => ((await q).data ?? []) as Row[];

// ─────────────────────────── mappers ───────────────────────────
const mapTrack = (r: Row): LeadershipTrack => ({ id: r.id, label: r.label });
const mapTip = (r: Row): DailyTip => ({ id: r.id, text: r.text, author: r.author, targetRole: r.target_role, active: r.active });
const mapResource = (r: Row): RecommendedResource => ({ id: r.id, title: r.title, type: r.type, author: r.author, blurb: r.blurb, targetRole: r.target_role, accent: r.accent });
const mapQuestion = (r: Row): Question => ({ id: r.id, type: r.type, prompt: r.prompt, options: r.options ?? [], correctAnswer: r.correct_answer, explanation: r.explanation });
const mapVideo = (r: Row): Video => ({ id: r.id, courseId: r.course_id, title: r.title, order: r.order_index, durationSeconds: r.duration_seconds, muxPlaybackId: r.mux_playback_id, transcript: r.transcript ?? "", summary: r.summary ?? "", notesPdfName: r.notes_pdf_url ?? undefined, resources: r.resources ?? [] });
const mapEnrollment = (r: Row): Enrollment => ({ userId: r.user_id, courseId: r.course_id, enrolledAt: r.enrolled_at, completedAt: r.completed_at });
const mapProgress = (r: Row): VideoProgress => ({ userId: r.user_id, videoId: r.video_id, courseId: r.course_id, completed: r.completed, watchSeconds: r.watch_seconds, completedAt: r.completed_at });
const mapNote = (r: Row): Note => ({ id: r.id, userId: r.user_id, videoId: r.video_id, text: r.text, createdAt: r.created_at });
const mapSubmission = (r: Row): Submission => ({ id: r.id, userId: r.user_id, assignmentId: r.assignment_id, courseId: r.course_id, answers: r.answers ?? {}, score: Number(r.score), passed: r.passed, feedback: r.feedback ?? [], attemptNumber: r.attempt_number, submittedAt: r.submitted_at });
const mapProfile = (r: Row, ownedCourseIds: string[], ownedCategories: Role[] = []): User => ({
  id: r.id, name: r.name ?? "", email: r.email ?? "", role: r.role ?? null, avatarUrl: r.avatar_url,
  age: r.age ?? undefined, gender: r.gender ?? undefined, phone: r.phone ?? undefined, phoneVerified: r.phone_verified ?? false,
  company: r.company ?? undefined, nationality: r.nationality ?? undefined, region: r.region ?? undefined,
  learningCredits: r.learning_credits ?? 0, subscriptionPlan: r.subscription_plan ?? "none",
  subscriptionValidUntil: r.subscription_valid_until ?? null, ownedCourseIds, ownedCategories, banned: r.banned ?? false,
  isAdmin: r.is_admin ?? false, createdAt: r.created_at, lastActiveAt: r.last_active_at,
});
const mapSession = (r: Row, attendeeIds: string[]): LiveSession => ({ id: r.id, title: r.title, courseTitle: r.course_title ?? undefined, instructorName: r.instructor_name, startsAt: r.starts_at, durationMins: r.duration_mins, meetLink: r.meet_link, description: r.description ?? "", targetRole: r.target_role, attendeeIds, capacity: r.capacity });
const mapPost = (r: Row, likedBy: string[]): CommunityPost => ({ id: r.id, userId: r.user_id, userName: r.user_name, userRole: r.user_role, text: r.text, createdAt: r.created_at, editedAt: r.edited_at ?? undefined, likedBy });
const mapCoupon = (r: Row): Coupon => ({ code: r.code, discountPercent: r.discount_percent, category: r.category, active: r.active, maxRedemptions: r.max_redemptions ?? null, redemptions: r.redemptions ?? 0, expiresAt: r.expires_at ?? null, createdAt: r.created_at });

// ── course → row ──
const courseRow = (c: Course): Row => ({
  id: c.id, slug: c.slug, title: c.title, description: c.description, category: c.category,
  instructor_name: c.instructorName, instructor_title: c.instructorTitle, instructor_bio: c.instructorBio,
  instructor_initials: c.instructorInitials, hashtags: c.hashtags, tracks: c.tracks, level: c.level,
  rating: c.rating, rating_count: c.ratingCount, enrolled_count: c.enrolledCount, purchase_count: c.purchaseCount,
  price: c.price, trending: c.trending, published: c.published, accent: c.accent, created_at: c.createdAt,
});

export interface LoadedData {
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
  coupons: Coupon[];
  pricing: PricingTiers | null;
}

/** Fetch + assemble the entire app state from Supabase (RLS scopes per-user rows). */
export async function loadAll(sb: SupabaseClient): Promise<LoadedData> {
  const [
    profiles, purchases, tracks, courses, videos, assignments, questions,
    tips, resources, sessions, attendees, enrollments, progress, submissions, notes, posts, likes, coupons,
    categoryPasses, pricingRows,
  ] = await Promise.all([
    rows(sb.from("profiles").select("*")),
    rows(sb.from("course_purchases").select("*")),
    rows(sb.from("leadership_tracks").select("*")),
    rows(sb.from("courses").select("*")),
    rows(sb.from("videos").select("*")),
    rows(sb.from("assignments").select("*")),
    rows(sb.from("questions").select("*")),
    rows(sb.from("daily_tips").select("*")),
    rows(sb.from("recommended_resources").select("*")),
    rows(sb.from("live_sessions").select("*")),
    rows(sb.from("session_attendees").select("*")),
    rows(sb.from("enrollments").select("*")),
    rows(sb.from("video_progress").select("*")),
    rows(sb.from("submissions").select("*")),
    rows(sb.from("user_notes").select("*")),
    rows(sb.from("community_posts").select("*")),
    rows(sb.from("post_likes").select("*")),
    rows(sb.from("coupons").select("*")),
    rows(sb.from("category_passes").select("*")),
    rows(sb.from("pricing_tiers").select("*")),
  ]);

  const questionsByAssignment = group(questions, (q) => q.assignment_id);
  const videosByCourse = group(videos, (v) => v.course_id);
  const assignmentsByCourse = group(assignments, (a) => a.course_id);
  const purchasesByUser = group(purchases, (p) => p.user_id);
  const passesByUser = group(categoryPasses, (p) => p.user_id);
  const attendeesBySession = group(attendees, (a) => a.session_id);
  const likesByPost = group(likes, (l) => l.post_id);

  const assembledCourses: Course[] = courses.map((c) => ({
    id: c.id, slug: c.slug, title: c.title, description: c.description ?? "", category: c.category,
    instructorName: c.instructor_name ?? "", instructorTitle: c.instructor_title ?? "", instructorBio: c.instructor_bio ?? "",
    instructorInitials: c.instructor_initials ?? "", hashtags: c.hashtags ?? [], tracks: c.tracks ?? [], level: c.level ?? "Beginner",
    rating: Number(c.rating ?? 0), ratingCount: c.rating_count ?? 0, enrolledCount: c.enrolled_count ?? 0,
    purchaseCount: c.purchase_count ?? 0, price: c.price ?? 0, trending: c.trending ?? false, published: c.published ?? false,
    accent: c.accent ?? 0, createdAt: c.created_at,
    videos: (videosByCourse[c.id] ?? []).map(mapVideo).sort((a, b) => a.order - b.order),
    assignments: (assignmentsByCourse[c.id] ?? []).map((a) => ({
      id: a.id, courseId: a.course_id, afterVideoOrder: a.after_video_order, title: a.title,
      questions: (questionsByAssignment[a.id] ?? []).map(mapQuestion),
    })).sort((a, b) => a.afterVideoOrder - b.afterVideoOrder),
  }));

  return {
    users: profiles.map((p) =>
      mapProfile(
        p,
        (purchasesByUser[p.id] ?? []).map((x) => x.course_id),
        (passesByUser[p.id] ?? []).map((x) => x.category as Role),
      ),
    ),
    courses: assembledCourses,
    tracks: tracks.map(mapTrack),
    tips: tips.map(mapTip),
    resources: resources.map(mapResource),
    sessions: sessions.map((s) => mapSession(s, (attendeesBySession[s.id] ?? []).map((x) => x.user_id))),
    community: posts.map((p) => mapPost(p, (likesByPost[p.id] ?? []).map((x) => x.user_id)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    enrollments: enrollments.map(mapEnrollment),
    progress: progress.map(mapProgress),
    submissions: submissions.map(mapSubmission),
    notes: notes.map(mapNote),
    coupons: coupons.map(mapCoupon),
    pricing: pricingRows[0]
      ? { cat1: pricingRows[0].cat1, cat2: pricingRows[0].cat2, cat3: pricingRows[0].cat3 }
      : null,
  };
}

function group<T extends Row>(arr: T[], key: (r: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, r) => {
    const k = key(r);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
}

// ─────────────────────────── auth helpers ───────────────────────────
export async function fetchUser(sb: SupabaseClient, id: string): Promise<User | null> {
  const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [owned, passes] = await Promise.all([
    rows(sb.from("course_purchases").select("course_id").eq("user_id", id)),
    rows(sb.from("category_passes").select("category").eq("user_id", id)),
  ]);
  return mapProfile(
    data,
    owned.map((x) => x.course_id),
    passes.map((x) => x.category as Role),
  );
}

// ─────────────────────────── writes ───────────────────────────
export const updateProfile = (sb: SupabaseClient, id: string, patch: Row) =>
  sb.from("profiles").update(patch).eq("id", id);

export const enroll = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("enrollments").upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" });

export const purchase = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("course_purchases").upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" });

export const completeVideo = (sb: SupabaseClient, p: { userId: string; videoId: string; courseId: string; watchSeconds: number }) =>
  sb.from("video_progress").upsert(
    { user_id: p.userId, video_id: p.videoId, course_id: p.courseId, completed: true, watch_seconds: p.watchSeconds, completed_at: new Date().toISOString() },
    { onConflict: "user_id,video_id" },
  );

export const insertSubmission = (sb: SupabaseClient, s: Submission) =>
  sb.from("submissions").insert({
    id: s.id, user_id: s.userId, assignment_id: s.assignmentId, course_id: s.courseId,
    answers: s.answers, score: s.score, passed: s.passed, feedback: s.feedback,
    attempt_number: s.attemptNumber, submitted_at: s.submittedAt,
  });

export const insertNote = (sb: SupabaseClient, n: Note) =>
  sb.from("user_notes").insert({ id: n.id, user_id: n.userId, video_id: n.videoId, text: n.text, created_at: n.createdAt });
export const deleteNote = (sb: SupabaseClient, id: string) => sb.from("user_notes").delete().eq("id", id);

export const insertPost = (sb: SupabaseClient, p: CommunityPost) =>
  sb.from("community_posts").insert({ id: p.id, user_id: p.userId, user_name: p.userName, user_role: p.userRole, text: p.text, created_at: p.createdAt });
export const updatePost = (sb: SupabaseClient, id: string, text: string) =>
  sb.from("community_posts").update({ text, edited_at: new Date().toISOString() }).eq("id", id);
export const deletePost = (sb: SupabaseClient, id: string) => sb.from("community_posts").delete().eq("id", id);

export const setLike = (sb: SupabaseClient, postId: string, userId: string, liked: boolean) =>
  liked
    ? sb.from("post_likes").upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id" })
    : sb.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);

export const setAttendance = (sb: SupabaseClient, sessionId: string, userId: string, attending: boolean) =>
  attending
    ? sb.from("session_attendees").upsert({ session_id: sessionId, user_id: userId }, { onConflict: "session_id,user_id" })
    : sb.from("session_attendees").delete().eq("session_id", sessionId).eq("user_id", userId);

// ── admin ──
export async function saveCourse(sb: SupabaseClient, c: Course) {
  await sb.from("courses").upsert(courseRow(c));
  await sb.from("videos").delete().eq("course_id", c.id);
  if (c.videos.length)
    await sb.from("videos").insert(c.videos.map((v) => ({
      id: v.id, course_id: c.id, title: v.title, order_index: v.order, duration_seconds: v.durationSeconds,
      mux_playback_id: v.muxPlaybackId, transcript: v.transcript, summary: v.summary, notes_pdf_url: v.notesPdfName, resources: v.resources,
    })));
  await sb.from("assignments").delete().eq("course_id", c.id);
  for (const a of c.assignments) {
    await sb.from("assignments").insert({ id: a.id, course_id: c.id, after_video_order: a.afterVideoOrder, title: a.title });
    if (a.questions.length)
      await sb.from("questions").insert(a.questions.map((q) => ({
        id: q.id, assignment_id: a.id, type: q.type, prompt: q.prompt, options: q.options, correct_answer: q.correctAnswer, explanation: q.explanation,
      })));
  }
}
export const deleteCourse = (sb: SupabaseClient, id: string) => sb.from("courses").delete().eq("id", id);
export const updateCourse = (sb: SupabaseClient, id: string, patch: Row) => sb.from("courses").update(patch).eq("id", id);

export const saveTip = (sb: SupabaseClient, t: DailyTip) =>
  sb.from("daily_tips").upsert({ id: t.id, text: t.text, author: t.author, target_role: t.targetRole, active: t.active });
export const deleteTip = (sb: SupabaseClient, id: string) => sb.from("daily_tips").delete().eq("id", id);

export const addTrack = (sb: SupabaseClient, t: LeadershipTrack) =>
  sb.from("leadership_tracks").upsert({ id: t.id, label: t.label });

export const saveSession = (sb: SupabaseClient, s: LiveSession) =>
  sb.from("live_sessions").upsert({
    id: s.id, title: s.title, course_title: s.courseTitle, instructor_name: s.instructorName, starts_at: s.startsAt,
    duration_mins: s.durationMins, meet_link: s.meetLink, description: s.description, target_role: s.targetRole, capacity: s.capacity,
  });
export const deleteSession = (sb: SupabaseClient, id: string) => sb.from("live_sessions").delete().eq("id", id);

export const setBanned = (sb: SupabaseClient, userId: string, banned: boolean) =>
  sb.from("profiles").update({ banned }).eq("id", userId);
export const deleteUserProfile = (sb: SupabaseClient, userId: string) => sb.from("profiles").delete().eq("id", userId);

export const upsertResource = (sb: SupabaseClient, r: RecommendedResource) =>
  sb.from("recommended_resources").upsert({ id: r.id, title: r.title, type: r.type, author: r.author, blurb: r.blurb, target_role: r.targetRole, accent: r.accent });

export const saveQuestion = (sb: SupabaseClient, assignmentId: string, q: Question) =>
  sb.from("questions").upsert({ id: q.id, assignment_id: assignmentId, type: q.type, prompt: q.prompt, options: q.options, correct_answer: q.correctAnswer, explanation: q.explanation });
export const deleteQuestion = (sb: SupabaseClient, id: string) => sb.from("questions").delete().eq("id", id);

export const saveCoupon = (sb: SupabaseClient, c: Coupon) =>
  sb.from("coupons").upsert({
    code: c.code, discount_percent: c.discountPercent, category: c.category, active: c.active,
    max_redemptions: c.maxRedemptions, redemptions: c.redemptions, expires_at: c.expiresAt, created_at: c.createdAt,
  });
export const deleteCoupon = (sb: SupabaseClient, code: string) => sb.from("coupons").delete().eq("code", code);

export const grantCategoryPass = (sb: SupabaseClient, userId: string, category: Role) =>
  sb.from("category_passes").upsert({ user_id: userId, category }, { onConflict: "user_id,category" });

export const savePricing = (sb: SupabaseClient, t: PricingTiers) =>
  sb.from("pricing_tiers").upsert({ id: 1, cat1: t.cat1, cat2: t.cat2, cat3: t.cat3 });
