import Link from "next/link";
import { Star, Clock, Users, ArrowRight } from "lucide-react";
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-hair shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover bg-card"
    >
      <div className="relative">
        <CourseThumb accent={course.accent} category={course.category} src={course.thumbnailUrl} className="aspect-[16/9]" />
        <div className="absolute left-3 top-3 flex gap-2">
          {course.trending && <Badge variant="trending">🔥 Trending</Badge>}
          {enrolled && !showProgress && <Badge variant="navy">Enrolled</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-faint">
          <Avatar name={course.instructorName} size={22} />
          {course.instructorName}
        </div>

        <h3 className="mt-2.5 line-clamp-2 font-heading text-lg font-bold leading-snug text-heading transition-colors group-hover:text-gold-600">
          {course.title}
        </h3>

        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {course.hashtags.slice(0, 4).map((h) => (
            <span key={h} className="text-xs font-medium text-muted">
              {h}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
            {course.rating.toFixed(1)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatDuration(duration)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {course.enrolledCount.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="mt-auto pt-4">
          {showProgress ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted">Progress</span>
                <span className="font-semibold text-heading">{progressPct}%</span>
              </div>
              <ProgressBar value={progressPct} />
            </div>
          ) : (
            <div className="flex items-center justify-between border-t border-hair pt-3">
              <span className="font-heading font-bold text-heading">
                {course.price === 0 ? "Free" : formatINR(course.price)}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold-600">
                View <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
