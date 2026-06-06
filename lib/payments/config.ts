// ── Pricing + Razorpay config ──
// The secret (RAZORPAY_KEY_SECRET) is used ONLY in server route handlers under
// app/api/payments/*. The key id is public (NEXT_PUBLIC) and used by the browser
// to open Razorpay Checkout. When keys are absent, CheckoutModal falls back to a
// mock (no real payment) so the flow keeps working in development.

export const ALL_ACCESS_PRICE = 10000; // INR / year

/** Public Razorpay key id (inlined into the client bundle). Empty when unset. */
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

/** True when both the public key id and the server secret are present (server-only). */
export const isRazorpayConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
