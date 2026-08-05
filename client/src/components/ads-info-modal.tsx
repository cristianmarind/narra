import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useServices } from "@/services";

interface AdsInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const POLICY_POINTS = [
  {
    icon: "⏱",
    text: "Como máximo un anuncio cada 2 días, y solo al terminar o salir de tu primera práctica. Nunca en medio de una sesión.",
  },
  {
    icon: "💬",
    text: "Algunas sesiones incluyen una frase patrocinada que se practica como cualquier otra — no cuenta para tu puntuación.",
  },
  {
    icon: "💚",
    text: "Si quieres aportar más, tú decides cuándo ver un anuncio extra. Nada es obligatorio.",
  },
];

type SupportState = "idle" | "loading" | "thanks" | "unavailable";

/**
 * Explains Narra's low-intrusion ads policy and hosts the voluntary
 * "watch an ad to support the app" action.
 */
export function AdsInfoModal({ visible, onClose }: AdsInfoModalProps) {
  const { colors } = useAppTheme();
  const { fullscreenAds } = useServices();
  const [supportState, setSupportState] = useState<SupportState>("idle");

  // Each open starts fresh — a past "thanks" shouldn't stick around
  useEffect(() => {
    if (visible) setSupportState("idle");
  }, [visible]);

  async function handleSupport() {
    if (supportState === "loading") return;
    setSupportState("loading");
    const watched = await fullscreenAds.showSupportAd();
    setSupportState(watched ? "thanks" : "unavailable");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <ThemedText type="subtitle">Anuncios que no molestan</ThemedText>
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
            <ThemedText themeColor="textSecondary" style={styles.intro}>
              Narra es gratis y se mantiene con publicidad, pero con reglas
              claras para no interrumpir tu aprendizaje:
            </ThemedText>

            {POLICY_POINTS.map((point) => (
              <View key={point.icon} style={styles.point}>
                <ThemedText style={styles.pointIcon}>{point.icon}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.pointText}>
                  {point.text}
                </ThemedText>
              </View>
            ))}

            {fullscreenAds.isAvailable ? (
              <View style={styles.supportSection}>
                {supportState === "thanks" ? (
                  <ThemedText style={styles.thanks}>
                    💚 ¡Gracias por apoyar a Narra!
                  </ThemedText>
                ) : (
                  <Pressable
                    onPress={handleSupport}
                    disabled={supportState === "loading"}
                    style={({ pressed }) => [
                      styles.supportButton,
                      (pressed || supportState === "loading") && styles.pressed,
                    ]}
                  >
                    {supportState === "loading" ? (
                      <ActivityIndicator color={Brand.onPrimary} />
                    ) : (
                      <ThemedText style={styles.supportButtonText}>
                        💚 Ver un anuncio para apoyar la app
                      </ThemedText>
                    )}
                  </Pressable>
                )}
                {supportState === "unavailable" && (
                  <ThemedText type="small" style={[styles.hint, { color: colors.textMuted }]}>
                    No hay anuncios disponibles ahora. ¡Gracias igualmente por
                    querer apoyar! Inténtalo más tarde.
                  </ThemedText>
                )}
              </View>
            ) : (
              <ThemedText type="small" style={[styles.hint, { color: colors.textMuted }]}>
                Ver anuncios de apoyo está disponible en la app móvil.
              </ThemedText>
            )}
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
    flexShrink: 1,
  },
  bodyContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  intro: {
    lineHeight: 20,
  },
  point: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "flex-start",
  },
  pointIcon: {
    fontSize: 16,
    width: 24,
    textAlign: "center",
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  supportSection: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  supportButton: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    alignItems: "center",
    backgroundColor: Brand.accent,
  },
  supportButtonText: {
    color: Brand.onPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  thanks: {
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    color: Brand.success,
    paddingVertical: Spacing.two,
  },
  hint: {
    fontStyle: "italic",
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
