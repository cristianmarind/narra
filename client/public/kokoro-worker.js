/**
 * Kokoro TTS Web Worker
 * Loads kokoro-js from CDN, generates audio, sends Float32Array back to main thread.
 */

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const KOKORO_CDN = "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

let tts = null;
let loadPromise = null;

function log(msg) {
  self.postMessage({ type: "log", message: msg });
}

async function loadModel() {
  if (tts) return tts;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      log("Importing kokoro-js from CDN...");
      const module = await import(KOKORO_CDN);
      log("Module imported, keys: " + Object.keys(module).join(", "));

      const KokoroTTS = module.KokoroTTS;
      if (!KokoroTTS) {
        throw new Error("KokoroTTS not found in module. Keys: " + Object.keys(module).join(", "));
      }

      log("Loading model: " + MODEL_ID);
      tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "q8",
        device: "wasm",
        progress_callback: (progress) => {
          if (progress.status === "progress" && progress.progress != null) {
            self.postMessage({ type: "loading", progress: progress.progress / 100 });
          }
        },
      });

      log("Model loaded successfully!");
      self.postMessage({ type: "ready" });
      return tts;
    } catch (err) {
      log("ERROR loading model: " + err.message + "\n" + err.stack);
      self.postMessage({ type: "error", error: "Model load failed: " + err.message });
      loadPromise = null;
      return null;
    }
  })();

  return loadPromise;
}

self.onmessage = async (event) => {
  const { type, id, text, voice, speed } = event.data;

  if (type === "init") {
    log("Init received");
    await loadModel();
    return;
  }

  if (type === "speak") {
    try {
      log("Speak received: '" + text.substring(0, 30) + "...' voice=" + voice);
      const model = await loadModel();
      if (!model) {
        self.postMessage({ type: "error", id, error: "Model not loaded" });
        return;
      }

      log("Generating audio...");
      const result = await model.generate(text, { voice: voice || "af_heart", speed: speed || 1.0 });
      log("Generate done. Result type: " + typeof result + ", keys: " + Object.keys(result).join(", "));

      let waveform = null;

      if (result && result.audio instanceof Float32Array) {
        waveform = result.audio;
        log("Audio is Float32Array directly, length: " + waveform.length);
      } else if (result && typeof result.audio === "object" && result.audio !== null) {
        log("result.audio type: " + typeof result.audio + ", constructor: " + (result.audio.constructor && result.audio.constructor.name));
        // Might be a typed array view or regular array
        waveform = new Float32Array(result.audio);
        log("Converted to Float32Array, length: " + waveform.length);
      } else {
        log("Unexpected result structure: " + JSON.stringify(Object.keys(result || {})));
        self.postMessage({ type: "error", id, error: "Cannot extract audio from result" });
        return;
      }

      if (!waveform || waveform.length === 0) {
        self.postMessage({ type: "error", id, error: "Generated audio is empty (length=0)" });
        return;
      }

      log("Sending audio, length: " + waveform.length + " samples (" + (waveform.length / 24000).toFixed(2) + "s)");
      self.postMessage({ type: "audio", id, audio: waveform }, [waveform.buffer]);
    } catch (err) {
      log("ERROR in speak: " + err.message);
      self.postMessage({ type: "error", id, error: err.message || String(err) });
    }
    return;
  }
};
