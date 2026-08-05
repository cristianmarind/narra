import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { useServices } from "@/services";

export default function ResultsScreen() {
  const { id, correct, incorrect, total, percentage } = useLocalSearchParams<{
    id: string;
    correct: string;
    incorrect: string;
    total: string;
    percentage: string;
  }>();
  const router = useRouter();
  const { fullscreenAds } = useServices();
  const [supportState, setSupportState] = useState<"idle" | "loading" | "thanks">("idle");

  // Session finished: the scheduled interstitial's moment (at most one every
  // 2 days — the service enforces the cooldown, so this is usually a no-op)
  useEffect(() => {
    void fullscreenAds.maybeShowSessionAd();
  }, [fullscreenAds]);

  async function handleSupport() {
    if (supportState !== "idle") return;
    setSupportState("loading");
    const watched = await fullscreenAds.showSupportAd();
    setSupportState(watched ? "thanks" : "idle");
  }

  const pct = Number(percentage) || 0;
  const emoji = pct === 100 ? "🎉" : pct >= 70 ? "👏" : pct >= 50 ? "💪" : "📚";

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          <ThemedText type="title">Sesión completada</ThemedText>

          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <ThemedText themeColor="textSecondary">Total de frases</ThemedText>
              <ThemedText type="subtitle">{total}</ThemedText>
            </View>
            <View style={styles.statRow}>
              <ThemedText themeColor="textSecondary">Correctas</ThemedText>
              <ThemedText type="subtitle" style={styles.correctText}>
                {correct}
              </ThemedText>
            </View>
            <View style={styles.statRow}>
              <ThemedText themeColor="textSecondary">Incorrectas</ThemedText>
              <ThemedText type="subtitle" style={styles.incorrectText}>
                {incorrect}
              </ThemedText>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <ThemedText themeColor="textSecondary">Porcentaje</ThemedText>
              <ThemedText type="title">{percentage}%</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          {fullscreenAds.isAvailable && (
            <Pressable
              onPress={handleSupport}
              disabled={supportState !== "idle"}
              style={({ pressed }) => [styles.supportLink, pressed && styles.pressed]}
            >
              <ThemedText type="small" themeColor="textSecondary" style={styles.supportText}>
                {supportState === "thanks"
                  ? "💚 ¡Gracias por apoyar a Narra!"
                  : supportState === "loading"
                    ? "Cargando anuncio..."
                    : "💚 Apoya Narra viendo un anuncio (opcional)"}
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace(`/list/${id}/practice`)}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.secondaryButtonText}>
              Practicar de nuevo
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => router.dismissAll()}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>
              Volver al inicio
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.four,
  },
  emoji: {
    fontSize: 64,
  },
  statsContainer: {
    alignSelf: "stretch",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: "#F0F0F3",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  correctText: {
    color: Brand.success,
  },
  incorrectText: {
    color: Brand.error,
  },
  divider: {
    height: 1,
    backgroundColor: "#DDD",
  },
  actions: {
    gap: Spacing.two,
  },
  supportLink: {
    alignItems: "center",
    paddingVertical: Spacing.one,
  },
  supportText: {
    textDecorationLine: "underline",
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Brand.accent,
  },
  primaryButtonText: {
    color: Brand.onPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Brand.accent,
  },
  secondaryButtonText: {
    color: Brand.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
