import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";

import { useServices } from "@/services";

/**
 * Manages the app's initial loading state.
 * 
 * - Hides the native splash screen immediately
 * - Shows a loading overlay while speech models initialize
 * - Returns dynamic loading messages and ready state
 * 
 * Usage:
 * ```tsx
 * const { loadingMessage } = useAppLoading();
 * {loadingMessage && <LoadingOverlay message={loadingMessage} />}
 * ```
 */
export function useAppLoading() {
  const { speech } = useServices();
  const [loadingMessage, setLoadingMessage] = useState<string | null>("Iniciando...");

  // Hide native splash immediately and take control with our overlay
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Wait for critical resources (speech models) before hiding our loading overlay
  useEffect(() => {
    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function waitForReady() {
      // Check if speech models are ready (optional method)
      if (speech.isModelReady && speech.getEngineStatuses) {
        setLoadingMessage("Cargando voces...");

        // Check initial state to determine timeout
        const initialStatuses = speech.getEngineStatuses();
        const bothReadyInitially = 
          initialStatuses.english === "ready" && initialStatuses.spanish === "ready";
        
        // If both are ready from the start, hide overlay quickly (2s max)
        // Otherwise give more time for download (8s)
        const timeoutDuration = bothReadyInitially ? 2000 : 8000;

        // Poll until both models are ready OR failed
        const checkModels = () => {
          if (!mounted) return;

          const statuses = speech.getEngineStatuses!();
          const englishLoading = statuses.english === "loading";
          const spanishLoading = statuses.spanish === "loading";

          // Update loading message based on what's loading
          if (englishLoading && spanishLoading) {
            setLoadingMessage("Cargando voces de inglés y español...");
          } else if (englishLoading) {
            setLoadingMessage("Cargando voz de inglés...");
          } else if (spanishLoading) {
            setLoadingMessage("Cargando voz de español...");
          }

          // Hide overlay when NEITHER is loading anymore
          // (they're either ready, failed, or idle - any of those means we can proceed)
          if (!englishLoading && !spanishLoading) {
            if (pollInterval) clearInterval(pollInterval);
            if (timeoutId) clearTimeout(timeoutId);
            setLoadingMessage(null);
          }
        };

        // Start polling every 300ms
        pollInterval = setInterval(checkModels, 300);

        // Fallback timeout with dynamic duration
        timeoutId = setTimeout(() => {
          if (mounted && pollInterval) {
            clearInterval(pollInterval);
            setLoadingMessage(null);
          }
        }, timeoutDuration);
      } else {
        // No model checking available, hide overlay immediately
        setLoadingMessage(null);
      }
    }

    waitForReady();

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [speech]);

  return {
    /** Loading message to display, or null when ready */
    loadingMessage,
    /** Whether the app is ready (models loaded or timed out) */
    isReady: loadingMessage === null,
  };
}
