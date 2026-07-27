/**
 * Characters treated as word separators: they become a space so that
 * "well-known" and "well known" compare as equal.
 */
const SEPARATORS = /[-–—/\\_]+/g;

/**
 * Punctuation that is dropped entirely, anywhere in the string.
 * Includes apostrophe variants, so "don't" and "dont" compare as equal —
 * speech recognition is inconsistent about them.
 */
const PUNCTUATION = /[.,!?;:¿¡"'`´‘’“”«»()[\]{}…]/g;

/**
 * Normalizes a string for comparison: lowercases, drops punctuation anywhere
 * in the text, treats hyphens and slashes as spaces, and collapses whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(SEPARATORS, " ")
    .replace(PUNCTUATION, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates a user answer against a set of accepted translations.
 * Comparison is case-insensitive and ignores punctuation and spacing
 * differences, so only the wording itself has to match.
 */
export function validateAnswer(
  userAnswer: string,
  acceptedTranslations: string[]
): boolean {
  const normalizedAnswer = normalize(userAnswer);
  if (!normalizedAnswer) return false;

  return acceptedTranslations.some(
    (translation) => normalize(translation) === normalizedAnswer
  );
}
