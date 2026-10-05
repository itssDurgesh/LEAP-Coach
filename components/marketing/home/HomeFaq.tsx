"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { FaqList } from "@/components/marketing/FaqList";
import { SectionHead } from "@/components/marketing/SectionHead";
import { Reveal } from "@/components/motion/Reveal";
import { useApp } from "@/lib/store/AppProvider";

/** Top few published FAQs, same source as /faq. Hidden when there are none. */
export function HomeFaq() {
  const { faqs } = useApp();
  const list = [...faqs]
    .filter((f) => f.published)
    .sort((a, b) => a.order - b.order)
    .slice(0, 5);

  if (!list.length) return null;

  return (
    <section className="py-16 sm:py-20">
      <Container width="wide">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <SectionHead tag="Questions" title="Before you start" />
            <Link href="/faq" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-v2-gold-text hover:underline">
              Read every question
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <FaqList items={list} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
