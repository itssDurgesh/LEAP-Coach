import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal } from "@/components/motion/Reveal";
import { buttonClasses } from "@/components/ui/button-variants";

export function HomeCta() {
  return (
    <section className="relative overflow-hidden bg-navy-950 dark:bg-card">
      <div className="pointer-events-none absolute inset-0 texture-rules opacity-[0.07]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 texture-grain opacity-[0.16] mix-blend-overlay" aria-hidden />

      <Container width="prose" className="relative py-24 text-center sm:py-32">
        <Reveal>
          <h2 className="text-balance font-heading text-display font-extrabold leading-[1.05] text-white">
            Ready to become a{" "}
            <span className="text-gradient-gold-hero">high performance star</span>?
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-cream-100/70 sm:text-lg">
            Join LEAP Coach today and start your first lesson in minutes.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/signup"
              className={buttonClasses({
                variant: "primary",
                size: "lg",
                className: "group w-full justify-center sm:w-auto",
              })}
            >
              Start Your Journey
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className={buttonClasses({
                variant: "outline",
                size: "lg",
                className:
                  "w-full justify-center border-white/25 bg-transparent text-white hover:border-white/40 hover:bg-white/10 sm:w-auto",
              })}
            >
              I already have an account
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
