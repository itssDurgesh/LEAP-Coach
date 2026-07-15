-- ─────────────────────────────────────────────────────────────────────────────
-- LEAP Coach — seed: pricing + paid-course prices + announcements
-- Safe to run on top of database.sql. Idempotent (re-running just re-applies).
-- Run AFTER database.sql (needs pricing_tiers, courses.access_duration_days, announcements).
--
-- ⚠️ EDIT THESE NUMBERS if you want different prices, then run the whole file.
--    The plan price is by the NUMBER of catalogs a learner buys (not per-catalog):
--      1 catalog (any)  = cat1
--      2 catalogs (any) = cat2
--      3 catalogs       = cat3  (= all-access)
--    Upgrades are charged automatically as the DIFFERENCE between tiers.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Plan (catalog-bundle) prices + per-topic "from" price -----------------------
insert into public.pricing_tiers (id, cat1, cat2, cat3, per_topic_from)
values (1,
        1000,   -- ₹ for ANY single catalog   (you mentioned student 1000 / professional 1200 — see note below)
        3000,   -- ₹ for ANY two catalogs
        3500,   -- ₹ for all three (all-access)
        100)    -- ₹ "starting from" price shown on the Pricing page
on conflict (id) do update
  set cat1 = excluded.cat1,
      cat2 = excluded.cat2,
      cat3 = excluded.cat3,
      per_topic_from = excluded.per_topic_from;

-- 2) Make every PAID topic cost ₹100 (free topics stay free) ----------------------
update public.courses set price = 100 where price > 0;
-- To make EVERY topic ₹100 (incl. currently-free ones), use this instead:
--   update public.courses set price = 100;

-- 3) (Optional) demo a time-limited topic so you can test course auto-expiry.
--    Uncomment and set the slug to one of your topics; access then lapses 30 days
--    after a learner enrolls.
-- update public.courses set access_duration_days = 30 where slug = 'ace-your-career-launch';

-- 4) Announcements (admin → learners). author_id picks any existing admin profile. ----
insert into public.announcements
  (id, title, body, target_role, pinned, published, author_id, author_name, created_at, updated_at)
values
  ('an_pricing_launch',
   'New, simpler pricing is live 🎉',
   E'Big update to make LEAP affordable for everyone:\n\n• Individual coaching topics are now just ₹100.\n• Catalog passes start at ₹1,000 for one catalog, ₹3,000 for any two, and ₹3,500 for all three (Max / all-access).\n• Already own a catalog? Upgrade any time — you only pay the difference.',
   'all', true, true,
   (select id from public.profiles where is_admin order by created_at limit 1),
   'Prof. Vishal Gupta', now() - interval '1 day', now() - interval '1 day'),

  ('an_welcome',
   'Welcome to LEAP Coach',
   E'Here is how to get the most out of every topic:\n\n• Ask the LEAP AI tutor anything about the lesson you are watching.\n• Save notes as you go and download them all as one PDF when you finish a topic.\n• Discuss right under each video — tag a mentor with @ and they will be notified.',
   'all', false, true,
   (select id from public.profiles where is_admin order by created_at limit 1),
   'Prof. Vishal Gupta', now() - interval '3 days', now() - interval '3 days'),

  ('an_prof_clinic',
   'Professionals: live negotiation clinic this Friday',
   E'Bring a real negotiation dilemma to Friday''s live clinic and we will work through it together. Reserve your spot from the Live Sessions page.',
   'professional', false, true,
   (select id from public.profiles where is_admin order by created_at limit 1),
   'Prof. Vishal Gupta', now() - interval '12 hours', now() - interval '12 hours'),

  ('an_student_checkpoints',
   'Students: instant AI hints on every checkpoint',
   E'Checkpoints now coach you through wrong answers with hints (no spoilers) for up to four tries — then show the answer. Finish a topic to unlock your performance report and star rating.',
   'student', false, true,
   (select id from public.profiles where is_admin order by created_at limit 1),
   'Prof. Vishal Gupta', now() - interval '6 hours', now() - interval '6 hours')
on conflict (id) do update
  set title = excluded.title,
      body = excluded.body,
      target_role = excluded.target_role,
      pinned = excluded.pinned,
      published = excluded.published,
      updated_at = now();

-- 5) (Optional) demo coupons --------------------------------------------------------
insert into public.coupons (code, discount_percent, category, active, max_redemptions, redemptions, expires_at, created_at)
values
  ('LAUNCH50', 50, 'all', true, 200, 0, null, now()),
  ('STUDENT25', 25, 'student', true, null, 0, null, now())
on conflict (code) do nothing;
