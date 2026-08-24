/**
 * How many of a list's first phrases get their audio persisted to disk
 * (survives app restart) — applied to up to MAX_WARMED_LISTS lists on lobby
 * warmup (use-audio-warmup.ts), and to a freshly imported list
 * (list/import.tsx). Deleting a list forgets exactly this many from
 * persisted storage too (forgetPersistedListAudio in use-phrase-lists.ts) —
 * keep that in sync if this changes.
 */
export const PERSISTED_PHRASES_PER_LIST = 3;

/**
 * How many phrases ahead of the current one stay warmed (audio pre-generated)
 * during practice — see the sliding-window effect in practice.tsx. Also used
 * by the list-detail screen to pre-warm the same number of answers before the
 * user even presses "Practicar", so the window is already partly filled by
 * the time the session actually starts.
 */
export const LOOKAHEAD_WINDOW_SIZE = 10;

/**
 * Artificial delay after pressing "Practicar", before navigating to the
 * practice screen — gives the TTS pipeline a head start on the lookahead
 * window (LOOKAHEAD_WINDOW_SIZE phrases, generated sequentially per
 * language) so more of the first few phrases are already cached instead of
 * falling back to the robotic system voice. This is a starting estimate, not
 * a measurement — the app has no per-utterance generation benchmark, and
 * actual speed varies by device and engine (Kokoro/Piper via WASM or
 * ExecuTorch). Tune this against real short-phrase lists on your slowest
 * target device: too short and fast lists still hit the fallback voice mid
 * -session; too long and it reads as a stall on every single practice start.
 */
export const PRACTICE_START_DELAY_MS = 2000;
