-- ─────────────────────────────────────────────────────────────────────────────
-- Idea of the day, real credits / leaderboard / stamps, resume position, topic
-- video thumbnail, and indexes for the slimmer page loads.
--
-- HOW TO RUN: paste the whole file into the Supabase SQL editor and execute.
-- It is one transaction (all or nothing) and idempotent: safe to run again.
-- supabase/database.sql already contains everything below, so a database built
-- from that file does not need this one.
--
-- WHAT IT ADDS
--
--   1. Idea of the day. `daily_ideas` holds the ideas admins write; each can be
--      scheduled for a date (`show_on`). The dashboard asks idea_for_day() for
--      the learner's date: the idea scheduled that day, otherwise the next one
--      in a daily rotation of the earlier ideas, so the card changes every day
--      even when nothing new was scheduled. `idea_responses` keeps each
--      learner's answer; idea_stats() returns how everyone answered.
--
--   2. Credits worked out by the database. They used to be calculated in the
--      browser and written to the learner's own profile row, which any learner
--      could overwrite with any number. A real leaderboard needs numbers nobody
--      can type in, so:
--        - topic_credit() mirrors lib/credits.ts and is recalculated by a trigger
--          whenever a learner finishes a video or submits a checkpoint;
--        - credits now grow with progress through a topic (up to 100 per topic)
--          instead of arriving all at once when the last video is done;
--        - learning_credits / topic_credits can no longer be changed from the
--          browser (protect_privileged_cols pins them);
--        - every gain is written to `credit_events`, which is what the monthly
--          leaderboard adds up.
--
--   3. Leaderboard. leaderboard() ranks learners by credits, all time or this
--      month (India time), optionally within one path, and always includes the
--      learner asking.
--
--   4. Stamps awarded by the database into `user_stamps` with the date they were
--      earned, so they show on public profiles too.
--
--   5. Resume. video_progress gets `position_seconds` and `last_watched_at`, so
--      the place a learner stopped follows them across devices and the
--      dashboard can resume the video they watched last, in any topic.
--
--   6. courses.video_thumbnail_url: one picture the admin uploads in the topic
--      editor's Sessions step, shown on every video of that topic.
--
--   7. Indexes for the queries the app now makes (per-user filters, the bell).
--
-- AFTER RUNNING: existing learners' credits are recalculated once from what they
-- have actually done (videos, checkpoints), and stamps they have already earned
-- are awarded with today's date.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 1. New columns ───────────────────────────────────────────────────────────
alter table public.courses        add column if not exists video_thumbnail_url text;
alter table public.video_progress add column if not exists position_seconds int default 0;
alter table public.video_progress add column if not exists last_watched_at timestamptz;


-- ── 2. Tables ────────────────────────────────────────────────────────────────
-- Ideas admins write for the dashboard's "Idea of the day" card.
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

-- One answer per learner per idea.
create table if not exists public.idea_responses (
  user_id      text not null references public.profiles (id) on delete cascade,
  idea_id      text not null references public.daily_ideas (id) on delete cascade,
  option_index int  not null check (option_index between 0 and 9),
  created_at   timestamptz not null default now(),
  primary key (user_id, idea_id)
);

-- Every credit gain, written only by sync_topic_credit(). The monthly leaderboard sums it.
create table if not exists public.credit_events (
  id          bigint generated always as identity primary key,
  user_id     text not null references public.profiles (id) on delete cascade,
  course_id   text references public.courses (id) on delete set null,
  amount      int not null,
  total_after int not null,
  created_at  timestamptz not null default now()
);

-- Stamps the database has awarded (see award_stamps()).
create table if not exists public.user_stamps (
  user_id   text not null references public.profiles (id) on delete cascade,
  stamp_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, stamp_id)
);


-- ── 3. Row-level security for the new tables ─────────────────────────────────
alter table public.daily_ideas    enable row level security;
alter table public.idea_responses enable row level security;
alter table public.credit_events  enable row level security;
alter table public.user_stamps    enable row level security;

-- Learners read active ideas up to tomorrow (time zones), so the schedule is not
-- spoiled; admins read and write all of them.
drop policy if exists "daily_ideas read"        on public.daily_ideas;
drop policy if exists "daily_ideas admin write" on public.daily_ideas;
create policy "daily_ideas read" on public.daily_ideas for select
  using ((active and (show_on is null or show_on <= current_date + 1)) or (select public.is_admin()));
create policy "daily_ideas admin write" on public.daily_ideas for all
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- A learner sees and adds only their own answers; admins read all.
drop policy if exists "idea_responses read own"   on public.idea_responses;
drop policy if exists "idea_responses insert own" on public.idea_responses;
create policy "idea_responses read own" on public.idea_responses for select
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));
create policy "idea_responses insert own" on public.idea_responses for insert
  with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (select 1 from public.daily_ideas i where i.id = idea_id and i.active)
  );

-- Read-only from the browser: rows are written by the functions below.
drop policy if exists "credit_events read own" on public.credit_events;
create policy "credit_events read own" on public.credit_events for select
  using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

drop policy if exists "user_stamps read" on public.user_stamps;
create policy "user_stamps read" on public.user_stamps for select using (true);


-- ── 4. Credits ───────────────────────────────────────────────────────────────
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


-- ── 5. Stamps ────────────────────────────────────────────────────────────────
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


-- ── 6. Triggers that keep credits and stamps current ─────────────────────────
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


-- ── 7. Credits can no longer be written from the browser ─────────────────────
-- Same rules as before for the admin flag, permissions, subscription and ban.
-- New: learning_credits / topic_credits are pinned too, except for the update
-- sync_topic_credit() makes (it switches leap.credit_sync on for that statement).
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


-- ── 8. Functions the app calls ───────────────────────────────────────────────
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


-- ── 9. Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_daily_ideas_show_on      on public.daily_ideas (show_on) where active;
create index if not exists idx_idea_responses_idea      on public.idea_responses (idea_id);
create index if not exists idx_credit_events_user       on public.credit_events (user_id, created_at desc);
create index if not exists idx_credit_events_created    on public.credit_events (created_at);
create index if not exists idx_video_progress_recent    on public.video_progress (user_id, last_watched_at desc);
create index if not exists idx_submissions_user_course  on public.submissions (user_id, course_id);
create index if not exists idx_video_comments_user      on public.video_comments (user_id);
create index if not exists idx_notifications_user_time  on public.notifications (user_id, created_at desc);


-- ── 10. One-time: credits and stamps for what learners have already done ─────
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

commit;
