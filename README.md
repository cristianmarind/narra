# Narra

App para aprenderse frases en otro idioma. Muestra una oración en tu idioma nativo, la lee
en voz alta, y tú la traduces al idioma que estás aprendiendo — escribiendo o hablando.
La respuesta se valida contra un conjunto de traducciones aceptadas y recibes feedback
inmediato con la respuesta esperada.

Funciona offline: las listas se guardan en el dispositivo y la síntesis de voz corre
localmente en el navegador.

## Arquitectura

```
client/          App React Native + Expo (web y mobile)
  src/app/       Pantallas (expo-router, file-based routing)
  src/services/  Storage y TTS detrás de interfaces inyectables
  src/hooks/     Estado de listas, sesión de práctica, tema, velocidad
  public/        Web Workers de TTS
  assets/brand/  Logos en SVG
backend/         (futuro) Sincronización entre dispositivos
```

Los servicios se inyectan vía `ServicesProvider`, así que la persistencia y el TTS se
pueden reemplazar por plataforma sin tocar las pantallas.

### Text-to-speech

Cada idioma va al motor que mejor lo maneja, cada uno en su propio Web Worker:

| Idioma | Motor | Voz |
|---|---|---|
| Inglés | Kokoro (`kokoro-js`) | `af_heart`, `bf_emma` |
| Español | Piper (`@diffusionstudio/vits-web`) | `es_MX-claude-high` |
| Otros | Web Speech API del navegador | la mejor voz disponible del sistema |

Los modelos se descargan de CDNs públicos y quedan cacheados por el navegador. El audio
generado se guarda en dos capas: memoria para la sesión, e IndexedDB para las frases fijas
de la app y la primera frase de cada lista, que se pregeneran al abrir el home.

En mobile todavía se usa `expo-speech`.

## Levantar en local

Con Docker (no necesitas Node instalado):

```bash
docker compose up --build
```

La app queda en `http://localhost:8081`.

Sin Docker, desde `client/`:

```bash
npm install
npm run web        # o: npm run android / npm run ios
```

### Notas de desarrollo con Docker

En Windows el file watcher de Metro no ve los cambios a través de los volúmenes montados.
Si editas algo y no se refleja:

```bash
docker compose restart client
```

Para correr comandos dentro del contenedor, usa comillas simples por fuera:

```bash
docker compose exec -T client sh -c 'npm run lint'
```

## Formato de importación

Las listas se pueden crear a mano o importar como JSON:

```json
{
  "name": "Entrevista técnica",
  "nativeLanguage": "es",
  "targetLanguage": "en",
  "phrases": [
    {
      "nativeSentence": "Tengo experiencia trabajando con Scrum.",
      "acceptedTranslations": [
        "I have experience working with Scrum.",
        "I've worked with Scrum."
      ]
    }
  ]
}
```

La pantalla de importación incluye un prompt listo para generar este JSON con una IA.
