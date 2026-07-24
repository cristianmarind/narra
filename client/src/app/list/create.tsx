import { useRouter } from "expo-router";
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

export default function CreateListScreen() {
  const [name, setName] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const { createList } = usePhraseLists();
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim() || !nativeLanguage.trim() || !targetLanguage.trim()) {
      Alert.alert("Error", "Todos los campos son obligatorios");
      return;
    }

    const list = await createList(
      name.trim(),
      nativeLanguage.trim().toLowerCase(),
      targetLanguage.trim().toLowerCase()
    );
    router.replace(`/list/${list.id}`);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.form}>
          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Nombre de la lista
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: Frases del restaurante"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Idioma nativo (código)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: es"
              value={nativeLanguage}
              onChangeText={setNativeLanguage}
              autoCapitalize="none"
              maxLength={5}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              Idioma objetivo (código)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Ej: en"
              value={targetLanguage}
              onChangeText={setTargetLanguage}
              autoCapitalize="none"
              maxLength={5}
            />
          </View>

          <Pressable
            onPress={handleCreate}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <ThemedText style={styles.buttonText}>Crear Lista</ThemedText>
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
