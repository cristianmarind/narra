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
} from "./cache";
import { speakWithWebSpeechAPI } from "./web-fallback";

/**
 * Timing budgets.
 *
 * Interactive requests (the user pressed play, or a practice round started) must
 * never leave the user in silence: if the model isn't loaded yet or generation
 * drags, we give up quickly and let the browser engine speak instead.
 *
 * Warmup requests happen in the background with a visible progress banner, so
 * they can afford to wait.
 */

/** How long an interactive request waits for the model to finish loading */
const READY_BUDGET_INTERACTIVE_MS = 1_500;

/** How long an interactive request waits for audio once the model is ready */
const GENERATE_TIMEOUT_INTERACTIVE_MS = 10_000;

/** Background warmup can wait much longer */
const GENERATE_TIMEOUT_WARMUP_MS = 120_000;

/** If loading never completes or errors within this window, treat it as failed */
const LOAD_TIMEOUT_MS = 90_000;

/**
 * After a failure, wait this long before trying to load again. A dropped CDN
 * request shouldn't disable the engine for the rest of the session.
 */
const FAILURE_COOLDOWN_MS = 60_000;

/** Whether a request is user-facing or background warmup */
type Intent = "interactive" | "warmup";

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

interface GenerateOptions {
  /** Interactive requests get short budgets and degrade instead of blocking */
  intent: Intent;
  /**
   * Called if the audio arrives after the request already timed out, so the
   * caller can still cache it. The next attempt is then instant.
   */
  onLate?: (waveform: Waveform) => void;
}

interface WorkerEngine {
  /** Generate audio, loading the model on first call */
  generate(
    text: string,
    voice: string,
    speed: number,
    options: GenerateOptions
  ): Promise<Waveform>;
  /** Begin loading the model without generating anything */
  preload(): void;
  isReady(): boolean;
  /** False while the engine is in its post-failure cooldown */
  isAvailable(): boolean;
}

type EngineState = "idle" | "loading" | "ready" | "failed";

/**
 * Wrap a TTS worker in a request/response interface that fails fast.
 *
 * The engine can be in four states. Anything other than "ready" makes an
 * interactive request give up within READY_BUDGET_INTERACTIVE_MS so the caller
 * can fall back, while loading continues in the background for later requests.
 */
