-- ─────────────────────────────────────────────────────────────────────────────
-- DRAFT. Sub-admin limits, enrolment for pass-holders, real learner counts.
--
-- STATUS: written 2026-10-10, NOT run anywhere. Its grammar was checked with the
-- Postgres parser, but it has never executed against a database. Read the
-- "after running" checks below before relying on it.
--
-- HOW TO RUN: paste the whole file into the Supabase SQL editor and execute.
-- It is one transaction: if any statement fails, nothing is changed. Safe to
-- run twice.
--
-- WHAT IT CHANGES
--
--   1. Sub-admin limits, enforced by the database (they were only enforced by
--      the admin screens). Until now the database treated every admin as the
--      owner, so a sub-admin could, with their own sign-in and some technical
--      skill, make themselves owner, edit other people's accounts, change prices
--      and coupons, or delete topics. After this:
--        - only the owner can change who is an admin, permissions, bans and
--          subscriptions, and only the owner can edit or delete other accounts;
--        - each admin table can be written only by the owner or a sub-admin
--          holding the matching permission (same mapping as the admin screens):
--              content        topics, sessions, checkpoints, questions,
--                             daily tips, leadership tracks
--              sessions       live sessions
--              team           team members
--              homepage       homepage content, books, FAQs, privacy policy
--              articles       articles
--              announcements  announcements
--        - prices, coupons and deleting a topic are owner-only;
--        - a sub-admin can save a topic but cannot make one live or trending
--          (the admin screens already send their topics for approval).
--      Reading is NOT changed: any admin can still read what they read today.
--
--   2. A learner can enrol in any topic they are entitled to: a free topic, a
--      topic they bought, a topic covered by their category pass, or any topic
--      while they hold All-Access. Until now the rule allowed free topics only,
--      so a pass-holder's enrolment in a paid topic was refused: it vanished on
--      reload, the topic was missing from My topics, and their rating of it was
--      refused too.
--
--   3. Each topic's "enrolled" and "purchases" numbers are kept by the database
--      (they were never updated, so they stayed at 0), and are set to the real
--      counts once, now. "Purchases" counts buyers: one per learner per topic.
--
-- NOT IN supabase/database.sql YET. That file still holds the old rules. Do
-- not re-run database.sql after this file until the two have been merged, or
-- the old rules come back alongside the new ones.
--
-- This file does not touch the "profiles read" rule (who can read profiles);
-- that is being changed separately.
--
-- AFTER RUNNING, CHECK ON THE LIVE SITE
--   - As the owner: save a topic, publish it, edit a coupon, change a price.
--   - As a sub-admin (if you have one): edit something inside their permission
--     (it should save) and outside it (the site should say it could not save).
--   - As a learner with a category pass: start a paid topic, reload the page,
--     and confirm it is still under My topics.
--
-- TO UNDO: run the block at the very end of this file (it is commented out),
-- then re-run supabase/database.sql.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ── 0. Safety check ──────────────────────────────────────────────────────────
-- Everything below hands the owner's powers to "an admin with no permission
-- list". If no such account exists, stop before changing anything, so nobody
-- can be locked out of the admin.
do $$
begin
  if not exists (
    select 1 from public.profiles
     where is_admin and (permissions is null or jsonb_typeof(permissions) = 'null')
  ) then
    raise exception 'No owner account found (an admin with no permission list). Nothing was changed.';
  end if;
end $$;


-- ── 1. Helpers ───────────────────────────────────────────────────────────────
-- Mirror isOwner() / hasPermission() in lib/types.ts. Like is_admin(), they are
-- STABLE and the rules below wrap them in (select …) so they run once per query.

-- The owner: an admin with no permission list.
create or replace function public.is_owner()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((
    select is_admin and (permissions is null or jsonb_typeof(permissions) = 'null')
      from public.profiles where id = (auth.jwt() ->> 'sub')
  ), false);
$$;

-- The owner, or a sub-admin whose permission list contains `p`.
create or replace function public.has_permission(p text)
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((
    select is_admin and (permissions is null or jsonb_typeof(permissions) = 'null' or permissions ? p)
      from public.profiles where id = (auth.jwt() ->> 'sub')
  ), false);
