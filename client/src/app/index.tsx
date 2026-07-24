import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import type { PhraseList } from "@/types";

export default function HomeScreen() {
  const { lists, loading } = usePhraseLists();
  const router = useRouter();

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
