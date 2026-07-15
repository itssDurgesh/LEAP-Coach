"use client";

import * as React from "react";
import { ChevronDown, HelpCircle, Mail } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

export default function FaqPage() {
  const { faqs } = useApp();
  const published = [...faqs].filter((f) => f.published).sort((a, b) => a.order - b.order);
  const [openId, setOpenId] = React.useState<string | null>(published[0]?.id ?? null);

  return (
    <div className="min-h-screen bg-surface">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700 dark:bg-gold-500/10">
            <HelpCircle className="h-3.5 w-3.5" /> Help Center
          </span>
          <h1 className="mt-4 font-heading text-4xl font-bold text-heading">Frequently asked questions</h1>
          <p className="mt-3 text-muted">Everything you need to know about LEAP Coach.</p>
        </div>

        <div className="mt-10 space-y-3">
          {published.length === 0 ? (
            <p className="rounded-2xl border border-hair bg-card p-8 text-center text-muted">
              No FAQs yet. Please check back soon.
            </p>
          ) : (
            published.map((f) => {
              const open = openId === f.id;
              return (
                <div key={f.id} className="overflow-hidden rounded-2xl border border-hair bg-card">
                  <button
                    onClick={() => setOpenId(open ? null : f.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-heading text-base font-semibold text-heading">{f.question}</span>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-faint transition-transform", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div className="border-t border-hair px-5 py-4">
                      <p className="whitespace-pre-line leading-relaxed text-muted">{f.answer}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-hair bg-card p-6 text-center">
          <p className="font-heading text-lg font-semibold text-heading">Still have questions?</p>
          <p className="mt-1 text-sm text-muted">We&apos;re happy to help.</p>
          <a
            href="mailto:info.leapcoach@gmail.com"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
          >
            <Mail className="h-4 w-4" /> info.leapcoach@gmail.com
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
