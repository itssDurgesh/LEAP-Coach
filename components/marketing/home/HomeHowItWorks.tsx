"use client";

import { Clapperboard, ClipboardCheck, Layers, type LucideIcon } from "lucide-react";
import { Container } from "@/components/marketing/Container";
import { CARD, SectionHead } from "@/components/marketing/SectionHead";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/ui/Logo";
import { LevelChip } from "@/components/v2/ui";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";

// `icon: null` is the LEAP AI tutor, which always wears the logo.
const features: { icon: LucideIcon | null; look: string; title: string; body: string; span: string }[] = [
  {
    icon: Clapperboard,
    look: "bg-lv-peers-tint text-lv-peers-dark",
    title: "High-Quality Video Lessons",
    body: "Evidence-based lessons recorded by the professor himself, in studio-quality video that streams instantly, anytime.",
    span: "lg:col-span-7",
  },
  {
    icon: null,
    look: "",
    title: "LEAP AI Tutor",
    body: "A context-aware AI tutor on every video, grounded strictly in that lesson. Ask it to summarize, quiz you, or go deeper.",
    span: "lg:col-span-5",
  },
  {
    icon: ClipboardCheck,
    look: "bg-lv-orgs-tint text-lv-orgs-dark",
    title: "AI-Graded Assessments",
    body: "Checkpoints every two lessons, with instant personalized feedback on where to improve.",
    span: "lg:col-span-5",
  },
  {
    icon: Layers,
    look: "bg-lv-upwards-tint text-lv-upwards-dark",
    title: "Structured Tracks",
    body: "Role-specific roadmaps spanning leading self, people, peers, cultures and organizations.",
    span: "lg:col-span-7",
  },
];

/**
 * What the platform gives you, as four cards. The three "how it works" steps that
 * used to sit above them are now the scroll story (`HomeStory`).
 */
export function HomeHowItWorks() {
  const { tracks } = useApp();

  return (
    <section className="py-16 sm:py-20">
      <Container width="wide">
        <Reveal>
          <SectionHead
            tag="What you get"
            title="More than a video library"
            text="A system that teaches, tutors, and tests — so what you learn actually holds up under pressure."
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-12" gap={0.08}>
          {features.map((f) => (
            <StaggerItem key={f.title} className={f.span}>
              <div className={cn(CARD, "h-full p-7 transition-all duration-300 ease-out-expo hover:-translate-y-1 hover:shadow-v2-lift sm:p-8")}>
                {f.icon ? (
                  <span className={cn("grid h-12 w-12 place-items-center rounded-full", f.look)}>
                    <f.icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
                  </span>
                ) : (
                  <LogoMark className="h-12 w-12" />
                )}
                <h3 className="mt-5 font-heading text-xl font-semibold tracking-[-0.01em] text-heading">{f.title}</h3>
                <p className="mt-2 max-w-md text-[15px] leading-6 text-v2-body">{f.body}</p>
                {f.icon === Layers && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tracks.map((t) => (
                      <LevelChip key={t.id} trackId={t.id} tracks={tracks} />
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
