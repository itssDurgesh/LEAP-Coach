"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";

export default function AdminLoginPage() {
  const { adminSignIn } = useApp();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = adminSignIn(email, password);
    if (!r.ok) {
      setError(r.error ?? "Sign in failed.");
      return;
    }
    router.push("/admin");
  }

  return (
    <AuthShell
      theme="admin"
      eyebrow="Admin Access"
      title="Control Center sign in"
      subtitle="Authorized administrators only."
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Admin email" htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@leapcoach.com"
              className="pl-10"
              required
            />
          </div>
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
            />
          </div>
        </Field>
        <Button type="submit" variant="navy" className="w-full">
          <ShieldCheck className="h-4 w-4" /> Enter Control Center
        </Button>
      </form>

      <div className="mt-5 rounded-xl border border-cream-200 bg-cream-50 p-3.5 text-xs text-ink-soft">
        <span className="font-semibold text-navy-700">Prototype credentials:</span> admin@leapcoach.com
        / leap-admin
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Not an admin?{" "}
        <Link href="/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Learner sign in
        </Link>
      </p>
    </AuthShell>
  );
}
