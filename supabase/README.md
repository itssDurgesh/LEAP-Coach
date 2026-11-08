# Auth (Clerk) + Database (Supabase) setup

Authentication is handled by **Clerk** (sign-in/up, Google/LinkedIn, sessions).
Data lives in **Supabase** Postgres. The app runs on built-in **mock data** until
the Clerk + Supabase env vars are present, then automatically switches to the real
services. Follow these steps to go live.

## 1. Create a Supabase project
Create a project at [supabase.com](https://supabase.com) and wait for it to provision.

## 2. Run the database script
Open **SQL Editor** → paste the contents of [`database.sql`](./database.sql) → **Run**.

This single file is the complete schema: every table (including FAQ/privacy and the
Telegram linking tables), all row-level-security policies (final hardened state,
keyed to the Clerk user id), the payment-protection trigger, and every performance
index. It is **idempotent** (safe to re-run after every update) and **seed-free** —
no demo content; the only inserted rows are two structural singletons
(`pricing_tiers` id=1, `site_pages` id=1) that never overwrite your edits.

> ⚠️ **Migrating an existing Supabase-Auth database?** Profile/user ids change from
> `uuid` to `text` (the Clerk user id), which `create table if not exists` cannot
> alter in place. Rebuild the schema first (`drop schema public cascade; …`) — see
> the **section 9** banner inside `database.sql` for the exact commands. This resets
> demo purchases/progress.

### Upgrading a database that is already live
Re-running `database.sql` is always safe and brings an existing database up to date.
If you prefer to apply only what changed, run the newest file in `migrations/`:

- **`migrations/2026-11-08-ideas-standing-resume.sql`** — Idea of the day
  (`daily_ideas`, `idea_responses`, `idea_for_day()`), credits worked out by the
  database (triggers on video completions and checkpoint submissions; learners can no
  longer write their own credits), the credit history behind the monthly leaderboard
  (`credit_events`, `leaderboard()`), database-awarded stamps (`user_stamps`), the
  resume position (`video_progress.position_seconds` / `last_watched_at`) and the
  topic-wide video thumbnail (`courses.video_thumbnail_url`). On its first run it
  recalculates every learner's credits from what they have actually done and awards
  the stamps they have already earned.

The site keeps working before it is run (those features stay empty), but admins
cannot schedule ideas or save a video thumbnail until it is.

## 3. Create a Clerk application
Create an app at [dashboard.clerk.com](https://dashboard.clerk.com).
- **User & Authentication → Email, Phone, Username**: enable **Email** + password.
  (For frictionless demo signup, you can turn *off* "Verify at sign-up" for email.)
- **User & Authentication → Social Connections**: enable **Google** and **LinkedIn**.
  (Clerk provides shared dev credentials out of the box — no provider console setup
  needed for development.)
- **API keys**: copy the **Publishable key** and **Secret key**.

## 4. Connect Clerk → Supabase (so RLS trusts Clerk sessions)
This lets the browser's Supabase queries carry the Clerk session token, which RLS
reads as `auth.jwt()->>'sub'` (the Clerk user id).
1. In **Clerk → Configure → Integrations**, enable the **Supabase** integration.
   Clerk shows a **Clerk domain** (the token issuer) — copy it.
2. In **Supabase → Authentication → Sign In / Up → Third-Party Auth**, add **Clerk**
   and paste that Clerk domain. Save.

No JWT secret is shared — Supabase validates Clerk's tokens via its public JWKS.

## 5. Add your keys
Copy `.env.local.example` to `.env.local` and fill in:
- **Clerk** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Supabase → Settings → API** → `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  (service role is server-only — used to grant access after verified payments).

Restart `npm run dev`.

## 6. Make yourself an admin
Sign up once with your admin email via Clerk (the app provisions your `profiles`
row keyed by your Clerk user id). The `protect_privileged_cols` trigger pins
`is_admin` for everyone except the service role, so a plain `update` in the SQL
Editor is **silently reverted** — disable the trigger for this one-time bootstrap:
```sql
alter table public.profiles disable trigger protect_privileged_cols;
update public.profiles set is_admin = true, role = null where email = 'you@admin.com';
alter table public.profiles enable trigger protect_privileged_cols;
```
Already signed in? Sign out and back in so the app reloads your admin profile.

## 7. Add your content
Sign in as the admin → **Admin → Content Studio** and create your coaching topics,
videos, assignments, tips, sessions, team, books, articles, and homepage content.
The app shows only the real content you add — there is no demo-seed shortcut.

## 8. Payments & the Razorpay webhook
Razorpay keys go in `.env.local` (`NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
Every completed payment is recorded in the `payments` table and shown to the buyer
(Account → Payment receipts) and to admins (**Admin → Payments**).

**Add the webhook** so a paid order is always recorded + granted even if the user's
browser never reaches the verify step (closed tab, network drop):
1. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**.
2. URL: `https://YOUR-DOMAIN/api/payments/razorpay/webhook`
   (for local testing, expose your dev server with a tunnel, e.g. ngrok/cloudflared).
3. Active events: **`payment.captured`**, **`refund.created`**, **`refund.processed`**,
   **`refund.failed`** (and optionally `order.paid`) — the refund events keep receipts
   in sync with refunds made from the Razorpay dashboard (see `docs/PAYMENTS.md`).
4. Set a **secret**, and paste the same value into `RAZORPAY_WEBHOOK_SECRET` in `.env.local`.

If a payment is captured but access can't be granted, it's **flagged** on the Admin →
Payments page: **Retry grant** fulfils it; the **owner** can **Refund** it (full refund
via Razorpay). Receipts are private — RLS lets each learner see only their own.

## 9. Scaling for many concurrent users
- `database.sql` creates **indexes** on every foreign-key / filter column — run it (or
  re-run it; it's idempotent) so per-user queries stay fast under load. This is the
  single biggest, safe win for 200+ concurrent users.
- Supabase's REST layer (PostgREST) pools DB connections automatically; for sustained
  200+ concurrent users use a paid Supabase plan (the free tier throttles).
- The app caches each user's data locally (instant repaint on reload).
- Concurrency correctness: payment fulfilment is idempotent (unique `razorpay_payment_id`
  + upserts) and the coupon counter is atomic (`increment_coupon_redemption` RPC), so
  simultaneous users / webhook retries can't double-grant, double-charge, or lose counts.

- **What each visitor loads** (`lib/supabase/db.ts`). A signed-out visitor loads only
  the public content (topics, FAQs, team, books, prices). A learner adds their own rows
  (filtered by their id) and the shared content; other people's profiles, a video's
  comments and transcripts are fetched when a screen shows them. Admins additionally
  load what the admin screens count across learners, without the heavy columns
  (answers, per-question feedback). Leaderboard, idea of the day and profile numbers
  are worked out in the database (RPC functions), not by downloading rows.

**Recommended before go-live (documented, not yet done):**
- **Pagination** for the tables that grow with every learner on the admin side
  (profiles, progress, submissions, payments): the admin screens still load them whole,
  just with fewer columns. Server-side aggregates are the next step at large scale.
- **Durable background writes.** Non-payment writes (notes, posts, progress, likes) are
  optimistic + fire-and-forget; a transient failure self-heals on the next load but isn't
  retried/surfaced. Add retry + a "couldn't save" indicator. (Payments are already
  server-authoritative and durable.)
- **Distributed rate limiting.** The API routes already rate-limit per user/IP
  (`lib/api/rate-limit.ts`), but the counters are in-memory per instance. If the app
  ever runs on multiple instances, swap the store for a shared one (e.g. Upstash
  Redis) — the `RateStore` interface in that file is the single swap point.
