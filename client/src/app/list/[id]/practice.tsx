import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContentContainer } from "@/components/content-container";
import { Kbd } from "@/components/kbd";
import { ProgressBar } from "@/components/progress-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AnswerInput } from "@/components/practice/answer-input";
import { PracticeFeedback } from "@/components/practice/practice-feedback";
import { TranslationsList } from "@/components/practice/translations-list";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import {
  FEEDBACK_CORRECT,
  FEEDBACK_INCORRECT,
  VERIFY_PROMPT_FIRST,
  VERIFY_PROMPT_REPEAT,
  buildIntro,
  fixedPromptsFor,
  languageName,
} from "@/constants/speech-prompts";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useThinkTime } from "@/hooks/use-think-time";
import { useUserLevel } from "@/hooks/use-user-level";
import { useServices } from "@/services";
import type { Phrase, PhraseList, PhraseResult, SessionAd } from "@/types";
import { homologateSpokenAnswer, playBeep } from "@/utils";

const TIMER_CORRECT_SECONDS = 3;
const TIMER_INCORRECT_SECONDS = 15;

/** Max phrases warmed ahead of the current one, per language, at any time */
const WINDOW_SIZE = 5;

/** Listen mode + self-verify: how long to wait for the user to grade themselves */
const VERIFY_SECONDS = 10;

/**
 * Words recognized while waiting for a spoken self-verify result. Was
 * "correcto"/"incorrecto" — a near-minimal pair that a weak recognized
 * prefix could flip into the other. "Bien"/"malo" don't share that risk.
 * Each side also biases toward a couple of close variants — a meaning
 * synonym and a phonetic near-miss — since the recognizer only picks among
 * this list, and covering likely mishears here beats narrowing the list.
 */
const VERIFY_CONTEXT = ["bien", "bueno", "ven", "malo", "mal", "cal"];

/**
 * Reorder phrases to match an explicit id sequence (from the list-detail
 * screen's shuffle, so the exact phrase warmed there ends up first here).
 * Ids no longer present are dropped; phrases not in the sequence (e.g. added
 * after the order was computed) are appended at the end, order preserved.
 */
function reorderByIds(phrases: Phrase[], orderParam?: string): Phrase[] {
  if (!orderParam) return phrases;

  const byId = new Map(phrases.map((p) => [p.id, p]));
  const ordered = orderParam
    .split(",")
    .map((id) => byId.get(id))
    .filter((p): p is Phrase => Boolean(p));

  const orderedIds = new Set(ordered.map((p) => p.id));
  const remaining = phrases.filter((p) => !orderedIds.has(p.id));
  return [...ordered, ...remaining];
}

/** WhatsApp contact for advertisers, opened from the CTA under the ad badge */
const ADVERTISE_WHATSAPP_URL =
  "https://wa.me/573016556270?text=" +
  encodeURIComponent("Hola, quiero publicitar mi marca en Narra");

/**
 * Insert a sponsored phrase into the session queue. The ad plays like any
 * other phrase but is excluded from scoring and persisted stats. Position is
 * the ad's fixed `order` (1-based, clamped); absent, it plays second — late
 * enough to not open the session, early enough to always be seen.
 */
function insertSessionAd(phrases: Phrase[], ad: SessionAd): Phrase[] {
  const adPhrase: Phrase = {
    id: `ad-${ad.phrase.id}`,
    nativeSentence: ad.phrase.text,
    acceptedTranslations: ad.phrase.acceptedTranslations,
    sponsoredBy: ad.advertiser,
  };
  const index =
    ad.phrase.order !== undefined
      ? Math.min(Math.max(ad.phrase.order - 1, 0), phrases.length)
      : Math.min(1, phrases.length);
  const result = [...phrases];
  result.splice(index, 0, adPhrase);
  return result;
}

/**
 * Voice mode phases:
 * - "answer": listening for the user's translation
 * - "pre-command": listening for "verify" or "repeat"
 *     verify → submit answer
 *     repeat → clear answer, re-read native phrase, go back to "answer"
 * - "post-command": listening for "next", "repeat", "stop"
 *     next → advance
 *     repeat → re-read correct answer in target language
 *     stop → cancel timer
 * - null: not in a voice phase
 */
type VoicePhase = "answer" | "pre-command" | "post-command" | null;

/**
 * Listen mode phases (audio-only, no typing/STT for the answer itself):
 * - "thinking": pause after the native phrase, for the user to produce their
 *   answer mentally or aloud, before the correct one plays
 * - "answer-playing": the correct answer is being read
 * - "verifying": self-verify only — waiting (up to VERIFY_SECONDS) for the
 *   user to grade themselves via button or spoken "bien"/"malo"
 * - null: not in a listen phase (manual mode, or between phrases)
 */
type ListenStage = "thinking" | "answer-playing" | "verifying" | null;

/** Recognizer biasing for command phases: the only words we expect to hear */
const COMMAND_CONTEXT = [
  "verify",
  "verificar",
  "repeat",
  "repetir",
  "next",
  "siguiente",
  "stop",
  "parar",
];

