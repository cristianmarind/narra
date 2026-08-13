# Narra

Aprende idiomas como realmente se aprenden: por frases completas, no por palabras
sueltas. Narra aplica el **Enfoque Léxico** y el **Sentence Mining** — las técnicas
detrás de los políglotas — en una dinámica simple y adictiva: escuchas una frase en tu
idioma, la traduces hablando o escribiendo, y recibes feedback inmediato con voz de
calidad neuronal.

- **100% gratis y sin cuenta**: sin suscripciones, sin anuncios invasivos, sin límites
  de práctica.
- **Voz de calidad real**: modelos neuronales de síntesis corriendo en tu dispositivo —
  se oye como una persona, no como un robot.
- **Funciona offline**: tus listas y el audio viven en tu dispositivo; practica en el
  avión, el metro o donde no llegue la señal.
- **Juégalo donde sea y con quien sea**: el modo manos libres lo convierte en un juego
  por turnos — en el carro, en el salón de clase, caminando. La app lee la frase, alguien
  la traduce en voz alta, y la app dice si acertó. Frase a frase, sin pantallas de por
  medio.
- **Tus frases, tu mundo**: crea listas de lo que a ti te sirve (una entrevista, un
  viaje, tu serie favorita) o genera listas con IA en un clic.

## ¿Qué problema soluciona?

Millones de personas llevan **años** "aprendiendo" un idioma y siguen sin poder sostener
una conversación. No es falta de esfuerzo — es que las apps tradicionales entrenan lo
que no sirve:

- **Memorizas palabras sueltas, pero hablas en frases.** Saber "apple" no te consigue
  trabajo; saber decir "I have experience working with Scrum" sí. Narra entrena la
  unidad real del habla: la frase completa, con oído y pronunciación desde el día uno.
- **Las apps te enseñan a jugar, no a hablar.** Rachas, gemas y lecciones que premian
  tocar la pantalla. En Narra la única mecánica es la que ocurre en la vida real:
  escuchas, traduces, hablas.
- **Lo que necesitas aprender no está en el curso.** Ningún curso genérico trae las
  frases de *tu* entrevista, *tu* viaje o *tu* consulta médica. En Narra el contenido lo
  defines tú — o lo genera la IA en segundos.
- **Aprender bien es caro.** Tutores, suscripciones, cursos... Narra es 100% gratis y su
  voz neuronal corre en tu dispositivo: calidad de tutor sin pagar un tutor.
- **Practicar hablado da pena y requiere compañía.** Con el modo manos libres practicas
  conversación en voz alta sin nadie juzgándote — o al revés: conviértelo en un juego
  por turnos con tu familia en el carro.
- **La conectividad no puede ser un requisito.** Donde más se necesita aprender inglés
  es justo donde menos internet hay. Narra funciona offline por diseño, no por accidente.

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

### Probar en un dispositivo Android físico

Sin cable, por WiFi (Android 11+):

1. En el teléfono: Ajustes → Opciones de desarrollador → activa **Depuración
   inalámbrica**.
2. Toca "Emparejar dispositivo con código de emparejamiento" — anota la IP:puerto y el
   código de 6 dígitos que aparecen (expiran rápido, úsalos de inmediato).
3. Empareja una sola vez:
   ```bash
   adb pair <ip>:<puerto-emparejamiento> <código>
   ```
4. En la pantalla principal de "Depuración inalámbrica" (no la de emparejar), toma la
   IP:puerto de **conexión** y conecta:
   ```bash
   adb connect <ip>:<puerto-conexión>
   ```
5. Desde `client/`, compila e instala (primera vez, o si cambió una dependencia nativa):
   ```bash
   npx expo run:android
   ```
   Para correr después sin recompilar (día a día, con la app ya instalada):
   ```bash
   npm run android
   ```

El puerto de conexión cambia cada vez que se reinicia la pantalla de depuración
inalámbrica o se reconecta el WiFi — si `adb connect` falla, vuelve a los Ajustes del
teléfono por una IP:puerto nuevos y repite el paso 4.

### Generar APK
cd d:\Proyectos\ingles-app\client\android
.\gradlew assembleRelease

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

## Por qué Narra

### Experiencia de usuario

- **Modo manos libres**: practica sin tocar la pantalla — la app lee la frase, escucha tu
  traducción y entiende comandos de voz ("verify", "repeat", "next"). Ideal mientras
  cocinas o caminas.
- **Feedback que enseña**: cada respuesta se valida contra múltiples traducciones
  aceptadas, y si tu variante era válida puedes agregarla como correcta — la lista
  aprende contigo.
- **Modo aprendizaje**: para quien empieza de cero, cada lista puede mostrar la
  traducción esperada mientras escribes. Se configura una vez y queda guardado.
- **Lista para usar desde el primer segundo**: 4 listas precargadas (de "sin
  conocimientos" a avanzado), así la app nunca se ve vacía.
- **Audio sin esperas**: la primera frase de cada lista ya tiene su audio listo antes de
  que pulses "Practicar".

### Técnicas

- **Modelos de voz neuronales corriendo en local**: Kokoro (inglés) y Piper (español)
  sintetizan en el navegador, cada uno en su propio Web Worker — sin servidor, sin costo
  por request, sin enviar datos a nadie.
- **Fallback en cascada**: si un modelo neuronal no está disponible, la Web Speech API
  del navegador toma el relevo; en mobile, `expo-speech`. La práctica nunca se bloquea
  por el audio.
- **Cache de audio por capas**: memoria para la sesión, IndexedDB para lo permanente, y
  una ventana deslizante que pregenera solo las próximas frases y desecha las que ya
  pasaron — audio instantáneo con memoria acotada.
- **Offline-first**: listas en almacenamiento local, TTS local, y hasta el registro de
  publicidad tiene triple respaldo (red → cache con TTL → copia empaquetada en el build).
- **Servicios inyectables**: storage, TTS, reconocimiento de voz y ads viven detrás de
  interfaces — cambiar AsyncStorage por un backend o mockear en tests no toca una sola
  pantalla.
- **Publicidad no invasiva y transparente**: una sola frase patrocinada por sesión,
  etiquetada como publicidad, filtrada por el nivel del usuario, que se practica como
  cualquier otra y nunca contamina tus estadísticas.
