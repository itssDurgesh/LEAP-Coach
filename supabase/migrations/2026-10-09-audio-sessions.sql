-- ─────────────────────────────────────────────────────────────────────────────
-- Audio sessions.
--
-- HOW TO RUN: paste into the Supabase SQL editor and execute. Idempotent.
--
-- WHY: a session in a coaching topic can now be an audio recording instead of a
-- Mux video. The admin uploads the audio file in Content Studio; the file goes to
-- the existing public `media` bucket (folder `session-audio/`) and the row keeps
-- only its URL and file name. A session with audio_url set plays as audio on the
-- lesson page; otherwise mux_playback_id is used as before.
--
-- Per-session resource files (PDF / DOCX) need no schema change: they are stored
-- in the existing videos.resources jsonb, with the files in `media/resources/`.
--
-- Until this has run the site keeps working (it reads and saves sessions without
-- these columns), but an uploaded audio file is not saved with the session.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.videos add column if not exists audio_url  text;
alter table public.videos add column if not exists audio_name text;

-- PostgREST caches the table shape; refresh it so the new columns are usable at once.
notify pgrst, 'reload schema';
