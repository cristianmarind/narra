/**
 * Neural TTS for Web, routing each language to the engine that handles it best.
 *
 * - English → Kokoro (kokoro-js, 24 kHz), voices af_heart / bf_emma
 * - Spanish → Piper (vits-web, 22.05 kHz), voice es_MX-claude-high
 * - Anything else → Web Speech API with best-voice selection
 *
 * Both neural engines run in their own Web Worker and stream back raw Float32
 * samples plus the sample rate, since the two engines output different rates.
 *
 * Cache layers:
 * 1. In-memory Map (session cache, cleared on clearSessionCache())
 * 2. IndexedDB (persistent cache for first phrases, survives reload)
 *
 * Model weights themselves are cached by each library (Kokoro via the Cache API,
 * Piper via the Origin Private File System), so they download only once.
 */

import type { SpeechService } from "@/types";
import {
  persistAudio,
  loadPersistedAudio,
  hasPersistedAudio,
  clearAllPersistedAudio,
} from "./tts-cache";
import { speakWithWebSpeechAPI } from "./speech-web-fallback";

/** How long to wait for a single utterance to be generated */
const GENERATE_TIMEOUT_MS = 120_000;

type EngineId = "kokoro" | "piper";

interface EngineSpec {
  workerUrl: string;
  /**
   * True when the worker bakes the speaking rate into generation. For engines
   * that don't, the rate is applied at playback via playbackRate instead.
   */
  speedInGeneration: boolean;
  /** Whether to start loading the model as soon as the service is created */
  eager: boolean;
}

const ENGINES: Record<EngineId, EngineSpec> = {
  // Kokoro accepts a `speed` argument and is small enough to preload
  kokoro: { workerUrl: "/kokoro-worker.js", speedInGeneration: true, eager: true },
  // vits-web exposes no speed control, and the voice is ~63 MB — load on demand
  piper: { workerUrl: "/piper-worker.js", speedInGeneration: false, eager: false },
};

interface Route {
  engine: EngineId;
  voice: string;
}

interface Waveform {
  audio: Float32Array;
  sampleRate: number;
}

const ENGLISH_ALIASES = new Set(["english", "inglés", "ingles"]);
const SPANISH_ALIASES = new Set(["spanish", "español", "espanol", "castellano"]);

/**
 * Decide which neural engine and voice to use for a language.
 * Returns null when no neural engine covers it (caller falls back to Web Speech).
 */
function routeLanguage(language: string): Route | null {
  const lang = language.toLowerCase().replace(/_/g, "-").trim();
  const base = lang.split("-")[0];

  if (base === "en" || ENGLISH_ALIASES.has(lang)) {
    return { engine: "kokoro", voice: lang === "en-gb" ? "bf_emma" : "af_heart" };
  }

  if (base === "es" || SPANISH_ALIASES.has(lang)) {
    return { engine: "piper", voice: "es_MX-claude-high" };
  }

  return null;
}

/** Cache entries are keyed per voice so engines never collide */
function cacheKey(text: string, voice: string): string {
  return `${voice}::${text}`;
}

interface WorkerEngine {
  /** Generate audio, loading the model on first call */
  generate(text: string, voice: string, speed: number): Promise<Waveform>;
  /** Begin loading the model without generating anything */
  preload(): void;
  isReady(): boolean;
}

