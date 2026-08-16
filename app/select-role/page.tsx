"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Briefcase, Rocket, ArrowRight, LucideIcon, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/store/AppProvider";
import { ROLES, Role } from "@/lib/types";

const roleIcon: Record<Role, LucideIcon> = {
  student: GraduationCap,
  professional: Briefcase,
  entrepreneur: Rocket,
};
const accents: Record<Role, string> = {
  student: "bg-navy-600",
  professional: "bg-gold-500",
  entrepreneur: "bg-gradient-to-r from-gold-500 to-navy-600",
};

export default function SelectRolePage() {
  const { currentUser, hydrated, setRole, signOut } = useApp();
  const router = useRouter();
  const [waiting, setWaiting] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    if (currentUser?.isAdmin) {
      router.replace("/admin");
      return;
    }
    if (currentUser?.role) {
      router.replace("/dashboard");
      return;
    }
    if (currentUser) return;
    // No profile loaded yet. On a cold start (Supabase + Vercel waking up), the
    // ensureProfile + loadAll chain can take 5-8s. Show "setting up" feedback after
    // 2s; only give up and redirect to login after 12s.
    const feedback = setTimeout(() => setWaiting(true), 2000);
    const giveUp = setTimeout(() => router.replace("/login"), 12000);
    return () => {
      clearTimeout(feedback);
      clearTimeout(giveUp);
    };
  }, [hydrated, currentUser, router]);

  function choose(role: Role) {
    setRole(role);
    router.push("/dashboard");
  }

  if (!hydrated || !currentUser || currentUser.role || currentUser.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gold-500" />
          {waiting && (
            <p className="animate-fade-up text-sm text-muted">Setting up your account...</p>
          )}
        </div>
      </div>
    );
  }

  const firstName = currentUser.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-surface bg-grid">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo href={null} />
        <button onClick={signOut} className="text-sm font-medium text-muted hover:text-heading">
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h1 className="font-heading text-3xl font-bold text-heading sm:text-4xl">
            Welcome, {firstName}! Choose your path
          </h1>
          <p className="mt-3 text-muted">
            This personalizes your dashboard, catalog, and recommendations. You can explore other
            paths anytime.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = roleIcon[role.id];
            return (
              <button
                key={role.id}
                onClick={() => choose(role.id)}
                className="group relative overflow-hidden rounded-2xl border border-hair bg-card p-7 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-gold-300 hover:shadow-card-hover"
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 ${accents[role.id]}`} />
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-heading transition-colors group-hover:bg-gold-100 group-hover:text-gold-600">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-bold text-heading">{role.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{role.tagline}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-gold-600">
                  Choose {role.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
