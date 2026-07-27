/**
 * Narra brand mark, rebuilt as native views.
 *
 * The design lives in `assets/brand/*.svg`. Those files stay the source of truth
 * for generating raster icons, but the in-app logo is composed from Views so it
 * renders on web and native without pulling in an SVG runtime, and so it can be
 * animated later (the bars map naturally to playback state).
 *
 * Proportions are derived from `narra-icon.svg` (512x512 viewBox):
 * five rounded bars at x = 136, 208, 280, 352, 424 with a stroke width of 36.
 * Bar heights below include the round caps, which extend past the line ends.
 */

import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { Brand } from "@/constants/theme";

/** Bar heights as a fraction of the mark's size, shortest to tallest and back */
const BAR_HEIGHTS = [36, 172, 292, 204, 116].map((h) => h / 512);

/** Bar width and the gap between bars, as fractions of the mark's size */
const BAR_WIDTH = 36 / 512;
const BAR_GAP = 36 / 512;

/** Corner radius of the rounded square, as a fraction of its size */
const CORNER_RADIUS = 112 / 512;

export type LogoVariant = "light" | "dark";

interface NarraMarkProps {
  /** Width and height of the rounded square, in points */
  size?: number;
  /**
   * "light" = violet tile with white bars (narra-icon.svg)
   * "dark"  = indigo tile with lavender bars (narra-dark.svg)
   */
  variant?: LogoVariant;
  style?: StyleProp<ViewStyle>;
}

/** The rounded-square app mark on its own. */
export function NarraMark({ size = 40, variant = "light", style }: NarraMarkProps) {
  const isDark = variant === "dark";
  const tileColor = isDark ? Brand.primary : Brand.accent;
  const barColor = isDark ? Brand.accentSoft : Brand.onPrimary;

  const barWidth = size * BAR_WIDTH;
  const gap = size * BAR_GAP;

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size * CORNER_RADIUS,
          backgroundColor: tileColor,
          gap,
        },
        style,
      ]}
    >
      {BAR_HEIGHTS.map((fraction, index) => {
        const height = size * fraction;
        return (
          <View
            key={index}
            style={{
              width: barWidth,
              height,
              // Round caps: a fully rounded bar matches stroke-linecap="round"
              borderRadius: barWidth / 2,
              backgroundColor: barColor,
              // The center bar is brightest in the dark variant
              opacity: isDark && index === 2 ? 1 : undefined,
            }}
          />
        );
      })}
    </View>
  );
}

interface NarraLogoProps {
  /** Height of the mark; the wordmark scales with it */
  size?: number;
  variant?: LogoVariant;
  /** Hide the "narra" text and show only the mark */
  markOnly?: boolean;
  /** Overrides the wordmark color, which defaults to the brand primary */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** The mark followed by the "narra" wordmark, matching narra-horizontal.svg. */
export function NarraLogo({
  size = 32,
  variant = "light",
  markOnly = false,
  color,
  style,
}: NarraLogoProps) {
  if (markOnly) {
    return <NarraMark size={size} variant={variant} style={style} />;
  }

  return (
    <View style={[styles.row, { gap: size * 0.25 }, style]}>
      <NarraMark size={size} variant={variant} />
      <Text
        style={[
          styles.wordmark,
          {
            fontSize: size * 0.62,
            letterSpacing: size * -0.02,
            color: color ?? (variant === "dark" ? Brand.accentSoft : Brand.primary),
          },
        ]}
      >
        narra
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmark: {
    fontWeight: "500",
    // Keeps the baseline aligned with the mark instead of the text box
    includeFontPadding: false,
  },
});
