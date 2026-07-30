import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ContentContainer } from "@/components/content-container";
import { ListCard, NewListCard } from "@/components/list-card";
import { NarraLogo } from "@/components/narra-logo";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAudioWarmup } from "@/hooks/use-audio-warmup";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useServices } from "@/services";
import { formatRelativeTime } from "@/utils";

export default function HomeScreen() {
  const { lists, loading } = usePhraseLists();
  const { speech } = useServices();
  const { isCompact, gridColumns } = useBreakpoint();
  const { colors } = useAppTheme();
  const router = useRouter();

  // Non-blocking warmup indicator; warms the audio that's always needed as
  // soon as the lists are ready
  const warmupStatus = useAudioWarmup(lists, loading);

  // Returning home ends any list/practice flow: abandon their still-queued
  // warmups and drop the session cache (pinned/persisted entries survive).
  // Focus, not mount — the lobby stays mounted underneath the stack, so a
  // mount-only effect would never fire again on the way back.
  useFocusEffect(
    useCallback(() => {
      speech.cancelWarmups?.();
      speech.clearSessionCache?.();
    }, [speech])
  );

  /** Most recent practice across all lists, for the subtitle */
  const lastActivity = useMemo(() => {
    const stamps = lists
      .map((l) => l.lastPracticedAt)
      .filter((s): s is string => Boolean(s))
      .sort();
    return formatRelativeTime(stamps.at(-1));
  }, [lists]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        {/* Non-blocking warmup indicator */}
        {warmupStatus && (
          <View style={[styles.warmupBanner, { backgroundColor: Brand.primary }]}>
            <Text style={styles.warmupText} numberOfLines={1}>
              🔊 {warmupStatus}
            </Text>
          </View>
        )}

        {/* Lobby is the root, so its trail is a single crumb. Rendering the same
            bar as the detail screen keeps the chrome identical between them. */}
        {lists.length > 0 && <BreadcrumbBar items={[{ label: "Mis listas" }]} />}

        {loading ? (
          <View style={styles.centered}>
            <ThemedText themeColor="textSecondary">Cargando...</ThemedText>
          </View>
        ) : lists.length === 0 ? (
          <View style={styles.centered}>
            <NarraLogo size={56} />
            <ThemedText type="subtitle" style={styles.center}>
              No tienes listas aún
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Crea tu primera lista para empezar a practicar
            </ThemedText>
            <Pressable
              onPress={() => router.push("/list/new")}
              style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
            >
              <Text style={styles.emptyCtaText}>+  Nueva lista</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <ContentContainer>
              {/* Title lives in the breadcrumb / header; only the meta line here
                  so it isn't repeated twice on the same screen */}
              <View style={styles.heading}>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {lists.length} {lists.length === 1 ? "lista" : "listas"}
                  {lastActivity ? ` · última práctica ${lastActivity}` : ""}
                </Text>
              </View>

              <View style={styles.grid}>
                {lists.map((list) => (
                  <View
                    key={list.id}
                    style={[styles.gridItem, { width: `${100 / gridColumns}%` }]}
                  >
                    <ListCard list={list} onPress={() => router.push(`/list/${list.id}`)} />
                  </View>
                ))}

                {/* Inline create action, so "+" isn't only a floating button */}
                <View style={[styles.gridItem, { width: `${100 / gridColumns}%` }]}>
                  <NewListCard onPress={() => router.push("/list/new")} />
                </View>
              </View>
            </ContentContainer>
          </ScrollView>
        )}

        {/* The FAB is a touch affordance; on desktop the sidebar CTA covers it */}
        {isCompact && lists.length > 0 && (
          <Pressable
            onPress={() => router.push("/list/new")}
            accessibilityLabel="Nueva lista"
            style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          >
            <Text style={styles.fabText}>+</Text>
          </Pressable>
        )}
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
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    alignItems: "center",
  },
  warmupText: {
    color: Brand.accentSoft,
    fontSize: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    // Matches the list detail so the content starts at the same height
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  heading: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  subtitle: {
    fontSize: 11,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // Negative margin pairs with gridItem padding to create even gutters
    marginHorizontal: -Spacing.one,
  },
  gridItem: {
    padding: Spacing.one,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
  },
  center: {
    textAlign: "center",
  },
  emptyCta: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Brand.accent,
  },
  emptyCtaText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
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
    color: Brand.onPrimary,
    fontSize: 28,
    fontWeight: "bold",
    marginTop: -2,
  },
  pressed: {
    opacity: 0.7,
  },
});
