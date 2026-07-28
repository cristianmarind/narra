import React, { createContext, useContext, useRef, useState } from "react";
import type { StorageService, SpeechService, SpeechRecognitionService } from "@/types";
import { createAsyncStorageService } from "./storage";
import { createDefaultSpeechService } from "./speech";
import { createExpoSpeechRecognitionService } from "./recognition";

export interface Services {
  storage: StorageService;
  speech: SpeechService;
  speechRecognition: SpeechRecognitionService;
}

const ServicesContext = createContext<Services | null>(null);

/** Shared mutable ref for TTS speed — updated by TtsSpeedProvider */
export const ttsSpeedRef = { current: 0.85 };

interface ServicesProviderProps {
  children: React.ReactNode;
  overrides?: Partial<Services>;
}

export function ServicesProvider({ children, overrides }: ServicesProviderProps) {
  const [services] = useState<Services>(() => ({
    storage: overrides?.storage ?? createAsyncStorageService(),
    speech: overrides?.speech ?? createDefaultSpeechService(() => ttsSpeedRef.current),
    speechRecognition: overrides?.speechRecognition ?? createExpoSpeechRecognitionService(),
  }));

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return ctx;
}
