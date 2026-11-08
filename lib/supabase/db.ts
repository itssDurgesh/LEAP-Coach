import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Announcement,
  AppNotification,
  Article,
  Book,
  CommunityPost,
  Coupon,
  Course,
  CourseRating,
  CreditEvent,
  DailyIdea,
  DailyTip,
  EarnedStamp,
  Enrollment,
  Faq,
  IdeaResponse,
  LeaderboardRow,
  LeadershipTrack,
  LiveSession,
  Note,
  Payment,
  PostComment,
  PricingTiers,
  ProfileStats,
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
const rows = async (q: any): Promise<Row[]> => {
  const { data, error } = await q;
  // A table the database does not have yet (a migration not run) reads as empty
  // instead of breaking the whole load; the console says which.
  if (error) console.error("[supabase] read failed:", error.message);
  return (data ?? []) as Row[];
};

// ─────────────────────────── mappers ───────────────────────────
const mapTrack = (r: Row): LeadershipTrack => ({ id: r.id, label: r.label });
const mapTip = (r: Row): DailyTip => ({ id: r.id, text: r.text, author: r.author, targetRole: r.target_role, active: r.active });
const mapResource = (r: Row): RecommendedResource => ({ id: r.id, title: r.title, type: r.type, author: r.author, blurb: r.blurb, targetRole: r.target_role, accent: r.accent });
const mapQuestion = (r: Row): Question => ({ id: r.id, type: r.type, prompt: r.prompt, options: r.options ?? [], correctAnswer: r.correct_answer, explanation: r.explanation });
// `transcript` is undefined when the read left it out (see VIDEO_COLS): "not loaded", not "empty".
const mapVideo = (r: Row): Video => ({ id: r.id, courseId: r.course_id, title: r.title, order: r.order_index, durationSeconds: r.duration_seconds, muxPlaybackId: r.mux_playback_id, audioUrl: r.audio_url ?? null, audioName: r.audio_name ?? null, transcript: r.transcript === undefined ? undefined : (r.transcript ?? ""), summary: r.summary ?? "", notesPdfName: r.notes_pdf_url || undefined, notesPdfUrl: r.notes_file_url === undefined ? undefined : (r.notes_file_url ?? null), resources: r.resources ?? [] });
const mapCourseRating = (r: Row): CourseRating => ({ id: r.id, userId: r.user_id, courseId: r.course_id, stars: r.stars, review: r.review ?? null, createdAt: r.created_at, updatedAt: r.updated_at ?? null });
const mapEnrollment = (r: Row): Enrollment => ({ userId: r.user_id, courseId: r.course_id, enrolledAt: r.enrolled_at, completedAt: r.completed_at });
const mapProgress = (r: Row): VideoProgress => ({ userId: r.user_id, videoId: r.video_id, courseId: r.course_id, completed: !!r.completed, watchSeconds: r.watch_seconds ?? 0, completedAt: r.completed_at ?? null, positionSeconds: r.position_seconds ?? 0, lastWatchedAt: r.last_watched_at ?? null });
const mapNote = (r: Row): Note => ({ id: r.id, userId: r.user_id, videoId: r.video_id, text: r.text, createdAt: r.created_at });
const mapSubmission = (r: Row): Submission => ({ id: r.id, userId: r.user_id, assignmentId: r.assignment_id, courseId: r.course_id, answers: r.answers ?? {}, score: Number(r.score), passed: r.passed, feedback: r.feedback ?? [], attemptNumber: r.attempt_number, submittedAt: r.submitted_at });
const mapIdea = (r: Row): DailyIdea => ({
  id: r.id, title: r.title ?? "", body: r.body ?? "", question: r.question ?? "",
  options: Array.isArray(r.options) ? r.options.map((o: Row) => ({ text: o?.text ?? "", good: !!o?.good, feedback: o?.feedback ?? "" })) : [],
  trackId: r.track_id ?? null, audience: r.audience ?? "all", showOn: r.show_on ?? null, active: r.active ?? true,
  createdBy: r.created_by ?? null, createdAt: r.created_at, updatedAt: r.updated_at ?? r.created_at,
});
const mapIdeaResponse = (r: Row): IdeaResponse => ({ userId: r.user_id, ideaId: r.idea_id, optionIndex: r.option_index, createdAt: r.created_at });
const mapCreditEvent = (r: Row): CreditEvent => ({ id: String(r.id), userId: r.user_id, courseId: r.course_id ?? null, amount: r.amount ?? 0, totalAfter: r.total_after ?? 0, createdAt: r.created_at });
const mapStamp = (r: Row): EarnedStamp => ({ userId: r.user_id, stampId: r.stamp_id, earnedAt: r.earned_at });
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
  id: r.id, name: r.name ?? "", title: r.title ?? "", group: r.member_group ?? "mentor", photoUrl: r.photo_url === undefined ? undefined : (r.photo_url ?? null),
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
  // rating / rating_count / enrolled_count / purchase_count are NOT written here: the
  // editor's copy can be minutes old, and saving a topic used to put those stale
  // numbers back over ratings that learners had submitted in the meantime.
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
  courseRatings: CourseRating[];
  coupons: Coupon[];
  payments: Payment[];
  pricing: PricingTiers | null;
  siteContent: SiteContent | null;
  ideas: DailyIdea[];
  ideaResponses: IdeaResponse[];
  creditEvents: CreditEvent[];
  stamps: EarnedStamp[];
}

