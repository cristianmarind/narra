import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProficiencyLevel } from "@/types";
import { PROFICIENCY_LEVELS } from "@/types";

const STORAGE_KEY = "user_level";

/**
 * Lowest level until the user says otherwise: sponsored phrases above the
 * user's real level are annoying, below it they're just easy.
 */
const DEFAULT_LEVEL: ProficiencyLevel = "none";

interface UserLevelContextValue {
  level: ProficiencyLevel;
  setLevel: (level: ProficiencyLevel) => void;
}

const UserLevelContext = createContext<UserLevelContextValue | null>(null);

export function UserLevelProvider({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<ProficiencyLevel>(DEFAULT_LEVEL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value && (PROFICIENCY_LEVELS as readonly string[]).includes(value)) {
        setLevelState(value as ProficiencyLevel);
      }
      setLoaded(true);
    });
  }, []);

  const setLevel = useCallback((newLevel: ProficiencyLevel) => {
    setLevelState(newLevel);
    AsyncStorage.setItem(STORAGE_KEY, newLevel);
  }, []);

  if (!loaded) return null;

  return React.createElement(UserLevelContext.Provider, { value: { level, setLevel } }, children);
}

export function useUserLevel(): UserLevelContextValue {
  const ctx = useContext(UserLevelContext);
  if (!ctx) {
    throw new Error("useUserLevel must be used within UserLevelProvider");
  }
  return ctx;
}
