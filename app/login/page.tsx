"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { homeFor } from "@/lib/store/routes";
import { DEMO_ACCOUNTS } from "@/lib/mock/seed";

const demoRoles = [
  { role: "student", label: "Student" },
  { role: "professional", label: "Professional" },
  { role: "entrepreneur", label: "Entrepreneur" },
] as const;

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
    router.push(homeFor(r.user));
  }

  function onOAuth(provider: "google" | "linkedin") {
    if (supabaseMode) oauthSignIn(provider);
    else go(DEMO_ACCOUNTS.professional);
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to Leap Coach" subtitle="Continue your learning journey.">
      <OAuthButtons onSelect={onOAuth} />

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-cream-300" /> or sign in with email
        <span className="h-px flex-1 bg-cream-300" />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
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
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
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
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required={supabaseMode}
            />
          </div>
        </Field>
        <Button type="submit" className="w-full" loading={busy}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {!supabaseMode && (
        <div className="mt-6 rounded-xl border border-cream-200 bg-cream-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Quick demo sign-in</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {demoRoles.map((d) => (
              <button
                key={d.role}
                onClick={() => go(DEMO_ACCOUNTS[d.role])}
                className="rounded-lg border border-cream-300 bg-white px-3 py-1.5 text-sm font-medium text-navy-700 transition-colors hover:border-gold-300 hover:bg-gold-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Leap Coach?{" "}
        <Link href="/signup" className="font-semibold text-gold-600 hover:text-gold-700">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-ink-faint">
        <Link href="/admin/login" className="hover:text-navy-700">
          Admin sign in
        </Link>
        <span className="mx-2">·</span>
        <a href="mailto:coaching@leapcoach.com" className="hover:text-navy-700">
          Apply for Coaching
        </a>
      </p>
    </AuthShell>
  );
}
