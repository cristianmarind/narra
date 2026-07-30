/**
 * Text-to-speech.
 *
 * `createDefaultSpeechService` is the entry point: it picks the implementation
 * that fits the platform. The concrete engines are exported too so they can be
 * injected directly in tests or swapped from the provider.
 */

export { createDefaultSpeechService } from "./utils/factory";

export { createExpoSpeechService } from "./speeches/default-speech";
export { createNeuralWebSpeechService } from "./speeches/speech-web";
export type { NeuralWebSpeechService } from "./speeches/speech-web";
export { createNeuralNativeSpeechService, isNeuralNativeAvailable } from "./speeches/speech-native";

export { createSpeechCore } from "./core";
export type { SpeechCoreService, SpeechCoreDeps, Engine, AudioStore, Player, Waveform } from "./core";

export { speakWithWebSpeechAPI, getSelectedVoiceName } from "./utils/speech-web-fallback";
