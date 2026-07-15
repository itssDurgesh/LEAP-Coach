
-- ─────────────────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";
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
  topic_credits             jsonb default '{}',   -- courseId -> best credit earned for that topic (0–100)
  subscription_plan         text default 'none' check (subscription_plan in ('none','all_access','per_course')),
  subscription_valid_until  timestamptz,
  banned                    boolean default false,
  email_opt_out             boolean default false,         -- true = excluded from broadcast emails (set via unsubscribe link)
  is_admin                  boolean default false,
  permissions               jsonb,                         -- null = full owner; array = sub-admin scope
  created_at                timestamptz default now(),
  last_active_at            timestamptz default now()
);

-- Case-insensitive unique @handles (multiple NULLs allowed).
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- Authentication is handled by Clerk, not Supabase Auth — there is no auth.users
-- table to trigger off. The app provisions a profile row (keyed by the Clerk user
-- id) on first sign-in via db.ensureProfile(), permitted by the "profiles insert
-- self" policy below. Drop any stale Supabase-auth trigger from a previous version.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- RLS helper: is the current user an admin? auth.jwt()->>'sub' is the Clerk user id
-- (Supabase validates the Clerk session token via Third-Party Auth).
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select is_admin from public.profiles where id = (auth.jwt() ->> 'sub')), false);
$$;


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
  workbook_name        text,                    -- final workbook (PDF/DOCX)
  workbook_url         text,
  pending_approval     boolean default false,   -- sub-admin submission awaiting owner
  submitted_by         text,                    -- Clerk user id of the submitting sub-admin
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
  resources        jsonb default '[]'
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

