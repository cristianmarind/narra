/**
 * Language normalization shared by the per-platform routing tables.
 *
 * Each platform builds its own routeLanguage() (voice/engine tables differ),
 * but the alias handling must match everywhere so "inglés" or "Castellano"
 * behaves the same on web and native.
 */

const ENGLISH_ALIASES = new Set(["english", "inglés", "ingles"]);
const SPANISH_ALIASES = new Set(["spanish", "español", "espanol", "castellano"]);

/** Lowercased, dash-normalized language tag plus its base subtag ("en-GB" → "en") */
export function normalizeLanguage(language: string): { lang: string; base: string } {
  const lang = language.toLowerCase().replace(/_/g, "-").trim();
  return { lang, base: lang.split("-")[0] };
}

export function isEnglish(lang: string, base: string): boolean {
  return base === "en" || ENGLISH_ALIASES.has(lang);
}

export function isSpanish(lang: string, base: string): boolean {
  return base === "es" || SPANISH_ALIASES.has(lang);
}

/**
 * Map a language name/alias to a BCP-47 tag a device TTS engine recognizes.
 * Lists store free-text language names ("español", "inglés"), which native
 * `expo-speech` doesn't understand — an unrecognized tag makes it silently
 * keep whatever voice is already active instead of erroring, so Spanish text
 * would otherwise get read in the device's default (often English) voice.
 * Anything outside en/es is passed through as a best-effort guess, since the
 * app accepts arbitrary typed languages beyond the two neural engines cover.
 */
export function toDeviceLocale(language: string): string {
  const { lang, base } = normalizeLanguage(language);
  if (isEnglish(lang, base)) return "en-US";
  if (isSpanish(lang, base)) return "es-ES";
  return language;
}
