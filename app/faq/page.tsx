"use client";

import { Mail } from "lucide-react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Container } from "@/components/marketing/Container";
import { FaqList } from "@/components/marketing/FaqList";
import { SectionHead } from "@/components/marketing/SectionHead";
import { v2Button } from "@/components/v2/button";
import { useApp } from "@/lib/store/AppProvider";

export default function FaqPage() {
  const { faqs } = useApp();
  const published = [...faqs].filter((f) => f.published).sort((a, b) => a.order - b.order);

  return (
    <div className="app-v2 min-h-screen bg-surface font-sans text-heading">
      <SiteNav />

      <main>
        <Container width="prose" className="py-14 sm:py-20">
          <SectionHead
            as="h1"
            tag="Help center"
            title="Frequently asked questions"
            text="Answers to the questions we get most often about LEAP Coach."
          />

          <div className="mt-10">
            {published.length === 0 ? (
              <p className="rounded-[24px] bg-card p-12 text-center text-v2-body shadow-v2-card">
                No FAQs yet. Please check back soon.
              </p>
            ) : (
              <FaqList items={published} defaultOpen={published[0]?.id} />
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-[24px] bg-card p-7 shadow-v2-card">
            <div>
              <p className="font-heading text-xl font-semibold tracking-[-0.01em] text-heading">Still have questions?</p>
              <p className="mt-1 text-sm text-v2-body">We&apos;re happy to help.</p>
            </div>
            <a href="mailto:info.leapcoach@gmail.com" className={v2Button("strong")}>
              <Mail className="h-4 w-4" /> info.leapcoach@gmail.com
            </a>
          </div>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
