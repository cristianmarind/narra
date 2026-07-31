import {
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import type { SpeechRecognitionOptions, SpeechRecognitionService } from "@/types";

/**
 * expo-speech-recognition based implementation of SpeechRecognitionService.
 * Uses native speech recognizers on iOS/Android and Web Speech API on web.
 */
export function createExpoSpeechRecognitionService(): SpeechRecognitionService {
  return {
    async requestPermissions() {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    },

    start(language: string, options?: SpeechRecognitionOptions) {
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: false,
        // Biases native recognizers toward the expected vocabulary (iOS
        // contextualStrings, Android 13+ biasing strings). Web ignores it.
        contextualStrings: options?.contextualStrings,
      });
    },

    stop() {
      ExpoSpeechRecognitionModule.stop();
    },

    abort() {
      ExpoSpeechRecognitionModule.abort();
    },

    async isAvailable() {
      return ExpoSpeechRecognitionModule.isRecognitionAvailable();
    },
  };
}
