// The explanation-derived hint shown when the AI tutor is unavailable. Pure and
// shared: the browser uses it in the local demo, and the hint route uses it in real
// mode, where only the server has a question's explanation and answer.

/** Remove the literal correct answer from a string so a fallback hint never leaks it. */
export function stripAnswer(text: string, answer: string): string {
  if (!answer) return text;
  const re = new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
  return text.replace(re, "the right idea").replace(/\s{2,}/g, " ").trim();
}

/** A hint built from the explanation, which never reveals the answer. */
export function localHint(explanation: string, correctAnswer: string, attempt: number): string {
  const safe = stripAnswer((explanation || "").trim(), correctAnswer);
  if (attempt >= 3) {
    return safe
      ? `Focus on the lesson's core idea: ${safe} Try ruling out the options that don't fit.`
      : "Re-read the lesson summary and rule out the options that don't fit its main point.";
  }
  if (safe) return `Hint: ${safe}`;
  return "Think back to the key idea from this lesson — which option best matches it?";
}