// Everything a video row holds EXCEPT the two heavy columns:
//  - transcript: the full text of every session of every topic was most of the
//    courses payload; only the lesson page and the editor use it, so it is
//    fetched for one video (fetchTranscript) or one topic (fetchCourseFull).
//  - notes_file_url: the uploaded class-notes file, a base64 data URL on older
//    rows; fetched for one video on demand (fetchVideoNotesUrl).
const VIDEO_COLS = "id,course_id,title,order_index,duration_seconds,mux_playback_id,summary,notes_pdf_url,resources";

/** What others may see of a profile: no email, phone, age, plan or permissions. */
export const PUBLIC_PROFILE_COLS =
  "id,name,username,avatar_url,role,headline,bio,company,region,nationality,learning_credits,is_admin,created_at,last_active_at";

/**
 * The course tree in ONE query (PostgREST embedding). audio_url / audio_name
 * arrive with the 2026-10-09 migration; on a database that has not run it yet the
 * first select errors, so read without them rather than leave every page with no
 * topics.
 */
async function courseRows(sb: SupabaseClient, videoCols = VIDEO_COLS, courseId?: string): Promise<Row[]> {
  const select = (cols: string) => {
    const q = sb.from("courses").select(`*, videos(${cols}), assignments(*, questions(*))`);
    return courseId ? q.eq("id", courseId) : q;
  };
  const full = await select(`${videoCols},audio_url,audio_name`);
  if (!full.error) return (full.data ?? []) as Row[];
  console.error("[supabase] courses: reading without audio columns (run the audio-sessions migration)", full.error.message);
  return rows(select(videoCols));
}

