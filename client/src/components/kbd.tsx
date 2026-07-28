import { Platform, StyleSheet, Text, View } from "react-native";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/**
 * Keyboard shortcut hint, styled like an HTML `<kbd>`.
 *
 * Renders nothing on native, where there is no physical keyboard to press.
 */
export function Kbd({ children }: { children: string }) {
  const colors = useTheme();

  if (Platform.OS !== "web") return null;

  return (
    <View
      style={[styles.key, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  key: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: "monospace",
  },
});
