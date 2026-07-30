/**
 * Neural TTS for Web: composes the platform-agnostic speech core (see core.ts
 * for the caching/warmup semantics) with web-specific parts.
 *
 * - English → Kokoro (kokoro-js, 24 kHz) in a Web Worker, voices af_heart / bf_emma
 * - Spanish → Piper (vits-web, 22.05 kHz) in a Web Worker, voice es_MX-claude-high
 * - Anything else → Web Speech API with best-voice selection
 * - Persistence → IndexedDB (cache.ts)
 * - Playback → Web Audio API
 */

import { createSpeechCore, type Route, type SpeechCoreService } from "../core";
import { createWorkerEngine, type WorkerEngineSpec } from "../engines/web/worker-engine";
import { createWebAudioPlayer } from "../players/web/web-audio-player";
import { createIndexedDbStore } from "../stores/web/indexeddb-store";
import { isEnglish, isSpanish, normalizeLanguage } from "../utils/routing";
import { speakWithWebSpeechAPI } from "../utils/speech-web-fallback";

// Workers live in /public, so their URL must include the deploy base path
// (e.g. "/narra" on GitHub Pages). Uses EXPO_PUBLIC_BASE_URL from .env files.
const BASE_URL = (process.env.EXPO_PUBLIC_BASE_URL || "").replace(/\/$/, "");

const ENGINES: Record<string, WorkerEngineSpec> = {
  // Kokoro accepts a `speed` argument and is small enough to preload
  kokoro: { workerUrl: `${BASE_URL}/kokoro-worker.js`, speedInGeneration: true, eager: true },
  // vits-web exposes no speed control, and the voice is ~63 MB — load on demand
  piper: { workerUrl: `${BASE_URL}/piper-worker.js`, speedInGeneration: false, eager: false },
};

/**
 * Decide which neural engine and voice to use for a language.
 * Returns null when no neural engine covers it (the core falls back to Web Speech).
 */
function routeLanguage(language: string): Route | null {
  const { lang, base } = normalizeLanguage(language);

  if (isEnglish(lang, base)) {
    return { engine: "kokoro", voice: lang === "en-gb" ? "bf_emma" : "af_heart" };
  }

  if (isSpanish(lang, base)) {
    return { engine: "piper", voice: "es_MX-claude-high" };
  }

  return null;
}

const VOICE_ENGINE: Record<string, string> = {
  af_heart: "kokoro",
  bf_emma: "kokoro",
  "es_MX-claude-high": "piper",
};

/** Kept as an exported name for existing importers; the shape now lives in core.ts */
export type NeuralWebSpeechService = SpeechCoreService;

export function createNeuralWebSpeechService(
  getSpeed: () => number = () => 0.85
): NeuralWebSpeechService {
  const engines = {
    kokoro: createWorkerEngine("kokoro", ENGINES.kokoro),
    piper: createWorkerEngine("piper", ENGINES.piper),
  };

  const core = createSpeechCore({
    engines,
    routeLanguage,
    voiceEngine: VOICE_ENGINE,
    store: createIndexedDbStore(),
    player: createWebAudioPlayer(),
    fallbackSpeak: speakWithWebSpeechAPI,
    fallbackStop: () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    statusEngines: { english: "kokoro", spanish: "piper" },
    getSpeed,
  });

  // Warm up the engines flagged as eager
  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    setTimeout(() => {
      for (const [id, spec] of Object.entries(ENGINES)) {
        if (spec.eager) engines[id as keyof typeof engines].preload();
      }
    }, 0);
  }

  return core;
}
