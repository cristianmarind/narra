/**
 * Web Speech API fallback with explicit voice selection.
 *
 * The browser's default voice pick is often the lowest quality one available
 * (e.g. legacy SAPI voices on Windows, espeak on Linux). This module scores all
 * voices matching the requested language and picks the best one.
 *
 * Quality ranking heuristic (highest to lowest):
 * 1. Neural/Natural voices (Microsoft Edge "Online (Natural)", Google WaveNet)
 * 2. Google / Microsoft Online voices
 * 3. Any other voice for the language
 * 4. Known low-quality engines (espeak, pico, flite) are penalized
 *
 * Since the best voices are usually remote (network-backed), a local voice is
 * used as a retry fallback when the remote one fails (e.g. user is offline).
 */

/** Markers for neural / high-fidelity voices */
const HIGH_QUALITY_MARKERS = [
  /natural/i,
  /neural/i,
  /premium/i,
  /enhanced/i,
  /wavenet/i,
  /studio/i,
  /journey/i,
];

/** Markers for vendors that generally ship better-than-default voices */
const GOOD_VENDOR_MARKERS = [/google/i, /online/i, /siri/i];

/** Markers for known low-quality / legacy engines */
const LOW_QUALITY_MARKERS = [
  /espeak/i,
  /pico/i,
  /flite/i,
  /festival/i,
  /compact/i,
  /\beloquence\b/i,
];

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function normalizeLang(lang: string): string {
  return lang.toLowerCase().replace(/_/g, "-").trim();
}

/**
 * Load the voice list. `getVoices()` returns an empty array until the engine
 * finishes enumerating, so we wait for the `voiceschanged` event with a timeout.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }

  if (cachedVoices && cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  const synth = window.speechSynthesis;
  const immediate = synth.getVoices();
  if (immediate.length > 0) {
    cachedVoices = immediate;
    return Promise.resolve(immediate);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      cachedVoices = synth.getVoices();
      resolve(cachedVoices);
    };

    synth.addEventListener("voiceschanged", finish, { once: true });
    // Some engines never fire the event — don't block forever
    setTimeout(finish, 1000);
  });
}

/**
 * Score a voice against the requested language.
 * Returns -1 when the voice does not match the language at all.
 */
function scoreVoice(voice: SpeechSynthesisVoice, requested: string): number {
  const voiceLang = normalizeLang(voice.lang);
  const requestedLang = normalizeLang(requested);
  const voiceBase = voiceLang.split("-")[0];
  const requestedBase = requestedLang.split("-")[0];

  // Must be the same language
  if (voiceBase !== requestedBase) return -1;

  let score = 0;

  // Region match
  if (voiceLang === requestedLang) {
    score += 30;
  } else if (requestedLang === requestedBase) {
    // Caller asked for the bare language ("es"), any region is fine
    score += 10;
  } else {
    // Same language, different region ("es-ES" requested, "es-MX" found)
    score += 5;
  }

  // Engine quality
  const name = voice.name;
  if (HIGH_QUALITY_MARKERS.some((re) => re.test(name))) score += 40;
  if (GOOD_VENDOR_MARKERS.some((re) => re.test(name))) score += 20;
  if (LOW_QUALITY_MARKERS.some((re) => re.test(name))) score -= 40;

  // Tiny nudge so the platform default wins ties
  if (voice.default) score += 2;

  return score;
}

/** Pick the best voice for a language, optionally restricted to local voices. */
function pickVoice(
  voices: SpeechSynthesisVoice[],
  language: string,
  localOnly = false
): SpeechSynthesisVoice | null {
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const voice of voices) {
    if (localOnly && !voice.localService) continue;
    const score = scoreVoice(voice, language);
    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  return bestScore >= 0 ? best : null;
}

/** Speak a single utterance and resolve when it finishes. */
function utter(
  text: string,
  language: string,
  rate: number,
  voice: SpeechSynthesisVoice | null
): Promise<{ errored: boolean }> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? language;
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve({ errored: false });
    utterance.onerror = () => resolve({ errored: true });

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak text using the best available browser voice for the language.
 *
 * @param text The text to speak
 * @param language BCP-47 language tag or bare language code (e.g. "es", "es-MX")
 * @param rate Speaking rate (1 = normal). Clamped to the Web Speech valid range.
 */
export async function speakWithWebSpeechAPI(
  text: string,
  language: string,
  rate = 1
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  // Web Speech spec allows 0.1–10, but anything outside 0.5–2 sounds broken
  const safeRate = Math.min(Math.max(rate, 0.5), 2);

  const voices = await loadVoices();
  const best = pickVoice(voices, language);

  const result = await utter(text, language, safeRate, best);
  if (!result.errored) return;

  // The best voice is often network-backed. Retry with a local one so the app
  // still speaks when the user is offline.
  const local = pickVoice(voices, language, true);
  if (local && local !== best) {
    await utter(text, language, safeRate, local);
  }
}

/** Expose the chosen voice for diagnostics/logging. */
export async function getSelectedVoiceName(language: string): Promise<string | null> {
  const voices = await loadVoices();
  return pickVoice(voices, language)?.name ?? null;
}
