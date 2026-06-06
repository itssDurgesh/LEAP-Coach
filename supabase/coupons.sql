-- ════════════════════════════════════════════════════════════════════════
--  Coupons — run ONCE in the Supabase SQL editor (idempotent).
--  Admins manage coupons; validation/redemption happens server-side via the
--  service role (so coupon codes are never listed publicly).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.coupons (
  code            text primary key,                       -- stored uppercase
  discount_percent int  not null check (discount_percent between 1 and 100),
  category        text not null,                          -- 'all' | 'student' | 'professional' | 'entrepreneur'
  active          boolean not null default true,
  max_redemptions int,                                    -- null = unlimited
  redemptions     int  not null default 0,
  expires_at      timestamptz,                            -- null = no expiry
  created_at      timestamptz not null default now()
);

alter table public.coupons enable row level security;

-- Only admins can read/write coupons through a normal session.
-- (The payment routes use the service role, which bypasses RLS.)
drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());
