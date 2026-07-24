import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useServices } from "@/services";
import type { Phrase, PhraseList } from "@/types";
import { generateId } from "@/utils";

interface PhraseListsContextValue {
  lists: PhraseList[];
  loading: boolean;
  refresh: () => Promise<void>;
  createList: (name: string, nativeLanguage: string, targetLanguage: string) => Promise<PhraseList>;
  deleteList: (id: string) => Promise<void>;
  addPhrase: (listId: string, nativeSentence: string, acceptedTranslations: string[]) => Promise<void>;
  updatePhrase: (listId: string, phraseId: string, updates: Partial<Pick<Phrase, "nativeSentence" | "acceptedTranslations">>) => Promise<void>;
  deletePhrase: (listId: string, phraseId: string) => Promise<void>;
}

const PhraseListsContext = createContext<PhraseListsContextValue | null>(null);

/**
 * Provider that holds the single source of truth for phrase lists.
 * Must wrap all screens that use usePhraseLists().
 */
export function PhraseListsProvider({ children }: { children: React.ReactNode }) {
  const { storage } = useServices();
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
    refresh();
  }, [refresh]);

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
      await storage.deleteList(id);
      await refresh();
    },
    [storage, refresh]
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

  const value: PhraseListsContextValue = {
    lists,
    loading,
    refresh,
    createList,
    deleteList,
    addPhrase,
    updatePhrase,
    deletePhrase,
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
