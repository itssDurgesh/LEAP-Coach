import { TeamMember } from "@/lib/types";

/**
 * Returns the admin-managed team list as-is — real Supabase data only.
 * Kept as a single seam so callers don't reach into the store field directly.
 */
export function resolveTeam(teamMembers: TeamMember[]): TeamMember[] {
  return teamMembers;
}
