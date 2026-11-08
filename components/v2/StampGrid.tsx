import { Award, ClipboardCheck, Flag, Flame, Layers, Lightbulb, Lock, Play, Sparkles, Star, Trophy, type LucideIcon } from "lucide-react";
import type { Stamp } from "@/lib/stamps";
import { cn } from "@/lib/utils";

const STAMP_ICONS: Record<string, LucideIcon> = {
  first_video: Play,
  videos_10: Play,
  first_checkpoint: ClipboardCheck,
  perfect_score: Sparkles,
  first_topic: Flag,
  topics_5: Layers,
  topics_10: Layers,
  tier_learner: Trophy,
  tier_advanced: Award,
  tier_star: Star,
  streak_7: Flame,
  ideas_7: Lightbulb,
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Stamps, three to a row: earned ones in gold (with the date they were earned
 * when it is known), the rest locked with the learner's progress towards them.
 * `compact` shows only the earned date line, for other people's profiles.
 */
export function StampGrid({ stamps, columns = 3 }: { stamps: Stamp[]; columns?: 3 | 4 }) {
  return (
    <ul className={cn("grid gap-x-2.5 gap-y-3.5", columns === 4 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3")}>
      {stamps.map((s) => {
        const Icon = s.earned ? (STAMP_ICONS[s.id] ?? Trophy) : Lock;
        const when = s.earned && s.earnedAt ? `Earned ${fmt(s.earnedAt)}` : s.earned ? "Earned" : `${s.current.toLocaleString("en-IN")} / ${s.target.toLocaleString("en-IN")}`;
        return (
          <li key={s.id} className="group flex flex-col items-center gap-1.5 text-center" title={`${s.label}: ${s.hint}. ${when}.`}>
            <span
              className={cn(
                "relative grid h-12 w-12 place-items-center rounded-full transition-transform duration-200 ease-out-expo group-hover:-translate-y-0.5",
                s.earned ? "border-[1.5px] border-gold-400 bg-v2-gold-soft text-gold-600" : "bg-surface-2 text-muted",
              )}
            >
              <Icon className={cn("h-[22px] w-[22px]", s.earned && (s.id === "first_video" || s.id === "videos_10") && "fill-current")} />
              {/* Progress ring for a stamp that is under way. */}
              {!s.earned && s.current > 0 && (
                <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
                  <circle cx="24" cy="24" r="22.5" fill="none" strokeWidth="2.5" className="stroke-gold-400" strokeLinecap="round"
                    strokeDasharray={`${(Math.min(1, s.current / s.target) * 141.4).toFixed(1)} 141.4`} />
                </svg>
              )}
            </span>
            <span>
              <span className={cn("block text-xs font-semibold", s.earned ? "text-heading" : "text-muted")}>{s.label}</span>
              <span className={cn("block text-xs font-medium", s.earned ? "text-v2-gold-text" : "text-muted")}>
                {s.earned ? (s.earnedAt ? fmt(s.earnedAt).replace(/ \d{4}$/, "") : "Earned") : `${s.current.toLocaleString("en-IN")} / ${s.target.toLocaleString("en-IN")}`}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
