import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import type { Phrase } from "@/types";

interface PhraseCardViewProps {
  phrase: Phrase;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * Read-only card displaying a phrase with its translations and stats.
 * Tap to edit, long-press to delete.
 */
export function PhraseCardView({ phrase, onPress, onLongPress }: PhraseCardViewProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText>{phrase.nativeSentence}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          → {phrase.acceptedTranslations.join(" / ")}
        </ThemedText>
        {phrase.stats &&
          (phrase.stats.correctCount > 0 || phrase.stats.incorrectCount > 0) && (
            <View style={styles.statsRow}>
              <ThemedText type="small" style={styles.statCorrect}>
                ✓ {phrase.stats.correctCount}
              </ThemedText>
              <ThemedText type="small" style={styles.statIncorrect}>
                ✗ {phrase.stats.incorrectCount}
              </ThemedText>
            </View>
          )}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: 2,
  },
  statCorrect: {
    color: Brand.success,
    fontWeight: "600",
  },
  statIncorrect: {
    color: Brand.error,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
