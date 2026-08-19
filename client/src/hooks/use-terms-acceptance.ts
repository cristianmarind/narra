import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "terms_acceptance_v1";
const CURRENT_TERMS_VERSION = "1.0";

interface TermsAcceptanceContextValue {
  accepted: boolean;
  termsVersion: string;
  acceptTerms: () => Promise<void>;
  loading: boolean;
}

const TermsAcceptanceContext = createContext<TermsAcceptanceContextValue | null>(null);

export function TermsAcceptanceProvider({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const [termsVersion, setTermsVersion] = useState(CURRENT_TERMS_VERSION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const acceptedCurrentVersion = parsed.termsVersion === CURRENT_TERMS_VERSION;
          setAccepted(acceptedCurrentVersion);
          setTermsVersion(parsed.termsVersion || CURRENT_TERMS_VERSION);
        } catch {
          setAccepted(false);
        }
      } else {
        setAccepted(false);
      }
      setLoading(false);
    });
  }, []);

  const acceptTerms = useCallback(async () => {
    const data = {
      termsVersion: CURRENT_TERMS_VERSION,
      acceptedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setAccepted(true);
    setTermsVersion(CURRENT_TERMS_VERSION);
  }, []);

  if (loading) return null;

  return React.createElement(
    TermsAcceptanceContext.Provider,
    {
      value: {
        accepted,
        termsVersion,
        acceptTerms,
        loading,
      },
    },
    children
  );
}

export function useTermsAcceptance(): TermsAcceptanceContextValue {
  const ctx = useContext(TermsAcceptanceContext);
  if (!ctx) {
    throw new Error("useTermsAcceptance must be used within TermsAcceptanceProvider");
  }
  return ctx;
}
