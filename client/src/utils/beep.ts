import { Platform } from "react-native";

/**
 * Plays a short beep sound to indicate a voice mode phase change.
 * Uses Web Audio API on web, and a minimal approach on native.
 */
export function playBeep(frequency = 800, durationMs = 150): void {
  if (Platform.OS === "web") {
    try {
      const AudioContext =
        (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Silently fail if audio context isn't available
    }
  }
  // On native, expo-av could be used with a bundled sound file.
  // For now, native relies on the TTS cues as audio feedback.
}
