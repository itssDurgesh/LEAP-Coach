# Security Hardening — Leap Coach

This document records the security posture of the app after the hardening pass, maps it to
the 8 review "pillars" that were requested, and lists the few remaining items that are the
owner's to action (key rotation, Clerk dashboard settings, the Next.js major upgrade).

**Architecture that shapes everything below**
- **Auth = Clerk** (hosted). We do not run `/api/auth/login`, `/register`, or `/password-reset`
  and we never mint JWTs or set session cookies ourselves. `middleware.ts` = `clerkMiddleware()`.
- **Data = Supabase** with Row-Level Security. Privileged writes go through service-role API
  routes that re-check ownership/permission server-side.
- **Payments = Razorpay** (server-authoritative, HMAC-verified). **AI tutor = Gemini** behind
  `/api/leap/chat` + `/api/leap/hint` (Clerk-gated). **Assignments = multiple-choice** (no file
  upload). All image "uploads" are client-side base64 data URIs (no server file handling).

---

## Pillar scorecard

| # | Pillar | Status |
|---|--------|--------|
| 1 | Rate limiting & auth hardening | ✅ Implemented (existing routes) · auth routes = Clerk |
| 2 | Input validation & schema enforcement | ✅ Implemented (zod on every route) |
| 3 | Secrets & environment management | ✅ Already sound + guards added; **rotate leaked keys** |
| 4 | Dependency / CVE audit | ✅ Next 16 + jspdf 4 shipped — 2 low-risk upstream advisories remain |
| 5 | Error handling / no info leakage | ✅ Implemented (centralized helpers) |
| 6 | Secure file upload (assignments) | ⛔ N/A — no assignment upload feature exists |
| 7 | Session management & broken auth | ⛔ Owned by Clerk — dashboard checklist below |
| 8 | IDOR & access control | ✅ Audited — already enforced on every route |

---

## 1. Rate limiting (`lib/api/rate-limit.ts`)

In-memory **sliding-window** limiter behind a `RateStore` interface (swap in Upstash Redis later
without touching call sites — this file is the single swap point). Per-caller key = Clerk `userId`
when signed in, else client IP. Over-limit → `429` + `Retry-After`.

Tiers (per-minute, env-overridable; set `RL_DISABLED=1` to turn off):

| Tier | Env var | Default | Applied to |
|------|---------|---------|------------|
| ai | `RL_AI_PER_MIN` | 20 | `/api/leap/chat`, `/api/leap/hint` |
| payment | `RL_PAYMENT_PER_MIN` | 12 | order, verify, coupon/validate, demo-grant |
| admin | `RL_ADMIN_PER_MIN` | 30 | admin/users, refund, retry-grant |
| email | `RL_EMAIL_PER_MIN` | 6 | admin/email/broadcast |
| telegram | `RL_TELEGRAM_PER_MIN` | 10 | telegram/link, telegram/unlink |
| default | `RL_DEFAULT_PER_MIN` | 60 | telegram/status, unsubscribe |

Plus `AI_MAX_MESSAGE_CHARS` (default 4000) caps each AI chat message.

**Not applicable:** `/api/auth/*` — those endpoints don't exist here; Clerk hosts sign-in/up/reset
and applies its own bot & brute-force protection. The Razorpay **webhook** is intentionally not
rate-limited (server-to-server; it is signature-gated instead).

⚠️ In-memory counters are per instance and reset on redeploy — fine at current scale (single
instance / low traffic). Switch the store to Redis if the app ever runs multiple instances.

## 2. Input validation (`lib/api/validate.ts`, `zod`)

