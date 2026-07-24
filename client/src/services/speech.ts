import * as ExpoSpeech from "expo-speech";
import type { SpeechService } from "@/types";

/**
 * expo-speech based implementation of SpeechService.
 */
export function createExpoSpeechService(): SpeechService {
  return {
    async speak(text: string, language: string) {
      await ExpoSpeech.speak(text, { language });
    },

    stop() {
      ExpoSpeech.stop();
    },

    async isSpeaking() {
      return ExpoSpeech.isSpeakingAsync();
    },
  };
}
