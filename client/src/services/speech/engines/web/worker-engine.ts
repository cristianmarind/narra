/**
 * Web Worker TTS engine adapter (web only).
 *
 * Wraps a TTS worker in the core's Engine interface, failing fast: anything
 * other than "ready" makes an interactive request give up within
 * READY_BUDGET_INTERACTIVE_MS so the caller can fall back, while loading
 * continues in the background for later requests.
 *
 * Model weights are cached by each worker's library (Kokoro via the Cache API,
 * Piper via the Origin Private File System), so they download only once.
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

export interface WorkerEngineSpec {
  workerUrl: string;
  /**
   * True when the worker bakes the speaking rate into generation. For engines
   * that don't, the rate is applied at playback via playbackRate instead.
   */
  speedInGeneration: boolean;
  /** Whether to start loading the model as soon as the service is created */
  eager: boolean;
}

export function createWorkerEngine(id: string, spec: WorkerEngineSpec): Engine {
  let worker: Worker | null = null;
  let state: VoiceEngineStatus = "idle";
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
    speedInGeneration: spec.speedInGeneration,

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
