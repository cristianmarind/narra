import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_LISTS } from "@/data/default-lists";
import { useServices } from "@/services";
import type {
  AcceptedTranslation,
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

/** Only the first phrase is ever persisted (see the lobby's warmup effect) */
async function forgetPersistedListAudio(speech: SpeechService, list: PhraseList): Promise<void> {
  if (!speech.forgetPersisted || list.phrases.length === 0) return;
  const first = list.phrases[0];
  await Promise.all([
    speech.forgetPersisted([first.acceptedTranslations[0]], list.targetLanguage),
    speech.forgetPersisted([first.nativeSentence], list.nativeLanguage),
  ]);
}

interface PhraseListsContextValue {
  lists: PhraseList[];
  loading: boolean;
  refresh: () => Promise<void>;
  createList: (name: string, nativeLanguage: string, targetLanguage: string) => Promise<PhraseList>;
  deleteList: (id: string) => Promise<void>;
  addPhrase: (listId: string, nativeSentence: string, acceptedTranslations: string[]) => Promise<void>;
  updatePhrase: (listId: string, phraseId: string, updates: Partial<Pick<Phrase, "nativeSentence" | "acceptedTranslations">>) => Promise<void>;
  deletePhrase: (listId: string, phraseId: string) => Promise<void>;
  /** Persist a per-list practice preference (doesn't touch updatedAt) */
  setListPreference: (listId: string, updates: Partial<Pick<PhraseList, "showTranslation">>) => Promise<void>;
  /** Add a user-submitted translation to a phrase (flagged as userAdded) */
  addUserTranslation: (listId: string, phraseId: string, translation: string) => Promise<void>;
  /** Increment correct/incorrect stats for a phrase */
  recordPhraseResult: (listId: string, phraseId: string, isCorrect: boolean) => Promise<void>;
}

const PhraseListsContext = createContext<PhraseListsContextValue | null>(null);

/**
 * Provider that holds the single source of truth for phrase lists.
 * Must wrap all screens that use usePhraseLists().
 */
export function PhraseListsProvider({ children }: { children: React.ReactNode }) {
  const { storage, speech } = useServices();
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

  useEffect(() => {
    (async () => {
      const seeded = await AsyncStorage.getItem(SEEDED_KEY);
      if (!seeded) {
        // Only seed a truly empty install — a user who already created lists
        // before this feature shipped shouldn't get four surprise lists
        const existing = await storage.getLists();
        if (existing.length === 0) {
          const now = new Date().toISOString();
          for (const def of DEFAULT_LISTS) {
            await storage.saveList({
              id: generateId(),
              name: def.name,
              nativeLanguage: def.nativeLanguage,
              targetLanguage: def.targetLanguage,
              showTranslation: def.showTranslation,
              phrases: def.phrases.map((p) => ({
                id: generateId(),
                nativeSentence: p.nativeSentence,
                acceptedTranslations: p.acceptedTranslations,
              })),
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        await AsyncStorage.setItem(SEEDED_KEY, "1");
      }
      await refresh();
    })();
  }, [refresh, storage]);

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
    async (listId: string, nativeSentence: string, acceptedTranslations: string[]) => {
      const list = await storage.getListById(listId);
      if (!list) return;

      const phrase: Phrase = {
        id: generateId(),
        nativeSentence,
        acceptedTranslations,
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
