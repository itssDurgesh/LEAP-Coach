-- ════════════════════════════════════════════════════════════════════════
--  Category-bundle pricing — run ONCE in the Supabase SQL editor (idempotent).
--  • pricing_tiers : admin-editable prices (1 / 2 / 3 categories). Public read.
--  • category_passes : which categories a user owns (server-granted after payment).
-- ════════════════════════════════════════════════════════════════════════

-- Admin-editable plan prices (single row, id = 1).
create table if not exists public.pricing_tiers (
  id   int primary key default 1,
  cat1 int not null,  -- single-category pass
  cat2 int not null,  -- any two categories
  cat3 int not null,  -- all three (all-access)
  constraint pricing_tiers_singleton check (id = 1)
);
insert into public.pricing_tiers (id, cat1, cat2, cat3)
  values (1, 6000, 10000, 17000)
  on conflict (id) do nothing;

alter table public.pricing_tiers enable row level security;
drop policy if exists "pricing read" on public.pricing_tiers;
drop policy if exists "pricing admin write" on public.pricing_tiers;
create policy "pricing read" on public.pricing_tiers for select using (true);
create policy "pricing admin write" on public.pricing_tiers
  for all using (public.is_admin()) with check (public.is_admin());

-- Category passes: unlock every topic in a category. Granted server-side only.
create table if not exists public.category_passes (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  category text not null,  -- 'student' | 'professional' | 'entrepreneur'
  granted_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.category_passes enable row level security;
drop policy if exists "category_passes read own" on public.category_passes;
create policy "category_passes read own" on public.category_passes
  for select using (auth.uid() = user_id or public.is_admin());
-- (no insert/update/delete policy → only the service role can write, after a verified payment)
