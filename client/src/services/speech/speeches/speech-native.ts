/**
 * Neural TTS for native (Android/iOS): composes the platform-agnostic speech
 * core (see core.ts for the caching/warmup semantics) with native parts.
 *
 * - English → Kokoro via react-native-executorch (24 kHz), on-device
 * - Spanish → Kokoro via react-native-executorch (24 kHz), on-device
 * - Anything else → expo-speech (system voice)
 * - Persistence → expo-file-system (<document>/tts-cache/)
 * - Playback → react-native-audio-api
 *
 * One engine instance per language so getEngineStatuses reports each voice's
 * load state independently (each Kokoro voice bundle downloads separately).
 *
 * Unlike web, BOTH native engines bake speed into generation, so a speed
 * change purges the whole non-pinned cache (see clearAllCache in core.ts).
 *
 * The executorch/audio-api dependencies require a custom dev client build and
 * are optional: when absent, isNeuralNativeAvailable() is false and the
 * factory falls back to the plain expo-speech service.
 */

import * as ExpoSpeech from "expo-speech";

import { createSpeechCore, type Route, type SpeechCoreService } from "../core";
import {
  createExecuTorchEngine,
  englishKokoroModel,
  isExecuTorchAvailable,
  spanishKokoroModel,
} from "../engines/native/executorch-engine";
import {
  createNativeAudioPlayer,
  isNativeAudioPlayerAvailable,
} from "../players/native/native-audio-player";
import { createFileSystemStore } from "../stores/native/file-system-store";
import { isEnglish, isSpanish, normalizeLanguage, toDeviceLocale } from "../utils/routing";

/**
 * Native v1 routes every English variant to the en_us voice (no en-gb split
 * like web's bf_emma — one model download per language is enough on device).
 */
function routeLanguage(language: string): Route | null {
  const { lang, base } = normalizeLanguage(language);

  if (isEnglish(lang, base)) {
    return { engine: "kokoro_en", voice: "kokoro-en_us-heart" };
  }

  if (isSpanish(lang, base)) {
    return { engine: "kokoro_es", voice: "kokoro-es" };
  }

  return null;
}

const VOICE_ENGINE: Record<string, string> = {
  "kokoro-en_us-heart": "kokoro_en",
  "kokoro-es": "kokoro_es",
};

export function isNeuralNativeAvailable(): boolean {
  return isExecuTorchAvailable() && isNativeAudioPlayerAvailable();
}

export function createNeuralNativeSpeechService(
  getSpeed: () => number = () => 0.85
): SpeechCoreService {
  const engines = {
    kokoro_en: createExecuTorchEngine("kokoro_en", englishKokoroModel),
    kokoro_es: createExecuTorchEngine("kokoro_es", spanishKokoroModel),
  };

  const core = createSpeechCore({
    engines,
    routeLanguage,
    voiceEngine: VOICE_ENGINE,
    store: createFileSystemStore(),
    player: createNativeAudioPlayer(),
    // Unlike the plain expo-speech service, the fallback honors the rate so it
    // mirrors web-fallback's behavior (pinned messages still speak at 1.0)
    fallbackSpeak: (text, language, rate) =>
      new Promise<void>((resolve) => {
        ExpoSpeech.speak(text, {
          language: toDeviceLocale(language),
          rate: Math.min(Math.max(rate, 0.5), 2),
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        });
      }),
    fallbackStop: () => ExpoSpeech.stop(),
    statusEngines: { english: "kokoro_en", spanish: "kokoro_es" },
    getSpeed,
  });

  // Mirror web's eager policy: preload English up front (it's the practice
  // target language), let Spanish load on first use
  setTimeout(() => engines.kokoro_en.preload(), 0);

  return core;
}
