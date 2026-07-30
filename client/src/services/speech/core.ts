/**
 * Platform-agnostic neural TTS orchestrator.
 *
 * All the caching/warmup sophistication lives here; platforms supply the
 * moving parts (engines that turn text into waveforms, a player, a persistent
 * store, and a plain-voice fallback) via SpeechCoreDeps.
 *
 * Cache layers:
 * 1. In-memory Map (session cache, cleared on clearSessionCache())
 * 2. AudioStore (persistent cache for first phrases, survives restarts —
 *    IndexedDB on web, files on native)
 *
 * Within those layers, entries fall into three permanence tiers:
 * - Pinned: fixed app messages (feedback, intro). Always generated at the
 *   constant PINNED_SPEED, never purged by anything — a speed change can't
 *   invalidate them because they never used the user's speed to begin with.
 * - Persisted: first phrase of each list. Survives clearSessionCache always,
 *   and survives clearAllCache too UNLESS its audio was baked at the old
 *   speed (only engines with speedInGeneration bake speed in; others apply
 *   it at playback, so their cache is speed-agnostic).
 * - Session-only: everything else (the sliding lookahead window during
 *   practice). Cleared freely.
 *
 * Warmup scheduling: each engine generates one utterance at a time, so a queued
 * warmup batch would make an interactive request (the user needs audio NOW)
 * wait behind it. Two mechanisms prevent that:
 * - Warmup loops yield: before each item they wait until no interactive
 *   generation is pending, so an interactive request waits behind at most the
 *   single warmup utterance already inside the engine.
 * - cancelWarmups() abandons queued session warmups. Screens call it when the
 *   context changes (leaving a list, starting practice), so a stale batch from
 *   a previous screen doesn't keep the engine busy. Pinned/persistent batches
 *   are not cancelled — they're cheap-per-item, self-deduplicating, and their
 *   output survives across screens anyway.
 */

import type { SpeechService, VoiceEngineStatus } from "@/types";

/** Fixed messages always speak at real-time pace, independent of the user's setting */
export const PINNED_SPEED = 1.0;

/**
 * Timing budgets.
 *
 * Interactive requests (the user pressed play, or a practice round started) must
 * never leave the user in silence: if the model isn't loaded yet or generation
 * drags, we give up quickly and let the platform's plain voice speak instead.
 *
 * Warmup requests happen in the background with a visible progress banner, so
 * they can afford to wait.
 */

/** How long an interactive request waits for the model to finish loading */
export const READY_BUDGET_INTERACTIVE_MS = 1_500;

/** How long an interactive request waits for audio once the model is ready */
export const GENERATE_TIMEOUT_INTERACTIVE_MS = 10_000;

/** Background warmup can wait much longer */
export const GENERATE_TIMEOUT_WARMUP_MS = 120_000;

/** If loading never completes or errors within this window, treat it as failed */
export const LOAD_TIMEOUT_MS = 90_000;

/**
 * After a failure, wait this long before trying to load again. A dropped CDN
 * request shouldn't disable the engine for the rest of the session.
 */
export const FAILURE_COOLDOWN_MS = 60_000;

/** Whether a request is user-facing or background warmup */
export type Intent = "interactive" | "warmup";

export interface Waveform {
  audio: Float32Array;
  sampleRate: number;
}

export interface GenerateOptions {
  /** Interactive requests get short budgets and degrade instead of blocking */
  intent: Intent;
  /**
   * Called if the audio arrives after the request already timed out, so the
   * caller can still cache it. The next attempt is then instant.
   */
  onLate?: (waveform: Waveform) => void;
}

/** A neural TTS engine: turns text into a waveform, loading its model on demand */
export interface Engine {
  /**
   * True when the engine bakes the speaking rate into generation (its cached
   * audio goes stale on a speed change). For engines that don't, the rate is
   * applied at playback via playbackRate instead.
   */
  readonly speedInGeneration: boolean;
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
  getState(): VoiceEngineStatus;
}

export interface Route {
  /** Key into SpeechCoreDeps.engines */
  engine: string;
  voice: string;
}

/** Persistent audio storage (IndexedDB on web, files on native) */
export interface AudioStore {
  persist(key: string, waveform: Waveform): Promise<void>;
  load(key: string): Promise<Waveform | null>;
  /** All persisted keys, so clearAllCache can filter by voice */
  allKeys(): Promise<string[]>;
  remove(keys: string[]): Promise<void>;
}

/** Waveform playback (Web Audio on web, react-native-audio-api on native) */
export interface Player {
  /** Play to the end (resolves when playback finishes) */
  play(waveform: Waveform, playbackRate: number): Promise<void>;
  /** Stop the current playback, keeping the player usable */
  stop(): void;
}

