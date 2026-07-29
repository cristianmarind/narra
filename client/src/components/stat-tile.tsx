import { StyleSheet, Text, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface StatTileProps {
  value: string | number;
  label: string;
  /** Color for the number; defaults to the primary text color */
  color?: string;
}

/**
 * A single figure with a caption, on a recessed surface.
 * Replaces the stacked plain text stats, which were hard to scan.
 */
export function StatTile({ value, label, color }: StatTileProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}>
      <Text style={[styles.value, { color: color ?? colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 84,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
    alignItems: "center",
    gap: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: "600",
  },
  label: {
    fontSize: 10,
  },
});
