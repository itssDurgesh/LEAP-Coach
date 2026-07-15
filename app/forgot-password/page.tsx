"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, AlertCircle, ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";

/**
 * Forgot-password flow: email → 6-digit code (sent by Clerk) → new password.
 * The new password is stored in Clerk (the auth provider) — Supabase never
 * holds passwords. On success Clerk signs the user straight in.
 */
export default function ForgotPasswordPage() {
  const { requestPasswordReset, resetPassword, supabaseMode } = useApp();
  const router = useRouter();

  const [step, setStep] = React.useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function sendCode(resend = false) {
    setError("");
    setNotice("");
    setBusy(true);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Couldn't send the reset code.");
      return;
    }
    setStep("reset");
    if (resend) setNotice("A fresh code is on its way to your inbox.");
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    const r = await resetPassword(code, password);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Couldn't reset the password.");
      return;
    }
    if (supabaseMode) {
      // Clerk signed the user in with the new password — route via the post-auth hub.
      router.push("/select-role");
    } else {
      setStep("done");
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle={
        step === "email"
          ? "Enter your account email and we'll send you a 6-digit code."
          : step === "reset"
            ? `We emailed a 6-digit code to ${email.trim()}.`
            : "All set!"
      }
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {step === "email" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendCode();
          }}
          className="space-y-4"
        >
          <Field label="Email" htmlFor="fp-email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="pl-10"
                required
                autoFocus
              />
            </div>
          </Field>
          <Button type="submit" className="w-full" loading={busy}>
            Send reset code <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={submitReset} className="space-y-4">
          <Field
            label="6-digit code"
            htmlFor="fp-code"
            hint={supabaseMode ? "Check your inbox (and spam folder)." : "Prototype: any code works."}
          >
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input
                id="fp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="pl-10 tracking-[0.3em]"
                required
                autoFocus
              />
            </div>
          </Field>
          <Field label="New password" htmlFor="fp-password" hint="At least 8 characters.">
            <PasswordInput
              id="fp-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Field label="Confirm new password" htmlFor="fp-confirm">
            <PasswordInput
              id="fp-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={code.length !== 6}>
            Set new password <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-center text-sm text-muted">
            Didn't get it?{" "}
            <button
              type="button"
              onClick={() => void sendCode(true)}
              disabled={busy}
              className="font-semibold text-gold-600 hover:text-gold-700 disabled:opacity-50"
            >
              Resend code
            </button>
            <span className="mx-2 text-faint">·</span>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
                setNotice("");
              }}
              className="font-semibold text-gold-600 hover:text-gold-700"
            >
              Use a different email
            </button>
          </p>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <p className="text-sm text-muted">Your password has been reset. Sign in with the new one.</p>
          <Link href="/login">
            <Button className="w-full">
              Go to sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
