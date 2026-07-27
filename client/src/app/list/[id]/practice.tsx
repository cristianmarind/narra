import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AnswerInput } from "@/components/practice/answer-input";
import { PracticeFeedback } from "@/components/practice/practice-feedback";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useServices } from "@/services";
import type { PhraseList, PhraseResult } from "@/types";
import { playBeep } from "@/utils";

const TIMER_CORRECT_SECONDS = 3;
const TIMER_INCORRECT_SECONDS = 15;

/**
 * Spanish names for target languages, used in the spoken intro.
 * Lowercase on purpose: TTS engines tend to spell out uppercase words.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "inglés",
  es: "español",
  fr: "francés",
  it: "italiano",
  pt: "portugués",
  de: "alemán",
};

function languageName(code: string): string {
  const base = code.toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_NAMES[base] ?? code;
}

/** Spoken once, before the first phrase of the session */
function buildIntro(targetLanguage: string): string {
  return `Traduce al ${languageName(targetLanguage)} las frases, empecemos con la primera.`;
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

export default function PracticeScreen() {
  const { id, voiceMode: voiceModeParam } = useLocalSearchParams<{
    id: string;
    voiceMode?: string;
  }>();
  const voiceMode = voiceModeParam === "1";

  const { lists, addUserTranslation, recordPhraseResult } = usePhraseLists();
  const { speech } = useServices();
  const router = useRouter();
  const { speak, speaking } = useSpeech();
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
    overrideAsCorrect,
    next,
  } = usePracticeSession();

  const [answer, setAnswer] = useState("");
  const [lastResult, setLastResult] = useState<PhraseResult | null>(null);
  const [list, setList] = useState<PhraseList | null>(null);
  const [started, setStarted] = useState(false);

  // Timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice mode state
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(null);
  const voicePhaseRef = useRef<VoicePhase>(null);
  const answerRef = useRef("");

  // The intro is spoken only before the first phrase of the session
  const introSpokenRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    voicePhaseRef.current = voicePhase;
  }, [voicePhase]);
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // Find the list and start session
  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
    if (found && found.phrases.length > 0 && status === "idle" && !started) {
      setStarted(true);
      start(found.id, found.phrases);

      // Pre-generate TTS audio in the background so rounds don't wait on it
      if (speech.pregenerate) {
        // Target language: the expected answers, read during feedback
        speech.pregenerate(
          found.phrases.map((p) => p.acceptedTranslations[0]),
          found.targetLanguage
        );
        // Native language: the intro plus every prompt sentence
        speech.pregenerate(
          [buildIntro(found.targetLanguage), ...found.phrases.map((p) => p.nativeSentence)],
          found.nativeLanguage
        );
      }
    }
  }, [lists, id, status, start, started]);

  // Auto-speak the native sentence when phrase changes, then activate voice mode.
  // On the very first phrase, an intro is read before it.
  useEffect(() => {
    if (currentPhrase && list && status === "active" && !lastResult) {
      // Stop listening before TTS speaks to avoid capturing the app's own voice
      if (listening) {
        stopListening();
      }
      setVoicePhase(null);

      const withIntro = !introSpokenRef.current;
      introSpokenRef.current = true;

      (async () => {
        if (withIntro) {
          await speak(buildIntro(list.targetLanguage), list.nativeLanguage);
        }
        await speak(currentPhrase.nativeSentence, list.nativeLanguage);
      })().then(() => {
        if (voiceMode) {
          startVoicePhase("answer");
        }
      });
    }
  }, [currentPhrase?.id, status]);

  // Process transcript based on current voice phase
  useEffect(() => {
    if (!transcript) return;

    const phase = voicePhaseRef.current;
    const normalized = transcript.toLowerCase().trim();

    if (phase === "answer") {
      // Just capture into the answer field
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
      setAnswer(transcript);
    }
  }, [transcript]);

  // When listening stops in voice mode, handle re-activation based on phase
  useEffect(() => {
    if (!voiceMode || listening) return;

    const phase = voicePhaseRef.current;
    if (!phase) return;

    if (phase === "answer") {
      // User finished speaking their answer
      const timeout = setTimeout(() => {
        if (answerRef.current.trim()) {
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
          listen("en");
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [listening]);

  function startVoicePhase(phase: VoicePhase) {
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

    // Listen in target language for answers, English for commands
    const listenLang = phase === "answer" ? list.targetLanguage : "en";
    // Delay to avoid catching leftover audio or TTS echo
    setTimeout(() => {
      listen(listenLang);
    }, 400);
  }

  // Navigate to results when completed
  useEffect(() => {
    if (status === "completed") {
      router.replace(
        `/list/${id}/results?correct=${score.correct}&incorrect=${score.incorrect}&total=${progress.total}&percentage=${score.percentage}`
      );
    }
  }, [status]);

  // Timer logic
  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (countdown === 0 && lastResult) {
      stopTimer();
      handleNext();
    }
  }, [countdown]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  function handleCancelTimer() {
    stopTimer();
    setCountdown(-1);
  }

  function doSubmit(answerText: string) {
    if (!currentPhrase || !list) return;
    // Stop listening before TTS feedback
    if (listening) {
      stopListening();
    }
    const result = submitAnswer(answerText);
    setLastResult(result);
    setAnswer("");
    clearTranscript();
    setVoicePhase(null);
    recordPhraseResult(list.id, currentPhrase.id, result.isCorrect);

    const prefix = result.isCorrect ? "Correcto" : "Incorrecto";
    const correctAnswer = currentPhrase.acceptedTranslations[0];

    speak(prefix, list.nativeLanguage).then(() => {
      speak(correctAnswer, list.targetLanguage).then(() => {
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
    stopTimer();
    setCountdown(null);
    setLastResult(null);
    setVoicePhase(null);
    clearTranscript();
    setAnswer("");
    next();
  }

  async function handleAddAsCorrect() {
    if (!lastResult || !currentPhrase || !list) return;
    await addUserTranslation(list.id, currentPhrase.id, lastResult.userAnswer);
    await recordPhraseResult(list.id, currentPhrase.id, true);
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
      listen(list.targetLanguage);
    }
  }

  if (!list || status === "idle") {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.center}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(progress.current / progress.total) * 100}%` },
              ]}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {progress.current} / {progress.total}
          </ThemedText>
        </View>

        {/* Voice mode indicator */}
        {voiceMode && (
          <View style={styles.voiceIndicator}>
            <ThemedText type="small" style={styles.voiceIndicatorText}>
              🎙️ Modo voz
              {voicePhase === "answer" && " · Escuchando respuesta..."}
              {voicePhase === "pre-command" && ' · Di: "verify" o "repeat"'}
              {voicePhase === "post-command" &&
                ' · Di: "next", "repeat" o "stop"'}
            </ThemedText>
          </View>
        )}

        {/* Phrase display */}
        <View style={styles.phraseSection}>
          <ThemedText type="small" themeColor="textSecondary">
            Traduce al {list.targetLanguage.toUpperCase()}:
          </ThemedText>
          <ThemedText type="title" style={styles.phraseText}>
            {currentPhrase?.nativeSentence}
          </ThemedText>
          <Pressable
            onPress={handleReplay}
            disabled={speaking}
            style={({ pressed }) => [
              styles.speakButton,
              pressed && styles.pressed,
              speaking && styles.disabled,
            ]}
          >
            <ThemedText style={styles.speakButtonText}>
              {speaking ? "🔊 ..." : "🔊 Escuchar"}
            </ThemedText>
          </Pressable>
        </View>

        {/* Feedback */}
        {lastResult && currentPhrase && (
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
        )}

        {/* Input / Next */}
        <View style={styles.inputSection}>
          {!lastResult ? (
            <AnswerInput
              value={answer}
              onChangeText={setAnswer}
              onSubmit={handleSubmit}
              micAvailable={micAvailable}
              listening={listening}
              onMicPress={handleMicPress}
            />
          ) : (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>Siguiente →</ThemedText>
            </Pressable>
          )}
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
    padding: Spacing.three,
    gap: Spacing.three,
  },
  center: {
    textAlign: "center",
    marginTop: Spacing.six,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A90D9",
    borderRadius: 3,
  },
  voiceIndicator: {
    backgroundColor: "#1a1a2e",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    alignSelf: "center",
  },
  voiceIndicatorText: {
    color: "#4A90D9",
    fontWeight: "600",
  },
  phraseSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.three,
  },
  phraseText: {
    textAlign: "center",
  },
  speakButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: "#F0F0F3",
  },
  speakButtonText: {
    fontSize: 14,
  },
  inputSection: {
    gap: Spacing.two,
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    backgroundColor: "#4A90D9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
