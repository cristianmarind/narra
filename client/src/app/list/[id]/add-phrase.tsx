import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { usePhraseLists } from "@/hooks/use-phrase-lists";

export default function AddPhraseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nativeSentence, setNativeSentence] = useState("");
  const [translations, setTranslations] = useState("");
  const { addPhrase } = usePhraseLists();
  const router = useRouter();

  async function handleAdd() {
    if (!nativeSentence.trim() || !translations.trim()) {
      Alert.alert("Error", "Ambos campos son obligatorios");
      return;
    }

    const acceptedTranslations = translations
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (acceptedTranslations.length === 0) {
      Alert.alert("Error", "Ingresa al menos una traducción");
      return;
    }

    await addPhrase(id!, nativeSentence.trim(), acceptedTranslations);

    // Reset fields to allow adding multiple
    setNativeSentence("");
    setTranslations("");
    Alert.alert("Listo", "Frase agregada", [
      { text: "Agregar otra", style: "default" },
      { text: "Volver", onPress: () => router.back() },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Oración en idioma nativo
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: ¿Dónde está el baño?"
              value={nativeSentence}
              onChangeText={setNativeSentence}
              multiline
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Traducciones aceptadas (separadas por coma)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: Where is the bathroom?, Where's the bathroom?"
              value={translations}
              onChangeText={setTranslations}
              multiline
            />
          </View>

          <Pressable
            onPress={handleAdd}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <ThemedText style={styles.buttonText}>Agregar Frase</ThemedText>
          </Pressable>
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
  form: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    minHeight: 48,
    color: "#fff",
  },
  button: {
    backgroundColor: "#4A90D9",
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
