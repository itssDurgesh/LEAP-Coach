import type { SupabaseClient } from "@supabase/supabase-js";
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
  LeadershipTrack,
  LiveSession,
  Note,
  Payment,
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

type Row = Record<string, any>;
const rows = async (q: any): Promise<Row[]> => ((await q).data ?? []) as Row[];

// ─────────────────────────── mappers ───────────────────────────
const mapTrack = (r: Row): LeadershipTrack => ({ id: r.id, label: r.label });
const mapTip = (r: Row): DailyTip => ({ id: r.id, text: r.text, author: r.author, targetRole: r.target_role, active: r.active });
const mapResource = (r: Row): RecommendedResource => ({ id: r.id, title: r.title, type: r.type, author: r.author, blurb: r.blurb, targetRole: r.target_role, accent: r.accent });
const mapQuestion = (r: Row): Question => ({ id: r.id, type: r.type, prompt: r.prompt, options: r.options ?? [], correctAnswer: r.correct_answer, explanation: r.explanation });
const mapVideo = (r: Row): Video => ({ id: r.id, courseId: r.course_id, title: r.title, order: r.order_index, durationSeconds: r.duration_seconds, muxPlaybackId: r.mux_playback_id, transcript: r.transcript ?? "", summary: r.summary ?? "", notesPdfName: r.notes_pdf_url ?? undefined, notesPdfUrl: r.notes_file_url ?? null, resources: r.resources ?? [] });
const mapEnrollment = (r: Row): Enrollment => ({ userId: r.user_id, courseId: r.course_id, enrolledAt: r.enrolled_at, completedAt: r.completed_at });
const mapProgress = (r: Row): VideoProgress => ({ userId: r.user_id, videoId: r.video_id, courseId: r.course_id, completed: r.completed, watchSeconds: r.watch_seconds, completedAt: r.completed_at });
const mapNote = (r: Row): Note => ({ id: r.id, userId: r.user_id, videoId: r.video_id, text: r.text, createdAt: r.created_at });
const mapSubmission = (r: Row): Submission => ({ id: r.id, userId: r.user_id, assignmentId: r.assignment_id, courseId: r.course_id, answers: r.answers ?? {}, score: Number(r.score), passed: r.passed, feedback: r.feedback ?? [], attemptNumber: r.attempt_number, submittedAt: r.submitted_at });
// à-la-carte purchase rows (course_purchases) + catalog-pass rows (category_passes)
// carry their own timestamps; we keep both the ownership list AND the date map so
// the 1-year-from-purchase expiry can be computed per entitlement (see lib/access).
type PurchaseRow = { course_id: string; purchased_at?: string | null };
type PassRow = { category: string; granted_at?: string | null };