function assembleCourse(c: Row): Course {
  return {
    id: c.id, slug: c.slug, title: c.title, description: c.description ?? "", category: c.category,
    instructorName: c.instructor_name ?? "", instructorTitle: c.instructor_title ?? "", instructorBio: c.instructor_bio ?? "",
    instructorInitials: c.instructor_initials ?? "", hashtags: c.hashtags ?? [], tracks: c.tracks ?? [], level: c.level ?? "Beginner",
    rating: Number(c.rating ?? 0), ratingCount: c.rating_count ?? 0, enrolledCount: c.enrolled_count ?? 0,
    purchaseCount: c.purchase_count ?? 0, price: c.price ?? 0, trending: c.trending ?? false, published: c.published ?? false,
    accent: c.accent ?? 0,
    categories: c.categories ?? [c.category],
    thumbnailUrl: c.thumbnail_url ?? null, videoThumbnailUrl: c.video_thumbnail_url ?? null,
    workbookName: c.workbook_name ?? null, workbookUrl: c.workbook_url ?? null,
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

function group<T extends Row>(arr: T[], key: (r: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, r) => {
    const k = key(r);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
}

function profilesWithOwnership(profiles: Row[], purchases: Row[], passes: Row[]): User[] {
  const purchasesByUser = group(purchases, (p) => p.user_id);
  const passesByUser = group(passes, (p) => p.user_id);
  return profiles.map((p) =>
    mapProfile(p, (purchasesByUser[p.id] ?? []) as PurchaseRow[], (passesByUser[p.id] ?? []) as PassRow[]),
  );
}

// ─────────────────────────── page loads ───────────────────────────
// What used to be one loadAll() of ~30 whole tables for everyone (every profile,
// every comment, every learner's progress for an admin, every transcript) is now
// split by who is looking:
//   loadPublic  — the marketing pages' content; all a signed-out visitor loads.
//   loadShared  — content every signed-in person sees, plus their own bell.
//   loadOwn     — a learner's own rows (filtered by user id, which also lets
//                 Postgres use the per-user indexes).
//   loadAdmin   — what the admin screens need across all learners, with the
//                 heavy columns (answers, feedback) left out.
// Other people's profiles, a video's comments and transcripts are fetched on
// demand by the screens that show them.

export type PublicData = Pick<LoadedData, "courses" | "tracks" | "faqs" | "books" | "teamMembers" | "privacyPolicy" | "pricing" | "siteContent">;

export async function loadPublic(sb: SupabaseClient): Promise<PublicData> {
  const [courses, tracks, faqRows, books, teamMembers, siteRows, sitePageRows, pricingRows] = await Promise.all([
    courseRows(sb),
    rows(sb.from("leadership_tracks").select("id,label")),
    rows(sb.from("faqs").select("*")),
    rows(sb.from("books").select("*")),
    // photo_url excluded: on this project four base64 portraits total 2.4MB, and
    // team photos only appear on /team and the landing mentors strip. Fetched there on demand.
    rows(sb.from("team_members").select("id,name,title,member_group,bio,vision,links,featured,order_index,active,created_at")),
    rows(sb.from("site_content").select("content").eq("id", 1)),
    rows(sb.from("site_pages").select("privacy_policy").eq("id", 1)),
    rows(sb.from("pricing_tiers").select("*").eq("id", 1)),
  ]);
  return {
    courses: courses.map(assembleCourse),
    tracks: tracks.map(mapTrack),
    faqs: faqRows.map(mapFaq).sort((a, b) => (a.order !== b.order ? a.order - b.order : a.createdAt < b.createdAt ? -1 : 1)),
    books: books.map(mapBook).sort((a, b) => a.order - b.order),
    teamMembers: teamMembers.map(mapTeamMember).sort((a, b) => a.order - b.order),
    siteContent: (siteRows[0]?.content as SiteContent) ?? null,
    privacyPolicy: (sitePageRows[0]?.privacy_policy as string) ?? null,
    pricing: pricingRows[0]
      ? {
          cat1: pricingRows[0].cat1,
          cat2: pricingRows[0].cat2,
          cat3: pricingRows[0].cat3,
          perTopicFrom: pricingRows[0].per_topic_from ?? 999,
          showUpgradeInfo: pricingRows[0].show_upgrade_info ?? true,
        }
      : null,
  };
}

export type SharedData = Pick<LoadedData, "tips" | "resources" | "sessions" | "announcements" | "articles" | "notifications">;

export async function loadShared(sb: SupabaseClient, userId: string): Promise<SharedData> {
  const [tips, resources, sessions, attendees, announcementRows, articleRows, notifications] = await Promise.all([
    rows(sb.from("daily_tips").select("*")),
    rows(sb.from("recommended_resources").select("*")),
    rows(sb.from("live_sessions").select("*")),
    rows(sb.from("session_attendees").select("session_id,user_id")),
    rows(sb.from("announcements").select("*")),
    rows(sb.from("articles").select("*")),
    // Own notifications only. An admin's RLS allows reading everyone's, and the
    // old load did exactly that.
    rows(sb.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100)),
  ]);
  const attendeesBySession = group(attendees, (a) => a.session_id);
  return {
    tips: tips.map(mapTip),
    resources: resources.map(mapResource),
    sessions: sessions.map((s) => mapSession(s, (attendeesBySession[s.id] ?? []).map((x) => x.user_id))),
    announcements: announcementRows.map(mapAnnouncement).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    articles: articleRows.map(mapArticle).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    notifications: notifications.map(mapNotification),
  };
}

export type OwnData = Pick<
  LoadedData,
  "enrollments" | "progress" | "submissions" | "notes" | "courseRatings" | "payments" | "creditEvents" | "stamps" | "ideaResponses"
>;

export async function loadOwn(sb: SupabaseClient, userId: string): Promise<OwnData> {
  const [enrollments, progress, submissions, notes, ratings, paymentRows, creditRows, stampRows, responseRows] = await Promise.all([
    rows(sb.from("enrollments").select("user_id,course_id,enrolled_at,completed_at").eq("user_id", userId)),
    rows(sb.from("video_progress").select("*").eq("user_id", userId)),
    rows(sb.from("submissions").select("*").eq("user_id", userId)),
    rows(sb.from("user_notes").select("*").eq("user_id", userId)),
    rows(sb.from("course_ratings").select("*").eq("user_id", userId)),
    rows(sb.from("payments").select("*").eq("user_id", userId).order("created_at", { ascending: false })),
    rows(sb.from("credit_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)),
    rows(sb.from("user_stamps").select("*").eq("user_id", userId)),
    rows(sb.from("idea_responses").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(120)),
  ]);
  return {
    enrollments: enrollments.map(mapEnrollment),
    progress: progress.map(mapProgress),
    submissions: submissions.map(mapSubmission),
    notes: notes.map(mapNote),
    courseRatings: ratings.map(mapCourseRating),
    payments: paymentRows.map(mapPayment),
    creditEvents: creditRows.map(mapCreditEvent),
    stamps: stampRows.map(mapStamp),
    ideaResponses: responseRows.map(mapIdeaResponse),
  };
}

export type AdminData = Pick<
  LoadedData,
  "users" | "enrollments" | "progress" | "submissions" | "payments" | "coupons" | "ideas"
>;

export async function loadAdmin(sb: SupabaseClient): Promise<AdminData> {
  const [profiles, purchases, passes, enrollments, progress, submissions, paymentRows, coupons, ideaRows] = await Promise.all([
    rows(sb.from("profiles").select("*")),
    rows(sb.from("course_purchases").select("user_id,course_id,purchased_at")),
    rows(sb.from("category_passes").select("user_id,category,granted_at")),
    rows(sb.from("enrollments").select("user_id,course_id,enrolled_at,completed_at")),
    // The admin screens count completions; they never need positions or watch time.
    rows(sb.from("video_progress").select("user_id,video_id,course_id,completed,completed_at")),
    // Scores only: every learner's answers and per-question feedback were the bulk
    // of this table and no admin screen shows them.
    rows(sb.from("submissions").select("id,user_id,assignment_id,course_id,score,passed,attempt_number,submitted_at")),
    rows(sb.from("payments").select("*").order("created_at", { ascending: false })),
    rows(sb.from("coupons").select("*")),
    rows(sb.from("daily_ideas").select("*")),
  ]);
  return {
    users: profilesWithOwnership(profiles, purchases, passes),
    enrollments: enrollments.map(mapEnrollment),
    progress: progress.map(mapProgress),
    submissions: submissions.map(mapSubmission),
    payments: paymentRows.map(mapPayment),
    coupons: coupons.map(mapCoupon),
    ideas: ideaRows.map(mapIdea),
  };
}

// ─────────────────────────── on-demand reads ───────────────────────────
/** One video's transcript (kept out of the bulk load). */
export async function fetchTranscript(sb: SupabaseClient, videoId: string): Promise<string | null> {
  const { data, error } = await sb.from("videos").select("transcript").eq("id", videoId).maybeSingle();
  if (error) {
    console.error("[supabase] transcript", error.message);
    return null;
  }
  return (data?.transcript as string | null) ?? "";
}

/** One topic with every transcript, for the editor (which saves them back). */
export async function fetchCourseFull(sb: SupabaseClient, courseId: string): Promise<Course | null> {
  const found = await courseRows(sb, `${VIDEO_COLS},transcript`, courseId);
  return found[0] ? assembleCourse(found[0]) : null;
}

/** The discussion under one video, with its likes. */
export async function fetchVideoComments(sb: SupabaseClient, videoId: string): Promise<VideoComment[]> {
  const comments = await rows(sb.from("video_comments").select("*").eq("video_id", videoId).order("created_at", { ascending: true }));
  if (!comments.length) return [];
  const likes = await rows(
    sb.from("video_comment_likes").select("comment_id,user_id").in("comment_id", comments.map((c) => c.id)),
  );
  const likesBy = group(likes, (l) => l.comment_id);
  return comments.map((c) => mapVideoComment(c, (likesBy[c.id] ?? []).map((x) => x.user_id)));
}

/** Public profiles by id (comment authors, people mentioned, article authors). */
export async function fetchProfiles(sb: SupabaseClient, ids: string[]): Promise<User[]> {
  if (!ids.length) return [];
  const found = await rows(sb.from("profiles").select(PUBLIC_PROFILE_COLS).in("id", ids.slice(0, 200)));
  return found.map((r) => mapProfile(r));
}

/** One public profile by id or @handle (the /u/[id] route accepts both). */
export async function fetchProfileByHandle(sb: SupabaseClient, idOrHandle: string): Promise<User | null> {
  const byId = await rows(sb.from("profiles").select(PUBLIC_PROFILE_COLS).eq("id", idOrHandle).limit(1));
  if (byId[0]) return mapProfile(byId[0]);
  const byHandle = await rows(sb.from("profiles").select(PUBLIC_PROFILE_COLS).ilike("username", idOrHandle.replace(/[%_\\]/g, (c) => `\\${c}`)).limit(1));
  return byHandle[0] ? mapProfile(byHandle[0]) : null;
}

/** People to suggest after "@": by handle or name, at most `limit`. */
export async function searchProfiles(sb: SupabaseClient, query: string, limit = 8): Promise<User[]> {
  const q = query.trim().replace(/[%_\\,().*:"]/g, "");
  let req = sb.from("profiles").select(PUBLIC_PROFILE_COLS).eq("banned", false).not("username", "is", null);
  // `*` is PostgREST's wildcard inside an or() filter (it becomes % in SQL).
  if (q) req = req.or(`username.ilike.${q}*,name.ilike.*${q}*`);
  const found = await rows(req.order("username").limit(limit));
  return found.map((r) => mapProfile(r));
}

/** Handles already taken that start with `base`: enough to make a new one unique. */
export async function takenUsernames(sb: SupabaseClient, base: string): Promise<Set<string>> {
  const b = base.replace(/[%_\\]/g, (c) => `\\${c}`);
  const found = await rows(sb.from("profiles").select("username").ilike("username", `${b}%`).limit(1000));
  return new Set(found.map((r) => String(r.username ?? "").toLowerCase()).filter(Boolean));
}

/** Whether someone other than `selfId` already has this handle. */
export async function isUsernameTaken(sb: SupabaseClient, handle: string, selfId: string): Promise<boolean> {
  const h = handle.replace(/[%_\\]/g, (c) => `\\${c}`);
  const found = await rows(sb.from("profiles").select("id").ilike("username", h).neq("id", selfId).limit(1));
  return found.length > 0;
}

/** Comment, video and topic counts and the current streak for a profile page. */
export async function fetchProfileStats(sb: SupabaseClient, userId: string): Promise<ProfileStats | null> {
  const { data, error } = await sb.rpc("public_profile_stats", { p_user: userId });
  if (error) {
    console.error("[supabase] public_profile_stats", error.message);
    return null;
  }
  const r = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  if (!r) return null;
  return { comments: r.comments ?? 0, videosCompleted: r.videos_completed ?? 0, topicsCompleted: r.topics_completed ?? 0, currentStreak: r.current_streak ?? 0 };
}

/** Stamps the database has awarded someone. */
export async function fetchStamps(sb: SupabaseClient, userId: string): Promise<EarnedStamp[]> {
  return (await rows(sb.from("user_stamps").select("*").eq("user_id", userId))).map(mapStamp);
}

/** The signed-in learner's recent credit history and earned stamps, after they finish something. */
export async function fetchStanding(sb: SupabaseClient, userId: string): Promise<{ creditEvents: CreditEvent[]; stamps: EarnedStamp[]; credits: { learning: number; topics: Record<string, number> } | null }> {
  const [events, stamps, me] = await Promise.all([
    rows(sb.from("credit_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30)),
    rows(sb.from("user_stamps").select("*").eq("user_id", userId)),
    rows(sb.from("profiles").select("learning_credits,topic_credits").eq("id", userId).limit(1)),
  ]);
  return {
    creditEvents: events.map(mapCreditEvent),
    stamps: stamps.map(mapStamp),
    credits: me[0] ? { learning: me[0].learning_credits ?? 0, topics: me[0].topic_credits ?? {} } : null,
  };
}

/** Learners ranked by credits (see public.leaderboard()). */
export async function fetchLeaderboard(
  sb: SupabaseClient,
  period: "all" | "month",
  role: Role | null,
  limit = 10,
): Promise<LeaderboardRow[] | null> {
  const { data, error } = await sb.rpc("leaderboard", { p_period: period, p_role: role, p_limit: limit });
  if (error) {
    console.error("[supabase] leaderboard", error.message);
    return null;
  }
  return ((data ?? []) as Row[]).map((r) => ({
    rank: r.rank, userId: r.user_id, name: r.name ?? "", username: r.username ?? undefined, avatarUrl: r.avatar_url ?? null,
    role: r.role ?? null, credits: r.credits ?? 0, isMe: !!r.is_me,
  }));
}

/** The idea a learner sees on their calendar day (see public.idea_for_day()). */
export async function fetchIdeaForDay(sb: SupabaseClient, role: Role | null, day: string): Promise<DailyIdea | null | undefined> {
  const { data, error } = await sb.rpc("idea_for_day", { p_role: role, p_day: day });
  if (error) {
    console.error("[supabase] idea_for_day", error.message);
    // A database without the 2026-11-08 migration has no ideas to show yet; that is
    // not a failure the learner can do anything about.
    if (error.code === "PGRST202" || /could not find the function|does not exist/i.test(error.message)) return null;
    return undefined; // could not ask (network)
  }
  const r = (Array.isArray(data) ? data[0] : data) as Row | undefined;
  return r ? mapIdea(r) : null;
}

/** Votes per option for one idea. */
export async function fetchIdeaStats(sb: SupabaseClient, ideaId: string): Promise<number[] | null> {
  const { data, error } = await sb.rpc("idea_stats", { p_idea: ideaId });
  if (error) {
    console.error("[supabase] idea_stats", error.message);
    return null;
  }
  const counts: number[] = [];
  for (const r of (data ?? []) as Row[]) counts[r.option_index] = r.votes ?? 0;
  return counts;
}

/** Every idea, for the admin page. */
export async function fetchIdeas(sb: SupabaseClient): Promise<DailyIdea[]> {
  return (await rows(sb.from("daily_ideas").select("*"))).map(mapIdea);
}

/** How many learners answered each idea (admin page). Admins read every response. */
export async function fetchIdeaResponseCounts(sb: SupabaseClient): Promise<Record<string, number[]>> {
  const found = await rows(sb.from("idea_responses").select("idea_id,option_index"));
  const out: Record<string, number[]> = {};
  for (const r of found) {
    const counts = (out[r.idea_id] ??= []);
    counts[r.option_index] = (counts[r.option_index] ?? 0) + 1;
  }
  return out;
}

// ─────────────────────────── auth helpers ───────────────────────────
export async function fetchUser(sb: SupabaseClient, id: string): Promise<User | null> {
  const [found, owned, passes] = await Promise.all([
    rows(sb.from("profiles").select("*").eq("id", id).limit(1)),
    rows(sb.from("course_purchases").select("course_id, purchased_at").eq("user_id", id)),
    rows(sb.from("category_passes").select("category, granted_at").eq("user_id", id)),
  ]);
  if (!found[0]) return null;
  return mapProfile(found[0], owned as PurchaseRow[], passes as PassRow[]);
}

// ─────────────────────────── writes ───────────────────────────
// Provision a profile row keyed by the Clerk user id on first sign-in (the old
// auth.users → handle_new_user trigger is gone). No-op if the row already exists.
export const ensureProfile = (sb: SupabaseClient, id: string, email: string, name: string) =>
  sb.from("profiles").upsert({ id, email, name }, { onConflict: "id", ignoreDuplicates: true });

export const updateProfile = (sb: SupabaseClient, id: string, patch: Row) =>
  sb.from("profiles").update(patch).eq("id", id);

// ignoreDuplicates: enrolling twice (a double click, a row the server already wrote)
// must be a no-op. Without it the conflict became an UPDATE, which no rule allows
// on this table, so the second call was refused with an error.
export const enroll = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("enrollments").upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true });

// Stamp purchased_at on every (re)purchase so re-buying an expired topic restarts
// its 1-year access window (the DB default only applies on first insert).
export const purchase = (sb: SupabaseClient, userId: string, courseId: string) =>
  sb.from("course_purchases").upsert(
    { user_id: userId, course_id: courseId, purchased_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" },
  );

/** A column the database does not have yet: a migration that has not been run. */
const missingColumn = (error: { message?: string; code?: string } | null, column: string) =>
  !!error && (error.code === "PGRST204" || error.code === "42703" || /column|schema cache/i.test(error.message ?? "")) &&
  (error.message ?? "").includes(column);

/**
 * Marks a video finished. Its resume point goes back to the start, so a replay
 * starts at 0:00 and "continue where you stopped" moves on to the next video.
 * On a database without the resume columns it saves the completion alone.
 */
export async function completeVideo(sb: SupabaseClient, p: { userId: string; videoId: string; courseId: string; watchSeconds: number }) {
  const now = new Date().toISOString();
  const row = { user_id: p.userId, video_id: p.videoId, course_id: p.courseId, completed: true, watch_seconds: p.watchSeconds, completed_at: now };
  const res = await sb.from("video_progress").upsert({ ...row, position_seconds: 0, last_watched_at: now }, { onConflict: "user_id,video_id" });
  if (missingColumn(res.error, "position_seconds") || missingColumn(res.error, "last_watched_at"))
    return sb.from("video_progress").upsert(row, { onConflict: "user_id,video_id" });
  return res;
}

/**
 * Remembers where the learner is in a video. Only the position columns are sent,
 * so an upsert never touches `completed` (and fires none of the credit triggers).
 */
export const savePlayback = (
  sb: SupabaseClient,
  p: { userId: string; videoId: string; courseId: string; positionSeconds: number; at: string },
) =>
  sb.from("video_progress").upsert(
    { user_id: p.userId, video_id: p.videoId, course_id: p.courseId, position_seconds: Math.max(0, Math.floor(p.positionSeconds)), last_watched_at: p.at },
    { onConflict: "user_id,video_id" },
  );

// ── idea of the day ──
const ideaRow = (i: DailyIdea) => ({
  id: i.id, title: i.title, body: i.body, question: i.question,
  options: i.options.map((o) => ({ text: o.text, good: o.good, feedback: o.feedback })),
  track_id: i.trackId, audience: i.audience, show_on: i.showOn, active: i.active,
  created_by: i.createdBy ?? null, created_at: i.createdAt, updated_at: i.updatedAt,
});
export const saveIdeas = (sb: SupabaseClient, ideas: DailyIdea[]) => sb.from("daily_ideas").upsert(ideas.map(ideaRow));
export const deleteIdea = (sb: SupabaseClient, id: string) => sb.from("daily_ideas").delete().eq("id", id);
// ignoreDuplicates: a learner's first answer is the one that counts.
export const answerIdea = (sb: SupabaseClient, r: IdeaResponse) =>
  sb.from("idea_responses").upsert(
    { user_id: r.userId, idea_id: r.ideaId, option_index: r.optionIndex, created_at: r.createdAt },
    { onConflict: "user_id,idea_id", ignoreDuplicates: true },
  );

export const insertSubmission = (sb: SupabaseClient, s: Submission) =>
  sb.from("submissions").insert({
    id: s.id, user_id: s.userId, assignment_id: s.assignmentId, course_id: s.courseId,
    answers: s.answers, score: s.score, passed: s.passed, feedback: s.feedback,
    attempt_number: s.attemptNumber, submitted_at: s.submittedAt,
  });

/**
 * Upsert on (user_id, course_id): re-rating a topic replaces the learner's row
 * rather than stacking duplicates. The DB trigger recomputes courses.rating.
 */
/** The class-notes file URL for ONE video — kept out of loadAll (see the courses select). */
export async function fetchVideoNotesUrl(sb: SupabaseClient, videoId: string): Promise<string | null> {
  const { data } = await sb.from("videos").select("notes_file_url").eq("id", videoId).maybeSingle();
  return (data?.notes_file_url as string | null) ?? null;
}

export const upsertCourseRating = (sb: SupabaseClient, r: CourseRating) =>
  sb.from("course_ratings").upsert(
    {
      id: r.id,
      user_id: r.userId,
      course_id: r.courseId,
      stars: r.stars,
      review: r.review ?? null,
      created_at: r.createdAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_id" },
  );

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
/** Awaits one step of a multi-row save and throws if the database refused it. */
async function must(step: string, q: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await q;
  if (error) throw new Error(`${step}: ${error.message}`);
}

/**
 * Saves a topic with its sessions, checkpoints and questions. Throws on the first
 * step the database refuses, so the editor can say so and keep the draft open;
 * every step is an upsert or a targeted delete, so saving again is safe.
 */
export async function saveCourse(sb: SupabaseClient, c: Course) {
  const topic = await sb.from("courses").upsert({ ...courseRow(c), video_thumbnail_url: c.videoThumbnailUrl ?? null });
  if (missingColumn(topic.error, "video_thumbnail_url")) {
    // The video-thumbnail migration has not run. Without a thumbnail there is
    // nothing to lose; with one, say what to do rather than drop it silently.
    if (c.videoThumbnailUrl)
      throw new Error("the database has no place for the video thumbnail yet. Run supabase/migrations/2026-11-08-ideas-standing-resume.sql, then save again");
    await must("topic", sb.from("courses").upsert(courseRow(c)));
  } else if (topic.error) {
    throw new Error(`topic: ${topic.error.message}`);
  }
  // Sessions are upserted by id, never deleted and re-inserted: deleting a video row
  // cascades to every learner's progress, private notes and discussion on it, and
  // loses its stored notes file. One row per call, because a bulk upsert fills the
  // keys a row leaves out with NULL.
  for (const v of c.videos) {
    const row = {
      id: v.id, course_id: c.id, title: v.title, order_index: v.order, duration_seconds: v.durationSeconds,
      mux_playback_id: v.muxPlaybackId, summary: v.summary,
      notes_pdf_url: v.notesPdfName || null,
      // undefined = "not loaded, leave the stored value alone"; null = "clear it".
      // The bulk read populates neither the notes file nor the transcript.
      ...(v.notesPdfUrl === undefined ? {} : { notes_file_url: v.notesPdfUrl }),
      ...(v.transcript === undefined ? {} : { transcript: v.transcript }),
      resources: v.resources,
    };
    const { error } = await sb.from("videos").upsert({ ...row, audio_url: v.audioUrl ?? null, audio_name: v.audioName ?? null });
    if (error) {
      // An audio session must not be saved without its audio.
      if (v.audioUrl) throw new Error(`session ${v.order}: ${error.message}`);
      // Nothing to lose here: a database without the audio columns still takes the rest.
      console.error("[supabase] videos: saving without audio columns", error.message);
      await must(`session ${v.order}`, sb.from("videos").upsert(row));
    }
  }
  // Only sessions the admin removed go.
  const removed = sb.from("videos").delete().eq("course_id", c.id);
  await must("removed sessions", c.videos.length ? removed.not("id", "in", `(${c.videos.map((v) => `"${v.id}"`).join(",")})`) : removed);
  // Same for checkpoints: deleting an assignment row cascades to learners' submissions.
  const gone = sb.from("assignments").delete().eq("course_id", c.id);
  await must("removed checkpoints", c.assignments.length ? gone.not("id", "in", `(${c.assignments.map((a) => `"${a.id}"`).join(",")})`) : gone);
  for (const a of c.assignments) {
    await must("checkpoint", sb.from("assignments").upsert({ id: a.id, course_id: c.id, after_video_order: a.afterVideoOrder, title: a.title }));
    // Questions are replaced as one batch (their ids are stable), which also keeps them in the editor's order.
    await must("questions", sb.from("questions").delete().eq("assignment_id", a.id));
    if (a.questions.length)
      await must("questions", sb.from("questions").insert(a.questions.map((q) => ({
        id: q.id, assignment_id: a.id, type: q.type, prompt: q.prompt, options: q.options, correct_answer: q.correctAnswer, explanation: q.explanation,
      }))));
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

export const saveQuestion = (sb: SupabaseClient, assignmentId: string, q: Question) =>
  sb.from("questions").upsert({ id: q.id, assignment_id: assignmentId, type: q.type, prompt: q.prompt, options: q.options, correct_answer: q.correctAnswer, explanation: q.explanation });
export const deleteQuestion = (sb: SupabaseClient, id: string) => sb.from("questions").delete().eq("id", id);

export const saveCoupon = (sb: SupabaseClient, c: Coupon) =>
  sb.from("coupons").upsert({
    code: c.code, discount_percent: c.discountPercent, category: c.category, active: c.active,
    // `redemptions` is counted by the payment server. Writing the admin page's copy
    // back (as switching a coupon on or off did) erased uses made since it loaded.
    max_redemptions: c.maxRedemptions, expires_at: c.expiresAt, created_at: c.createdAt,
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
    id: m.id, name: m.name, title: m.title, member_group: m.group, bio: m.bio,
    // undefined = "not loaded, leave the stored photo alone"; null = "clear it".
    ...(m.photoUrl === undefined ? {} : { photo_url: m.photoUrl }),
    vision: m.vision ?? null, links: m.links ?? {}, featured: m.featured, order_index: m.order, active: m.active,
    created_at: m.createdAt,
  });
/** id -> photo_url for the team, fetched only by the pages that display portraits. */
export async function fetchTeamPhotos(sb: SupabaseClient): Promise<Record<string, string | null>> {
  const { data } = await sb.from("team_members").select("id,photo_url");
  return Object.fromEntries((data ?? []).map((r: Row) => [r.id as string, (r.photo_url as string | null) ?? null]));
}

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
export const updateVideoComment = (sb: SupabaseClient, id: string, text: string, mentions: string[]) =>
  sb.from("video_comments").update({ text, mentions, edited_at: new Date().toISOString() }).eq("id", id);
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
