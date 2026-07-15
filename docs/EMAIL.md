# Broadcast email — announcements & live-session invites

Admins can email learners directly from the admin panel:

- **Announcements** (`/admin/announcements`): tick **"Also email this to … on publish"** when
  publishing, or hit the **send icon** on any published announcement later. **"Send test to me"**
  emails only you so you can check the look first.
- **Live sessions** (`/admin/sessions`): the **bell icon** on a session card emails an invite
  (date/time, instructor, Join button with the Meet link) to the session's audience.

Recipients are resolved on the **server** from Supabase profiles: the announcement/session
audience role, minus banned users, admins, and **anyone who has unsubscribed**. Each learner
gets an individual email (no addresses are leaked via To/CC). Replies go to `EMAIL_REPLY_TO`.

### Delivery tracking & retry (`notified_user_ids`)

Each announcement and live session keeps a ledger of exactly **which learners have been
successfully emailed** (`notified_user_ids`, a list of profile ids), plus a `notified_at`
timestamp for the first send. This drives three things:

- The send/bell button shows a live count badge — **"7/10 emailed"** (gold) → **"10/10
  emailed"** (green) once everyone's reached.
- The result toast reports **"Delivered to 7 of 10 · 3 failed · 3 still not reached"** so you
  can see who got it and who didn't.
- Clicking the button again is a **retry that emails only the learners who haven't received it
  yet** — already-delivered learners are skipped. When everyone's done it asks before
  re-blasting the whole list. New sign-ups after the first send are picked up automatically on
  the next retry.

(Needs the `notified_at` + `notified_user_ids` columns from `supabase/database.sql`; re-run it
once — it's idempotent.)

### Unsubscribe / opt-out

Every email footer carries a one-click **Unsubscribe** link and an RFC 8058
`List-Unsubscribe` header. Clicking it opens `/unsubscribe`, and confirming flips
`profiles.email_opt_out` — after which that learner is excluded from all future broadcasts.
The link is a signed token (HMAC of the profile id), so no login is required and the email
address never appears in the URL. Set `EMAIL_UNSUBSCRIBE_SECRET` to rotate the signing key
(it falls back to existing server secrets, so it works unset). The `email_opt_out` column
also comes from `supabase/database.sql`.

### Sending mechanics & provider fallback

Providers are tried in **priority order**: **Resend first** (best deliverability), then **Gmail**
as a fallback. If you have both configured and Resend fails for someone (outage, quota), that
recipient is **automatically retried through Gmail** in the same send — and only the truly
undelivered are left for a manual retry.

- **Resend** groups recipients into **batches of 100** sent with one API call each (a 100-learner
  blast is one request), paced under Resend's 2 req/sec limit.
- **Gmail** sends sequentially over one reused SMTP connection, lightly paced (~250 ms apart) to
  avoid the throttling personal Gmail accounts hit on rapid sends.

Requirements: the app must be in real mode (Clerk + Supabase), the caller must be the owner
or a sub-admin with the *Announcements* / *Live sessions* permission, and one email provider
must be configured below. Without a provider the buttons show a clear "not configured" message.

---

## Option A (recommended): Resend + your leapcoach.in domain

Emails come from `announcements@leapcoach.in` — authenticated, professional, inbox-friendly.
Free tier: **100 emails/day, 3,000/month** ($20/mo for 50k when you outgrow it).

1. Create a free account at [resend.com](https://resend.com).
2. **Resend dashboard → Domains → Add Domain** → enter `leapcoach.in` (region: pick the closest).
3. Resend now shows you 3–4 DNS records. Copy them into Namecheap:
   - **Namecheap → Domain List → leapcoach.in → Manage → Advanced DNS → Add New Record**
   - Add each record exactly as Resend shows it. Typically:
     | Type | Host | Value |
     |------|------|-------|
     | MX | `send` | `feedback-smtp.<region>.amazonses.com` (priority 10) |
     | TXT | `send` | `v=spf1 include:amazonses.com ~all` |
     | TXT | `resend._domainkey` | `p=MIGfMA0…` (long DKIM key) |
     | TXT | `_dmarc` | `v=DMARC1; p=none;` (optional but recommended) |
   - ⚠️ Namecheap auto-appends `.leapcoach.in` to the Host field — enter just `send`,
     not `send.leapcoach.in`.
4. Back in Resend, click **Verify DNS Records** (propagation is usually minutes, can take up to an hour).
5. **Resend → API Keys → Create API key** and put it in `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM="LEAP Coach <announcements@leapcoach.in>"
EMAIL_REPLY_TO=info.leapcoach@gmail.com
NEXT_PUBLIC_SITE_URL=https://www.leapcoach.in
```

6. Restart `npm run dev`. Use **"Send test to me"** in the announcement composer to confirm.

> The `from` address can be any name on the verified domain (announcements@, coach@, hello@) —
> no mailbox needs to exist there. Learner **replies** still reach your Gmail via Reply-To.

## Option B: send from your Gmail (App Password)

Emails literally come from your Gmail address. Zero DNS setup, but bulk sends from a personal
Gmail risk the spam folder and Google caps free accounts at roughly **500 recipients/day**.
Fine for a small user base or as a stopgap.

1. Google Account → Security → turn **2-Step Verification** on (required).
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) →
   create an app password (name it "LEAP Coach") → copy the 16-character code.
3. `.env.local`:

```env
GMAIL_USER=officialdurgesh21@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
EMAIL_REPLY_TO=info.leapcoach@gmail.com
```

4. Restart `npm run dev`.

> If `RESEND_API_KEY` is set it takes priority over Gmail. Never commit `.env.local`.

## How it works (code map)

| Piece | File |
|-------|------|
| Sender — Resend **batch** → Gmail **fallback**, per-recipient delivery results | `lib/email/send.ts` |
| Branded HTML template (gold/navy, CTA button, unsubscribe footer) | `lib/email/template.ts` |
| Unsubscribe token (HMAC of the profile id) helpers | `lib/email/unsubscribe.ts` |
| Clerk-authed, permission-checked broadcast route (fetch-by-id, dedupe, mark) | `app/api/admin/email/broadcast/route.ts` |
| One-click / confirm unsubscribe endpoint | `app/api/unsubscribe/route.ts` |
| Unsubscribe confirmation page | `app/unsubscribe/page.tsx` |
| Announcement composer checkbox + send/test buttons | `app/admin/announcements/page.tsx` |
| Live-session invite (bell icon) | `app/admin/sessions/page.tsx` |

With Resend batching 100 per call, even a large list finishes in a few requests; the button
spinner stays on until it's done.
