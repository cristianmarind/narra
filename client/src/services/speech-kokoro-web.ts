/**
 * Hybrid TTS for Web with layered caching:
 * - English text → Kokoro AI (via Web Worker) with persistent + in-memory cache
 * - Other languages → Web Speech API (browser native TTS)
 *
 * Cache layers:
 * 1. In-memory Map (session cache, cleared on clearSessionCache())
 * 2. IndexedDB (persistent cache for first phrases, survives reload)
 */

import type { SpeechService } from "@/types";
import {
  persistAudio,
  loadPersistedAudio,
  hasPersistedAudio,
  clearAllPersistedAudio,
} from "./tts-cache";

const SAMPLE_RATE = 24000;
const KOKORO_LANGUAGES = new Set([
  "en", "en_us", "en_gb", "en-us", "en-gb",
  "english", "inglés", "ingles",
]);

function getVoiceForLanguage(language: string): string {
  const lang = language.toLowerCase().replace("-", "_");
  if (lang === "en_gb") return "bf_emma";
  return "af_heart";
}

function isKokoroLanguage(language: string): boolean {
  const lang = language.toLowerCase().trim();
  return KOKORO_LANGUAGES.has(lang) || lang.startsWith("en");
}

function cacheKey(text: string, voice: string): string {
  return `${voice}::${text}`;
}

