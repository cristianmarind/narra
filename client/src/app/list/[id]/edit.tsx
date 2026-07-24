import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { PhraseCardView } from "@/components/phrase-card-view";
import { PhraseCardEdit } from "@/components/phrase-card-edit";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import type { Phrase, PhraseList } from "@/types";
import { confirm } from "@/utils";

export default function EditListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, deletePhrase, updatePhrase } = usePhraseLists();
  const router = useRouter();
  const [list, setList] = useState<PhraseList | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
  }, [lists, id]);

  function handleDeletePhrase(phrase: Phrase) {
    confirm(
      "Eliminar frase",
      `¿Eliminar "${phrase.nativeSentence}"?`,
      () => deletePhrase(id!, phrase.id)
    );
  }

  async function handleSaveEdit(
    phraseId: string,
    nativeSentence: string,
    acceptedTranslations: string[]
  ) {
    await updatePhrase(id!, phraseId, { nativeSentence, acceptedTranslations });
    setEditingId(null);
  }

  if (!list) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.center}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  function renderPhrase({ item }: { item: Phrase }) {
    if (editingId === item.id) {
      return (
        <PhraseCardEdit
          phrase={item}
          onSave={(native, translations) =>
            handleSaveEdit(item.id, native, translations)
          }
          onCancel={() => setEditingId(null)}
        />
      );
    }

    return (
      <PhraseCardView
        phrase={item}
        onPress={() => setEditingId(item.id)}
        onLongPress={() => handleDeletePhrase(item)}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">{list.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {list.phrases.length} frase{list.phrases.length !== 1 ? "s" : ""} · Toca para editar, mantén para eliminar
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
            extraData={editingId}
            contentContainerStyle={styles.listContent}
          />
        )}

        <Pressable
          onPress={() => router.push(`/list/${id}/add-phrase`)}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.addButtonText}>+ Agregar frase</ThemedText>
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
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  center: {
    textAlign: "center",
  },
  addButton: {
    margin: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4A90D9",
  },
  addButtonText: {
    color: "#4A90D9",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
