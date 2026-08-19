import Link from "next/link";
import { ArrowUpRight, Briefcase, GraduationCap, LucideIcon, Rocket } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ROLES, Role } from "@/lib/types";

const roleIconMap: Record<Role, LucideIcon> = {
  student: GraduationCap,
  professional: Briefcase,
  entrepreneur: Rocket,
};

/**
 * The three learning paths, set as an editorial index rather than three identical
 * cards — big type, hairline rules, and a gold wash that sweeps in on hover. Each
 * row still links to /signup exactly as before.
 */
export function HomePaths() {
  return (
    <section id="paths" className="bg-surface py-16 sm:py-20">
      <Container width="wide">
        <Reveal className="max-w-2xl">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            Three learning paths
          </p>
          <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
            Built for who you are right now
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
            Your dashboard, catalog, and recommendations adapt to your path from the moment you
            join.
          </p>
        </Reveal>

        <Stagger className="mt-14 border-t border-hair" gap={0.1}>
          {ROLES.map((role, i) => {
            const Icon = roleIconMap[role.id];
            return (
              <StaggerItem key={role.id}>
                <Link
                  href="/signup"
                  className="group relative flex items-center gap-5 overflow-hidden border-b border-hair py-7 transition-colors duration-300 sm:gap-8 sm:py-9"
                >
                  {/* Gold wash sweeping in from the left on hover. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-gradient-to-r from-gold-100/70 to-transparent transition-transform duration-500 ease-out-expo group-hover:scale-x-100 dark:from-gold-500/10"
                  />

                  <span className="relative font-heading text-sm font-semibold tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-heading transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-navy-900 sm:h-14 sm:w-14">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                  </span>

                  <span className="relative min-w-0 flex-1">
                    <span className="block font-heading text-xl font-bold leading-tight text-heading transition-colors duration-300 group-hover:text-gold-700 sm:text-2xl">
                      {role.label}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-muted">
                      {role.tagline}
                    </span>
                  </span>

                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-hair text-muted transition-all duration-300 ease-out-expo group-hover:border-gold-500 group-hover:bg-gold-500 group-hover:text-navy-900">
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Container>
    </section>
  );
}
