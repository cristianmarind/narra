import { Modal, Pressable, StyleSheet, View } from "react-native";

import { SettingsPanel } from "@/components/settings-panel";
import { ThemedText } from "@/components/themed-text";
import { Layout, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Centered dialog holding the settings panel. */
export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <ThemedText type="subtitle">Configuración</ThemedText>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Cerrar"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <ThemedText style={{ color: colors.textMuted, fontSize: 18 }}>✕</ThemedText>
            </Pressable>
          </View>

          <View style={styles.body}>
            <SettingsPanel />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  dialog: {
    width: "100%",
    maxWidth: Layout.readingMaxWidth,
    borderRadius: Radius.xxl,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
  },
  close: {
    padding: Spacing.one,
  },
  body: {
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
});
