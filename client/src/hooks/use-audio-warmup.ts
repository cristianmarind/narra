import { useEffect, useState } from "react";

import { fixedPromptsFor } from "@/constants/speech-prompts";
import { useServices } from "@/services";
import type { PhraseList } from "@/types";

/**
 * Warms the audio that's always needed as soon as the lobby has its lists:
 * the app's fixed phrases (pinned, permanent) first, then the first phrase
 * of each list (persisted, but may be regenerated on a speed change).
 *
 * Returns a non-blocking status message for a progress banner, or null when
 * idle/done.
 */
export function useAudioWarmup(lists: PhraseList[], loading: boolean): string | null {
  const { speech } = useServices();
  const [warmupStatus, setWarmupStatus] = useState<string | null>(null);

  useEffect(() => {
    if (loading || lists.length === 0) return;

    // Fixed app phrases ("Correcto", "Incorrecto", the intro) — pinned so they
    // survive a speed change, and always available no matter which list opens.
    // No progress banner: these are three short phrases per language, and the
    // per-list loop below already reports progress for the bulk of the work.
    if (speech.pregeneratePinned) {
      const byNativeLang = new Map<string, Set<string>>();
      for (const list of lists) {
        const prompts = byNativeLang.get(list.nativeLanguage) ?? new Set<string>();
        for (const prompt of fixedPromptsFor(list.targetLanguage)) prompts.add(prompt);
        byNativeLang.set(list.nativeLanguage, prompts);
      }
      for (const [language, prompts] of byNativeLang) {
        speech.pregeneratePinned(Array.from(prompts), language);
      }
    }

    if (!speech.pregeneratePersistent) return;

    // { text, language, label } — label is what the warmup banner shows
    const queue: { text: string; language: string; label: string }[] = [];
    const seen = new Set<string>();

    const enqueue = (text: string, language: string, label: string) => {
      if (!text) return;
      const key = `${language}::${text}`;
      if (seen.has(key)) return;
      seen.add(key);
      queue.push({ text, language, label });
    };

    for (const list of lists) {
      if (list.phrases.length === 0) continue;
      const first = list.phrases[0];

      // Target language: the expected answer, read back during feedback
      enqueue(first.acceptedTranslations[0], list.targetLanguage, list.name);

      // Native language: the prompt sentence, read at the start of every round.
      // Warming it here also triggers the Spanish model download up front, so the
      // first practice round doesn't stall waiting for it.
      enqueue(first.nativeSentence, list.nativeLanguage, list.name);
    }

    if (queue.length === 0) return;

    // Batch per language, preserving the order above
    const byLang = new Map<string, { texts: string[]; labels: string[] }>();
    for (const item of queue) {
      const existing = byLang.get(item.language) ?? { texts: [], labels: [] };
      existing.texts.push(item.text);
      existing.labels.push(item.label);
      byLang.set(item.language, existing);
    }

    (async () => {
      for (const [language, { texts, labels }] of byLang) {
        await speech.pregeneratePersistent!(texts, language, (current, total, text, status) => {
          const label = labels[current - 1];
          if (status === "generating") {
            setWarmupStatus(`Generando audio: "${label}" (${current}/${total})`);
          } else if (status === "checking") {
            setWarmupStatus(`Verificando cache: "${label}" (${current}/${total})`);
          }
          // Don't show anything for "cached" — it's instant
        });
      }
      setWarmupStatus(null);
    })();
  }, [loading, lists.length]);

  return warmupStatus;
}