export interface SpeechCoreDeps {
  engines: Record<string, Engine>;
  /**
   * Decide which engine and voice handle a language. Returns null when no
   * neural engine covers it (the core then uses fallbackSpeak).
   */
  routeLanguage(language: string): Route | null;
  /** voice → engine id, so clearAllCache can tell which keys are speed-dependent */
  voiceEngine: Record<string, string>;
  store: AudioStore;
  player: Player;
  /** Plain platform voice used when no engine covers the language or the neural path fails */
  fallbackSpeak(text: string, language: string, rate: number): Promise<void>;
  /** Stop the fallback voice (part of stop()) */
  fallbackStop(): void;
  /** Engine ids backing the fixed {english, spanish} status shape */
  statusEngines: { english: string; spanish: string };
  getSpeed(): number;
}

/** Full-featured speech service: SpeechService with every optional method present */
export interface SpeechCoreService extends SpeechService {
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
  /** Clear cache invalidated by a speed change (memory + persistent store) */
  clearAllCache(): Promise<void>;
  /** Check if at least one engine finished loading */
  isModelReady(): boolean;
  /** Per-voice load status */
  getEngineStatuses(): { english: VoiceEngineStatus; spanish: VoiceEngineStatus };
}

/** Cache entries are keyed per voice so engines never collide */
export function cacheKey(text: string, voice: string): string {
  return `${voice}::${text}`;
}

/** Recover the voice portion of a key without needing the original Route */
export function voiceFromKey(key: string): string {
  return key.slice(0, key.indexOf("::"));
}

export function createSpeechCore(deps: SpeechCoreDeps): SpeechCoreService {
  const { engines, routeLanguage, store, player, fallbackSpeak, fallbackStop, getSpeed } = deps;

  let isSpeakingNow = false;

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

  /** True when this voice's cached audio has the speed baked in (so it goes stale on a speed change) */
  function isSpeedDependentVoice(voice: string): boolean {
    const engine = deps.voiceEngine[voice];
    return engine ? engines[engine].speedInGeneration : false;
  }

  /**
   * Get audio from memory cache, then the persistent store, then generate it.
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
        const persisted = await store.load(key);
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

  /** Playback rate to apply, given whether the engine already applied the speed. */
  function playbackRateFor(engine: string): number {
    if (engines[engine].speedInGeneration) return 1;
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
          await player.play(waveform, playbackRateFor(route.engine));
        } else {
          await fallbackSpeak(text, language, getSpeed());
        }
      } catch (error) {
        // Expected when the model is still loading or its download failed. The
        // plain voice is worse, but silence is worse than that.
        console.warn("[TTS] using fallback voice:", (error as Error).message);
        try {
          await fallbackSpeak(text, language, getSpeed());
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
          await player.play(waveform, playbackRateFor(route.engine));
        } else {
          await fallbackSpeak(text, language, PINNED_SPEED);
        }
      } catch (error) {
        console.warn("[TTS] using fallback voice:", (error as Error).message);
        try {
          await fallbackSpeak(text, language, PINNED_SPEED);
        } catch {}
      } finally {
        isSpeakingNow = false;
      }
    },

    stop() {
      player.stop();
      fallbackStop();
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
     * so a previous screen's batch doesn't keep the engine busy. The utterance
     * already inside the engine still finishes (and gets cached); pinned and
     * persistent batches are unaffected.
     */
    cancelWarmups(): void {
      warmupEpoch++;
    },

    /** Pre-generate AND persist (for first phrases) */
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

        // One lookup, not two: check memory, then the store exactly once
        if (!sessionCache.has(key)) {
          const persisted = await store.load(key);
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
          // Already confirmed a miss above, so skip the redundant store read
          const waveform = await getWaveform(text, route, "warmup", {
            skipPersistedLookup: true,
          });
          await store.persist(key, waveform);
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
          const persisted = await store.load(key);
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
          await store.persist(key, waveform);
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
      await store.remove(keys);
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
        english: engines[deps.statusEngines.english].getState(),
        spanish: engines[deps.statusEngines.spanish].getState(),
      };
    },

    /**
     * Purge cache invalidated by a speed change. Pinned messages never used
     * the user's speed, so they're untouched. Persisted/session entries are
     * only purged when their voice actually bakes speed into generation —
     * engines that apply speed at playback keep a speed-agnostic cache. (On
     * native, every engine bakes speed in, so this purges everything except
     * pinned entries — intended, not a bug.)
     */
    async clearAllCache(): Promise<void> {
      for (const key of Array.from(sessionCache.keys())) {
        if (pinnedKeys.has(key)) continue;
        if (!isSpeedDependentVoice(voiceFromKey(key))) continue;
        sessionCache.delete(key);
        persistedKeys.delete(key);
      }

      const allKeys = await store.allKeys();
      const toDelete = allKeys.filter(
        (key) => !pinnedKeys.has(key) && isSpeedDependentVoice(voiceFromKey(key))
      );
      await store.remove(toDelete);
    },
  };
}