Every route parses its body through `parseJson(req, schema)`; a schema violation or malformed JSON
is rejected with `400` (we reject, we don't sanitize-and-continue). Highlights:
- **AI tutor** — message length + array-size caps (prompt-injection / denial-of-wallet overhead).
- **Payments** — `plan`/`categories`/`courseId`/`couponCode` strictly typed; pricing stays
  server-authoritative regardless (`lib/payments/server.ts#quotePrice`).
- **Admin/user management** — `action` enum + id/permission bounds.
- **Webhook** — event shape validated after signature verification.

## 3. Secrets & environment management

**Findings (already sound):**
- No server secret is exposed with a `NEXT_PUBLIC_` prefix. Only genuinely public values carry it:
  Clerk *publishable* key, Razorpay *key id* (not secret), Supabase URL + *anon* key (RLS-protected),
  and site URL.
- Every secret-bearing module (`lib/supabase/admin.ts`, `lib/payments/server.ts`,
  `lib/payments/grant.ts`, `lib/email/*`, `lib/ai/config.ts`) is imported only by server route
  handlers — never a `"use client"` component.
- `.gitignore` correctly ignores `.env`, `.env*.local`, and `*.pem`.

**Hardening added:** each of those modules now starts with `import "server-only"`, so any future
accidental client import fails the build instead of silently shipping.

**Owner action required:**
- 🔴 **Rotate every key that was ever pasted into chat/notes** (Razorpay key secret, Gemini key,
  Supabase service-role key, Telegram bot token). Env injection is correct; the exposure was the
  paste, not the code.
- Final belt-and-suspenders check (optional, run with the dev server stopped):
  `npm run build` then search `.next` for secret names — expect **zero** hits for
  `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `GEMINI_API_KEY`, etc.

## 4. Dependency / CVE audit — DONE

**Upgraded (this pass): `next` 14.2.35→16.2.10, `react`/`react-dom` 18.3.1→19.2.7,
`@types/react(-dom)`→19, `recharts` 2→3.9.2, `framer-motion` →11.18.2 (same major, gained React 19
peer support), `jspdf` 2→4.2.x. `@clerk/nextjs` stayed at `^6.39.5` — it already declared peer
support for `next@^16` and `react@~19.2.3`, so no Clerk major bump was needed.**

`npm audit` went from **4 vulnerabilities (2 moderate, 1 high, 1 critical)** to **2 moderate** — the
`next` RSC-DoS/cache-poisoning/CSP-nonce-XSS family (high) and the `dompurify`-via-`jspdf` mXSS
family (moderate) are fully resolved.

**Remaining (not fixable from our side):** `next@16.2.10` itself hard-pins an internal
`postcss@8.4.31` dependency (`node_modules/next/node_modules/postcss` — separate from our own root
`postcss@8.5.15`, which is already patched) that carries a moderate "XSS via unescaped `</style>` in
CSS stringify output" advisory. This is Next's own vendored copy for its built-in CSS build tooling,
not something our `package.json` can override, and `npm audit fix --force`'s suggested "fix" is to
downgrade to `next@9.3.3` — a multi-year regression, not a real remediation. No stable Next release
fixes this yet (only 16.3.0 canary/preview builds do, which aren't appropriate for production). Real
exposure is low: this PostCSS copy stringifies Next's own build-time CSS, not attacker-controlled
runtime content, so there's no realistic path for a visitor to trigger it. **Recommendation: track
it, re-run `npm audit` after each Next patch release, no action needed today.**

**Migration notes:**
- The `middleware.ts` file convention is deprecated in Next 16 in favor of `proxy.ts` (same default
  export + `config.matcher` shape — pure rename, no API change). Migrated: `middleware.ts` deleted,
  `proxy.ts` added with identical content.
- Next 16 auto-updated `tsconfig.json`: `jsx` forced to `"react-jsx"` (React 19 automatic runtime,
  mandatory) and `.next/dev/types/**/*.ts` added to `include` (Turbopack dev types).
- **No async-`params`/`searchParams` breakage** — every dynamic route in this app (`app/courses/[slug]`,
  `app/articles/[id]`, `app/u/[id]`, `app/learn/[courseId]/[order]`, etc.) is a `"use client"` page
  reading route params via the `useParams()` hook, not the server-component `params` prop that
  became async in Next 15+. This was the single biggest risk in the upgrade and it doesn't apply here.
- **Verified:** `npx tsc --noEmit` clean; `next build` compiles all 53 routes (static + dynamic split
  unchanged); dev server boots clean under Turbopack, `proxy.ts` executes on every request (confirmed
  in server logs); public pages (`/`, `/login`, `/courses`) render with zero console/server errors;
  client-side auth-gating (a stateful React feature) still correctly redirects unauthenticated
  visitors off `/courses` and `/admin/analytics`, confirming React 19 state/context behavior is
  intact. The recharts v3 admin analytics/users charts and the Clerk-gated flows could not be
  live-clicked (agent has no login credentials) but compiled clean and their APIs are unchanged
  between the old and new major versions. jsPDF v4's exact API surface used by `lib/pdf.ts`
  (`setFont`/`splitTextToSize`/`text`/`line`/`circle`/`addPage`/`getNumberOfPages`/`setPage`/output)
  was replicated in a standalone Node script — produced a valid multi-page PDF with no exceptions.

**Owner follow-up:** live-test the recharts admin dashboards and the notes-PDF download button once
logged in, just to eyeball the visuals (the API surface is verified, but pixel-level chart rendering
wasn't screenshotted).

## 5. Error handling (`lib/api/errors.ts`)

`apiError(status, message)` returns only a short generic message; `logError(scope, err)` writes full
detail (message + stack) server-side. Routes were migrated to these, so **no raw DB error, stack
trace, or file path is ever serialized to the client**. Swap the `console.error` inside `logError`
for Sentry/Datadog in one place when ready.

## 6. Secure file upload — **N/A**

There is no assignment file-upload feature: assignments are multiple-choice with AI hints, and the
notes "download" is a client-generated PDF. Every image picker (avatar, article/course/team covers)
uses `FileReader.readAsDataURL` → a base64 data-URI string stored in a text column. There is no
multipart handling, no object storage, and nothing executed server-side — so the pillar's asks
(magic-byte checks, S3/GCS isolation, `Content-Disposition`) have no target here.

*Optional future hardening (not required):* add a client-side MIME allow-list + size cap on those
data-URI pickers to stop an admin embedding a huge or non-image blob, and cap the column size.

## 7. Session management & broken auth — **owned by Clerk**

JWT lifetime, absolute/inactivity timeouts, refresh-token rotation, global sign-out, and the
`HttpOnly` / `Secure` / `SameSite` session-cookie flags are all managed by Clerk, not app code. The
password-reset flow already passes `signOutOfOtherSessions: true`.

**Owner checklist (Clerk Dashboard → Sessions):**
- Set a short session-token lifetime and a sensible inactivity + absolute timeout.
- Confirm multi-session handling and that "sign out of all devices" is available to users.
- Verify session cookies are `HttpOnly` + `Secure` + `SameSite=Lax/Strict` (Clerk default).
- Enable Clerk bot/abuse protection on sign-in/up.

## 8. IDOR & access control — **audited, already enforced**

Every route that touches a resource or another user was reviewed. Pattern: the acting user is taken
from the **session/token (never the client body)**, and privileged actions do an explicit
owner/permission check via the service role before writing. No route acts on a client-supplied id
without an authorization gate.

| Route | Actor source | Authorization |
|-------|--------------|---------------|
| leap/chat, leap/hint | Clerk session | signed-in only |
| payments/order, demo-grant, coupon/validate | Clerk session | own user; price server-authoritative |
| payments/verify | Clerk session + Razorpay HMAC | own user; plan from order notes, not client |
| payments/webhook | Razorpay HMAC | user from server-set order notes |
| payments/refund | Clerk session | **owner only** (is_admin && permissions == null) |
| payments/retry-grant | Clerk session | **admin only** (grants already-paid access) |
| admin/users | Clerk session | **owner only** + self-lockout & other-owner guards |
| admin/email/broadcast | Clerk session | admin **with matching permission**; recipients server-resolved |
| telegram/link, unlink, status | Clerk session | acts only on caller's own binding |
| unsubscribe | HMAC token | token → its own profile id only |

Client-side data reads/writes go through Supabase **RLS** + the `protect_privileged_cols` trigger
(privileged columns can't be set from a browser JWT). Access control never relies on hidden UI.

**Recommended (not blocking):** a periodic review of the RLS policies in `supabase/database.sql`
as new tables are added, to keep parity with these route guards.

---

## Files added/changed in this pass
- **New:** `lib/api/validate.ts`, `lib/api/errors.ts`, `lib/api/rate-limit.ts`, this doc.
- **Guards:** `import "server-only"` added to `lib/supabase/admin.ts`, `lib/payments/server.ts`,
  `lib/payments/grant.ts`, `lib/email/send.ts`, `lib/email/unsubscribe.ts`, `lib/ai/config.ts`.
- **Routes hardened (validation + rate limit + centralized errors):** all 15 under `app/api/**`.
- **Dependency:** added `zod`.

## Owner action items (summary)
1. 🔴 Rotate all API keys/tokens ever pasted outside `.env.local`.
2. Apply the Clerk session-settings checklist (pillar 7).
3. ~~Upgrade `jspdf@4`; schedule `next@16`~~ — **done this pass** (pillar 4). Live-test the recharts
   dashboards and the notes-PDF button once logged in.
4. Optionally set rate-limit env overrides in `.env.local` (`RL_*_PER_MIN`, `AI_MAX_MESSAGE_CHARS`).
