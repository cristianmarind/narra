/**
 * Waveform playback via the Web Audio API (web only).
 */

import type { Player, Waveform } from "../../core";

export function createWebAudioPlayer(): Player {
  let audioContext: AudioContext | null = null;
  let currentAudioSource: AudioBufferSourceNode | null = null;

  function getAudioContext(): AudioContext {
    // Use the device's native rate; buffers declare their own rate and the
    // browser resamples. Forcing a rate here would break one of the engines.
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContext();
    }
    return audioContext;
  }

  return {
    async play(waveform: Waveform, playbackRate: number): Promise<void> {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") await ctx.resume();

      await new Promise<void>((resolve) => {
        const buffer = ctx.createBuffer(1, waveform.audio.length, waveform.sampleRate);
        buffer.getChannelData(0).set(waveform.audio);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = playbackRate;
        source.connect(ctx.destination);

        currentAudioSource = source;
        source.onended = () => {
          currentAudioSource = null;
          resolve();
        };
        source.start();
      });
    },

    stop() {
      if (currentAudioSource) {
        try {
          currentAudioSource.stop();
        } catch {}
        currentAudioSource = null;
      }
    },
  };
}