export default function PracticeScreen() {
  const {
    id,
    mode: modeParam,
    voiceMode: voiceModeParam,
    selfVerify: selfVerifyParam,
    order: orderParam,
  } = useLocalSearchParams<{
    id: string;
    /** "listen" (default, audio-only) or "manual" (type/speak the answer) */
    mode?: string;
    voiceMode?: string;
    /** Listen mode only: wait for the user to self-report the result */
    selfVerify?: string;
    /** Comma-separated phrase ids, fixing the exact play order (set by the list screen's random toggle) */
    order?: string;
  }>();
  const isListenMode = modeParam !== "manual";
  const voiceMode = voiceModeParam === "1";
  const selfVerify = isListenMode && selfVerifyParam === "1";

  const { lists, addUserTranslation, recordPhraseResult } = usePhraseLists();
  const { speech, ads, fullscreenAds } = useServices();
  const { level: userLevel } = useUserLevel();
  const { firstWordSeconds: thinkFirstWordSeconds, perExtraWordSeconds: thinkPerExtraWordSeconds } =
    useThinkTime();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { speak, speakFixed, speaking, stop: stopSpeaking } = useSpeech();
  const {
    listening,
    transcript,
    available: micAvailable,
    listen,
    stop: stopListening,
    clear: clearTranscript,
  } = useSpeechRecognition();
  const {
    status,
    currentPhrase,
    progress,
    score,
    start,
    submitAnswer,
    submitSelfGraded,
    overrideAsCorrect,
    next,
    previous,
  } = usePracticeSession();

  const [answer, setAnswer] = useState("");
  const [lastResult, setLastResult] = useState<PhraseResult | null>(null);
  const [list, setList] = useState<PhraseList | null>(null);
  const [started, setStarted] = useState(false);
  // Mirrors exactly what was passed to start(), so the lookahead window can
  // look up phrases by session position instead of list order
  const [sessionPhrases, setSessionPhrases] = useState<Phrase[]>([]);

  // Timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice mode state
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(null);
  const voicePhaseRef = useRef<VoicePhase>(null);

  // Listen mode state: "thinking" (pause before the answer plays), "answer-playing"
  // (correct answer being read), "verifying" (self-verify has taken over waiting)
  const [listenStage, setListenStage] = useState<ListenStage>(null);
  const listenStageRef = useRef<ListenStage>(null);
  const answerRef = useRef("");
  // True while the answer field holds a transcript (vs typed text). Spoken
  // answers get homologated when listening ends; typed ones never do.
  const answerSpokenRef = useRef(false);

  // The intro is spoken only before the first phrase of the session
  const introSpokenRef = useRef(false);

  // The full "di BIEN o MALO" prompt is spoken only the first time voice
  // self-verify kicks in; later phrases just get the short "Califica"
  const verifyPromptSpokenRef = useRef(false);

  // Bumped when the user advances or leaves; speech chains capture the value
  // at their start and bail if it changed, so stopping the current utterance
  // also cancels the queued ones instead of letting them overlap the next
  // phrase's audio
  const speechEpochRef = useRef(0);

  // Voice phases must never (re)activate the microphone once the screen lost
  // focus — every activation path checks this first
  const isFocusedRef = useRef(true);

  // Manual pause, available in every mode. Every automatic activation path
  // (TTS chains, timers, mic re-activation) checks this the same way it
  // checks isFocusedRef, so pausing mid-flight actually halts things instead
  // of just hiding them.
  const [paused, setPaused] = useState(false);
  const isPausedRef = useRef(false);

  function cancelSpeech() {
    speechEpochRef.current++;
    stopSpeaking();
  }

  // Keep refs in sync
  useEffect(() => {
    voicePhaseRef.current = voicePhase;
  }, [voicePhase]);
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);
  useEffect(() => {
    listenStageRef.current = listenStage;
  }, [listenStage]);
  // isPausedRef is set directly (not via effect) in handlePause/handleResume:
  // handleResume calls functions that check it synchronously, before a
  // state-driven effect would have run.

  // Find the list and start session
  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
    if (found && found.phrases.length > 0 && status === "idle" && !started) {
      setStarted(true);
      (async () => {
        // `order` comes from the list screen's random toggle; absent, phrases
        // play in their normal list order
        const ordered = reorderByIds(found.phrases, orderParam);

        // One sponsored phrase per session; the service resolves fast (cache
        // + fetch timeout) and to null on any failure, so it can't stall this
        const ad = await ads
          .getSessionAd({
            level: userLevel,
            nativeLanguage: found.nativeLanguage,
            targetLanguage: found.targetLanguage,
          })
          .catch(() => null);
        const sessionList = ad ? insertSessionAd(ordered, ad) : ordered;

        setSessionPhrases(sessionList);
        start(found.id, sessionList);

        // Whatever the detail screen (or a previous list) was still warming is
        // stale now — drop it so this session's audio doesn't queue behind it
        speech.cancelWarmups?.();

        // Fixed app messages: pinned (fixed speed, never purged). Idempotent —
        // cheap to call again if already warm from the lobby.
        speech.pregeneratePinned?.(fixedPromptsFor(found.targetLanguage), found.nativeLanguage);

        // Only warm the initial lookahead window, not the whole list — the
        // sliding-window effect below keeps it topped up as the user advances
        if (speech.pregenerate) {
          const lookahead = sessionList.slice(0, WINDOW_SIZE);
          speech.pregenerate(lookahead.map((p) => p.acceptedTranslations[0]), found.targetLanguage);
          speech.pregenerate(lookahead.map((p) => p.nativeSentence), found.nativeLanguage);
        }
      })();
    }
  }, [lists, id, status, start, started]);

  // Sliding lookahead window: keeps at most WINDOW_SIZE phrases warmed ahead
  // of the current one, per language. Advancing evicts the phrase that fell
  // behind (unless it's pinned/persisted) and warms the one that just entered
  // the tail of the window.
  useEffect(() => {
    if (!list || sessionPhrases.length === 0 || status !== "active") return;

    const currentIndex = progress.current - 1;
    // The initial window (indices 0..WINDOW_SIZE-1) is already warmed at session start
    if (currentIndex <= 0) return;

    const evictPhrase = sessionPhrases[currentIndex - 1];
    if (evictPhrase && speech.forget) {
      speech.forget([evictPhrase.acceptedTranslations[0]], list.targetLanguage);
      speech.forget([evictPhrase.nativeSentence], list.nativeLanguage);
    }

    const enterPhrase = sessionPhrases[currentIndex + WINDOW_SIZE - 1];
    if (enterPhrase && speech.pregenerate) {
      speech.pregenerate([enterPhrase.acceptedTranslations[0]], list.targetLanguage);
      speech.pregenerate([enterPhrase.nativeSentence], list.nativeLanguage);
    }
  }, [progress.current]);

  // Auto-speak the native sentence, then activate voice mode (manual mode) or
  // the thinking pause (listen mode). On the very first phrase, an intro is
  // read before it. Pulled out of the effect below so Resume can replay it
  // without waiting for currentPhrase/status to change.
  function presentCurrentPhrase() {
    if (!currentPhrase || !list) return;
    // Stop listening before TTS speaks to avoid capturing the app's own voice
    if (listening) {
      stopListening();
    }
    setVoicePhase(null);
    setListenStage(null);

    const withIntro = !introSpokenRef.current;
    introSpokenRef.current = true;

    const epoch = speechEpochRef.current;
    (async () => {
      if (withIntro) {
        await speakFixed(buildIntro(list.targetLanguage), list.nativeLanguage);
      }
      if (speechEpochRef.current !== epoch) return;
      await speak(currentPhrase.nativeSentence, list.nativeLanguage);
    })().then(() => {
      if (speechEpochRef.current !== epoch || isPausedRef.current) return;
      if (isListenMode) {
        startThinkingPause();
      } else if (voiceMode) {
        startVoicePhase("answer");
      }
    });
  }

  useEffect(() => {
    if (currentPhrase && list && status === "active" && !lastResult) {
      presentCurrentPhrase();
    }
  }, [currentPhrase?.id, status]);

  // Process transcript based on current voice phase
  useEffect(() => {
    if (!transcript) return;

    const phase = voicePhaseRef.current;
    const normalized = transcript.toLowerCase().trim();

    if (isListenMode && listenStageRef.current === "verifying") {
      if (
        normalized.includes("malo") ||
        normalized.includes("mal") ||
        normalized.includes("cal")
      ) {
        clearTranscript();
        if (listening) stopListening();
        finishListenPhrase(false);
      } else if (
        normalized.includes("bien") ||
        normalized.includes("bueno") ||
        normalized.includes("ven")
      ) {
        clearTranscript();
        if (listening) stopListening();
        finishListenPhrase(true);
      }
    } else if (phase === "answer") {
      // Just capture into the answer field
      answerSpokenRef.current = true;
      setAnswer(transcript);
    } else if (phase === "pre-command") {
      if (normalized.includes("verify") || normalized.includes("verificar")) {
        clearTranscript();
        setVoicePhase(null);
        // Use ref for the latest answer value
        if (answerRef.current.trim()) {
          doSubmit(answerRef.current.trim());
        }
      } else if (normalized.includes("repeat") || normalized.includes("repetir")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        // Clear answer, re-read phrase, go back to answer phase
        answerSpokenRef.current = false;
        setAnswer("");
        if (currentPhrase && list) {
          playBeep(600, 100);
          speak(currentPhrase.nativeSentence, list.nativeLanguage).then(() => {
            startVoicePhase("answer");
          });
        }
      }
    } else if (phase === "post-command") {
      if (normalized.includes("next") || normalized.includes("siguiente")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        handleNext();
      } else if (normalized.includes("repeat") || normalized.includes("repetir")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        if (currentPhrase && list) {
          speak(currentPhrase.acceptedTranslations[0], list.targetLanguage).then(() => {
            startVoicePhase("post-command");
          });
        }
      } else if (normalized.includes("stop") || normalized.includes("parar")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        handleCancelTimer();
        setTimeout(() => startVoicePhase("post-command"), 300);
      }
    } else if (!phase && !voiceMode) {
      // Manual mic usage (non-voice mode)
      answerSpokenRef.current = true;
      setAnswer(transcript);
    }
  }, [transcript]);

  // When listening stops: homologate the dictated answer (so the user sees
  // what was accepted BEFORE verifying), then in voice mode re-activate the
  // mic based on the current phase
  useEffect(() => {
    if (listening) return;
    // Paused: don't homologate or re-activate the mic. Resume replays the
    // current stage from scratch instead of continuing this one.
    if (isPausedRef.current) return;

    // Replace misheard-but-close spans (and proper nouns) with the expected
    // wording, visibly, in the answer field. Typed text is never touched.
    const homologateAnswer = () => {
      if (!answerSpokenRef.current || !currentPhrase) return;
      const spoken = answerRef.current.trim();
      if (!spoken) return;
      const homologated = homologateSpokenAnswer(
        spoken,
        currentPhrase.acceptedTranslations,
        currentPhrase.properNouns
      );
      console.log(
        `[Practice] transcripción: "${spoken}" -> homologado: "${homologated}"`
      );
      if (homologated !== spoken) {
        answerRef.current = homologated;
        setAnswer(homologated);
      }
    };

    if (isListenMode) {
      // Listen mode never uses the typed/spoken answer field — only the
      // verify step (if enabled) listens, and only to grade the phrase
      if (listenStageRef.current === "verifying" && voiceMode) {
        const timeout = setTimeout(() => {
          if (listenStageRef.current === "verifying") {
            clearTranscript();
            listen("en", VERIFY_CONTEXT);
          }
        }, 500);
        return () => clearTimeout(timeout);
      }
      return;
    }

    if (!voiceMode) {
      // Manual mic: give the final result event a beat to land, then homologate
      const timeout = setTimeout(homologateAnswer, 300);
      return () => clearTimeout(timeout);
    }

    const phase = voicePhaseRef.current;
    if (!phase) return;

    if (phase === "answer") {
      // User finished speaking their answer
      const timeout = setTimeout(() => {
        if (answerRef.current.trim()) {
          homologateAnswer();
          startVoicePhase("pre-command");
        } else {
          // Nothing captured, try listening again
          startVoicePhase("answer");
        }
      }, 700);
      return () => clearTimeout(timeout);
    }

    if (phase === "pre-command" || phase === "post-command") {
      // Command phase lost listening (timeout/silence) — re-activate
      const timeout = setTimeout(() => {
        // Only re-activate if still in the same command phase
        if (voicePhaseRef.current === phase) {
          clearTranscript();
          listen("en", COMMAND_CONTEXT);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [listening]);

  function startVoicePhase(phase: VoicePhase) {
    // Never reopen the mic on a screen the user already left, or while paused
    if (!isFocusedRef.current || isPausedRef.current) return;
    if (!list || speaking) {
      // If still speaking, retry after a short delay
      if (speaking) {
        setTimeout(() => startVoicePhase(phase), 300);
      }
      return;
    }
    // Ensure mic is off before starting a new phase
    if (listening) {
      stopListening();
    }
    playBeep(phase === "answer" ? 800 : phase === "pre-command" ? 1000 : 600, 120);
    setVoicePhase(phase);
    clearTranscript();

    // Listen in target language for answers, English for commands. Bias the
    // recognizer toward what we expect to hear: the phrase's own words (plus
    // its proper nouns) for answers, the fixed command set for commands.
    const listenLang = phase === "answer" ? list.targetLanguage : "en";
    const context =
      phase === "answer" && currentPhrase
        ? [...currentPhrase.acceptedTranslations, ...(currentPhrase.properNouns ?? [])]
        : COMMAND_CONTEXT;
    // Delay to avoid catching leftover audio or TTS echo; the guard covers a
    // blur happening inside that delay
    setTimeout(() => {
      if (isFocusedRef.current && !isPausedRef.current) listen(listenLang, context);
    }, 400);
  }

  /** Listen mode: pause after the native phrase so the user can produce their
   * own answer (mentally or aloud — not tracked), sized to the expected answer. */
  function startThinkingPause() {
    if (!isFocusedRef.current || isPausedRef.current || !currentPhrase) return;
    const target = currentPhrase.acceptedTranslations[0] ?? "";
    const wordCount = Math.max(1, target.trim().split(/\s+/).filter(Boolean).length);
    setListenStage("thinking");
    startTimer(thinkFirstWordSeconds + (wordCount - 1) * thinkPerExtraWordSeconds);
  }

  /** Listen mode: speak the correct answer, then either wait for self-verify or move on */
  function playCorrectAnswerThenContinue() {
    if (!isFocusedRef.current || isPausedRef.current || !currentPhrase || !list) return;
    setListenStage("answer-playing");
    const epoch = speechEpochRef.current;
    speak(currentPhrase.acceptedTranslations[0], list.targetLanguage).then(() => {
      if (speechEpochRef.current !== epoch || !isFocusedRef.current || isPausedRef.current) return;
      if (selfVerify) {
        startVerifyWait();
      } else {
        finishListenPhrase(null);
      }
    });
  }

  /** Listen mode + self-verify: wait up to VERIFY_SECONDS for a button tap or spoken result */
  function startVerifyWait() {
    if (!isFocusedRef.current || isPausedRef.current || !list) return;
    setListenStage("verifying");
    startTimer(VERIFY_SECONDS);
    if (voiceMode) {
      const epoch = speechEpochRef.current;
      const prompt = verifyPromptSpokenRef.current ? VERIFY_PROMPT_REPEAT : VERIFY_PROMPT_FIRST;
      verifyPromptSpokenRef.current = true;
      // Speak the grading prompt, then the same "your turn" beep used
      // elsewhere, before opening the mic — otherwise the user has no cue
      // that it's time to say "bien" or "malo".
      speakFixed(prompt, list.nativeLanguage).then(() => {
        if (speechEpochRef.current !== epoch || !isFocusedRef.current || isPausedRef.current) return;
        if (listenStageRef.current !== "verifying") return;
        playBeep(600, 100);
        setTimeout(() => {
          if (isFocusedRef.current && !isPausedRef.current && listenStageRef.current === "verifying") {
            clearTranscript();
            listen("en", VERIFY_CONTEXT);
          }
        }, 400);
      });
    }
  }

  /** Listen mode: record the self-graded result (if any) and advance. `isCorrect`
   * is null when self-verify is off, or the verify window timed out unanswered —
   * the phrase is practiced but not scored, like a sponsored phrase. */
  function finishListenPhrase(isCorrect: boolean | null) {
    if (listening) stopListening();
    setListenStage(null);
    if (isCorrect !== null && currentPhrase && list && !currentPhrase.sponsoredBy) {
      submitSelfGraded(isCorrect);
      recordPhraseResult(list.id, currentPhrase.id, isCorrect);
    }
    handleNext();
  }

  // Navigate to results when completed
  useEffect(() => {
    if (status === "completed") {
      // score excludes sponsored phrases, so the total must too
      router.replace(
        `/list/${id}/results?correct=${score.correct}&incorrect=${score.incorrect}&total=${score.correct + score.incorrect}&percentage=${score.percentage}`
      );
    }
  }, [status]);

  // Timer logic. Ticks every 100ms (not 1000ms) so sub-second durations —
  // the thinking pause can be configured down to fractions of a second —
  // fire close to on time instead of waiting for the next whole second.
  // Display still rounds up to whole seconds.
  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    const endAt = Date.now() + seconds * 1000;
    setCountdown(Math.ceil(seconds));
    timerRef.current = setInterval(() => {
      const remainingMs = endAt - Date.now();
      setCountdown(remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 1000));
    }, 100);
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (countdown !== 0) return;
    if (lastResult) {
      stopTimer();
      handleNext();
      return;
    }
    if (listenStage === "thinking") {
      stopTimer();
      playCorrectAnswerThenContinue();
    } else if (listenStage === "verifying") {
      stopTimer();
      if (listening) stopListening();
      // Timed out without a self-report: nothing to record, just move on
      finishListenPhrase(null);
    }
  }, [countdown]);

  // Blur, not unmount: the sidebar navigates with push(), which keeps this
  // screen mounted underneath the new one — an unmount cleanup would never
  // fire. Losing focus by any route (✕, sidebar, back) must silence the TTS,
  // kill queued speech chains, and release the microphone.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
        stopTimer();
        speechEpochRef.current++;
        speech.stop();
        stopListening();
        setVoicePhase(null);
        setListenStage(null);
        clearTranscript();
      };
    }, [speech, stopListening, clearTranscript])
  );

  // Enter advances to the next phrase, matching the hint shown next to the button.
  // The answer field handles Enter itself via onSubmitEditing, so this only runs
  // while feedback is on screen.
  useEffect(() => {
    if (Platform.OS !== "web" || !lastResult) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastResult]);

  function handleCancelTimer() {
    stopTimer();
    setCountdown(-1);
  }

  /** Listen mode: the user signals they already have their answer, cutting
   * the thinking pause short and jumping straight to the correct answer. */
  function handleReadyForAnswer() {
    if (listenStageRef.current !== "thinking" || isPausedRef.current) return;
    stopTimer();
    setCountdown(null);
    playCorrectAnswerThenContinue();
  }

  function doSubmit(answerText: string) {
    if (!currentPhrase || !list) return;
    // The phrase may still be being read (user answered early): cut it and
    // invalidate its chain so it can't overlap the feedback audio below
    cancelSpeech();
    // Stop listening before TTS feedback
    if (listening) {
      stopListening();
    }
    const result = submitAnswer(answerText);
    console.log(
      `[Practice] "${currentPhrase.nativeSentence}" -> ${answerSpokenRef.current ? "voz" : "texto"}: "${answerText}" | esperado: ${JSON.stringify(currentPhrase.acceptedTranslations)} | ${result.isCorrect ? "CORRECTO" : "INCORRECTO"}`
    );
    setLastResult(result);
    answerSpokenRef.current = false;
    setAnswer("");
    clearTranscript();
    setVoicePhase(null);
    // Sponsored phrases don't belong to the list — nothing to persist
    if (!currentPhrase.sponsoredBy) {
      recordPhraseResult(list.id, currentPhrase.id, result.isCorrect);
    }

    const prefix = result.isCorrect ? FEEDBACK_CORRECT : FEEDBACK_INCORRECT;
    const correctAnswer = currentPhrase.acceptedTranslations[0];

    const epoch = speechEpochRef.current;
    speakFixed(prefix, list.nativeLanguage).then(() => {
      if (speechEpochRef.current !== epoch) return;
      speak(correctAnswer, list.targetLanguage).then(() => {
        if (speechEpochRef.current !== epoch) return;
        startTimer(result.isCorrect ? TIMER_CORRECT_SECONDS : TIMER_INCORRECT_SECONDS);
        if (voiceMode) {
          startVoicePhase("post-command");
        }
      });
    });
  }

  function handleSubmit() {
    if (!answer.trim()) return;
    doSubmit(answer.trim());
  }

  function handleNext() {
    // Cut any feedback still being read so it can't overlap the next phrase
    cancelSpeech();
    stopTimer();
    setCountdown(null);
    setLastResult(null);
    setVoicePhase(null);
    setListenStage(null);
    clearTranscript();
    answerSpokenRef.current = false;
    setAnswer("");
    if (listening) stopListening();
    // Manually advancing always resumes normal playback for the phrase it lands on
    isPausedRef.current = false;
    setPaused(false);
    next();
  }

  /** Goes back to the previous phrase. Re-answering it replaces its earlier
   * result (see usePracticeSession) instead of double-counting the score. */
  function handlePrevious() {
    if (progress.current <= 1) return;
    cancelSpeech();
    stopTimer();
    setCountdown(null);
    setLastResult(null);
    setVoicePhase(null);
    setListenStage(null);
    clearTranscript();
    answerSpokenRef.current = false;
    setAnswer("");
    if (listening) stopListening();
    isPausedRef.current = false;
    setPaused(false);
    previous();
  }

  /** Freezes audio, timers and the mic. Available in every mode. */
  function handlePause() {
    if (isPausedRef.current) return;
    isPausedRef.current = true;
    setPaused(true);
    cancelSpeech();
    stopTimer();
    if (listening) stopListening();
  }

  /**
   * Resumes from wherever pausing left off. Rather than trying to restore an
   * exact mid-utterance/mid-countdown position, it replays the current
   * stage's audio and restarts its timer from the top.
   */
  function handleResume() {
    isPausedRef.current = false;
    setPaused(false);

    if (lastResult) {
      startTimer(lastResult.isCorrect ? TIMER_CORRECT_SECONDS : TIMER_INCORRECT_SECONDS);
      if (voiceMode) startVoicePhase("post-command");
      return;
    }

    if (isListenMode) {
      const stage = listenStageRef.current;
      if (stage === "thinking") startThinkingPause();
      else if (stage === "answer-playing") playCorrectAnswerThenContinue();
      else if (stage === "verifying") startVerifyWait();
      else presentCurrentPhrase();
      return;
    }

    if (voiceMode) {
      const phase = voicePhaseRef.current;
      if (phase === "answer" || phase === "pre-command" || phase === "post-command") {
        startVoicePhase(phase);
      } else {
        presentCurrentPhrase();
      }
    }
    // Plain manual mode (no voice): nothing auto-driven to resume — typing continues as-is
  }

  /** Paused + listen mode only: skip straight to revealing the correct answer,
   * resuming playback in the process. Mirrors handleReadyForAnswer, but usable
   * from any pre-reveal stage (including mid-pause before "thinking" even
   * started) instead of only the thinking pause. */
  function handleRevealWhilePaused() {
    if (!isPausedRef.current || !isListenMode) return;
    isPausedRef.current = false;
    setPaused(false);
    stopTimer();
    setCountdown(null);
    playCorrectAnswerThenContinue();
  }

  async function handleAddAsCorrect() {
    if (!lastResult || !currentPhrase || !list) return;
    if (!currentPhrase.sponsoredBy) {
      await addUserTranslation(list.id, currentPhrase.id, lastResult.userAnswer);
      await recordPhraseResult(list.id, currentPhrase.id, true);
    }
    overrideAsCorrect(currentPhrase.id);
    setLastResult({ ...lastResult, isCorrect: true, overridden: true });
    startTimer(TIMER_CORRECT_SECONDS);
  }

  function handleReplay() {
    if (currentPhrase && list) {
      speak(currentPhrase.nativeSentence, list.nativeLanguage);
    }
  }

  function handleMicPress() {
    if (listening) {
      stopListening();
    } else if (list) {
      listen(
        list.targetLanguage,
        currentPhrase
          ? [...currentPhrase.acceptedTranslations, ...(currentPhrase.properNouns ?? [])]
          : undefined
      );
    }
  }

  /** Leaves the session. Results already recorded are kept. */
  function handleExit() {
    cancelSpeech();
    stopTimer();
    if (listening) stopListening();
    // Fire-and-forget: the interstitial (at most one every 2 days) overlays
    // natively, so it doesn't need to block the navigation below
    void fullscreenAds.maybeShowSessionAd();
    // Detail is already underneath practice on the stack — pop back to it
    // instead of pushing a duplicate instance (which made the real one
    // underneath look like it "refreshed" on the next back press).
    router.back();
  }

  if (!list || status === "idle") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText themeColor="textSecondary">Cargando...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const percent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Progress: position, percentage, and a way out */}
        <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
          <ProgressBar percent={percent} color={Brand.accent} height={5} style={styles.bar} />
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {progress.current} / {progress.total} · {Math.round(percent)}%
          </Text>
          <Pressable
            onPress={handleExit}
            accessibilityLabel="Salir de la práctica"
            style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
          >
            <Text style={[styles.exitIcon, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        {!isListenMode && voiceMode && (
          <View style={styles.voiceIndicator}>
            <Text style={styles.voiceIndicatorText}>
              🎙️ Modo voz
              {paused && " · ⏸ Pausado"}
              {!paused && voicePhase === "answer" && " · Escuchando respuesta..."}
              {!paused && voicePhase === "pre-command" && ' · Di: "verify" o "repeat"'}
              {!paused && voicePhase === "post-command" && ' · Di: "next", "repeat" o "stop"'}
            </Text>
          </View>
        )}

        {isListenMode && (
          <View style={styles.voiceIndicator}>
            <Text style={styles.voiceIndicatorText}>
              🎧 Modo escucha
              {paused && " · ⏸ Pausado"}
              {!paused && listenStage === "thinking" && ` · Piensa tu respuesta... ${countdown ?? ""}s`}
              {!paused && listenStage === "answer-playing" && " · Reproduciendo respuesta correcta..."}
              {!paused && listenStage === "verifying" &&
                ` · ¿Lo hiciste bien?${voiceMode ? ' (di "bien" o "malo")' : ""} ${countdown ?? ""}s`}
            </Text>
          </View>
        )}

        {/* The phrase gets the vertical space; everything else hugs the edges.
            Wrapped in KeyboardAvoidingView so the footer's AnswerInput stays
            above the keyboard instead of being covered by it. */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
        <ContentContainer maxWidth={Layout.readingMaxWidth} style={styles.stage}>
          <View style={styles.phraseArea}>
            {currentPhrase?.sponsoredBy && (
              <View style={styles.sponsoredArea}>
                <View style={styles.sponsoredBadge}>
                  <Text style={styles.sponsoredText}>
                    📢 PUBLICIDAD PÚBLICA PAGADA
                  </Text>
                  <Text style={styles.sponsoredAdvertiser}>
                    {currentPhrase.sponsoredBy}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(ADVERTISE_WHATSAPP_URL)}
                  accessibilityLabel="Contactar por WhatsApp para publicitar"
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={[styles.advertiseCta, { color: colors.textMuted }]}>
                    ¿Quieres anunciarte aquí? 💬 Escríbenos por WhatsApp
                  </Text>
                </Pressable>
              </View>
            )}
            <Text style={[styles.prompt, { color: colors.textMuted }]}>
              Traduce al {languageName(list.targetLanguage).toUpperCase()}:
            </Text>
            <ThemedText style={styles.phrase}>{currentPhrase?.nativeSentence}</ThemedText>

            {/* Learning mode: the expected answer stays visible while typing.
                Hidden once feedback is up — it already shows the answer.
                Listen mode has its own reveal below instead. */}
            {!isListenMode && list.showTranslation && currentPhrase && !lastResult && (
              <TranslationsList
                key={`learn-${currentPhrase.id}`}
                translations={currentPhrase.acceptedTranslations}
                itemPrefix="💡 "
                textStyle={[styles.revealedTranslation, { color: colors.textSecondary }]}
                linkStyle={[styles.revealLink, { color: colors.textMuted }]}
              />
            )}

            {/* Listen mode: show the correct translation as text for as long as
                it's being read/graded — from the moment it starts playing until
                the phrase advances, not before (so it doesn't spoil the "think
                of your own answer" pause). */}
            {isListenMode &&
              (listenStage === "answer-playing" || listenStage === "verifying") &&
              currentPhrase && (
                <TranslationsList
                  key={`listen-${currentPhrase.id}`}
                  translations={currentPhrase.acceptedTranslations}
                  itemPrefix="💡 "
                  textStyle={[styles.revealedTranslation, { color: colors.textSecondary }]}
                  linkStyle={[styles.revealLink, { color: colors.textMuted }]}
                />
              )}

            <Pressable
              onPress={handleReplay}
              disabled={speaking}
              style={({ pressed }) => [
                styles.listen,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
                speaking && styles.disabled,
              ]}
            >
              <Text style={[styles.listenText, { color: Brand.accent }]}>
                {speaking ? "🔊 ..." : "🔊 Escuchar"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            {isListenMode ? (
              listenStage === "thinking" && !paused ? (
                <Pressable
                  onPress={handleReadyForAnswer}
                  style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
                >
                  <Text style={styles.nextButtonText}>Ya tengo la respuesta →</Text>
                </Pressable>
              ) : listenStage === "verifying" && selfVerify ? (
                <View style={styles.verifyRow}>
                  <Pressable
                    onPress={() => finishListenPhrase(true)}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      styles.verifyCorrect,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.verifyButtonText}>✓ Lo hice bien</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => finishListenPhrase(false)}
                    style={({ pressed }) => [
                      styles.verifyButton,
                      styles.verifyIncorrect,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.verifyButtonText}>✗ Lo hice mal</Text>
                  </Pressable>
                </View>
              ) : null
            ) : lastResult && currentPhrase ? (
              <>
                <PracticeFeedback
                  result={lastResult}
                  phrase={currentPhrase}
                  countdown={countdown}
                  onCancelTimer={handleCancelTimer}
                  onAddAsCorrect={handleAddAsCorrect}
                  onReplayAnswer={() => {
                    if (currentPhrase && list) {
                      speak(currentPhrase.acceptedTranslations[0], list.targetLanguage);
                    }
                  }}
                />
                <View style={styles.nextRow}>
                  <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.nextButtonText}>Siguiente →</Text>
                  </Pressable>
                  <Kbd>Enter</Kbd>
                </View>
              </>
            ) : (
              <AnswerInput
                value={answer}
                onChangeText={(text) => {
                  // Manual edits make it a typed answer — no homologation
                  answerSpokenRef.current = false;
                  setAnswer(text);
                }}
                onSubmit={handleSubmit}
                micAvailable={micAvailable}
                listening={listening}
                onMicPress={handleMicPress}
              />
            )}
          </View>
        </ContentContainer>
        </KeyboardAvoidingView>

        {/* Transport controls: available in every mode, regardless of stage.
            Pinned at the very bottom, below everything else. */}
        <View style={styles.bottomControls}>
          {paused && isListenMode && listenStage !== "answer-playing" && listenStage !== "verifying" && (
            <Pressable
              onPress={handleRevealWhilePaused}
              style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}
            >
              <Text style={styles.revealButtonText}>👁 Ya tengo la respuesta</Text>
            </Pressable>
          )}
          <View style={styles.controlsRow}>
            <Pressable
              onPress={handlePrevious}
              disabled={progress.current <= 1}
              accessibilityLabel="Frase anterior"
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
                progress.current <= 1 && styles.disabled,
              ]}
            >
              <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>
                ⏮ Anterior
              </Text>
            </Pressable>
            <Pressable
              onPress={paused ? handleResume : handlePause}
              accessibilityLabel={paused ? "Reanudar" : "Pausar"}
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>
                {paused ? "▶ Reanudar" : "⏸ Pausar"}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              accessibilityLabel="Siguiente frase"
              style={({ pressed }) => [
                styles.controlButton,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>
                Siguiente ⏭
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  bar: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 11,
  },
  exit: {
    padding: Spacing.one,
  },
  exitIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  bottomControls: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  controlsRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  controlButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  revealButton: {
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    alignItems: "center",
    backgroundColor: Brand.accent,
  },
  revealButtonText: {
    color: Brand.onPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  voiceIndicator: {
    alignSelf: "center",
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  voiceIndicatorText: {
    color: Brand.accentSoft,
    fontSize: 11,
    fontWeight: "600",
  },
  stage: {
    paddingHorizontal: Spacing.four,
  },
  phraseArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  prompt: {
    fontSize: 11,
  },
  sponsoredArea: {
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  sponsoredBadge: {
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Brand.accent,
  },
  sponsoredText: {
    color: Brand.onPrimary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sponsoredAdvertiser: {
    color: Brand.onPrimary,
    fontSize: 10,
    opacity: 0.85,
  },
  advertiseCta: {
    fontSize: 11,
    textDecorationLine: "underline",
  },
  phrase: {
    // Readable rather than oversized: long sentences still fit without shrinking
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
  },
  revealedTranslation: {
    fontSize: 16,
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },
  revealLink: {
    fontSize: 12,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  listen: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  listenText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  nextButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: "center",
    backgroundColor: Brand.accent,
  },
  nextButtonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  verifyRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  verifyButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  verifyCorrect: {
    backgroundColor: Brand.success,
  },
  verifyIncorrect: {
    backgroundColor: Brand.error,
  },
  verifyButtonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
