// A backend-agnostic auth surface consumed by AppProvider. Either the Clerk
// bridge (real auth) or the mock bridge (localStorage) supplies it, so the
// provider never calls Clerk hooks conditionally and the mock path keeps working
// with no keys. AppProvider owns all *data*; this owns *identity + sessions*.

export interface AuthIdentity {
  userId: string;
  email: string;
  name: string;
}

export type AuthActionResult = { ok: boolean; error?: string };
/** Sign-up may complete immediately, or need an email verification code first. */
export type AuthSignUpResult = AuthActionResult & { needsVerification?: boolean };

export interface AuthBridge {
  /** False until the auth provider has resolved the initial session. */
  isLoaded: boolean;
  /** Stable provider user id (Clerk id) when signed in, else null. */
  userId: string | null;
  /** Email/name from the auth provider, used to provision the Supabase profile row. */
  identity: AuthIdentity | null;
  /** Supabase access token (Clerk session JWT) for the data client; null when logged out / mock. */
  getToken: () => Promise<string | null>;
  // Imperative actions — used only in real (Clerk) mode; mock mode handles auth in-state.
  signInWithPassword: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthSignUpResult>;
  /** Confirm the 6-digit email code from sign-up; activates the session on success. */
  verifyEmailCode: (code: string) => Promise<AuthActionResult>;
  /** Re-send the sign-up email verification code. */
  resendEmailCode: () => Promise<AuthActionResult>;
  signInOAuth: (provider: "google") => Promise<AuthActionResult>;
  /** Start a forgot-password flow: emails a 6-digit reset code to the address. */
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  /** Verify the emailed code and set the new password; signs the user in on success. */
  resetPassword: (code: string, newPassword: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
}
