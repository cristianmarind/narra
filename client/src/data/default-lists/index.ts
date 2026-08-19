import lista1 from "./lista-1.json";
import lista2 from "./lista-2.json";
import lista3 from "./lista-3.json";
import lista4 from "./lista-4.json";
import lista5 from "./lista-5.json";

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
    /** Names/Spanish words the recognizer can't transcribe faithfully; always accepted */
    properNouns?: string[];
  }[];
}

/**
 * Lists seeded on first launch so the app never starts empty.
 * Ordered from zero knowledge to advanced.
 */
export const DEFAULT_LISTS: DefaultListDef[] = [lista5, lista1, lista2, lista3, lista4];
