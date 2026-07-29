import { Pressable, StyleSheet, Text, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

export interface Crumb {
  label: string;
  /** Omit on the last crumb, which represents the current screen */
  onPress?: () => void;
}

/**
 * Trail showing where the user is.
 *
 * Mainly for desktop: mobile already has a back arrow in the header, so callers
 * typically render this only on wider layouts.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row} accessibilityRole="header">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <View key={`${item.label}-${index}`} style={styles.item}>
            {item.onPress && !isLast ? (
              <Pressable
                onPress={item.onPress}
                accessibilityRole="link"
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Text style={[styles.link, { color: colors.textSecondary }]}>
                  {item.label}
                </Text>
              </Pressable>
            ) : (
              <Text
                style={[styles.current, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            )}

            {!isLast && (
              <Text style={[styles.separator, { color: colors.textMuted }]}>›</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  link: {
    fontSize: 11,
  },
  current: {
    fontSize: 11,
  },
  separator: {
    fontSize: 11,
    marginHorizontal: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
