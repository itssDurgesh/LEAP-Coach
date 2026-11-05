-- ─────────────────────────────────────────────────────────────────────────────
-- Lock paid content, checkpoint answers and private profile fields.
--
-- WHAT WAS EXPOSED. The anon key ships in every visitor's browser, and the
-- content tables were readable by everyone (`using (true)`), so anyone could ask
-- PostgREST directly for, on every topic including paid ones:
--   • each session's Mux playback id, audio file, notes file, resources and
--     transcript, and each topic's final workbook;
--   • every checkpoint's correct answer and explanation;
--   • every member's email, phone, age, gender and plan (profiles);
--   • every live session's join link;
-- and list every file in the `media` Storage bucket. Learners could also write
-- their own checkpoint submissions and credits, so scores could be made up.
--
-- WHAT THIS DOES.
--   1. user_has_course_access(): who may open a topic, the same rule as
--      lib/access.ts (free topics for anyone signed in; otherwise an all-access
--      plan, a category pass or a purchase whose window is still open; admins).
--   2. catalog(): the topic tree for the app, with session media and workbooks
--      only for the topics the caller may open, questions only for those, and
--      answers only for admins. Transcripts, notes files and full profiles come
--      from small functions that check the same rule.
--   3. Column privileges: anon / authenticated can no longer SELECT the columns
--      above from the tables at all (apply_column_privileges()).
--   4. Questions readable only by people who may open the topic; live sessions
--      only by signed-in members.
--   5. Checkpoints are graded on the server (app/api/leap/checkpoint): a new
--      checkpoint_progress table records each try, submissions are written only
--      by the server, and learning credits only by the server or an admin.
--   6. Storage: files are no longer listable by everyone (download links still
--      work; they are just no longer discoverable).
--
-- HOW TO RUN. Deploy the app version that ships with this file FIRST, then paste
-- this file into the Supabase SQL editor and run it. The new app works before and
-- after this runs; an older app version does not work after it (it reads the
-- locked columns directly). Idempotent: safe to run more than once.
--
-- LATER SCHEMA CHANGES. After adding a column to courses, videos, questions or
-- profiles, run `select public.apply_column_privileges();` so the new column is
-- readable (columns listed as private below stay hidden).
-- ─────────────────────────────────────────────────────────────────────────────

-- Columns this file relies on, for databases set up before they existed.
alter table public.videos  add column if not exists notes_file_url text;
alter table public.videos  add column if not exists audio_url text;
alter table public.videos  add column if not exists audio_name text;
alter table public.videos  add column if not exists resources jsonb default '[]';
alter table public.courses add column if not exists workbook_name text;
alter table public.courses add column if not exists workbook_url text;
alter table public.courses add column if not exists access_duration_days int;
alter table public.courses add column if not exists categories text[] default '{}';

-- ── 1. Who may open a topic ──────────────────────────────────────────────────
-- Same rule as lib/access.ts (hasAccess): every purchase lasts one year from its
-- own date (a topic's access_duration_days overrides that for an à-la-carte
-- purchase), and the topic stays open while any one of them has time left.
-- Undated entitlements never lapse. Banned accounts open nothing.
create or replace function public.user_has_course_access(p_user_id text, p_course_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_user_id, '') <> ''
    and not exists (select 1 from public.profiles b where b.id = p_user_id and coalesce(b.banned, false))
    and exists (
      select 1 from public.courses c
      where c.id = p_course_id
        and (
          coalesce(c.price, 0) = 0
          or exists (
            select 1 from public.profiles p
            where p.id = p_user_id
              and (
                coalesce(p.is_admin, false)
                or (p.subscription_plan = 'all_access'
                    and (p.subscription_valid_until is null or p.subscription_valid_until > now()))
              )
          )
          or exists (
            select 1 from public.category_passes cp
            where cp.user_id = p_user_id
              and cp.category = any (
                case when coalesce(cardinality(c.categories), 0) > 0 then c.categories else array[c.category] end
              )
              and (cp.granted_at is null or cp.granted_at + interval '365 days' > now())
          )
          or exists (
            select 1 from public.course_purchases pu
            where pu.user_id = p_user_id and pu.course_id = c.id
              and (pu.purchased_at is null
                   or pu.purchased_at + make_interval(days => case when coalesce(c.access_duration_days, 0) > 0
                                                                   then c.access_duration_days else 365 end) > now())
          )
        )
    );
$$;

