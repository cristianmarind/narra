import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useThinkTime } from "@/hooks/use-think-time";
import { useTtsSpeed } from "@/hooks/use-tts-speed";
import { useUserLevel } from "@/hooks/use-user-level";
import { useServices } from "@/services";
import type { ProficiencyLevel, VoiceEngineStatus } from "@/types";
import { PROFICIENCY_LABELS, PROFICIENCY_LEVELS } from "@/types";

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
  const { mode, setMode, colors } = useAppTheme();
  const { speed, setSpeed } = useTtsSpeed();
  const { level, setLevel } = useUserLevel();
  const {
    firstWordSeconds,
    perExtraWordSeconds,
    setFirstWordSeconds,
    setPerExtraWordSeconds,
  } = useThinkTime();
  const { speech } = useServices();

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

      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Mi nivel
        </ThemedText>
        <LevelSelector level={level} onChange={setLevel} />
        <ThemedText
          type="small"
          style={[styles.hint, { color: colors.textMuted }]}
        >
          Ajusta la dificultad de las frases patrocinadas
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Pausa para pensar (modo escucha)
        </ThemedText>
        <View style={styles.numberFieldRow}>
          <NumberField
            label="Primera palabra"
            value={firstWordSeconds}
            onCommit={setFirstWordSeconds}
          />
          <NumberField
            label="Cada palabra extra"
            value={perExtraWordSeconds}
            onCommit={setPerExtraWordSeconds}
          />
        </View>
        <ThemedText
          type="small"
          style={[styles.hint, { color: colors.textMuted }]}
        >
          En segundos, acepta decimales (ej: 0.3, 1.5, 2)
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

/**
 * Free-form decimal input for the think-time settings. Kept uncontrolled
 * against the stored value while the user is typing (a raw string, so
 * partial input like "0." or "1," doesn't get clobbered mid-edit) and only
 * parses/commits on blur or submit; an invalid or empty value reverts to
 * the last committed one instead of silently coercing to 0.
 */
function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
}) {
  const { colors } = useAppTheme();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const parsed = parseFloat(text.replace(",", "."));
    if (!isNaN(parsed)) {
      onCommit(parsed);
    } else {
      setText(String(value));
    }
  }

  return (
    <View style={styles.numberField}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        style={[styles.numberFieldInput, { borderColor: colors.border, color: colors.text }]}
      />
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

/**
 * Dropdown for "Mi nivel": the option grid used for the other settings makes
 * "Principiante" wrap onto a second line in its column. A selector avoids
 * that — each option gets the panel's full width when the list is open.
 */
function LevelSelector({
  level,
  onChange,
}: {
  level: ProficiencyLevel;
  onChange: (level: ProficiencyLevel) => void;
}) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [
          styles.selector,
          { borderColor: colors.border },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.selectorValue}>
          {PROFICIENCY_LABELS[level]}
        </ThemedText>
        <ThemedText style={{ color: colors.textMuted }}>{open ? "▲" : "▼"}</ThemedText>
      </Pressable>

      {open && (
        <View
          style={[
            styles.selectorMenu,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          {PROFICIENCY_LEVELS.map((value) => {
            const active = value === level;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  onChange(value);
                  setOpen(false);
                }}
                style={({ pressed }) => [styles.selectorOption, pressed && styles.pressed]}
              >
                <ThemedText style={active && styles.selectorOptionActiveText}>
                  {PROFICIENCY_LABELS[value]}
                </ThemedText>
                {active && <ThemedText style={{ color: Brand.accent }}>✓</ThemedText>}
              </Pressable>
            );
          })}
        </View>
      )}
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
  const { colors } = useAppTheme();

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
  numberFieldRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  numberField: {
    flex: 1,
    gap: Spacing.one,
  },
  numberFieldInput: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    fontSize: 14,
  },
  voiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  selectorValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  selectorMenu: {
    marginTop: Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  selectorOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  selectorOptionActiveText: {
    color: Brand.accent,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
