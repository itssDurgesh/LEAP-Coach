"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { CourseThumb } from "@/components/CourseThumb";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useApp } from "@/lib/store/AppProvider";
import { seedCourses } from "@/lib/mock/seed";
import { formatINR } from "@/lib/utils";
import type { Course } from "@/lib/types";

const pickFeatured = (courses: Course[]): Course[] =>
  [...courses]
    .filter((c) => c.published)
    .sort((a, b) => Number(b.trending) - Number(a.trending) || b.rating - a.rating)
    .slice(0, 3);

// Static fallback so the section always has content (SSR / mock mode / pre-hydration).
const fallback = pickFeatured(seedCourses);

export function FeaturedCourses() {
  const { courses } = useApp();
  const live = pickFeatured(courses);
  const featured = live.length ? live : fallback;

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {featured.map((c) => (
        <Link
          key={c.id}
          href={`/courses/${c.slug}`}
          className="group overflow-hidden rounded-2xl border border-hair bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
        >
          <div className="relative">
            <CourseThumb accent={c.accent} category={c.category} className="aspect-[16/9]" />
            {c.trending && (
              <span className="absolute right-3 top-3">
                <Badge variant="trending">🔥 Trending</Badge>
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-xs text-faint">
              <Avatar name={c.instructorName} size={22} />
              {c.instructorName}
            </div>
            <h3 className="mt-2.5 font-heading text-lg font-bold leading-snug text-heading group-hover:text-gold-600">
              {c.title}
            </h3>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 font-medium text-heading">
                <Star className="h-4 w-4 fill-gold-500 text-gold-500" /> {c.rating.toFixed(1)}
              </span>
              <span className="font-heading font-bold text-heading">
                {c.price === 0 ? "Free" : formatINR(c.price)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
