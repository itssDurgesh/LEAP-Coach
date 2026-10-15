# How LEAP Coach works

A map of the website as it runs today: who uses it, which pages exist, how data
moves between the browser, the server and the database, and where each piece of
logic lives. Setup steps are in the [README](README.md) and
[supabase/README.md](supabase/README.md).

Last reviewed: October 2026 (branch `redesign-v2`).

---

## 1. The big picture

```
                    ┌──────────────────────────── Vercel ─────────────────────────────┐
 Browser            │  Next.js 16 app                                                  │
 ───────            │                                                                  │
 Pages (React 19)   │  Server routes (app/api/**)          proxy.ts (Clerk session)    │
 AppProvider store ─┼─► AI tutor, payments, admin users,  ─► Gemini · Razorpay ·        │
   │                │    email, Telegram, unsubscribe        Resend / Gmail             │
   │                └──────────────────────────────────────────────────────────────────┘
   │  reads + most writes, carrying the Clerk session token
   ▼
 Supabase: Postgres with row-level security · Storage bucket `media`
 Mux: video streaming (playback ids only)        Clerk: sign-in and sessions
```

- **Clerk** owns sign-in (email, Google, LinkedIn) and sessions.
- **Supabase** holds the data. The browser talks to it directly with the user's
  Clerk token; Postgres row-level security (RLS) decides what each person may
  read or write. Uploaded files live in the public Storage bucket `media`.
- **Server routes** handle everything that needs a secret or must not be
  trusted to the browser: the AI tutor, payments, owner user-management, email
  broadcasts, Telegram linking and unsubscribe. They use the Supabase
  service-role key where they must write past RLS.
- **Mux** streams lesson videos; the app only stores playback ids.

### Two modes

| | Real mode | Local demo mode |
|---|---|---|
| When | Clerk **and** Supabase keys are set | Either key is missing |
| Sign-in | Clerk | In-browser accounts (`MockAuthBridge`) |
| Data | Supabase | `localStorage` of this browser, starting empty |
| Writes to Supabase | Yes | None (the store sends nothing) |

The switch is `realMode` in `lib/store/AppProvider.tsx`. File uploads in demo
mode fall back to inline data URLs so the admin editor still works offline.

---

## 2. People and roles

| Who | How they are recognised | What they can do |
|---|---|---|
| Visitor | No session | Public pages, pricing, sign-up |
| Learner | Signed in, `profiles.role` = student / professional / entrepreneur (chosen at `/select-role`) | Learner area: topics, lessons, checkpoints, notes, discussion, sessions, account |
| Owner | `is_admin = true` and `permissions` is null | Everything in the admin panel |
| Sub-admin | `is_admin = true` with a `permissions` list | Only the admin sections their list allows; their topics need owner approval to go live |
| Banned | `profiles.banned = true` | Signed out on load; server routes refuse them |

Permissions are `content`, `articles`, `announcements`, `team`, `homepage`,
`sessions` and `payments` (`lib/types.ts`). Approvals, Analytics, Users & Access
and Plans & Coupons are owner-only.

Routing is enforced in the browser by `AppShell` (learners) and `AdminShell`
(admins): a signed-out visitor is sent to sign-up or login, an admin opening a
learner page goes to `/admin`, and a learner without a role goes to
`/select-role`. Server routes check the session and the role again on their own.

---

## 3. Pages

**Public:** `/` (animated hero and scroll story), `/about`, `/team`, `/pricing`,
`/faq`, `/privacy`, `/login`, `/signup`, `/forgot-password`, `/unsubscribe`. SEO comes from
`app/robots.ts`, `app/sitemap.ts` and the metadata and JSON-LD in `app/layout.tsx`.

**Learner area** (inside `AppShell`):

