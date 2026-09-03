import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PERSISTED_PHRASES_PER_LIST } from "@/constants/practice";
import { DEFAULT_LISTS } from "@/data/default-lists";
import { useServices } from "@/services";
import type {
  AcceptedTranslation,
  DefaultListDef,
  Phrase,
  PhraseList,
  PhraseStats,
  SpeechService,
} from "@/types";
import { generateId } from "@/utils";

/**
 * One-shot flag: the default lists are seeded only on the very first launch,
 * so deleting them later doesn't bring them back.
 */
const SEEDED_KEY = "default_lists_seeded";

/** Only the first PERSISTED_PHRASES_PER_LIST phrases are ever persisted (see the lobby's warmup effect) */
async function forgetPersistedListAudio(speech: SpeechService, list: PhraseList): Promise<void> {
  if (!speech.forgetPersisted || list.phrases.length === 0) return;
  const leading = list.phrases.slice(0, PERSISTED_PHRASES_PER_LIST);
  await Promise.all([
    speech.forgetPersisted(leading.map((p) => p.acceptedTranslations[0]), list.targetLanguage),
    speech.forgetPersisted(leading.map((p) => p.nativeSentence), list.nativeLanguage),
  ]);
}

interface PhraseListsContextValue {
  lists: PhraseList[];
  loading: boolean;
  refresh: () => Promise<void>;
  createList: (name: string, nativeLanguage: string, targetLanguage: string) => Promise<PhraseList>;
  deleteList: (id: string) => Promise<void>;
  addPhrase: (listId: string, nativeSentence: string, acceptedTranslations: string[], properNouns?: string[]) => Promise<void>;
  updatePhrase: (listId: string, phraseId: string, updates: Partial<Pick<Phrase, "nativeSentence" | "acceptedTranslations">>) => Promise<void>;
  deletePhrase: (listId: string, phraseId: string) => Promise<void>;
  /** Persist a per-list practice preference (doesn't touch updatedAt) */
  setListPreference: (listId: string, updates: Partial<Pick<PhraseList, "showTranslation">>) => Promise<void>;
  /** Add a user-submitted translation to a phrase (flagged as userAdded) */
  addUserTranslation: (listId: string, phraseId: string, translation: string) => Promise<void>;
  /** Increment correct/incorrect stats for a phrase */
  recordPhraseResult: (listId: string, phraseId: string, isCorrect: boolean) => Promise<void>;
  /**
   * User-triggered check for new/updated default lists (pull-to-refresh, a
   * manual button) — bypasses the manifest's 24h cache. Resolves to how many
   * lists were added or updated, for UI feedback.
   */
  checkForListUpdates: () => Promise<number>;
}

const PhraseListsContext = createContext<PhraseListsContextValue | null>(null);

/**
 * Merge freshly-synced default-list phrases into what's already stored,
 * matched by sentence text. Preserves id/stats/userTranslations for phrases
 * that still exist so a content update doesn't wipe practice progress;
 * phrases no longer present remotely are dropped, new ones get a fresh id.
 */
function mergeDefaultListPhrases(
  existingPhrases: Phrase[],
  remotePhrases: DefaultListDef["phrases"]
): Phrase[] {
  const existingBySentence = new Map(existingPhrases.map((p) => [p.nativeSentence, p]));
  return remotePhrases.map((rp) => {
    const match = existingBySentence.get(rp.nativeSentence);
    return {
      id: match?.id ?? generateId(),
      nativeSentence: rp.nativeSentence,
      acceptedTranslations: rp.acceptedTranslations,
      ...(rp.properNouns?.length ? { properNouns: rp.properNouns } : {}),
      ...(match?.userTranslations?.length ? { userTranslations: match.userTranslations } : {}),
      ...(match?.stats ? { stats: match.stats } : {}),
    };
  });
}

/**
 * Provider that holds the single source of truth for phrase lists.
 * Must wrap all screens that use usePhraseLists().
 */
