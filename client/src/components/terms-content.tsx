import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";

/**
 * The terms & conditions text itself, shared between the acceptance modal
 * (gated behind a checkbox) and the standalone `/terms` page (no checkbox,
 * just the text — meant to be linkable from outside the app, e.g. app store
 * listings).
 */
export function TermsContent() {
  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
        <ThemedText type="small" style={styles.sectionTitle}>
          Privacidad
        </ThemedText>
        {"\n"}
        Narra no recopila datos personales. Toda tu información (listas, estadísticas,
        preferencias) se almacena localmente en tu dispositivo. No hay servidor backend que
        acceda a tus datos.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
        <ThemedText type="small" style={styles.sectionTitle}>
          Publicidad
        </ThemedText>
        {"\n"}
        La app contiene:
        {"\n"}• Frases patrocinadas (prácticas como cualquier otra, sin impactar tu puntuación)
        {"\n"}• Anuncios de AdMob (Google Mobile Ads) — Google puede recopilar datos anónimos
        para personalizar anuncios según su política de privacidad.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
        <ThemedText type="small" style={styles.sectionTitle}>
          Generador de IA
        </ThemedText>
        {"\n"}
        Las listas generadas con IA usan prompts que envías a ChatGPT, Claude, Gemini u otro
        servicio de terceros. Narra no interviene en esa comunicación.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
        <ThemedText type="small" style={styles.sectionTitle}>
          Limitación de Responsabilidad
        </ThemedText>
        {"\n"}
        Narra se proporciona "tal cual". No somos responsables de pérdida de datos, problemas
        de compatibilidad o daños derivados del uso.
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.section}>
        <ThemedText type="small" style={styles.sectionTitle}>
          Cambios
        </ThemedText>
        {"\n"}
        Podemos actualizar estos términos en cualquier momento. Notificaremos requiriendo nueva
        aceptación.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  section: {
    lineHeight: 20,
  },
  sectionTitle: {
    fontWeight: "600",
  },
});
