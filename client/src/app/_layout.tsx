import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppSidebar } from "@/components/app-sidebar";
import { NarraLogo } from "@/components/narra-logo";
import { NavDrawer } from "@/components/nav-drawer";
import { SettingsModal } from "@/components/settings-modal";
import { Brand } from "@/constants/theme";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { PhraseListsProvider } from "@/hooks/use-phrase-lists";
import { TtsSpeedProvider } from "@/hooks/use-tts-speed";
import { useTheme } from "@/hooks/use-theme";
import { ServicesProvider } from "@/services";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { theme } = useAppTheme();
  const { isCompact } = useBreakpoint();
  const colors = useTheme();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Leaving the compact layout would strand the drawer open behind the sidebar
  useEffect(() => {
    if (!isCompact) setDrawerOpen(false);
  }, [isCompact]);

  const menuButton = () => (
    <Pressable
      onPress={() => setDrawerOpen(true)}
      accessibilityLabel="Abrir menú"
      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
    >
      {/* Plain Text, not ThemedText: the header is always brand-colored, so the
          icon must stay light regardless of the app's light/dark theme */}
      <Text style={styles.menuIcon}>☰</Text>
    </Pressable>
  );

  return (
    <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        {/* Persistent navigation from `md` up; below that it lives in the drawer */}
        {!isCompact && <AppSidebar onOpenSettings={() => setSettingsOpen(true)} />}

        <View style={styles.main}>
          <Stack
            screenOptions={{
              // On wide layouts the sidebar carries the brand and each screen
              // renders its own heading plus a breadcrumb, so a native header on
              // top of that would be a second, redundant title bar.
              headerShown: isCompact,
              headerLeft: menuButton,
              headerStyle: { backgroundColor: Brand.primary },
              headerTintColor: Brand.onPrimary,
              headerTitleStyle: { color: Brand.onPrimary },
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                // Only reached on compact layouts, where the header is the only
                // place the brand appears
                title: "Mis listas",
                headerTitle: () => (
                  <NarraLogo
                    size={28}
                    color={Brand.onPrimary}
                    variant="dark"
                    onPress={() => router.replace("/")}
                  />
                ),
              }}
            />
            <Stack.Screen name="list/new" options={{ title: "Nueva lista" }} />
            <Stack.Screen name="list/create" options={{ title: "Crear lista" }} />
            <Stack.Screen name="list/import" options={{ title: "Importar JSON" }} />
            <Stack.Screen name="list/ai-helper" options={{ title: "Generar con IA" }} />
            <Stack.Screen name="list/[id]/index" options={{ title: "Lista" }} />
            <Stack.Screen name="list/[id]/edit" options={{ title: "Editar frases" }} />
            <Stack.Screen name="list/[id]/add-phrase" options={{ title: "Agregar frase" }} />
            <Stack.Screen
              name="list/[id]/practice"
              options={{ title: "Practicar", headerShown: false }}
            />
            <Stack.Screen
              name="list/[id]/results"
              options={{ title: "Resultados", headerShown: false }}
            />
          </Stack>
        </View>
      </View>

      <NavDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ServicesProvider>
      <TtsSpeedProvider>
        <AppThemeProvider>
          <PhraseListsProvider>
            <RootLayoutInner />
          </PhraseListsProvider>
        </AppThemeProvider>
      </TtsSpeedProvider>
    </ServicesProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
  },
  main: {
    flex: 1,
    // Without this the Stack can push the sidebar off-screen on narrow desktops
    minWidth: 0,
  },
  menuButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  menuIcon: {
    fontSize: 22,
    color: Brand.onPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
