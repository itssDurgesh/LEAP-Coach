import type { ZodType, ZodError } from "zod";

/**
 * Request-body schema validation — pillar #2 (strict input validation).
 *
 * Every route parses its JSON body through `parseJson(req, schema)`. On malformed
 * JSON or a schema violation it returns `{ ok: false, error }` (a safe, generic
 * message) so the caller can respond `400` immediately — we reject non-compliant
 * requests rather than sanitizing them. Never throws.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, error: "Invalid request body." };
  }
  const result = schema.safeParse(raw);
  if (!result.success) return { ok: false, error: firstIssue(result.error) };
  return { ok: true, data: result.data };
}

/** Validate an already-parsed value (e.g. query params assembled into an object). */
export function validate<T>(value: unknown, schema: ZodType<T>): ParseResult<T> {
  const result = schema.safeParse(value);
  if (!result.success) return { ok: false, error: firstIssue(result.error) };
  return { ok: true, data: result.data };
}

/** A short, non-sensitive message naming the first offending field. */
function firstIssue(err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Invalid request body.";
  const path = issue.path.join(".");
  return path ? `Invalid "${path}": ${issue.message}` : issue.message;
}
