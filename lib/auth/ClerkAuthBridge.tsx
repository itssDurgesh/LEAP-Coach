"use client";

import * as React from "react";
import { useAuth, useUser, useSignIn, useSignUp, useClerk } from "@clerk/nextjs";
import { AppProvider } from "@/lib/store/AppProvider";
import type { AuthBridge } from "./types";

/** Pull a friendly message out of a Clerk error. */
function clerkErr(e: unknown): string {
  const err = e as { errors?: Array<{ longMessage?: string; message?: string }> };
  return (
    err?.errors?.[0]?.longMessage ||
    err?.errors?.[0]?.message ||
    "Something went wrong. Please try again."
  );
}

/**
 * Real auth backend. Mounted inside <ClerkProvider> when Clerk is configured.
 * Translates Clerk's hooks into the backend-agnostic AuthBridge that AppProvider
 * consumes, then renders the provider with it.
 */
export function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, userId, getToken } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp();
  const clerk = useClerk();

  const bridge = React.useMemo<AuthBridge>(
    () => ({
      isLoaded: authLoaded && userLoaded,
      userId: userId ?? null,
      identity: user
        ? {
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            name:
              user.fullName ||
              user.firstName ||
              user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
              "Learner",
          }
        : null,
      getToken: async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      },
      async signInWithPassword(email, password) {
        if (!signInLoaded || !signIn) return { ok: false, error: "Sign-in isn't ready yet. Please retry." };
        try {
          const res = await signIn.create({ identifier: email.trim(), password });
          if (res.status === "complete") {
            await setActiveSignIn({ session: res.createdSessionId });
            return { ok: true };
          }
          return { ok: false, error: "Additional verification is required to sign in." };
        } catch (e) {
          return { ok: false, error: clerkErr(e) };
        }
      },
      async signUp(email, password, name) {
        if (!signUpLoaded || !signUp) return { ok: false, error: "Sign-up isn't ready yet. Please retry." };
        try {
          const [firstName, ...rest] = name.trim().split(/\s+/);
          const res = await signUp.create({
            emailAddress: email.trim(),
            password,
            firstName: firstName || undefined,
            lastName: rest.join(" ") || undefined,
          });
          if (res.status === "complete") {
            await setActiveSignUp({ session: res.createdSessionId });
            return { ok: true };
          }
          // Email verification required → send the 6-digit code; the UI collects it
          // and calls verifyEmailCode().
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          return { ok: true, needsVerification: true };
        } catch (e) {
          return { ok: false, error: clerkErr(e) };
        }
      },
      async verifyEmailCode(code) {
        if (!signUpLoaded || !signUp) return { ok: false, error: "Sign-up isn't ready yet. Please retry." };
        try {
          const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
          if (res.status === "complete") {
            await setActiveSignUp({ session: res.createdSessionId });
            return { ok: true };
          }
          return { ok: false, error: "That code didn't complete sign-up. Please try again." };
        } catch (e) {
          return { ok: false, error: clerkErr(e) };
        }
      },
      async resendEmailCode() {
        if (!signUpLoaded || !signUp) return { ok: false, error: "Sign-up isn't ready yet. Please retry." };
        try {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: clerkErr(e) };
        }
      },
      async signInOAuth() {
        if (!signInLoaded || !signIn) return { ok: false, error: "Sign-in isn't ready yet. Please retry." };
        try {
          await signIn.authenticateWithRedirect({
            strategy: "oauth_google",
            redirectUrl: "/sso-callback",
            redirectUrlComplete: "/select-role",
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: clerkErr(e) };
        }
      },
      async signOut() {
        await clerk.signOut({ redirectUrl: "/" });
      },
    }),
    [authLoaded, userLoaded, userId, user, getToken, signInLoaded, signIn, setActiveSignIn, signUpLoaded, signUp, setActiveSignUp, clerk],
  );

  return <AppProvider auth={bridge}>{children}</AppProvider>;
}
