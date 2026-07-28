/**
 * Alternative SpeechService implementation using react-native-executorch (Kokoro TTS).
 * Runs AI-powered TTS on-device for natural-sounding speech without network.
 *
 * Requirements (install before using):
 *   npm install react-native-executorch react-native-executorch-expo-resource-fetcher react-native-audio-api
 *   Add to app entry: initExecutorch({ resourceFetcher: ExpoResourceFetcher })
 *
 * First run downloads the Kokoro model (~80MB), subsequent runs use cached version.
 *
 * To activate, change the provider in _layout.tsx:
 *   <ServicesProvider overrides={{ speech: createExecuTorchSpeechService() }}>
 *
 * Note: Currently only English (US/UK) is well supported by Kokoro.
 * For other languages, the expo-speech implementation is still recommended.
 */

// These imports will fail until the packages are installed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let TextToSpeechModule: any;
let models: any;
let AudioContextClass: any;

try {
  const rne = require("react-native-executorch");
  TextToSpeechModule = rne.TextToSpeechModule;
  models = rne.models;
  const audioApi = require("react-native-audio-api");
  AudioContextClass = audioApi.AudioContext;
} catch {
  // Dependencies not installed — this service can't be used yet
}

import type { SpeechService } from "@/types";

const SAMPLE_RATE = 24000;

function getModelForLanguage(language: string) {
  if (!models) return null;
  const lang = language.toLowerCase().replace("-", "_");

  if (lang === "en_gb") {
    return models.text_to_speech.kokoro.en_gb.heart();
  }
  // Default to English US for any English variant or unsupported language
  return models.text_to_speech.kokoro.en_us.heart();
}

export function createExecuTorchSpeechService(): SpeechService {
  if (!TextToSpeechModule || !AudioContextClass) {
    throw new Error(
      "react-native-executorch and react-native-audio-api must be installed to use ExecuTorchSpeechService. " +
        "Run: npm install react-native-executorch react-native-executorch-expo-resource-fetcher react-native-audio-api"
    );
  }

  let ttsModule: any = null;
  let currentLanguage: string | null = null;
  let audioContext: any = null;
  let isSpeakingNow = false;

  async function ensureModel(language: string) {
    if (ttsModule && currentLanguage === language) {
      return ttsModule;
    }

    const modelConfig = getModelForLanguage(language);
    if (!modelConfig) throw new Error("No TTS model config for language: " + language);

    ttsModule = await TextToSpeechModule.fromModelName(
      modelConfig,
      (progress: number) => {
        console.log(`TTS model download: ${Math.round(progress * 100)}%`);
      }
    );
    currentLanguage = language;
    return ttsModule;
  }

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
    }
    return audioContext;
  }

  return {
    async speak(text: string, language: string): Promise<void> {
      isSpeakingNow = true;
      try {
        const model = await ensureModel(language);
        const ctx = getAudioContext();
        const waveform = await model.forward(text, 1.0);

        await new Promise<void>((resolve, reject) => {
          try {
            const audioBuffer = ctx.createBuffer(1, waveform.length, SAMPLE_RATE);
            audioBuffer.getChannelData(0).set(waveform);

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onEnded = () => {
              isSpeakingNow = false;
              resolve();
            };
            source.start();
          } catch (err) {
            isSpeakingNow = false;
            reject(err);
          }
        });
      } catch (error) {
        isSpeakingNow = false;
        console.error("ExecuTorch TTS error:", error);
        throw error;
      }
    },

    stop() {
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      isSpeakingNow = false;
    },

    async isSpeaking(): Promise<boolean> {
      return isSpeakingNow;
    },
  };
}
