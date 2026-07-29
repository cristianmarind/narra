import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Kbd } from "@/components/kbd";
import { Brand, Radius, Spacing } from "@/constants/theme";
import { useAppTheme } from "@/hooks/use-app-theme";

interface AnswerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  micAvailable: boolean;
  listening: boolean;
  onMicPress: () => void;
}

/**
 * Where the user types their translation.
 *
 * Single line by design: answers are one sentence, and a tall textarea pushed the
 * phrase off-center. The mic sits inside the field so the row stays compact.
 */
export function AnswerInput({
  value,
  onChangeText,
  onSubmit,
  micAvailable,
  listening,
  onMicPress,
}: AnswerInputProps) {
  const { colors } = useAppTheme();
  const canSubmit = value.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: listening ? Brand.error : colors.border,
              color: colors.text,
            },
            micAvailable && styles.inputWithMic,
          ]}
          placeholder="Escribe tu traducción..."
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="send"
          autoFocus
        />

        {micAvailable && (
          <Pressable
            onPress={onMicPress}
            accessibilityLabel={listening ? "Detener dictado" : "Dictar respuesta"}
            style={({ pressed }) => [styles.mic, pressed && styles.pressed]}
          >
            <Text style={styles.micIcon}>{listening ? "⏹" : "🎤"}</Text>
          </Pressable>
        )}
      </View>

      {listening && (
        <Text style={[styles.listeningHint, { color: Brand.error }]}>Escuchando...</Text>
      )}

      <View style={styles.submitRow}>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            !canSubmit && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>Verificar</Text>
        </Pressable>
        <Kbd>Enter</Kbd>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  field: {
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 42,
  },
  inputWithMic: {
    // Room for the mic button overlaid on the right edge
    paddingRight: 40,
  },
  mic: {
    position: "absolute",
    right: Spacing.two,
    padding: Spacing.one,
  },
  micIcon: {
    fontSize: 16,
  },
  listeningHint: {
    textAlign: "center",
    fontSize: 12,
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: "center",
    backgroundColor: Brand.accent,
  },
  buttonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
