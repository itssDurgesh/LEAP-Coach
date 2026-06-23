# Auth (Clerk) + Database (Supabase) setup

Authentication is handled by **Clerk** (sign-in/up, Google/LinkedIn, sessions).
Data lives in **Supabase** Postgres. The app runs on built-in **mock data** until
the Clerk + Supabase env vars are present, then automatically switches to the real
services. Follow these steps to go live.

## 1. Create a Supabase project
Create a project at [supabase.com](https://supabase.com) and wait for it to provision.

## 2. Run the database script
Open **SQL Editor** → paste the contents of [`database.sql`](./database.sql) → **Run**.

This single file is the complete schema: every table, all row-level-security
policies (final hardened state, keyed to the Clerk user id), and the
payment-protection trigger. It is **idempotent** for a fresh project.

> ⚠️ **Migrating an existing Supabase-Auth database?** Profile/user ids change from
> `uuid` to `text` (the Clerk user id), which `create table if not exists` cannot
> alter in place. Rebuild the schema first (`drop schema public cascade; …`) — see
> the **section 8** banner inside `database.sql` for the exact commands. This resets
> demo purchases/progress.

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
3. Active events: **`payment.captured`** and **`order.paid`**.
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

**Recommended before go-live (documented, not yet done):**
- **Per-page data loading.** The app currently loads all shared data on sign-in. As
  content grows, move to on-demand fetching + pagination for the unbounded tables
  (discussion posts/comments, profiles). This is the main latency lever at large scale.
- **Durable background writes.** Non-payment writes (notes, posts, progress, likes) are
  optimistic + fire-and-forget; a transient failure self-heals on the next load but isn't
  retried/surfaced. Add retry + a "couldn't save" indicator. (Payments are already
  server-authoritative and durable.)
- **Rate limiting.** Add per-IP/user limits on the public API routes (e.g. Upstash Redis)
  to absorb abuse/spikes — separate from normal concurrent-user load, which the stateless
  routes + indexes already handle.
