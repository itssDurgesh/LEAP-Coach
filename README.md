# LEAP Coach

An AI-assisted leadership coaching platform for students, working professionals
and entrepreneurs, built around the coaching content of **Prof. Vishal Gupta
(IIM Ahmedabad)**. Live at [leapcoach.in](https://www.leapcoach.in).

Learners take coaching topics made of video or audio sessions, ask the LEAP AI
tutor about each session, pass checkpoints to unlock the next ones, earn credits,
join live sessions and discuss with each other. The owner and sub-admins run
everything from an admin panel: topics, articles, announcements, the homepage,
team, live sessions, prices, coupons and payments.

**How it works end to end:** [ARCHITECTURE.md](ARCHITECTURE.md).

## Features

- **Coaching topics** in three categories (student, professional, entrepreneur)
  and six leadership levels. Each session is a Mux video or an uploaded audio
  recording, with a transcript, class notes and downloadable resource files.
- **LEAP AI tutor** on every session, answering only from that session's
  transcript (Google Gemini, server-side).
- **Checkpoints** after sessions (MCQ and fill-in-the-blank with AI hints) that
  unlock the next sessions, and a **credit score** of up to 100 per topic.
- **Access and payments:** buy a topic, a category pass or All-Access through
  Razorpay; every purchase lasts one year; coupons and pay-the-difference upgrades.
- **Community:** session discussions with @mentions and notifications, live
  sessions, articles and announcements, ratings, public profiles.
- **Admin panel** with owner and sub-admin roles, a 7-step topic editor,
  approvals for sub-admin topics, analytics, email broadcasts and a payments
  dashboard with retry and refund.

## Stack

| Concern | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 3, lucide-react, `motion` and `lenis` for animation, self-hosted fonts |
| Auth | [Clerk](https://clerk.com) |
| Database and files | [Supabase](https://supabase.com): Postgres with row-level security, Storage bucket `media` |
| Payments | [Razorpay](https://razorpay.com) (INR, UPI and cards) |
| AI tutor | Google Gemini, called only from server routes |
| Video | [Mux](https://mux.com) player |
| Email | Resend, with Gmail SMTP as fallback |
| Hosting | Vercel, with Vercel Analytics and Speed Insights |
| Telegram bot | Separate repository (see below) |

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # fill in the keys you have
npm run dev                        # http://localhost:3000
```

The app has two modes, chosen automatically:

- **Real mode** when both the Clerk and the Supabase keys are set: Clerk sign-in,
  data in Supabase.
- **Local demo mode** when either is missing: sign-up and all data stay in this
  browser's `localStorage`, starting empty, and nothing is sent to Supabase.
  Useful for clicking through the product without a backend.

Other services switch on as their keys are added: Gemini for the tutor (a
built-in mock answers without it), Razorpay for payments (a demo checkout runs
without it), Resend or Gmail for email.

Check a change before pushing:

```bash
npx tsc --noEmit -p .
```

```bash
npm run build
```

There is no automated test suite yet.

## Environment variables

Every variable is described in [`.env.local.example`](.env.local.example). Only
`NEXT_PUBLIC_*` values reach the browser. Secrets (`CLERK_SECRET_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY` and the
rest) are read only in server code, guarded by `import "server-only"`.

## Database

Full setup, including making yourself the owner, is in
[`supabase/README.md`](supabase/README.md). In short, run these in the Supabase
SQL editor:

1. [`supabase/database.sql`](supabase/database.sql): the main schema (tables,
   row-level security, triggers, indexes). Idempotent and seed-free.
2. The files in [`supabase/migrations/`](supabase/migrations/) that are not yet
   part of `database.sql`: the media bucket and the ratings table (see the table
   in `supabase/README.md`). Files starting with `draft-` are not ready to run.

## Deploying

The site runs on Vercel, which detects Next.js and needs no `vercel.json`.

1. Import the GitHub repository in Vercel. Production deploys from the branch set
   in the Vercel project (currently `redesign-v2`); every push to it goes live.
2. Add every value from `.env.local` under **Project → Settings → Environment
   Variables**, with `NEXT_PUBLIC_SITE_URL` set to the production domain.
3. In Razorpay, point a webhook at
   `https://<your-domain>/api/payments/razorpay/webhook` for `payment.captured`,
   `refund.created`, `refund.processed` and `refund.failed`, and put its secret in
   `RAZORPAY_WEBHOOK_SECRET`.
4. Optional: schedule `/api/payments/razorpay/reconcile` (Vercel cron with
   `CRON_SECRET`) to record any captured payment that was missed.

Notes for production:

- Fonts are self-hosted in `app/fonts/` because Google Fonts responses
  sometimes broke the Vercel build.
- Rate limits are counted per server instance; switch the `RateStore` in
  `lib/api/rate-limit.ts` to a shared store (for example Upstash Redis) as
  traffic grows.
- The demo checkout route refuses to run with live Razorpay keys.

## Telegram bot

The coaching bot lives in its own repository,
[leap-coach-telegram-bot](https://github.com/itssDurgesh/leap-coach-telegram-bot),
and deploys separately. It shares this Supabase project and the
`telegram_links` tables; learners link it from **Account**. The website works
fully without it.

## Project layout

```
app/              Routes: public pages, learner area, /admin, /api route handlers; app/fonts
components/       Admin, learner, marketing and shared UI components
lib/              App state (store/AppProvider.tsx), Supabase, payments, AI, email, access and credit rules
supabase/         database.sql and migrations
public/           Logo, professor photo, home hero clip, social sharing image
proxy.ts          Attaches the Clerk session to requests
ARCHITECTURE.md   How the site works end to end
.ua/              Code knowledge graph (Understand-Anything)
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
