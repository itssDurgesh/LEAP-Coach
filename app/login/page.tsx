"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { homeFor } from "@/lib/store/routes";


export default function LoginPage() {
  const { signIn, oauthSignIn, supabaseMode } = useApp();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function go(em: string, pw?: string) {
    setError("");
    setBusy(true);
    const r = await signIn(em, pw);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Sign in failed.");
      return;
    }
    // Real mode (Clerk) resolves the user asynchronously, so route through the
    // post-auth hub which redirects by role/admin once the profile loads. Mock
    // mode returns the user immediately.
    router.push(r.user ? homeFor(r.user) : "/select-role");
  }

  async function onOAuth(provider: "google") {
    if (supabaseMode) {
      setError("");
      const r = await oauthSignIn(provider);
      if (!r.ok) setError(r.error ?? "Couldn't start sign-in. Please try again.");
    } else {
      setError("Google sign-in isn't configured.");
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to LEAP Coach" subtitle="Continue your learning journey.">
      <OAuthButtons onSelect={onOAuth} />

      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-hair" /> or sign in with email
        <span className="h-px flex-1 bg-hair" />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(email, password);
        }}
        className="space-y-4"
      >
        <Field label="Email" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="pl-10"
              required
            />
          </div>
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={supabaseMode ? undefined : "Prototype: password isn't checked — any value works."}
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required={supabaseMode}
          />
        </Field>
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={busy}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>


      <p className="mt-6 text-center text-sm text-muted">
        New to LEAP Coach?{" "}
        <Link href="/signup" className="font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-faint">
        <Link href="/admin/login" className="hover:text-heading">
          Admin sign in
        </Link>
        <span className="mx-2">·</span>
        <a href="mailto:coaching@leapcoach.com" className="hover:text-heading">
          Apply for Coaching
        </a>
      </p>
    </AuthShell>
  );
}
