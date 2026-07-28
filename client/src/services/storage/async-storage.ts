import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PhraseList, StorageService } from "@/types";

const LISTS_KEY = "phrase_lists";

/**
 * AsyncStorage-based implementation of StorageService.
 * Swap this out for an API-backed implementation when the backend is ready.
 */
export function createAsyncStorageService(): StorageService {
  async function getAllLists(): Promise<PhraseList[]> {
    const raw = await AsyncStorage.getItem(LISTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PhraseList[];
  }

  async function persistLists(lists: PhraseList[]): Promise<void> {
    await AsyncStorage.setItem(LISTS_KEY, JSON.stringify(lists));
  }

  return {
    async getLists() {
      return getAllLists();
    },

    async getListById(id: string) {
      const lists = await getAllLists();
      return lists.find((l) => l.id === id) ?? null;
    },

    async saveList(list: PhraseList) {
      const lists = await getAllLists();
      const index = lists.findIndex((l) => l.id === list.id);
      if (index >= 0) {
        lists[index] = list;
      } else {
        lists.push(list);
      }
      await persistLists(lists);
    },

    async deleteList(id: string) {
      const lists = await getAllLists();
      await persistLists(lists.filter((l) => l.id !== id));
    },
  };
}
