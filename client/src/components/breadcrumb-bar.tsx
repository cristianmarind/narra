import { StyleSheet, View } from "react-native";

import { Breadcrumb } from "@/components/breadcrumb";
import type { Crumb } from "@/components/breadcrumb";
import { ContentContainer } from "@/components/content-container";
import { Layout, Spacing } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useAppTheme } from "@/hooks/use-app-theme";

/**
 * Top bar carrying the breadcrumb trail on wide layouts.
 *
 * Renders nothing on compact layouts, where the native stack header provides the
 * title and the back arrow instead. Keeping that decision here means screens can
 * drop it in unconditionally.
 */
export function BreadcrumbBar({ items }: { items: Crumb[] }) {
  const { isExpanded } = useBreakpoint();
  const { colors } = useAppTheme();

  if (!isExpanded) return null;

  return (
    <View style={[styles.bar, { borderBottomColor: colors.borderSubtle }]}>
      <ContentContainer style={styles.inner} maxWidth={Layout.contentMaxWidth}>
        <Breadcrumb items={items} />
      </ContentContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  inner: {
    // Hug the breadcrumb instead of filling the remaining height
    flex: 0,
    paddingVertical: Spacing.three,
  },
});
