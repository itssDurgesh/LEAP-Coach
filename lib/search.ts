// ─────────────────────────────────────────────────────────────
// Ranked user search — a dedicated scoring algorithm over the records loaded from
// the database. Rather than a plain substring filter, each candidate is scored by
// HOW WELL the query matches its username / name / email, so the closest matches
// float to the top:
//   exact match > whole-field prefix > word prefix > substring > multi-word coverage,
// with username and name weighted above email.
//
// Each record is prepared once (lower-cased fields, split into words) and the
// result is remembered for as long as the record object lives. A keystroke then
// only compares strings: it used to lower-case three fields and run a regex split
// on each of them, per record, per keystroke.
// ─────────────────────────────────────────────────────────────

export interface Searchable {
  name?: string;
  username?: string;
  email?: string;
}

/** One searchable field, prepared: its lower-cased text, its words, and its weight. */
type Field = { text: string; words: string[]; weight: number };

const WORD_BREAK = /[\s._@-]+/;

function field(value: string | undefined, weight: number): Field | null {
  const text = (value ?? "").toLowerCase();
  return text ? { text, words: text.split(WORD_BREAK), weight } : null;
}

// Keyed by the record object and by the values it was prepared from, so an edited
// record (the store replaces the object, but check anyway) is prepared again.
const prepared = new WeakMap<object, { name?: string; username?: string; email?: string; fields: Field[] }>();

/** [value, weight] — username/name matter more than email. */
function fieldsOf(item: Searchable): Field[] {
  const hit = prepared.get(item);
  if (hit && hit.name === item.name && hit.username === item.username && hit.email === item.email) return hit.fields;
  const fields = [field(item.username, 3), field(item.name, 2.5), field(item.email, 1.2)].filter((f): f is Field => f !== null);
  prepared.set(item, { name: item.name, username: item.username, email: item.email, fields });
  return fields;
}

/** Relevance score of one record for the prepared query (0 = no match). */
function scoreMatch(fields: Field[], q: string, words: string[]): number {
  let best = 0;
  for (const { text, words: own, weight } of fields) {
    let s = 0;
    if (text === q) s = 100;
    else if (text.startsWith(q)) s = 70;
    else if (own.some((w) => w.startsWith(q))) s = 50;
    else if (text.includes(q)) s = 30;
    else if (words.length > 1 && words.every((w) => text.includes(w))) s = 25;
    if (s * weight > best) best = s * weight;
  }
  return best;
}

/**
 * Filter + rank `items` by relevance to `query`; ties keep their original order
 * (the sort is stable). Empty query returns items unchanged.
 */
export function searchRanked<T extends Searchable>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const words = q.split(/\s+/);

  const hits: { item: T; score: number }[] = [];
  for (const item of items) {
    const score = scoreMatch(fieldsOf(item), q, words);
    if (score > 0) hits.push({ item, score });
  }
  return hits.sort((a, b) => b.score - a.score).map((h) => h.item);
}