export function PhraseListsProvider({ children }: { children: React.ReactNode }) {
  const { storage, speech, defaultLists } = useServices();
  const [lists, setLists] = useState<PhraseList[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storage.getLists();
      setLists(data);
    } finally {
      setLoading(false);
    }
  }, [storage]);

  /**
   * Checks the default-lists manifest for content that's new or changed
   * since the last sync, and applies it: patches an existing default list in
   * place (matched by `defaultListId`, preserving progress via
   * mergeDefaultListPhrases) or seeds a brand-new one when the manifest
   * entry's id hasn't been seen before. Silent no-op offline or unconfigured.
   *
   * `force` skips the manifest's 24h cache — used for the user-triggered
   * "check for updates" action, where the auto-sync-on-launch cache-first
   * behavior would otherwise make the button/pull-to-refresh feel broken.
   * Returns how many lists were added or updated, for UI feedback.
   */
  const syncDefaultLists = useCallback(async (force = false) => {
    const updates = await defaultLists.checkForUpdates({ force });
    if (updates.length === 0) return 0;

    const current = await storage.getLists();
    const now = new Date().toISOString();
    for (const { id, def } of updates) {
      const existing = current.find((l) => l.defaultListId === id);
      if (existing) {
        existing.name = def.name;
        existing.nativeLanguage = def.nativeLanguage;
        existing.targetLanguage = def.targetLanguage;
        if (def.showTranslation !== undefined) existing.showTranslation = def.showTranslation;
        existing.phrases = mergeDefaultListPhrases(existing.phrases, def.phrases);
        existing.updatedAt = now;
        await storage.saveList(existing);
      } else {
        await storage.saveList({
          id: generateId(),
          defaultListId: id,
          name: def.name,
          nativeLanguage: def.nativeLanguage,
          targetLanguage: def.targetLanguage,
          showTranslation: def.showTranslation,
          phrases: def.phrases.map((p) => ({
            id: generateId(),
            nativeSentence: p.nativeSentence,
            acceptedTranslations: p.acceptedTranslations,
            ...(p.properNouns?.length ? { properNouns: p.properNouns } : {}),
          })),
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await defaultLists.markApplied(updates.map(({ id, updatedAt }) => ({ id, updatedAt })));
    await refresh();
    return updates.length;
  }, [defaultLists, storage, refresh]);

  /** Public, user-triggered version of syncDefaultLists — always bypasses the cache. */
  const checkForListUpdates = useCallback(() => syncDefaultLists(true), [syncDefaultLists]);

  useEffect(() => {
    (async () => {
      const seeded = await AsyncStorage.getItem(SEEDED_KEY);
      if (!seeded) {
        // Only seed a truly empty install — a user who already created lists
        // before this feature shipped shouldn't get four surprise lists
        const existing = await storage.getLists();
        if (existing.length === 0) {
          const now = new Date().toISOString();
          for (const { id, def } of DEFAULT_LISTS) {
            await storage.saveList({
              id: generateId(),
              defaultListId: id,
              name: def.name,
              nativeLanguage: def.nativeLanguage,
              targetLanguage: def.targetLanguage,
              showTranslation: def.showTranslation,
              phrases: def.phrases.map((p) => ({
                id: generateId(),
                nativeSentence: p.nativeSentence,
                acceptedTranslations: p.acceptedTranslations,
                ...(p.properNouns?.length ? { properNouns: p.properNouns } : {}),
              })),
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        await AsyncStorage.setItem(SEEDED_KEY, "1");
      }
      await refresh();
      // Bundled ids were never marked "applied", so this also picks up
      // fresher content for them on the very first run that has internet —
      // no need to wait for a later sync cycle.
      await syncDefaultLists();
    })();
  }, [refresh, storage, syncDefaultLists]);

  const createList = useCallback(
    async (name: string, nativeLanguage: string, targetLanguage: string) => {
      const now = new Date().toISOString();
      const newList: PhraseList = {
        id: generateId(),
        name,
        nativeLanguage,
        targetLanguage,
        phrases: [],
        createdAt: now,
        updatedAt: now,
      };
      await storage.saveList(newList);
      await refresh();
      return newList;
    },
    [storage, refresh]
  );

  const deleteList = useCallback(
    async (id: string) => {
      const list = lists.find((l) => l.id === id);
      await storage.deleteList(id);
      await refresh();
      // Best-effort: a deleted list's cached audio is no longer reachable to
      // clean up later, so it must happen now
      if (list) await forgetPersistedListAudio(speech, list);
    },
    [storage, refresh, lists, speech]
  );

  const addPhrase = useCallback(
    async (
      listId: string,
      nativeSentence: string,
      acceptedTranslations: string[],
      properNouns?: string[]
    ) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      const phrase: Phrase = {
        id: generateId(),
        nativeSentence,
        acceptedTranslations,
        ...(properNouns?.length ? { properNouns } : {}),
      };

      list.phrases.push(phrase);
      list.updatedAt = new Date().toISOString();
      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const updatePhrase = useCallback(
    async (
      listId: string,
      phraseId: string,
      updates: Partial<Pick<Phrase, "nativeSentence" | "acceptedTranslations">>
    ) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      const phraseIndex = list.phrases.findIndex((p) => p.id === phraseId);
      if (phraseIndex < 0) return;

      list.phrases[phraseIndex] = { ...list.phrases[phraseIndex], ...updates };
      list.updatedAt = new Date().toISOString();
      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const deletePhrase = useCallback(
    async (listId: string, phraseId: string) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      list.phrases = list.phrases.filter((p) => p.id !== phraseId);
      list.updatedAt = new Date().toISOString();
      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const setListPreference = useCallback(
    async (listId: string, updates: Partial<Pick<PhraseList, "showTranslation">>) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      // `updatedAt` deliberately untouched: preferences aren't content edits
      Object.assign(list, updates);
      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const addUserTranslation = useCallback(
    async (listId: string, phraseId: string, translation: string) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      const phrase = list.phrases.find((p) => p.id === phraseId);
      if (!phrase) return;

      // Add to acceptedTranslations so it validates in future sessions
      if (!phrase.acceptedTranslations.includes(translation)) {
        phrase.acceptedTranslations.push(translation);
      }

      // Also track it as user-added
      if (!phrase.userTranslations) {
        phrase.userTranslations = [];
      }
      if (!phrase.userTranslations.some((t) => t.text === translation)) {
        phrase.userTranslations.push({ text: translation, userAdded: true });
      }

      list.updatedAt = new Date().toISOString();
      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const recordPhraseResult = useCallback(
    async (listId: string, phraseId: string, isCorrect: boolean) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      const phrase = list.phrases.find((p) => p.id === phraseId);
      if (!phrase) return;

      if (!phrase.stats) {
        phrase.stats = { correctCount: 0, incorrectCount: 0 };
      }

      if (isCorrect) {
        phrase.stats.correctCount++;
      } else {
        phrase.stats.incorrectCount++;
      }

      // Recording a result is the signal that the list was practiced.
      // `updatedAt` is deliberately left alone: it tracks content edits.
      list.lastPracticedAt = new Date().toISOString();

      await storage.saveList(list);
      await refresh();
    },
    [storage, refresh]
  );

  const value: PhraseListsContextValue = {
    lists,
    loading,
    refresh,
    createList,
    deleteList,
    addPhrase,
    updatePhrase,
    deletePhrase,
    setListPreference,
    addUserTranslation,
    recordPhraseResult,
    checkForListUpdates,
  };

  return React.createElement(PhraseListsContext.Provider, { value }, children);
}

/**
 * Hook to access the shared phrase lists state.
 * Must be used within a PhraseListsProvider.
 */
export function usePhraseLists(): PhraseListsContextValue {
  const ctx = useContext(PhraseListsContext);
  if (!ctx) {
    throw new Error("usePhraseLists must be used within a PhraseListsProvider");
  }
  return ctx;
}