| Route | What it is |
|---|---|
| `/dashboard` | Continue card, standing (credits, stamps, leaderboard), explore tabs, announcements |
| `/my-topics` | Topics the learner owns, with progress and the next step |
| `/courses`, `/courses/[slug]` | Catalog (filter by leadership level via `?track=`) and topic page: description with Read more, roadmap, instructor, final workbook, rating |
| `/learn/[courseId]/[order]` | Lesson: player, Class notes / Transcript / Resources / Discussion tabs, and a side panel with LEAP AI, private notes and Up next |
| `/learn/[courseId]/assignment/[assignmentId]` | Checkpoint (MCQ and fill-in-the-blank, AI hints) |
| `/articles`, `/articles/[id]`, `/announcements`, `/sessions`, `/notifications` | Reading, live sessions, replies and mentions |
| `/account`, `/u/[id]` | Profile, avatar, receipts, Telegram link; public profile by id or @username |

**Admin panel** (`/admin`, inside `AdminShell`): Overview, Homepage, Team,
Content Studio (topics, daily tips, leadership tracks), Articles,
Announcements, FAQ, Privacy Policy, Approvals, Analytics, Users & Access, Live
Sessions, Plans & Coupons and Payments. Topics are created and edited in the
7-step editor (`components/admin/CourseWizard.tsx`).

---

## 4. Reading data

All shared state lives in one React context, `AppProvider`
(`lib/store/AppProvider.tsx`).

1. **First paint.** In real mode the store first paints from a per-user cache in
   `localStorage` (`leap-sb-cache-v1:<userId>`). The cache leaves transcripts
   out to stay small.
2. **Full load.** `loadAll()` in `lib/supabase/db.ts` runs about 27 reads in
   parallel (courses with their sessions, checkpoints and questions in one
   embedded query, plus profiles, enrolments, progress, articles and so on) and
   replaces the store. RLS trims what each person gets back.
3. **`hydrated` vs `fresh`.** `hydrated` turns true as soon as something is on
   screen (possibly the cache). `fresh` turns true only once the full load has
   arrived. Screens that write a whole record back, such as the topic editor,
   wait for `fresh`; otherwise they could save the cache's gaps over real data.
4. **Later reads.** Notifications are re-read every 60 seconds and when the tab
   regains focus. Heavy fields are fetched only when needed: a session's notes
   file, team photos and the admin payments list.

---

## 5. Writing data

