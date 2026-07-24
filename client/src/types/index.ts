// ===== Domain Models =====

export interface Phrase {
  id: string;
  nativeSentence: string;
  acceptedTranslations: string[];
}

export interface PhraseList {
  id: string;
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
}

// ===== Practice Session =====

export interface PhraseResult {
  phraseId: string;
  userAnswer: string;
  isCorrect: boolean;
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
}