-- The same question for whoever is calling (RLS policies and the functions below).
create or replace function public.has_course_access(p_course_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_has_course_access(auth.jwt() ->> 'sub', p_course_id);
$$;

-- user_has_course_access answers for ANY user id: only the server may ask that.
revoke execute on function public.user_has_course_access(text, text) from public, anon, authenticated;
grant  execute on function public.user_has_course_access(text, text) to service_role;
grant  execute on function public.has_course_access(text) to anon, authenticated, service_role;

-- ── 2. What the app reads ────────────────────────────────────────────────────
-- The topic tree, shaped like the embedded select it replaces
-- (courses + videos + assignments + questions), so the app maps it the same way.
-- Media, the workbook and the questions only for topics the caller may open;
-- answers and explanations only for admins. p_course_id = one topic, or all.
create or replace function public.catalog(p_course_id text default null)
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select auth.jwt() ->> 'sub' as uid, public.is_admin() as admin
  ),
  cs as (
    select c, public.user_has_course_access((select uid from me), c.id) as entitled
    from public.courses c
    where p_course_id is null or c.id = p_course_id
  )
  select coalesce(jsonb_agg(
    (to_jsonb(cs.c) - 'workbook_url')
    || jsonb_build_object(
      'workbook_url', case when cs.entitled then (cs.c).workbook_url end,
      'videos', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', v.id, 'course_id', v.course_id, 'title', v.title, 'order_index', v.order_index,
          'duration_seconds', v.duration_seconds, 'summary', v.summary,
          'notes_pdf_url', v.notes_pdf_url, 'audio_name', v.audio_name,
          'mux_playback_id', case when cs.entitled then v.mux_playback_id end,
          'audio_url', case when cs.entitled then v.audio_url end,
          'resources', case when cs.entitled then coalesce(v.resources, '[]'::jsonb) else '[]'::jsonb end
        ) order by v.order_index), '[]'::jsonb)
        from public.videos v where v.course_id = (cs.c).id
      ),
      'assignments', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', a.id, 'course_id', a.course_id, 'after_video_order', a.after_video_order, 'title', a.title,
          'questions', case when cs.entitled then (
            select coalesce(jsonb_agg(
              jsonb_build_object('id', q.id, 'assignment_id', q.assignment_id, 'type', q.type,
                                 'prompt', q.prompt, 'options', coalesce(q.options, '[]'::jsonb))
              || case when (select admin from me)
                   then jsonb_build_object('correct_answer', q.correct_answer, 'explanation', q.explanation)
                   else '{}'::jsonb end
              order by q.ctid), '[]'::jsonb)
            from public.questions q where q.assignment_id = a.id
          ) else '[]'::jsonb end
        ) order by a.after_video_order), '[]'::jsonb)
        from public.assignments a where a.course_id = (cs.c).id
      )
    )
  ), '[]'::jsonb)
  from cs;
$$;

-- One session's transcript (lesson page, class-notes PDF); null without access.
create or replace function public.lesson_transcript(p_video_id text)
returns text language sql stable security definer set search_path = public as $$
  select v.transcript from public.videos v
  where v.id = p_video_id and public.has_course_access(v.course_id);
$$;

-- Every transcript of one topic, for the topic editor.
create or replace function public.course_transcripts(p_course_id text)
returns table (id text, transcript text) language sql stable security definer set search_path = public as $$
  select v.id, v.transcript from public.videos v
  where v.course_id = p_course_id and public.has_course_access(p_course_id);
$$;

-- One session's uploaded class-notes file; null without access.
create or replace function public.lesson_notes_file(p_video_id text)
returns text language sql stable security definer set search_path = public as $$
  select v.notes_file_url from public.videos v
  where v.id = p_video_id and public.has_course_access(v.course_id);
$$;

-- The caller's own full profile row (email, phone, plan…), which the table no
-- longer shows to anon / authenticated.
create or replace function public.my_profile()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = (auth.jwt() ->> 'sub');
$$;

-- Every full profile row, for admins only (Users & Access, analytics, exports).
create or replace function public.admin_profiles()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where public.is_admin();
$$;

grant execute on function public.catalog(text)            to anon, authenticated, service_role;
grant execute on function public.lesson_transcript(text)  to anon, authenticated, service_role;
grant execute on function public.course_transcripts(text) to anon, authenticated, service_role;
grant execute on function public.lesson_notes_file(text)  to anon, authenticated, service_role;
-- Functions are executable by PUBLIC by default; these two are for signed-in callers.
revoke execute on function public.my_profile()            from public, anon;
revoke execute on function public.admin_profiles()        from public, anon;
grant  execute on function public.my_profile()            to authenticated, service_role;
grant  execute on function public.admin_profiles()        to authenticated, service_role;

-- ── 3. Column privileges ─────────────────────────────────────────────────────
-- anon / authenticated may SELECT every column of these tables except the private
-- ones listed here. The service role (server routes, the Telegram bot) is not
-- affected. Re-run after adding a column to one of these tables.
create or replace function public.apply_column_privileges()
returns void language plpgsql security definer set search_path = public as $$
declare
  spec constant jsonb := jsonb_build_object(
    'videos',    jsonb_build_array('mux_playback_id', 'transcript', 'notes_file_url', 'audio_url', 'resources'),
    'questions', jsonb_build_array('correct_answer', 'explanation'),
    'courses',   jsonb_build_array('workbook_url'),
    'profiles',  jsonb_build_array('email', 'phone', 'phone_verified', 'age', 'gender', 'subscription_plan',
                                   'subscription_valid_until', 'email_opt_out', 'permissions', 'last_active_at')
  );
  t text;
  hidden text[];
  cols text;
