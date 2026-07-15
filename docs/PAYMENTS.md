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

> ⚠️ Never expose `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, or
> `SUPABASE_SERVICE_ROLE_KEY` to the browser. They are only read inside `app/api/payments/*`.

---

## 3. Routes

All under `app/api/payments/`. All are `runtime = "nodejs"`.

| Route | Method | Who | Purpose |
|---|---|---|---|
| `razorpay/order` | POST | signed-in user | Creates a Razorpay **order** with the **server-computed** amount. Stamps `userId`, `plan`, `courseId`, `categories`, `couponCode` into the order **notes** (so the server — not the client — owns these). |
| `razorpay/verify` | POST | signed-in user | After the popup succeeds: verifies the HMAC signature, re-confirms the payment with Razorpay, then **records + grants** (`processPayment`). |
| `razorpay/webhook` | POST | Razorpay (server-to-server) | Safety net. On `payment.captured`, records + grants from the order notes even if the browser never reached `/verify`. |
| `razorpay/refund` | POST | **owner** only | Full refund via Razorpay; marks the receipt `refunded`. |
| `razorpay/retry-grant` | POST | any admin | Re-runs the grant for a `grant_failed` receipt. |
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
  `status = 'refunded'`. Idempotent (a payment already refunded is a no-op).
- ⚠️ **A refund does not automatically revoke access** in the current build — it only returns
  the money. If you need to remove what they unlocked, do it manually (clear the course
  purchase / category pass / subscription on their profile). Consider this before refunding.

---

## 8. Admin tools

**Admin → Payments** (`app/admin/payments/page.tsx`):
- Flagged (`grant_failed`) receipts shown at the top.
- **Retry grant** (any admin) — re-runs `grantAccess` for a flagged receipt.
- **Refund** (owner only) — see above.

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
   **events** `payment.captured` (and optionally `order.paid`), and set the same secret in
   `RAZORPAY_WEBHOOK_SECRET`.
4. Ensure `supabase/database.sql` has been run (creates the `payments` table + RLS + indexes).
5. Smoke-test with a test-card checkout, then a refund, then a deliberately-interrupted
   payment to confirm the webhook reconciles.

### Manual reconciliation (rare)
If you ever suspect a charge with no receipt: open the Razorpay dashboard, find the payment,
copy its `order_id`, confirm `status = captured`, and either redeliver the webhook from the
dashboard or have an admin grant access manually and (optionally) insert the receipt.

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

## 13. Course auto-expiry

Each course can carry an **access duration (days)** set in the Course Wizard (blank/0 = lifetime).
Access lapses at `enrollment.enrolledAt + accessDurationDays` **for everyone, including
subscribers** (`hasAccess()` enforces it). On the topic page an expired learner sees:
- **Renew access** (free) if they hold a subscription-type entitlement (all-access / category pass / free), or
- **Re-purchase** (à-la-carte) — which restarts the timer (verify + `grantAccess` reset `enrolled_at`).

## 14. Admin payments & subscriptions dashboard

`/admin/payments` (owner, or a sub-admin granted the **Payments** permission). Live: auto-refreshes
every 25s (`refreshPayments()`) + on focus. Shows captured revenue, active subscriptions, refunded
count, a **Needs attention** list of `grant_failed` payments (Retry grant / owner Refund), a
searchable/filterable payments table, and a **Subscriptions** tab (plan, catalogs, topics, validity).
Refunds, pricing, coupons and sub-admin management stay **owner-only**.
