// Shared by the tutor route and the lesson page (no secrets here, unlike ./config).

/**
 * How much of a session transcript the tutor reads. Bounded so token cost and
 * latency stay predictable. The lesson page sends no more than this, since the
 * route would cut the rest off anyway.
 */
export const MAX_TRANSCRIPT_CHARS = 8000;
