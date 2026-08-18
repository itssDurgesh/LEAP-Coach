"use client";

import * as Accordion from "@radix-ui/react-accordion";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Container } from "@/components/marketing/Container";
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
    <section className="bg-card py-20 sm:py-28">
      <Container width="wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-4">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              Questions
            </p>
            <h2 className="mt-4 text-balance font-heading text-display font-bold text-heading">
              Before you start
            </h2>
            <Link
              href="/faq"
              className="group mt-6 inline-flex items-center gap-2 font-heading text-sm font-semibold text-gold-700 transition-colors duration-200 hover:text-gold-600"
            >
              Read every question
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
            </Link>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-8">
            <Accordion.Root type="single" collapsible className="border-t border-hair">
              {list.map((f) => (
                <Accordion.Item key={f.id} value={f.id} className="border-b border-hair">
                  <Accordion.Header>
                    <Accordion.Trigger className="group flex w-full items-start justify-between gap-6 py-5 text-left">
                      <span className="font-heading text-base font-semibold text-heading transition-colors duration-200 group-hover:text-gold-700 sm:text-lg">
                        {f.question}
                      </span>
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-hair text-muted transition-all duration-300 ease-out-expo group-hover:border-gold-500 group-hover:text-gold-600 group-data-[state=open]:rotate-45 group-data-[state=open]:border-gold-500 group-data-[state=open]:bg-gold-500 group-data-[state=open]:text-navy-900">
                        <Plus className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                    </Accordion.Trigger>
                  </Accordion.Header>
                  <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <p className="max-w-xl whitespace-pre-line pb-6 text-sm leading-[1.75] text-muted">
                      {f.answer}
                    </p>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
