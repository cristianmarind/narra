import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdsInfoModal } from "@/components/ads-info-modal";
import { AppSidebar } from "@/components/app-sidebar";
import { NarraLogo } from "@/components/narra-logo";
import { NavDrawer } from "@/components/nav-drawer";
import { SettingsModal } from "@/components/settings-modal";
import { Brand } from "@/constants/theme";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { PhraseListsProvider } from "@/hooks/use-phrase-lists";
import { ThinkTimeProvider } from "@/hooks/use-think-time";
import { TtsSpeedProvider } from "@/hooks/use-tts-speed";
import { UserLevelProvider } from "@/hooks/use-user-level";
import { useAppLoading } from "@/hooks/use-app-loading";
import { ServicesProvider } from "@/services";

SplashScreen.preventAutoHideAsync();

/** Rotating notices shown under the loading message, explaining the ads policy. */
const ADS_LOADING_NOTICES = [
  "Narra se mantiene con anuncios poco intrusivos",
  "Verás máximo un anuncio cada 2 días, solo al terminar tu práctica",
  "Nunca te interrumpimos en medio de una sesión",
  "Tú decides si quieres ver un anuncio extra para apoyar la app 💚",
];

function AdsLoadingNotice() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((i) => (i + 1) % ADS_LOADING_NOTICES.length),
      3500,
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={styles.loadingNotice}>{ADS_LOADING_NOTICES[index]}</Text>
  );
}

function RootLayoutInner() {
  const { mode, colors } = useAppTheme();
  const { isCompact } = useBreakpoint();
  const { loadingMessage } = useAppLoading();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adsInfoOpen, setAdsInfoOpen] = useState(false);

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

  // Compact-header shortcut to the ads-policy explanation ("anuncios que no
  // molestan"); on wide layouts the same entry lives in the sidebar
  const adsInfoButton = () => (
    <Pressable
      onPress={() => setAdsInfoOpen(true)}
      accessibilityLabel="Cómo funcionan los anuncios en Narra"
      style={({ pressed }) => [styles.adsPill, pressed && styles.pressed]}
    >
      <Text style={styles.adsPillText}>💚 Sin spam</Text>
    </Pressable>
  );

  return (
    <ThemeProvider value={mode === "dark" ? DarkTheme : DefaultTheme}>
      <View style={[styles.shell, { backgroundColor: colors.background }]}>
        {/* Persistent navigation from `md` up; below that it lives in the drawer */}
        {!isCompact && (
          <AppSidebar
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenAdsInfo={() => setAdsInfoOpen(true)}
          />
        )}

        <View style={styles.main}>
          <Stack
            screenOptions={{
              // On wide layouts the sidebar carries the brand and each screen
              // renders its own heading plus a breadcrumb, so a native header on
              // top of that would be a second, redundant title bar.
              headerShown: isCompact,
              headerLeft: menuButton,
              headerRight: adsInfoButton,
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

      {/* Loading overlay during splash */}
      {loadingMessage && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <NarraLogo size={76} color={Brand.onPrimary} variant="dark" />
            <Text style={styles.loadingText}>{loadingMessage}</Text>
            <AdsLoadingNotice />
          </View>
        </View>
      )}

      <NavDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdsInfo={() => setAdsInfoOpen(true)}
      />
      <SettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AdsInfoModal visible={adsInfoOpen} onClose={() => setAdsInfoOpen(false)} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ServicesProvider>
      <TtsSpeedProvider>
        <UserLevelProvider>
          <ThinkTimeProvider>
            <AppThemeProvider>
              <PhraseListsProvider>
                <RootLayoutInner />
              </PhraseListsProvider>
            </AppThemeProvider>
          </ThinkTimeProvider>
        </UserLevelProvider>
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
  adsPill: {
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  adsPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Brand.onPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Brand.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingContent: {
    alignItems: "center",
    gap: 24,
  },
  loadingText: {
    color: Brand.accentSoft,
    fontSize: 14,
    fontWeight: "500",
  },
  loadingNotice: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
    // Notices vary in length; reserving two lines keeps the logo from jumping
    minHeight: 32,
  },
});
