import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "think_time_v1";

/** Defaults match the previous hardcoded pacing (2s first word, 1s/extra word) */
export const DEFAULT_THINK_FIRST_WORD_SECONDS = 2;
export const DEFAULT_THINK_PER_EXTRA_WORD_SECONDS = 1;

const MIN_SECONDS = 0;
const MAX_SECONDS = 10;

interface ThinkTimeContextValue {
  firstWordSeconds: number;
  perExtraWordSeconds: number;
  setFirstWordSeconds: (value: number) => void;
  setPerExtraWordSeconds: (value: number) => void;
}

const ThinkTimeContext = createContext<ThinkTimeContextValue | null>(null);

function clamp(value: number): number {
  if (isNaN(value)) return 0;
  return Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, value));
}

export function ThinkTimeProvider({ children }: { children: React.ReactNode }) {
  const [firstWordSeconds, setFirstWordState] = useState(DEFAULT_THINK_FIRST_WORD_SECONDS);
  const [perExtraWordSeconds, setPerExtraWordState] = useState(
    DEFAULT_THINK_PER_EXTRA_WORD_SECONDS,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed.firstWord === "number") setFirstWordState(clamp(parsed.firstWord));
          if (typeof parsed.perExtraWord === "number") {
            setPerExtraWordState(clamp(parsed.perExtraWord));
          }
        } catch {
          // corrupt stored value — keep defaults
        }
      }
      setLoaded(true);
    });
  }, []);

  const setFirstWordSeconds = useCallback((value: number) => {
    const clamped = clamp(value);
    setFirstWordState(clamped);
    setPerExtraWordState((perExtraWord) => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ firstWord: clamped, perExtraWord }),
      );
      return perExtraWord;
    });
  }, []);

  const setPerExtraWordSeconds = useCallback((value: number) => {
    const clamped = clamp(value);
    setPerExtraWordState(clamped);
    setFirstWordState((firstWord) => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ firstWord, perExtraWord: clamped }),
      );
      return firstWord;
    });
  }, []);

  if (!loaded) return null;

  return React.createElement(
    ThinkTimeContext.Provider,
    {
      value: {
        firstWordSeconds,
        perExtraWordSeconds,
        setFirstWordSeconds,
        setPerExtraWordSeconds,
      },
    },
    children,
  );
}

export function useThinkTime(): ThinkTimeContextValue {
  const ctx = useContext(ThinkTimeContext);
  if (!ctx) {
    throw new Error("useThinkTime must be used within ThinkTimeProvider");
  }
  return ctx;
}
