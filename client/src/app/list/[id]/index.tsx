import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
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
import type { Phrase, PhraseList } from "@/types";
import { confirm } from "@/utils";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, deletePhrase, deleteList } = usePhraseLists();
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

  function handleDeletePhrase(phrase: Phrase) {
    confirm(
      "Eliminar frase",
      `¿Eliminar "${phrase.nativeSentence}"?`,
      () => deletePhrase(id!, phrase.id)
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

  function renderPhrase({ item }: { item: Phrase }) {
    return (
      <Pressable
        onLongPress={() => handleDeletePhrase(item)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="backgroundElement" style={styles.phraseCard}>
          <ThemedText>{item.nativeSentence}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            → {item.acceptedTranslations.join(" / ")}
          </ThemedText>
        </ThemedView>
      </Pressable>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{list.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {list.nativeLanguage.toUpperCase()} → {list.targetLanguage.toUpperCase()} ·{" "}
            {list.phrases.length} frase{list.phrases.length !== 1 ? "s" : ""}
          </ThemedText>
        </View>

        {list.phrases.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Sin frases. Agrega la primera.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={list.phrases}
            keyExtractor={(item) => item.id}
            renderItem={renderPhrase}
            contentContainerStyle={styles.listContent}
          />
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(`/list/${id}/add-phrase`)}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.secondaryButtonText}>+ Frase</ThemedText>
          </Pressable>

          <Pressable
            onPress={handlePractice}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>Practicar</ThemedText>
          </Pressable>
        </View>

        <Pressable
          onPress={handleDeleteList}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.deleteButtonText}>Eliminar lista</ThemedText>
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
  header: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  phraseCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  center: {
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#4A90D9",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4A90D9",
  },
  secondaryButtonText: {
    color: "#4A90D9",
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  deleteButton: {
    padding: Spacing.two,
    alignItems: "center",
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  deleteButtonText: {
    color: "#DC3545",
    fontSize: 14,
    fontWeight: "600",
  },
});
