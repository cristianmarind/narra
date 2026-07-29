import { Pressable, StyleSheet, Text, View } from "react-native";

import { LanguagePair } from "@/components/language-badge";
import { ProgressBar } from "@/components/progress-bar";
import { ThemedText } from "@/components/themed-text";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import type { PhraseList } from "@/types";
import { formatRelativeTime, getListStats } from "@/utils";

/** Accuracy at or above this reads as "doing well" and turns the bar green */
const GOOD_ACCURACY = 70;

interface ListCardProps {
  list: PhraseList;
  onPress: () => void;
}

/**
 * A list in the home grid.
 *
 * Surfaces accuracy and last practice up front so the user can pick what to work
 * on without opening each list, which was the main gap in the old row layout.
 */
export function ListCard({ list, onPress }: ListCardProps) {
  const { colors } = useAppTheme();
  const { accuracy } = getListStats(list);
  const lastPracticed = formatRelativeTime(list.lastPracticedAt);

  const phraseCount = list.phrases.length;
  const barColor = (accuracy ?? 0) >= GOOD_ACCURACY ? Brand.success : Brand.accent;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Lista ${list.name}, ${phraseCount} frases`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <LanguagePair native={list.nativeLanguage} target={list.targetLanguage} />
        <Text style={[styles.count, { color: colors.textMuted }]}>
          {phraseCount} {phraseCount === 1 ? "frase" : "frases"}
        </Text>
      </View>

      <ThemedText style={styles.name} numberOfLines={2}>
        {list.name}
      </ThemedText>

      {/* Practiced lists show progress; new ones show a prompt instead of an
          empty 0% bar, which would read as failure rather than "not started" */}
      {accuracy !== null ? (
        <View style={styles.footer}>
          <ProgressBar percent={accuracy} color={barColor} />
          <View style={styles.footerRow}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {accuracy}% precisión
            </Text>
            {lastPracticed && (
              <Text style={[styles.meta, { color: colors.textMuted }]}>{lastPracticed}</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {phraseCount === 0 ? "Sin frases todavía" : "Sin practicar"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Dashed tile that sits at the end of the grid as an inline create action. */
export function NewListCard({ onPress }: { onPress: () => void }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Nueva lista"
      style={({ pressed }) => [
        styles.card,
        styles.newCard,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.plus, { color: colors.textMuted }]}>+</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>Nueva lista</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.three,
    gap: Spacing.two,
    // Keeps every tile in a grid row the same height regardless of name length
    minHeight: 132,
  },
  newCard: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  footer: {
    gap: Spacing.one,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  count: {
    fontSize: 10,
  },
  meta: {
    fontSize: 11,
  },
  plus: {
    fontSize: 24,
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.7,
  },
});
