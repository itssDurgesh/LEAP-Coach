// ─────────────────────────────────────────────────────────────
// Ranked user search — a dedicated scoring algorithm over the records loaded from
// the database. Rather than a plain substring filter, each candidate is scored by
// HOW WELL the query matches its username / name / email, so the closest matches
// float to the top:
//   exact match > whole-field prefix > word prefix > substring > multi-word coverage,
// with username and name weighted above email. Fast (linear scan, no index needed).
// ─────────────────────────────────────────────────────────────

export interface Searchable {
  name?: string;
  username?: string;
  email?: string;
}

/** Relevance score of one record for `query` (0 = no match). */
function scoreMatch(item: Searchable, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const words = q.split(/\s+/).filter(Boolean);

  // [value, weight] — username/name matter more than email.
  const fields: [string, number][] = [
    [(item.username ?? "").toLowerCase(), 3],
    [(item.name ?? "").toLowerCase(), 2.5],
    [(item.email ?? "").toLowerCase(), 1.2],
  ];

  let best = 0;
  for (const [val, weight] of fields) {
    if (!val) continue;
    let s = 0;
    if (val === q) s = 100;
    else if (val.startsWith(q)) s = 70;
    else if (val.split(/[\s._@-]+/).some((w) => w.startsWith(q))) s = 50;
    else if (val.includes(q)) s = 30;
    else if (words.length > 1 && words.every((w) => val.includes(w))) s = 25;
    best = Math.max(best, s * weight);
  }
  return best;
}

/** Filter + rank `items` by relevance to `query`. Empty query returns items unchanged. */
export function searchRanked<T extends Searchable>(items: T[], query: string): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: scoreMatch(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
