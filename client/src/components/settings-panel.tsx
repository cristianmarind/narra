import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTheme } from "@/hooks/use-theme";
import { useTtsSpeed } from "@/hooks/use-tts-speed";
import { useServices } from "@/services";

const SPEED_OPTIONS = [
  { label: "Muy lenta", value: 0.4 },
  { label: "Lenta", value: 0.7 },
  { label: "Normal", value: 0.85 },
  { label: "Rápida", value: 1.0 },
];

/**
 * Theme and playback settings. Rendered inside a modal from the sidebar, so it
 * is the same panel on desktop and mobile.
 */
export function SettingsPanel() {
  const { mode, setMode } = useAppTheme();
  const { speed, setSpeed } = useTtsSpeed();
  const { speech } = useServices();
  const colors = useTheme();

  async function handleSpeedChange(newSpeed: number) {
    if (newSpeed === speed) return;
    setSpeed(newSpeed);
    // Cached audio was generated at the old speed, so it no longer matches
    if (speech.clearAllCache) {
      await speech.clearAllCache();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Tema
        </ThemedText>
        <View style={styles.optionsRow}>
          <OptionButton
            label="Claro"
            active={mode === "light"}
            onPress={() => setMode("light")}
          />
          <OptionButton
            label="Oscuro"
            active={mode === "dark"}
            onPress={() => setMode("dark")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Velocidad de lectura (inglés)
        </ThemedText>
        <View style={styles.optionsRow}>
          {SPEED_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              active={speed === opt.value}
              onPress={() => handleSpeedChange(opt.value)}
            />
          ))}
        </View>
        <ThemedText
          type="small"
          style={[styles.hint, { color: colors.textMuted }]}
        >
          Al cambiar se regenera el audio cacheado
        </ThemedText>
      </View>
    </View>
  );
}

function OptionButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderColor: colors.border },
        active && styles.optionActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[
          styles.optionText,
          { color: colors.textSecondary },
          active && styles.optionTextActive,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  option: {
    flexGrow: 1,
    flexBasis: 80,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  optionActive: {
    borderColor: Brand.accent,
    backgroundColor: `${Brand.accent}1A`,
  },
  optionText: {
    fontSize: 13,
  },
  optionTextActive: {
    color: Brand.accent,
    fontWeight: "600",
  },
  hint: {
    fontSize: 11,
    fontStyle: "italic",
  },
  pressed: {
    opacity: 0.7,
  },
});