function speakWithWebSpeechAPI(text: string, language: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export interface KokoroWebSpeechService extends SpeechService {
  /** Pre-generate and persist audio for first phrases (permanent cache) */
  pregeneratePersistent(texts: string[], language: string, onProgress?: (current: number, total: number, text: string, status: "checking" | "generating" | "cached") => void): Promise<void>;
  /** Clear session (non-persistent) cache */
  clearSessionCache(): void;
  /** Clear ALL cache (memory + IndexedDB). Used when speed changes. */
  clearAllCache(): Promise<void>;
  /** Check if model is ready */
  isModelReady(): boolean;
}

export function createKokoroWebSpeechService(getSpeed: () => number = () => 0.85): KokoroWebSpeechService {
  let worker: Worker | null = null;
  let isReady = false;
  let isSpeakingNow = false;
  let currentAudioSource: AudioBufferSourceNode | null = null;
  let audioContext: AudioContext | null = null;
  let messageId = 0;

  const pending = new Map<number, { resolve: (audio: Float32Array) => void; reject: (err: Error) => void }>();

  // In-memory session cache (cleared when leaving practice)
  const sessionCache = new Map<string, Float32Array>();
  // Keys that are persisted (first phrases) — don't clear these
  const persistedKeys = new Set<string>();
  const generatingKeys = new Set<string>();

  let readyResolvers: Array<() => void> = [];

  function getWorker(): Worker {
    if (worker) return worker;
    if (typeof Worker === "undefined") throw new Error("Worker not available");

    worker = new Worker("/kokoro-worker.js", { type: "module" });
    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case "ready":
          isReady = true;
          readyResolvers.forEach((r) => r());
          readyResolvers = [];
          break;
        case "loading":
          // Progress handled externally
          break;
        case "audio":
          if (msg.id != null && pending.has(msg.id)) {
            pending.get(msg.id)!.resolve(msg.audio);
            pending.delete(msg.id);
          }
          break;
        case "error":
          if (msg.id != null && pending.has(msg.id)) {
            pending.get(msg.id)!.reject(new Error(msg.error));
            pending.delete(msg.id);
          }
          break;
        case "log":
          console.log(`[Kokoro Worker]`, msg.message);
          break;
      }
    };
    worker.onerror = (err) => console.error("Kokoro worker error:", err);
    return worker;
  }

  function waitForReady(): Promise<void> {
    if (isReady) return Promise.resolve();
    return new Promise<void>((resolve) => {
      readyResolvers.push(resolve);
      const w = getWorker();
      w.postMessage({ type: "init" });
    });
  }

  // Auto-init in browser
  if (typeof window !== "undefined" && typeof Worker !== "undefined") {
    setTimeout(() => {
      const w = getWorker();
      w.postMessage({ type: "init" });
    }, 0);
  }

  function getAudioContext(): AudioContext {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    }
    return audioContext;
  }

  /** Get audio from memory cache, then IndexedDB, then generate */
  async function getWaveform(text: string, voice: string): Promise<Float32Array> {
    const key = cacheKey(text, voice);

    // 1. Check memory
    const memCached = sessionCache.get(key);
    if (memCached) return memCached;

    // 2. Check IndexedDB (persistent)
    const persisted = await loadPersistedAudio(key);
    if (persisted) {
      sessionCache.set(key, persisted); // warm memory
      return persisted;
    }

    // 3. Generate
    await waitForReady();
    const w = getWorker();
    const id = ++messageId;

    const waveform = await new Promise<Float32Array>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.postMessage({ type: "speak", id, text, voice, speed: getSpeed() });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error("TTS timeout"));
        }
      }, 60000);
    });

    sessionCache.set(key, waveform);
    generatingKeys.delete(key);
    return waveform;
  }

  async function playWaveform(waveform: Float32Array): Promise<void> {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

    await new Promise<void>((resolve) => {
      const buffer = ctx.createBuffer(1, waveform.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(waveform);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      currentAudioSource = source;
      source.onended = () => {
        currentAudioSource = null;
        resolve();
      };
      source.start();
    });
  }

  return {
    async speak(text: string, language: string): Promise<void> {
      isSpeakingNow = true;
      try {
        if (isKokoroLanguage(language)) {
          const voice = getVoiceForLanguage(language);
          const waveform = await getWaveform(text, voice);
          await playWaveform(waveform);
        } else {
          await speakWithWebSpeechAPI(text, language);
        }
      } catch (error) {
        console.error("[TTS speak] Error:", error);
        try {
          await speakWithWebSpeechAPI(text, language);
        } catch {}
      } finally {
        isSpeakingNow = false;
      }
    },

    stop() {
      if (currentAudioSource) {
        try { currentAudioSource.stop(); } catch {}
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

    /** Pre-generate for session (in-memory only, not persisted) */
    pregenerate(texts: string[], language: string): void {
      if (!isKokoroLanguage(language)) return;
      const voice = getVoiceForLanguage(language);

      (async () => {
        for (const text of texts) {
          const key = cacheKey(text, voice);
          if (sessionCache.has(key) || generatingKeys.has(key)) continue;
          generatingKeys.add(key);
          try {
            await getWaveform(text, voice);
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
      onProgress?: (current: number, total: number, text: string, status: "checking" | "generating" | "cached") => void
    ): Promise<void> {
      if (!isKokoroLanguage(language)) return;
      const voice = getVoiceForLanguage(language);

      let generated = 0;
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const key = cacheKey(text, voice);

        // Skip if already in memory
        if (persistedKeys.has(key)) {
          if (onProgress) onProgress(i + 1, texts.length, text, "cached");
          continue;
        }

        if (onProgress) onProgress(i + 1, texts.length, text, "checking");

        const alreadyPersisted = await hasPersistedAudio(key);
        if (alreadyPersisted) {
          persistedKeys.add(key);
          if (onProgress) onProgress(i + 1, texts.length, text, "cached");
          continue;
        }

        // Generate and persist
        if (onProgress) onProgress(i + 1, texts.length, text, "generating");
        try {
          const waveform = await getWaveform(text, voice);
          await persistAudio(key, waveform);
          persistedKeys.add(key);
          generated++;
        } catch (err) {
          console.warn("[TTS] Failed to persist:", text, err);
        }
      }
      return;
    },

    /** Clear session cache (keep persisted keys in memory for fast access) */
    clearSessionCache(): void {
      // Remove all keys that are NOT persisted
      for (const key of sessionCache.keys()) {
        if (!persistedKeys.has(key)) {
          sessionCache.delete(key);
        }
      }
      generatingKeys.clear();
    },

    isModelReady(): boolean {
      return isReady;
    },

    async clearAllCache(): Promise<void> {
      sessionCache.clear();
      persistedKeys.clear();
      generatingKeys.clear();
      await clearAllPersistedAudio();
    },
  };
}
