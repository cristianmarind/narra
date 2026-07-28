import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContentContainer } from "@/components/content-container";
import { Kbd } from "@/components/kbd";
import { ProgressBar } from "@/components/progress-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AnswerInput } from "@/components/practice/answer-input";
import { PracticeFeedback } from "@/components/practice/practice-feedback";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import {
  FEEDBACK_CORRECT,
  FEEDBACK_INCORRECT,
  buildIntro,
  fixedPromptsFor,
  languageName,
} from "@/constants/speech-prompts";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useTheme } from "@/hooks/use-theme";
import { useServices } from "@/services";
import type { PhraseList, PhraseResult } from "@/types";
import { playBeep, shuffle } from "@/utils";

const TIMER_CORRECT_SECONDS = 3;
const TIMER_INCORRECT_SECONDS = 15;

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
  const { id, voiceMode: voiceModeParam, random: randomParam } = useLocalSearchParams<{
    id: string;
    voiceMode?: string;
    random?: string;
  }>();
  const voiceMode = voiceModeParam === "1";
  const randomOrder = randomParam === "1";

  const { lists, addUserTranslation, recordPhraseResult } = usePhraseLists();
  const { speech } = useServices();
  const colors = useTheme();
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
      start(found.id, randomOrder ? shuffle(found.phrases) : found.phrases);

      // Pre-generate TTS audio in the background so rounds don't wait on it
      if (speech.pregenerate) {
        // Target language: the expected answers, read during feedback
        speech.pregenerate(
          found.phrases.map((p) => p.acceptedTranslations[0]),
          found.targetLanguage
        );
        // Native language: the fixed app phrases plus every prompt sentence
        speech.pregenerate(
          [
            ...fixedPromptsFor(found.targetLanguage),
            ...found.phrases.map((p) => p.nativeSentence),
          ],
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

    const prefix = result.isCorrect ? FEEDBACK_CORRECT : FEEDBACK_INCORRECT;
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

  /** Leaves the session. Results already recorded are kept. */
  function handleExit() {
    stopTimer();
    if (listening) stopListening();
    router.replace(`/list/${id}`);
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

        {voiceMode && (
          <View style={styles.voiceIndicator}>
            <Text style={styles.voiceIndicatorText}>
              🎙️ Modo voz
              {voicePhase === "answer" && " · Escuchando respuesta..."}
              {voicePhase === "pre-command" && ' · Di: "verify" o "repeat"'}
              {voicePhase === "post-command" && ' · Di: "next", "repeat" o "stop"'}
            </Text>
          </View>
        )}

        {/* The phrase gets the vertical space; everything else hugs the edges */}
        <ContentContainer maxWidth={Layout.readingMaxWidth} style={styles.stage}>
          <View style={styles.phraseArea}>
            <Text style={[styles.prompt, { color: colors.textMuted }]}>
              Traduce al {languageName(list.targetLanguage).toUpperCase()}:
            </Text>
            <ThemedText style={styles.phrase}>{currentPhrase?.nativeSentence}</ThemedText>

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
            {lastResult && currentPhrase ? (
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
                onChangeText={setAnswer}
                onSubmit={handleSubmit}
                micAvailable={micAvailable}
                listening={listening}
                onMicPress={handleMicPress}
              />
            )}
          </View>
        </ContentContainer>
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
  voiceIndicator: {
    alignSelf: "center",
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
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
  phrase: {
    // Readable rather than oversized: long sentences still fit without shrinking
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
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
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
