import { Pressable, StyleSheet, View, Modal } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTtsSpeed } from "@/hooks/use-tts-speed";
import { useServices } from "@/services";

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

const SPEED_OPTIONS = [
  { label: "Muy lenta", value: 0.4 },
  { label: "Lenta", value: 0.7 },
  { label: "Normal", value: 0.85 },
  { label: "Rápida", value: 1.0 },
];

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const { theme, mode, setMode } = useAppTheme();
  const { speed, setSpeed } = useTtsSpeed();
  const { speech } = useServices();

  async function handleSpeedChange(newSpeed: number) {
    if (newSpeed === speed) return;
    setSpeed(newSpeed);
    // Clear all cache since audio was generated at the old speed
    if (speech.clearAllCache) {
      await speech.clearAllCache();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.drawer,
            { backgroundColor: theme === "dark" ? "#1a1a1a" : "#fff" },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">Configuración</ThemedText>
          </View>

          {/* Theme */}
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

          {/* TTS Speed */}
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
            <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
              Al cambiar se regenera el audio cacheado
            </ThemedText>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        active && styles.optionActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[styles.optionText, active && styles.optionTextActive]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  drawer: {
    width: 280,
    height: "100%",
    paddingTop: 60,
    paddingHorizontal: Spacing.four,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    marginBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
  },
  optionActive: {
    borderColor: "#4A90D9",
    backgroundColor: "#4A90D920",
  },
  optionText: {
    fontSize: 13,
    color: "#888",
  },
  optionTextActive: {
    color: "#4A90D9",
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
