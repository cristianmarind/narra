import { TextInput, type TextInputProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * TextInput that automatically uses the correct text color based on the current theme.
 */
export function ThemedTextInput(props: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[{ color: theme.text }, props.style]}
    />
  );
}
