import { seedTeam } from "@/lib/mock/seed";
import { TeamMember } from "@/lib/types";

/**
 * Returns the team list with the founder always present.
 * The seeded founder (Prof. Gupta) lives only in seed data until persisted, so once
 * real members are added to the DB we re-attach the founder so they never disappear.
 */
export function resolveTeam(teamMembers: TeamMember[]): TeamMember[] {
  const base = teamMembers.length ? teamMembers : seedTeam;
  if (base.some((m) => m.group === "founder")) return base;
  return [...seedTeam.filter((m) => m.group === "founder"), ...base];
}
