# Registro de anuncios (Narra Ads)

`registry.json` es la fuente de verdad de las campañas patrocinadas que la app
inyecta en las sesiones de práctica. Se publica como archivo estático en
Cloudflare Pages; la app lo descarga desde la URL configurada en
`EXPO_PUBLIC_ADS_REGISTRY_URL` (`client/.env`, ver `client/.env.example`), lo
cachea localmente (TTL 24 h) y si la red falla —o la variable no está
definida— usa la última copia cacheada o la copia empaquetada en el build
(`client/src/services/ads/bundled-registry.json` — mantenerla sincronizada con
este archivo al publicar cambios).

## Cómo funciona la inyección

- En cada sesión de práctica se inserta **una** frase patrocinada.
- Solo son elegibles las campañas con `active: true` y cuyo par
  `nativeLanguage`/`targetLanguage` coincide con la lista practicada.
- Solo son elegibles las frases con `level` menor o igual al nivel del usuario
  (configurable en Ajustes): `none < beginner < intermediate < advanced`.
- La frase se practica como cualquier otra (se traduce y se valida), con la
  etiqueta "Patrocinado", y **no** cuenta para la puntuación ni las
  estadísticas.

## Esquema

```jsonc
{
  "version": 1,                 // bump al cambiar el esquema
  "updatedAt": "ISO-8601",
  "campaigns": [
    {
      "id": "unico-por-campana",
      "advertiser": "Nombre mostrado en la etiqueta Patrocinado",
      "active": true,           // false apaga la campaña sin borrarla
      "nativeLanguage": "es",
      "targetLanguage": "en",
      "phrases": [
        {
          "id": "unico-por-frase",
          "text": "Frase en el idioma nativo (el prompt)",
          "acceptedTranslations": ["Una o más traducciones válidas"],
          "level": "none | beginner | intermediate | advanced",
          "order": 1            // opcional: posición fija (1 = primera) en la sesión; sin él, sale como 2ª frase
        }
      ]
    }
  ]
}
```

## ¿Quieres anunciarte?

Escríbenos por WhatsApp al **+57 301 655 6270** con tus frases promocionales y
su nivel de dificultad.

## Publicar cambios

1. Editar `registry.json` (y copiar el contenido a
   `client/src/services/ads/bundled-registry.json`).
2. Push a `master` — Cloudflare Pages redepliega automáticamente.
3. Si el cambio debe ser inmediato, purgar la caché desde el dashboard de
   Cloudflare; si no, se propaga al expirar el TTL.

## Anuncios a pantalla completa (AdMob)

Aparte de las frases patrocinadas, la app móvil usa AdMob
(`react-native-google-mobile-ads`) con una política poco intrusiva
(`client/src/services/fullscreen-ads/`):

- **Interstitial automático**: como máximo uno cada 2 días, y solo al terminar
  o salir de la primera práctica de esa ventana. Nunca en medio de una sesión,
  y nunca en la primera práctica tras instalar la app.
- **Rewarded voluntario**: el usuario puede ver un anuncio cuando quiera para
  apoyar la app ("Apoyar Narra" en el menú, el botón 💚 del header o el enlace
  en resultados). Verlo reinicia el contador de 2 días.
- En web no hay anuncios de AdMob (solo frases patrocinadas).

Configuración: los App IDs van en `client/app.json` (plugin
`react-native-google-mobile-ads` — **hoy tienen los IDs de prueba de Google;
reemplazar por los reales antes de publicar**) y los unit IDs en
`client/.env` (`EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID`,
`EXPO_PUBLIC_ADMOB_REWARDED_ID`). En builds de desarrollo siempre se usan los
TestIds de Google.

> **Nota de versiones**: `react-native-google-mobile-ads` está fijado en
> 16.0.3. Desde la 16.1.0 arrastra `play-services-ads` ≥ 25.x, compilado con
> Kotlin 2.3 — incompatible con el Kotlin de Expo SDK 57 / RN 0.86 (falla
> `compileDebugKotlin`). No subir hasta actualizar Expo/RN.
