import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ContentContainer } from "@/components/content-container";
import { TermsContent } from "@/components/terms-content";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Layout, Spacing } from "@/constants/theme";

/**
 * Public, standalone version of the terms text shown in `TermsModal` — no
 * checkbox, just the terms, reachable at its own URL (/terms) so it can be
 * linked from outside the app (store listings, marketing pages, etc.).
 */
export default function TermsScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <BreadcrumbBar
          items={[
            { label: "Mis listas", onPress: () => router.replace("/") },
            { label: "Términos y Condiciones" },
          ]}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ContentContainer maxWidth={Layout.readingMaxWidth} style={styles.content}>
            <ThemedText type="subtitle" style={styles.title}>
              Términos y Condiciones
            </ThemedText>

            <TermsContent />
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
});
