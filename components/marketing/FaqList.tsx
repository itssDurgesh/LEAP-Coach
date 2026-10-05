"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

/** Questions as a stack of white cards that open one at a time. Used on the home page and on /faq. */
export function FaqList({ items, defaultOpen }: { items: { id: string; question: string; answer: string }[]; defaultOpen?: string }) {
  return (
    <Accordion.Root type="single" collapsible defaultValue={defaultOpen} className="space-y-3">
      {items.map((f) => (
        <Accordion.Item key={f.id} value={f.id} className="rounded-[20px] bg-card shadow-v2-soft transition-shadow duration-200 data-[state=open]:shadow-v2-card">
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 px-5 py-4 text-left sm:px-6 sm:py-5">
              <span className="font-heading text-base font-semibold tracking-[-0.01em] text-heading sm:text-lg">{f.question}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-heading transition-all duration-300 ease-out-expo group-data-[state=open]:rotate-45 group-data-[state=open]:bg-[#E9B93E] group-data-[state=open]:text-navy-800">
                <Plus className="h-4 w-4" strokeWidth={2.25} />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="max-w-2xl whitespace-pre-line px-5 pb-5 text-[15px] leading-6 text-v2-body sm:px-6 sm:pb-6">{f.answer}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
