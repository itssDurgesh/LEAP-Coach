-- ═════════════════════════════════════════════════════════════════════════════
-- LEAP Coach — THE database schema (single source of truth)
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this ONE file in the Supabase SQL editor. It is:
--   • COMPLETE   — every table, index, policy, trigger and function the app,
--                  the payment server and the Telegram bot need. There are no
--                  other required SQL files.
--   • IDEMPOTENT — safe to re-run any number of times (create if not exists /
--                  add column if not exists / drop-then-create policies). Re-run
--                  it after every schema-touching app update.
--   • SEED-FREE  — it creates NO demo content. The only rows it inserts are two
--                  structural singletons the app expects (pricing_tiers id=1,
--                  site_pages id=1); both use ON CONFLICT DO NOTHING so your
--                  edited values are never overwritten. All real content
--                  (topics, team, articles, FAQs, announcements, coupons…) is
--                  created in the app: Admin → Content Studio.
--
-- Auth model: Clerk (not Supabase Auth). The Clerk user id (text) is the
-- profiles primary key; Supabase validates Clerk session tokens via Third-Party
-- Auth, so `auth.jwt() ->> 'sub'` inside policies is the Clerk user id.
--
-- Performance notes baked in below:
--   • RLS predicates wrap auth.jwt()/is_admin() in scalar sub-selects —
--     `(select …)` — so Postgres evaluates them ONCE PER QUERY instead of once
--     per row (the standard Supabase RLS optimization).
--   • Every foreign key used by a join or per-user query has an index
--     (Postgres does not auto-index FKs).
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS & HELPERS
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
-- public.is_admin(), the RLS helper, is defined in section 2 right after the
-- profiles table it reads: a SQL function's body is checked when it is created,
-- so defining it first made this file fail on a brand-new database.


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. IDENTITY
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                        text primary key,              -- Clerk user id (e.g. user_2ab…)
  name                      text,
  email                     text unique,
  username                  text,                          -- unique @handle (discussion board)
  role                      text check (role in ('student','professional','entrepreneur')),
  avatar_url                text,
  headline                  text,                          -- short profile tagline
  bio                       text,                          -- "about me"
  age                       int,
  gender                    text check (gender in ('male','female','non_binary','prefer_not')),
  phone                     text,
  phone_verified            boolean default false,
  company                   text,
  nationality               text,
  region                    text,
  learning_credits          int default 0,
  topic_credits             jsonb default '{}',            -- courseId -> best credit earned (0–100)
  subscription_plan         text default 'none' check (subscription_plan in ('none','all_access','per_course')),
  subscription_valid_until  timestamptz,
  banned                    boolean default false,
  email_opt_out             boolean default false,         -- excluded from broadcast emails (unsubscribe link)
  is_admin                  boolean default false,
  permissions               jsonb,                         -- null = full owner; array = sub-admin scope
  created_at                timestamptz default now(),
  last_active_at            timestamptz default now()
);

-- Case-insensitive unique @handles (multiple NULLs allowed).
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- RLS helper: is the current user an admin? Declared STABLE so the planner can
-- cache it within a statement; policies below additionally wrap calls in
-- (select …) so it runs once per query.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = (auth.jwt() ->> 'sub')), false);
$$;

-- Authentication is handled by Clerk — there is no auth.users trigger. The app
-- provisions a profile row (db.ensureProfile) on first sign-in, permitted by the
-- "profiles insert self" policy below. Drop any stale Supabase-auth remnants.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTENT
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.leadership_tracks (
  id    text primary key,
  label text not null
);

create table if not exists public.courses (
  id                   text primary key,
  slug                 text unique not null,
  title                text not null,
  description          text,
  category             text check (category in ('student','professional','entrepreneur')),
  categories           text[] default '{}',     -- multi-category support
  instructor_name      text,
  instructor_title     text,
  instructor_bio       text,
  instructor_initials  text,
  hashtags             text[] default '{}',
  tracks               text[] default '{}',
  level                text,
  rating               numeric default 0,
  rating_count         int default 0,
  enrolled_count       int default 0,
  purchase_count       int default 0,
  price                int default 0,
  trending             boolean default false,
  published            boolean default false,
  accent               int default 0,
  thumbnail_url        text,                    -- uploaded cover image
  video_thumbnail_url  text,                    -- one picture shown on every video of the topic
  workbook_name        text,                    -- final workbook (PDF/DOCX)
  workbook_url         text,
  pending_approval     boolean default false,   -- sub-admin submission awaiting owner
  submitted_by         text,                    -- Clerk user id of the submitting sub-admin
  access_duration_days int,                     -- optional à-la-carte override (null/0 = 1 year)
  created_at           timestamptz default now()
);

create table if not exists public.videos (
  id               text primary key,
  course_id        text references public.courses (id) on delete cascade,
  title            text,
  order_index      int,
  duration_seconds int,
  mux_playback_id  text,
  transcript       text,
  summary          text,
  notes_pdf_url    text,
  notes_file_url   text,                        -- uploaded class-notes file
  audio_url        text,                        -- set when the session is an audio recording, not a video
  audio_name       text,                        -- the uploaded audio file's name
  resources        jsonb default '[]'           -- per-session files / links: [{id,title,type,url}]
);

create table if not exists public.assignments (
  id                text primary key,
  course_id         text references public.courses (id) on delete cascade,
  after_video_order int,
  title             text
);

create table if not exists public.questions (
  id             text primary key,
  assignment_id  text references public.assignments (id) on delete cascade,
  type           text check (type in ('mcq','fill_blank')),
  prompt         text,
  options        jsonb default '[]',
  correct_answer text,
  explanation    text
);

create table if not exists public.daily_tips (
  id          text primary key,
  text        text not null,
  author      text,
  target_role text default 'all',
  active      boolean default true
);

create table if not exists public.recommended_resources (
  id          text primary key,
  title       text,
  type        text,
  author      text,
  blurb       text,
  target_role text default 'all',
  accent      int default 0
);

