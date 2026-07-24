/**
 * Normalizes a string for comparison: lowercases, trims,
 * and strips leading/trailing punctuation.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/^[.,!?;:¿¡"']+/, "")
    .replace(/[.,!?;:¿¡"']+$/, "");
}

/**
 * Validates a user answer against a set of accepted translations.
 * Comparison is case-insensitive and tolerates minor punctuation differences.
 */
export function validateAnswer(
  userAnswer: string,
  acceptedTranslations: string[]
): boolean {
  const normalizedAnswer = normalize(userAnswer);
  return acceptedTranslations.some(
    (translation) => normalize(translation) === normalizedAnswer
  );
}
