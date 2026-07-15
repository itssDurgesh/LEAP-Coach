-- ═════════════════════════════════════════════════════════════════════════════
-- LEAP Coach — FAQ + Privacy Policy
-- ─────────────────────────────────────────────────────────────────────────────
-- Run once in the Supabase SQL editor (also folded into database.sql). Idempotent.
--   • faqs        — admin-managed Q&A shown on the public /faq page.
--   • site_pages  — singleton (id=1) holding the admin-editable privacy policy text.
-- ═════════════════════════════════════════════════════════════════════════════

create table if not exists public.faqs (
  id          text primary key,
  question    text not null,
  answer      text not null,
  order_index int  not null default 0,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_faqs_published on public.faqs (published, order_index);

-- Single editable legal/site pages row (privacy policy for now; extensible later).
create table if not exists public.site_pages (
  id             int primary key default 1,
  privacy_policy text,
  updated_at     timestamptz not null default now(),
  constraint site_pages_singleton check (id = 1)
);
insert into public.site_pages (id, privacy_policy)
  values (1, null)
  on conflict (id) do nothing;

-- RLS: FAQs read published-or-admin, admin writes; privacy public-read, admin writes.
alter table public.faqs       enable row level security;
alter table public.site_pages enable row level security;

drop policy if exists "faqs read"        on public.faqs;
drop policy if exists "faqs admin write" on public.faqs;
create policy "faqs read" on public.faqs
  for select using (published or public.is_admin());
create policy "faqs admin write" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "site_pages read"        on public.site_pages;
drop policy if exists "site_pages admin write" on public.site_pages;
create policy "site_pages read" on public.site_pages for select using (true);
create policy "site_pages admin write" on public.site_pages
  for all using (public.is_admin()) with check (public.is_admin());

-- Optional starter FAQs (only inserted if the table is empty).
insert into public.faqs (id, question, answer, order_index, published)
select * from (values
  ('faq_what', 'What is LEAP Coach?', 'LEAP Coach is an evidence-based leadership coaching platform by Prof. Vishal Gupta (IIM Ahmedabad). It offers structured coaching topics, a personal AI tutor on every lesson, and assessments that teach.', 0, true),
  ('faq_plans', 'What plans are available?', 'You can unlock catalogs with Free, Pro, Pro+, or Max plans, or buy individual topics. See the Pricing page for current prices; upgrades are pay-the-difference.', 1, true),
  ('faq_credits', 'How do learning credits work?', 'You earn learning credits as you complete lessons and assessments. Credits move you up tiers: Aspirant, Achiever, High Performer, Rising Star, and Leap Star.', 2, true),
  ('faq_support', 'How do I get support?', 'Email us at info.leapcoach@gmail.com and our team will help you.', 3, true)
) as v(id, question, answer, order_index, published)
where not exists (select 1 from public.faqs);
