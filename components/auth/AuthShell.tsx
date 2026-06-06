import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { cn } from "@/lib/utils";

const benefits = [
  "Avatar-led lessons from world-class mentors",
  "A personal LEAP AI tutor on every video",
  "AI-graded checkpoints that adapt to you",
];

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  theme?: "default" | "admin";
  children: React.ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, theme = "default", children }: AuthShellProps) {
  const admin = theme === "admin";
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-2">
      {/* Brand panel — navy in light, warm charcoal in dark */}
      <div
        className={cn(
          "relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between",
          admin
            ? "bg-navy-950 dark:bg-surface"
            : "bg-gradient-to-br from-navy-800 to-navy-950 dark:from-card dark:to-surface",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-72 w-72 rounded-full bg-navy-600/40 blur-3xl" />

        <Logo variant="light" />

        <div className="relative">
          <h2 className="max-w-md font-heading text-3xl font-bold leading-tight text-white">
            {admin ? "LEAP Coach Control Center" : "Scale Human Wisdom. Become a high performance star."}
          </h2>
          <ul className="mt-7 space-y-3.5">
            {(admin
              ? ["Real-time analytics & cohort telemetry", "Curate coaching topics, videos & assessments", "Manage learners and community"]
              : benefits
            ).map((b) => (
              <li key={b} className="flex items-center gap-3 text-cream-100/85">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-gold-400" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-pretty italic text-cream-100/90">
            &ldquo;The work of a leader is to lead from values — not from fear of judgement.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-3">
            <ProfessorPhoto className="h-10 w-10" rounded="rounded-xl" position="top" />
            <div>
              <p className="font-heading text-sm font-semibold text-white">Prof. Vishal Gupta</p>
              <p className="text-xs text-cream-100/60">Professor, IIM Ahmedabad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-heading"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <span className="lg:hidden">
            <Logo size="sm" />
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md animate-fade-up">
            {eyebrow && (
              <Badge variant={admin ? "navy" : "gold"} className="mb-4">
                {eyebrow}
              </Badge>
            )}
            <h1 className="font-heading text-3xl font-bold text-heading">{title}</h1>
            {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