create table if not exists public.live_sessions (
  id              text primary key,
  title           text,
  course_title    text,
  instructor_name text,
  starts_at       timestamptz,
  duration_mins   int,
  meet_link       text,
  description     text,
  target_role     text default 'all',
  capacity        int default 100,
  notified_at     timestamptz,                             -- when this session was first emailed to its audience
  notified_user_ids jsonb default '[]',                    -- profile ids that have been successfully emailed (retry targets the rest)
  created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMMERCE
-- ─────────────────────────────────────────────────────────────────────────────
-- Admin-editable plan prices (single row, id = 1).
create table if not exists public.pricing_tiers (
  id             int primary key default 1,
  cat1           int not null,                 -- single-category pass
  cat2           int not null,                 -- any two categories
  cat3           int not null,                 -- all three (all-access)
  per_topic_from int default 999,              -- "from ₹X / topic" on the pricing page
  show_upgrade_info boolean default true,      -- show learners the "why this price?" upgrade explainer
  constraint pricing_tiers_singleton check (id = 1)
);
insert into public.pricing_tiers (id, cat1, cat2, cat3)
  values (1, 6000, 10000, 17000)
  on conflict (id) do nothing;

-- Discount coupons (validated/redeemed server-side via the service role).
create table if not exists public.coupons (
  code             text primary key,           -- stored uppercase
  discount_percent int  not null check (discount_percent between 1 and 100),
  category         text not null,              -- 'all' | 'student' | 'professional' | 'entrepreneur'
  active           boolean not null default true,
  max_redemptions  int,                        -- null = unlimited
  redemptions      int  not null default 0,
  expires_at       timestamptz,                -- null = no expiry
  created_at       timestamptz not null default now()
);

-- Atomic redemption counter: a single UPDATE … = redemptions + 1 is row-locked, so
-- simultaneous redemptions can't lose updates (read-then-write would). Called by the
-- server (service role) after a verified payment.
create or replace function public.increment_coupon_redemption(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.coupons set redemptions = redemptions + 1 where code = p_code;
$$;

-- Lifetime per-topic purchases (granted server-side after verified payment).
create table if not exists public.course_purchases (
  id           uuid primary key default gen_random_uuid(),
  user_id      text references public.profiles (id) on delete cascade,
  course_id    text references public.courses (id) on delete cascade,
  purchased_at timestamptz default now(),
  unique (user_id, course_id)
);

-- Category passes: unlock every topic in a category (server-granted).
create table if not exists public.category_passes (
  user_id    text not null references public.profiles (id) on delete cascade,
  category   text not null,                    -- 'student' | 'professional' | 'entrepreneur'
  granted_at timestamptz not null default now(),
  primary key (user_id, category)
);

-- Payment receipts (written ONLY by the server: the /verify route and the Razorpay
-- webhook). One row per Razorpay payment (razorpay_payment_id is unique = idempotency
-- key). grant_status flags captured-but-not-granted payments for admin follow-up.
create table if not exists public.payments (
  id                  text primary key,                 -- our receipt id, e.g. rcpt_…
  user_id             text references public.profiles (id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text unique,                       -- idempotency key
  plan                text,                              -- 'course' | 'bundle' | 'all'
  course_id           text,
  categories          text[] default '{}',
  coupon_code         text,
  amount_inr          int,                               -- amount actually paid (rupees)
  currency            text default 'INR',
  status              text default 'captured' check (status in ('captured','refunded','failed')),
  grant_status        text default 'pending'  check (grant_status in ('granted','grant_failed','pending')),
  source              text default 'verify'   check (source in ('verify','webhook')),
  notes               jsonb default '{}',
  created_at          timestamptz default now(),
  refunded_at         timestamptz
);
create index if not exists payments_user_idx    on public.payments (user_id, created_at desc);
create index if not exists payments_flagged_idx  on public.payments (grant_status) where grant_status = 'grant_failed';


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


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COMMUNITY (Discussion Board)
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
create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- Per-video discussion: YouTube-style comments under each topic video, threaded one
-- reply level, with @mentions + notifications. (Replaces the global Discussion board.)
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
  id          text primary key,
  title       text not null,
  body        text,
  target_role text default 'all',   -- 'all' | 'student' | 'professional' | 'entrepreneur'
  pinned      boolean default false,
  published   boolean default true,
  author_id   text,
  author_name text,
  notified_at timestamptz,                    -- when this announcement was first emailed to its audience
  notified_user_ids jsonb default '[]',       -- profile ids that have been successfully emailed (retry targets the rest)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Articles written by the admin, shown to learners.
create table if not exists public.articles (
  id          text primary key,
  title       text not null,
  excerpt     text default '',
  content     text default '',
  cover_url   text,
  images      jsonb default '[]',          -- inline body images ({id,url,alt}) referenced from content
  author_id   text references public.profiles (id) on delete set null,
  author_name text,
  published   boolean default false,
  archived    boolean default false,          -- hidden from learners/catalog, kept for admin records
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. UPGRADES FOR EXISTING DATABASES
--    No-ops on a fresh install; bring databases created from older versions
--    of this schema up to the final shape above.
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
--    then run this file, sign in once via Clerk, and re-seed (see section 11).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles      add column if not exists username text;
alter table public.profiles      add column if not exists headline text;
alter table public.profiles      add column if not exists bio text;
alter table public.profiles      add column if not exists permissions jsonb;
alter table public.profiles      add column if not exists topic_credits jsonb default '{}';
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
alter table public.articles      add column if not exists images jsonb default '[]';
alter table public.articles      add column if not exists archived boolean default false;
alter table public.notifications add column if not exists video_id text;
alter table public.notifications add column if not exists course_id text;
-- Notify-all-users: track delivery per item (+ per-recipient retry) + let learners opt out.
alter table public.announcements  add column if not exists notified_at timestamptz;
alter table public.live_sessions  add column if not exists notified_at timestamptz;
alter table public.announcements  add column if not exists notified_user_ids jsonb default '[]';
alter table public.live_sessions  add column if not exists notified_user_ids jsonb default '[]';
alter table public.profiles       add column if not exists email_opt_out boolean default false;

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
-- 9. ROW-LEVEL SECURITY (final state)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.profiles              enable row level security;
alter table public.leadership_tracks     enable row level security;
alter table public.courses               enable row level security;
alter table public.videos                enable row level security;
alter table public.assignments           enable row level security;
alter table public.questions             enable row level security;
alter table public.daily_tips            enable row level security;
alter table public.recommended_resources enable row level security;
alter table public.live_sessions         enable row level security;
alter table public.pricing_tiers         enable row level security;
alter table public.coupons               enable row level security;
alter table public.course_purchases      enable row level security;
alter table public.category_passes       enable row level security;
alter table public.payments              enable row level security;
alter table public.enrollments           enable row level security;
alter table public.video_progress        enable row level security;
alter table public.submissions           enable row level security;
alter table public.user_notes            enable row level security;
alter table public.session_attendees     enable row level security;
alter table public.community_posts       enable row level security;
alter table public.post_likes            enable row level security;
alter table public.post_comments         enable row level security;
alter table public.comment_likes         enable row level security;
alter table public.video_comments        enable row level security;
alter table public.video_comment_likes   enable row level security;
alter table public.notifications         enable row level security;
alter table public.site_content          enable row level security;
alter table public.team_members          enable row level security;
alter table public.books                 enable row level security;
alter table public.articles              enable row level security;
alter table public.announcements         enable row level security;

-- Profiles: readable by all; users create + edit their own row; admins manage all.
-- "insert self" replaces the old auth.users trigger — the app provisions the row
-- (db.ensureProfile) on first Clerk sign-in.
drop policy if exists "profiles read"        on public.profiles;
drop policy if exists "profiles insert self" on public.profiles;
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles admin all"   on public.profiles;
create policy "profiles read"        on public.profiles for select using (true);
create policy "profiles insert self" on public.profiles for insert with check ((auth.jwt() ->> 'sub') = id);
create policy "profiles update self" on public.profiles for update
  using ((auth.jwt() ->> 'sub') = id or public.is_admin())
  with check ((auth.jwt() ->> 'sub') = id or public.is_admin());
create policy "profiles admin all"   on public.profiles for all   using (public.is_admin()) with check (public.is_admin());

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
    execute format('create policy "%1$s admin write" on public.%1$I for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Articles: learners read only PUBLISHED, non-archived ones; admins read everything and write.
drop policy if exists "articles read"        on public.articles;
drop policy if exists "articles admin write" on public.articles;
create policy "articles read" on public.articles
  for select using ((published and not coalesce(archived, false)) or public.is_admin());
create policy "articles admin write" on public.articles
  for all using (public.is_admin()) with check (public.is_admin());

-- Announcements: learners read only PUBLISHED ones; admins read everything and write.
drop policy if exists "announcements read"        on public.announcements;
drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements read" on public.announcements
  for select using (published or public.is_admin());
create policy "announcements admin write" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- Pricing: public read; admin write.
drop policy if exists "pricing read"        on public.pricing_tiers;
drop policy if exists "pricing admin write" on public.pricing_tiers;
create policy "pricing read" on public.pricing_tiers for select using (true);
create policy "pricing admin write" on public.pricing_tiers
  for all using (public.is_admin()) with check (public.is_admin());

-- Coupons: admin-only through normal sessions (payment routes use the service role).
drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- Course purchases (HARDENED): owner/admin read; ONLY the server (service role,
-- after a verified Razorpay payment) can write.
drop policy if exists "course_purchases owner"      on public.course_purchases;  -- legacy
drop policy if exists "course_purchases admin read" on public.course_purchases;  -- legacy
drop policy if exists "course_purchases read own"   on public.course_purchases;
create policy "course_purchases read own" on public.course_purchases
  for select using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Category passes (HARDENED): owner/admin read; server-only writes.
drop policy if exists "category_passes read own" on public.category_passes;
create policy "category_passes read own" on public.category_passes
  for select using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Payments / receipts (HARDENED): a learner sees ONLY their own receipts; admins see
-- all. Writes/refunds happen ONLY server-side via the service role (no client policy).
drop policy if exists "payments read own" on public.payments;
create policy "payments read own" on public.payments
  for select using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Enrollments (HARDENED): owner/admin read; self-enrol ONLY in free topics;
-- paid enrolments are granted server-side after payment.
drop policy if exists "enrollments owner"           on public.enrollments;       -- legacy
drop policy if exists "enrollments admin read"      on public.enrollments;       -- legacy
drop policy if exists "enrollments read own"        on public.enrollments;
drop policy if exists "enrollments free self-enrol" on public.enrollments;
drop policy if exists "enrollments delete own"      on public.enrollments;
create policy "enrollments read own" on public.enrollments
  for select using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());
create policy "enrollments free self-enrol" on public.enrollments
  for insert with check (
    (auth.jwt() ->> 'sub') = user_id
    and exists (select 1 from public.courses c where c.id = course_id and c.price = 0)
  );
create policy "enrollments delete own" on public.enrollments
  for delete using ((auth.jwt() ->> 'sub') = user_id);

-- Private per-user tables: owner CRUD; admins read all.
do $$ declare t text; begin
  foreach t in array array['video_progress','submissions','user_notes'] loop
    execute format('drop policy if exists "%1$s owner" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s admin read" on public.%1$I;', t);
    execute format('create policy "%1$s owner" on public.%1$I for all using ((auth.jwt() ->> ''sub'') = user_id) with check ((auth.jwt() ->> ''sub'') = user_id);', t);
    execute format('create policy "%1$s admin read" on public.%1$I for select using (public.is_admin());', t);
  end loop;
end $$;

-- Likes & attendees: counts are public; only the owner writes their own row.
do $$ declare t text; begin
  foreach t in array array['session_attendees','post_likes','comment_likes','video_comment_likes'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s insert" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$I;', t);
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert with check ((auth.jwt() ->> ''sub'') = user_id);', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete using ((auth.jwt() ->> ''sub'') = user_id);', t);
  end loop;
end $$;

-- Discussion posts: everyone reads; author inserts; author or admin edits/deletes.
drop policy if exists "posts read"   on public.community_posts;
drop policy if exists "posts insert" on public.community_posts;
drop policy if exists "posts update" on public.community_posts;
drop policy if exists "posts delete" on public.community_posts;
create policy "posts read"   on public.community_posts for select using (true);
create policy "posts insert" on public.community_posts for insert with check ((auth.jwt() ->> 'sub') = user_id);
create policy "posts update" on public.community_posts for update using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());
create policy "posts delete" on public.community_posts for delete using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Threaded comments: same rules as posts.
drop policy if exists "comments read"   on public.post_comments;
drop policy if exists "comments insert" on public.post_comments;
drop policy if exists "comments update" on public.post_comments;
drop policy if exists "comments delete" on public.post_comments;
create policy "comments read"   on public.post_comments for select using (true);
create policy "comments insert" on public.post_comments for insert with check ((auth.jwt() ->> 'sub') = user_id);
create policy "comments update" on public.post_comments for update using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());
create policy "comments delete" on public.post_comments for delete using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Per-video discussion comments: everyone reads; author inserts; author or admin edits/deletes.
drop policy if exists "video_comments read"   on public.video_comments;
drop policy if exists "video_comments insert" on public.video_comments;
drop policy if exists "video_comments update" on public.video_comments;
drop policy if exists "video_comments delete" on public.video_comments;
create policy "video_comments read"   on public.video_comments for select using (true);
create policy "video_comments insert" on public.video_comments for insert with check ((auth.jwt() ->> 'sub') = user_id);
create policy "video_comments update" on public.video_comments for update using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());
create policy "video_comments delete" on public.video_comments for delete using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());

