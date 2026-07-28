import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Brand, Spacing } from "@/constants/theme";

function buildPrompt(topic: string, nativeLang: string, targetLang: string): string {
  return `Genera una lista de frases para practicar "${topic}" traduciendo de ${nativeLang} a ${targetLang}.

Devuelve SOLO un JSON válido con este formato exacto (sin explicaciones ni markdown):

{
  "name": "${topic}",
  "nativeLanguage": "${nativeLang}",
  "targetLanguage": "${targetLang}",
  "phrases": [
    {
      "nativeSentence": "frase en ${nativeLang}",
      "acceptedTranslations": ["traducción 1 en ${targetLang}", "traducción alternativa"]
    }
  ]
}

Reglas:
- Genera entre 15 y 25 frases relevantes al tema
- Cada frase debe tener al menos 2 traducciones aceptadas (variaciones naturales)
- Incluye contracciones y sus formas completas como traducciones separadas (ejemplo: "I'm going" y "I am going", "Where's" y "Where is", "I've" y "I have", etc.)
- Las frases deben ser de uso cotidiano y progresivas en dificultad
- No incluyas explicaciones, solo el JSON`;
}

export default function AiHelperScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [nativeLang, setNativeLang] = useState("español");
  const [targetLang, setTargetLang] = useState("inglés");
  const [copied, setCopied] = useState(false);

  const prompt = buildPrompt(
    topic.trim() || "[tu tema aquí]",
    nativeLang.trim() || "español",
    targetLang.trim() || "inglés"
  );

  async function handleCopy() {
    if (Platform.OS === "web") {
      await navigator.clipboard.writeText(prompt);
    } else {
      await Clipboard.setStringAsync(prompt);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <BreadcrumbBar
          items={[
            { label: "Mis listas", onPress: () => router.replace("/") },
            { label: "Importar JSON", onPress: () => router.replace("/list/import") },
            { label: "Generar con IA" },
          ]}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Instructions */}
          <View style={styles.section}>
            <ThemedText type="subtitle">Generar lista con IA</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Usa este prompt con ChatGPT, Claude, Gemini o cualquier IA para generar una lista de frases.
              Luego importa el JSON resultante con "Importar JSON".
            </ThemedText>
          </View>

          {/* Config fields */}
          <View style={styles.section}>
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Tema a practicar
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ej: Pedir comida en un restaurante"
                placeholderTextColor="#999"
                value={topic}
                onChangeText={setTopic}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Idioma nativo
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="español"
                  placeholderTextColor="#999"
                  value={nativeLang}
                  onChangeText={setNativeLang}
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Idioma objetivo
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="inglés"
                  placeholderTextColor="#999"
                  value={targetLang}
                  onChangeText={setTargetLang}
                />
              </View>
            </View>
          </View>

          {/* Generated prompt */}
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Prompt generado (cópialo y pégalo en tu IA favorita):
            </ThemedText>
            <ThemedView type="backgroundElement" style={styles.promptBlock}>
              <ScrollView nestedScrollEnabled>
                <ThemedText type="small" style={styles.promptText}>
                  {prompt}
                </ThemedText>
              </ScrollView>
            </ThemedView>
          </View>

          {/* Copy button */}
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.primaryButtonText}>
              {copied ? "✓ Copiado" : "📋 Copiar prompt"}
            </ThemedText>
          </Pressable>

          {/* Steps */}
          <View style={styles.section}>
            <ThemedText type="subtitle">Pasos</ThemedText>
            <View style={styles.steps}>
              <ThemedText type="small" themeColor="textSecondary">
                1. Escribe el tema que quieres practicar arriba
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                2. Copia el prompt con el botón
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                3. Pégalo en ChatGPT, Claude, Gemini u otra IA
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                4. Copia la respuesta JSON que te devuelva
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                5. Guárdala en un archivo .json
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                6. Impórtala con "Importar JSON" en esta app
              </ThemedText>
            </View>
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
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  flex1: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
  },
  promptBlock: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    maxHeight: 300,
  },
  promptText: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  steps: {
    gap: Spacing.one,
    paddingLeft: Spacing.two,
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Brand.accent,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
