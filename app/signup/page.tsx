"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  Building2,
  Globe,
  MapPin,
  Check,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useApp } from "@/lib/store/AppProvider";
import { Gender } from "@/lib/types";

const DEMO_OTP = "123456";

function IconInput({
  icon: Icon,
  ...props
}: { icon: typeof Mail } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
      <Input {...props} className="pl-10" />
    </div>
  );
}

export default function SignupPage() {
  const { signUp } = useApp();
  const router = useRouter();

  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    age: "",
    gender: "" as "" | Gender,
    phone: "",
    company: "",
    nationality: "",
    region: "",
  });
  const [error, setError] = React.useState("");

  // OTP flow
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [phoneVerified, setPhoneVerified] = React.useState(false);
  const [otpError, setOtpError] = React.useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function verifyOtp() {
    if (otpCode.trim().length === 6) {
      setPhoneVerified(true);
      setOtpError("");
    } else {
      setOtpError(`Enter the 6-digit code (demo: ${DEMO_OTP}).`);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = signUp({
      name: form.name,
      email: form.email,
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender || undefined,
      phone: form.phone || undefined,
      phoneVerified,
      company: form.company || undefined,
      nationality: form.nationality || undefined,
      region: form.region || undefined,
    });
    if (!r.ok) {
      setError(r.error ?? "Could not create account.");
      return;
    }
    router.push("/select-role");
  }

  function oauth(provider: "google" | "linkedin") {
    const label = provider === "google" ? "Google" : "LinkedIn";
    const r = signUp({
      name: `${label} User`,
      email: `${provider}.${Date.now().toString(36)}@example.com`,
      phoneVerified: true,
    });
    if (r.ok) router.push("/select-role");
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join 9,000+ learners building authentic leadership."
    >
      <OAuthButtons onSelect={oauth} />

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
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
            <IconInput icon={Lock} id="password" type="password" value={form.password} onChange={set("password")} placeholder="••••••••" required />
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

        {/* Phone + OTP */}
        <Field label="Phone number" htmlFor="phone" hint={!otpSent && !phoneVerified ? "We'll verify this with a one-time code." : undefined}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  set("phone")(e);
                  setOtpSent(false);
                  setPhoneVerified(false);
                }}
                placeholder="+91 98xxx xxxxx"
                className="pl-10"
                disabled={phoneVerified}
              />
            </div>
            {phoneVerified ? (
              <span className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" /> Verified
              </span>
            ) : (
              <Button
                type="button"
                variant="subtle"
                onClick={() => {
                  if (form.phone.trim()) setOtpSent(true);
                }}
                disabled={!form.phone.trim()}
              >
                Send code
              </Button>
            )}
          </div>
        </Field>

        {otpSent && !phoneVerified && (
          <div className="rounded-xl border border-gold-200 bg-gold-50 p-3.5">
            <p className="text-xs text-ink-soft">
              Enter the 6-digit code sent to your phone.{" "}
              <span className="font-semibold text-gold-700">Demo code: {DEMO_OTP}</span>
            </p>
            <div className="mt-2.5 flex gap-2">
              <Input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                className="tracking-[0.4em]"
              />
              <Button type="button" onClick={verifyOtp}>
                Verify
              </Button>
            </div>
            {otpError && <p className="mt-1.5 text-xs font-medium text-red-600">{otpError}</p>}
          </div>
        )}

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

        <Button type="submit" className="w-full">
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-gold-600 hover:text-gold-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
