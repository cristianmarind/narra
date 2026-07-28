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
 * Within those layers, entries fall into three permanence tiers:
 * - Pinned: fixed app messages (feedback, intro). Always generated at the
 *   constant PINNED_SPEED, never purged by anything — a speed change can't
 *   invalidate them because they never used the user's speed to begin with.
 * - Persisted: first phrase of each list. Survives clearSessionCache always,
 *   and survives clearAllCache too UNLESS its audio was baked at the old
 *   speed (only engines with speedInGeneration — Kokoro/English — bake speed
 *   in; Piper applies it at playback, so its cache is speed-agnostic).
 * - Session-only: everything else (the sliding lookahead window during
 *   practice). Cleared freely.
 *
 * Warmup scheduling: each worker generates one utterance at a time, so a queued
 * warmup batch would make an interactive request (the user needs audio NOW)
 * wait behind it. Two mechanisms prevent that:
 * - Warmup loops yield: before each item they wait until no interactive
 *   generation is pending, so an interactive request waits behind at most the
 *   single warmup utterance already inside the worker.
 * - cancelWarmups() abandons queued session warmups. Screens call it when the
 *   context changes (leaving a list, starting practice), so a stale batch from
 *   a previous screen doesn't keep the worker busy. Pinned/persistent batches
 *   are not cancelled — they're cheap-per-item, self-deduplicating, and their
 *   output survives across screens anyway.
 *
 * Model weights themselves are cached by each library (Kokoro via the Cache API,
 * Piper via the Origin Private File System), so they download only once.
 */

import type { SpeechService, VoiceEngineStatus } from "@/types";
import {
  persistAudio,
  loadPersistedAudio,
  deletePersistedAudio,
  getAllPersistedKeys,
} from "./cache";
import { speakWithWebSpeechAPI } from "./web-fallback";

/** Fixed messages always speak at real-time pace, independent of the user's setting */
const PINNED_SPEED = 1.0;

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

// Workers live in /public, so their URL must include the deploy base path
// (e.g. "/narra" on GitHub Pages). Inlined at build time from app.json's
// experiments.baseUrl; empty in dev.
const BASE_URL = (process.env.EXPO_BASE_URL || "").replace(/\/$/, "");

const ENGINES: Record<EngineId, EngineSpec> = {
  // Kokoro accepts a `speed` argument and is small enough to preload
  kokoro: { workerUrl: `${BASE_URL}/kokoro-worker.js`, speedInGeneration: true, eager: true },
  // vits-web exposes no speed control, and the voice is ~63 MB — load on demand
  piper: { workerUrl: `${BASE_URL}/piper-worker.js`, speedInGeneration: false, eager: false },
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

/** Recover the voice portion of a key without needing the original Route */
function voiceFromKey(key: string): string {
  return key.slice(0, key.indexOf("::"));
}

const VOICE_ENGINE: Record<string, EngineId> = {
  af_heart: "kokoro",
  bf_emma: "kokoro",
  "es_MX-claude-high": "piper",
};

/** True when this voice's cached audio has the speed baked in (so it goes stale on a speed change) */
function isSpeedDependentVoice(voice: string): boolean {
  const engine = VOICE_ENGINE[voice];
  return engine ? ENGINES[engine].speedInGeneration : false;
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
  /** Current load state, for display (e.g. Settings) */
  getState(): EngineState;
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

    getState() {
      clearExpiredFailure();
      return state;
    },
  };
}

export interface NeuralWebSpeechService extends SpeechService {
  /** Speak a fixed app message at the constant reference speed */
  speakPinned(text: string, language: string): Promise<void>;
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
  /** Pre-generate and permanently pin fixed app messages (feedback, intro) */
  pregeneratePinned(texts: string[], language: string): Promise<void>;
  /** Abandon queued session warmups from screens the user already left */
  cancelWarmups(): void;
  /** Evict specific texts from the session cache (no-op for pinned/persisted entries) */
  forget(texts: string[], language: string): void;
  /** Remove specific texts from persisted storage too (e.g. a deleted list) */
  forgetPersisted(texts: string[], language: string): Promise<void>;
  /** Clear session (non-persistent) cache */
  clearSessionCache(): void;
  /** Clear cache invalidated by a speed change (memory + IndexedDB) */
  clearAllCache(): Promise<void>;
  /** Check if at least one engine finished loading */
  isModelReady(): boolean;
  /** Per-voice load status */
  getEngineStatuses(): { english: VoiceEngineStatus; spanish: VoiceEngineStatus };
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
  // Keys that are persisted (first phrase per list) — survive clearSessionCache
  // always, and clearAllCache unless their voice bakes speed into generation
  const persistedKeys = new Set<string>();
  // Fixed app messages (feedback, intro) — survive everything, always
  const pinnedKeys = new Set<string>();
  // In-flight generation requests, keyed the same as the cache, so concurrent
  // callers (e.g. the lookahead window and a persistent warmup) share one
  // generate() call instead of racing duplicate requests
  const inFlight = new Map<string, Promise<Waveform>>();