**Ordinary changes are optimistic.** The store updates the screen first, then
sends the write through `fire()`. supabase-js reports a refused write as
`{ error }` rather than throwing, so `fire()` checks both shapes: a failed write
is logged and shows the "could not be saved" bar (`SaveErrorBanner`), whose
Reload button brings the page back to what the database really holds. Writes
the database refuses by design, because the server makes them for real
(purchase grants, a pass-holder's self-enrolment), are passed as `quiet` and
only logged.

**Saving a topic is not optimistic.** It is many rows, so `saveCourse()` waits
for the database:

- Sessions, checkpoints and questions keep stable ids for life. Positions
  (`order_index`, `after_video_order`) carry the order, so removing a session
  never moves learners' progress, notes or discussion onto another one.
- Rows are upserted and only removed ones are deleted, because deleting a
  session or checkpoint row cascades to learners' data.
- A session's uploaded notes file is not part of the bulk read: `undefined`
  means "leave the stored file alone", `null` means "remove it".
- If any step is refused, the editor stays open, shows the database's message
  and keeps the draft.

Announcements are saved before an "email on publish" goes out, because the email
is built from the saved row.

**Uploads** go to the `media` bucket (`lib/supabase/storage.ts`) in folders such
as `course-thumbnails/`, `class-notes/`, `workbooks/`, `session-audio/`,
`resources/`, `avatars/` and `team/`. Only the public URL is stored in the
database. A failed upload in real mode is reported instead of being stored as
inline data.

---

## 6. The learning flow

1. **Find a topic.** The catalog lists published topics; each belongs to one or
   more categories (student, professional, entrepreneur) and leadership levels.
2. **Get access.** A free topic is opened with one click. A paid topic is bought
   on its own, through a category pass (1 to 3 categories) or through
   All-Access. Every purchase lasts **one year from its own date**; a topic stays
   open until the latest of the learner's windows ends (`lib/access.ts`).
3. **Watch or listen.** Each session is either a Mux video or an uploaded audio
   recording. Both players remember where the learner stopped (this browser
   only) and mark the session complete at the end. Sessions with no media show a
   placeholder player.
4. **Lesson material.** Class notes (the uploaded file, or a PDF made from the
   summary and transcript), the transcript, per-session resource files (PDF and
   Word) and the discussion.
5. **LEAP AI tutor.** Answers only from the session's transcript, in plain text,
   and says so when the transcript is missing or it cannot answer
   (`app/api/leap/chat`). Quick actions: Summarize, Quiz me, Explain deeper.
6. **Checkpoints.** A checkpoint after a session must be passed (60%), or tried
   the maximum number of times, before the next session opens. Questions are MCQ or fill-in-the-blank, with AI hints
   from `app/api/leap/hint`.
7. **Credits.** Each topic is worth up to 100 credits, scored from how early
   each checkpoint question was solved and finalised when the topic is complete
   (`lib/credits.ts`). Stamps on the dashboard are calculated from progress and
   never stored.
8. **Finish.** The learner is asked to rate the topic once (`course_ratings`, kept
   in sync with the topic's average by a database trigger) and can download the
   final workbook and a topic report.

**Discussion and notifications.** Comments under each session thread one reply
level deep. Typing `@` suggests usernames; a reply or mention creates a
notification (bell and `/notifications`) that links back to the lesson's
Discussion tab at that comment.

---

## 7. Payments (Razorpay)

| Step | Where |
|---|---|
| Price is worked out on the server, with pay-the-difference for upgrades and coupon checks | `lib/payments/server.ts` (`quotePrice`) |
| An order is created | `POST /api/payments/razorpay/order` |
| The learner pays in Razorpay Checkout | `components/CheckoutModal.tsx` |
| The signature is verified and the payment fulfilled | `POST /api/payments/razorpay/verify` → `processPayment()` |
| Razorpay also calls the webhook (closed tabs, retries, refunds) | `POST /api/payments/razorpay/webhook` |
| A sweep records captured payments that were missed | `/api/payments/razorpay/reconcile` (admin button or a cron with a secret) |

`processPayment()` in `lib/payments/grant.ts` is idempotent (one receipt per
Razorpay payment id). It records the receipt, grants access with the service
role, counts the coupon once, and emails a receipt. Every database write is
checked: a grant that fails is stored as `grant_failed`, the owner is alerted,
and the payment appears under **Needs attention** on Admin → Payments, where
**Retry grant** (payments permission) or **Refund** (owner) settles it.

If an order cannot be created, checkout shows the reason and nothing is
charged. The demo checkout (`/api/payments/demo-grant`) works only with
Razorpay test keys or no keys.

---

## 8. Server routes

| Route | Purpose | Guard |
|---|---|---|
| `/api/leap/chat`, `/api/leap/hint` | Gemini tutor and checkpoint hints | Signed in, not banned, 20 per minute |
| `/api/payments/...` | See section 7 | Session, signature or secret; rate limited |
| `/api/pricing` | Current prices for server-rendered pages | Public |
| `/api/admin/users` | Grant or revoke sub-admin, ban, delete | Owner, service role |
| `/api/admin/email/broadcast` | Email an announcement or session invite | Matching permission |
| `/api/telegram/link`, `unlink`, `status` | Link an account to the Telegram bot | Signed in |
| `/api/unsubscribe` | One-click email opt-out | Signed token |

Shared helpers live in `lib/api/`: input validation with zod (`validate.ts`),
generic error bodies (`errors.ts`), per-instance rate limits (`rate-limit.ts`)
and the banned check (`banned.ts`). Secret-reading modules start with
`import "server-only"` so they can never reach the browser bundle.

**AI calls** go through one helper, `lib/ai/gemini.ts`: model alias
`gemini-flash-lite-latest` (override with `GEMINI_MODEL`), a small thinking
budget, one retry on 500/503, one retry without the thinking setting on 400,
and a 25-second limit for the whole call. With no key the tutor uses the local
mock replies in `lib/mock/leapAI.ts`.

**Email** (`lib/email/`) sends through Resend first and falls back to Gmail
SMTP. Broadcasts record who was reached (`notified_user_ids`), so a retry emails
only those still missing, and every email carries a signed unsubscribe link.

**Telegram:** the bot lives in its own repository
([leap-coach-telegram-bot](https://github.com/itssDurgesh/leap-coach-telegram-bot))
and shares this Supabase project. The website works without it.

---

## 9. Database

The schema is `supabase/database.sql` plus the files in `supabase/migrations/`
(order and status are listed in [supabase/README.md](supabase/README.md)).
The main groups of tables:

| Group | Tables |
|---|---|
| People | `profiles` (keyed by the Clerk user id), `telegram_links`, `telegram_link_tokens` |
| Content | `courses`, `videos` (sessions: Mux id or audio file, transcript, notes file, resources), `assignments`, `questions`, `leadership_tracks`, `daily_tips` |
| Commerce | `course_purchases`, `category_passes`, `payments`, `coupons`, `pricing_tiers` |
| Learning | `enrollments`, `video_progress`, `submissions`, `user_notes`, `course_ratings` |
| Community | `video_comments`, `video_comment_likes`, `notifications`, `live_sessions`, `session_attendees` |
| Site CMS | `site_content`, `site_pages`, `team_members`, `books`, `articles`, `announcements`, `faqs` |

Rules worth knowing:

- RLS is on for every table. Learner-owned rows (progress, submissions, notes)
  are writable only by their owner. Purchases, passes and receipts are written
  only by the server.
- The `protect_privileged_cols` trigger stops anyone but the server (and
  admins) from changing admin flags, permissions, bans and subscriptions.
- Sub-admin limits are enforced by the admin screens. Database rules for them,
  together with self-enrolment for pass-holders and kept-up-to-date learner
  counts, are drafted in
  `supabase/migrations/draft-2026-10-10-sub-admin-limits-enrolment-counts.sql`
  and not yet part of `database.sql`.

---

## 10. Look and feel

- Version 2 design: white rounded cards on a tinted page, LEAP navy and gold,
  six leadership-level colours (`lib/levels.ts`). The learner area is scoped by
  the `app-v2` class and the admin panel by `admin-v2`; both re-point the shared
  tokens in `app/globals.css` and `tailwind.config.ts`.
- Fonts: Bricolage Grotesque (headings) and Figtree (text) inside the v2 scopes,
  which cover the public site, the learner area and the admin panel; Outfit and
  Inter remain the base fonts outside them. All four are self-hosted from
  `app/fonts/`.
- Light and dark themes (`components/theme/`). Motion uses `motion` and `lenis`,
  and honours reduced-motion settings.

---

## 11. Known gaps

- The dashboard's **Idea of the day** and **leaderboard** show sample content
  (marked "Sample") until those features are built.
- Rate limits are counted per server instance; move them to a shared store
  (the `RateStore` interface in `lib/api/rate-limit.ts`) when traffic grows.
- Every page load reads all shared tables at once; per-page loading will be
  needed as content grows.
- There is no automated test suite. Check changes with `npx tsc --noEmit -p .`
  and `npm run build`.

---

## 12. Where things live

```
app/                     Routes: public pages, learner area, /admin, /api route handlers
  fonts/                 Self-hosted font files
components/
  admin/                 AdminShell, CourseWizard (topic editor), sub-admin form
  app/                   Learner header, notification bell, save-error bar
  dashboard/             Dashboard cards
  discussion/            Comments, @mention input
  learn/                 Mux and audio players, LEAP AI chat, rating modal
  marketing/             Public site sections (home hero, scroll story, team…)
  v2/, ui/               Shared building blocks of the design
  CheckoutModal.tsx      Checkout
lib/
  store/AppProvider.tsx  App state, data loading and every store action
  supabase/              Browser client, server/admin clients, db.ts queries, storage uploads
  payments/              Pricing, fulfilment (grant.ts), notifications
  ai/                    Gemini config and the single call helper
  email/                 Sending, templates, unsubscribe tokens
  api/                   Route helpers: validation, errors, rate limits, banned check
  access.ts, credits.ts  Access windows and the credit score
  types.ts               Shared types, roles, permissions
supabase/                database.sql and migrations
proxy.ts                 Attaches the Clerk session to requests (no route blocking)
```