const mapProfile = (r: Row, purchases: PurchaseRow[] = [], passes: PassRow[] = []): User => ({
  id: r.id, name: r.name ?? "", username: r.username ?? undefined, email: r.email ?? "", role: r.role ?? null, avatarUrl: r.avatar_url,
  age: r.age ?? undefined, gender: r.gender ?? undefined, phone: r.phone ?? undefined, phoneVerified: r.phone_verified ?? false,
  company: r.company ?? undefined, nationality: r.nationality ?? undefined, region: r.region ?? undefined,
  headline: r.headline ?? undefined, bio: r.bio ?? undefined,
  learningCredits: r.learning_credits ?? 0, topicCredits: r.topic_credits ?? {}, subscriptionPlan: r.subscription_plan ?? "none",
  subscriptionValidUntil: r.subscription_valid_until ?? null,
  ownedCourseIds: purchases.map((p) => p.course_id),
  coursePurchasedAt: Object.fromEntries(purchases.filter((p) => p.purchased_at).map((p) => [p.course_id, p.purchased_at as string])),
  ownedCategories: passes.map((p) => p.category as Role),
  categoryPassAt: Object.fromEntries(passes.filter((p) => p.granted_at).map((p) => [p.category as Role, p.granted_at as string])),
  banned: r.banned ?? false,
  isAdmin: r.is_admin ?? false, permissions: r.permissions ?? null, createdAt: r.created_at, lastActiveAt: r.last_active_at,
});
const mapTeamMember = (r: Row): TeamMember => ({
  id: r.id, name: r.name ?? "", title: r.title ?? "", group: r.member_group ?? "mentor", photoUrl: r.photo_url ?? null,
  bio: r.bio ?? "", vision: r.vision ?? null, links: r.links ?? {}, featured: r.featured ?? false,
  order: r.order_index ?? 0, active: r.active ?? true, createdAt: r.created_at,
});
const mapArticle = (r: Row): Article => ({
  id: r.id, title: r.title ?? "", excerpt: r.excerpt ?? "", content: r.content ?? "",
  coverUrl: r.cover_url ?? null, images: r.images ?? [], authorId: r.author_id ?? "", authorName: r.author_name ?? "",
  published: r.published ?? false, archived: r.archived ?? false, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
});
const mapAnnouncement = (r: Row): Announcement => ({
  id: r.id, title: r.title ?? "", body: r.body ?? "", targetRole: r.target_role ?? "all",
  pinned: r.pinned ?? false, published: r.published ?? true, authorId: r.author_id ?? "",
  authorName: r.author_name ?? "", createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
  notifiedAt: r.notified_at ?? null, notifiedUserIds: r.notified_user_ids ?? [],
});
const mapFaq = (r: Row): Faq => ({
  id: r.id, question: r.question ?? "", answer: r.answer ?? "", order: r.order_index ?? 0,
  published: r.published ?? true, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
});
const mapBook = (r: Row): Book => ({
  id: r.id, title: r.title ?? "", author: r.author ?? "", coverUrl: r.cover_url ?? null,
  blurb: r.blurb ?? "", link: r.link ?? null, order: r.order_index ?? 0, active: r.active ?? true,
});
const mapComment = (r: Row, likedBy: string[]): PostComment => ({
  id: r.id, postId: r.post_id, parentId: r.parent_id ?? null, userId: r.user_id, userName: r.user_name,
  userRole: r.user_role, text: r.text, mentions: r.mentions ?? [], createdAt: r.created_at,
  editedAt: r.edited_at ?? undefined, likedBy,
});
const mapNotification = (r: Row): AppNotification => ({
  id: r.id, userId: r.user_id, type: r.type, actorId: r.actor_id, actorName: r.actor_name ?? "",
  videoId: r.video_id ?? null, courseId: r.course_id ?? null,
  postId: r.post_id ?? null, commentId: r.comment_id ?? null, preview: r.preview ?? "", read: r.read ?? false, createdAt: r.created_at,
});
const mapVideoComment = (r: Row, likedBy: string[]): VideoComment => ({
  id: r.id, videoId: r.video_id, courseId: r.course_id, parentId: r.parent_id ?? null, userId: r.user_id,
  userName: r.user_name, userRole: r.user_role, text: r.text, mentions: r.mentions ?? [],
  createdAt: r.created_at, editedAt: r.edited_at ?? undefined, likedBy,
});
const mapSession = (r: Row, attendeeIds: string[]): LiveSession => ({ id: r.id, title: r.title, courseTitle: r.course_title ?? undefined, instructorName: r.instructor_name, startsAt: r.starts_at, durationMins: r.duration_mins, meetLink: r.meet_link, description: r.description ?? "", targetRole: r.target_role, attendeeIds, capacity: r.capacity, notifiedAt: r.notified_at ?? null, notifiedUserIds: r.notified_user_ids ?? [] });
const mapPost = (r: Row, likedBy: string[]): CommunityPost => ({ id: r.id, userId: r.user_id, userName: r.user_name, userRole: r.user_role, text: r.text, createdAt: r.created_at, editedAt: r.edited_at ?? undefined, likedBy });
const mapCoupon = (r: Row): Coupon => ({ code: r.code, discountPercent: r.discount_percent, category: r.category, active: r.active, maxRedemptions: r.max_redemptions ?? null, redemptions: r.redemptions ?? 0, expiresAt: r.expires_at ?? null, createdAt: r.created_at });
const mapPayment = (r: Row): Payment => ({
  id: r.id, userId: r.user_id ?? "", razorpayOrderId: r.razorpay_order_id ?? null, razorpayPaymentId: r.razorpay_payment_id ?? null,
  plan: r.plan ?? null, courseId: r.course_id ?? null, categories: (r.categories ?? []) as Role[], couponCode: r.coupon_code ?? null,
  amountInr: r.amount_inr ?? 0, currency: r.currency ?? "INR", status: r.status ?? "captured", grantStatus: r.grant_status ?? "pending",
  source: r.source ?? "verify", createdAt: r.created_at, refundedAt: r.refunded_at ?? null,
});

