"use client";

import * as React from "react";
import { Star, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

const LABELS = ["", "Not useful", "Fair", "Good", "Very good", "Excellent"];

/**
 * Post-completion rating prompt for a topic.
 *
 * Stars are required, the note is optional. Submitting upserts one row per
 * (learner, topic) — re-rating replaces rather than stacks.
 */
export function RatingModal({
  course,
  open,
  onClose,
}: {
  course: Course;
  open: boolean;
  onClose: () => void;
}) {
  const { submitCourseRating, myRatingFor } = useApp();
  const existing = myRatingFor(course.id);

  const [stars, setStars] = React.useState(existing?.stars ?? 0);
  const [hover, setHover] = React.useState(0);
  const [review, setReview] = React.useState(existing?.review ?? "");
  const [done, setDone] = React.useState(false);

  // Re-seed when the modal is re-opened for a different topic or after an edit.
  React.useEffect(() => {
    if (!open) return;
    setStars(existing?.stars ?? 0);
    setReview(existing?.review ?? "");
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, course.id]);

  const shown = hover || stars;

  function submit() {
    if (!stars) return;
    submitCourseRating(course.id, stars, review);
    setDone(true);
    setTimeout(onClose, 1100);
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      {done ? (
        <div className="px-6 py-12 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-500 text-white">
            <Check className="h-7 w-7" strokeWidth={3} />
          </span>
          <p className="mt-5 font-heading text-lg font-bold text-heading">Thanks for the feedback</p>
          <p className="mt-1.5 text-sm text-muted">Your rating helps other learners choose.</p>
        </div>
      ) : (
        <div className="px-6 py-8">
          <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-600">
            Topic complete
          </p>
          <h2 className="mt-2 text-balance font-heading text-xl font-bold leading-tight text-heading">
            How was &ldquo;{course.title}&rdquo;?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {existing
              ? "You rated this before — updating replaces your earlier rating."
              : "Your rating is shown on the topic and helps other learners choose."}
          </p>

          {/* Stars */}
          <div className="mt-6 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStars(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="rounded-lg p-1 transition-transform duration-200 ease-out-expo hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors duration-150",
                    n <= shown ? "fill-gold-500 text-gold-500" : "text-hair",
                  )}
                />
              </button>
            ))}
            <span className="ml-3 font-heading text-sm font-semibold text-muted">
              {LABELS[shown] ?? ""}
            </span>
          </div>

          <div className="mt-5">
            <label htmlFor="rating-review" className="text-sm font-medium text-heading">
              Anything you&rsquo;d like to add?{" "}
              <span className="font-normal text-faint">(optional)</span>
            </label>
            <Textarea
              id="rating-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What worked, what could be better…"
              maxLength={500}
              className="mt-2 min-h-[88px] text-sm"
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Maybe later
            </Button>
            <Button onClick={submit} disabled={!stars}>
              {existing ? "Update rating" : "Submit rating"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
