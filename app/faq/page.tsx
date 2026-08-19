"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Mail, Plus } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Container } from "@/components/marketing/Container";
import { buttonClasses } from "@/components/ui/button-variants";
import { useApp } from "@/lib/store/AppProvider";

export default function FaqPage() {
  const { faqs } = useApp();
  const published = [...faqs].filter((f) => f.published).sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-surface">
      <SiteNav />

      <main>
        <Container width="prose" className="py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
              Help center
            </p>
            <h1 className="mt-4 text-balance font-heading text-display font-bold text-heading">
              Frequently asked questions
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Answers to the questions we get most often about LEAP Coach.
            </p>
          </div>

          {published.length === 0 ? (
            <p className="mt-12 rounded-3xl border border-dashed border-hair bg-card p-12 text-center text-muted">
              No FAQs yet. Please check back soon.
            </p>
          ) : (
            <Accordion.Root
              type="single"
              collapsible
              defaultValue={published[0]?.id}
              className="mt-12 border-t border-hair"
            >
              {published.map((f) => (
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
                    <p className="max-w-2xl whitespace-pre-line pb-6 leading-[1.75] text-muted">
                      {f.answer}
                    </p>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          )}

          <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-hair bg-card p-7">
            <div>
              <p className="font-heading text-lg font-bold text-heading">Still have questions?</p>
              <p className="mt-1 text-sm text-muted">We&apos;re happy to help.</p>
            </div>
            <a
              href="mailto:info.leapcoach@gmail.com"
              className={buttonClasses({ variant: "navy", size: "md" })}
            >
              <Mail className="h-4 w-4" /> info.leapcoach@gmail.com
            </a>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
