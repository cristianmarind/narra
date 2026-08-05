import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { SettingsPanel } from "@/components/settings-panel";
import { ThemedText } from "@/components/themed-text";
import { Layout, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Centered dialog holding the settings panel. */
export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { colors } = useAppTheme();

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

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mounted only while visible, so the voice-status poll inside it
                doesn't run for the whole app session */}
            {visible && <SettingsPanel />}
          </ScrollView>
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
    // Caps how tall the dialog can grow so it never exceeds the screen —
    // the body below scrolls once its content passes this limit.
    maxHeight: "90%",
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
    // Lets the ScrollView shrink to whatever space is left under the header
    // once the dialog hits its maxHeight, instead of pushing the dialog
    // taller than the screen — that's what makes the content scrollable.
    flexShrink: 1,
  },
  bodyContent: {
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
});
