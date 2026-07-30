/**
 * AudioStore backed by expo-file-system (native).
 *
 * One raw little-endian Float32 PCM file per cache key under
 * <document>/tts-cache/, plus an index.json mapping the original key to its
 * file name and sample rate. The index is required because keys embed the
 * voice (`voice::text`) and clearAllCache needs to recover it via allKeys().
 *
 * Mirrors ../web/cache.ts resilience: every operation swallows errors with a warn,
 * degrading to a cache miss rather than breaking speech.
 */

import { Directory, File, Paths } from "expo-file-system";

import type { AudioStore, Waveform } from "../../core";

const DIR_NAME = "tts-cache";
const INDEX_FILE = "index.json";

interface IndexEntry {
  file: string;
  sampleRate: number;
}

/** Keys are arbitrary text — map each to a filesystem-safe, collision-resistant name */
function fileNameFor(key: string): string {
  // FNV-1a 32-bit, hex, plus the key length to further reduce collision odds
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16)}-${key.length}.f32`;
}

function toFloat32(bytes: Uint8Array): Float32Array {
  // A view is only valid when the byte offset is 4-aligned; copy otherwise
  if (bytes.byteOffset % 4 === 0 && bytes.byteLength % 4 === 0) {
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
  }
  const copy = bytes.slice();
  return new Float32Array(copy.buffer, 0, Math.floor(copy.byteLength / 4));
}

export function createFileSystemStore(): AudioStore {
  let dir: Directory | null = null;
  // Loaded once, kept in memory; rewritten on every persist/remove
  let index: Record<string, IndexEntry> | null = null;
  // Serializes index writes so concurrent persists can't interleave
  let writeChain: Promise<void> = Promise.resolve();

  function getDir(): Directory {
    if (!dir) {
      dir = new Directory(Paths.document, DIR_NAME);
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    }
    return dir;
  }

  async function getIndex(): Promise<Record<string, IndexEntry>> {
    if (index) return index;
    try {
      const file = new File(getDir(), INDEX_FILE);
      index = file.exists ? (JSON.parse(await file.text()) as Record<string, IndexEntry>) : {};
    } catch (err) {
      // Corrupt or unreadable index: start fresh. Orphaned .f32 files are
      // tolerable — they get overwritten when their key is persisted again.
      console.warn("[TTS FS Cache] Failed to read index, resetting:", err);
      index = {};
    }
    return index;
  }

  function saveIndex(): Promise<void> {
    writeChain = writeChain.then(() => {
      try {
        new File(getDir(), INDEX_FILE).write(JSON.stringify(index ?? {}));
      } catch (err) {
        console.warn("[TTS FS Cache] Failed to write index:", err);
      }
    });
    return writeChain;
  }

  return {
    async persist(key: string, waveform: Waveform): Promise<void> {
      try {
        const idx = await getIndex();
        const name = fileNameFor(key);
        const bytes = new Uint8Array(
          waveform.audio.buffer,
          waveform.audio.byteOffset,
          waveform.audio.byteLength
        );
        new File(getDir(), name).write(bytes);
        idx[key] = { file: name, sampleRate: waveform.sampleRate };
        await saveIndex();
      } catch (err) {
        console.warn("[TTS FS Cache] Failed to persist:", err);
      }
    },

    async load(key: string): Promise<Waveform | null> {
      try {
        const idx = await getIndex();
        const entry = idx[key];
        if (!entry) return null;

        const file = new File(getDir(), entry.file);
        if (!file.exists) return null;

        const bytes = await file.bytes();
        return { audio: toFloat32(bytes), sampleRate: entry.sampleRate };
      } catch (err) {
        console.warn("[TTS FS Cache] Failed to load:", err);
        return null;
      }
    },

    async allKeys(): Promise<string[]> {
      try {
        return Object.keys(await getIndex());
      } catch {
        return [];
      }
    },

    async remove(keys: string[]): Promise<void> {
      if (keys.length === 0) return;
      try {
        const idx = await getIndex();
        for (const key of keys) {
          const entry = idx[key];
          if (!entry) continue;
          delete idx[key];
          try {
            const file = new File(getDir(), entry.file);
            if (file.exists) file.delete();
          } catch (err) {
            console.warn("[TTS FS Cache] Failed to delete file:", err);
          }
        }
        await saveIndex();
      } catch (err) {
        console.warn("[TTS FS Cache] Failed to remove:", err);
      }
    },
  };
}
