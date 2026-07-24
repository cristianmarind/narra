import { Alert, Platform } from "react-native";

/**
 * Cross-platform confirmation dialog.
 * Uses window.confirm on web and Alert.alert on native.
 */
export function confirm(
  title: string,
  message: string,
  onConfirm: () => void
): void {
  if (Platform.OS === "web") {
    const result = window.confirm(`${title}\n\n${message}`);
    if (result) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", style: "destructive", onPress: onConfirm },
    ]);
  }
}
