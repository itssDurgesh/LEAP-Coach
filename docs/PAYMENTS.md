# Payments — how it works (Razorpay)

A guide for the team. Covers the routes, the happy path, what happens when a payment
fails or money is deducted but access doesn't appear, refunds, and the go-live checklist.

All amounts are INR. Razorpay works in **paise** (₹1 = 100 paise) on the wire; our code
multiplies/divides by 100 at the boundaries.

---

## 1. The one guarantee to remember

**A buyer is never charged twice and never silently loses access.**

- Every payment is recorded in the `payments` table keyed by Razorpay's
  `razorpay_payment_id`, which is **unique**. Recording and granting are **idempotent** —
  running them again (e.g. the browser *and* the webhook both fire) does nothing the
  second time.
- If money is captured but we fail to grant access, the payment is still saved with
  `grant_status = 'grant_failed'` and **flagged for an admin** (Admin → Payments). It is
  never lost. An admin clicks **Retry grant**, or the webhook retries automatically.

---

## 2. Two modes

| | When | Behaviour |
|---|---|---|
| **Mock checkout** | `NEXT_PUBLIC_RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` absent | `CheckoutModal` fakes a 1s "payment" and grants access locally. No money, no records. For local dev only. |
| **Real (test or live)** | Razorpay keys present | Real order → Razorpay Checkout popup → server signature verification → grant. Test keys (`rzp_test_…`) use Razorpay test cards (no real charge); live keys (`rzp_live_…`) charge real money. |

The key id prefix decides the label shown to users ("Razorpay (test)" vs "Razorpay").

