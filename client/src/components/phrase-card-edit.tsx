import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { Phrase } from "@/types";

interface PhraseCardEditProps {
  phrase: Phrase;
  onSave: (nativeSentence: string, acceptedTranslations: string[]) => void;
  onCancel: () => void;
}

/**
 * Inline editing card for a phrase. Allows modifying the native sentence and translations.
 */
export function PhraseCardEdit({ phrase, onSave, onCancel }: PhraseCardEditProps) {
  const [native, setNative] = useState(phrase.nativeSentence);
  const [translations, setTranslations] = useState(
    phrase.acceptedTranslations.join(", ")
  );

  function handleSave() {
    if (!native.trim() || !translations.trim()) return;

    const parsed = translations
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (parsed.length === 0) return;

    onSave(native.trim(), parsed);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Oración nativa
        </ThemedText>
        <TextInput
          style={styles.input}
          value={native}
          onChangeText={setNative}
          multiline
          autoFocus
        />
      </View>
      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary">
          Traducciones (separadas por coma)
        </ThemedText>
        <TextInput
          style={styles.input}
          value={translations}
          onChangeText={setTranslations}
          multiline
        />
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.cancelText}>Cancelar</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.button,
            styles.saveButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.saveText}>Guardar</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: "#4A90D9",
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: Spacing.one,
    padding: Spacing.two,
    fontSize: 14,
    color: "#fff",
    minHeight: 40,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "flex-end",
  },
  button: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.one,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#888",
  },
  cancelText: {
    color: "#888",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#4A90D9",
  },
  saveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
