/**
 * Piper TTS Web Worker (Spanish)
 *
 * Loads @diffusionstudio/vits-web from CDN, which runs Rhasspy Piper VITS models
 * in the browser via onnxruntime-web. Unlike kokoro-js, its phonemizer bundles the
 * full espeak-ng data, so Spanish works out of the box.
 *
 * The model is stored in the Origin Private File System by vits-web, so it only
 * downloads once. Everything is fetched from public CDNs — no server needed.
 *
 * Contract with the main thread mirrors kokoro-worker.js, except the "audio"
 * message also carries `sampleRate`: Piper voices are 22050 Hz, not 24000 Hz.
 */

const VITS_CDN = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";

/** es_MX-claude-high: Latin American Spanish, "high" quality tier, 22050 Hz */
const VOICE = "es_MX-claude-high";

let tts = null;
let loadPromise = null;

function log(msg) {
  self.postMessage({ type: "log", message: msg });
}

/** Import the library and make sure the model is present in OPFS. */
async function loadModel() {
  if (tts) return tts;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      log("Importing vits-web from CDN...");
      const module = await import(VITS_CDN);

      if (typeof module.predict !== "function") {
        throw new Error(
          "vits-web predict() not found. Module keys: " + Object.keys(module).join(", ")
        );
      }

      log("Checking stored voices...");
      const stored = await module.stored();

      if (!stored.includes(VOICE)) {
        log("Downloading voice: " + VOICE);
        await module.download(VOICE, (progress) => {
          if (progress.total > 0) {
            self.postMessage({
              type: "loading",
              progress: progress.loaded / progress.total,
            });
          }
        });
        log("Voice downloaded");
      } else {
        log("Voice already in OPFS");
      }

      tts = module;
      self.postMessage({ type: "ready" });
      return tts;
    } catch (err) {
      log("ERROR loading Piper: " + err.message + "\n" + err.stack);
      self.postMessage({ type: "error", error: "Piper load failed: " + err.message });
      loadPromise = null;
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Decode a RIFF/WAVE blob into Float32 samples.
 *
 * vits-web returns 16-bit PCM WAV. We walk the chunk list rather than assuming a
 * fixed 44-byte header, since some encoders insert extra chunks before `data`.
 *
 * @returns {{ samples: Float32Array, sampleRate: number }}
 */
function decodeWav(buffer) {
  const view = new DataView(buffer);

  const readTag = (offset) =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3)
    );

  if (readTag(0) !== "RIFF" || readTag(8) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE buffer");
  }

  let sampleRate = 0;
  let bitsPerSample = 16;
  let numChannels = 1;
  let dataOffset = 0;
  let dataLength = 0;

  // Chunks start right after the 12-byte RIFF header
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const id = readTag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (id === "fmt ") {
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataOffset = body;
      dataLength = Math.min(size, view.byteLength - body);
      break;
    }

    // Chunks are word-aligned: odd sizes are followed by a pad byte
    offset = body + size + (size % 2);
  }

  if (!dataOffset || !dataLength) throw new Error("WAV data chunk not found");
  if (bitsPerSample !== 16) throw new Error("Unexpected bit depth: " + bitsPerSample);
  if (!sampleRate) throw new Error("WAV sample rate not found");

  const totalSamples = Math.floor(dataLength / 2);
  const frames = Math.floor(totalSamples / numChannels);
  const samples = new Float32Array(frames);

  if (numChannels === 1) {
    for (let i = 0; i < frames; i++) {
      samples[i] = view.getInt16(dataOffset + i * 2, true) / 32768;
    }
  } else {
    // Downmix to mono
    for (let i = 0; i < frames; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) {
        sum += view.getInt16(dataOffset + (i * numChannels + c) * 2, true) / 32768;
      }
      samples[i] = sum / numChannels;
    }
  }

  return { samples, sampleRate };
}

self.onmessage = async (event) => {
  const { type, id, text } = event.data;

  if (type === "init") {
    log("Init received");
    await loadModel();
    return;
  }

  if (type === "speak") {
    try {
      log("Speak received: '" + String(text).substring(0, 40) + "'");
      const model = await loadModel();
      if (!model) {
        self.postMessage({ type: "error", id, error: "Piper model not loaded" });
        return;
      }

      const wavBlob = await model.predict({ text, voiceId: VOICE });
      const { samples, sampleRate } = decodeWav(await wavBlob.arrayBuffer());

      if (!samples.length) {
        self.postMessage({ type: "error", id, error: "Generated audio is empty" });
        return;
      }

      log(
        "Sending audio: " +
          samples.length +
          " samples @ " +
          sampleRate +
          "Hz (" +
          (samples.length / sampleRate).toFixed(2) +
          "s)"
      );

      self.postMessage({ type: "audio", id, audio: samples, sampleRate }, [samples.buffer]);
    } catch (err) {
      log("ERROR in speak: " + (err.message || String(err)));
      self.postMessage({ type: "error", id, error: err.message || String(err) });
    }
    return;
  }
};
