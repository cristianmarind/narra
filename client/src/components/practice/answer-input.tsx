import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

interface AnswerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  micAvailable: boolean;
  listening: boolean;
  onMicPress: () => void;
}

/**
 * Text area input for the user's translation answer, with optional mic button.
 */
export function AnswerInput({
  value,
  onChangeText,
  onSubmit,
  micAvailable,
  listening,
  onMicPress,
}: AnswerInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribe tu traducción..."
          placeholderTextColor="#999"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          multiline
          textAlignVertical="top"
          autoFocus
        />
        {micAvailable && (
          <Pressable
            onPress={onMicPress}
            style={({ pressed }) => [
              styles.micButton,
              listening && styles.micButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={styles.micButtonText}>
              {listening ? "⏹" : "🎤"}
            </ThemedText>
          </Pressable>
        )}
      </View>
      {listening && (
        <ThemedText type="small" style={styles.listeningHint}>
          Escuchando...
        </ThemedText>
      )}
      <Pressable
        onPress={onSubmit}
        disabled={!value.trim()}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          !value.trim() && styles.disabled,
        ]}
      >
        <ThemedText style={styles.buttonText}>Verificar</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "flex-start",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 16,
    color: "#fff",
    minHeight: 60,
    maxHeight: 120,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F3",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  micButtonActive: {
    backgroundColor: "#DC3545",
  },
  micButtonText: {
    fontSize: 20,
  },
  listeningHint: {
    textAlign: "center",
    color: "#DC3545",
  },
  button: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: "center",
    backgroundColor: "#4A90D9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
