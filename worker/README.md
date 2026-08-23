# Worker de Narra (Cloudflare)

Un solo Cloudflare Worker sirve todo el contenido remoto de la app —
registro de anuncios y listas por defecto— desde **una sola URL**. Todo vive
en **[`worker.js`](./worker.js)**: no hay archivos fuente separados ni paso
de generación — ese archivo es literalmente lo que se pega en el editor del
Worker en Cloudflare.

En la app solo hace falta un env var: `EXPO_PUBLIC_ADS_REGISTRY_URL` en
`client/.env` (y `.env.production`).

## Rutas

Todo vive en la misma URL, ruteado por query param:

| Request | Responde |
|---|---|
| `GET /` (sin query) | El registro de anuncios (constante `ADS_REGISTRY`) |
| `GET /?defaultLists=manifest` | El manifiesto de listas por defecto (`{version, lists: [{id, url, updatedAt}]}`), generado a partir de `DEFAULT_LISTS` |
| `GET /?defaultLists=<id>` | El contenido completo de esa lista (`DEFAULT_LISTS[id].def`) |

El manifiesto arma cada `url` a partir de la request (`origin + pathname +
?defaultLists=<id>`), así que sigue funcionando sin tocar código si cambias
de dominio o ruta del Worker.

## Publicar cambios

1. Editar `worker.js` directamente:
   - Anuncios → objeto `ADS_REGISTRY` (ver esquema abajo).
   - Listas por defecto → objeto `DEFAULT_LISTS` (ver esquema abajo). Al
     **actualizar** una lista existente, cambiar su `updatedAt` (si no
     cambia, ninguna app la vuelve a descargar). Al **agregar** una lista
     nueva, usar una clave (`id`) que no se haya usado antes — se sembrará
     sola en todas las apps instaladas, sin deploy de la app.
2. Copiar todo el contenido de `worker.js` y pegarlo en el editor del Worker
   en el dashboard de Cloudflare (Workers & Pages → tu worker → Edit code),
   o desplegarlo con `wrangler deploy` si lo prefieres. Guardar y desplegar.
3. Si el cambio es de anuncios o de una de las listas empaquetadas de
   fábrica (`lista-1`...`lista-6`), copiar también el contenido nuevo al
   snapshot que la app lleva empaquetado como fallback offline:
   - Anuncios → `client/src/services/ads/bundled-registry.json`
   - Listas → `client/src/data/default-lists/*.json` (y registrarla en
     `client/src/data/default-lists/index.ts` si es una lista nueva y
     también quieres que quede empaquetada — opcional: una lista puede vivir
     *solo* en el Worker y sembrarse por sincronización, sin tocar el
     cliente).
4. No hay caché de borde propia — el Worker calcula la respuesta en cada
   request. En el cliente, tanto el registro de anuncios como el manifiesto
   de listas se cachean localmente 24 h.

## Esquema

### `ADS_REGISTRY`

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

Ver [`/ads/README.md`](../ads/README.md) para cómo se inyectan las frases
patrocinadas en la práctica.

### `DEFAULT_LISTS`

```jsonc
{
  "identificador-estable": {   // no cambiar entre publicaciones: liga esta entrada a la lista ya sembrada en el dispositivo
    "updatedAt": "2026-08-22T00:00:00.000Z",  // ISO-8601; cambiarlo es lo que dispara la actualización en las apps
    "def": {
      "name": "Nombre de la lista",
      "nativeLanguage": "es",
      "targetLanguage": "en",
      "showTranslation": false,   // opcional: activa el modo aprendizaje al sembrarla
      "phrases": [
        {
          "nativeSentence": "Frase en el idioma nativo",
          "acceptedTranslations": ["Una o más traducciones válidas"],
          "properNouns": ["Nombres o palabras que el reconocimiento de voz no transcribe bien"]  // opcional
        }
      ]
    }
  }
}
```

`def` tiene el mismo formato que el [esquema de
importación](../client/src/app/list/import.tsx).

## Cómo funciona la sincronización de listas por defecto

- En cada arranque la app compara el `updatedAt` de cada entrada del
  manifiesto contra el último que aplicó localmente.
- Si cambió (o el `id` es nuevo), descarga el contenido de esa entrada y:
  - si ya existe una lista local con ese `id` (fue sembrada antes, de
    fábrica o por una sincronización previa), **actualiza su contenido en el
    sitio** — conserva el progreso (aciertos/fallos) de las frases que siguen
    igual, emparejándolas por texto.
  - si el `id` nunca se había visto, **crea una lista nueva** — así una lista
    agregada a `DEFAULT_LISTS` aparece sola en las apps ya instaladas, sin
    deploy de la app.
- Si el usuario borró una lista por defecto, no vuelve a aparecer aunque su
  contenido cambie (solo reaparece si el `id` es realmente nuevo).
- Nunca sobreescribe listas creadas o importadas por el usuario — solo toca
  las que se sembraron desde una entrada de `DEFAULT_LISTS`.
- Si `EXPO_PUBLIC_ADS_REGISTRY_URL` no está configurada, la app no consulta
  la red para nada de esto: usa el registro de anuncios vacío y las listas
  por defecto empaquetadas (`client/src/data/default-lists/`).
