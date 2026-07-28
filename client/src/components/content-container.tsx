import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Layout } from "@/constants/theme";

interface ContentContainerProps {
  children: React.ReactNode;
  /**
   * Widest the content may grow. Defaults to the dashboard width; use
   * `Layout.formMaxWidth` for forms and `Layout.readingMaxWidth` for prose.
   */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Caps content width and centers it.
 *
 * Without this every screen stretches edge to edge on desktop, which is the main
 * problem with the original mobile-first layout: lines get too long to scan and
 * cards become absurdly wide.
 */
export function ContentContainer({
  children,
  maxWidth = Layout.contentMaxWidth,
  style,
}: ContentContainerProps) {
  return <View style={[styles.container, { maxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
    flex: 1,
  },
});