-- "Idea of the day" on the learner dashboard. Admins write ideas and schedule
-- them for a date; idea_for_day() (section 11b) picks the one for a learner's day.
create table if not exists public.daily_ideas (
  id          text primary key,
  title       text not null,
  body        text not null default '',
  question    text not null default '',
  options     jsonb not null default '[]',      -- [{ "text", "good", "feedback" }], 2–5 of them
  track_id    text,                             -- leadership level shown as a chip
  audience    text not null default 'all' check (audience in ('all','student','professional','entrepreneur')),
  show_on     date,                             -- the day it is scheduled for; null = rotation only
  active      boolean not null default true,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.live_sessions (
  id                text primary key,
  title             text,
  course_title      text,
  instructor_name   text,
  starts_at         timestamptz,
  duration_mins     int,
  meet_link         text,
  description       text,
  target_role       text default 'all',
  capacity          int default 100,
  notified_at       timestamptz,                -- when first emailed to its audience
  notified_user_ids jsonb default '[]',         -- profile ids already emailed (retry targets the rest)
  created_at        timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMMERCE
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin-editable plan prices (single row, id = 1). The insert below is a
-- STRUCTURAL BOOTSTRAP (not demo data): the app's pricing editor updates row 1
-- in place, and ON CONFLICT DO NOTHING guarantees your prices are never reset.
create table if not exists public.pricing_tiers (
  id                int primary key default 1,
  cat1              int not null,               -- single-category pass
  cat2              int not null,               -- any two categories
  cat3              int not null,               -- all three (all-access)
  per_topic_from    int default 999,            -- "from ₹X / topic" on the pricing page
  show_upgrade_info boolean default true,       -- show learners the "why this price?" explainer
  constraint pricing_tiers_singleton check (id = 1)
);
insert into public.pricing_tiers (id, cat1, cat2, cat3)
  values (1, 6000, 10000, 17000)
  on conflict (id) do nothing;

-- Discount coupons (validated/redeemed server-side via the service role).
create table if not exists public.coupons (
  code             text primary key,            -- stored uppercase
  discount_percent int  not null check (discount_percent between 1 and 100),
  category         text not null,               -- 'all' | 'student' | 'professional' | 'entrepreneur'
  active           boolean not null default true,
  max_redemptions  int,                         -- null = unlimited
  redemptions      int  not null default 0,
  expires_at       timestamptz,                 -- null = no expiry
  created_at       timestamptz not null default now()
);

-- Atomic redemption counter: a single UPDATE … = redemptions + 1 is row-locked,
-- so simultaneous redemptions can't lose updates (read-then-write would). Called
-- by the server (service role) after a verified payment.
create or replace function public.increment_coupon_redemption(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.coupons set redemptions = redemptions + 1 where code = p_code;
$$;

-- Per-topic purchases (granted server-side after a verified payment). Each
-- purchase opens a 1-year window from purchased_at (see lib/access.ts).
create table if not exists public.course_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      text references public.profiles (id) on delete cascade,
  course_id    text references public.courses (id) on delete cascade,
  purchased_at timestamptz default now(),
  unique (user_id, course_id)
);

-- Category passes: unlock every topic in a category for 1 year (server-granted).
create table if not exists public.category_passes (
  user_id    text not null references public.profiles (id) on delete cascade,
  category   text not null,                     -- 'student' | 'professional' | 'entrepreneur'
  granted_at timestamptz not null default now(),
  primary key (user_id, category)
);

-- Payment receipts (written ONLY by the server: /verify, the Razorpay webhook and
-- the reconcile sweep). One row per Razorpay payment — razorpay_payment_id is the
-- unique idempotency key. grant_status flags captured-but-not-granted payments for
-- admin follow-up; the refund columns are the audit trail kept in sync by the
-- refund route + refund.* webhook events (see docs/PAYMENTS.md).
create table if not exists public.payments (
  id                  text primary key,         -- our receipt id, e.g. rcpt_…
  user_id             text references public.profiles (id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text unique,              -- idempotency key
  plan                text,                     -- 'course' | 'bundle' | 'all'
  course_id           text,
  categories          text[] default '{}',
  coupon_code         text,
  amount_inr          int,                      -- amount actually paid (rupees)
  currency            text default 'INR',
  status              text default 'captured' check (status in ('captured','refunded','failed')),
  grant_status        text default 'pending'  check (grant_status in ('granted','grant_failed','pending')),
  source              text default 'verify'   check (source in ('verify','webhook')),
  notes               jsonb default '{}',
  created_at          timestamptz default now(),
  refunded_at         timestamptz,
  razorpay_refund_id  text,                     -- audit trail (webhook refund.* events)
  refund_amount_inr   int                       -- rupees actually refunded
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. LEARNER STATE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  user_id      text references public.profiles (id) on delete cascade,
  course_id    text references public.courses (id) on delete cascade,
  enrolled_at  timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table if not exists public.video_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       text references public.profiles (id) on delete cascade,
  video_id      text references public.videos (id) on delete cascade,
  course_id     text references public.courses (id) on delete cascade,
  completed     boolean default false,
  watch_seconds int default 0,
  completed_at  timestamptz,
  position_seconds int default 0,              -- where the learner stopped (resume point)
  last_watched_at  timestamptz,                -- last time the player saved a position
  unique (user_id, video_id)
);

create table if not exists public.submissions (
  id             text primary key,
  user_id        text references public.profiles (id) on delete cascade,
  assignment_id  text references public.assignments (id) on delete cascade,
  course_id      text references public.courses (id) on delete cascade,
  answers        jsonb default '{}',
  score          numeric default 0,
  passed         boolean default false,
  feedback       jsonb default '[]',
  attempt_number int default 1,
  submitted_at   timestamptz default now()
);

create table if not exists public.user_notes (
  id         text primary key,
  user_id    text references public.profiles (id) on delete cascade,
  video_id   text references public.videos (id) on delete cascade,
  text       text,
  created_at timestamptz default now()
);

create table if not exists public.session_attendees (
  session_id text references public.live_sessions (id) on delete cascade,
  user_id    text references public.profiles (id) on delete cascade,
  primary key (session_id, user_id)
);

-- One rating per learner per topic; course_ratings_sync keeps courses.rating /
-- rating_count in step (section 11b).
create table if not exists public.course_ratings (
  id          text primary key,
  user_id     text not null,
  course_id   text not null references public.courses (id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  review      text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, course_id)
);

-- A learner's answer to an idea of the day (one per idea).
create table if not exists public.idea_responses (
  user_id      text not null references public.profiles (id) on delete cascade,
  idea_id      text not null references public.daily_ideas (id) on delete cascade,
  option_index int  not null check (option_index between 0 and 9),
  created_at   timestamptz not null default now(),
  primary key (user_id, idea_id)
);

-- Every credit gain, written only by sync_topic_credit(). The monthly
-- leaderboard adds these up.
create table if not exists public.credit_events (
  id          bigint generated always as identity primary key,
  user_id     text not null references public.profiles (id) on delete cascade,
  course_id   text references public.courses (id) on delete set null,
  amount      int not null,
  total_after int not null,
  created_at  timestamptz not null default now()
);

-- Stamps the database has awarded (award_stamps(), section 11b).
create table if not exists public.user_stamps (
  user_id   text not null references public.profiles (id) on delete cascade,
  stamp_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, stamp_id)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COMMUNITY
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id         text primary key,
  user_id    text references public.profiles (id) on delete cascade,
  user_name  text,
  user_role  text,
  text       text,
  created_at timestamptz default now(),
  edited_at  timestamptz
);

create table if not exists public.post_likes (
  post_id text references public.community_posts (id) on delete cascade,
  user_id text references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

-- Threaded comments (one reply level, LinkedIn-style).
create table if not exists public.post_comments (
  id         text primary key,
  post_id    text references public.community_posts (id) on delete cascade,
  parent_id  text references public.post_comments (id) on delete cascade,
  user_id    text references public.profiles (id) on delete cascade,
  user_name  text,
  user_role  text,
  text       text,
  mentions   jsonb default '[]',
  created_at timestamptz default now(),
  edited_at  timestamptz
);

create table if not exists public.comment_likes (
  comment_id text references public.post_comments (id) on delete cascade,
  user_id    text references public.profiles (id) on delete cascade,
  primary key (comment_id, user_id)
);

-- Per-video discussion: YouTube-style comments under each topic video, threaded
-- one reply level, with @mentions + notifications.
create table if not exists public.video_comments (
  id         text primary key,
  video_id   text references public.videos (id) on delete cascade,
  course_id  text references public.courses (id) on delete cascade,
  parent_id  text references public.video_comments (id) on delete cascade,
  user_id    text references public.profiles (id) on delete cascade,
  user_name  text,
  user_role  text,
  text       text,
  mentions   jsonb default '[]',
  created_at timestamptz default now(),
  edited_at  timestamptz
);

create table if not exists public.video_comment_likes (
  comment_id text references public.video_comments (id) on delete cascade,
  user_id    text references public.profiles (id) on delete cascade,
  primary key (comment_id, user_id)
);

-- In-app notifications (reply / @mention on a video discussion).
create table if not exists public.notifications (
  id         text primary key,
  user_id    text references public.profiles (id) on delete cascade,   -- recipient
  type       text check (type in ('reply','mention')),
  actor_id   text references public.profiles (id) on delete cascade,
  actor_name text,
  video_id   text,   -- per-video discussion context (current)
  course_id  text,   -- so the bell can resolve the player URL
  post_id    text,   -- legacy (removed global board); kept for old rows
  comment_id text,
  preview    text,
  read       boolean default false,
  created_at timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SITE CMS (admin-editable public site)
-- ─────────────────────────────────────────────────────────────────────────────
-- Homepage content (hero text, stats, headings…) as one JSON document.
create table if not exists public.site_content (
  id         int primary key default 1,
  content    jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint site_content_singleton check (id = 1)
);

-- Team page (founder, mentors, research associates, interns…).
create table if not exists public.team_members (
  id           text primary key,
  name         text not null,
  title        text,
  member_group text default 'mentor',
  photo_url    text,
  bio          text,
  vision       text,
  links        jsonb default '{}',
  featured     boolean default false,
  order_index  int default 0,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- Book showcase on the landing page.
create table if not exists public.books (
  id          text primary key,
  title       text not null,
  author      text,
  cover_url   text,
  blurb       text,
  link        text,
  order_index int default 0,
  active      boolean default true
);

-- Announcements (admin broadcast → learners read on /announcements).
create table if not exists public.announcements (
  id                text primary key,
  title             text not null,
  body              text,
  target_role       text default 'all',         -- 'all' | 'student' | 'professional' | 'entrepreneur'
  pinned            boolean default false,
  published         boolean default true,
  author_id         text,
  author_name       text,
  notified_at       timestamptz,                -- when first emailed to its audience
  notified_user_ids jsonb default '[]',         -- profile ids already emailed (retry targets the rest)
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Articles written by the admin, shown to learners.
create table if not exists public.articles (
  id          text primary key,
  title       text not null,
  excerpt     text default '',
  content     text default '',
  cover_url   text,
  images      jsonb default '[]',               -- inline body images ({id,url,alt})
  author_id   text references public.profiles (id) on delete set null,
  author_name text,
  published   boolean default false,
  archived    boolean default false,            -- hidden from learners/catalog, kept for admin
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- FAQ entries shown on the public /faq page (admin-managed in the app).
create table if not exists public.faqs (
  id          text primary key,
  question    text not null,
  answer      text not null,
  order_index int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Single editable legal/site pages row (privacy policy for now). The insert is a
-- STRUCTURAL BOOTSTRAP for the singleton (content stays null until the admin
-- writes the policy in the app).
create table if not exists public.site_pages (
  id             int primary key default 1,
  privacy_policy text,
  updated_at     timestamptz not null default now(),
  constraint site_pages_singleton check (id = 1)
);
insert into public.site_pages (id, privacy_policy) values (1, null) on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. INTEGRATIONS — Telegram bot linking + realtime
--    Bridges the website and the standalone Telegram bot (separate repo:
--    github.com/itssDurgesh/leap-coach-telegram-bot). Both sides use the
--    SERVICE-ROLE key, so RLS is
--    enabled with NO policies → anon/authenticated get nothing.
-- ─────────────────────────────────────────────────────────────────────────────
-- Short-lived one-time tokens minted by the website; redeemed by the bot via the
-- /start <token> deep link to prove which LEAP account owns the chat.
create table if not exists public.telegram_link_tokens (
  token      text primary key,
  user_id    text not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

-- Permanent binding: exactly one Telegram chat per LEAP user and vice-versa.
create table if not exists public.telegram_links (
  user_id           text primary key references public.profiles (id) on delete cascade,
  chat_id           bigint not null unique,
  telegram_username text,
  linked_at         timestamptz not null default now(),
  last_seen_at      timestamptz
);

-- Realtime: the bot listens for live announcement / course / notification inserts.
-- Idempotent; safe when the supabase_realtime publication isn't present.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='announcements') then
      alter publication supabase_realtime add table public.announcements;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='courses') then
      alter publication supabase_realtime add table public.courses;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. UPGRADES FOR EXISTING DATABASES
--    No-ops on a fresh install; bring databases created from older versions of
--    this schema up to the final shape above.
--
--    ⚠️  MIGRATING FROM THE OLD SUPABASE-AUTH SCHEMA (uuid ids → Clerk text ids):
--    `create table if not exists` will NOT change an existing profiles.id from
--    uuid to text, so a uuid-keyed database cannot be upgraded in place (the PK
--    type and every user_id FK differ). Rebuild it:
--        drop schema public cascade;
--        create schema public;
--        grant usage on schema public to anon, authenticated, service_role;
--        grant all on all tables    in schema public to anon, authenticated, service_role;
--        grant all on all sequences in schema public to anon, authenticated, service_role;
--        grant all on all functions in schema public to anon, authenticated, service_role;
--    then run this file and sign in once via Clerk (see section 13).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles      add column if not exists username text;
alter table public.profiles      add column if not exists headline text;
alter table public.profiles      add column if not exists bio text;
alter table public.profiles      add column if not exists permissions jsonb;
alter table public.profiles      add column if not exists topic_credits jsonb default '{}';
alter table public.profiles      add column if not exists email_opt_out boolean default false;
alter table public.pricing_tiers add column if not exists per_topic_from int default 999;
alter table public.pricing_tiers add column if not exists show_upgrade_info boolean default true;
alter table public.courses       add column if not exists categories text[] default '{}';
alter table public.courses       add column if not exists thumbnail_url text;
alter table public.courses       add column if not exists workbook_name text;
alter table public.courses       add column if not exists workbook_url text;
alter table public.courses       add column if not exists pending_approval boolean default false;
alter table public.courses       add column if not exists submitted_by text;
alter table public.courses       add column if not exists access_duration_days int;
alter table public.videos        add column if not exists notes_file_url text;
alter table public.videos        add column if not exists audio_url text;
alter table public.videos        add column if not exists audio_name text;
alter table public.articles      add column if not exists images jsonb default '[]';
alter table public.articles      add column if not exists archived boolean default false;
alter table public.notifications add column if not exists video_id text;
alter table public.notifications add column if not exists course_id text;
-- Notify-all-users: per-item delivery tracking (+ per-recipient retry).
alter table public.announcements add column if not exists notified_at timestamptz;
alter table public.live_sessions add column if not exists notified_at timestamptz;
alter table public.announcements add column if not exists notified_user_ids jsonb default '[]';
alter table public.live_sessions add column if not exists notified_user_ids jsonb default '[]';
-- Refund audit trail (kept in sync by the refund route + refund.* webhook events).
alter table public.payments      add column if not exists razorpay_refund_id text;
alter table public.payments      add column if not exists refund_amount_inr int;
-- Topic-wide video thumbnail + resume position (migrations/2026-11-08-ideas-standing-resume.sql).
alter table public.courses        add column if not exists video_thumbnail_url text;
alter table public.video_progress add column if not exists position_seconds int default 0;
alter table public.video_progress add column if not exists last_watched_at timestamptz;

-- Backfill @usernames for profiles that don't have one yet (tagging on the
-- discussion board resolves people by handle). Idempotent: only fills NULLs.
update public.profiles p
set username = sub.handle
from (
  select id,
         case when rn = 1 and clash = 0 then base else base || '_' || rn::text end as handle
  from (
    select id, base,
           row_number() over (partition by base order by created_at, id) as rn,
           (select count(*) from public.profiles q where lower(q.username) = b.base) as clash
    from (
      select id, created_at,
             coalesce(
               nullif(left(trim(both '_' from regexp_replace(
                 lower(coalesce(nullif(trim(name), ''), split_part(email, '@', 1))),
                 '[^a-z0-9_]+', '_', 'g')), 20), ''),
               'user') as base
      from public.profiles
      where username is null
    ) b
  ) c
) sub
where p.id = sub.id;


-- ═════════════════════════════════════════════════════════════════════════════
-- 10. ROW-LEVEL SECURITY (final state)
--     Every predicate wraps auth.jwt()/is_admin() in `(select …)` so it is
--     evaluated once per query, not once per row.
-- ═════════════════════════════════════════════════════════════════════════════
do $$ declare t text; begin
  foreach t in array array[
    'profiles','leadership_tracks','courses','videos','assignments','questions',
    'daily_tips','recommended_resources','live_sessions','pricing_tiers','coupons',
    'course_purchases','category_passes','payments','enrollments','video_progress',
    'submissions','user_notes','session_attendees','community_posts','post_likes',
    'post_comments','comment_likes','video_comments','video_comment_likes',
    'notifications','site_content','team_members','books','articles','announcements',
    'faqs','site_pages','telegram_link_tokens','telegram_links',
    'course_ratings','daily_ideas','idea_responses','credit_events','user_stamps'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- Profiles: readable by all; users create + edit their own row; admins manage all.
-- "insert self" is how the app provisions the row (db.ensureProfile) on first
-- Clerk sign-in. Privileged columns are pinned by the trigger in section 11.
drop policy if exists "profiles read"        on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles admin all"   on public.profiles;
create policy "profiles read"        on public.profiles for select using (true);
create policy "profiles insert self" on public.profiles for insert with check ((select auth.jwt() ->> 'sub') = id);
create policy "profiles update self" on public.profiles for update
  using ((select auth.jwt() ->> 'sub') = id or (select public.is_admin()))
  with check ((select auth.jwt() ->> 'sub') = id or (select public.is_admin()));
create policy "profiles admin all"   on public.profiles for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Public content: readable by everyone; writable only by admins.
do $$ declare t text; begin
  foreach t in array array[
    'leadership_tracks','courses','videos','assignments','questions',
    'daily_tips','recommended_resources','live_sessions',
    'site_content','team_members','books'
  ] loop
    execute format('drop policy if exists "%1$s read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s admin write" on public.%1$I;', t);
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all using ((select public.is_admin())) with check ((select public.is_admin()));', t);
  end loop;
end $$;

-- Articles: learners read only PUBLISHED, non-archived ones; admins read + write all.
drop policy if exists "articles read"        on public.articles;
drop policy if exists "articles admin write" on public.articles;
create policy "articles read" on public.articles
  for select using ((published and not coalesce(archived, false)) or (select public.is_admin()));
create policy "articles admin write" on public.articles
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Announcements: learners read only PUBLISHED ones; admins read + write all.
drop policy if exists "announcements read"        on public.announcements;
drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements read" on public.announcements
  for select using (published or (select public.is_admin()));
create policy "announcements admin write" on public.announcements
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- FAQs: learners read published; admins read + write all.
drop policy if exists "faqs read"        on public.faqs;
drop policy if exists "faqs admin write" on public.faqs;
create policy "faqs read" on public.faqs
  for select using (published or (select public.is_admin()));
create policy "faqs admin write" on public.faqs
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Site pages (privacy policy): public read; admin write.
drop policy if exists "site_pages read"        on public.site_pages;
drop policy if exists "site_pages admin write" on public.site_pages;
create policy "site_pages read" on public.site_pages for select using (true);
create policy "site_pages admin write" on public.site_pages
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pricing: public read; admin write.
drop policy if exists "pricing read"        on public.pricing_tiers;
drop policy if exists "pricing admin write" on public.pricing_tiers;
create policy "pricing read" on public.pricing_tiers for select using (true);
create policy "pricing admin write" on public.pricing_tiers
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Coupons: admin-only through normal sessions (payment routes use the service role).
drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- Course purchases (HARDENED): owner/admin read; ONLY the server (service role,
-- after a verified Razorpay payment) writes.
drop policy if exists "course_purchases owner"      on public.course_purchases;  -- legacy
drop policy if exists "course_purchases admin read" on public.course_purchases;  -- legacy
drop policy if exists "course_purchases read own"   on public.course_purchases;
create policy "course_purchases read own" on public.course_purchases
  for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Category passes (HARDENED): owner/admin read; server-only writes.
drop policy if exists "category_passes read own" on public.category_passes;
create policy "category_passes read own" on public.category_passes
  for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Payments / receipts (HARDENED): a learner sees ONLY their own receipts; admins
-- see all. Writes/refunds happen ONLY server-side via the service role.
drop policy if exists "payments read own" on public.payments;
create policy "payments read own" on public.payments
  for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Enrollments (HARDENED): owner/admin read; self-enrol ONLY in free topics;
-- paid enrolments are granted server-side after payment.
drop policy if exists "enrollments owner"           on public.enrollments;       -- legacy
drop policy if exists "enrollments admin read"      on public.enrollments;       -- legacy
drop policy if exists "enrollments read own"        on public.enrollments;
drop policy if exists "enrollments free self-enrol" on public.enrollments;
drop policy if exists "enrollments delete own"      on public.enrollments;
create policy "enrollments read own" on public.enrollments
  for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));
create policy "enrollments free self-enrol" on public.enrollments
  for insert with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (select 1 from public.courses c where c.id = course_id and c.price = 0)
  );
create policy "enrollments delete own" on public.enrollments
  for delete using ((select auth.jwt() ->> 'sub') = user_id);

-- Private per-user tables: owner CRUD; admins read all.
do $$ declare t text; begin
  foreach t in array array['video_progress','submissions','user_notes'] loop
    execute format('drop policy if exists "%1$s owner" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s admin read" on public.%1$I;', t);
    execute format('create policy "%1$s owner" on public.%1$I for all using ((select auth.jwt() ->> ''sub'') = user_id) with check ((select auth.jwt() ->> ''sub'') = user_id);', t);
    execute format('create policy "%1$s admin read" on public.%1$I for select using ((select public.is_admin()));', t);
  end loop;
end $$;

-- Likes & attendees: counts are public; only the owner writes their own row.
do $$ declare t text; begin
  foreach t in array array['session_attendees','post_likes','comment_likes','video_comment_likes'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$I;', t);
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert with check ((select auth.jwt() ->> ''sub'') = user_id);', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete using ((select auth.jwt() ->> ''sub'') = user_id);', t);
  end loop;
end $$;

-- Discussion posts + comments (board and per-video): everyone reads; the author
-- inserts; author or admin edits/deletes.
do $$ declare t text; begin
  foreach t in array array['community_posts','post_comments','video_comments'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s update" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$I;', t);
    -- Legacy short names from earlier schema versions.
    execute format('drop policy if exists "posts read" on public.%1$I;', t);
    execute format('drop policy if exists "posts insert" on public.%1$I;', t);
    execute format('drop policy if exists "posts update" on public.%1$I;', t);
    execute format('drop policy if exists "posts delete" on public.%1$I;', t);
    execute format('drop policy if exists "comments read" on public.%1$I;', t);
    execute format('drop policy if exists "comments insert" on public.%1$I;', t);
    execute format('drop policy if exists "comments update" on public.%1$I;', t);
    execute format('drop policy if exists "comments delete" on public.%1$I;', t);
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert with check ((select auth.jwt() ->> ''sub'') = user_id);', t);
    execute format('create policy "%1$s update" on public.%1$I for update using ((select auth.jwt() ->> ''sub'') = user_id or (select public.is_admin()));', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete using ((select auth.jwt() ->> ''sub'') = user_id or (select public.is_admin()));', t);
  end loop;
end $$;

-- Notifications: recipient (or admin) reads; the actor creates; recipient marks read.
drop policy if exists "notifications read"   on public.notifications;
drop policy if exists "notifications insert" on public.notifications;
drop policy if exists "notifications update" on public.notifications;
drop policy if exists "notifications delete" on public.notifications;
create policy "notifications read"   on public.notifications for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));
create policy "notifications insert" on public.notifications for insert with check ((select auth.jwt() ->> 'sub') = actor_id);
create policy "notifications update" on public.notifications for update using ((select auth.jwt() ->> 'sub') = user_id);
create policy "notifications delete" on public.notifications for delete using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Telegram tables: RLS enabled with NO policies → only the service role (website
-- routes + bot) gets access; anon/authenticated are denied entirely.
drop policy if exists "telegram_link_tokens service" on public.telegram_link_tokens;  -- legacy
drop policy if exists "telegram_links service"       on public.telegram_links;        -- legacy

-- Course ratings: everyone reads; a learner rates only a topic they are enrolled
-- in, and edits only their own rating; admins moderate.
drop policy if exists "course_ratings read"       on public.course_ratings;
drop policy if exists "course_ratings insert own" on public.course_ratings;
drop policy if exists "course_ratings update own" on public.course_ratings;
drop policy if exists "course_ratings delete own" on public.course_ratings;
create policy "course_ratings read" on public.course_ratings for select using (true);
create policy "course_ratings insert own" on public.course_ratings for insert with check (
  (select auth.jwt() ->> 'sub') = user_id
  and exists (select 1 from public.enrollments e
               where e.user_id = (select auth.jwt() ->> 'sub') and e.course_id = course_ratings.course_id)
);
create policy "course_ratings update own" on public.course_ratings for update
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()))
  with check ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));
create policy "course_ratings delete own" on public.course_ratings for delete
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Ideas of the day: learners read active ideas up to tomorrow (time zones), so the
-- schedule is not spoiled; admins read and write all of them.
drop policy if exists "daily_ideas read"        on public.daily_ideas;
drop policy if exists "daily_ideas admin write" on public.daily_ideas;
create policy "daily_ideas read" on public.daily_ideas for select
  using ((active and (show_on is null or show_on <= current_date + 1)) or (select public.is_admin()));
create policy "daily_ideas admin write" on public.daily_ideas for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Idea answers: a learner sees and adds only their own; admins read all.
drop policy if exists "idea_responses read own"   on public.idea_responses;
drop policy if exists "idea_responses insert own" on public.idea_responses;
create policy "idea_responses read own" on public.idea_responses for select
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));
create policy "idea_responses insert own" on public.idea_responses for insert
  with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (select 1 from public.daily_ideas i where i.id = idea_id and i.active)
  );

