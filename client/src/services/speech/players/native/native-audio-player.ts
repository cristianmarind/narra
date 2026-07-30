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

export function createNativeAudioPlayer(): Player {
  let audioContext: any = null;
  let currentAudioSource: any = null;

  function getAudioContext(): any {
    // Unlike the web player, this library does NOT resample a buffer to the
    // context's running rate on playback — AudioBufferSourceNode advances
    // through samples using the context's own clock (see runBufferProcessor
    // in react-native-audio-api's C++ source), so a buffer/context rate
    // mismatch changes both speed and pitch. play() compensates manually via
    // playbackRate below, whatever rate the context ends up at.
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextClass();
    }
    return audioContext;
  }

  return {
    async play(waveform: Waveform, playbackRate: number): Promise<void> {
      const ctx = getAudioContext();
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        await ctx.resume();
      }

      await new Promise<void>((resolve, reject) => {
        try {
          const buffer = ctx.createBuffer(1, waveform.audio.length, waveform.sampleRate);
          buffer.getChannelData(0).set(waveform.audio);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          // Compensate for the missing auto-resample: the effective rate is
          // the caller's requested rate scaled by how the buffer's sample
          // rate relates to the context's actual running rate.
          source.playbackRate.value = playbackRate * (waveform.sampleRate / ctx.sampleRate);
          source.connect(ctx.destination);

          currentAudioSource = source;
          // react-native-audio-api's end-of-playback callback is `onEnded`
          // (capital E), not the Web Audio spec's `onended`
          source.onEnded = () => {
            currentAudioSource = null;
            resolve();
          };
          source.start();
        } catch (err) {
          currentAudioSource = null;
          reject(err);
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
