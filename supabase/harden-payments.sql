-- ════════════════════════════════════════════════════════════════════════
--  Payment hardening — run ONCE in the Supabase SQL editor AFTER schema.sql.
--  Goal: only the server (service role, after a verified Razorpay payment) can
--  grant paid access. Clients can no longer self-grant by inserting purchases,
--  enrolling in paid topics, or editing their own subscription columns.
--  Free-topic self-enrolment and reading your own rows still work.
-- ════════════════════════════════════════════════════════════════════════

-- 1) course_purchases — readable by owner/admin; writes are server-only.
drop policy if exists "course_purchases owner" on public.course_purchases;
drop policy if exists "course_purchases admin read" on public.course_purchases;
create policy "course_purchases read own" on public.course_purchases
  for select using (auth.uid() = user_id or public.is_admin());
-- (no insert/update/delete policy → only the service role can write)

-- 2) enrollments — self-enrol ONLY in free topics; paid enrolments are server-granted.
drop policy if exists "enrollments owner" on public.enrollments;
drop policy if exists "enrollments admin read" on public.enrollments;
create policy "enrollments read own" on public.enrollments
  for select using (auth.uid() = user_id or public.is_admin());
create policy "enrollments free self-enrol" on public.enrollments
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.courses c where c.id = course_id and c.price = 0)
  );
create policy "enrollments delete own" on public.enrollments
  for delete using (auth.uid() = user_id);

-- 3) profiles — users may not change their own subscription columns (server-only).
create or replace function public.protect_subscription_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (server) and admins may change subscription fields freely.
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  -- Everyone else: pin subscription columns to their previous values.
  new.subscription_plan := old.subscription_plan;
  new.subscription_valid_until := old.subscription_valid_until;
  return new;
end;
$$;

drop trigger if exists protect_subscription_cols on public.profiles;
create trigger protect_subscription_cols
  before update on public.profiles
  for each row execute function public.protect_subscription_cols();
