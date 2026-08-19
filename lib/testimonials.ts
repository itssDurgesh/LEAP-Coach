/**
 * Landing-page testimonials.
 *
 * REAL QUOTES ONLY. This array ships empty on purpose and the section on the home
 * page hides itself entirely while it stays empty — an invented testimonial is worse
 * than no testimonial section at all.
 *
 * To publish some, add entries below. `photoUrl` is optional; without one the card
 * falls back to the person's initials.
 *
 *   { quote: "…", name: "…", role: "…", photoUrl: "https://…" }
 *
 * This is deliberately a code file rather than an admin-editable Supabase table, so
 * that adding testimonials needs no change to the admin console.
 */
export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  photoUrl?: string | null;
}

export const TESTIMONIALS: Testimonial[] = [];
