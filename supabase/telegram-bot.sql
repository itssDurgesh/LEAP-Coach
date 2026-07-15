-- ═════════════════════════════════════════════════════════════════════════════
-- LEAP Coach — Telegram bot linking tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor (it is also folded into database.sql).
-- Idempotent: safe to run repeatedly.
--
-- Two tables bridge the website and the standalone Telegram bot:
--   • telegram_link_tokens — short-lived one-time tokens minted by the website when a
--     signed-in user taps "Allow" on the Telegram toggle. The bot redeems one via the
--     /start <token> deep link, which proves which LEAP account owns the chat.
--   • telegram_links — the permanent binding (one LEAP user ↔ one Telegram chat).
--
-- The website API routes and the bot both talk to these with the SERVICE-ROLE key
-- (server-side only), so RLS is closed by default — no anon/authenticated access.
-- ═════════════════════════════════════════════════════════════════════════════

-- One-time linking tokens (expire after a few minutes; single use).
create table if not exists public.telegram_link_tokens (
  token       text primary key,                                            -- random url-safe token
  user_id     text not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz                                                  -- set when redeemed by the bot
);
create index if not exists telegram_link_tokens_user_idx on public.telegram_link_tokens (user_id);
create index if not exists telegram_link_tokens_expires_idx on public.telegram_link_tokens (expires_at);

-- Permanent binding: exactly one Telegram chat per LEAP user and vice-versa.
create table if not exists public.telegram_links (
  user_id     text primary key references public.profiles (id) on delete cascade,
  chat_id     bigint not null unique,                                      -- Telegram chat / user id
  telegram_username text,                                                  -- @handle on Telegram (display only)
  linked_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

-- RLS: closed. Only the service-role key (used by the website API routes and the bot)
-- may read/write these rows; the anon and authenticated roles get nothing. This keeps
-- one user from discovering another's chat id, and keeps tokens unguessable in practice.
alter table public.telegram_link_tokens enable row level security;
alter table public.telegram_links        enable row level security;

drop policy if exists "telegram_link_tokens service" on public.telegram_link_tokens;
drop policy if exists "telegram_links service"        on public.telegram_links;
-- No permissive policies for anon/authenticated → RLS denies them entirely.
-- (service_role bypasses RLS, so the server keeps full access.)

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime: let the bot receive live INSERT/UPDATE events for the tables it pushes
-- from (announcements, courses, notifications). Idempotent and safe if the
-- supabase_realtime publication isn't present (e.g. self-hosted without it).
-- ─────────────────────────────────────────────────────────────────────────────
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
