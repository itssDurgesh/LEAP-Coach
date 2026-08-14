// Clerk configuration. Clerk is the authentication provider (sign-in/up, OAuth,
// sessions). The app falls back to the localStorage mock until the publishable
// key is present, then automatically switches to real Clerk auth.

/** True when the Clerk publishable key is set (build-time inlined). */
export const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
