# LEAP Coach

An AI-enhanced, avatar-led learning platform for Students, Professionals, and
Entrepreneurs — built around the coaching content of **Prof. Vishal Gupta (IIM
Ahmedabad)**. It pairs on-demand coaching topics with a LEAP AI tutor,
auto-graded checkpoints, a per-topic credit system, live sessions, discussion,
and a full admin CMS.

## Stack

| Concern        | Technology |
| -------------- | ---------- |
| Framework      | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling        | Tailwind CSS v3 · lucide-react · framer-motion |
| Auth           | [Clerk](https://clerk.com) |
| Database       | [Supabase](https://supabase.com) (Postgres + RLS) |
| Payments       | [Razorpay](https://razorpay.com) (INR / UPI) |
| AI tutor       | Google Gemini (server-side only) |
| Video          | [Mux](https://mux.com) |
| Email          | Resend (primary) or Gmail SMTP fallback |
| Telegram bot   | grammY (standalone process — see below) |

The app runs entirely on an in-memory / localStorage **mock** until the Clerk +
Supabase keys are present, then automatically switches to real services. This
lets you click through the whole product before wiring any backend.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the keys you have
npm run dev                        # http://localhost:3000
```

`npm run dev` works with an empty `.env.local` — you get the fully clickable
mock. Add keys to switch subsystems to production services one at a time.

## Environment variables

Every variable is documented inline in [`.env.local.example`](.env.local.example).
Only `NEXT_PUBLIC_*` values are exposed to the browser; all secrets
(`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`,
`GEMINI_API_KEY`, etc.) are used only in server routes and are guarded with
`import "server-only"`.

Subsystem-specific setup lives in:

- [`supabase/README.md`](supabase/README.md) — schema, RLS, Clerk↔Supabase auth bridge
- [`docs/PAYMENTS.md`](docs/PAYMENTS.md) — Razorpay orders, verification, webhook
- [`docs/EMAIL.md`](docs/EMAIL.md) — Resend / Gmail broadcast setup
- [`docs/TELEGRAM_BOT.md`](docs/TELEGRAM_BOT.md) — Telegram coach bot
- [`docs/SECURITY.md`](docs/SECURITY.md) — rate limiting, secret handling, audit

## Database setup (Supabase)

Run the SQL files against your Supabase project (SQL editor), in this order:

1. [`supabase/database.sql`](supabase/database.sql) — full schema, RLS, triggers (idempotent; safe to re-run)
2. [`supabase/faq-and-privacy.sql`](supabase/faq-and-privacy.sql) — FAQ + privacy tables
3. [`supabase/seed-pricing-and-announcements.sql`](supabase/seed-pricing-and-announcements.sql) — default pricing tiers
4. [`supabase/telegram-bot.sql`](supabase/telegram-bot.sql) — Telegram linking tables (only if using the bot)

`database.sql` is written to be re-runnable — re-run it after pulling changes to
pick up new columns.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel. The framework (Next.js),
   build command (`next build`), and output are auto-detected — no `vercel.json`
   needed.
2. In **Project → Settings → Environment Variables**, add every value from your
   `.env.local` (the same keys as `.env.local.example`). Set
   `NEXT_PUBLIC_SITE_URL` to your production domain.
3. Point the Razorpay webhook at `https://<your-domain>/api/payments/razorpay/webhook`
   and set `RAZORPAY_WEBHOOK_SECRET` to the same secret.
4. Deploy.

> **The Telegram bot does not run on Vercel.** `bot/` is a long-polling Node
> process (`npm run bot`) and must run on a persistent host (a small VM,
> Railway, Render, or similar) — not in a serverless function. It's optional;
> the web app is fully functional without it.

### Production notes

- Rate limiting (`lib/api/rate-limit.ts`) is in-memory and therefore per-instance
  on Vercel's serverless runtime. It's fine for early-stage traffic; swap in
  Upstash Redis behind the existing `RateStore` interface when you scale out.
- The `demo-grant` payment route auto-disables itself when live Razorpay keys
  are present, so there is no self-grant hole in production.

## Scripts

| Command          | Purpose |
| ---------------- | ------- |
| `npm run dev`    | Dev server (localhost:3000) |
| `npm run build`  | Production build |
| `npm run start`  | Serve the production build |
| `npm run bot`    | Run the Telegram bot (separate process/host) |

## Project layout

```
app/            Next.js App Router routes (pages + API route handlers)
components/     UI, marketing, admin, and app components
lib/            State store, types, Supabase/Clerk/AI/payments/email helpers
bot/            Standalone Telegram bot (not deployed with the web app)
supabase/       SQL schema + migrations
docs/           Subsystem docs (payments, email, security, bot, PRD)
```
