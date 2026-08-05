/**
 * Fixed phrases the app speaks during practice.
 *
 * These are always the same, so they are pre-generated and persisted on startup
 * instead of being synthesized on demand mid-session.
 *
 * All of them are spoken in the user's native language.
 */

/**
 * Spoken as feedback when the answer is right, followed by the correct answer.
 *
 * The two feedback phrases are deliberately phonetically distinct: they used
 * to differ only in the weak initial syllable ("Correcto…"/"Incorrecto…"),
 * and any clipped playback start made a wrong answer sound like a right one.
 */
export const FEEDBACK_CORRECT = "¡Muy bien! Se dice:";

/** Spoken as feedback when the answer is wrong, followed by the correct answer */
export const FEEDBACK_INCORRECT = "Respuesta incorrecta. Se dice:";

/**
 * Spanish names for target languages, used in the spoken intro.
 * Lowercase on purpose: TTS engines tend to spell out uppercase words.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "inglés",
  es: "español",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  de: "alemán",
};

export function languageName(code: string): string {
  const base = code.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_NAMES[base] ?? code;
}

/** Spoken once, before the first phrase of a session */
export function buildIntro(targetLanguage: string): string {
  return `Traduce al ${languageName(targetLanguage)} las frases, empecemos con la primera.`;
}

/**
 * Every fixed phrase used by a list, so callers can warm them all at once.
 * The intro varies with the target language; the rest are constant.
 */
export function fixedPromptsFor(targetLanguage: string): string[] {
  return [FEEDBACK_CORRECT, FEEDBACK_INCORRECT, buildIntro(targetLanguage)];
}
