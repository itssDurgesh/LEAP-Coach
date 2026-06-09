-- ════════════════════════════════════════════════════════════════
-- Leap Coach — CMS + Discussion Board + Profiles migration
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- Adds: editable homepage content, team/mentors, book showcase,
-- threaded discussion comments + likes, in-app notifications,
-- and bio/headline columns on profiles.
-- Safe to re-run (idempotent: "if not exists" + drop-policy guards).
-- ════════════════════════════════════════════════════════════════

-- ── profile additions (public profile fields) ──
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists username text;
-- case-insensitive unique handle (multiple NULLs allowed)
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- ── sub-admin permissions (null = full owner; array = limited sub-admin) ──
alter table public.profiles add column if not exists permissions jsonb;

-- ── per-topic "starting from" price (pricing_tiers from pricing-bundles.sql) ──
alter table public.pricing_tiers add column if not exists per_topic_from int default 999;

-- ── content studio additions: multi-category, thumbnail, workbook, approval ──
alter table public.courses add column if not exists categories text[] default '{}';
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists workbook_name text;
alter table public.courses add column if not exists workbook_url text;
alter table public.courses add column if not exists pending_approval boolean default false;
alter table public.courses add column if not exists submitted_by uuid;
alter table public.videos  add column if not exists notes_file_url text;

-- ─────────────── editable homepage / site content (singleton) ───────────────
create table if not exists public.site_content (
  id int primary key default 1,
  content jsonb not null default '{}',
  updated_at timestamptz default now(),
  constraint site_content_singleton check (id = 1)
);

-- ─────────────────────────── team / mentors ───────────────────────────
create table if not exists public.team_members (
  id text primary key,
  name text not null,
  title text,
  member_group text default 'mentor',
  photo_url text,
  bio text,
  vision text,
  links jsonb default '{}',
  featured boolean default false,
  order_index int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ─────────────────────────── book showcase ───────────────────────────
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text,
  cover_url text,
  blurb text,
  link text,
  order_index int default 0,
  active boolean default true
);

-- ──────────────── discussion board: threaded comments ────────────────
create table if not exists public.post_comments (
  id text primary key,
  post_id text references public.community_posts (id) on delete cascade,
  parent_id text references public.post_comments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  user_name text,
  user_role text,
  text text,
  mentions jsonb default '[]',
  created_at timestamptz default now(),
  edited_at timestamptz
);

create table if not exists public.comment_likes (
  comment_id text references public.post_comments (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  primary key (comment_id, user_id)
);

-- ───────────────────────── notifications ─────────────────────────
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,   -- recipient
  type text check (type in ('reply','mention')),
  actor_id uuid references public.profiles (id) on delete cascade,
  actor_name text,
  post_id text,
  comment_id text,
  preview text,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read);

-- ════════════════════════════ RLS ════════════════════════════
alter table public.site_content  enable row level security;
alter table public.team_members  enable row level security;
alter table public.books         enable row level security;
alter table public.post_comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.notifications enable row level security;

-- Public content (read by all, written by admins only).
do $$ declare t text; begin
  foreach t in array array['site_content','team_members','books'] loop
    execute format('drop policy if exists "%1$s read" on public.%1$I;', t);
    execute format('drop policy if exists "%1$s admin write" on public.%1$I;', t);
    execute format('create policy "%1$s read" on public.%1$I for select using (true);', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;

-- Comments: everyone reads; author inserts; author or admin edits/deletes.
drop policy if exists "comments read"   on public.post_comments;
drop policy if exists "comments insert" on public.post_comments;
drop policy if exists "comments update" on public.post_comments;
drop policy if exists "comments delete" on public.post_comments;
create policy "comments read"   on public.post_comments for select using (true);
create policy "comments insert" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments update" on public.post_comments for update using (auth.uid() = user_id or public.is_admin());
create policy "comments delete" on public.post_comments for delete using (auth.uid() = user_id or public.is_admin());

-- Comment likes: counts public; owner writes own row.
drop policy if exists "comment_likes read"   on public.comment_likes;
drop policy if exists "comment_likes insert" on public.comment_likes;
drop policy if exists "comment_likes delete" on public.comment_likes;
create policy "comment_likes read"   on public.comment_likes for select using (true);
create policy "comment_likes insert" on public.comment_likes for insert with check (auth.uid() = user_id);
create policy "comment_likes delete" on public.comment_likes for delete using (auth.uid() = user_id);

-- Notifications: recipient (or admin) reads; the actor creates them; recipient
-- (or admin) updates (mark read) / deletes.
drop policy if exists "notifications read"   on public.notifications;
drop policy if exists "notifications insert" on public.notifications;
drop policy if exists "notifications update" on public.notifications;
drop policy if exists "notifications delete" on public.notifications;
create policy "notifications read"   on public.notifications for select using (auth.uid() = user_id or public.is_admin());
create policy "notifications insert" on public.notifications for insert with check (auth.uid() = actor_id);
create policy "notifications update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications delete" on public.notifications for delete using (auth.uid() = user_id or public.is_admin());
