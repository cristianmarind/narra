/**
 * Speech factory that selects the right implementation per platform.
 * - Web browser: neural TTS in workers (Kokoro for English, Piper for Spanish),
 *   with the Web Speech API as fallback for other languages
 * - Native: expo-speech
 * - SSR: expo-speech (won't actually be called during render)
 */
import { Platform } from "react-native";
import type { SpeechService } from "@/types";
import { createExpoSpeechService } from "./expo-speech";
import { createNeuralWebSpeechService } from "./neural-web";

export function createDefaultSpeechService(getSpeed?: () => number): SpeechService {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof Worker !== "undefined") {
    return createNeuralWebSpeechService(getSpeed);
  }
  return createExpoSpeechService();
}
