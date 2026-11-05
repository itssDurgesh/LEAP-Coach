# How LEAP Coach works

A map of the website as it runs today: who uses it, which pages exist, how data
moves between the browser, the server and the database, and where each piece of
logic lives. Setup steps are in the [README](README.md) and
[supabase/README.md](supabase/README.md).

Last reviewed: November 2026 (branch `main`).

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
 Supabase: Postgres with row-level security · Storage bucket `media` · Realtime
 Mux: video streaming (playback ids only)        Clerk: sign-in and sessions
```

- **Clerk** owns sign-in (email, Google, LinkedIn) and sessions.
- **Supabase** holds the data. The browser talks to it directly with the user's
  Clerk token; Postgres row-level security (RLS) decides what each person may
  read or write, and column privileges keep paid content, answers and private
  profile fields out of the browser's reach entirely (section 9). Uploaded
  files live in the public Storage bucket `media`, which only admins may list.
- **Server routes** handle everything that needs a secret or must not be
  trusted to the browser: the AI tutor, payments, owner user-management, the
  owner's publish and approval switches, email broadcasts, Telegram linking and
  unsubscribe. They use the Supabase
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
| `/dashboard` | Continue card (the last session watched, at its place), Idea of the day, standing (credits, stamps, leaderboard), explore tabs, announcements |
| `/my-topics` | Topics the learner owns, with progress and the next step |
| `/courses`, `/courses/[slug]` | Catalog (filter by leadership level via `?track=`) and topic page: description with Read more, roadmap, instructor, final workbook, rating |
| `/learn/[courseId]/[order]` | Lesson: player, Class notes / Transcript / Resources / Discussion tabs, and a side panel with LEAP AI, private notes and Up next |
| `/learn/[courseId]/assignment/[assignmentId]` | Checkpoint (MCQ and fill-in-the-blank, AI hints) |
| `/articles`, `/articles/[id]`, `/announcements`, `/sessions`, `/notifications` | Reading, live sessions, replies and mentions |
| `/account`, `/u/[id]` | Profile, avatar, receipts, Telegram link; public profile by id or @username |

**Admin panel** (`/admin`, inside `AdminShell`): Overview, Homepage, Team,
Content Studio (topics, daily tips, leadership tracks), Idea of the Day, Articles,
Announcements, FAQ, Privacy Policy, Approvals, Analytics, Users & Access, Live
Sessions, Plans & Coupons and Payments. Topics are created and edited in the
7-step editor (`components/admin/CourseWizard.tsx`).

---

## 4. Reading data

All shared state lives in one React context, `AppProvider`
(`lib/store/AppProvider.tsx`).

1. **First paint.** In real mode the store first paints from a per-user cache in
   `localStorage` (`leap-sb-cache-v2:<userId>`, see `lib/store/paint-cache.ts`).
2. **Full load.** `loadAll()` in `lib/supabase/db.ts` reads, in parallel, only
   what this visitor's pages use, and replaces the store. A visitor gets the
   public content (topics, team, FAQ, prices, homepage). A signed-in learner
   also gets the learner area's content (articles, announcements, live sessions,
   tips, ideas), their own rows (enrolments, progress, submissions, notes,
   notifications) and other people's public profile fields; their own full row
   comes from `my_profile()`. An admin also gets full profiles
   (`admin_profiles()`) and a summary of everyone's checkpoint attempts. Topics
   come from `catalog()`, one call for the whole tree: session media, the
   workbook link and the questions only for topics the caller may open, and
   answers only for admins. (On a database without the 2026-11-05 migration the
   app reads the tables directly, as before.)
3. **`hydrated` vs `fresh`.** `hydrated` turns true as soon as something is on
   screen (possibly the cache). `fresh` turns true only once the full load has
   arrived. Screens that write a whole record back, such as the topic editor,
   wait for `fresh`; otherwise they could save the cache's gaps over real data.
4. **Later reads.** Notifications are re-read every 60 seconds and when the tab
   regains focus. Heavy fields are fetched only when needed: a session's
   transcript (`lesson_transcript()`, `lib/transcripts.ts`), its discussion, its
   notes file (`lesson_notes_file()`), team photos,
   the leaderboard (the `leaderboard()` database function) and the admin payments
   list.
5. **Live topic changes.** Signed-in tabs subscribe to Realtime changes on
   `courses`. A change to a topic the tab has applies its live fields (published,
   approval, featured, price, rating, learner counts) in place, without a read;
   a topic the tab has never seen is read on its own. Admin tabs never take a
   topic's sessions from Realtime, because the topic editor saves what it holds.

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

**Checkpoints and credits are written only by the server.** Every try is graded
by `/api/leap/checkpoint` and recorded in `checkpoint_progress`; the submission
is built from those records, and the topic's credit is banked from stored data
(`lib/learning/server.ts`, which uses the same `lib/credits.ts` rules). Finishing
a topic's last video asks `/api/leap/credits` to bank it. Learners can read
their own rows but cannot write submissions, and the privilege trigger keeps
them from changing their credits.

**The topic editor** writes the columns the browser cannot read (session media
and transcripts, the workbook link) with a plain UPDATE after upserting the
rest: an upsert that sets a column also reads it, which those columns refuse
even to admins. A topic whose answers were not loaded is never saved.

**The owner's publish switches** (publish, unpublish, approve, reject, feature)
go through `POST /api/admin/courses` with the service role. Through the browser
they depended on `is_admin()` resolving the caller, and when it did not, the
update matched no rows and still reported success. The switch shows at once and
is put back, with the server's reason, if the server refuses.

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
   recording; a topic can set one thumbnail for all its session players. Both
   players remember where the learner stopped, in this browser and in
   `video_progress` (so another device resumes there too; the newer place wins),
   and mark the session complete at the end. The dashboard's Continue card and
   the topic page resume the last session watched, across topics
   (`lib/resume.ts`, `lib/watch-position.ts`). Sessions with no media show a
   placeholder player.
4. **Lesson material.** Class notes (the uploaded file, or a PDF made from the
   summary and transcript), the transcript, per-session resource files (PDF and
   Word) and the discussion. Notes and the final workbook are saved under their
   own names without leaving the page (`lib/download.ts`): Storage is another
   origin, where a plain download link would only open the file.
5. **LEAP AI tutor.** The route reads the session's transcript from the database
   by its id, never from the request, answers only from it, in plain text, and
   streams the reply as it is written. It says so when the transcript is missing
   or it cannot answer (`app/api/leap/chat`). Checkpoint hints read their
   question the same way. In the local demo the browser sends its own copy.
   Quick actions: Summarize, Quiz me, Explain deeper.
6. **Checkpoints.** A checkpoint after a session must be passed (60%), or tried
   the maximum number of times, before the next session opens. Questions are MCQ
   or fill-in-the-blank, with AI hints from `app/api/leap/hint`. The browser
   never has the answers: each try is graded by `app/api/leap/checkpoint`
   (4 tries per question, then the answer is shown), which also keeps the tries
   across a reload. In the local demo the browser grades, as its topics exist
   only there.
7. **Credits.** Each topic is worth up to 100 credits, scored from how early
   each checkpoint question was solved and finalised when the topic is complete
   (`lib/credits.ts`); a topic in progress shows what its answers so far are on
   track for. Stamps are calculated from progress and never stored
   (`lib/stamps.ts`). The leaderboard ranks learners of the same role by
   credits.
8. **Idea of the day.** Admins write several ideas at once (Admin → Idea of the
   Day). The dashboard shows the one pinned to today, or else the next in the
   rotation, and moves on at midnight India time (`lib/ideas.ts`).
9. **Finish.** The learner is asked to rate the topic once (`course_ratings`, kept
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
| `/api/leap/chat`, `/api/leap/hint` | Gemini tutor (streamed) and checkpoint hints, grounded on the database | Signed in, not banned, 20 per minute |
| `/api/payments/...` | See section 7 | Session, signature or secret; rate limited |
| `/api/pricing` | Current prices for server-rendered pages | Public |
| `/api/admin/users` | Grant or revoke sub-admin, ban, delete | Owner, service role |
| `/api/admin/courses` | Publish, unpublish, approve, reject, feature a topic | Owner, service role |
| `/api/leap/checkpoint` | Grade a checkpoint try, restore an attempt, submit it (writes the submission and credits) | Signed in, not banned, may open the topic |
| `/api/leap/credits` | Bank a completed topic's credit from stored data | Signed in, not banned |
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
and a 25-second limit for the whole call. `streamContent()` is the streamed
form the tutor uses, with the same retries before the first piece. With no key the tutor uses the local
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
| Content | `courses`, `videos` (sessions: Mux id or audio file, transcript, notes file, resources), `assignments`, `questions`, `leadership_tracks`, `daily_tips`, `daily_ideas` |
| Commerce | `course_purchases`, `category_passes`, `payments`, `coupons`, `pricing_tiers` |
| Learning | `enrollments`, `video_progress` (with the place to resume), `submissions`, `user_notes`, `course_ratings` |
| Community | `video_comments`, `video_comment_likes`, `notifications`, `live_sessions`, `session_attendees` |
| Site CMS | `site_content`, `site_pages`, `team_members`, `books`, `articles`, `announcements`, `faqs` |

Rules worth knowing:

- RLS is on for every table. Learner-owned rows (progress, submissions, notes)
  are writable only by their owner. Purchases, passes and receipts are written
  only by the server.
- The `protect_privileged_cols` trigger stops anyone but the server (and
  admins) from changing admin flags, permissions, bans, subscriptions and
  learning credits.
- **What the browser's key cannot read** (2026-11-05 migration, mirrored in
  `database.sql` section 14). Column privileges hide, from anon and signed-in
  members alike: a session's Mux playback id, audio file, notes file,
  resources and transcript; a topic's workbook link; a question's answer and
  explanation; and a profile's email, phone, age, gender, plan, permissions and
  activity. These reach the app only through functions that check access:
  `catalog()`, `lesson_transcript()`, `course_transcripts()`,
  `lesson_notes_file()`, `my_profile()` and `admin_profiles()`.
  `user_has_course_access()` is the one access rule (free topics for anyone
  signed in; otherwise an all-access plan, a category pass or a purchase whose
  window is open; admins; never a banned account), the same as `lib/access.ts`.
  Question rows themselves are readable only by people who may open the topic,
  profiles and live sessions only by signed-in members. After adding a column
  to one of these tables, run `select public.apply_column_privileges();`.
- `leaderboard(role, limit)` is a security-definer function that returns names,
  credits and ranks only, so the ranking needs no access to other profiles.
- `courses`, `announcements` and `notifications` are in the `supabase_realtime`
  publication; the app subscribes to `courses`.
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

- Rate limits are counted per server instance; move them to a shared store
  (the `RateStore` interface in `lib/api/rate-limit.ts`) when traffic grows.
- Each visit still reads every topic, and for learners everyone's public
  profile fields, at once; per-page loading will be needed as content grows.
- File links (notes, audio, resources, workbooks) and Mux playback ids are
  bearer links: they reach only learners who may open the topic, but one such
  learner could pass them on. Closing that needs signed, expiring links (Mux
  signed playback, Storage signed URLs).
- Each signed-in tab holds one Realtime connection, and Supabase plans cap
  concurrent connections. Past the cap, new tabs miss live topic changes (pages
  still work and catch up on reload).
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
  learning/server.ts     Server side of learning: access check, grading, credits
  checkpoint.ts          The browser's calls to the checkpoint and credits routes
  ideas.ts, stamps.ts    Which Idea of the day shows; the dashboard stamps
  resume.ts              Where a learner resumes (watch-position.ts: the saved place)
  download.ts            File downloads that keep the learner on the page
  types.ts               Shared types, roles, permissions
supabase/                database.sql and migrations
proxy.ts                 Attaches the Clerk session to requests (no route blocking)
```
