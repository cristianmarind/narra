import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ContentContainer } from "@/components/content-container";
import { LanguagePair } from "@/components/language-badge";
import { ProgressBar } from "@/components/progress-bar";
import { StatTile } from "@/components/stat-tile";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useTheme } from "@/hooks/use-theme";
import { useServices } from "@/services";
import type { PhraseList } from "@/types";
import { confirm, formatRelativeTime, getListStats } from "@/utils";

/** Width of the actions column on wide layouts */
const ACTIONS_WIDTH = 200;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, deleteList } = usePhraseLists();
  const { speech } = useServices();
  const { isExpanded } = useBreakpoint();
  const colors = useTheme();
  const router = useRouter();
  const [list, setList] = useState<PhraseList | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);

  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);

    // Pre-generate first 5 phrase answers in background while user views the list
    if (found && found.phrases.length > 0 && speech.pregenerate) {
      const firstAnswers = found.phrases.slice(0, 5).map((p) => p.acceptedTranslations[0]);
      speech.pregenerate(firstAnswers, found.targetLanguage);
    }
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
    router.push(`/list/${id}/practice?voiceMode=${voiceMode ? "1" : "0"}`);
  }

  if (!list) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText themeColor="textSecondary">Cargando...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const { correct, incorrect, accuracy } = getListStats(list);
  const lastPracticed = formatRelativeTime(list.lastPracticedAt);
  const phraseCount = list.phrases.length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        {/* Compact layouts have no breadcrumb, so the stack header carries the
            list name instead of the generic "Lista" */}
        <Stack.Screen options={{ title: list.name }} />

        <BreadcrumbBar
          items={[
            { label: "Mis listas", onPress: () => router.replace("/") },
            { label: list.name },
          ]}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ContentContainer maxWidth={Layout.contentMaxWidth}>
            <View style={[styles.body, isExpanded && styles.bodyRow]}>
              {/* Left: identity and progress. Name itself lives in the header /
                  breadcrumb, so this starts straight at the meta row. */}
              <View style={styles.info}>
                <View style={styles.metaRow}>
                  <LanguagePair native={list.nativeLanguage} target={list.targetLanguage} />
                  <Text style={[styles.meta, { color: colors.textMuted }]}>
                    · {phraseCount} {phraseCount === 1 ? "frase" : "frases"}
                  </Text>
                </View>

                {accuracy !== null ? (
                  <View style={styles.statsBlock}>
                    <ProgressBar
                      percent={accuracy}
                      color={accuracy >= 70 ? Brand.success : Brand.accent}
                      height={5}
                    />
                    <View style={styles.tiles}>
                      <StatTile value={`${accuracy}%`} label="precisión" color={Brand.accent} />
                      <StatTile value={correct} label="correctas" color={Brand.success} />
                      <StatTile value={incorrect} label="incorrectas" color={Brand.error} />
                    </View>
                    {lastPracticed && (
                      <Text style={[styles.meta, { color: colors.textMuted }]}>
                        ⏱ Última práctica {lastPracticed}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View
                    style={[styles.emptyStats, { backgroundColor: colors.surfaceMuted }]}
                  >
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {phraseCount === 0
                        ? "Agrega frases para poder practicar."
                        : "Todavía no has practicado esta lista."}
                    </Text>
                  </View>
                )}
              </View>

              {/* Right: what you can do with it */}
              <View style={[styles.actions, isExpanded && styles.actionsColumn]}>
                <Pressable
                  onPress={handlePractice}
                  style={({ pressed }) => [
                    styles.button,
                    styles.primaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>▶  Practicar</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/list/${id}/edit`)}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Editar frases</Text>
                </Pressable>

                <Pressable
                  onPress={() => setVoiceMode(!voiceMode)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: voiceMode }}
                  style={({ pressed }) => [styles.voiceToggle, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: Brand.accent },
                      voiceMode && styles.checkboxActive,
                    ]}
                  >
                    {voiceMode && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.voiceToggleText, { color: colors.textSecondary }]}>
                    Modo voz (manos libres)
                  </Text>
                </Pressable>

                <View style={[styles.dangerZone, { borderTopColor: colors.borderSubtle }]}>
                  <Pressable
                    onPress={handleDeleteList}
                    style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteButtonText}>Eliminar lista</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ContentContainer>
        </ScrollView>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  body: {
    gap: Spacing.five,
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  info: {
    flex: 1,
    gap: Spacing.two,
    // Lets long list names wrap instead of pushing the actions column away
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  meta: {
    fontSize: 11,
  },
  statsBlock: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  tiles: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  emptyStats: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
  },
  actions: {
    gap: Spacing.two,
  },
  actionsColumn: {
    width: ACTIONS_WIDTH,
    flexShrink: 0,
  },
  button: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Brand.accent,
  },
  primaryButtonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Brand.accent,
  },
  secondaryButtonText: {
    color: Brand.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  voiceToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: Radius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: Brand.accent,
  },
  checkmark: {
    color: Brand.onPrimary,
    fontSize: 11,
    fontWeight: "bold",
  },
  voiceToggleText: {
    fontSize: 12,
  },
  dangerZone: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  deleteButton: {
    paddingVertical: Spacing.two,
    alignItems: "center",
  },
  deleteButtonText: {
    color: Brand.error,
    fontSize: 12,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
