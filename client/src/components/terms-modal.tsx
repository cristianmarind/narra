import { useState } from "react";
import { usePathname } from "expo-router";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { TermsContent } from "@/components/terms-content";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTermsAcceptance } from "@/hooks/use-terms-acceptance";

export function TermsModal() {
  const { colors } = useAppTheme();
  const { accepted, acceptTerms } = useTermsAcceptance();
  const pathname = usePathname();
  const [agreed, setAgreed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // The standalone /terms page is the public, checkbox-free version of this
  // same text — meant to be linkable from outside the app. Gating it behind
  // this modal would defeat that purpose.
  if (accepted || pathname === "/terms") return null;

  async function handleAccept() {
    if (!agreed) return;
    setIsAccepting(true);
    try {
      await acceptTerms();
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <Modal visible={!accepted} animationType="fade" transparent>
      <View style={[styles.overlay, { backgroundColor: "rgba(0, 0, 0, 0.7)" }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <ThemedText type="subtitle" style={styles.title}>
              Términos y Condiciones
            </ThemedText>

            <TermsContent />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={() => setAgreed(!agreed)}
              style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: colors.border },
                  agreed && styles.checkboxChecked,
                ]}
              >
                {agreed && <ThemedText style={styles.checkmark}>✓</ThemedText>}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                He leído y acepto los términos
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleAccept}
              disabled={!agreed || isAccepting}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: Brand.accent },
                (!agreed || isAccepting) && styles.buttonDisabled,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.buttonText}>
                {isAccepting ? "Guardando..." : "Continuar"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 0.9,
    maxHeight: "90%",
    borderRadius: Radius.lg,
    overflow: "hidden",
    width: "85%",
    maxWidth: 500,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  footer: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Brand.accent,
    borderColor: Brand.accent,
  },
  checkmark: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "bold",
  },
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
