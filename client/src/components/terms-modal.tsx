import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useTermsAcceptance } from "@/hooks/use-terms-acceptance";

export function TermsModal() {
  const { colors } = useAppTheme();
  const { accepted, acceptTerms } = useTermsAcceptance();
  const [agreed, setAgreed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  if (accepted) return null;

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

            <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Privacidad
              </ThemedText>
              {"\n"}
              Narra no recopila datos personales. Toda tu información (listas, estadísticas,
              preferencias) se almacena localmente en tu dispositivo. No hay servidor backend que
              acceda a tus datos.
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Publicidad
              </ThemedText>
              {"\n"}
              La app contiene:
              {"\n"}• Frases patrocinadas (prácticas como cualquier otra, sin impactar tu
              puntuación)
              {"\n"}• Anuncios de AdMob (Google Mobile Ads) — Google puede recopilar datos
              anónimos para personalizar anuncios según su política de privacidad.
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Generador de IA
              </ThemedText>
              {"\n"}
              Las listas generadas con IA usan prompts que envías a ChatGPT, Claude, Gemini u
              otro servicio de terceros. Narra no interviene en esa comunicación.
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Limitación de Responsabilidad
              </ThemedText>
              {"\n"}
              Narra se proporciona "tal cual". No somos responsables de pérdida de datos,
              problemas de compatibilidad o daños derivados del uso.
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                Cambios
              </ThemedText>
              {"\n"}
              Podemos actualizar estos términos en cualquier momento. Notificaremos requiriendo
              nueva aceptación.
            </ThemedText>
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
  section: {
    lineHeight: 20,
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
