import { Pressable, StyleSheet, Text, View } from "react-native";

import { Feedback, Radius, Spacing } from "@/constants/theme";
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
 * Result of the submitted answer.
 *
 * Compact on purpose: it appears below the phrase without pushing it out of view,
 * and the auto-advance countdown doubles as the cancel control.
 */
export function PracticeFeedback({
  result,
  phrase,
  countdown,
  onCancelTimer,
  onAddAsCorrect,
  onReplayAnswer,
}: PracticeFeedbackProps) {
  const tone = result.isCorrect ? Feedback.correct : Feedback.incorrect;

  const title = result.isCorrect
    ? result.overridden
      ? "✓ Aceptada (agregada por ti)"
      : "✓ Correcto"
    : "✗ Incorrecto";

  return (
    <View style={[styles.card, { backgroundColor: tone.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: tone.text }]}>{title}</Text>

          <Pressable
            onPress={onReplayAnswer}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={[styles.link, { color: tone.strong }]}>🔊 Repetir respuesta</Text>
          </Pressable>
        </View>

        {/* Auto-advance countdown; tapping it cancels so you can linger */}
        {countdown !== null && countdown > 0 && (
          <Pressable
            onPress={onCancelTimer}
            accessibilityLabel="Cancelar avance automático"
            style={({ pressed }) => [
              styles.badge,
              { backgroundColor: `${tone.strong}26` },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.badgeText, { color: tone.strong }]}>auto {countdown}s ✕</Text>
          </Pressable>
        )}
        {countdown === -1 && (
          <Text style={[styles.paused, { color: tone.text }]}>pausado</Text>
        )}
      </View>

      {!result.isCorrect && (
        <View style={styles.details}>
          <Text style={[styles.detail, { color: tone.text }]}>
            Esperada: {phrase.acceptedTranslations[0]}
          </Text>
          <Text style={[styles.detail, { color: tone.text }]}>
            Tu respuesta: "{result.userAnswer}"
          </Text>

          <Pressable
            onPress={onAddAsCorrect}
            style={({ pressed }) => [
              styles.override,
              { borderColor: tone.strong },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.overrideText, { color: tone.text }]}>
              ✚ Agregar como correcta
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  link: {
    fontSize: 11,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paused: {
    fontSize: 10,
    fontStyle: "italic",
  },
  details: {
    gap: Spacing.one,
  },
  detail: {
    fontSize: 12,
  },
  override: {
    alignSelf: "flex-start",
    marginTop: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  overrideText: {
    fontSize: 11,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
