import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PERSISTED_PHRASES_PER_LIST } from "@/constants/practice";
import { fixedPromptsFor } from "@/constants/speech-prompts";
import { useServices } from "@/services";
import type { PhraseList } from "@/types";

/** Max lists warmed (persisted leading-phrase audio) per app session — keeps
 * cold-start cost bounded no matter how many lists the user ends up with
 * (imported, or seeded/synced from the default-lists manifest). Lists beyond
 * this cap catch up a few more per app open (see below), or warm themselves
 * the first time the user actually opens them (speak() already falls back to
 * the plain voice once and caches in the background). */
const MAX_WARMED_LISTS = 5;

/**
 * id -> the list's `updatedAt` at the time its first-phrase audio was
 * confirmed persisted. Lets a normal app open (nothing new to warm) skip the
 * persisted-store lookup entirely instead of re-checking every list's audio
 * on every cold start.
 */
const WARMED_STATE_KEY = "audio_warmup_state";

type WarmedState = Record<string, string>;

async function readWarmedState(): Promise<WarmedState> {
  try {
    const raw = await AsyncStorage.getItem(WARMED_STATE_KEY);
    return raw ? (JSON.parse(raw) as WarmedState) : {};
  } catch {
    return {};
  }
}

async function writeWarmedState(state: WarmedState): Promise<void> {
  try {
    await AsyncStorage.setItem(WARMED_STATE_KEY, JSON.stringify(state));
  } catch {
    // Worst case: this list gets re-checked (cheaply, on a cache hit) next open
  }
}

/**
 * Warms the audio that's always needed as soon as the lobby has its lists:
 * the app's fixed phrases (pinned, permanent) first, then the first
 * PERSISTED_PHRASES_PER_LIST phrases of up to MAX_WARMED_LISTS lists
 * (persisted, but may be regenerated on a speed change).
 *
 * Lists already confirmed warm at their current `updatedAt` are skipped with
 * no persisted-store lookup at all. Among the ones still needing it, the
 * most recently practiced go first — on a fresh install nothing has been
 * practiced yet, so this reduces to the first MAX_WARMED_LISTS lists in list
 * order. Any remainder catches up MAX_WARMED_LISTS at a time on later opens.
 *
 * Returns a non-blocking status message for a progress banner, or null when
 * idle/done.
 */
export function useAudioWarmup(lists: PhraseList[], loading: boolean): string | null {
  const { speech } = useServices();
  const [warmupStatus, setWarmupStatus] = useState<string | null>(null);

  useEffect(() => {
    if (loading || lists.length === 0) return;

    // Fixed app phrases ("Correcto", "Incorrecto", the intro) — pinned so they
    // survive a speed change, and always available no matter which list opens.
    // Cheap regardless of how many lists exist (a handful of short phrases
    // per native language in use), so every list contributes here, not just
    // the warmed subset below. No progress banner: fast enough not to need one.
    if (speech.pregeneratePinned) {
      const byNativeLang = new Map<string, Set<string>>();
      for (const list of lists) {
        const prompts = byNativeLang.get(list.nativeLanguage) ?? new Set<string>();
        for (const prompt of fixedPromptsFor(list.targetLanguage)) prompts.add(prompt);
        byNativeLang.set(list.nativeLanguage, prompts);
      }
      for (const [language, prompts] of byNativeLang) {
        speech.pregeneratePinned(Array.from(prompts), language);
      }
    }

    if (!speech.pregeneratePersistent) return;

    (async () => {
      const warmed = await readWarmedState();

      // Drop entries for lists that no longer exist, so the record doesn't
      // grow forever as lists get deleted
      const liveIds = new Set(lists.map((l) => l.id));
      let pruned = false;
      for (const id of Object.keys(warmed)) {
        if (!liveIds.has(id)) {
          delete warmed[id];
          pruned = true;
        }
      }

      const candidates = lists.filter(
        (list) => list.phrases.length > 0 && warmed[list.id] !== list.updatedAt
      );
      if (candidates.length === 0) {
        if (pruned) await writeWarmedState(warmed);
        return;
      }

      // Most recently practiced first; never-practiced lists (undefined) keep
      // their original relative order (stable sort) — on a fresh install
      // that's every list, so this is just "the first N lists".
      const toWarm = [...candidates]
        .sort((a, b) => {
          const at = a.lastPracticedAt ? new Date(a.lastPracticedAt).getTime() : -1;
          const bt = b.lastPracticedAt ? new Date(b.lastPracticedAt).getTime() : -1;
          return bt - at;
        })
        .slice(0, MAX_WARMED_LISTS);

      for (const list of toWarm) {
        const leading = list.phrases.slice(0, PERSISTED_PHRASES_PER_LIST);
        const onProgress = (_current: number, _total: number, _text: string, status: string) => {
          if (status === "generating") setWarmupStatus(`Configurando: "${list.name}"`);
        };

        const targets = leading.map((p) => p.acceptedTranslations[0]).filter(Boolean);
        if (targets.length > 0) {
          await speech.pregeneratePersistent!(targets, list.targetLanguage, onProgress);
        }
        const natives = leading.map((p) => p.nativeSentence).filter(Boolean);
        if (natives.length > 0) {
          await speech.pregeneratePersistent!(natives, list.nativeLanguage, onProgress);
        }

        // Persist after each list (not just at the end) so a session that
        // gets interrupted mid-warmup still keeps whatever progress it made
        warmed[list.id] = list.updatedAt;
        await writeWarmedState(warmed);
      }

      setWarmupStatus(null);
    })();
  }, [loading, lists.length]);

  return warmupStatus;
}
