import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { PhraseListsProvider } from "@/hooks/use-phrase-lists";
import { ServicesProvider } from "@/services";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ServicesProvider>
      <PhraseListsProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen name="index" options={{ title: "Mis Listas" }} />
            <Stack.Screen
              name="list/create"
              options={{ title: "Nueva Lista" }}
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
      </PhraseListsProvider>
    </ServicesProvider>
  );
}