  // Interactive generations currently pending. Warmup loops wait for this to
  // reach zero before each item, so background work never queues in front of
  // audio the user is waiting on right now.
  let activeInteractive = 0;
  let idleWaiters: Array<() => void> = [];

  // Bumped by cancelWarmups(); session warmup loops capture it on start and
  // abandon their remaining items once it moves on
  let warmupEpoch = 0;

  function noteInteractiveStart() {
    activeInteractive++;
  }

  function noteInteractiveEnd() {
    activeInteractive = Math.max(0, activeInteractive - 1);
    if (activeInteractive === 0) {
      const waiters = idleWaiters;
      idleWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }

  /** Resolves once no interactive generation is pending (re-checks after each wake) */
  async function untilInteractiveIdle(): Promise<void> {
    while (activeInteractive > 0) {
      await new Promise<void>((resolve) => idleWaiters.push(resolve));
    }
  }

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

  /**
   * Get audio from memory cache, then IndexedDB, then generate it.
   * Concurrent calls for the same key share a single in-flight request.
   */
  async function getWaveform(
    text: string,
    route: Route,
    intent: Intent,
    opts: { speedOverride?: number; skipPersistedLookup?: boolean } = {}
  ): Promise<Waveform> {
    const key = cacheKey(text, route.voice);

    const memCached = sessionCache.get(key);
    if (memCached) return memCached;

    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = (async (): Promise<Waveform> => {
      if (!opts.skipPersistedLookup) {
        const persisted = await loadPersistedAudio(key);
        if (persisted) {
          sessionCache.set(key, persisted);
          return persisted;
        }
      }

      const speed = opts.speedOverride ?? getSpeed();
      const waveform = await engines[route.engine].generate(text, route.voice, speed, {
        intent,
        // If it arrives after we gave up, cache it so the next attempt is instant
        onLate: (late) => sessionCache.set(key, late),
      });

      sessionCache.set(key, waveform);
      return waveform;
    })();

    inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      inFlight.delete(key);
    }
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
          // A pinned message that hasn't finished warming yet still needs its
          // fixed speed, not whatever the user has selected
          const pinned = pinnedKeys.has(cacheKey(text, route.voice));
          noteInteractiveStart();
          let waveform: Waveform;
          try {
            waveform = await getWaveform(text, route, "interactive", {
              speedOverride: pinned ? PINNED_SPEED : undefined,
            });
          } finally {
            noteInteractiveEnd();
          }
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

    /** Speak a fixed app message (feedback, intro) at the constant reference speed */
    async speakPinned(text: string, language: string): Promise<void> {
      isSpeakingNow = true;
      const route = routeLanguage(language);

      try {
        if (route && engines[route.engine].isAvailable()) {
          pinnedKeys.add(cacheKey(text, route.voice));
          noteInteractiveStart();
          let waveform: Waveform;
          try {
            waveform = await getWaveform(text, route, "interactive", {
              speedOverride: PINNED_SPEED,
            });
          } finally {
            noteInteractiveEnd();
          }
          await playWaveform(waveform, playbackRateFor(route.engine));
        } else {
          await speakWithWebSpeechAPI(text, language, PINNED_SPEED);
        }
      } catch (error) {
        console.warn("[TTS] using browser voice:", (error as Error).message);
        try {
          await speakWithWebSpeechAPI(text, language, PINNED_SPEED);
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

    /**
     * Pre-generate for the session (in-memory only, not persisted).
     * Concurrent/duplicate requests for the same text are coalesced by
     * getWaveform, so callers don't need to track in-flight keys themselves.
     * The batch yields to interactive requests and dies on cancelWarmups().
     */
    pregenerate(texts: string[], language: string): void {
      const route = routeLanguage(language);
      if (!route) return;

      const epoch = warmupEpoch;
      (async () => {
        for (const text of texts) {
          // Don't queue in front of audio the user is waiting on
          await untilInteractiveIdle();
          // Abandon leftovers from a screen the user already left
          if (epoch !== warmupEpoch) return;
          // Stop the whole batch if the engine went down mid-way
          if (!engines[route.engine].isAvailable()) return;
          await getWaveform(text, route, "warmup").catch(() => {});
        }
      })();
    },

    /**
     * Abandon queued session warmups (pregenerate batches not yet generated).
     * Screens call this on context changes — leaving a list, starting practice —
     * so a previous screen's batch doesn't keep the worker busy. The utterance
     * already inside the worker still finishes (and gets cached); pinned and
     * persistent batches are unaffected.
     */
    cancelWarmups(): void {
      warmupEpoch++;
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

        // Persistence is background work: let interactive audio go first
        await untilInteractiveIdle();

        if (persistedKeys.has(key)) {
          onProgress?.(i + 1, texts.length, text, "cached");
          continue;
        }

        onProgress?.(i + 1, texts.length, text, "checking");

        // One lookup, not two: check memory, then IndexedDB exactly once
        if (!sessionCache.has(key)) {
          const persisted = await loadPersistedAudio(key);
          if (persisted) sessionCache.set(key, persisted);
        }
        if (sessionCache.has(key)) {
          persistedKeys.add(key);
          onProgress?.(i + 1, texts.length, text, "cached");
          continue;
        }

        // Nothing left to warm if the engine is down — bail instead of logging
        // one failure per phrase
        if (!engines[route.engine].isAvailable()) return;

        onProgress?.(i + 1, texts.length, text, "generating");
        try {
          // Already confirmed a miss above, so skip the redundant IndexedDB read
          const waveform = await getWaveform(text, route, "warmup", {
            skipPersistedLookup: true,
          });
          await persistAudio(key, waveform.audio, waveform.sampleRate);
          persistedKeys.add(key);
        } catch (err) {
          console.warn("[TTS] Failed to persist:", text, err);
        }
      }
    },

    /**
     * Pre-generate AND permanently pin fixed app messages (feedback, intro).
     * Always uses PINNED_SPEED, and the resulting keys are exempt from every
     * cache clear, since a speed change never invalidates them.
     */
    async pregeneratePinned(texts: string[], language: string): Promise<void> {
      const route = routeLanguage(language);
      if (!route) return;

      for (const text of texts) {
        const key = cacheKey(text, route.voice);
        pinnedKeys.add(key);

        if (persistedKeys.has(key) || sessionCache.has(key)) continue;

        // Pinning is background work: let interactive audio go first
        await untilInteractiveIdle();

        if (!sessionCache.has(key)) {
          const persisted = await loadPersistedAudio(key);
          if (persisted) sessionCache.set(key, persisted);
        }
        if (sessionCache.has(key)) {
          persistedKeys.add(key);
          continue;
        }

        if (!engines[route.engine].isAvailable()) continue;

        try {
          const waveform = await getWaveform(text, route, "warmup", {
            speedOverride: PINNED_SPEED,
            skipPersistedLookup: true,
          });
          await persistAudio(key, waveform.audio, waveform.sampleRate);
          persistedKeys.add(key);
        } catch (err) {
          console.warn("[TTS] Failed to pin:", text, err);
        }
      }
    },

    /** Evict specific texts from the session cache (no-op for pinned/persisted entries) */
    forget(texts: string[], language: string): void {
      const route = routeLanguage(language);
      if (!route) return;

      for (const text of texts) {
        const key = cacheKey(text, route.voice);
        if (persistedKeys.has(key) || pinnedKeys.has(key)) continue;
        sessionCache.delete(key);
      }
    },

    /** Remove specific texts from persisted storage too (e.g. a deleted list) */
    async forgetPersisted(texts: string[], language: string): Promise<void> {
      const route = routeLanguage(language);
      if (!route) return;

      const keys: string[] = [];
      for (const text of texts) {
        const key = cacheKey(text, route.voice);
        if (pinnedKeys.has(key)) continue;
        sessionCache.delete(key);
        persistedKeys.delete(key);
        keys.push(key);
      }
      await deletePersistedAudio(keys);
    },

    /** Clear session cache, keeping pinned and persisted entries warm in memory */
    clearSessionCache(): void {
      for (const key of sessionCache.keys()) {
        if (!persistedKeys.has(key) && !pinnedKeys.has(key)) {
          sessionCache.delete(key);
        }
      }
    },

    isModelReady(): boolean {
      return Object.values(engines).some((engine) => engine.isReady());
    },

    getEngineStatuses() {
      return {
        english: engines.kokoro.getState() as VoiceEngineStatus,
        spanish: engines.piper.getState() as VoiceEngineStatus,
      };
    },

    /**
     * Purge cache invalidated by a speed change. Pinned messages never used
     * the user's speed, so they're untouched. Persisted/session entries are
     * only purged when their voice actually bakes speed into generation
     * (Kokoro/English) — Piper applies speed at playback, so its cache stays
     * valid across a speed change.
     */
    async clearAllCache(): Promise<void> {
      for (const key of Array.from(sessionCache.keys())) {
        if (pinnedKeys.has(key)) continue;
        if (!isSpeedDependentVoice(voiceFromKey(key))) continue;
        sessionCache.delete(key);
        persistedKeys.delete(key);
      }

      const allKeys = await getAllPersistedKeys();
      const toDelete = allKeys.filter(
        (key) => !pinnedKeys.has(key) && isSpeedDependentVoice(voiceFromKey(key))
      );
      await deletePersistedAudio(toDelete);
    },
  };
}
