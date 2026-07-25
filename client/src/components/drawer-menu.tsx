import { Pressable, StyleSheet, View, Modal } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DrawerMenu({ visible, onClose }: DrawerMenuProps) {
  const { theme, mode, setMode } = useAppTheme();

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

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Tema
            </ThemedText>
            <View style={styles.themeOptions}>
              <ThemeOption
                label="Claro"
                active={mode === "light"}
                onPress={() => setMode("light")}
                theme={theme}
              />
              <ThemeOption
                label="Oscuro"
                active={mode === "dark"}
                onPress={() => setMode("dark")}
                theme={theme}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ThemeOption({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: "light" | "dark";
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeOption,
        active && styles.themeOptionActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        style={[
          styles.themeOptionText,
          active && styles.themeOptionTextActive,
        ]}
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
  },
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  themeOption: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
  },
  themeOptionActive: {
    borderColor: "#4A90D9",
    backgroundColor: "#4A90D920",
  },
  themeOptionText: {
    fontSize: 13,
    color: "#888",
  },
  themeOptionTextActive: {
    color: "#4A90D9",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
