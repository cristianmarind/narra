import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import type { PhraseList } from "@/types";
import { confirm } from "@/utils";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, deleteList } = usePhraseLists();
  const router = useRouter();
  const [list, setList] = useState<PhraseList | null>(null);

  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
  }, [lists, id]);

  function handleDeleteList() {
    if (!list) return;
    confirm(
      "Eliminar lista",
      `¿Estás seguro de eliminar "${list.name}" y todas sus frases? Esta acción no se puede deshacer.`,
      async () => {
        await deleteList(list.id);
        router.replace("/");
      }
    );
  }

  function handlePractice() {
    if (!list || list.phrases.length === 0) {
      if (Platform.OS === "web") {
        window.alert("Agrega al menos una frase para practicar");
      } else {
        Alert.alert("Sin frases", "Agrega al menos una frase para practicar");
      }
      return;
    }
    router.push(`/list/${id}/practice`);
  }

  if (!list) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.center}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  const totalCorrect = list.phrases.reduce(
    (sum, p) => sum + (p.stats?.correctCount ?? 0),
    0
  );
  const totalIncorrect = list.phrases.reduce(
    (sum, p) => sum + (p.stats?.incorrectCount ?? 0),
    0
  );
  const totalAttempts = totalCorrect + totalIncorrect;
  const accuracy =
    totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.content}>
          {/* Summary */}
          <View style={styles.summary}>
            <ThemedText type="title">{list.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {list.nativeLanguage.toUpperCase()} → {list.targetLanguage.toUpperCase()}
            </ThemedText>
            <ThemedText type="subtitle">
              {list.phrases.length} frase{list.phrases.length !== 1 ? "s" : ""}
            </ThemedText>

            {accuracy !== null && (
              <View style={styles.statsBlock}>
                <ThemedText type="small" themeColor="textSecondary">
                  Precisión general
                </ThemedText>
                <ThemedText type="title" style={styles.accuracyText}>
                  {accuracy}%
                </ThemedText>
                <View style={styles.statsRow}>
                  <ThemedText type="small" style={styles.statCorrect}>
                    ✓ {totalCorrect}
                  </ThemedText>
                  <ThemedText type="small" style={styles.statIncorrect}>
                    ✗ {totalIncorrect}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handlePractice}
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.primaryButtonText}>
                Practicar
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/list/${id}/edit`)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.secondaryButtonText}>
                Editar frases
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDeleteList}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.deleteButtonText}>
                Eliminar lista
              </ThemedText>
            </Pressable>
          </View>
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
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: "space-between",
  },
  summary: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  statsBlock: {
    marginTop: Spacing.four,
    alignItems: "center",
    gap: Spacing.one,
  },
  accuracyText: {
    color: "#4A90D9",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.four,
  },
  statCorrect: {
    color: "#28A745",
    fontWeight: "600",
  },
  statIncorrect: {
    color: "#DC3545",
    fontWeight: "600",
  },
  actions: {
    gap: Spacing.two,
  },
  actionButton: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4A90D9",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4A90D9",
  },
  secondaryButtonText: {
    color: "#4A90D9",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    padding: Spacing.two,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#DC3545",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    textAlign: "center",
  },
});