/** Wrap a TTS worker in a request/response interface. */
function createWorkerEngine(id: EngineId, spec: EngineSpec): WorkerEngine {
  let worker: Worker | null = null;
  let ready = false;
  let messageId = 0;
  let readyResolvers: Array<() => void> = [];

  const pending = new Map<
    number,
    { resolve: (value: Waveform) => void; reject: (err: Error) => void }
  >();

  function getWorker(): Worker {
    if (worker) return worker;
    if (typeof Worker === "undefined") throw new Error("Worker not available");

    worker = new Worker(spec.workerUrl, { type: "module" });

    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case "ready":
          ready = true;
          readyResolvers.forEach((resolve) => resolve());
          readyResolvers = [];
          break;

        case "audio": {
          const request = msg.id != null ? pending.get(msg.id) : undefined;
          if (request) {
            pending.delete(msg.id);
            request.resolve({ audio: msg.audio, sampleRate: msg.sampleRate });
          }
          break;
        }

        case "error": {
          const request = msg.id != null ? pending.get(msg.id) : undefined;
          if (request) {
            pending.delete(msg.id);
            request.reject(new Error(msg.error));
          } else {
            console.error(`[${id}]`, msg.error);
          }
          break;
        }

        case "loading":
          // Progress is surfaced by the caller's own progress reporting
          break;

        case "log":
          console.log(`[${id} worker]`, msg.message);
          break;
      }
    };

    worker.onerror = (err) => console.error(`[${id}] worker error:`, err);
    return worker;
  }

  function waitForReady(): Promise<void> {
    if (ready) return Promise.resolve();
    return new Promise<void>((resolve) => {
      readyResolvers.push(resolve);
      getWorker().postMessage({ type: "init" });
    });
  }

  return {
    async generate(text, voice, speed) {
      await waitForReady();

      const w = getWorker();
      const requestId = ++messageId;

      return new Promise<Waveform>((resolve, reject) => {
        pending.set(requestId, { resolve, reject });

        w.postMessage({
          type: "speak",
          id: requestId,
          text,
          voice,
          // Engines without speed control ignore this and get playbackRate instead
          speed: spec.speedInGeneration ? speed : 1,
        });

        setTimeout(() => {
          if (pending.has(requestId)) {
            pending.delete(requestId);
            reject(new Error(`${id} generation timed out`));
          }
        }, GENERATE_TIMEOUT_MS);
      });
    },

    preload() {
      if (typeof Worker === "undefined") return;
      getWorker().postMessage({ type: "init" });
    },

    isReady() {
      return ready;
    },
  };
}

export interface NeuralWebSpeechService extends SpeechService {
  /** Pre-generate and persist audio for first phrases (permanent cache) */
  pregeneratePersistent(
    texts: string[],
    language: string,
    onProgress?: (
      current: number,
      total: number,
      text: string,
      status: "checking" | "generating" | "cached"
    ) => void
  ): Promise<void>;
  /** Clear session (non-persistent) cache */
  clearSessionCache(): void;
  /** Clear ALL cache (memory + IndexedDB). Used when speed changes. */
  clearAllCache(): Promise<void>;
  /** Check if at least one engine finished loading */
  isModelReady(): boolean;
}

