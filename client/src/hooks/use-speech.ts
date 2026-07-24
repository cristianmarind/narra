import { useCallback, useState } from "react";
import { useServices } from "@/services";

interface UseSpeechReturn {
  speaking: boolean;
  speak: (text: string, language: string) => Promise<void>;
  stop: () => void;
}

/**
 * Hook wrapping the injected SpeechService for TTS playback.
 */
export function useSpeech(): UseSpeechReturn {
  const { speech } = useServices();
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    async (text: string, language: string) => {
      setSpeaking(true);
      try {
        await speech.speak(text, language);
      } finally {
        // expo-speech.speak resolves immediately on some platforms,
        // poll briefly or just mark as done
        const isBusy = await speech.isSpeaking();
        if (!isBusy) {
          setSpeaking(false);
        } else {
          // Poll until done
          const interval = setInterval(async () => {
            const still = await speech.isSpeaking();
            if (!still) {
              setSpeaking(false);
              clearInterval(interval);
            }
          }, 300);
        }
      }
    },
    [speech]
  );

  const stop = useCallback(() => {
    speech.stop();
    setSpeaking(false);
  }, [speech]);

  return { speaking, speak, stop };
}