// ── course → row ──
const courseRow = (c: Course): Row => ({
  id: c.id, slug: c.slug, title: c.title, description: c.description, category: c.category,
  categories: c.categories ?? [c.category],
  instructor_name: c.instructorName, instructor_title: c.instructorTitle, instructor_bio: c.instructorBio,
  instructor_initials: c.instructorInitials, hashtags: c.hashtags, tracks: c.tracks, level: c.level,
  rating: c.rating, rating_count: c.ratingCount, enrolled_count: c.enrolledCount, purchase_count: c.purchaseCount,
  price: c.price, trending: c.trending, published: c.published, accent: c.accent,
  thumbnail_url: c.thumbnailUrl ?? null, workbook_name: c.workbookName ?? null, workbook_url: c.workbookUrl ?? null,
  access_duration_days: c.accessDurationDays ?? null,
  pending_approval: c.pendingApproval ?? false, submitted_by: c.submittedBy ?? null,
  created_at: c.createdAt,
});

export interface LoadedData {
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
  privacyPolicy: string | null;
  enrollments: Enrollment[];
  progress: VideoProgress[];
  submissions: Submission[];
  notes: Note[];
  coupons: Coupon[];
  payments: Payment[];
  pricing: PricingTiers | null;
  siteContent: SiteContent | null;
}

/** Fetch + assemble the entire app state from Supabase (RLS scopes per-user rows). */
// The whole course tree in one PostgREST query (courses + videos + assignments + questions).
const COURSE_SELECT = "*, videos(*), assignments(*, questions(*))";

/** Map one embedded `courses` row (with its videos/assignments/questions) to a Course. */
function assembleCourse(c: Row): Course {
  return {
    id: c.id, slug: c.slug, title: c.title, description: c.description ?? "", category: c.category,
    instructorName: c.instructor_name ?? "", instructorTitle: c.instructor_title ?? "", instructorBio: c.instructor_bio ?? "",
    instructorInitials: c.instructor_initials ?? "", hashtags: c.hashtags ?? [], tracks: c.tracks ?? [], level: c.level ?? "Beginner",
    rating: Number(c.rating ?? 0), ratingCount: c.rating_count ?? 0, enrolledCount: c.enrolled_count ?? 0,
    purchaseCount: c.purchase_count ?? 0, price: c.price ?? 0, trending: c.trending ?? false, published: c.published ?? false,
    accent: c.accent ?? 0,
    categories: c.categories ?? [c.category],
    thumbnailUrl: c.thumbnail_url ?? null, workbookName: c.workbook_name ?? null, workbookUrl: c.workbook_url ?? null,
    accessDurationDays: c.access_duration_days ?? null,
    pendingApproval: c.pending_approval ?? false, submittedBy: c.submitted_by ?? null,
    createdAt: c.created_at,
    videos: ((c.videos ?? []) as Row[]).map(mapVideo).sort((a, b) => a.order - b.order),
    assignments: ((c.assignments ?? []) as Row[]).map((a) => ({
      id: a.id, courseId: a.course_id, afterVideoOrder: a.after_video_order, title: a.title,
      questions: ((a.questions ?? []) as Row[]).map(mapQuestion),
    })).sort((a, b) => a.afterVideoOrder - b.afterVideoOrder),
  };
}

/**
 * Re-read just the course tree. Used by the realtime subscription so a publish or
 * approval lands in every open session without a full `loadAll` or a page reload.
 */
export async function loadCourses(sb: SupabaseClient): Promise<Course[]> {
  return (await rows(sb.from("courses").select(COURSE_SELECT))).map(assembleCourse);
}

