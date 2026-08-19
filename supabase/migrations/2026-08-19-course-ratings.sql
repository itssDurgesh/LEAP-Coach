-- ─────────────────────────────────────────────────────────────────────────────
-- Course ratings — one rating per learner per topic, with a trigger that keeps
-- courses.rating / courses.rating_count in sync automatically.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL editor and execute.
-- It is idempotent — safe to run more than once.
--
-- Why a trigger rather than recomputing in app code: courses.rating is read on
-- the landing page, the catalog and every course card. If the aggregate were
-- maintained by the client, a dropped request would leave the displayed average
-- permanently wrong with no way to notice. The trigger makes the average a pure
-- function of the rows in course_ratings.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.course_ratings (
  id          text primary key,
  user_id     text not null,
  course_id   text not null references public.courses(id) on delete cascade,
  stars       int  not null check (stars between 1 and 5),
  review      text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  -- One rating per learner per topic. Re-rating updates the existing row.
  unique (user_id, course_id)
);

create index if not exists course_ratings_course_idx on public.course_ratings (course_id);
create index if not exists course_ratings_user_idx   on public.course_ratings (user_id);

-- ── Aggregate sync ───────────────────────────────────────────────────────────
-- Recompute from scratch for the affected course. Cheap (indexed, few hundred
-- rows at most) and immune to drift, unlike incremental +1/-1 arithmetic.
create or replace function public.sync_course_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text := coalesce(new.course_id, old.course_id);
begin
  update public.courses c
     set rating = coalesce((
           select round(avg(r.stars)::numeric, 2)
             from public.course_ratings r
            where r.course_id = target
         ), 0),
         rating_count = (
           select count(*) from public.course_ratings r where r.course_id = target
         )
   where c.id = target;
  return null;
end;
$$;

drop trigger if exists course_ratings_sync on public.course_ratings;
create trigger course_ratings_sync
  after insert or update or delete on public.course_ratings
  for each row execute function public.sync_course_rating();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Same shape as the other learner-owned tables: everyone reads (ratings are
-- public), each learner writes only their own row, admins can moderate.
alter table public.course_ratings enable row level security;

drop policy if exists "course_ratings read"       on public.course_ratings;
drop policy if exists "course_ratings insert own" on public.course_ratings;
drop policy if exists "course_ratings update own" on public.course_ratings;
drop policy if exists "course_ratings delete own" on public.course_ratings;

create policy "course_ratings read" on public.course_ratings
  for select using (true);

-- A learner may only rate a topic they are actually enrolled in. Without this
-- check, anyone with the anon key could rate any topic from outside the app.
create policy "course_ratings insert own" on public.course_ratings
  for insert with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1 from public.enrollments e
       where e.user_id = (select auth.jwt() ->> 'sub')
         and e.course_id = course_ratings.course_id
    )
  );

create policy "course_ratings update own" on public.course_ratings
  for update using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()))
  with check ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

create policy "course_ratings delete own" on public.course_ratings
  for delete using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Existing courses.rating values are seed/admin numbers with no rows behind
-- them. Leave them alone: the trigger only rewrites a course once it receives a
-- real rating, so nothing resets to 0 the moment this migration runs.
