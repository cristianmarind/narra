import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Spacing } from "@/constants/theme";
import type { Phrase, PhraseResult } from "@/types";

interface PracticeFeedbackProps {
  result: PhraseResult;
  phrase: Phrase;
  countdown: number | null;
  onCancelTimer: () => void;
  onAddAsCorrect: () => void;
  onReplayAnswer: () => void;
}

/**
 * Feedback card shown after the user submits an answer.
 * Shows correct/incorrect status, expected answer, countdown timer, and override option.
 */
export function PracticeFeedback({
  result,
  phrase,
  countdown,
  onCancelTimer,
  onAddAsCorrect,
  onReplayAnswer,
}: PracticeFeedbackProps) {
  return (
    <View
      style={[
        styles.feedback,
        result.isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect,
      ]}
    >
      <View style={styles.feedbackHeader}>
        <ThemedText style={styles.feedbackTitle}>
          {result.isCorrect
            ? result.overridden
              ? "✓ Aceptada (agregada por ti)"
              : "✓ Correcto"
            : "✗ Incorrecto"}
        </ThemedText>

        {/* Countdown timer badge */}
        {countdown !== null && countdown > 0 && (
          <Pressable onPress={onCancelTimer} style={styles.timerBadge}>
            <ThemedText style={styles.timerText}>{countdown}s ✕</ThemedText>
          </Pressable>
        )}
        {countdown === -1 && (
          <ThemedText type="small" style={styles.timerCancelled}>
            pausado
          </ThemedText>
        )}
      </View>

      {/* Replay correct answer */}
      <Pressable
        onPress={onReplayAnswer}
        style={({ pressed }) => [styles.replayButton, pressed && styles.pressed]}
      >
        <ThemedText style={styles.replayButtonText}>
          🔊 Repetir respuesta
        </ThemedText>
      </Pressable>

      {!result.isCorrect && (
        <>
          <ThemedText type="small" style={styles.feedbackDetail}>
            Respuesta esperada: {phrase.acceptedTranslations[0]}
          </ThemedText>
          <ThemedText type="small" style={styles.feedbackDetail}>
            Tu respuesta: "{result.userAnswer}"
          </ThemedText>
          <Pressable
            onPress={onAddAsCorrect}
            style={({ pressed }) => [
              styles.overrideButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.overrideButtonText}>
              ✚ Agregar como correcta
            </ThemedText>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feedback: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  feedbackCorrect: {
    backgroundColor: "#D4EDDA",
  },
  feedbackIncorrect: {
    backgroundColor: "#F8D7DA",
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  feedbackDetail: {
    color: "#555",
  },
  timerBadge: {
    backgroundColor: "#00000020",
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.one,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  timerCancelled: {
    color: "#888",
    fontStyle: "italic",
  },
  overrideButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: Brand.accent,
    marginTop: Spacing.one,
  },
  overrideButtonText: {
    color: Brand.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  replayButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    backgroundColor: "#00000010",
  },
  replayButtonText: {
    fontSize: 13,
    color: "#333",
  },
  pressed: {
    opacity: 0.7,
  },
});
