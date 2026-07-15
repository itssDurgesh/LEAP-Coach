"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { useApp } from "@/lib/store/AppProvider";

export default function PrivacyPage() {
  const { privacyPolicy } = useApp();
  const blocks = (privacyPolicy || "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-surface">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gold-50 text-gold-600 dark:bg-gold-500/10">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="font-heading text-3xl font-bold text-heading sm:text-4xl">Privacy Policy</h1>
        </div>

        <div className="mt-8 space-y-6">
          {blocks.map((block, i) => {
            const nl = block.indexOf("\n");
            // A short first line (no newline / heading-like) renders as a section heading.
            if (nl > 0) {
              const heading = block.slice(0, nl).trim();
              const body = block.slice(nl + 1).trim();
              return (
                <section key={i}>
                  <h2 className="font-heading text-lg font-semibold text-heading">{heading}</h2>
                  <p className="mt-1.5 whitespace-pre-line leading-relaxed text-muted">{body}</p>
                </section>
              );
            }
            return (
              <p key={i} className="whitespace-pre-line leading-relaxed text-muted">
                {block}
              </p>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
