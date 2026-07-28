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
  /**
   * Advertiser name when this phrase is a sponsored ad injected into the
   * session. Sponsored phrases are not part of the list and are excluded
   * from scoring and persisted stats.
   */
  sponsoredBy?: string;
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
  /**
   * Show the correct translation during practice (learning mode for users
   * starting from zero). Persisted per list.
   */
  showTranslation?: boolean;
}

// ===== Sponsored Ads =====

/**
 * User proficiency levels, from lowest to highest. Array order defines the
 * comparison used to pick ads: a user only sees ads at or below their level.
 */
export const PROFICIENCY_LEVELS = ["none", "beginner", "intermediate", "advanced"] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  none: "No sé nada del otro idioma",
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

/** A promotional phrase practiced like any other, provided by an advertiser. */
export interface AdPhrase {
  id: string;
  /** Sentence in the list's native language, shown as the prompt */
  text: string;
  acceptedTranslations: string[];
  level: ProficiencyLevel;
  /**
   * 1-based fixed position within the practice session. When absent the ad
   * is inserted at a random position.
   */
  order?: number;
}

export interface AdCampaign {
  id: string;
  advertiser: string;
  active: boolean;
  nativeLanguage: string;
  targetLanguage: string;
  phrases: AdPhrase[];
}

/** Shape of the remote registry JSON consumed by the app. */
export interface AdRegistry {
  version: number;
  updatedAt: string;
  campaigns: AdCampaign[];
}

export interface SessionAd {
  advertiser: string;
  phrase: AdPhrase;
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

export interface AdsService {
  /**
   * Pick one ad for a practice session, or null when none applies (no
   * matching campaign, registry unreachable and no cache, etc). Never throws
   * and never blocks the session for long — failures resolve to null.
   */
  getSessionAd(params: {
    level: ProficiencyLevel;
    nativeLanguage: string;
    targetLanguage: string;
  }): Promise<SessionAd | null>;
}

/** Load status of a neural voice, as shown in Settings. */
export type VoiceEngineStatus = "idle" | "loading" | "ready" | "failed";

export interface SpeechService {
  speak(text: string, language: string): Promise<void>;
  stop(): void;
  isSpeaking(): Promise<boolean>;
  /**
   * Speak a fixed app message (feedback, intro) at a constant reference speed,
   * independent of the user's chosen playback speed. Falls back to speak()
   * when not supported. Optional.
   */
  speakPinned?(text: string, language: string): Promise<void>;
  /** Pre-generate audio for a list of texts in background. Optional — noop if not supported. */
  pregenerate?(texts: string[], language: string): void;
  /** Pre-generate and persist first phrases permanently. Optional. */
  pregeneratePersistent?(texts: string[], language: string, onProgress?: (current: number, total: number, text: string, status: "checking" | "generating" | "cached") => void): Promise<void>;
  /**
   * Pre-generate and permanently pin fixed app messages (feedback, intro) at the
   * constant reference speed. Immune to clearSessionCache/clearAllCache. Optional.
   */
  pregeneratePinned?(texts: string[], language: string): Promise<void>;
  /**
   * Abandon queued session warmups (pregenerate batches not yet generated), so
   * a previous screen's batch doesn't delay the current screen's audio. Optional.
   */
  cancelWarmups?(): void;
  /** Evict specific texts from the in-memory session cache. No-op for pinned/persisted entries. Optional. */
  forget?(texts: string[], language: string): void;
  /** Remove specific texts from persisted storage too (e.g. a deleted list). Optional. */
  forgetPersisted?(texts: string[], language: string): Promise<void>;
  /** Clear session (non-persistent) audio cache. Optional. */
  clearSessionCache?(): void;
  /** Clear cache affected by a speed change (memory + IndexedDB). Optional. */
  clearAllCache?(): Promise<void>;
  /** Check if at least one neural voice finished loading. Optional. */
  isModelReady?(): boolean;
  /** Per-voice load status, for display in Settings. Optional. */
  getEngineStatuses?(): { english: VoiceEngineStatus; spanish: VoiceEngineStatus };
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
