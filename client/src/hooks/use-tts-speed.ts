import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ttsSpeedRef } from "@/services/provider";

const STORAGE_KEY = "tts_speed";
const DEFAULT_SPEED = 0.85;

interface TtsSpeedContextValue {
  speed: number;
  setSpeed: (speed: number) => void;
}

const TtsSpeedContext = createContext<TtsSpeedContextValue | null>(null);

export function TtsSpeedProvider({ children }: { children: React.ReactNode }) {
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 1.5) {
          setSpeedState(parsed);
          ttsSpeedRef.current = parsed;
        }
      }
      setLoaded(true);
    });
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    ttsSpeedRef.current = newSpeed;
    AsyncStorage.setItem(STORAGE_KEY, String(newSpeed));
  }, []);

  if (!loaded) return null;

  return React.createElement(TtsSpeedContext.Provider, { value: { speed, setSpeed } }, children);
}

export function useTtsSpeed(): TtsSpeedContextValue {
  const ctx = useContext(TtsSpeedContext);
  if (!ctx) {
    throw new Error("useTtsSpeed must be used within TtsSpeedProvider");
  }
  return ctx;
}
