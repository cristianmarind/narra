import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useServices } from "@/services";
import type { PhraseList } from "@/types";

export default function HomeScreen() {
  const { lists, loading } = usePhraseLists();
  const { speech } = useServices();
  const router = useRouter();

  // TTS warmup state (non-blocking)
  const [warmupStatus, setWarmupStatus] = useState<string | null>(null);

  // On mount and when lists change, pre-generate first phrases persistently
  useEffect(() => {
    if (loading || lists.length === 0 || !speech.pregeneratePersistent) return;

    const firstPhrases: { text: string; language: string; listName: string }[] = [];
    for (const list of lists) {
      if (list.phrases.length > 0) {
        firstPhrases.push({
          text: list.phrases[0].acceptedTranslations[0],
          language: list.targetLanguage,
          listName: list.name,
        });
      }
    }

    if (firstPhrases.length === 0) return;

    // Group by language for batching
    const byLang = new Map<string, { texts: string[]; names: string[] }>();
    for (const fp of firstPhrases) {
      const existing = byLang.get(fp.language) || { texts: [], names: [] };
      existing.texts.push(fp.text);
      existing.names.push(fp.listName);
      byLang.set(fp.language, existing);
    }

    (async () => {
      for (const [language, { texts, names }] of byLang) {
        await speech.pregeneratePersistent!(texts, language, (current, total, text, status) => {
          if (status === "generating") {
            setWarmupStatus(`Generando audio: "${names[current - 1]}" (${current}/${total})`);
          } else if (status === "checking") {
            setWarmupStatus(`Verificando cache: "${names[current - 1]}" (${current}/${total})`);
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
    backgroundColor: "#1a1a2e",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignItems: "center",
  },
  warmupText: {
    color: "#4A90D9",
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
    backgroundColor: "#4A90D9",
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
