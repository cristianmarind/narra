// ===== Domain Models =====

export interface AcceptedTranslation {
  text: string;
  /** true if this translation was added by the user during practice (not from the original list) */
  userAdded?: boolean;
}

export interface PhraseStats {
  correctCount: number;
  incorrectCount: number;
}

export interface Phrase {
  id: string;
  nativeSentence: string;
  acceptedTranslations: string[];
  /** User-added translations during practice sessions */
  userTranslations?: AcceptedTranslation[];
  /** Per-phrase accuracy stats */
  stats?: PhraseStats;
}

export interface PhraseList {
  id: string;
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
  /**
   * When the list was last practiced. Distinct from `updatedAt`, which tracks
   * edits to the list's content. Absent on lists never practiced.
   */
  lastPracticedAt?: string;
}

// ===== Practice Session =====

export interface PhraseResult {
  phraseId: string;
  userAnswer: string;
  isCorrect: boolean;
  /** true if the user overrode the result and marked it as correct */
  overridden?: boolean;
}

export interface PracticeSession {
  id: string;
  listId: string;
  currentIndex: number;
  results: PhraseResult[];
  startedAt: string;
  completedAt?: string;
}

// ===== Service Contracts =====

export interface StorageService {
  getLists(): Promise<PhraseList[]>;
  getListById(id: string): Promise<PhraseList | null>;
  saveList(list: PhraseList): Promise<void>;
  deleteList(id: string): Promise<void>;
}

export interface SpeechService {
  speak(text: string, language: string): Promise<void>;
  stop(): void;
  isSpeaking(): Promise<boolean>;
  /** Pre-generate audio for a list of texts in background. Optional — noop if not supported. */
  pregenerate?(texts: string[], language: string): void;
  /** Pre-generate and persist first phrases permanently. Optional. */
  pregeneratePersistent?(texts: string[], language: string, onProgress?: (current: number, total: number, text: string, status: "checking" | "generating" | "cached") => void): Promise<void>;
  /** Clear session (non-persistent) audio cache. Optional. */
  clearSessionCache?(): void;
  /** Clear ALL cache (memory + IndexedDB). Used when settings change. Optional. */
  clearAllCache?(): Promise<void>;
  /** Check if model is ready. Optional. */
  isModelReady?(): boolean;
}

export interface SpeechRecognitionService {
  /** Request microphone/recognition permissions. Returns true if granted. */
  requestPermissions(): Promise<boolean>;
  /** Start listening for speech in the given language (e.g. "en", "es"). */
  start(language: string): void;
  /** Stop listening and finalize the result. */
  stop(): void;
  /** Abort listening without finalizing. */
  abort(): void;
  /** Whether recognition is available on this platform. */
  isAvailable(): Promise<boolean>;
}
