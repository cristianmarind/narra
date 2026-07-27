import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { fixedPromptsFor } from "@/constants/speech-prompts";
import { NarraLogo } from "@/components/narra-logo";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useServices } from "@/services";
import type { PhraseList } from "@/types";

export default function HomeScreen() {
  const { lists, loading } = usePhraseLists();
  const { speech } = useServices();
  const router = useRouter();

  // TTS warmup state (non-blocking)
  const [warmupStatus, setWarmupStatus] = useState<string | null>(null);

  // On mount and when lists change, persist the audio that's always needed:
  // the app's fixed phrases first, then the first phrase of each list.
  useEffect(() => {
    if (loading || lists.length === 0 || !speech.pregeneratePersistent) return;

    // { text, language, label } — label is what the warmup banner shows
    const queue: { text: string; language: string; label: string }[] = [];
    const seen = new Set<string>();

    const enqueue = (text: string, language: string, label: string) => {
      if (!text) return;
      const key = `${language}::${text}`;
      if (seen.has(key)) return;
      seen.add(key);
      queue.push({ text, language, label });
    };

    // Fixed app phrases ("Correcto", "Incorrecto", the intro) go first so they
    // are always available, no matter which list the user opens.
    for (const list of lists) {
      for (const prompt of fixedPromptsFor(list.targetLanguage)) {
        enqueue(prompt, list.nativeLanguage, "mensajes de la app");
      }
    }

    for (const list of lists) {
      if (list.phrases.length === 0) continue;
      const first = list.phrases[0];

      // Target language: the expected answer, read back during feedback
      enqueue(first.acceptedTranslations[0], list.targetLanguage, list.name);

      // Native language: the prompt sentence, read at the start of every round.
      // Warming it here also triggers the Spanish model download up front, so the
      // first practice round doesn't stall waiting for it.
      enqueue(first.nativeSentence, list.nativeLanguage, list.name);
    }

    if (queue.length === 0) return;

    // Batch per language, preserving the order above
    const byLang = new Map<string, { texts: string[]; labels: string[] }>();
    for (const item of queue) {
      const existing = byLang.get(item.language) ?? { texts: [], labels: [] };
      existing.texts.push(item.text);
      existing.labels.push(item.label);
      byLang.set(item.language, existing);
    }

    (async () => {
      for (const [language, { texts, labels }] of byLang) {
        await speech.pregeneratePersistent!(texts, language, (current, total, text, status) => {
          const label = labels[current - 1];
          if (status === "generating") {
            setWarmupStatus(`Generando audio: "${label}" (${current}/${total})`);
          } else if (status === "checking") {
            setWarmupStatus(`Verificando cache: "${label}" (${current}/${total})`);
          }
          // Don't show anything for "cached" — it's instant
        });
      }
      setWarmupStatus(null);
    })();
  }, [loading, lists.length]);

  // Clear session cache when returning to home
  useEffect(() => {
    if (speech.clearSessionCache) {
      speech.clearSessionCache();
    }
  }, []);

  function renderItem({ item }: { item: PhraseList }) {
    return (
      <Pressable
        onPress={() => router.push(`/list/${item.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <ThemedView type="backgroundElement" style={styles.cardInner}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.nativeLanguage.toUpperCase()} → {item.targetLanguage.toUpperCase()}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.phrases.length} frase{item.phrases.length !== 1 ? "s" : ""}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        {/* Non-blocking warmup indicator */}
        {warmupStatus && (
          <View style={styles.warmupBanner}>
            <ThemedText type="small" style={styles.warmupText}>
              🔊 {warmupStatus}
            </ThemedText>
          </View>
        )}

        {loading ? (
          <ThemedText style={styles.center}>Cargando...</ThemedText>
        ) : lists.length === 0 ? (
          <View style={styles.empty}>
            <NarraLogo size={56} />
            <ThemedText type="subtitle" style={styles.center}>
              No tienes listas aún
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Crea tu primera lista para empezar a practicar
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Pressable
          onPress={() => router.push("/list/new")}
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <ThemedText style={styles.fabText}>+</ThemedText>
        </Pressable>
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
  },
  warmupBanner: {
    backgroundColor: Brand.primary,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignItems: "center",
  },
  warmupText: {
    color: Brand.accentSoft,
    fontSize: 12,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.two,
    overflow: "hidden",
  },
  cardInner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
  },
  center: {
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: Spacing.four,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: -2,
  },
});
