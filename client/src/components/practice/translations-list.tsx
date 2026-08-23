import { useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

interface TranslationsListProps {
  translations: string[];
  /** Prefixes only the first visible line, e.g. "Esperada:" */
  label?: string;
  /** Prefixes every line except the first when `label` is set, or every line otherwise */
  itemPrefix?: string;
  visibleCount?: number;
  textStyle?: StyleProp<TextStyle>;
  linkStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shows up to `visibleCount` accepted translations, with a toggle to reveal
 * the rest when there are more. A phrase can have several valid translations
 * (synonyms, word order) — showing only the first hid that from the user.
 */
export function TranslationsList({
  translations,
  label,
  itemPrefix = "",
  visibleCount = 2,
  textStyle,
  linkStyle,
  style,
}: TranslationsListProps) {
  const [expanded, setExpanded] = useState(false);
  if (translations.length === 0) return null;

  const visible = expanded ? translations : translations.slice(0, visibleCount);
  const remaining = translations.length - visibleCount;

  return (
    <View style={[styles.container, style]}>
      {visible.map((translation, index) => (
        <Text key={index} style={textStyle}>
          {index === 0 && label ? `${label} ` : itemPrefix}
          {translation}
        </Text>
      ))}
      {remaining > 0 && (
        <Pressable
          onPress={() => setExpanded((current) => !current)}
          accessibilityLabel={expanded ? "Ver menos traducciones" : "Ver más traducciones"}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={linkStyle}>{expanded ? "Ver menos ▲" : `Ver ${remaining} más ▾`}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
