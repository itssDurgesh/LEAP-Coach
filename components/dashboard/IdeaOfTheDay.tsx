"use client";

import * as React from "react";
import { Check, Info, Lightbulb } from "lucide-react";
import { LevelChip } from "@/components/v2/ui";
import type { LeadershipTrack } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * PLACEHOLDER CONTENT. The Idea of the day feature is not built yet: there is no
 * table of ideas, no admin screen to write them and answers are not saved. This
 * card shows one fixed sample so the dashboard matches the design. Replace
 * SAMPLE_IDEA with data from the store when the feature is built, and remove the
 * "Sample" tag.
 */
const SAMPLE_IDEA = {
  trackId: "leading_people",
  title: "Psychological safety",
  body: "People speak up, ask for help and admit mistakes when they trust they will not be blamed for it.",
  question: "A teammate tells you about a mistake the day before a deadline. What do you say first?",
  options: [
    { text: "Thanks for telling me. What do we need?", good: true, feedback: "Good start. Thanking people for speaking up makes early warnings more likely next time." },
    { text: "Why did you not say so earlier?", good: false, feedback: "Blame lands first. People who are blamed tend to report the next mistake later." },
    { text: "Leave it, I will fix it myself.", good: false, feedback: "It fixes today, but your teammate learns nothing and may stop telling you." },
  ],
};

export function IdeaOfTheDay({ tracks }: { tracks: LeadershipTrack[] }) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const idea = SAMPLE_IDEA;
  const chosen = picked === null ? null : idea.options[picked];

  return (
    <div className="flex h-full min-w-0 flex-col justify-between rounded-[24px] border border-transparent bg-v2-idea p-[26px] dark:border-gold-500/25">
      <div className="space-y-3.5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-v2-navy px-2.5 py-1 text-xs font-semibold text-white">
            <Lightbulb className="h-3.5 w-3.5 text-gold-400" strokeWidth={2.2} /> Idea of the day
          </span>
          <LevelChip trackId={idea.trackId} tracks={tracks} />
          <span className="ml-auto rounded-full border border-v2-line-strong px-2.5 py-0.5 text-xs font-semibold text-muted">Sample</span>
        </div>
        <h2 className="font-heading text-[26px] font-bold leading-[1.2] tracking-[-0.015em] text-heading">{idea.title}</h2>
        <p className="text-[15px] leading-6 text-v2-body">{idea.body}</p>
      </div>

      <div className="space-y-3">
        <p id="idea-question" className="text-[15px] font-semibold leading-[22px] text-heading">
          {idea.question}
        </p>
        <div role="radiogroup" aria-labelledby="idea-question" className="space-y-2">
          {idea.options.map((o, i) => {
            const on = picked === i;
            return (
              <button
                key={o.text}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPicked(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-2xl bg-card px-3.5 py-2.5 text-left text-sm text-heading ring-inset transition-shadow duration-200",
                  on ? "font-semibold ring-2 ring-v2-strong" : "font-medium ring-1 ring-v2-line-strong hover:ring-heading",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                    on ? "bg-v2-strong text-v2-on-strong" : "border-[1.5px] border-faint bg-card",
                  )}
                >
                  {on && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="min-h-5">
          {chosen ? (
            <p className="flex items-center gap-2 text-[13px] font-medium leading-5 text-v2-body">
              <span
                className={cn(
                  "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
                  chosen.good ? "bg-lv-orgs text-white" : "bg-gold-400 text-navy-800",
                )}
              >
                {chosen.good ? <Check className="h-[11px] w-[11px]" strokeWidth={3} /> : <Info className="h-[11px] w-[11px]" strokeWidth={3} />}
              </span>
              {chosen.feedback}
            </p>
          ) : (
            <p className="text-xs font-medium text-muted">Pick one to see a response.</p>
          )}
        </div>
      </div>
    </div>
  );
}
