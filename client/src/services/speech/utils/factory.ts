/**
 * Speech factory that selects the right implementation per platform.
 * - Web browser: neural TTS in workers (Kokoro for English, Piper for Spanish),
 *   with the Web Speech API as fallback for other languages
 * - Native with a dev client build: on-device neural TTS (Kokoro via
 *   react-native-executorch for English and Spanish), with expo-speech as
 *   fallback for other languages
 * - Native without the optional deps (e.g. Expo Go), SSR: expo-speech
 */
import { Platform } from "react-native";
import type { SpeechService } from "@/types";
import { createExpoSpeechService } from "../speeches/default-speech";
import { createNeuralWebSpeechService } from "../speeches/speech-web";
import { createNeuralNativeSpeechService, isNeuralNativeAvailable } from "../speeches/speech-native";

export function createDefaultSpeechService(getSpeed?: () => number): SpeechService {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof Worker !== "undefined") {
    return createNeuralWebSpeechService(getSpeed);
  }
  if (Platform.OS !== "web" && isNeuralNativeAvailable()) {
    return createNeuralNativeSpeechService(getSpeed);
  }
  return createExpoSpeechService();
}
