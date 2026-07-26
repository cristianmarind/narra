/**
 * Speech factory that selects the right implementation per platform.
 * - Web browser: Kokoro AI via Web Worker (natural English) + Web Speech API (other languages)
 * - Native: expo-speech
 * - SSR: expo-speech (won't actually be called during render)
 */
import { Platform } from "react-native";
import type { SpeechService } from "@/types";
import { createExpoSpeechService } from "./speech";
import { createKokoroWebSpeechService } from "./speech-kokoro-web";

export function createDefaultSpeechService(getSpeed?: () => number): SpeechService {
  if (Platform.OS === "web" && typeof window !== "undefined" && typeof Worker !== "undefined") {
    return createKokoroWebSpeechService(getSpeed);
  }
  return createExpoSpeechService();
}
