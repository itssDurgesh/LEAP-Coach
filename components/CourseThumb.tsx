import Image from "next/image";
import { Briefcase, GraduationCap, Rocket, LucideIcon } from "lucide-react";
import { canOptimize } from "@/lib/images";
import { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-navy-800 via-navy-700 to-navy-900",
  "from-gold-500 via-gold-600 to-gold-700",
  "from-navy-700 via-navy-600 to-gold-700",
  "from-[#22325c] via-navy-600 to-navy-800",
  "from-gold-700 via-navy-700 to-navy-800",
  "from-navy-900 via-navy-800 to-navy-600",
];

const roleIcon: Record<Role, LucideIcon> = {
  student: GraduationCap,
  professional: Briefcase,
  entrepreneur: Rocket,
};

interface CourseThumbProps {
  accent: number;
  category: Role;
  title?: string;
  showTitle?: boolean;
  className?: string;
  rounded?: string;
  src?: string | null; // uploaded cover image — overrides the gradient
}

export function CourseThumb({
  accent,
  category,
  title,
  showTitle,
  className,
  rounded = "rounded-t-2xl",
  src,
}: CourseThumbProps) {
  const Icon = roleIcon[category];

  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-2", rounded, className)}>
        {/* Covers are admin-pasted and can point at any host, so anything outside our
            own Storage bucket renders unoptimized rather than throwing. */}
        <Image
          src={src}
          alt={title ?? "cover"}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={!canOptimize(src)}
          className="object-cover"
        />
        {showTitle && title && (
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy-950/75 via-navy-950/10 to-transparent p-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium capitalize text-white backdrop-blur">
              <Icon className="h-3.5 w-3.5" /> {category}
            </span>
            <h3 className="mt-2 font-heading text-lg font-bold leading-tight text-white">{title}</h3>
          </div>
        )}
      </div>
    );
  }
  const onGold = accent % GRADIENTS.length === 1;
  const fg = onGold ? "text-navy-900" : "text-white";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br",
        GRADIENTS[accent % GRADIENTS.length],
        rounded,
        className,
      )}
    >
      <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      <Icon
        className={cn("absolute -bottom-6 -right-4 h-36 w-36 opacity-10", fg)}
        strokeWidth={1.2}
      />
      {showTitle && title ? (
        <div className="relative flex h-full flex-col justify-between p-4">
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium capitalize backdrop-blur",
              fg,
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {category}
          </span>
          <h3 className={cn("font-heading text-lg font-bold leading-tight", fg)}>{title}</h3>
        </div>
      ) : (
        <div className="relative flex h-full items-center justify-center">
          <Icon className={cn("h-10 w-10", onGold ? "text-navy-900/80" : "text-white/90")} strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
