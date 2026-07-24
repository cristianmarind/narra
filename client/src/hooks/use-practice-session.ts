import { useCallback, useMemo, useState } from "react";
import type { Phrase, PhraseResult, PracticeSession } from "@/types";
import { generateId, validateAnswer } from "@/utils";

type SessionStatus = "idle" | "active" | "completed";

interface UsePracticeSessionReturn {
  session: PracticeSession | null;
  status: SessionStatus;
  currentPhrase: Phrase | null;
  progress: { current: number; total: number };
  results: PhraseResult[];
  score: { correct: number; incorrect: number; percentage: number };
  start: (listId: string, phrases: Phrase[]) => void;
  submitAnswer: (answer: string) => PhraseResult;
  /** Override the last result for a given phraseId as correct */
  overrideAsCorrect: (phraseId: string) => void;
  next: () => void;
  reset: () => void;
}

/**
 * Hook that manages the state machine for a practice session.
 * Handles phrase progression, answer validation, and scoring.
 */
export function usePracticeSession(): UsePracticeSessionReturn {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [lastResult, setLastResult] = useState<PhraseResult | null>(null);

  const currentPhrase = useMemo(() => {
    if (!session || status !== "active") return null;
    return phrases[session.currentIndex] ?? null;
  }, [session, phrases, status]);

  const progress = useMemo(() => {
    if (!session) return { current: 0, total: 0 };
    return { current: session.currentIndex + 1, total: phrases.length };
  }, [session, phrases]);

  const score = useMemo(() => {
    if (!session) return { correct: 0, incorrect: 0, percentage: 0 };
    const correct = session.results.filter((r) => r.isCorrect).length;
    const incorrect = session.results.length - correct;
    const percentage = session.results.length > 0
      ? Math.round((correct / session.results.length) * 100)
      : 0;
    return { correct, incorrect, percentage };
  }, [session]);

  const start = useCallback((listId: string, sessionPhrases: Phrase[]) => {
    const newSession: PracticeSession = {
      id: generateId(),
      listId,
      currentIndex: 0,
      results: [],
      startedAt: new Date().toISOString(),
    };
    setSession(newSession);
    setPhrases(sessionPhrases);
    setStatus("active");
    setLastResult(null);
  }, []);

  const submitAnswer = useCallback(
    (answer: string): PhraseResult => {
      if (!session || !currentPhrase) {
        throw new Error("No active session or phrase");
      }

      const isCorrect = validateAnswer(answer, currentPhrase.acceptedTranslations);
      const result: PhraseResult = {
        phraseId: currentPhrase.id,
        userAnswer: answer,
        isCorrect,
      };

      setSession((prev) => {
        if (!prev) return prev;
        return { ...prev, results: [...prev.results, result] };
      });
      setLastResult(result);

      return result;
    },
    [session, currentPhrase]
  );

  const overrideAsCorrect = useCallback((phraseId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updatedResults = prev.results.map((r) =>
        r.phraseId === phraseId && !r.isCorrect
          ? { ...r, isCorrect: true, overridden: true }
          : r
      );
      return { ...prev, results: updatedResults };
    });
  }, []);

  const next = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.currentIndex + 1;

      if (nextIndex >= phrases.length) {
        setStatus("completed");
        return { ...prev, currentIndex: nextIndex, completedAt: new Date().toISOString() };
      }

      return { ...prev, currentIndex: nextIndex };
    });
    setLastResult(null);
  }, [phrases.length]);

  const reset = useCallback(() => {
    setSession(null);
    setPhrases([]);
    setStatus("idle");
    setLastResult(null);
  }, []);

  return {
    session,
    status,
    currentPhrase,
    progress,
    results: session?.results ?? [],
    score,
    start,
    submitAnswer,
    overrideAsCorrect,
    next,
    reset,
  };
}
