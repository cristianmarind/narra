import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NarraLogo } from "@/components/narra-logo";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";

interface AppSidebarProps {
  /** Opens the settings modal */
  onOpenSettings: () => void;
  /** Called after any navigation, so the mobile drawer can close itself */
  onNavigate?: () => void;
}

/**
 * Primary navigation.
 *
 * The same component serves both layouts: persistent on the left from `md` up,
 * and inside a slide-over drawer below that. Keeping one implementation means the
 * two never drift apart.
 */
export function AppSidebar({ onOpenSettings, onNavigate }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Every list route lives under the "Mis listas" section
  const listsActive = pathname === "/" || pathname.startsWith("/list");

  function go(path: string) {
    router.push(path as never);
    onNavigate?.();
  }

  return (
    <View style={styles.sidebar}>
      <View style={styles.logo}>
        <NarraLogo
          size={26}
          variant="dark"
          color={Brand.onPrimary}
          onPress={() => go("/")}
          style={styles.logoLink}
        />
      </View>

      <View style={styles.nav}>
        <NavItem
          icon="▤"
          label="Mis listas"
          active={listsActive}
          onPress={() => go("/")}
        />
        <NavItem
          icon="⚙"
          label="Configuración"
          active={false}
          onPress={() => {
            onOpenSettings();
            onNavigate?.();
          }}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => go("/list/new")}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>+  Nueva lista</Text>
        </Pressable>
      </View>
    </View>
  );
}

function NavItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.navItem,
        active && styles.navItemActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.navIcon, active && styles.navTextActive]}>{icon}</Text>
      <Text style={[styles.navLabel, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The sidebar always uses the brand indigo, so its text colors are fixed rather
 * than theme-derived.
 */
const styles = StyleSheet.create({
  sidebar: {
    width: Layout.sidebarWidth,
    flexShrink: 0,
    height: "100%",
    backgroundColor: Brand.primary,
  },
  logo: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  logoLink: {
    // Keeps the touch target to the logo itself instead of the full-width row
    alignSelf: "flex-start",
  },
  nav: {
    flex: 1,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  navItemActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  navIcon: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    width: 16,
  },
  navLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
  },
  navTextActive: {
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600",
  },
  footer: {
    padding: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: "rgba(108,92,231,0.45)",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
  },
  pressed: {
    opacity: 0.7,
  },
});
