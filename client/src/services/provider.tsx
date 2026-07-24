import React, { createContext, useContext, useMemo } from "react";
import type { StorageService, SpeechService } from "@/types";
import { createAsyncStorageService } from "./storage";
import { createExpoSpeechService } from "./speech";

export interface Services {
  storage: StorageService;
  speech: SpeechService;
}

const ServicesContext = createContext<Services | null>(null);

interface ServicesProviderProps {
  children: React.ReactNode;
  /** Override default implementations for testing or future backends */
  overrides?: Partial<Services>;
}

/**
 * Wraps the app and provides injectable services via React Context.
 * Pass `overrides` to swap implementations (e.g. in tests or when backend is ready).
 */
export function ServicesProvider({ children, overrides }: ServicesProviderProps) {
  const services = useMemo<Services>(
    () => ({
      storage: overrides?.storage ?? createAsyncStorageService(),
      speech: overrides?.speech ?? createExpoSpeechService(),
    }),
    [overrides]
  );

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

/**
 * Hook to consume injected services. Must be used within ServicesProvider.
 */
export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices must be used within a ServicesProvider");
  }
  return ctx;
}
