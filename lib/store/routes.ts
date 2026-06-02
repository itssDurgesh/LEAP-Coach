import { User } from "@/lib/types";

/** Where a user should land after authenticating. */
export function homeFor(u: User | null | undefined) {
  if (!u) return "/login";
  if (u.isAdmin) return "/admin";
  return u.role ? "/dashboard" : "/select-role";
}
