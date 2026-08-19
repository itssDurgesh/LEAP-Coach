import Link from "next/link";
import { ArrowRight, Clock, Star, Users } from "lucide-react";
import { Course } from "@/lib/types";
import { CourseThumb } from "@/components/CourseThumb";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatINR, formatDuration } from "@/lib/utils";

interface CourseCardProps {
  course: Course;
  enrolled?: boolean;
  /** When provided, shows a progress bar instead of price (continue-learning style). */
  progressPct?: number;
  href?: string;
}

export function CourseCard({ course, enrolled, progressPct, href }: CourseCardProps) {
  const link = href ?? `/courses/${course.slug}`;
  const duration = course.videos.reduce((s, v) => s + v.durationSeconds, 0);
  const showProgress = progressPct !== undefined;

  return (
    <Link
      href={link}
      className="group flex flex-col overflow-hidden rounded-3xl border border-hair bg-card shadow-card transition-all duration-300 ease-out-expo hover:-translate-y-1.5 hover:border-gold-300 hover:shadow-lift"
    >
      <div className="relative overflow-hidden">
        <CourseThumb
          accent={course.accent}
          category={course.category}
          src={course.thumbnailUrl}
          rounded="rounded-none"
          className="aspect-[16/10] transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {course.trending && <Badge variant="trending">Trending</Badge>}
          {enrolled && !showProgress && <Badge variant="navy">Enrolled</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-faint">
          <Avatar name={course.instructorName} size={22} />
          {course.instructorName}
        </div>

        <h3 className="mt-3 line-clamp-2 font-heading text-lg font-bold leading-snug text-heading transition-colors duration-200 group-hover:text-gold-700">
          {course.title}
        </h3>

        {course.hashtags.length > 0 && (
          <p className="mt-2 line-clamp-1 text-xs text-faint">
            {course.hashtags.slice(0, 4).join("  ·  ")}
          </p>
        )}

        {/* Meta set on one hairline-separated row, numerals aligned. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
            {course.ratingCount > 0 ? course.rating.toFixed(1) : "New"}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="h-3.5 w-3.5" /> {formatDuration(duration)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="h-3.5 w-3.5" /> {course.enrolledCount.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="mt-auto pt-5">
          {showProgress ? (
            <div className="border-t border-hair pt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium uppercase tracking-[0.1em] text-faint">Progress</span>
                <span className="font-heading font-bold tabular-nums text-heading">
                  {progressPct}%
                </span>
              </div>
              <ProgressBar value={progressPct} />
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-hair pt-4">
              <span className="font-heading text-base font-bold text-heading">
                {course.price === 0 ? "Free" : formatINR(course.price)}
              </span>
              <span className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-gold-700">
                View
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-expo group-hover:translate-x-1" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
