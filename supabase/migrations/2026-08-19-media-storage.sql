-- ─────────────────────────────────────────────────────────────────────────────
-- Media storage bucket.
--
-- HOW TO RUN: paste into the Supabase SQL editor and execute. Idempotent.
--
-- WHY: every file upload in the app (course thumbnails, class-notes PDFs,
-- workbooks, article covers and body images, team photos, learner avatars) went
-- through FileReader.readAsDataURL and was stored as base64 inside a Postgres
-- text column. Two costs:
--
--   1. A 2MB PDF becomes ~2.7MB of base64 in the row.
--   2. loadAll() selects courses with videos(*) embedded, so EVERY user
--      downloaded EVERY uploaded file on EVERY page load.
--
-- Files now live in this bucket and the database stores only a short public URL.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- ── Policies on storage.objects, scoped to this bucket ───────────────────────
drop policy if exists "media public read"    on storage.objects;
drop policy if exists "media authed insert"  on storage.objects;
drop policy if exists "media admin update"   on storage.objects;
drop policy if exists "media admin delete"   on storage.objects;

-- Anyone can read: these are course covers, notes and avatars shown on public
-- and in-app pages alike.
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');

-- Any signed-in account may upload. Learners need this for their own avatar;
-- admins for course and article media. Writes are further constrained by the
-- app: the only upload paths are the admin console and the account page.
create policy "media authed insert" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (select auth.jwt() ->> 'sub') is not null
  );

-- Overwrite/remove is admin-only, so one learner can't clobber another's file.
create policy "media admin update" on storage.objects
  for update using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "media admin delete" on storage.objects
  for delete using (bucket_id = 'media' and (select public.is_admin()));

-- ── Note on existing rows ────────────────────────────────────────────────────
-- Existing base64 data URLs keep working: the app renders whatever string is in
-- the column, and lib/images.ts already marks non-allowlisted sources as
-- unoptimized. They shrink to real URLs as each asset is re-uploaded. To find
-- the heavy rows:
--
--   select id, length(notes_file_url) from public.videos
--    where notes_file_url like 'data:%' order by 2 desc;
--   select id, length(thumbnail_url)  from public.courses
--    where thumbnail_url  like 'data:%' order by 2 desc;
