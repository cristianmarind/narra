/**
 * Text-to-speech.
 *
 * `createDefaultSpeechService` is the entry point: it picks the implementation
 * that fits the platform. The concrete engines are exported too so they can be
 * injected directly in tests or swapped from the provider.
 */

export { createDefaultSpeechService } from "./factory";

export { createExpoSpeechService } from "./expo-speech";
export { createExecuTorchSpeechService } from "./executorch";
export { createNeuralWebSpeechService } from "./neural-web";
export type { NeuralWebSpeechService } from "./neural-web";

export { speakWithWebSpeechAPI, getSelectedVoiceName } from "./web-fallback";
