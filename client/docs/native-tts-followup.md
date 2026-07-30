# TTS neural nativo — pasos pendientes de verificación

El servicio de voz ya está refactorizado en un core agnóstico de plataforma
(`src/services/speech/core.ts`) con composiciones por plataforma:

- **Web** (`neural-web.ts`): Kokoro/Piper en Web Workers + IndexedDB — funcional, sin cambios de comportamiento.
- **Nativo** (`neural-native.ts`): Kokoro vía `react-native-executorch` (inglés y español)
  + persistencia en `expo-file-system` + playback con `react-native-audio-api`.

El código nativo está escrito pero **no verificado en dispositivo**: las dependencias
nativas no están instaladas (requieren un dev client custom, no funcionan en Expo Go).
Mientras no estén instaladas, `isNeuralNativeAvailable()` devuelve `false` y el factory
cae a `expo-speech` (comportamiento previo intacto).

## Pasos para activarlo

1. **Instalar dependencias**:
   ```bash
   npx expo install react-native-executorch react-native-audio-api
   ```
   (Revisar si la versión instalada requiere además `react-native-executorch-expo-resource-fetcher`
   e `initExecutorch` en el entry point — versiones antiguas lo pedían.)

2. **Verificar la API del módulo TTS** contra los typings instalados
   (`node_modules/react-native-executorch`). Ajustar SOLO
   `src/services/speech/engines/executorch-engine.ts` (buscar los comentarios `VERIFY`):
   - Carga del modelo: el adapter usa `TextToSpeechModule.fromModelName(config, onProgress)`
     (API que usaba el repo antes); las docs actuales muestran carga por objeto de config
     y `forward({ text, speed })` en vez de `forward(text, speed)`.
   - Voz española: `spanishKokoroModel()` toma la primera voz del bundle
     `models.text_to_speech.kokoro.es` — confirmar el nombre exacto del export.
   - En `players/native-audio-player.ts`: confirmar el casing del callback de fin de
     reproducción (`onended` vs `onEnded`).

3. **Compilar un dev client**:
   ```bash
   npx expo prebuild
   npx expo run:android    # requiere Android Studio/SDK
   ```
   o con EAS: `eas build --profile development --platform android`.

4. **Probar en dispositivo**:
   - Primera ejecución: descarga del modelo Kokoro (~80 MB por idioma); el estado
     `loading` debe verse en Settings y en el overlay de carga.
   - Hablar inglés y español con voz neural; cambiar velocidad en Settings y verificar
     que aplica (Kokoro hornea la velocidad en generación).
   - Un idioma no soportado (p. ej. francés) debe caer a la voz del sistema (expo-speech).
   - Cerrar y reabrir la app: las primeras frases deben sonar al instante
     (caché en `documentDirectory/tts-cache/`, inspeccionable con `adb shell run-as`).
   - Cambio de velocidad: purga toda la caché no-pinned nativa (en nativo TODO es
     speed-dependent, a diferencia de web donde Piper sobrevive).
   - Expo Go (sin los módulos nativos) debe seguir cayendo a expo-speech sin crash.

5. **Re-verificar web tras instalar los deps**: una vez instalados, entran al grafo
   de módulos del bundle web. Correr `npx expo export --platform web` y probar la app;
   si la evaluación del módulo en web diera problemas, anteponer un gate
   `Platform.OS !== "web"` a los `require` con guarda en
   `engines/executorch-engine.ts` y `players/native-audio-player.ts`.
