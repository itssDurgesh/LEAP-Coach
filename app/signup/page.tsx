"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon,
  Mail,
  Building2,
  Globe,
  MapPin,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Field, Input, PasswordInput, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { Gender } from "@/lib/types";

function IconInput({
  icon: Icon,
  ...props
}: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <Input {...props} className="pl-10" />
    </div>
  );
}

export default function SignupPage() {
  const { signUp, verifyEmailCode, resendEmailCode, oauthSignIn, supabaseMode } = useApp();
  const router = useRouter();

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "" as "" | Gender,
    company: "",
    nationality: "",
    region: "",
  });
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Email-verification step: Clerk emails a 6-digit code, collected here.
  const [awaitingCode, setAwaitingCode] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [info, setInfo] = React.useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await signUp({
      name: form.name,
      email: form.email,
      password: form.password,
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender || undefined,
      company: form.company || undefined,
      nationality: form.nationality || undefined,
      region: form.region || undefined,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Could not create account.");
      return;
    }
    if (r.needsVerification) {
      setAwaitingCode(true);
      return;
    }
    router.push("/select-role");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await verifyEmailCode(code);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Invalid or expired code. Please try again.");
      return;
    }
    router.push("/select-role");
  }

  async function resend() {
    setError("");
    setInfo("");
    const r = await resendEmailCode();
    setInfo(r.ok ? "A new code is on its way to your inbox." : (r.error ?? "Couldn't resend the code."));
  }

  async function oauth(provider: "google") {
    if (supabaseMode) {
      const r = await oauthSignIn(provider);
      if (!r.ok) setError(r.error ?? "Couldn't start sign-in. Please try again.");
      return;
    }
    const r = await signUp({
      name: "Google User",
      email: `${provider}.${Date.now().toString(36)}@example.com`,
    });
    if (r.ok) router.push("/select-role");
  }

  // ── Email verification step ──
  if (awaitingCode) {
    return (
      <AuthShell
        eyebrow="Verify your email"
        title="Enter your code"
        subtitle={`We emailed a 6-digit code to ${form.email}. Enter it to finish creating your account.`}
      >
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-sm text-green-700">
            {info}
          </div>
        )}

        <form onSubmit={verify} className="space-y-4">
          <Field label="Verification code" htmlFor="code" required>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              required
            />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={code.length < 6}>
            Verify &amp; continue <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <button type="button" onClick={resend} className="font-medium text-gold-600 hover:text-gold-700">
            Resend code
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaitingCode(false);
              setCode("");
              setError("");
              setInfo("");
            }}
            className="font-medium text-muted hover:text-heading"
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join LEAP Coach and build authentic leadership."
    >
      <OAuthButtons onSelect={oauth} />

      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-cream-300" /> or with your details
        <span className="h-px flex-1 bg-cream-300" />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" htmlFor="name" required>
          <IconInput icon={UserIcon} id="name" value={form.name} onChange={set("name")} placeholder="Aarav Sharma" required />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" required>
            <IconInput icon={Mail} id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
          </Field>
          <Field label="Password" htmlFor="password" required>
            <PasswordInput id="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Age" htmlFor="age">
            <Input id="age" type="number" min={10} max={100} value={form.age} onChange={set("age")} placeholder="e.g. 24" />
          </Field>
          <Field label="Gender" htmlFor="gender">
            <Select id="gender" value={form.gender} onChange={set("gender")}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not">Prefer not to say</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company / College" htmlFor="company">
            <IconInput icon={Building2} id="company" value={form.company} onChange={set("company")} placeholder="IIM Ahmedabad" />
          </Field>
          <Field label="Nationality" htmlFor="nationality">
            <IconInput icon={Globe} id="nationality" value={form.nationality} onChange={set("nationality")} placeholder="India" />
          </Field>
        </div>

        <Field label="Region / State" htmlFor="region">
          <IconInput icon={MapPin} id="region" value={form.region} onChange={set("region")} placeholder="Maharashtra" />
        </Field>

        <Button type="submit" className="w-full" loading={busy}>
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