### Environment variables (`.env.local`)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` — public key id (sent to the browser to open Checkout).
- `RAZORPAY_KEY_SECRET` — **server only**. Creates orders, verifies signatures, issues refunds.
- `RAZORPAY_WEBHOOK_SECRET` — **server only**. Validates the webhook (optional but recommended for production).
- `SUPABASE_SERVICE_ROLE_KEY` — **server only**. Writes the grant + receipt, bypassing RLS.
- Clerk keys — the buyer is identified from their Clerk session, not from the client.
- `PAYMENT_ALERT_EMAIL` — optional; comma-separated recipients for grant-failed alerts
  (defaults to every owner profile's email). Uses the app's email provider (docs/EMAIL.md).
- `PAYMENTS_RECONCILE_SECRET` (or `CRON_SECRET`) — optional; lets a scheduler call the
  reconcile route with `Authorization: Bearer <secret>`.

> ⚠️ Never expose `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, or
> `SUPABASE_SERVICE_ROLE_KEY` to the browser. They are only read inside `app/api/payments/*`.

---

## 3. Routes

All under `app/api/payments/`. All are `runtime = "nodejs"`.

| Route | Method | Who | Purpose |
|---|---|---|---|
| `razorpay/order` | POST | signed-in user | Creates a Razorpay **order** with the **server-computed** amount and `payment_capture: 1` (auto-capture, never rely on the dashboard setting). Stamps `userId`, `plan`, `courseId`, `categories`, `couponCode` into the order **notes** (so the server — not the client — owns these). |
| `razorpay/verify` | POST | signed-in user | After the popup succeeds: verifies the HMAC signature, re-confirms the payment with Razorpay, then **records + grants** (`processPayment`). Grants **only for `captured` money** — a still-`authorized` payment is captured explicitly first, or reported as pending (never granted). |
| `razorpay/webhook` | POST | Razorpay (server-to-server) | Safety net. On `payment.captured`, records + grants from the order notes even if the browser never reached `/verify`. On `refund.created`/`refund.processed`/`refund.failed`, keeps the receipt's refund state truthful (including refunds issued from the Razorpay dashboard). |
| `razorpay/refund` | POST | **owner** only | Full refund via Razorpay; marks the receipt `refunded` and stores the `razorpay_refund_id` + amount. The webhook confirms (`refund.processed`) or reverts (`refund.failed`) it. |
| `razorpay/retry-grant` | POST | any admin | Re-runs the grant for a `grant_failed` receipt (and emails the buyer their receipt on success). |
| `razorpay/reconcile` | POST/GET | any admin, or a scheduler with `PAYMENTS_RECONCILE_SECRET` | Sweeps the last N hours (default 48) of Razorpay payments: records + grants any **captured payment we have no receipt for**, and syncs refunds made outside the app. Idempotent; also exposed as the **Reconcile** button on Admin → Payments. |
| `coupon/validate` | POST | anyone | Previews a coupon's discount against server-side pricing (no money). |

Pricing is **always** computed server-side in `lib/payments/server.ts` → `quotePrice()`
(base price read from the DB + coupon validated server-side). The client's amount is never
trusted. Fulfilment is shared by verify + webhook in `lib/payments/grant.ts`
(`processPayment` → `grantAccess`).

---

## 4. Happy path (step by step)

1. Learner clicks **Pay** in `CheckoutModal`.
2. Browser → `POST /razorpay/order` with `{ plan, courseId?, categories?, couponCode? }`.
   Server authenticates (Clerk), computes the authoritative amount, creates the Razorpay
   order, and returns `{ orderId, amount, keyId }`.
3. Browser opens **Razorpay Checkout** (the UPI/card popup) with that order.
4. User pays. Razorpay returns `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
5. Browser → `POST /razorpay/verify` with those three fields (the Clerk session cookie rides
   along automatically).
6. Server:
   - verifies `HMAC_SHA256(order_id|payment_id, key_secret) === signature` (constant-time),
   - identifies the buyer from the Clerk session,
   - re-fetches the order + payment from Razorpay and confirms `status ∈ {captured, authorized}`
     and the amount matches,
   - calls `processPayment(source:'verify')`: inserts the receipt (`payments` row) and grants
     access (course purchase / category passes / all-access), then increments the coupon once.
7. Server responds `{ ok, granted, grantStatus }`. The modal shows **"Payment successful"** and
   the receipt is visible under **Account → Payment receipts**.

```
Browser ──order──▶ /order ──▶ Razorpay (create order)
Browser ──pay───▶ Razorpay Checkout popup
Browser ──verify─▶ /verify ──▶ Razorpay (confirm) ──▶ Supabase (record + grant)
                         ▲
Razorpay ──webhook───────┘  (independent safety net, payment.captured)
```

---

## 5. What if a payment fails?

**Payment never goes through (declined card, failed UPI, user closes the popup).**
- Razorpay fires `payment.failed` or the modal is dismissed → `CheckoutModal` resets to idle.
- **No charge, no record, no access.** The user can simply try again. Nothing to clean up.

---

## 6. What if money is deducted but access doesn't appear? (the important one)

This is the scenario to explain to users. There are two sub-cases; **in both, the money is
safe and the buyer is never double-charged.**

**6a. Payment captured, but our grant failed** (e.g. a transient DB error during `/verify`).
- The receipt is still saved with `grant_status = 'grant_failed'`.
- The modal shows **"Payment received — we're finalizing your access"** (it does **not** fake
  access).
- The webhook (if configured) retries the grant automatically within seconds.
- An admin sees the receipt at the top of **Admin → Payments** and clicks **Retry grant**.

**6b. Payment captured, but the browser died before `/verify` ran** (tab closed, lost network).
- Razorpay still calls our **webhook** (`payment.captured`) server-to-server.
- The webhook reads the buyer + plan from the order notes and runs the same
  `processPayment(source:'webhook')` → records + grants. The user has access on next load.
- Because both paths key off the unique `razorpay_payment_id`, verify + webhook firing for the
  same payment is safe (the second is a no-op).

**6c. Payment succeeded in the popup, but `/verify` errored or couldn't be reached.**
- The modal shows **"Payment being confirmed"** and explicitly says *don't pay again* — it
  never returns to a live Pay button after a successful charge (that's how accidental
  double-charges happen). The webhook records + grants within seconds.
- Extra guard: the server refuses to price a topic the buyer's à-la-carte access is still
  active for (`quotePrice` → "You already own this topic"), so even a determined re-pay of
  the same topic can't create a second order while the first purchase is active.

**If the webhook is NOT configured** and the browser died before `/verify`: the charge exists at
Razorpay but we have no receipt yet. Reconcile manually — find the payment in the Razorpay
dashboard, then either (a) configure the webhook and let Razorpay redeliver, or (b) have an
admin grant access manually. **This is exactly why the webhook is recommended for production.**

> Bottom line for support: "You won't be charged twice. If access doesn't show up immediately,
> your receipt is saved and our team is notified — it'll be granted automatically or by an admin."

---

## 7. Refunds

- **Owner-only** (an admin with no scoped permissions), from **Admin → Payments → Refund**.
- `POST /razorpay/refund` issues a **full refund** at Razorpay and marks the receipt
  `status = 'refunded'` (storing `razorpay_refund_id` + `refund_amount_inr` for audit).
  Idempotent (a payment already refunded is a no-op).
- Razorpay refunds settle **asynchronously**. The webhook keeps the receipt truthful:
  `refund.processed` confirms it; `refund.failed` (e.g. insufficient settlement balance)
  **reverts the receipt to `captured`** so the owner sees it still needs refunding.
- Refunds issued **from the Razorpay dashboard** (outside the app) sync the same way via
  `refund.created`/`refund.processed` — the app's receipt won't silently stay "captured".
- ⚠️ **A refund does not automatically revoke access** in the current build — it only returns
  the money. If you need to remove what they unlocked, do it manually (clear the course
  purchase / category pass / subscription on their profile). Consider this before refunding.

---

## 8. Admin tools

**Admin → Payments** (`app/admin/payments/page.tsx`):
- **Needs attention** = `grant_failed` receipts **plus any receipt stuck `pending` for
  over 10 minutes** (e.g. the server died between recording and granting) — shown at the top.
- **Retry grant** (any admin) — re-runs `grantAccess` for a flagged receipt.
- **Refund** (owner only) — see above.
- **Reconcile** (any admin) — runs the reconcile sweep (last 48h) and reports what it
  recovered/synced. Also callable on a schedule (see go-live checklist).

**Emails** (when an email provider is configured — see `docs/EMAIL.md`):
- Buyer gets a **receipt email** on every successful grant (including a later successful
  retry). Demo/test-mode grants don't email.
- Owner(s) (or `PAYMENT_ALERT_EMAIL`) get an **alert** the moment a captured payment lands
  in `grant_failed` — recovery no longer depends on someone watching the admin page.
  Webhook retries don't re-alert.

Learners see their own receipts under **Account → Payment receipts** (read-own via RLS).

---

## 9. Security model (why the client can't cheat)

- **Amount** is computed server-side (`quotePrice`) from the DB price + a server-validated
  coupon. The client only sends *what* it wants to buy, never the price.
- **Plan/course/categories/coupon** are read from the **order notes** (set server-side at
  creation), not from the client, during verify + webhook.
- **Signature** is verified with `crypto.timingSafeEqual` before anything is granted.
- **Buyer identity** comes from the Clerk session, not a client-supplied id.
- **Grants** are written with the Supabase **service role** on the server. RLS blocks clients
  from granting themselves paid access (`protect_privileged_cols` pins subscription columns;
  `course_purchases`/`category_passes`/`payments` are server-write-only).

---

## 10. Plan upgrades (dashboard "Upgrade your plan")

The dashboard upgrade card reuses this exact flow. It opens `CheckoutModal` in **bundle** mode
with the categories the learner doesn't own yet. `plan: "bundle"` is priced by the number of
categories selected (`bundlePrice`), grants those `category_passes`, and **auto-promotes to
all-access** once the learner owns all three. No separate payment code — same order → verify →
grant path.

---

## 11. Go-live checklist

1. Complete Razorpay KYC; swap `rzp_test_…` keys for `rzp_live_…` in `.env.local`. No code change.
2. In Razorpay → enable the payment methods you want (UPI, cards, International if needed —
   International requires Razorpay approval).
3. Create the webhook: **URL** `https://<your-domain>/api/payments/razorpay/webhook`,
   **events** `payment.captured`, `refund.created`, `refund.processed`, `refund.failed`
   (and optionally `order.paid`), and set the same secret in `RAZORPAY_WEBHOOK_SECRET`.
   If the webhook arrives while the server is missing its config, we return **503** so
   Razorpay retries instead of dropping the event.
4. Ensure `supabase/database.sql` has been run (creates the `payments` table + RLS + indexes,
   including the `razorpay_refund_id` / `refund_amount_inr` audit columns).
5. Optional but recommended: schedule the reconcile sweep, e.g. Vercel cron in `vercel.json`
   hitting `GET /api/payments/razorpay/reconcile` daily (Vercel sends
   `Authorization: Bearer $CRON_SECRET` automatically — set the same value in
   `PAYMENTS_RECONCILE_SECRET` or rely on `CRON_SECRET`).
6. Configure an email provider (docs/EMAIL.md) so buyers get receipts and owners get
   grant-failure alerts; optionally set `PAYMENT_ALERT_EMAIL`.
7. Smoke-test with a test-card checkout, then a refund, then a deliberately-interrupted
   payment to confirm the webhook reconciles, then click **Reconcile** and confirm it
   reports a clean sweep.

### Manual reconciliation (rare)
If you ever suspect a charge with no receipt: click **Reconcile** on Admin → Payments — it
finds any captured payment of the last 48h that has no receipt, records it, and grants from
the order notes (pass `{"hours": N}` to the route for a wider window, up to 30 days). Only a
payment whose order carries no `userId` note (i.e. not created by this app) still needs the
Razorpay dashboard + a manual grant.

---

## 12. Plan tiers, upgrades & profile gate (added)

**Plan tiers (by catalogs/categories owned):** Free (0) · Pro (1) · Pro+ (2) · Max (all 3 = all-access).
Shown as a badge in the header and dashboard. Computed by `planFor()` in `lib/types.ts`.

**Upgrades = pay the difference.** The admin sets only the three catalog prices in
**Admin → Plans & Coupons** (`cat1`/`cat2`/`cat3`). An upgrade costs
`tierPrice(newTotal) − tierPrice(currentlyOwned)` — e.g. own 1 (₹6,000) → go Max (₹17,000) → pay ₹11,000.
Computed **server-side** in `quotePrice()` from the buyer's real `category_passes` (via their Clerk id),
so it can't be faked. The dashboard **Upgrade your plan** card and `CheckoutModal` show the same
difference; the order route grants only the *new* categories and auto-promotes to all-access at 3/3.

**Profile gate.** A learner must complete their profile (age, gender, phone, company, country)
before any purchase/upgrade. `CheckoutModal` blocks payment and links to `/account` until
`isProfileComplete()` passes; the dashboard also shows a "complete your profile" nudge.

## 13. One-year access & expiry

**Every purchase grants exactly one year of access, counted from its own purchase date.**
This applies to all three purchase types, each with its OWN independent timeline:

| Entitlement            | Window start                          | Length                                         |
| ---------------------- | ------------------------------------- | ---------------------------------------------- |
| À-la-carte topic       | `course_purchases.purchased_at`       | 1 year (or the topic's admin override, if set) |
| Catalog / category pass| `category_passes.granted_at`          | 1 year — covers every topic in the category, **including ones published later** |
| All-access             | `profiles.subscription_valid_until`   | 1 year (already stored as purchase + 1yr)      |

The maths lives in **`lib/access.ts`** (pure, shared by the store + server). `courseAccessExpiry(user, course)`
returns the **latest** expiry across every entitlement that grants a topic — so a learner who both bought a
topic à-la-carte AND owns a catalog pass over it keeps access until whichever window runs longest. Free topics
never expire. `hasAccess()` = `hasGrant()` (owns it) **AND** not past that expiry.

**Re-purchase resets the window.** Buying a topic/catalog again stamps a fresh `purchased_at` / `granted_at`
(both the client `db.ts` upserts and server `grantAccess` write the timestamp, since the DB `default now()`
only fires on first insert). After a year the learner **must buy again** — there is no free renewal for paid
access. On the topic page an expired learner sees a single **Renew · ₹price** button that re-opens checkout.

**Pricing is expiry-aware** (`lib/payments/server.ts` + client mirrors in `CheckoutModal`/`UpgradePlanCard`/
`/pricing`): only *active* catalogs count toward pay-the-difference, so a lapsed catalog is charged in full
again and never blocks its own re-purchase with "you already own this". The all-access auto-promotion (owning
all three catalogs) likewise only fires when all three are currently active.

> The per-topic **access duration (days)** in the Course Wizard is now an optional *override* for à-la-carte
> purchases only (blank/0 = the standard 1 year). Catalog passes and all-access always run one year.
> Migration-free: the `purchased_at` / `granted_at` / `subscription_valid_until` columns already exist.

## 14. Admin payments & subscriptions dashboard

`/admin/payments` (owner, or a sub-admin granted the **Payments** permission). Live: auto-refreshes
every 25s (`refreshPayments()`) + on focus. Shows captured revenue, active subscriptions, refunded
count, a **Needs attention** list of `grant_failed` payments (Retry grant / owner Refund), a
searchable/filterable payments table, and a **Subscriptions** tab (plan, catalogs, topics, validity).
Refunds, pricing, coupons and sub-admin management stay **owner-only**.
