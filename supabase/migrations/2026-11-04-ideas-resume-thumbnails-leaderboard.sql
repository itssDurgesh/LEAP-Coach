-- ─────────────────────────────────────────────────────────────────────────────
-- Idea of the day, resume across devices, topic video thumbnails, the learner
-- leaderboard, and indexes for the queries behind them.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL editor and execute.
-- It is idempotent — safe to run more than once. supabase/database.sql carries
-- the same statements, so re-running that file also applies them.
--
-- Until this has run the site keeps working:
--   • Idea of the day stays hidden on the dashboard, and Admin → Idea of the Day
--     says this update is needed before ideas can be saved.
--   • Resume still works on the same device (the browser remembers the place);
--     resuming on another device needs the two video_progress columns.
--   • Topics save without a video thumbnail (one set in the editor is refused
--     with a message, so it is never silently dropped).
--   • The leaderboard is worked out in the browser from the profiles it already
--     loads, instead of by the leaderboard() function.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Idea of the day ───────────────────────────────────────────────────────
-- Admins (and sub-admins with the "content" permission) write several ideas at
-- once. The dashboard shows one a day: an idea pinned to today's date (India
-- time) if there is one, otherwise the next idea of the rotation, which moves on
-- by itself every day.
create table if not exists public.daily_ideas (
  id          text primary key,
  title       text not null default '',
  body        text not null default '',
  track_id    text,                                  -- leadership level, shown as a chip
  question    text not null default '',
  options     jsonb not null default '[]',           -- [{ "text", "good", "feedback" }]
  target_role text not null default 'all'
              check (target_role in ('all', 'student', 'professional', 'entrepreneur')),
  show_on     date,                                  -- pinned to this day; null = in the rotation
  order_index int not null default 0,                -- position in the rotation
  active      boolean not null default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.daily_ideas enable row level security;
drop policy if exists "daily_ideas read"        on public.daily_ideas;
drop policy if exists "daily_ideas admin write" on public.daily_ideas;
-- Learners read the active ideas; admins read and write all of them.
create policy "daily_ideas read" on public.daily_ideas
  for select using (active or (select public.is_admin()));
create policy "daily_ideas admin write" on public.daily_ideas
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── 2. Resume where the learner stopped, on any device ───────────────────────
-- position_seconds: the place in the video when the learner last left it.
-- last_watched_at:  when they last watched it, so the dashboard can offer the
--                   video they were most recently in, whichever topic it is.
-- (watch_seconds keeps its meaning: set to the full length on completion.)
alter table public.video_progress add column if not exists position_seconds int;
alter table public.video_progress add column if not exists last_watched_at  timestamptz;

-- ── 3. One thumbnail for every video of a topic ──────────────────────────────
-- Uploaded in the topic editor's Sessions step; shown as the poster of each
-- session's player. The topic's cover (thumbnail_url) is a separate image.
alter table public.courses add column if not exists video_thumbnail_url text;

-- ── 4. Leaderboard ───────────────────────────────────────────────────────────
-- The top learners of one track by banked credits, plus the caller's own row with
-- their rank. SECURITY DEFINER so it keeps working if profile reads are tightened,
-- and it returns only what a leaderboard shows: name, handle, avatar, credits.
-- `rank` is standard competition ranking (ties share a rank); `total` is the
-- number of learners in the track.
create or replace function public.leaderboard(p_role text, p_limit int default 5)
returns table (user_id text, name text, username text, avatar_url text, credits int, rank bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with board as (
    select p.id, p.name, p.username, p.avatar_url,
           coalesce(p.learning_credits, 0) as credits,
           rank()       over (order by coalesce(p.learning_credits, 0) desc) as rank,
           row_number() over (order by coalesce(p.learning_credits, 0) desc, p.created_at, p.id) as pos,
           count(*)     over () as total
      from public.profiles p
     where p.role = p_role
       and not coalesce(p.is_admin, false)
       and not coalesce(p.banned, false)
  )
  select b.id, b.name, b.username, b.avatar_url, b.credits, b.rank, b.total
    from board b
   where b.pos <= least(greatest(coalesce(p_limit, 5), 1), 20)
      or b.id = (select auth.jwt() ->> 'sub')
   order by b.pos;
$$;
revoke execute on function public.leaderboard(text, int) from public, anon;
grant  execute on function public.leaderboard(text, int) to authenticated;

-- ── 5. Indexes for these reads ───────────────────────────────────────────────
-- Leaderboard: learners of a track ordered by credits.
create index if not exists idx_profiles_leaderboard
  on public.profiles (role, learning_credits desc)
  where not coalesce(is_admin, false) and not coalesce(banned, false);
-- The bell's list: one user's notifications, newest first.
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
-- The profile page's "Discussion comments" count.
create index if not exists idx_video_comments_user on public.video_comments (user_id);
-- The ideas table is small, but the dashboard filters it on every load.
create index if not exists idx_daily_ideas_active on public.daily_ideas (active, show_on);

-- PostgREST caches the schema; refresh it so the new table, columns and function
-- are usable at once.
notify pgrst, 'reload schema';
