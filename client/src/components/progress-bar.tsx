import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Radius } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface ProgressBarProps {
  /** 0-100 */
  percent: number;
  color: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Thin track with a colored fill, used for accuracy and session progress. */
export function ProgressBar({ percent, color, height = 4, style }: ProgressBarProps) {
  const { colors } = useAppTheme();
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.track, height, borderRadius: height / 2 },
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
});