export function createNeuralWebSpeechService(
  getSpeed: () => number = () => 0.85
): NeuralWebSpeechService {
  let isSpeakingNow = false;
  let currentAudioSource: AudioBufferSourceNode | null = null;
  let audioContext: AudioContext | null = null;

  const engines: Record<EngineId, WorkerEngine> = {
    kokoro: createWorkerEngine("kokoro", ENGINES.kokoro),
    piper: createWorkerEngine("piper", ENGINES.piper),
  };

  // In-memory session cache (cleared when leaving practice)
  const sessionCache = new Map<string, Waveform>();
  // Keys that are persisted (first phrases) — don't clear these
  const persistedKeys = new Set<string>();
  const generatingKeys = new Set<string>();

  // Warm up the engines flagged as eager
  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    setTimeout(() => {
      for (const [id, spec] of Object.entries(ENGINES) as [EngineId, EngineSpec][]) {
        if (spec.eager) engines[id].preload();
      }
    }, 0);
  }

  function getAudioContext(): AudioContext {
    // Use the device's native rate; buffers declare their own rate and the
    // browser resamples. Forcing a rate here would break one of the engines.
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  /** Get audio from memory cache, then IndexedDB, then generate it. */
  async function getWaveform(text: string, route: Route): Promise<Waveform> {
    const key = cacheKey(text, route.voice);

    const memCached = sessionCache.get(key);
    if (memCached) return memCached;

    const persisted = await loadPersistedAudio(key);
    if (persisted) {
      sessionCache.set(key, persisted);
      return persisted;
    }

    const waveform = await engines[route.engine].generate(text, route.voice, getSpeed());

    sessionCache.set(key, waveform);
    generatingKeys.delete(key);
    return waveform;
  }

  async function playWaveform(waveform: Waveform, playbackRate: number): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    await new Promise<void>((resolve) => {
      const buffer = ctx.createBuffer(1, waveform.audio.length, waveform.sampleRate);
      buffer.getChannelData(0).set(waveform.audio);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      source.connect(ctx.destination);

      currentAudioSource = source;
      source.onended = () => {
        currentAudioSource = null;
        resolve();
      };
      source.start();
    });
  }

  /** Playback rate to apply, given whether the engine already applied the speed. */
  function playbackRateFor(engine: EngineId): number {
    if (ENGINES[engine].speedInGeneration) return 1;
    // Keep it in a range that doesn't sound artificial
    return Math.min(Math.max(getSpeed(), 0.5), 2);
  }

  return {
    async speak(text: string, language: string): Promise<void> {
      isSpeakingNow = true;
      const route = routeLanguage(language);

      try {
        if (route) {
          const waveform = await getWaveform(text, route);
          await playWaveform(waveform, playbackRateFor(route.engine));
        } else {
          await speakWithWebSpeechAPI(text, language, getSpeed());
        }
      } catch (error) {
        console.error("[TTS speak] Error:", error);
        // Never leave the user in silence — fall back to the browser engine
        try {
          await speakWithWebSpeechAPI(text, language, getSpeed());
        } catch {}
      } finally {
        isSpeakingNow = false;
      }
    },

    stop() {
      if (currentAudioSource) {
        try {
          currentAudioSource.stop();
        } catch {}
        currentAudioSource = null;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      isSpeakingNow = false;
    },

    async isSpeaking(): Promise<boolean> {
      return isSpeakingNow;
    },

    /** Pre-generate for the session (in-memory only, not persisted) */
    pregenerate(texts: string[], language: string): void {
      const route = routeLanguage(language);
      if (!route) return;

      (async () => {
        for (const text of texts) {
          const key = cacheKey(text, route.voice);
          if (sessionCache.has(key) || generatingKeys.has(key)) continue;

          generatingKeys.add(key);
          try {
            await getWaveform(text, route);
          } catch {
            generatingKeys.delete(key);
          }
        }
      })();
    },

    /** Pre-generate AND persist to IndexedDB (for first phrases) */
    async pregeneratePersistent(
      texts: string[],
      language: string,
      onProgress?: (
        current: number,
        total: number,
        text: string,
        status: "checking" | "generating" | "cached"
      ) => void
    ): Promise<void> {
      const route = routeLanguage(language);
      if (!route) return;

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const key = cacheKey(text, route.voice);

        if (persistedKeys.has(key)) {
          onProgress?.(i + 1, texts.length, text, "cached");
          continue;
        }

        onProgress?.(i + 1, texts.length, text, "checking");

        if (await hasPersistedAudio(key)) {
          persistedKeys.add(key);
          onProgress?.(i + 1, texts.length, text, "cached");
          continue;
        }

        onProgress?.(i + 1, texts.length, text, "generating");
        try {
          const waveform = await getWaveform(text, route);
          await persistAudio(key, waveform.audio, waveform.sampleRate);
          persistedKeys.add(key);
        } catch (err) {
          console.warn("[TTS] Failed to persist:", text, err);
        }
      }
    },

    /** Clear session cache, keeping persisted entries warm in memory */
    clearSessionCache(): void {
      for (const key of sessionCache.keys()) {
        if (!persistedKeys.has(key)) {
          sessionCache.delete(key);
        }
      }
      generatingKeys.clear();
    },

    isModelReady(): boolean {
      return Object.values(engines).some((engine) => engine.isReady());
    },

    async clearAllCache(): Promise<void> {
      sessionCache.clear();
      persistedKeys.clear();
      generatingKeys.clear();
      await clearAllPersistedAudio();
    },
  };
}
