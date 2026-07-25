import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";

interface AppThemeContextValue {
  /** The resolved theme (always "light" or "dark") */
  theme: "light" | "dark";
  /** The user's preference */
  mode: ThemeMode;
  /** Toggle between light and dark */
  toggle: () => void;
  /** Set a specific mode */
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = "app_theme_mode";

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "light" || value === "dark") {
        setModeState(value);
      }
      setLoaded(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const toggle = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
  }, [mode, setMode]);

  const value: AppThemeContextValue = {
    theme: mode,
    mode,
    toggle,
    setMode,
  };

  if (!loaded) return null;

  return React.createElement(AppThemeContext.Provider, { value }, children);
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}
