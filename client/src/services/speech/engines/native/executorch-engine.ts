/**
 * Native Kokoro TTS engine via react-native-executorch.
 *
 * Same fail-fast contract as the web worker engine: interactive requests give
 * up within READY_BUDGET_INTERACTIVE_MS while the model keeps loading in the
 * background, failures enter a cooldown before retrying, and audio that
 * arrives after a timeout is still handed to onLate so it gets cached.
 *
 * The dependency is optional (requires a custom dev client build), so it's
 * loaded with a guarded require — Metro marks try/catch-wrapped requires as
 * optional, so bundling succeeds when the package is absent.
 *
 * API verified against the installed package (node_modules/react-native-executorch
 * lib/typescript): TextToSpeechModule.fromModelName(config, onProgress) and
 * forward(text, speed, phonemize?) both take positional args as this file
 * assumes. Voice configs are flat, ready-made TextToSpeechModelConfig
 * constants (e.g. KOKORO_AMERICAN_ENGLISH_FEMALE_HEART) exported from the
 * package root — not a `models.text_to_speech.kokoro.*` factory namespace.
 */

import type { VoiceEngineStatus } from "@/types";
import {
  FAILURE_COOLDOWN_MS,
  GENERATE_TIMEOUT_INTERACTIVE_MS,
  GENERATE_TIMEOUT_WARMUP_MS,
  LOAD_TIMEOUT_MS,
  READY_BUDGET_INTERACTIVE_MS,
  type Engine,
  type Waveform,
} from "../../core";

/** Kokoro outputs 24 kHz mono */
const SAMPLE_RATE = 24000;

/** Kokoro's documented speed range */
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;

let rne: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  rne = require("react-native-executorch");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ExpoResourceFetcher } = require("react-native-executorch-expo-resource-fetcher");
  rne.initExecutorch({ resourceFetcher: ExpoResourceFetcher });
} catch {
  // Dependencies not installed — isExecuTorchAvailable() reports false
}

export function isExecuTorchAvailable(): boolean {
  return rne != null && rne.TextToSpeechModule != null;
}

/** English Kokoro voice config, or null when unavailable */
export function englishKokoroModel(): any {
  return rne?.KOKORO_AMERICAN_ENGLISH_FEMALE_HEART ?? null;
}

/** Spanish Kokoro voice config, or null when unavailable */
export function spanishKokoroModel(): any {
  return rne?.KOKORO_SPANISH_FEMALE_DORA ?? null;
}

export function createExecuTorchEngine(
  id: string,
  getModelConfig: () => any
): Engine {
  let ttsModule: any = null;
  let state: VoiceEngineStatus = "idle";
  let failedAt = 0;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;

  /** Resolvers waiting for the model to load; called on success and on failure */
  let readyWaiters: Array<() => void> = [];

  // forward() isn't assumed reentrant: generations run one at a time, like
  // the worker did for web
  let forwardChain: Promise<unknown> = Promise.resolve();

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

    console.warn(`[${id}] unavailable, falling back to the system voice: ${reason}`);

    releaseWaiters();

    // Drop the module so the retry after cooldown starts clean
    ttsModule = null;
  }

  /** Reset a failed engine once its cooldown has elapsed */
  function clearExpiredFailure() {
    if (state === "failed" && Date.now() - failedAt >= FAILURE_COOLDOWN_MS) {
      state = "idle";
    }
  }

  function startLoading() {
    if (state === "ready" || state === "loading") return;

    state = "loading";

    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = setTimeout(() => markFailed("model load timed out"), LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const config = getModelConfig();
        if (!config) throw new Error("no model config for this voice");

        const loaded = await rne.TextToSpeechModule.fromModelName(config, () => {
          // Download progress isn't surfaced beyond the "loading" state
        });

        // A timeout may have marked us failed while the download ran
        if (state !== "loading") return;

        ttsModule = loaded;
        state = "ready";
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
        releaseWaiters();
      } catch (err) {
        markFailed((err as Error)?.message ?? "model failed to load");
      }
    })();
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

  /** Run forward() behind the serialization chain */
  function enqueueForward(text: string, speed: number): Promise<Waveform> {
    const run = forwardChain.then(
      async (): Promise<Waveform> => {
        if (!ttsModule) throw new Error(`${id} is unavailable`);
        const audio: Float32Array = await ttsModule.forward(text, speed);
        return { audio, sampleRate: SAMPLE_RATE };
      },
      // A previous generation's failure shouldn't poison the queue
      async (): Promise<Waveform> => {
        if (!ttsModule) throw new Error(`${id} is unavailable`);
        const audio: Float32Array = await ttsModule.forward(text, speed);
        return { audio, sampleRate: SAMPLE_RATE };
      }
    );
    forwardChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    // Kokoro bakes the speaking rate into generation
    speedInGeneration: true,

    async generate(text, voice, speed, { intent, onLate }) {
      const interactive = intent === "interactive";

      await awaitReady(interactive ? READY_BUDGET_INTERACTIVE_MS : null);

      const clamped = Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED);
      const generation = enqueueForward(text, clamped);
      const timeout = interactive
        ? GENERATE_TIMEOUT_INTERACTIVE_MS
        : GENERATE_TIMEOUT_WARMUP_MS;

      return new Promise<Waveform>((resolve, reject) => {
        let abandoned = false;

        const timer = setTimeout(() => {
          abandoned = true;
          reject(new Error(`${id} generation timed out`));
        }, timeout);

        generation.then(
          (waveform) => {
            clearTimeout(timer);
            if (abandoned) {
              // Too late to speak it, but still worth caching
              onLate?.(waveform);
            } else {
              resolve(waveform);
            }
          },
          (err) => {
            clearTimeout(timer);
            if (!abandoned) reject(err as Error);
          }
        );
      });
    },

    preload() {
      if (!isExecuTorchAvailable()) return;
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
