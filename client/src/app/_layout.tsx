import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { DrawerMenu } from "@/components/drawer-menu";
import { NarraLogo } from "@/components/narra-logo";
import { Brand } from "@/constants/theme";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { PhraseListsProvider } from "@/hooks/use-phrase-lists";
import { TtsSpeedProvider } from "@/hooks/use-tts-speed";
import { ServicesProvider } from "@/services";

SplashScreen.preventAutoHideAsync();

function RootLayoutInner() {
  const { theme } = useAppTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const menuButton = () => (
    <Pressable
      onPress={() => setDrawerOpen(true)}
      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
    >
      {/* Plain Text, not ThemedText: the header is always brand-colored, so the
          icon must stay light regardless of the app's light/dark theme */}
      <Text style={styles.menuIcon}>☰</Text>
    </Pressable>
  );

  return (
    <>
      <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerLeft: menuButton,
            headerStyle: { backgroundColor: Brand.primary },
            headerTintColor: Brand.onPrimary,
            headerTitleStyle: { color: Brand.onPrimary },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              // The brand replaces the title on the home screen
              headerTitle: () => <NarraLogo size={28} color={Brand.onPrimary} variant="dark" />,
            }}
          />
          <Stack.Screen name="list/new" options={{ title: "Nueva Lista" }} />
          <Stack.Screen
            name="list/create"
            options={{ title: "Crear Lista" }}
          />
          <Stack.Screen
            name="list/import"
            options={{ title: "Importar JSON" }}
          />
          <Stack.Screen
            name="list/ai-helper"
            options={{ title: "Generar con IA" }}
          />
          <Stack.Screen name="list/[id]/index" options={{ title: "Lista" }} />
          <Stack.Screen
            name="list/[id]/edit"
            options={{ title: "Editar Frases" }}
          />
          <Stack.Screen
            name="list/[id]/add-phrase"
            options={{ title: "Agregar Frase" }}
          />
          <Stack.Screen
            name="list/[id]/practice"
            options={{ title: "Practicar", headerShown: false }}
          />
          <Stack.Screen
            name="list/[id]/results"
            options={{ title: "Resultados", headerShown: false }}
          />
        </Stack>
      </ThemeProvider>

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
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
