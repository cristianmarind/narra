import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { DrawerMenu } from "@/components/drawer-menu";
import { ThemedText } from "@/components/themed-text";
import { AppThemeProvider, useAppTheme } from "@/hooks/use-app-theme";
import { PhraseListsProvider } from "@/hooks/use-phrase-lists";
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
      <ThemedText style={styles.menuIcon}>☰</ThemedText>
    </Pressable>
  );

  return (
    <>
      <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerLeft: menuButton,
          }}
        >
          <Stack.Screen name="index" options={{ title: "Mis Listas" }} />
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
      <AppThemeProvider>
        <PhraseListsProvider>
          <RootLayoutInner />
        </PhraseListsProvider>
      </AppThemeProvider>
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
  },
  pressed: {
    opacity: 0.6,
  },
});
