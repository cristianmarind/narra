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
import type { PhraseList, PhraseResult } from "@/types";

const TIMER_CORRECT_SECONDS = 3;
const TIMER_INCORRECT_SECONDS = 15;

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, addUserTranslation, recordPhraseResult } = usePhraseLists();
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

  // Find the list and start session
  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
    if (found && found.phrases.length > 0 && status === "idle" && !started) {
      setStarted(true);
      start(found.id, found.phrases);
    }
  }, [lists, id, status, start, started]);

  // Auto-speak the native sentence when phrase changes
  useEffect(() => {
    if (currentPhrase && list && status === "active") {
      speak(currentPhrase.nativeSentence, list.nativeLanguage);
    }
  }, [currentPhrase?.id, status]);

  // Sync speech recognition transcript into the answer field
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
    }
  }, [transcript]);

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

  function handleSubmit() {
    if (!answer.trim() || !currentPhrase || !list) return;
    const result = submitAnswer(answer.trim());
    setLastResult(result);
    setAnswer("");
    clearTranscript();
    recordPhraseResult(list.id, currentPhrase.id, result.isCorrect);

    // Speak feedback in native language, then the correct answer in target language
    const prefix = result.isCorrect ? "Correcto" : "Incorrecto";
    const correctAnswer = currentPhrase.acceptedTranslations[0];

    speak(prefix, list.nativeLanguage).then(() => {
      speak(correctAnswer, list.targetLanguage).then(() => {
        startTimer(result.isCorrect ? TIMER_CORRECT_SECONDS : TIMER_INCORRECT_SECONDS);
      });
    });
  }

  function handleNext() {
    stopTimer();
    setCountdown(null);
    setLastResult(null);
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
