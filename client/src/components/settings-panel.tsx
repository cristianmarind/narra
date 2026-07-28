import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTheme } from "@/hooks/use-theme";
import { useTtsSpeed } from "@/hooks/use-tts-speed";
import { useServices } from "@/services";
import type { VoiceEngineStatus } from "@/types";

const SPEED_OPTIONS = [
  { label: "Muy lenta", value: 0.4 },
  { label: "Lenta", value: 0.7 },
  { label: "Normal", value: 0.85 },
  { label: "Rápida", value: 1.0 },
];

const STATUS_LABEL: Record<VoiceEngineStatus, string> = {
  idle: "Pendiente",
  loading: "Cargando…",
  ready: "Lista ✓",
  failed: "Error ✗",
};

const STATUS_COLOR: Record<VoiceEngineStatus, string> = {
  idle: Brand.accentSoft,
  loading: Brand.accent,
  ready: Brand.success,
  failed: Brand.error,
};

/**
 * Theme and playback settings. Rendered inside a modal from the sidebar, so it
 * is the same panel on desktop and mobile.
 */
export function SettingsPanel() {
  const { mode, setMode } = useAppTheme();
  const { speed, setSpeed } = useTtsSpeed();
  const { speech } = useServices();
  const colors = useTheme();

  const [engineStatuses, setEngineStatuses] = useState<{
    english: VoiceEngineStatus;
    spanish: VoiceEngineStatus;
  } | null>(null);

  // Poll while the panel is open — it's only mounted then, and loading can
  // start at any point in the session (Spanish loads lazily, on first use)
  useEffect(() => {
    if (!speech.getEngineStatuses) return;

    const poll = () => setEngineStatuses(speech.getEngineStatuses!());
    poll();
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [speech]);

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

      {engineStatuses && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            Voces
          </ThemedText>
          <VoiceStatusRow label="Voz en inglés" status={engineStatuses.english} />
          <VoiceStatusRow label="Voz en español" status={engineStatuses.spanish} />
        </View>
      )}
    </View>
  );
}

function VoiceStatusRow({ label, status }: { label: string; status: VoiceEngineStatus }) {
  return (
    <View style={styles.voiceRow}>
      <ThemedText type="small">{label}</ThemedText>
      <ThemedText type="small" style={{ color: STATUS_COLOR[status], fontWeight: "600" }}>
        {STATUS_LABEL[status]}
      </ThemedText>
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
  voiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