begin
  for t in select jsonb_object_keys(spec) loop
    select array_agg(x) into hidden from jsonb_array_elements_text(spec -> t) as x;
    select string_agg(quote_ident(column_name::text), ', ' order by ordinal_position) into cols
      from information_schema.columns
     where table_schema = 'public' and table_name = t and column_name::text <> all (hidden);
    -- A table-level REVOKE also clears earlier column grants, so this re-applies cleanly.
    execute format('revoke select on public.%I from anon, authenticated', t);
    execute format('grant select (%s) on public.%I to anon, authenticated', cols, t);
  end loop;
end $$;
revoke execute on function public.apply_column_privileges() from public, anon, authenticated;
select public.apply_column_privileges();

-- ── 4. Row rules ─────────────────────────────────────────────────────────────
-- Checkpoint questions: only people who may open the topic (and admins).
drop policy if exists "questions read" on public.questions;
create policy "questions read" on public.questions for select using (
  (select public.is_admin())
  or public.has_course_access((select a.course_id from public.assignments a where a.id = questions.assignment_id))
);

-- Profiles: signed-in members only. Every page that shows other people needs a
-- sign-in, and the private columns are hidden from members too (section 3).
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select using ((select auth.jwt() ->> 'sub') is not null);

-- Live sessions carry the join link: signed-in members only (as in the app).
drop policy if exists "live_sessions read" on public.live_sessions;
create policy "live_sessions read" on public.live_sessions
  for select using ((select auth.jwt() ->> 'sub') is not null);

-- ── 5. Checkpoints graded on the server ──────────────────────────────────────
-- One row per learner, question and checkpoint attempt: how many tries, which
-- wrong answers, and whether it was solved or the answer shown. Written only by
-- the server (app/api/leap/checkpoint), which builds the submission from it.
create table if not exists public.checkpoint_progress (
  user_id        text not null references public.profiles (id) on delete cascade,
  question_id    text not null references public.questions (id) on delete cascade,
  assignment_id  text not null references public.assignments (id) on delete cascade,
  attempt_number int  not null,
  tries          int  not null default 0,
  wrong          jsonb not null default '[]',
  solved         boolean not null default false,
  revealed       boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, question_id, attempt_number)
);
create index if not exists idx_checkpoint_progress_attempt
  on public.checkpoint_progress (user_id, assignment_id, attempt_number);
alter table public.checkpoint_progress enable row level security;
drop policy if exists "checkpoint_progress read own" on public.checkpoint_progress;
create policy "checkpoint_progress read own" on public.checkpoint_progress
  for select using ((select auth.jwt() ->> 'sub') = user_id or (select public.is_admin()));

-- Submissions: learners read their own (admins all); only the server writes.
drop policy if exists "submissions owner"      on public.submissions;
drop policy if exists "submissions read own"   on public.submissions;
drop policy if exists "submissions admin read" on public.submissions;
create policy "submissions read own" on public.submissions
  for select using ((select auth.jwt() ->> 'sub') = user_id);
create policy "submissions admin read" on public.submissions
  for select using ((select public.is_admin()));

-- Credits: written only by the server (after grading) or an admin. Same trigger
-- that already pins admin flags, bans and plans.
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
    new.learning_credits         := old.learning_credits;
    new.topic_credits            := old.topic_credits;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_privileged_cols on public.profiles;
create trigger protect_privileged_cols
  before insert or update on public.profiles
  for each row execute function public.protect_privileged_cols();

-- ── 6. Storage: no public listing ────────────────────────────────────────────
-- "media public read" let anyone list every object in the bucket (and so find
-- every paid file). The bucket stays public, so a file's own link still works;
-- only admins may list. Uploads need INSERT only, so learners' avatars still work.
do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'storage' and tablename = 'objects') then
    execute 'drop policy if exists "media public read" on storage.objects';
    execute 'drop policy if exists "media admin read" on storage.objects';
    execute $p$create policy "media admin read" on storage.objects
      for select using (bucket_id = 'media' and (select public.is_admin()))$p$;
  end if;
end $$;

-- Tell PostgREST about the new functions and privileges straight away.
notify pgrst, 'reload schema';

-- ── To undo (only if you must go back to an older app version) ───────────────
--   grant select on public.videos, public.questions, public.courses, public.profiles to anon, authenticated;
--   drop policy "questions read" on public.questions;
--   create policy "questions read" on public.questions for select using (true);
-- (and re-run 2026-08-19-media-storage.sql's old read policy if listing is needed).