function createWorkerEngine(id: EngineId, spec: EngineSpec): WorkerEngine {
  let worker: Worker | null = null;
  let state: EngineState = "idle";
  let failedAt = 0;
  let messageId = 0;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resolvers waiting for the model to load; called on success and on failure */
  let readyWaiters: Array<() => void> = [];

  const pending = new Map<
    number,
    {
      resolve: (value: Waveform) => void;
      reject: (err: Error) => void;
      /** Set once the request timed out; late audio goes to onLate instead */
      abandoned: boolean;
      onLate?: (waveform: Waveform) => void;
    }
  >();

  function releaseWaiters() {
    const waiters = readyWaiters;
    readyWaiters = [];
    waiters.forEach((resolve) => resolve());
  }

  function markFailed(reason: string) {
    if (state === "failed") return;

    state = "failed";
    failedAt = Date.now();
    if (loadTimer) {
      clearTimeout(loadTimer);
      loadTimer = null;
    }

    console.warn(`[${id}] unavailable, falling back to the browser voice: ${reason}`);

    // Anything still waiting must fail now rather than hang
    for (const [requestId, request] of pending) {
      pending.delete(requestId);
      if (!request.abandoned) request.reject(new Error(reason));
    }

    releaseWaiters();

    // Drop the worker so the retry after cooldown starts clean
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  /** Reset a failed engine once its cooldown has elapsed */
  function clearExpiredFailure() {
    if (state === "failed" && Date.now() - failedAt >= FAILURE_COOLDOWN_MS) {
      state = "idle";
    }
  }

  function getWorker(): Worker {
    if (worker) return worker;
    if (typeof Worker === "undefined") throw new Error("Worker not available");

    worker = new Worker(spec.workerUrl, { type: "module" });

    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case "ready":
          state = "ready";
          if (loadTimer) {
            clearTimeout(loadTimer);
            loadTimer = null;
          }
          releaseWaiters();
          break;

        case "audio": {
          const request = msg.id != null ? pending.get(msg.id) : undefined;
          if (!request) break;
          pending.delete(msg.id);

          const waveform: Waveform = { audio: msg.audio, sampleRate: msg.sampleRate };
          if (request.abandoned) {
            // Too late to speak it, but still worth caching
            request.onLate?.(waveform);
          } else {
            request.resolve(waveform);
          }
          break;
        }

        case "error": {
          const request = msg.id != null ? pending.get(msg.id) : undefined;
          if (request) {
            // A single utterance failed; the engine itself may still be fine
            pending.delete(msg.id);
            if (!request.abandoned) request.reject(new Error(msg.error));
          } else {
            // No id means the model itself failed to load
            markFailed(msg.error ?? "model failed to load");
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

    worker.onerror = (err) => markFailed(`worker error: ${err.message ?? err.type}`);
    return worker;
  }

  function startLoading() {
    if (state === "ready" || state === "loading") return;

    state = "loading";
    getWorker().postMessage({ type: "init" });

    // A worker that never answers is as broken as one that errors
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(() => markFailed("model load timed out"), LOAD_TIMEOUT_MS);
  }

  /**
   * Resolve once the model is ready, or reject as soon as the budget runs out.
   * A null budget waits indefinitely (background warmup).
   */
  function awaitReady(budgetMs: number | null): Promise<void> {
    clearExpiredFailure();

    if (state === "ready") return Promise.resolve();
    if (state === "failed") {
      return Promise.reject(new Error(`${id} is unavailable`));
    }

    startLoading();

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const waiter = () => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        // releaseWaiters() also fires on failure, so check where we landed
        if (state === "ready") resolve();
        else reject(new Error(`${id} is unavailable`));
      };

      readyWaiters.push(waiter);

      if (budgetMs !== null) {
        timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          readyWaiters = readyWaiters.filter((w) => w !== waiter);
          // Loading continues; this request just doesn't wait for it
          reject(new Error(`${id} still loading`));
        }, budgetMs);
      }
    });
  }

  return {
    async generate(text, voice, speed, { intent, onLate }) {
      const interactive = intent === "interactive";

      await awaitReady(interactive ? READY_BUDGET_INTERACTIVE_MS : null);

      const w = getWorker();
      const requestId = ++messageId;
      const timeout = interactive
        ? GENERATE_TIMEOUT_INTERACTIVE_MS
        : GENERATE_TIMEOUT_WARMUP_MS;

      return new Promise<Waveform>((resolve, reject) => {
        pending.set(requestId, { resolve, reject, abandoned: false, onLate });

        w.postMessage({
          type: "speak",
          id: requestId,
          text,
          voice,
          // Engines without speed control ignore this and get playbackRate instead
          speed: spec.speedInGeneration ? speed : 1,
        });

        setTimeout(() => {
          const request = pending.get(requestId);
          if (!request || request.abandoned) return;

          // Leave the entry in place: the audio may still arrive and be cached
          request.abandoned = true;
          reject(new Error(`${id} generation timed out`));
        }, timeout);
      });
    },

    preload() {
      if (typeof Worker === "undefined") return;
      clearExpiredFailure();
      startLoading();
    },

    isReady() {
      return state === "ready";
    },

    isAvailable() {
      clearExpiredFailure();
      return state !== "failed";
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
  async function getWaveform(
    text: string,
    route: Route,
    intent: Intent
  ): Promise<Waveform> {
    const key = cacheKey(text, route.voice);

    const memCached = sessionCache.get(key);
    if (memCached) return memCached;

    const persisted = await loadPersistedAudio(key);
    if (persisted) {
      sessionCache.set(key, persisted);
      return persisted;
    }

    const waveform = await engines[route.engine].generate(text, route.voice, getSpeed(), {
      intent,
      // If it arrives after we gave up, cache it so the next attempt is instant
      onLate: (late) => {
        sessionCache.set(key, late);
        generatingKeys.delete(key);
      },
    });

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
        // Skip the neural path entirely while the engine is in cooldown
        if (route && engines[route.engine].isAvailable()) {
          const waveform = await getWaveform(text, route, "interactive");
          await playWaveform(waveform, playbackRateFor(route.engine));
        } else {
          await speakWithWebSpeechAPI(text, language, getSpeed());
        }
      } catch (error) {
        // Expected when the model is still loading or the CDN is down. The
        // browser voice is worse, but silence is worse than that.
        console.warn("[TTS] using browser voice:", (error as Error).message);
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
          // Stop the whole batch if the engine went down mid-way
          if (!engines[route.engine].isAvailable()) return;

          const key = cacheKey(text, route.voice);
          if (sessionCache.has(key) || generatingKeys.has(key)) continue;

          generatingKeys.add(key);
          try {
            await getWaveform(text, route, "warmup");
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

        // Nothing left to warm if the engine is down — bail instead of logging
        // one failure per phrase
        if (!engines[route.engine].isAvailable()) return;

        onProgress?.(i + 1, texts.length, text, "generating");
        try {
          const waveform = await getWaveform(text, route, "warmup");
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
