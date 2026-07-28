import { StyleSheet, Text, View } from "react-native";

import { LanguageBadge as BadgeColors, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface LanguagePairProps {
  native: string;
  target: string;
}

/**
 * The "ES → EN" chip pair shown on list cards.
 * Two tones so the direction of translation reads at a glance.
 */
export function LanguagePair({ native, target }: LanguagePairProps) {
  const colors = useTheme();

  return (
    <View style={styles.row}>
      <Badge
        label={native.toUpperCase()}
        surface={BadgeColors.native.surface}
        text={BadgeColors.native.text}
      />
      <Text style={[styles.arrow, { color: colors.textMuted }]}>→</Text>
      <Badge
        label={target.toUpperCase()}
        surface={BadgeColors.target.surface}
        text={BadgeColors.target.text}
      />
    </View>
  );
}

function Badge({
  label,
  surface,
  text,
}: {
  label: string;
  surface: string;
  text: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: surface }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
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
  arrow: {
    fontSize: 10,
  },
});