-- Credit history: read-only from the browser (rows come from sync_topic_credit()).
drop policy if exists "credit_events read own" on public.credit_events;
create policy "credit_events read own" on public.credit_events for select
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Stamps: public (shown on profiles); written only by award_stamps().
drop policy if exists "user_stamps read" on public.user_stamps;
create policy "user_stamps read" on public.user_stamps for select using (true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. PRIVILEGE HARDENING
--     A user may create/edit their OWN profile row (RLS above), but must never
--     grant themselves admin, sub-admin permissions, a paid subscription, or
--     un-ban themselves. This trigger pins those columns for everyone except the
--     service role (payment/grant server) and existing admins — on INSERT *and*
--     UPDATE. INSERT matters because "profiles insert self" would otherwise let a
--     brand-new user insert is_admin=true or subscription_plan='all_access'.
--     Learning credits are pinned the same way: the database works them out
--     (sync_topic_credit, section 11b), so the leaderboard cannot be typed into.
--     sync_topic_credit switches leap.credit_sync on for its own update only.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.protect_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_admin                 := false;
    new.permissions              := null;
    new.subscription_plan        := 'none';
    new.subscription_valid_until := null;
    new.banned                   := false;
    new.learning_credits         := 0;
    new.topic_credits            := '{}'::jsonb;
  else
    new.is_admin                 := old.is_admin;
    new.permissions              := old.permissions;
    new.subscription_plan        := old.subscription_plan;
    new.subscription_valid_until := old.subscription_valid_until;
    new.banned                   := old.banned;
    if coalesce(current_setting('leap.credit_sync', true), '') <> 'on' then
      new.learning_credits := old.learning_credits;
      new.topic_credits    := old.topic_credits;
    end if;
  end if;
  return new;
end;
$$;

-- Replace the old subscription-only (update-only) trigger.
drop trigger  if exists protect_subscription_cols on public.profiles;
drop function if exists public.protect_subscription_cols();
drop trigger  if exists protect_privileged_cols on public.profiles;
create trigger protect_privileged_cols
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_cols();


-- ─────────────────────────────────────────────────────────────────────────────
-- 11b. LEARNING ENGAGEMENT — credits, stamps, idea of the day, leaderboard
--      Credits are worked out here, from what a learner has actually done, and
--      written by triggers; the browser only reads them. Same code as
--      migrations/2026-11-08-ideas-standing-resume.sql.
-- ─────────────────────────────────────────────────────────────────────────────
-- ── Course ratings: keep courses.rating / rating_count in step ─────────────
-- Recomputed from scratch for the affected topic: cheap (indexed) and immune to
-- the drift of +1 / -1 arithmetic.
create or replace function public.sync_course_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target text := coalesce(new.course_id, old.course_id);
begin
  update public.courses c
     set rating = coalesce((select round(avg(r.stars)::numeric, 2) from public.course_ratings r where r.course_id = target), 0),
         rating_count = (select count(*) from public.course_ratings r where r.course_id = target)
   where c.id = target;
  return null;
end;
$$;

drop trigger if exists course_ratings_sync on public.course_ratings;
create trigger course_ratings_sync
  after insert or update or delete on public.course_ratings
  for each row execute function public.sync_course_rating();

-- ── Credits ──────────────────────────────────────────────────────────────────
-- One learner's credit for one topic. Mirrors topicCreditNow() in lib/credits.ts:
--   quality  = the ladder below, applied to the attempt-weighted score over the
--              questions of the checkpoints attempted so far (latest attempt each)
--   progress = (videos completed + checkpoints attempted) / (videos + checkpoints)
--   credit   = round(quality × progress)        0–100; 0 for a topic with no questions
-- Once everything is done, progress is 1 and this is the full topic credit.
create or replace function public.topic_credit(p_user text, p_course text)
returns int language sql stable security definer set search_path = public as $$
  with qs as (
    select q.id as question_id, q.assignment_id
      from public.questions q
      join public.assignments a on a.id = q.assignment_id
     where a.course_id = p_course
  ),
  latest as (
    select distinct on (s.assignment_id) s.assignment_id, s.feedback
      from public.submissions s
     where s.user_id = p_user and s.course_id = p_course
     order by s.assignment_id, s.attempt_number desc, s.submitted_at desc
  ),
  graded as (
    select qs.question_id,
           (select case
                     when f ->> 'attempts' is null then case when coalesce((f ->> 'correct')::boolean, false) then 1.0 else 0 end
                     when not coalesce((f ->> 'solved')::boolean, false) then 0
                     when (f ->> 'attempts')::numeric <= 1 then 1.0
                     when (f ->> 'attempts')::numeric = 2 then 0.7
                     when (f ->> 'attempts')::numeric = 3 then 0.4
                     else 0
                   end
              from jsonb_array_elements(case when jsonb_typeof(l.feedback) = 'array' then l.feedback else '[]'::jsonb end) f
             where f ->> 'questionId' = qs.question_id
             limit 1) as weight
      from qs
      join latest l on l.assignment_id = qs.assignment_id
  ),
  agg as (
    select (select count(*) from qs)                                              as total_q,
           (select count(*) from graded)                                          as attempted_q,
           (select coalesce(sum(coalesce(weight, 0)), 0) from graded)             as weight_sum,
           (select count(*) from public.videos v where v.course_id = p_course)    as total_v,
           (select count(*) from public.video_progress vp
              join public.videos v on v.id = vp.video_id
             where vp.user_id = p_user and v.course_id = p_course and vp.completed) as done_v,
           (select count(*) from public.assignments a where a.course_id = p_course) as total_a,
           (select count(*) from latest)                                          as done_a
  )
  select case
           when total_q = 0 or attempted_q = 0 then 0
           else round(
                  (case
                     when weight_sum * 100.0 / attempted_q > 85 then 100
                     when weight_sum * 100.0 / attempted_q > 75 then 90
                     when weight_sum * 100.0 / attempted_q > 65 then 80
                     when weight_sum * 100.0 / attempted_q > 55 then 70
                     when weight_sum * 100.0 / attempted_q > 45 then 60
                     when weight_sum * 100.0 / attempted_q > 0  then 50
                     else 40
                   end) * least(done_v + done_a, total_v + total_a)::numeric
                  / greatest(1, total_v + total_a)
                )::int
         end
    from agg;
$$;

-- Recalculates one topic's credit and, when it went up (the best result is kept),
-- writes the profile and a credit_events row. Called by the triggers below.
create or replace function public.sync_topic_credit(p_user text, p_course text, p_at timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
declare
  v_credits jsonb;
  v_old     int;
  v_new     int;
  v_total   int;
begin
  if p_user is null or p_course is null then
    return;
  end if;
  select topic_credits into v_credits from public.profiles where id = p_user for update;
  if not found then
    return;
  end if;
  if v_credits is null or jsonb_typeof(v_credits) <> 'object' then
    v_credits := '{}'::jsonb;
  end if;

  v_new := public.topic_credit(p_user, p_course);
  v_old := case when jsonb_typeof(v_credits -> p_course) = 'number' then (v_credits ->> p_course)::numeric::int else 0 end;
  if v_new <= v_old then
    return;
  end if;

  v_credits := jsonb_set(v_credits, array[p_course], to_jsonb(v_new));
  select coalesce(sum(case when jsonb_typeof(value) = 'number' then value::text::numeric else 0 end), 0)::int
    into v_total
    from jsonb_each(v_credits);

  -- protect_privileged_cols lets this one update through (and nothing else).
  perform set_config('leap.credit_sync', 'on', true);
  update public.profiles set topic_credits = v_credits, learning_credits = v_total where id = p_user;
  perform set_config('leap.credit_sync', 'off', true);

  insert into public.credit_events (user_id, course_id, amount, total_after, created_at)
       values (p_user, p_course, v_new - v_old, v_total, coalesce(p_at, now()));
end;
$$;


-- ── Stamps ───────────────────────────────────────────────────────────────────
-- Topics finished: every video completed and every checkpoint attempted (lib/credits.ts topicComplete).
create or replace function public.completed_topic_count(p_user text)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
    from public.courses c
   where exists (select 1 from public.videos v where v.course_id = c.id)
     and not exists (
           select 1 from public.videos v
            where v.course_id = c.id
              and not exists (select 1 from public.video_progress p
                               where p.user_id = p_user and p.video_id = v.id and p.completed))
     and not exists (
           select 1 from public.assignments a
            where a.course_id = c.id
              and not exists (select 1 from public.submissions s
                               where s.user_id = p_user and s.assignment_id = a.id));
$$;

-- Days in a row (India time) with learning activity: watching or finishing a
-- video, submitting a checkpoint, answering an idea of the day.
-- current_streak counts only a run that reaches today or yesterday.
create or replace function public.learning_streaks(p_user text)
returns table (current_streak int, best_streak int)
language sql stable security definer set search_path = public as $$
  with days as (
    select distinct d from (
      select (completed_at    at time zone 'Asia/Kolkata')::date as d from public.video_progress where user_id = p_user and completed_at is not null
      union all
      select (last_watched_at at time zone 'Asia/Kolkata')::date      from public.video_progress where user_id = p_user and last_watched_at is not null
      union all
      select (submitted_at    at time zone 'Asia/Kolkata')::date      from public.submissions    where user_id = p_user and submitted_at is not null
      union all
      select (created_at      at time zone 'Asia/Kolkata')::date      from public.idea_responses where user_id = p_user
    ) x
  ),
  runs as (
    select max(d) as last_day, count(*)::int as len
      from (select d, d - (row_number() over (order by d))::int as grp from days) g
     group by grp
  )
  select coalesce((select r.len from runs r
                    where r.last_day >= (now() at time zone 'Asia/Kolkata')::date - 1
                    order by r.last_day desc limit 1), 0),
         coalesce((select max(r.len) from runs r), 0);
$$;

-- Awards every stamp the learner has reached and does not hold yet. The ids and
-- thresholds match STAMP_RULES in lib/stamps.ts.
create or replace function public.award_stamps(p_user text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_videos  int;
  v_passed  int;
  v_perfect boolean;
  v_topics  int;
  v_credits int;
  v_ideas   int;
  v_best    int;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    return;
  end if;
  select count(*) into v_videos from public.video_progress where user_id = p_user and completed;
  select count(distinct assignment_id) into v_passed from public.submissions where user_id = p_user and passed;
  select exists (select 1 from public.submissions where user_id = p_user and score >= 100) into v_perfect;
  select coalesce(learning_credits, 0) into v_credits from public.profiles where id = p_user;
  select count(*) into v_ideas from public.idea_responses where user_id = p_user;
  v_topics := public.completed_topic_count(p_user);
  select best_streak into v_best from public.learning_streaks(p_user);

  insert into public.user_stamps (user_id, stamp_id)
  select p_user, t.stamp
    from (values
      ('first_video',      v_videos  >= 1),
      ('videos_10',        v_videos  >= 10),
      ('first_checkpoint', v_passed  >= 1),
      ('perfect_score',    v_perfect),
      ('first_topic',      v_topics  >= 1),
      ('topics_5',         v_topics  >= 5),
      ('topics_10',        v_topics  >= 10),
      ('tier_learner',     v_credits >= 501),
      ('tier_advanced',    v_credits >= 1001),
      ('tier_star',        v_credits >= 2000),
      ('streak_7',         coalesce(v_best, 0) >= 7),
      ('ideas_7',          v_ideas   >= 7)
    ) as t(stamp, earned)
   where t.earned
  on conflict do nothing;
end;
$$;


-- ── Triggers that keep credits and stamps current ────────────────────────────
create or replace function public.on_submission_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_topic_credit(new.user_id, new.course_id);
  perform public.award_stamps(new.user_id);
  return null;
end;
$$;

create or replace function public.on_video_completed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_topic_credit(
    new.user_id,
    coalesce(new.course_id, (select v.course_id from public.videos v where v.id = new.video_id))
  );
  perform public.award_stamps(new.user_id);
  return null;
end;
$$;

create or replace function public.on_idea_answered()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_stamps(new.user_id);
  return null;
end;
$$;

drop trigger if exists submissions_credit_sync on public.submissions;
create trigger submissions_credit_sync
  after insert on public.submissions
  for each row execute function public.on_submission_progress();

-- Only a video turning complete counts. Saving the playback position (every few
-- seconds while someone watches) does not touch `completed`, so it fires nothing.
drop trigger if exists video_progress_completed_ins on public.video_progress;
create trigger video_progress_completed_ins
  after insert on public.video_progress
  for each row when (new.completed) execute function public.on_video_completed();

drop trigger if exists video_progress_completed_upd on public.video_progress;
create trigger video_progress_completed_upd
  after update of completed on public.video_progress
  for each row when (new.completed and not coalesce(old.completed, false))
  execute function public.on_video_completed();

drop trigger if exists idea_responses_stamps on public.idea_responses;
create trigger idea_responses_stamps
  after insert on public.idea_responses
  for each row execute function public.on_idea_answered();


-- ── Functions the app calls ──────────────────────────────────────────────────
-- The idea for one learner on one day (the learner's own calendar date):
--   1. an active idea scheduled for that day, for their path or for everyone
--      (one for their path wins);
--   2. otherwise a daily rotation through the active ideas scheduled before that
--      day or not scheduled at all, so the card still changes every day.
-- Mirrored by ideaForDay() in lib/ideas.ts, which the admin schedule preview uses.
create or replace function public.idea_for_day(p_role text, p_day date)
returns setof public.daily_ideas language plpgsql stable set search_path = public as $$
declare
  v_n int;
begin
  return query
    select i.* from public.daily_ideas i
     where i.active and i.show_on = p_day
       and (i.audience = 'all' or i.audience = p_role)
     order by (i.audience <> 'all') desc, i.created_at desc, i.id collate "C"
     limit 1;
  if found then
    return;
  end if;
  select count(*) into v_n from public.daily_ideas i
   where i.active and (i.audience = 'all' or i.audience = p_role)
     and (i.show_on is null or i.show_on < p_day);
  if v_n = 0 then
    return;
  end if;
  return query
    select i.* from public.daily_ideas i
     where i.active and (i.audience = 'all' or i.audience = p_role)
       and (i.show_on is null or i.show_on < p_day)
     order by i.show_on nulls last, i.created_at, i.id collate "C"
    offset (((p_day - date '2024-01-01') % v_n) + v_n) % v_n
     limit 1;
end;
$$;

-- How everyone answered one idea: votes per option.
create or replace function public.idea_stats(p_idea text)
returns table (option_index int, votes int)
language sql stable security definer set search_path = public as $$
  select r.option_index, count(*)::int
    from public.idea_responses r
   where r.idea_id = p_idea
   group by r.option_index;
$$;

-- Learners ranked by credits: all time ('all') or earned this month in India time
-- ('month'), optionally within one path. Returns the top p_limit learners with
-- any credits, plus the learner asking wherever they stand. Admins and suspended
-- accounts are left out. rank is shared on a tie (1, 2, 2, 4).
create or replace function public.leaderboard(p_period text default 'all', p_role text default null, p_limit int default 10)
returns table (rank int, user_id text, name text, username text, avatar_url text, role text, credits int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with me as (
    select auth.jwt() ->> 'sub' as id
  ),
  month_start as (
    select date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as t
  ),
  monthly as (
    select e.user_id, sum(e.amount)::int as credits
      from public.credit_events e
     where p_period = 'month' and e.created_at >= (select t from month_start)
     group by e.user_id
  ),
  pool as (
    select p.id, p.name, p.username, p.avatar_url, p.role,
           case when p_period = 'month' then coalesce(m.credits, 0) else coalesce(p.learning_credits, 0) end as credits
      from public.profiles p
      left join monthly m on m.user_id = p.id
     where not coalesce(p.is_admin, false)
       and not coalesce(p.banned, false)
       and (p_role is null or p.role = p_role)
  ),
  ranked as (
    select pool.*,
           (rank() over (order by pool.credits desc))::int as rnk,
           row_number() over (order by pool.credits desc, pool.name, pool.id) as rn
      from pool
  )
  select r.rnk, r.id, r.name, r.username, r.avatar_url, r.role, r.credits::int, r.id = (select id from me)
    from ranked r
   where (r.rn <= greatest(1, least(coalesce(p_limit, 10), 50)) and r.credits > 0)
      or r.id = (select id from me)
   order by r.rn;
$$;

-- What a public profile shows about someone's learning, without exposing their
-- private progress rows.
create or replace function public.public_profile_stats(p_user text)
returns table (comments int, videos_completed int, topics_completed int, current_streak int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from public.video_comments where user_id = p_user),
         (select count(*)::int from public.video_progress where user_id = p_user and completed),
         public.completed_topic_count(p_user),
         (select s.current_streak from public.learning_streaks(p_user) s);
$$;

-- Internal helpers are not for calling from the browser.
revoke all on function public.topic_credit(text, text)                         from public, anon, authenticated;
revoke all on function public.sync_topic_credit(text, text, timestamptz)       from public, anon, authenticated;
revoke all on function public.completed_topic_count(text)                      from public, anon, authenticated;
revoke all on function public.learning_streaks(text)                           from public, anon, authenticated;
revoke all on function public.award_stamps(text)                               from public, anon, authenticated;
revoke all on function public.leaderboard(text, text, int)                     from public, anon;
revoke all on function public.idea_stats(text)                                 from public, anon;
revoke all on function public.public_profile_stats(text)                       from public, anon;
grant execute on function public.leaderboard(text, text, int)                  to authenticated, service_role;
grant execute on function public.idea_stats(text)                              to authenticated, service_role;
grant execute on function public.public_profile_stats(text)                    to authenticated, service_role;
grant execute on function public.idea_for_day(text, date)                      to anon, authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. PERFORMANCE INDEXES
--     Postgres does NOT auto-index foreign keys. Every per-user RLS query and
--     join below scans without these. Pure speed-up — no behavior change.
-- ─────────────────────────────────────────────────────────────────────────────
-- Commerce
create index if not exists payments_user_idx           on public.payments (user_id, created_at desc);
create index if not exists idx_payments_order          on public.payments (razorpay_order_id);
create index if not exists idx_course_purchases_user   on public.course_purchases (user_id);
create index if not exists idx_course_purchases_course on public.course_purchases (course_id);
create index if not exists idx_category_passes_user    on public.category_passes (user_id);
-- Receipts needing follow-up (grant_failed + stuck-pending). Replaces the old
-- grant_failed-only partial index.
drop index if exists payments_flagged_idx;
create index if not exists payments_attention_idx on public.payments (grant_status, created_at)
  where grant_status <> 'granted';

-- Content & learner state
create index if not exists idx_videos_course           on public.videos (course_id);
create index if not exists idx_assignments_course      on public.assignments (course_id);
create index if not exists idx_questions_assignment    on public.questions (assignment_id);
create index if not exists idx_courses_published       on public.courses (published);
create index if not exists idx_enrollments_user        on public.enrollments (user_id);
create index if not exists idx_enrollments_course      on public.enrollments (course_id);
create index if not exists idx_video_progress_user     on public.video_progress (user_id);
create index if not exists idx_video_progress_course   on public.video_progress (course_id);
create index if not exists idx_video_progress_video    on public.video_progress (video_id);
create index if not exists idx_submissions_user        on public.submissions (user_id);
create index if not exists idx_submissions_assignment  on public.submissions (assignment_id);
create index if not exists idx_submissions_course      on public.submissions (course_id);
create index if not exists idx_user_notes_user         on public.user_notes (user_id);
create index if not exists idx_user_notes_video        on public.user_notes (video_id);
create index if not exists idx_session_attendees_user  on public.session_attendees (user_id);

-- Community
create index if not exists idx_community_posts_created on public.community_posts (created_at desc);
create index if not exists idx_post_comments_post      on public.post_comments (post_id);
create index if not exists idx_post_comments_parent    on public.post_comments (parent_id);
create index if not exists idx_post_likes_post         on public.post_likes (post_id);
create index if not exists idx_post_likes_user         on public.post_likes (user_id);
create index if not exists idx_comment_likes_comment   on public.comment_likes (comment_id);
create index if not exists idx_comment_likes_user      on public.comment_likes (user_id);
create index if not exists idx_video_comments_video    on public.video_comments (video_id, created_at);
create index if not exists idx_video_comments_parent   on public.video_comments (parent_id);
create index if not exists idx_video_comment_likes_comment on public.video_comment_likes (comment_id);
create index if not exists idx_video_comment_likes_user    on public.video_comment_likes (user_id);
create index if not exists notifications_user_idx      on public.notifications (user_id, read);
create index if not exists idx_notifications_actor     on public.notifications (actor_id);

-- CMS
create index if not exists idx_articles_published      on public.articles (published, created_at desc);
create index if not exists idx_announcements_published on public.announcements (published, pinned, created_at desc);
create index if not exists idx_faqs_published          on public.faqs (published, order_index);

-- Telegram
create index if not exists telegram_link_tokens_user_idx    on public.telegram_link_tokens (user_id);
create index if not exists telegram_link_tokens_expires_idx on public.telegram_link_tokens (expires_at);

-- Learning engagement (idea of the day, credits, stamps, resume, profile stats)
create index if not exists course_ratings_course_idx    on public.course_ratings (course_id);
create index if not exists course_ratings_user_idx      on public.course_ratings (user_id);
create index if not exists idx_daily_ideas_show_on      on public.daily_ideas (show_on) where active;
create index if not exists idx_idea_responses_idea      on public.idea_responses (idea_id);
create index if not exists idx_credit_events_user       on public.credit_events (user_id, created_at desc);
create index if not exists idx_credit_events_created    on public.credit_events (created_at);
create index if not exists idx_video_progress_recent    on public.video_progress (user_id, last_watched_at desc);
create index if not exists idx_submissions_user_course  on public.submissions (user_id, course_id);
create index if not exists idx_video_comments_user      on public.video_comments (user_id);
create index if not exists idx_notifications_user_time  on public.notifications (user_id, created_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12b. STORAGE + ONE-TIME BACKFILLS
--      Both are safe to re-run: the bucket upsert changes nothing the second
--      time, and the credit backfill runs only while credit_events is empty.
-- ─────────────────────────────────────────────────────────────────────────────
-- ── Media storage bucket ─────────────────────────────────────────────────────
-- Uploads (covers, notes, workbooks, avatars, audio) live in the public `media`
-- bucket; rows keep only the short URL (see migrations/2026-08-19-media-storage.sql).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media public read"    on storage.objects;
drop policy if exists "media authed insert"  on storage.objects;
drop policy if exists "media admin update"   on storage.objects;
drop policy if exists "media admin delete"   on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media authed insert" on storage.objects
  for insert with check (bucket_id = 'media' and (select auth.jwt() ->> 'sub') is not null);
create policy "media admin update" on storage.objects
  for update using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media admin delete" on storage.objects
  for delete using (bucket_id = 'media' and (select public.is_admin()));

-- ── Credits and stamps for what learners had already done ───────────────────
-- Runs only while credit_events is empty, so running this file again does not
-- add the history twice. A topic credit the learner already had from finishing
-- the topic is kept when it is higher than the recalculated one (capped at 100).
do $$
declare
  r        record;
  v_old    jsonb;
  v_keep   int;
  v_prev   int;
  v_total  int;
begin
  if exists (select 1 from public.credit_events) then
    return;
  end if;
  perform set_config('leap.credit_sync', 'on', true);

  for r in
    select x.user_id, x.course_id, max(x.at) as at
      from (
        select vp.user_id, coalesce(vp.course_id, v.course_id) as course_id,
               coalesce(vp.completed_at, vp.last_watched_at, now()) as at
          from public.video_progress vp
          left join public.videos v on v.id = vp.video_id
         where vp.completed
        union all
        select s.user_id, s.course_id, coalesce(s.submitted_at, now())
          from public.submissions s
      ) x
      join public.profiles p on p.id = x.user_id
      join public.courses c on c.id = x.course_id
     group by x.user_id, x.course_id
     order by x.user_id, max(x.at)
  loop
    select topic_credits into v_old from public.profiles where id = r.user_id;
    if v_old is null or jsonb_typeof(v_old) <> 'object' then
      v_old := '{}'::jsonb;
    end if;
    v_prev := case when jsonb_typeof(v_old -> r.course_id) = 'number'
                   then least(100, greatest(0, (v_old ->> r.course_id)::numeric::int)) else 0 end;
    v_keep := public.topic_credit(r.user_id, r.course_id);
    -- Only a finished topic can carry an earlier, higher credit.
    if v_prev > v_keep and exists (
         select 1 from public.courses c where c.id = r.course_id
            and exists (select 1 from public.videos v where v.course_id = c.id)
            and not exists (select 1 from public.videos v where v.course_id = c.id
                              and not exists (select 1 from public.video_progress p
                                               where p.user_id = r.user_id and p.video_id = v.id and p.completed))
            and not exists (select 1 from public.assignments a where a.course_id = c.id
                              and not exists (select 1 from public.submissions s
                                               where s.user_id = r.user_id and s.assignment_id = a.id))) then
      v_keep := v_prev;
    end if;
    if v_keep > 0 then
      insert into public.credit_events (user_id, course_id, amount, total_after, created_at)
           values (r.user_id, r.course_id, v_keep, 0, r.at);
    end if;
  end loop;

  -- Profiles: topic_credits / learning_credits rebuilt from the events above.
  update public.profiles p
     set topic_credits = coalesce(t.credits, '{}'::jsonb),
         learning_credits = coalesce(t.total, 0)
    from (
      select p2.id,
             (select jsonb_object_agg(e.course_id, e.amount) from public.credit_events e where e.user_id = p2.id) as credits,
             (select sum(e.amount)::int from public.credit_events e where e.user_id = p2.id) as total
        from public.profiles p2
    ) t
   where t.id = p.id
     and (coalesce(p.learning_credits, 0) <> coalesce(t.total, 0)
          or coalesce(p.topic_credits, '{}'::jsonb) <> coalesce(t.credits, '{}'::jsonb));

  -- Running totals on the events, in time order per learner.
  update public.credit_events e
     set total_after = s.running
    from (
      select id, sum(amount) over (partition by user_id order by created_at, id) as running
        from public.credit_events
    ) s
   where s.id = e.id;

  perform set_config('leap.credit_sync', 'off', true);

  for r in select id from public.profiles loop
    perform public.award_stamps(r.id);
  end loop;
end $$;

-- PostgREST caches tables and functions; refresh so the new ones work at once.
notify pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. AFTER SETUP (one-time bootstrap)
--     1) Sign up once with your admin email via Clerk — the app provisions your
--        profile row keyed by your Clerk user id.
--     2) Make that profile the owner. The protect_privileged_cols trigger pins
--        is_admin for everyone except the service role, so disable it for this
--        one-time bootstrap (a plain UPDATE is otherwise silently reverted):
--
--          alter table public.profiles disable trigger protect_privileged_cols;
--          update public.profiles set is_admin = true, role = null
--            where email = 'you@admin.com';
--          alter table public.profiles enable trigger protect_privileged_cols;
--
--     3) In the app: Admin → Content Studio — add your coaching topics, team,
--        books, articles, FAQs, announcements, pricing and coupons. The app
--        shows only real data; this file seeds none.
-- ─────────────────────────────────────────────────────────────────────────────
