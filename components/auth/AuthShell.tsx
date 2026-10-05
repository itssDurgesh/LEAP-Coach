import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/Badge";
import { ProfessorPhoto } from "@/components/ProfessorPhoto";
import { Tag } from "@/components/marketing/SectionHead";
import { cn } from "@/lib/utils";

const adminBenefits = [
  "Real-time analytics & cohort telemetry",
  "Curate coaching topics, videos & assessments",
  "Manage learners and community",
];

const benefits = [
  "High-quality, evidence-based lessons from world-class mentors",
  "A personal LEAP AI tutor on every video",
  "AI-graded checkpoints that adapt to you",
];

/** Pass as `className` to the main `Button` of a learner sign-in form: the gold pill of the version 2 look. */
export const AUTH_SUBMIT =
  "h-12 w-full rounded-full bg-[#E9B93E] font-sans text-[15px] text-navy-800 shadow-none hover:bg-[#F4CB5B] hover:shadow-v2-gold active:bg-[#E9B93E]";

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  theme?: "default" | "admin";
  children: React.ReactNode;
}

/**
 * Two-panel frame of the sign-in screens, in the version 2 look. `theme="admin"`
 * swaps the brand panel's words and adds the admin styling scope (`admin-v2`).
 */
export function AuthShell({ eyebrow, title, subtitle, theme = "default", children }: AuthShellProps) {
  const admin = theme === "admin";
  return (
    <div className={cn("app-v2 min-h-screen bg-surface font-sans text-heading lg:grid lg:grid-cols-2", admin && "admin-v2")}>
      {/* Brand panel: a navy card on the light page */}
      <div className="relative m-4 hidden overflow-hidden rounded-[28px] bg-v2-navy p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
        <span aria-hidden className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gold-400/15" />
        <span aria-hidden className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-lv-self/20" />

        <div className="relative">
          <Logo variant="light" />
        </div>

        <div className="relative">
          <h2 className="max-w-md text-balance font-heading text-display-sm font-bold leading-tight text-white">
            {admin ? "LEAP Coach Control Center" : "Scale Human Wisdom. Become a high performance star."}
          </h2>
          <ul className="mt-7 space-y-3.5">
            {(admin ? adminBenefits : benefits).map((b) => (
              <li key={b} className="flex items-center gap-3 text-white">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-gold-400">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-[24px] bg-white/[0.07] p-6">
          <p className="text-pretty italic leading-6 text-white">
            &ldquo;The work of a leader is to lead from values — not from fear of judgement.&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <ProfessorPhoto className="h-10 w-10" rounded="rounded-full" position="top" />
            <div>
              <p className="font-heading text-sm font-semibold text-white">Prof. Vishal Gupta</p>
              <p className="text-xs font-medium text-v2-on-navy-muted">Professor, IIM Ahmedabad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between p-5 sm:p-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors duration-200 hover:text-heading"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:-translate-x-1" /> Back to home
          </Link>
          <span className="lg:hidden">
            <Logo size="sm" />
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <div className="w-full max-w-md animate-fade-up">
            {eyebrow &&
              (admin ? (
                <Badge variant="navy" className="mb-4">
                  {eyebrow}
                </Badge>
              ) : (
                <Tag className="mb-4">{eyebrow}</Tag>
              ))}
            <h1 className="text-balance font-heading text-display-sm font-bold leading-tight text-heading">{title}</h1>
            {subtitle && <p className={cn("mt-2", admin ? "text-muted" : "text-v2-body")}>{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
