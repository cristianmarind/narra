import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useSpeech } from "@/hooks/use-speech";
import type { PhraseList, PhraseResult } from "@/types";

export default function PracticeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists } = usePhraseLists();
  const router = useRouter();
  const { speak, speaking } = useSpeech();
  const {
    status,
    currentPhrase,
    progress,
    score,
    start,
    submitAnswer,
    next,
  } = usePracticeSession();

  const [answer, setAnswer] = useState("");
  const [lastResult, setLastResult] = useState<PhraseResult | null>(null);
  const [list, setList] = useState<PhraseList | null>(null);
  const [started, setStarted] = useState(false);

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

  // Navigate to results when completed
  useEffect(() => {
    if (status === "completed") {
      router.replace(
        `/list/${id}/results?correct=${score.correct}&incorrect=${score.incorrect}&total=${progress.total}&percentage=${score.percentage}`
      );
    }
  }, [status]);

  function handleSubmit() {
    if (!answer.trim() || !currentPhrase) return;
    const result = submitAnswer(answer.trim());
    setLastResult(result);
    setAnswer("");
  }

  function handleNext() {
    setLastResult(null);
    next();
  }

  function handleReplay() {
    if (currentPhrase && list) {
      speak(currentPhrase.nativeSentence, list.nativeLanguage);
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

        {/* Feedback area */}
        {lastResult && (
          <View
            style={[
              styles.feedback,
              lastResult.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
            ]}
          >
            <ThemedText style={styles.feedbackTitle}>
              {lastResult.isCorrect ? "✓ Correcto" : "✗ Incorrecto"}
            </ThemedText>
            {!lastResult.isCorrect && currentPhrase && (
              <ThemedText type="small" style={styles.feedbackDetail}>
                Respuesta esperada: {currentPhrase.acceptedTranslations[0]}
              </ThemedText>
            )}
          </View>
        )}

        {/* Input / Next area */}
        <View style={styles.inputSection}>
          {!lastResult ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Escribe tu traducción..."
                value={answer}
                onChangeText={setAnswer}
                onSubmitEditing={handleSubmit}
                returnKeyType="send"
                autoFocus
              />
              <Pressable
                onPress={handleSubmit}
                disabled={!answer.trim()}
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed && styles.pressed,
                  !answer.trim() && styles.disabled,
                ]}
              >
                <ThemedText style={styles.primaryButtonText}>
                  Verificar
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.button,
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                Siguiente →
              </ThemedText>
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
  feedback: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  feedbackCorrect: {
    backgroundColor: "#D4EDDA",
  },
  feedbackIncorrect: {
    backgroundColor: "#F8D7DA",
  },
  feedbackTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  feedbackDetail: {
    color: "#555",
  },
  inputSection: {
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    color: "#fff",
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4A90D9",
  },
  primaryButtonText: {
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
