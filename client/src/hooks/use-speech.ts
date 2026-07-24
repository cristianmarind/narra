import { useCallback, useState } from "react";
import { useServices } from "@/services";

interface UseSpeechReturn {
  speaking: boolean;
  speak: (text: string, language: string) => Promise<void>;
  stop: () => void;
}

/**
 * Hook wrapping the injected SpeechService for TTS playback.
 * The returned speak() resolves only after the utterance finishes speaking.
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
        setSpeaking(false);
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