$$;


-- ── 2. Sub-admin limits ──────────────────────────────────────────────────────

-- 2a. Privileged profile columns (admin flag, permissions, subscription, ban).
-- Same function as in database.sql section 11 with ONE change: the exemption was
-- "any admin", which let a sub-admin edit their own row and clear their own
-- permission list. It is now the owner only. (The app already makes these
-- changes through the server, which is unaffected.)
create or replace function public.protect_privileged_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() = 'service_role' or public.is_owner() then
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

-- 2b. Other people's profiles: the owner only. Everyone still edits their own row.
drop policy if exists "profiles update self" on public.profiles;
drop policy if exists "profiles admin all"   on public.profiles;
create policy "profiles update self" on public.profiles for update
  using ((select auth.jwt() ->> 'sub') = id)
  with check ((select auth.jwt() ->> 'sub') = id);
create policy "profiles admin all" on public.profiles for all
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- 2c. Admin tables: the owner, or a sub-admin with the matching permission.
-- (Public reading of these tables is a separate rule and is not touched.)
do $$
declare r record;
begin
  for r in
    select * from (values
      ('leadership_tracks', 'content'),
      ('videos',            'content'),
      ('assignments',       'content'),
      ('questions',         'content'),
      ('daily_tips',        'content'),
      ('live_sessions',     'sessions'),
      ('team_members',      'team'),
      ('site_content',      'homepage'),
      ('books',             'homepage'),
      ('faqs',              'homepage'),
      ('site_pages',        'homepage'),
      ('articles',          'articles'),
      ('announcements',     'announcements')
    ) as t(tbl, perm)
  loop
    execute format('drop policy if exists "%1$s admin write" on public.%1$I;', r.tbl);
    execute format(
      'create policy "%1$s admin write" on public.%1$I for all using ((select public.has_permission(%2$L))) with check ((select public.has_permission(%2$L)));',
      r.tbl, r.perm
    );
  end loop;
end $$;

-- 2d. Topics: saving needs the "content" permission; deleting is owner-only.
drop policy if exists "courses admin write"  on public.courses;
drop policy if exists "courses admin insert" on public.courses;
drop policy if exists "courses admin update" on public.courses;
drop policy if exists "courses admin delete" on public.courses;
create policy "courses admin insert" on public.courses for insert
  with check ((select public.has_permission('content')));
create policy "courses admin update" on public.courses for update
  using ((select public.has_permission('content')))
  with check ((select public.has_permission('content')));
create policy "courses admin delete" on public.courses for delete
  using ((select public.is_owner()));

-- Going live and "trending" are the owner's call. This holds back only a signed-in
-- sub-admin; the owner, the server and the SQL editor pass straight through. A
-- sub-admin may still take a topic offline, which is what saving their edit for
-- approval does today.
create or replace function public.protect_course_cols()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() or public.is_owner() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.published := false;
    new.trending  := false;
  else
    new.published := coalesce(old.published, false) and coalesce(new.published, false);
    new.trending  := old.trending;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_course_cols on public.courses;
create trigger protect_course_cols
  before insert or update on public.courses
  for each row execute function public.protect_course_cols();

-- 2e. Owner-only: prices, coupons, and the unused recommended-resources table.
-- Any admin can still READ coupons (the payments screens show coupon codes).
drop policy if exists "pricing admin write" on public.pricing_tiers;
create policy "pricing admin write" on public.pricing_tiers
  for all using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists "coupons admin all"   on public.coupons;
drop policy if exists "coupons admin read"  on public.coupons;
drop policy if exists "coupons owner write" on public.coupons;
create policy "coupons admin read" on public.coupons
  for select using ((select public.is_admin()));
create policy "coupons owner write" on public.coupons
  for all using ((select public.is_owner())) with check ((select public.is_owner()));

drop policy if exists "recommended_resources admin write" on public.recommended_resources;
create policy "recommended_resources admin write" on public.recommended_resources
  for all using ((select public.is_owner())) with check ((select public.is_owner()));


