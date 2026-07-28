import type { PhraseList } from "@/types";

export interface ListStats {
  correct: number;
  incorrect: number;
  attempts: number;
  /** Percentage 0-100, or null when the list has never been practiced */
  accuracy: number | null;
}

/**
 * Aggregate per-phrase stats into list-level totals.
 * Shared by the home cards and the list detail screen so both agree.
 */
export function getListStats(list: PhraseList): ListStats {
  let correct = 0;
  let incorrect = 0;

  for (const phrase of list.phrases) {
    correct += phrase.stats?.correctCount ?? 0;
    incorrect += phrase.stats?.incorrectCount ?? 0;
  }

  const attempts = correct + incorrect;

  return {
    correct,
    incorrect,
    attempts,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : null,
  };
}
