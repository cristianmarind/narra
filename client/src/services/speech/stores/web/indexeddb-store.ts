/**
 * AudioStore backed by the existing IndexedDB cache primitives (web only).
 *
 * cache.ts owns the DB name, entry format, and legacy-format reads; this
 * adapter only reshapes its functions to the core's AudioStore interface.
 */

import type { AudioStore, Waveform } from "../../core";
import {
  deletePersistedAudio,
  getAllPersistedKeys,
  loadPersistedAudio,
  persistAudio,
} from "./cache";

export function createIndexedDbStore(): AudioStore {
  return {
    async persist(key: string, waveform: Waveform): Promise<void> {
      await persistAudio(key, waveform.audio, waveform.sampleRate);
    },

    async load(key: string): Promise<Waveform | null> {
      return loadPersistedAudio(key);
    },

    async allKeys(): Promise<string[]> {
      return getAllPersistedKeys();
    },

    async remove(keys: string[]): Promise<void> {
      await deletePersistedAudio(keys);
    },
  };
}
