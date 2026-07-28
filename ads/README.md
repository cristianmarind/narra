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
