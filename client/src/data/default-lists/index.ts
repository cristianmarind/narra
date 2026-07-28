import lista1 from "./lista-1.json";
import lista2 from "./lista-2.json";
import lista3 from "./lista-3.json";
import lista4 from "./lista-4.json";

/** Same shape as the import-JSON schema documented in the README. */
export interface DefaultListDef {
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  /** Enable learning mode (show the correct translation) when seeding */
  showTranslation?: boolean;
  phrases: {
    nativeSentence: string;
    acceptedTranslations: string[];
  }[];
}

/**
 * Lists seeded on first launch so the app never starts empty.
 * Ordered from zero knowledge to advanced.
 */
export const DEFAULT_LISTS: DefaultListDef[] = [lista1, lista2, lista3, lista4];
