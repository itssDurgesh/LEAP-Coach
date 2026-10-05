import { Flag, Layers, Lock, Play, Trophy, type LucideIcon } from "lucide-react";
import type { Stamp } from "@/lib/stamps";
import { cn } from "@/lib/utils";

const STAMP_ICONS: Record<string, LucideIcon> = {
  first_video: Play,
  first_topic: Flag,
  topics_5: Layers,
  tier_learner: Trophy,
  tier_advanced: Trophy,
  topics_10: Layers,
};

/** The learner's stamps, three to a row: earned ones in gold, the rest locked with their progress. */
export function StampGrid({ stamps }: { stamps: Stamp[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-2.5 gap-y-3.5">
      {stamps.map((s) => {
        const Icon = s.earned ? (STAMP_ICONS[s.id] ?? Trophy) : Lock;
        return (
          <div key={s.id} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "grid h-12 w-12 place-items-center rounded-full",
                s.earned ? "border-[1.5px] border-gold-400 bg-v2-gold-soft text-gold-600" : "bg-surface-2 text-muted",
              )}
            >
              <Icon className={cn("h-[22px] w-[22px]", s.earned && s.id === "first_video" && "fill-current")} />
            </span>
            <span>
              <span className={cn("block text-xs font-semibold", s.earned ? "text-heading" : "text-muted")}>{s.label}</span>
              <span className={cn("block text-xs font-medium", s.earned ? "text-v2-gold-text" : "text-muted")}>
                {s.earned ? "Earned" : `${s.current.toLocaleString("en-IN")} / ${s.target.toLocaleString("en-IN")}`}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