-- Notifications: recipient (or admin) reads; the actor creates; recipient marks read.
drop policy if exists "notifications read"   on public.notifications;
drop policy if exists "notifications insert" on public.notifications;
drop policy if exists "notifications update" on public.notifications;
drop policy if exists "notifications delete" on public.notifications;
create policy "notifications read"   on public.notifications for select using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());
create policy "notifications insert" on public.notifications for insert with check ((auth.jwt() ->> 'sub') = actor_id);
create policy "notifications update" on public.notifications for update using ((auth.jwt() ->> 'sub') = user_id);
create policy "notifications delete" on public.notifications for delete using ((auth.jwt() ->> 'sub') = user_id or public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. PRIVILEGE HARDENING
--     A user may create/edit their OWN profile row (RLS above), but must never
--     grant themselves admin, sub-admin permissions, a paid subscription, or
--     un-ban themselves. This trigger pins those columns for everyone except the
--     service role (payment/grant server) and existing admins — on INSERT *and*
--     UPDATE. INSERT matters because the "profiles insert self" policy would
--     otherwise let a brand-new user insert is_admin=true or subscription_plan=
--     'all_access' (a brand-new row's is_admin() check is false, so they're pinned).
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
  else
    new.is_admin                 := old.is_admin;
    new.permissions              := old.permissions;
    new.subscription_plan        := old.subscription_plan;
    new.subscription_valid_until := old.subscription_valid_until;
    new.banned                   := old.banned;
  end if;
  return new;
end;
$$;

-- Replace the old subscription-only (update-only) trigger.
drop trigger   if exists protect_subscription_cols on public.profiles;
drop function  if exists public.protect_subscription_cols();
drop trigger   if exists protect_privileged_cols on public.profiles;
create trigger protect_privileged_cols
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_cols();


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. PERFORMANCE INDEXES (scale)
--     Postgres does NOT auto-index foreign keys. Every per-user RLS query and join
--     below scans without these. Pure speed-up — no behavior change. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_course_purchases_user   on public.course_purchases (user_id);
create index if not exists idx_category_passes_user     on public.category_passes (user_id);
create index if not exists idx_enrollments_user         on public.enrollments (user_id);
create index if not exists idx_enrollments_course       on public.enrollments (course_id);
create index if not exists idx_video_progress_user      on public.video_progress (user_id);
create index if not exists idx_video_progress_course    on public.video_progress (course_id);
create index if not exists idx_submissions_user         on public.submissions (user_id);
create index if not exists idx_submissions_assignment   on public.submissions (assignment_id);
create index if not exists idx_user_notes_user          on public.user_notes (user_id);
create index if not exists idx_session_attendees_user   on public.session_attendees (user_id);
create index if not exists idx_videos_course            on public.videos (course_id);
create index if not exists idx_assignments_course       on public.assignments (course_id);
create index if not exists idx_questions_assignment     on public.questions (assignment_id);
create index if not exists idx_community_posts_created  on public.community_posts (created_at desc);
create index if not exists idx_post_comments_post       on public.post_comments (post_id);
create index if not exists idx_post_comments_parent     on public.post_comments (parent_id);
create index if not exists idx_post_likes_post          on public.post_likes (post_id);
create index if not exists idx_post_likes_user          on public.post_likes (user_id);
create index if not exists idx_comment_likes_comment    on public.comment_likes (comment_id);
create index if not exists idx_comment_likes_user       on public.comment_likes (user_id);
create index if not exists idx_video_comments_video     on public.video_comments (video_id, created_at);
create index if not exists idx_video_comments_parent    on public.video_comments (parent_id);
create index if not exists idx_video_comment_likes_comment on public.video_comment_likes (comment_id);
create index if not exists idx_video_comment_likes_user    on public.video_comment_likes (user_id);
create index if not exists idx_notifications_actor      on public.notifications (actor_id);
create index if not exists idx_articles_published       on public.articles (published, created_at desc);
create index if not exists idx_announcements_published   on public.announcements (published, pinned, created_at desc);
create index if not exists idx_courses_published        on public.courses (published);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11b. TELEGRAM BOT LINKING
--      Bridges the website and the standalone Telegram bot (see bot/ + docs/
--      TELEGRAM_BOT.md). Both sides talk to these tables with the service-role key,
--      so RLS is closed (no anon/authenticated access). Also shipped standalone as
--      supabase/telegram-bot.sql for running on an already-migrated database.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.telegram_link_tokens (
  token       text primary key,
  user_id     text not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists telegram_link_tokens_user_idx    on public.telegram_link_tokens (user_id);
create index if not exists telegram_link_tokens_expires_idx on public.telegram_link_tokens (expires_at);

create table if not exists public.telegram_links (
  user_id           text primary key references public.profiles (id) on delete cascade,
  chat_id           bigint not null unique,
  telegram_username text,
  linked_at         timestamptz not null default now(),
  last_seen_at      timestamptz
);

alter table public.telegram_link_tokens enable row level security;
alter table public.telegram_links        enable row level security;
-- No permissive policies → only the service-role key (website routes + bot) gets access.

-- Realtime: the bot listens for live announcement / course / notification inserts.
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
-- 11c. FAQ + PRIVACY POLICY  (also shipped standalone as supabase/faq-and-privacy.sql)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id          text primary key,
  question    text not null,
  answer      text not null,
  order_index int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_faqs_published on public.faqs (published, order_index);

create table if not exists public.site_pages (
  id             int primary key default 1,
  privacy_policy text,
  updated_at     timestamptz not null default now(),
  constraint site_pages_singleton check (id = 1)
);
insert into public.site_pages (id, privacy_policy) values (1, null) on conflict (id) do nothing;

alter table public.faqs       enable row level security;
alter table public.site_pages enable row level security;
drop policy if exists "faqs read"        on public.faqs;
drop policy if exists "faqs admin write" on public.faqs;
create policy "faqs read" on public.faqs for select using (published or public.is_admin());
create policy "faqs admin write" on public.faqs for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "site_pages read"        on public.site_pages;
drop policy if exists "site_pages admin write" on public.site_pages;
create policy "site_pages read" on public.site_pages for select using (true);
create policy "site_pages admin write" on public.site_pages for all using (public.is_admin()) with check (public.is_admin());


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. AFTER SETUP
--     Sign up once with your admin email via Clerk (the app provisions your
--     profile row keyed by your Clerk user id), then make it an admin. The
--     protect_privileged_cols trigger pins is_admin for everyone except the service
--     role, so disable it for this one-time bootstrap (a plain UPDATE is otherwise
--     silently reverted):
--
--       alter table public.profiles disable trigger protect_privileged_cols;
--       update public.profiles set is_admin = true, role = null
--         where email = 'you@admin.com';
--       alter table public.profiles enable trigger protect_privileged_cols;
--
--     Then in the app: Admin → Content Studio — add your coaching topics, team,
--     books, articles, and homepage content (the app shows only real data).
-- ─────────────────────────────────────────────────────────────────────────────
