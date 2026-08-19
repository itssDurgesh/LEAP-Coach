import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { cn } from "@/lib/utils";

const benefits = [
  "High-quality, evidence-based lessons from world-class mentors",
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
        {/* Structural texture rather than blurred corner blobs */}
        <div className="pointer-events-none absolute inset-0 texture-rules opacity-[0.07]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 texture-grain opacity-[0.15] mix-blend-overlay"
          aria-hidden
        />

        <Logo variant="light" />

        <div className="relative">
          <h2 className="max-w-md text-balance font-heading text-display-sm font-bold leading-tight text-white">
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

        <div className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
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
            className="group inline-flex items-center gap-2 font-heading text-sm font-semibold text-muted transition-colors duration-200 hover:text-heading"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" /> Back to home
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
            <h1 className="text-balance font-heading text-display-sm font-bold leading-tight text-heading">{title}</h1>
            {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
