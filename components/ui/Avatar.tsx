import Image from "next/image";
import { canOptimize } from "@/lib/images";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

function initialsOf(name?: string) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ src, name, size = 40, className, ring = true }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy-100 font-heading font-semibold text-navy-700",
        ring && "ring-2 ring-card",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        // Avatar URLs are admin/user supplied and can point at any host, so anything
        // outside our own Storage bucket renders unoptimized rather than throwing.
        <Image
          src={src}
          alt={name ?? "avatar"}
          width={size}
          height={size}
          unoptimized={!canOptimize(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
