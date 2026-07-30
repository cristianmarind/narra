import * as ExpoSpeech from "expo-speech";
import type { SpeechService } from "@/types";
import { toDeviceLocale } from "../utils/routing";

/**
 * expo-speech based implementation of SpeechService.
 * speak() returns a Promise that resolves only when the utterance finishes.
 */
export function createExpoSpeechService(): SpeechService {
  return {
    speak(text: string, language: string): Promise<void> {
      return new Promise<void>((resolve) => {
        ExpoSpeech.speak(text, {
          language: toDeviceLocale(language),
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        });
      });
    },

    stop() {
      ExpoSpeech.stop();
    },

    async isSpeaking() {
      return ExpoSpeech.isSpeakingAsync();
    },
  };
}
