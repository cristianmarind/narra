import { TextInput, type TextInputProps } from "react-native";

import { useAppTheme } from "@/hooks/use-app-theme";

/**
 * TextInput that automatically uses the correct text color based on the current theme.
 */
export function ThemedTextInput(props: TextInputProps) {
  const { colors } = useAppTheme();

  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      {...props}
      style={[{ color: colors.text }, props.style]}
    />
  );
}