export async function loadAll(sb: SupabaseClient): Promise<LoadedData> {
  const [
    // videos/assignments/questions are embedded in `courses` now → their slots are empty.
    profiles, purchases, tracks, courses, , , ,
    tips, resources, sessions, attendees, enrollments, progress, submissions, notes, posts, likes, coupons,
    categoryPasses, pricingRows, comments, commentLikes, notifications, teamMembers, books, siteRows, articleRows, paymentRows,
    videoCommentRows, videoCommentLikeRows, announcementRows, faqRows, sitePageRows,
  ] = await Promise.all([
    rows(sb.from("profiles").select("*")),
    rows(sb.from("course_purchases").select("*")),
    rows(sb.from("leadership_tracks").select("*")),
    // Whole course tree in ONE query via PostgREST embedding (was 4 separate fetches:
    // courses + videos + assignments + questions). videos/assignments/questions below
    // are kept as empty placeholders so the positional destructure stays aligned.
    rows(sb.from("courses").select(COURSE_SELECT)),
    Promise.resolve([] as Row[]),
    Promise.resolve([] as Row[]),
    Promise.resolve([] as Row[]),
    rows(sb.from("daily_tips").select("*")),
    rows(sb.from("recommended_resources").select("*")),
    rows(sb.from("live_sessions").select("*")),
    rows(sb.from("session_attendees").select("*")),
    rows(sb.from("enrollments").select("*")),
    rows(sb.from("video_progress").select("*")),
    rows(sb.from("submissions").select("*")),
    rows(sb.from("user_notes").select("*")),
    // Global Discussion board was removed — skip these reads (saves round-trips + payload).
    Promise.resolve([] as Row[]),
    Promise.resolve([] as Row[]),
    rows(sb.from("coupons").select("*")),
    rows(sb.from("category_passes").select("*")),
    rows(sb.from("pricing_tiers").select("*")),
    // Global Discussion board removed — skip post_comments + comment_likes reads too.
    Promise.resolve([] as Row[]),
    Promise.resolve([] as Row[]),
    rows(sb.from("notifications").select("*")),
    rows(sb.from("team_members").select("*")),
    rows(sb.from("books").select("*")),
    rows(sb.from("site_content").select("*")),
    rows(sb.from("articles").select("*")),
    rows(sb.from("payments").select("*")),
    rows(sb.from("video_comments").select("*")),
    rows(sb.from("video_comment_likes").select("*")),
    rows(sb.from("announcements").select("*")),
    rows(sb.from("faqs").select("*")),
    rows(sb.from("site_pages").select("*")),
  ]);

  const purchasesByUser = group(purchases, (p) => p.user_id);
  const passesByUser = group(categoryPasses, (p) => p.user_id);
  const attendeesBySession = group(attendees, (a) => a.session_id);
  const likesByPost = group(likes, (l) => l.post_id);
  const likesByComment = group(commentLikes, (l) => l.comment_id);
  const likesByVideoComment = group(videoCommentLikeRows, (l) => l.comment_id);

  const assembledCourses: Course[] = courses.map(assembleCourse);

  return {
    users: profiles.map((p) =>
      mapProfile(
        p,
        (purchasesByUser[p.id] ?? []) as PurchaseRow[],
        (passesByUser[p.id] ?? []) as PassRow[],
      ),
    ),
    courses: assembledCourses,
    tracks: tracks.map(mapTrack),
    tips: tips.map(mapTip),
    resources: resources.map(mapResource),
    sessions: sessions.map((s) => mapSession(s, (attendeesBySession[s.id] ?? []).map((x) => x.user_id))),
    community: posts.map((p) => mapPost(p, (likesByPost[p.id] ?? []).map((x) => x.user_id)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    comments: comments
      .map((c) => mapComment(c, (likesByComment[c.id] ?? []).map((x) => x.user_id)))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    videoComments: videoCommentRows
      .map((c) => mapVideoComment(c, (likesByVideoComment[c.id] ?? []).map((x) => x.user_id)))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    notifications: notifications.map(mapNotification).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    teamMembers: teamMembers.map(mapTeamMember).sort((a, b) => a.order - b.order),
    books: books.map(mapBook).sort((a, b) => a.order - b.order),
    articles: articleRows.map(mapArticle).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    announcements: announcementRows.map(mapAnnouncement).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    faqs: faqRows.map(mapFaq).sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt < b.createdAt ? -1 : 1)),
    privacyPolicy: (sitePageRows[0]?.privacy_policy as string) ?? null,
    enrollments: enrollments.map(mapEnrollment),
    progress: progress.map(mapProgress),
    submissions: submissions.map(mapSubmission),
    notes: notes.map(mapNote),
    coupons: coupons.map(mapCoupon),
    payments: paymentRows.map(mapPayment).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    pricing: pricingRows[0]
      ? {
          cat1: pricingRows[0].cat1,
          cat2: pricingRows[0].cat2,
          cat3: pricingRows[0].cat3,
          perTopicFrom: pricingRows[0].per_topic_from ?? 999,
          showUpgradeInfo: pricingRows[0].show_upgrade_info ?? true,
        }
      : null,
    siteContent: (siteRows[0]?.content as SiteContent) ?? null,
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
    rows(sb.from("course_purchases").select("course_id, purchased_at").eq("user_id", id)),
    rows(sb.from("category_passes").select("category, granted_at").eq("user_id", id)),
  ]);
  return mapProfile(data, owned as PurchaseRow[], passes as PassRow[]);
}

