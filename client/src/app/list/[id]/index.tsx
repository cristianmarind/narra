import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ContentContainer } from "@/components/content-container";
import { LanguagePair } from "@/components/language-badge";
import { ProgressBar } from "@/components/progress-bar";
import { StatTile } from "@/components/stat-tile";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LOOKAHEAD_WINDOW_SIZE, PRACTICE_START_DELAY_MS } from "@/constants/practice";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useServices } from "@/services";
import type { Phrase, PhraseList } from "@/types";
import { confirm, formatRelativeTime, getListStats, shuffle } from "@/utils";

/** Width of the actions column on wide layouts */
const ACTIONS_WIDTH = 200;

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lists, deleteList, setListPreference } = usePhraseLists();
  const { speech } = useServices();
  const { isExpanded } = useBreakpoint();
  const { colors } = useAppTheme();
  const router = useRouter();
  const [list, setList] = useState<PhraseList | null>(null);
  // "listen" (default): audio-only, no typing/STT — the user hears the phrase,
  // thinks their answer, then hears the correct one. "manual": the classic
  // type-or-speak-the-answer flow.
  const [mode, setMode] = useState<"listen" | "manual">("listen");
  // Listen mode only: after the correct answer plays, wait for the user to
  // self-report whether they got it right instead of just moving on.
  const [selfVerify, setSelfVerify] = useState(false);
  // Manual mode: drives the full hands-free STT flow. Listen mode: only used
  // (when selfVerify is on) to let the user say the verify result instead of
  // tapping a button.
  const [voiceMode, setVoiceMode] = useState(false);
  const [randomOrder, setRandomOrder] = useState(false);
  // Fixed the moment random mode is switched on, so the practice screen plays
  // (and this screen preloads) the exact same order
  const [shuffledOrder, setShuffledOrder] = useState<Phrase[] | null>(null);
  // True for PRACTICE_START_DELAY_MS after pressing "Practicar", before
  // navigating — gives the lookahead warmup a head start (see constants/practice.ts)
  const [starting, setStarting] = useState(false);
  const startingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (startingTimerRef.current) clearTimeout(startingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
  }, [lists, id]);

  // Warm the first answers only while this screen is actually in front. Focus
  // (not mount) matters twice here: entering list B must first abandon list A's
  // still-running batch, and this must NOT re-fire while the practice screen is
  // stacked on top refreshing `lists` after every answer.
  useFocusEffect(
    useCallback(() => {
      const found = lists.find((l) => l.id === id) ?? null;
      if (!found || found.phrases.length === 0) return;

      speech.cancelWarmups?.();
      if (speech.pregenerate) {
        const firstAnswers = found.phrases
          .slice(0, LOOKAHEAD_WINDOW_SIZE)
          .map((p) => p.acceptedTranslations[0]);
        speech.pregenerate(firstAnswers, found.targetLanguage);
      }
    }, [lists, id, speech])
  );

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

  /**
   * Shuffling here (instead of on the practice screen) means we know exactly
   * which phrase will play first, so we can preload it before the user even
   * presses "Practicar".
   */
  function handleToggleRandom() {
    const next = !randomOrder;
    setRandomOrder(next);

    if (!next || !list) {
      setShuffledOrder(null);
      return;
    }

    const order = shuffle(list.phrases);
    setShuffledOrder(order);

    const first = order[0];
    if (first && speech.pregenerate) {
      speech.pregenerate([first.acceptedTranslations[0]], list.targetLanguage);
      speech.pregenerate([first.nativeSentence], list.nativeLanguage);
    }
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
    if (starting) return;

    const order =
      randomOrder && shuffledOrder ? `&order=${shuffledOrder.map((p) => p.id).join(",")}` : "";

    // The lookahead warmup for this list is already running (useFocusEffect
    // above); this delay just gives it a head start before the practice
    // screen actually needs the audio, instead of racing it from a cold start.
    setStarting(true);
    startingTimerRef.current = setTimeout(() => {
      setStarting(false);
      router.push(
        `/list/${id}/practice?mode=${mode}&voiceMode=${voiceMode ? "1" : "0"}&selfVerify=${selfVerify ? "1" : "0"}${order}`
      );
    }, PRACTICE_START_DELAY_MS);
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
                  disabled={starting}
                  style={({ pressed }) => [
                    styles.button,
                    styles.primaryButton,
                    pressed && styles.pressed,
                    starting && styles.disabled,
                  ]}
                >
                  {starting ? (
                    <View style={styles.startingRow}>
                      <ActivityIndicator size="small" color={Brand.onPrimary} />
                      <Text style={styles.primaryButtonText}>Preparando…</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>▶  Practicar</Text>
                  )}
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

                {/* General options — apply no matter which practice mode is
                    selected below, so they live outside modeSection. */}
                <Pressable
                  onPress={handleToggleRandom}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: randomOrder }}
                  style={({ pressed }) => [styles.voiceToggle, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: Brand.accent },
                      randomOrder && styles.checkboxActive,
                    ]}
                  >
                    {randomOrder && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.voiceToggleText, { color: colors.textSecondary }]}>
                    Orden aleatorio
                  </Text>
                </Pressable>

                {/* Persisted on the list itself, unlike the per-session toggles below */}
                <Pressable
                  onPress={() =>
                    setListPreference(list.id, { showTranslation: !list.showTranslation })
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(list.showTranslation) }}
                  style={({ pressed }) => [styles.voiceToggle, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: Brand.accent },
                      list.showTranslation && styles.checkboxActive,
                    ]}
                  >
                    {list.showTranslation && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.voiceToggleText, { color: colors.textSecondary }]}>
                    Mostrar traducción correcta
                  </Text>
                </Pressable>

                <View style={styles.modeSection}>
                  <Text style={[styles.modeLabel, { color: colors.textMuted }]}>
                    Modo de práctica
                  </Text>

                  <Pressable
                    onPress={() => setMode("listen")}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mode === "listen" }}
                    style={({ pressed }) => [
                      styles.modeOption,
                      { borderColor: colors.border },
                      mode === "listen" && styles.modeOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.modeOptionTitle, { color: colors.text }]}>
                      🎧 Escuchar y repetir
                    </Text>
                    <Text style={[styles.modeOptionHint, { color: colors.textMuted }]}>
                      Sin escribir ni hablar: escuchas la frase, piensas tu respuesta y luego
                      escuchas la traducción correcta.
                    </Text>
                  </Pressable>

                  {mode === "listen" && (
                    <>
                      <Pressable
                        onPress={() => setSelfVerify(!selfVerify)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selfVerify }}
                        style={({ pressed }) => [
                          styles.voiceToggle,
                          styles.nestedOption,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: Brand.accent },
                            selfVerify && styles.checkboxActive,
                          ]}
                        >
                          {selfVerify && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={[styles.voiceToggleText, { color: colors.textSecondary }]}>
                          Verificar cada respuesta (tienes 10s tras cada frase)
                        </Text>
                      </Pressable>

                      {/* Nested directly under the option it depends on, instead of
                          sharing a spot below with manual mode's own voice toggle —
                          that made it unclear which mode it belonged to. */}
                      {selfVerify && (
                        <Pressable
                          onPress={() => setVoiceMode(!voiceMode)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: voiceMode }}
                          style={({ pressed }) => [
                            styles.voiceToggle,
                            styles.nestedOptionDeep,
                            pressed && styles.pressed,
                          ]}
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
                            Verificar con la voz (di "bien" o "malo")
                          </Text>
                        </Pressable>
                      )}
                    </>
                  )}

                  <Pressable
                    onPress={() => setMode("manual")}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: mode === "manual" }}
                    style={({ pressed }) => [
                      styles.modeOption,
                      { borderColor: colors.border },
                      mode === "manual" && styles.modeOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.modeOptionTitle, { color: colors.text }]}>
                      ⌨️ Escribir o hablar respuesta
                    </Text>
                    <Text style={[styles.modeOptionHint, { color: colors.textMuted }]}>
                      Modo clásico: escribe la traducción o actívala con reconocimiento de voz.
                    </Text>
                  </Pressable>

                  {mode === "manual" && (
                    <Pressable
                      onPress={() => setVoiceMode(!voiceMode)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: voiceMode }}
                      style={({ pressed }) => [
                        styles.voiceToggle,
                        styles.nestedOption,
                        pressed && styles.pressed,
                      ]}
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
                  )}
                </View>

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
  startingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
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
  modeSection: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modeOption: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  modeOptionActive: {
    borderColor: Brand.accent,
    borderWidth: 2,
  },
  modeOptionTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  modeOptionHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  nestedOption: {
    marginLeft: Spacing.three,
  },
  nestedOptionDeep: {
    marginLeft: Spacing.four,
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
  disabled: {
    opacity: 0.6,
  },
});