-- ── 3. Enrolment for every entitled learner ──────────────────────────────────
-- Mirrors lib/access.ts: every entitlement lasts one year from its own date
-- (a topic bought on its own may carry its own length in access_duration_days),
-- and an entitlement with no date never lapses.
create or replace function public.can_open_course(p_course text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1
      from public.courses c
     where c.id = p_course
       and (
         coalesce(c.price, 0) = 0
         -- All-Access, while it is valid.
         or exists (
           select 1 from public.profiles p
            where p.id = (auth.jwt() ->> 'sub')
              and p.subscription_plan = 'all_access'
              and (p.subscription_valid_until is null or p.subscription_valid_until > now())
         )
         -- A category pass over one of the topic's categories, within its year.
         or exists (
           select 1 from public.category_passes cp
            where cp.user_id = (auth.jwt() ->> 'sub')
              and cp.category = any (
                    case when coalesce(cardinality(c.categories), 0) > 0
                         then c.categories else array[c.category] end)
              and cp.granted_at + interval '365 days' > now()
         )
         -- The topic bought on its own, within its window.
         or exists (
           select 1 from public.course_purchases pu
            where pu.user_id = (auth.jwt() ->> 'sub')
              and pu.course_id = c.id
              and (pu.purchased_at is null
                   or pu.purchased_at + make_interval(days =>
                        case when coalesce(c.access_duration_days, 0) > 0
                             then c.access_duration_days else 365 end) > now())
         )
       )
  );
$$;

drop policy if exists "enrollments free self-enrol" on public.enrollments;
drop policy if exists "enrollments self-enrol"      on public.enrollments;
create policy "enrollments self-enrol" on public.enrollments
  for insert with check (
    (select auth.jwt() ->> 'sub') = user_id
    and public.can_open_course(course_id)
  );


-- ── 4. Enrolled / purchases counts kept by the database ──────────────────────
-- Recounted from scratch for the affected topic, like sync_course_rating():
-- cheap (indexed) and cannot drift the way +1 / -1 arithmetic does.
create or replace function public.sync_course_counts()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target text := coalesce(new.course_id, old.course_id);
begin
  if tg_table_name = 'enrollments' then
    update public.courses c
       set enrolled_count = (select count(*) from public.enrollments e where e.course_id = target)
     where c.id = target;
  else
    update public.courses c
       set purchase_count = (select count(*) from public.course_purchases p where p.course_id = target)
     where c.id = target;
  end if;
  return null;
end;
$$;

drop trigger if exists enrollments_count_sync on public.enrollments;
create trigger enrollments_count_sync
  after insert or delete on public.enrollments
  for each row execute function public.sync_course_counts();

drop trigger if exists course_purchases_count_sync on public.course_purchases;
create trigger course_purchases_count_sync
  after insert or delete on public.course_purchases
  for each row execute function public.sync_course_counts();

-- One-time: set every topic to its real numbers now.
update public.courses c
   set enrolled_count = (select count(*) from public.enrollments e where e.course_id = c.id),
       purchase_count = (select count(*) from public.course_purchases p where p.course_id = c.id);

-- PostgREST caches rules and functions; refresh so the new ones apply at once.
notify pgrst, 'reload schema';

commit;


-- ─────────────────────────────────────────────────────────────────────────────
-- TO UNDO. Remove the leading "-- " from each line of this block, run it, then
-- re-run supabase/database.sql (which puts the previous rules back).
-- ─────────────────────────────────────────────────────────────────────────────
-- begin;
-- drop trigger if exists protect_course_cols on public.courses;
-- drop function if exists public.protect_course_cols();
-- drop trigger if exists enrollments_count_sync on public.enrollments;
-- drop trigger if exists course_purchases_count_sync on public.course_purchases;
-- drop function if exists public.sync_course_counts();
-- drop policy if exists "courses admin insert" on public.courses;
-- drop policy if exists "courses admin update" on public.courses;
-- drop policy if exists "courses admin delete" on public.courses;
-- drop policy if exists "coupons admin read"   on public.coupons;
-- drop policy if exists "coupons owner write"  on public.coupons;
-- drop policy if exists "enrollments self-enrol" on public.enrollments;
-- drop function if exists public.can_open_course(text);
-- commit;
-- -- is_owner() and has_permission() are left in place; nothing uses them once
-- -- database.sql has been re-run.
