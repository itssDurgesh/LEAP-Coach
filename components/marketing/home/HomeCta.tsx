import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { Reveal } from "@/components/motion/Reveal";
import { v2Button } from "@/components/v2/button";

export function HomeCta() {
  return (
    <section className="pb-16 pt-8 sm:pb-20">
      <Container width="wide">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] bg-v2-navy px-6 py-14 text-center shadow-v2-card sm:px-12 sm:py-20">
            <span aria-hidden className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-gold-400/15" />
            <span aria-hidden className="absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-lv-self/20" />

            <h2 className="relative mx-auto max-w-3xl text-balance font-heading text-display font-bold leading-[1.08] text-white">
              Ready to become a <span className="text-gold-400">high performance star</span>?
            </h2>
            <p className="relative mx-auto mt-5 max-w-lg text-base leading-6 text-v2-on-navy-muted sm:text-lg sm:leading-7">
              Join LEAP Coach today and start your first lesson in minutes.
            </p>

            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/signup" className={v2Button("primary", "md", "group")}>
                Start Your Journey
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
              </Link>
              <Link href="/login" className={v2Button("ghostOnNavy", "md", "border border-white/25")}>
                I already have an account
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
