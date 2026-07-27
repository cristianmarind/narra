/**
 * Persistent TTS audio cache using IndexedDB.
 *
 * Entries store the waveform together with its sample rate, because different
 * engines produce different rates (Kokoro 24 kHz, Piper voices 22.05 kHz).
 * Legacy entries that hold a bare Float32Array are read as 24 kHz.
 */

const DB_NAME = "kokoro_tts_cache";
const STORE_NAME = "audio";
const DB_VERSION = 1;

/** Sample rate assumed for cache entries written before rates were stored */
const LEGACY_SAMPLE_RATE = 24000;

export interface CachedAudio {
  audio: Float32Array;
  sampleRate: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Coerce whatever IndexedDB returned into a CachedAudio, or null. */
function parseStored(result: unknown): CachedAudio | null {
  if (!result) return null;

  // Current format: { audio, sampleRate }
  if (typeof result === "object" && "audio" in (result as object)) {
    const record = result as { audio: unknown; sampleRate?: number };
    const audio = toFloat32(record.audio);
    if (!audio) return null;
    return { audio, sampleRate: record.sampleRate ?? LEGACY_SAMPLE_RATE };
  }

  // Legacy format: bare Float32Array
  const audio = toFloat32(result);
  return audio ? { audio, sampleRate: LEGACY_SAMPLE_RATE } : null;
}

function toFloat32(value: unknown): Float32Array | null {
  if (value instanceof Float32Array) return value;
  if (value && typeof value === "object" && "buffer" in (value as object)) {
    return new Float32Array((value as ArrayBufferView).buffer);
  }
  return null;
}

export async function persistAudio(
  key: string,
  audio: Float32Array,
  sampleRate: number
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ audio, sampleRate }, key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TTS Cache] Failed to persist:", err);
  }
}

export async function loadPersistedAudio(key: string): Promise<CachedAudio | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(parseStored(request.result));
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function hasPersistedAudio(key: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/** Clear ALL persisted audio (used when speed changes) */
export async function clearAllPersistedAudio(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[TTS Cache] Failed to clear:", err);
  }
}
