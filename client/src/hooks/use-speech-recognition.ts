import { useCallback, useEffect, useState } from "react";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useServices } from "@/services";

interface UseSpeechRecognitionReturn {
  /** Whether recognition is currently listening */
  listening: boolean;
  /** The current transcript (interim or final) */
  transcript: string;
  /** Whether speech recognition is available on this platform */
  available: boolean;
  /** Start listening for speech */
  listen: (language: string) => Promise<void>;
  /** Stop listening and finalize result */
  stop: () => void;
  /** Clear the current transcript */
  clear: () => void;
}

/**
 * Hook wrapping the injected SpeechRecognitionService.
 * Uses expo-speech-recognition events for real-time transcript updates.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const { speechRecognition } = useServices();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [available, setAvailable] = useState(false);

  // Check availability on mount
  useEffect(() => {
    speechRecognition.isAvailable().then(setAvailable);
  }, [speechRecognition]);

  // Register event listeners via expo-speech-recognition hooks
  useSpeechRecognitionEvent("start", () => {
    setListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    // Get the last result (most recent transcript)
    const lastResult = event.results[event.results.length - 1];
    if (lastResult) {
      setTranscript(lastResult.transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error, event.message);
    setListening(false);
  });

  const listen = useCallback(
    async (language: string) => {
      const granted = await speechRecognition.requestPermissions();
      if (!granted) {
        console.warn("Speech recognition permission not granted");
        return;
      }
      setTranscript("");
      speechRecognition.start(language);
    },
    [speechRecognition]
  );

  const stop = useCallback(() => {
    speechRecognition.stop();
  }, [speechRecognition]);

  const clear = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    listening,
    transcript,
    available,
    listen,
    stop,
    clear,
  };
}