// ─────────────────────────── writes ───────────────────────────
// Provision a profile row keyed by the Clerk user id on first sign-in (the old
// auth.users → handle_new_user trigger is gone). No-op if the row already exists.
export const ensureProfile = (sb: SupabaseClient, id: string, email: string, name: string) =>
  sb.from("profiles").upsert({ id, email, name }, { onConflict: "id", ignoreDuplicates: true });

export const updateProfile = (sb: SupabaseClient, id: string, patch: Row) =>
  sb.from("profiles").update(patch).eq("id", id);

export const enroll = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("enrollments").upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id" });

// Stamp purchased_at on every (re)purchase so re-buying an expired topic restarts
// its 1-year access window (the DB default only applies on first insert).
export const purchase = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("course_purchases").upsert(
    { user_id: userId, course_id: courseId, purchased_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" },
  );

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
      mux_playback_id: v.muxPlaybackId, transcript: v.transcript, summary: v.summary,
      notes_pdf_url: v.notesPdfName, notes_file_url: v.notesPdfUrl ?? null, resources: v.resources,
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

// Stamp granted_at on every (re)purchase so re-buying an expired catalog restarts
// its 1-year access window (the DB default only applies on first insert).
export const grantCategoryPass = (sb: SupabaseClient, userId: string, category: Role) =>
  sb.from("category_passes").upsert(
    { user_id: userId, category, granted_at: new Date().toISOString() },
    { onConflict: "user_id,category" },
  );

export const savePricing = (sb: SupabaseClient, t: PricingTiers) =>
  sb.from("pricing_tiers").upsert({ id: 1, cat1: t.cat1, cat2: t.cat2, cat3: t.cat3, per_topic_from: t.perTopicFrom });

// Written SEPARATELY (best-effort) so this optional cosmetic flag can never block the
// core price save when the show_upgrade_info column hasn't been migrated yet.
export const saveUpgradeInfoFlag = (sb: SupabaseClient, show: boolean) =>
  sb.from("pricing_tiers").update({ show_upgrade_info: show }).eq("id", 1);

// ── site content (homepage CMS singleton) ──
export const saveSiteContent = (sb: SupabaseClient, content: SiteContent) =>
  sb.from("site_content").upsert({ id: 1, content, updated_at: new Date().toISOString() });

// ── team / mentors ──
export const saveTeamMember = (sb: SupabaseClient, m: TeamMember) =>
  sb.from("team_members").upsert({
    id: m.id, name: m.name, title: m.title, member_group: m.group, photo_url: m.photoUrl ?? null, bio: m.bio,
    vision: m.vision ?? null, links: m.links ?? {}, featured: m.featured, order_index: m.order, active: m.active,
    created_at: m.createdAt,
  });
export const deleteTeamMember = (sb: SupabaseClient, id: string) => sb.from("team_members").delete().eq("id", id);

// ── books ──
export const saveBook = (sb: SupabaseClient, b: Book) =>
  sb.from("books").upsert({
    id: b.id, title: b.title, author: b.author, cover_url: b.coverUrl ?? null, blurb: b.blurb,
    link: b.link ?? null, order_index: b.order, active: b.active,
  });
export const deleteBook = (sb: SupabaseClient, id: string) => sb.from("books").delete().eq("id", id);

// ── articles ──
export const saveArticle = (sb: SupabaseClient, a: Article) =>
  sb.from("articles").upsert({
    id: a.id, title: a.title, excerpt: a.excerpt, content: a.content, cover_url: a.coverUrl ?? null,
    images: a.images ?? [], author_id: a.authorId || null, author_name: a.authorName, published: a.published,
    created_at: a.createdAt, updated_at: a.updatedAt,
  });

// Written SEPARATELY (best-effort) so a not-yet-migrated `archived` column can't block article saves.
export const setArticleArchived = (sb: SupabaseClient, id: string, archived: boolean) =>
  sb.from("articles").update({ archived }).eq("id", id);
export const deleteArticle = (sb: SupabaseClient, id: string) => sb.from("articles").delete().eq("id", id);

// ── announcements ──
export const saveAnnouncement = (sb: SupabaseClient, a: Announcement) =>
  sb.from("announcements").upsert({
    id: a.id, title: a.title, body: a.body, target_role: a.targetRole, pinned: a.pinned,
    published: a.published, author_id: a.authorId || null, author_name: a.authorName,
    created_at: a.createdAt, updated_at: a.updatedAt,
  });
export const deleteAnnouncement = (sb: SupabaseClient, id: string) => sb.from("announcements").delete().eq("id", id);

// ── faqs ──
export const saveFaq = (sb: SupabaseClient, f: Faq) =>
  sb.from("faqs").upsert({
    id: f.id, question: f.question, answer: f.answer, order_index: f.order,
    published: f.published, created_at: f.createdAt, updated_at: f.updatedAt,
  });
export const deleteFaq = (sb: SupabaseClient, id: string) => sb.from("faqs").delete().eq("id", id);

// ── privacy policy (site_pages singleton, id = 1) ──
export const savePrivacyPolicy = (sb: SupabaseClient, text: string) =>
  sb.from("site_pages").upsert({ id: 1, privacy_policy: text, updated_at: new Date().toISOString() });

// ── enrollment renew: reset the access timer (course auto-expiry) ──
export const reEnroll = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("enrollments").upsert(
    { user_id: userId, course_id: courseId, enrolled_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" },
  );

/** All payments (admins read every row via RLS). Used by the live payments dashboard. */
export async function fetchPayments(sb: SupabaseClient): Promise<Payment[]> {
  const { data } = await sb.from("payments").select("*").order("created_at", { ascending: false });
  return ((data ?? []) as Row[]).map(mapPayment);
}

// ── discussion comments ──
export const insertComment = (sb: SupabaseClient, c: PostComment) =>
  sb.from("post_comments").insert({
    id: c.id, post_id: c.postId, parent_id: c.parentId, user_id: c.userId, user_name: c.userName,
    user_role: c.userRole, text: c.text, mentions: c.mentions, created_at: c.createdAt,
  });
export const updateComment = (sb: SupabaseClient, id: string, text: string) =>
  sb.from("post_comments").update({ text, edited_at: new Date().toISOString() }).eq("id", id);
export const deleteComment = (sb: SupabaseClient, id: string) => sb.from("post_comments").delete().eq("id", id);
export const setCommentLike = (sb: SupabaseClient, commentId: string, userId: string, liked: boolean) =>
  liked
    ? sb.from("comment_likes").upsert({ comment_id: commentId, user_id: userId }, { onConflict: "comment_id,user_id" })
    : sb.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);

// ── per-video discussion comments ──
export const insertVideoComment = (sb: SupabaseClient, c: VideoComment) =>
  sb.from("video_comments").insert({
    id: c.id, video_id: c.videoId, course_id: c.courseId, parent_id: c.parentId, user_id: c.userId,
    user_name: c.userName, user_role: c.userRole, text: c.text, mentions: c.mentions, created_at: c.createdAt,
  });
export const updateVideoComment = (sb: SupabaseClient, id: string, text: string) =>
  sb.from("video_comments").update({ text, edited_at: new Date().toISOString() }).eq("id", id);
export const deleteVideoComment = (sb: SupabaseClient, id: string) => sb.from("video_comments").delete().eq("id", id);
export const setVideoCommentLike = (sb: SupabaseClient, commentId: string, userId: string, liked: boolean) =>
  liked
    ? sb.from("video_comment_likes").upsert({ comment_id: commentId, user_id: userId }, { onConflict: "comment_id,user_id" })
    : sb.from("video_comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);

// ── notifications ──
export const insertNotification = (sb: SupabaseClient, n: AppNotification) =>
  sb.from("notifications").insert({
    id: n.id, user_id: n.userId, type: n.type, actor_id: n.actorId, actor_name: n.actorName,
    video_id: n.videoId ?? null, course_id: n.courseId ?? null,
    post_id: n.postId ?? null, comment_id: n.commentId ?? null, preview: n.preview, read: n.read, created_at: n.createdAt,
  });
export const markNotificationRead = (sb: SupabaseClient, id: string) =>
  sb.from("notifications").update({ read: true }).eq("id", id);
export const markAllNotificationsRead = (sb: SupabaseClient, userId: string) =>
  sb.from("notifications").update({ read: true }).eq("user_id", userId);

/** Just the signed-in user's notifications — used by the bell's light polling. */
export async function fetchNotifications(sb: SupabaseClient, userId: string): Promise<AppNotification[]> {
  const { data } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as Row[]).map(mapNotification);
}
