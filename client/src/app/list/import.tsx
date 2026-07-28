import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { useServices } from "@/services";

/**
 * Expected JSON format:
 * {
 *   "name": "Lista nombre",
 *   "nativeLanguage": "es",
 *   "targetLanguage": "en",
 *   "phrases": [
 *     {
 *       "nativeSentence": "Hola",
 *       "acceptedTranslations": ["Hello", "Hi"]
 *     }
 *   ]
 * }
 */
interface ImportedList {
  name: string;
  nativeLanguage: string;
  targetLanguage: string;
  phrases: {
    nativeSentence: string;
    acceptedTranslations: string[];
  }[];
}

function validateImportedData(data: unknown): data is ImportedList {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== "string" || !obj.name.trim()) return false;
  if (typeof obj.nativeLanguage !== "string" || !obj.nativeLanguage.trim()) return false;
  if (typeof obj.targetLanguage !== "string" || !obj.targetLanguage.trim()) return false;
  if (!Array.isArray(obj.phrases) || obj.phrases.length === 0) return false;

  return obj.phrases.every((p: unknown) => {
    if (!p || typeof p !== "object") return false;
    const phrase = p as Record<string, unknown>;
    return (
      typeof phrase.nativeSentence === "string" &&
      phrase.nativeSentence.trim() !== "" &&
      Array.isArray(phrase.acceptedTranslations) &&
      phrase.acceptedTranslations.length > 0 &&
      phrase.acceptedTranslations.every((t: unknown) => typeof t === "string" && (t as string).trim() !== "")
    );
  });
}

export default function ImportListScreen() {
  const router = useRouter();
  const { createList, addPhrase } = usePhraseLists();
  const { speech } = useServices();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");

  async function importList(data: ImportedList) {
    setLoading(true);

    try {
      const list = await createList(data.name, data.nativeLanguage, data.targetLanguage);

      for (const phrase of data.phrases) {
        await addPhrase(list.id, phrase.nativeSentence, phrase.acceptedTranslations);
      }

      // Show success message briefly
      setSuccessMessage(`"${data.name}" importada con ${data.phrases.length} frases`);

      // Pre-generate first phrase audio in background (fire-and-forget)
      if (speech.pregeneratePersistent && data.phrases.length > 0) {
        const firstText = data.phrases[0].acceptedTranslations[0];
        speech.pregeneratePersistent([firstText], data.targetLanguage).catch(() => {
          // Silently ignore errors — audio will be generated on demand later
        });
      }

      // Navigate to home after a short delay so user sees the success message
      setTimeout(() => {
        router.replace("/");
      }, 1500);
    } catch (error) {
      Alert.alert("Error", "Hubo un problema al importar la lista.");
    } finally {
      setLoading(false);
    }
  }

  function handleParseText() {
    if (!jsonText.trim()) {
      Alert.alert("Error", "Pega el JSON primero");
      return;
    }

    try {
      const parsed = JSON.parse(jsonText.trim());

      if (!validateImportedData(parsed)) {
        Alert.alert(
          "Formato inválido",
          "El JSON no tiene el formato esperado. Revisa la estructura requerida."
        );
        return;
      }

      setJsonText("");
      importList(parsed);
    } catch (error) {
      Alert.alert("Error", "El texto no es un JSON válido.");
    }
  }

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      let content: string;

      if (Platform.OS === "web") {
        // On web, read via fetch from the URI (blob URL)
        const response = await fetch(file.uri);
        content = await response.text();
      } else {
        // On native, use FileSystem
        content = await FileSystem.readAsStringAsync(file.uri);
      }

      const parsed = JSON.parse(content);

      if (!validateImportedData(parsed)) {
        Alert.alert(
          "Formato inválido",
          "El archivo JSON no tiene el formato esperado. Revisa la estructura requerida."
        );
        return;
      }

      importList(parsed);
    } catch (error) {
      Alert.alert("Error", "No se pudo leer el archivo. Asegúrate de que sea un JSON válido.");
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        {/* Loading overlay */}
        {loading && (
          <View style={styles.overlay}>
            <View style={styles.overlayContent}>
              <ActivityIndicator size="large" color={Brand.accentSoft} />
              <ThemedText style={styles.overlayText}>Importando lista...</ThemedText>
            </View>
          </View>
        )}

        {/* Success message */}
        {successMessage && (
          <View style={styles.successBanner}>
            <ThemedText style={styles.successText}>✓ {successMessage}</ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.content}>
          {/* Instructions */}
          <View style={styles.section}>
            <ThemedText type="subtitle">Importar lista desde JSON</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Selecciona un archivo, pega el JSON directamente, o genera uno con IA.
            </ThemedText>
            <Pressable
              onPress={() => router.push("/list/ai-helper")}
              style={({ pressed }) => [styles.helperLink, pressed && styles.pressed]}
            >
              <ThemedText style={styles.helperLinkText}>
                🤖 Generar JSON con IA (ver prompt)
              </ThemedText>
            </Pressable>
          </View>

          {/* Pick file button */}
          <Pressable
            onPress={handlePickFile}
            disabled={loading}
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            <ThemedText style={styles.secondaryButtonText}>
              📁 Seleccionar archivo JSON
            </ThemedText>
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText type="small" themeColor="textSecondary">o</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Paste JSON text */}
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Pega el JSON directamente:
            </ThemedText>
            <TextInput
              style={styles.textArea}
              placeholder='{ "name": "...", ... }'
              placeholderTextColor="#999"
              value={jsonText}
              onChangeText={setJsonText}
              multiline
              textAlignVertical="top"
            />
            <Pressable
              onPress={handleParseText}
              disabled={!jsonText.trim() || loading}
              style={({ pressed }) => [
                styles.button,
                styles.secondaryButton,
                pressed && styles.pressed,
                (!jsonText.trim() || loading) && styles.disabled,
              ]}
            >
              <ThemedText style={styles.secondaryButtonText}>
                Importar JSON
              </ThemedText>
            </Pressable>
          </View>
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
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#444",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 14,
    minHeight: 120,
    fontFamily: "monospace",
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Brand.accent,
  },
  secondaryButtonText: {
    color: Brand.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayContent: {
    alignItems: "center",
    gap: Spacing.three,
  },
  overlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  successBanner: {
    backgroundColor: "#1a3d2a",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
  },
  successText: {
    color: "#4ADE80",
    fontSize: 16,
    fontWeight: "600",
  },
  helperLink: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: "#666",
    alignSelf: "flex-start",
  },
  helperLinkText: {
    color: Brand.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
