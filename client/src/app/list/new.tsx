import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export default function NewListScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <BreadcrumbBar
          items={[
            { label: "Mis listas", onPress: () => router.replace("/") },
            { label: "Nueva lista" },
          ]}
        />

        <View style={styles.content}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            Elige cómo quieres crear tu lista de frases
          </ThemedText>

          <View style={styles.options}>
            {/* Manual */}
            <Pressable
              onPress={() => router.push("/list/create")}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <ThemedView type="backgroundElement" style={styles.optionCard}>
                <ThemedText style={styles.optionIcon}>✏️</ThemedText>
                <View style={styles.optionText}>
                  <ThemedText type="subtitle">Crear manualmente</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Define nombre, idiomas y agrega frases una por una
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>

            {/* Import JSON */}
            <Pressable
              onPress={() => router.push("/list/import")}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <ThemedView type="backgroundElement" style={styles.optionCard}>
                <ThemedText style={styles.optionIcon}>📥</ThemedText>
                <View style={styles.optionText}>
                  <ThemedText type="subtitle">Importar JSON</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Apoyate de la IA para generar un listado de frases
                  </ThemedText>
                </View>
              </ThemedView>
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
    gap: Spacing.four,
    justifyContent: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  options: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  option: {
    borderRadius: Spacing.two,
    overflow: "hidden",
  },
  optionCard: {
    padding: Spacing.four,
    borderRadius: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
