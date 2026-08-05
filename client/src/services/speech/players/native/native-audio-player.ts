/**
 * Waveform playback via react-native-audio-api (native).
 *
 * The dependency is optional: it requires a custom dev client build, so it's
 * loaded with a guarded require (Expo's Metro config marks try/catch-wrapped
 * requires as optional — bundling succeeds when the package is absent and the
 * require simply throws at runtime).
 */

import type { Player, Waveform } from "../../core";

let AudioContextClass: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AudioContextClass = require("react-native-audio-api").AudioContext;
} catch {
  // Dependency not installed — isNativeAudioPlayerAvailable() reports false
}

export function isNativeAudioPlayerAvailable(): boolean {
  return AudioContextClass != null;
}

/** Kokoro's fixed native output rate — the only engine on this platform today */
const KOKORO_SAMPLE_RATE = 24000;

/**
 * Max time to wait for onEnded before giving up and resolving anyway. A
 * non-1.0 playbackRate has been observed to never fire onEnded on this
 * library (see the comment on playbackRate below) — without this, a single
 * bad utterance would wedge isSpeakingNow (and the UI's "speaking" state)
 * forever. Generous margin over the expected duration, floored so very short
 * clips still get a sane minimum.
 */
const PLAYBACK_TIMEOUT_FLOOR_MS = 5000;
const PLAYBACK_TIMEOUT_MARGIN_MS = 4000;

export function createNativeAudioPlayer(): Player {
  let audioContext: any = null;
  let currentAudioSource: any = null;

  function getAudioContext(): any {
    // Unlike the web player, this library does NOT resample a buffer to the
    // context's running rate on playback — AudioBufferSourceNode advances
    // through samples using the context's own clock (see runBufferProcessor
    // in react-native-audio-api's C++ source), so a buffer/context rate
    // mismatch changes both speed and pitch. Rather than compensate via
    // playbackRate (a non-1.0 rate has been observed to never fire onEnded,
    // hanging playback forever), run the context natively at Kokoro's rate
    // so the common case never needs a rate adjustment at all.
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextClass({ sampleRate: KOKORO_SAMPLE_RATE });
    }
    return audioContext;
  }

  return {
    async play(waveform: Waveform, playbackRate: number): Promise<void> {
      const ctx = getAudioContext();
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        await ctx.resume();
      }

      const rateAdjust = waveform.sampleRate / ctx.sampleRate;
      const effectiveRate = playbackRate * rateAdjust;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const finish = () => {
          if (settled) return;
          settled = true;
          if (timer) clearTimeout(timer);
          currentAudioSource = null;
          resolve();
        };

        try {
          const buffer = ctx.createBuffer(1, waveform.audio.length, waveform.sampleRate);
          buffer.getChannelData(0).set(waveform.audio);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = effectiveRate;
          source.connect(ctx.destination);

          currentAudioSource = source;
          // react-native-audio-api's end-of-playback callback is `onEnded`
          // (capital E), not the Web Audio spec's `onended`
          source.onEnded = finish;
          source.start();

          const durationMs = (waveform.audio.length / waveform.sampleRate / effectiveRate) * 1000;
          timer = setTimeout(
            finish,
            Math.max(durationMs + PLAYBACK_TIMEOUT_MARGIN_MS, PLAYBACK_TIMEOUT_FLOOR_MS)
          );
        } catch (err) {
          if (!settled) {
            settled = true;
            if (timer) clearTimeout(timer);
            currentAudioSource = null;
            reject(err);
          }
        }
      });
    },

    stop() {
      // Stop the current source only — keep the context alive for the next
      // utterance (closing it would add re-init latency on every stop)
      if (currentAudioSource) {
        try {
          currentAudioSource.stop();
        } catch {}
        currentAudioSource = null;
      }
    },
  };
}
