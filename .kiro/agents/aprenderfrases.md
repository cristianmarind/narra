---
description: Agente de desarrollo autónomo para AprenderFrases (Expo / React Native)
tools: [read, write, shell, web, context]
permissions:
  rules:
    # Herramientas internas (leer, editar, buscar, diagnósticos) sin preguntar
    - capability: builtin
      effect: allow

    # Lectura y escritura libre dentro del proyecto
    - capability: fs_read
      effect: allow
    - capability: fs_write
      effect: allow

    # Nunca leer archivos con credenciales
    - capability: fs_read
      effect: deny
      match:
        - "**/.env"
        - "**/.env.*"
        - "**/*.pem"
        - "**/*.key"
        - "**/credentials.json"
        - "client/google-services.json"

    # Búsqueda y fetch web (docs de librerías, verificación de CDNs)
    - capability: web_fetch
      effect: allow
    - capability: web_search
      effect: allow

    # Subagentes y contexto
    - capability: subagent
      effect: allow
    - capability: context
      effect: allow

    # Shell abierto para el flujo normal de desarrollo
    - capability: shell
      effect: allow

    # ...pero con freno de mano en lo destructivo o irreversible
    - capability: shell
      effect: ask
      match:
        - "*rm -rf*"
        - "*Remove-Item*-Recurse*"
        - "*sudo*"
        - "*git push*"
        - "*git reset --hard*"
        - "*git clean*"
        - "*git checkout .*"
        - "*git config*"
        - "*--no-verify*"
        - "*npm publish*"
        - "*eas build*"
        - "*eas submit*"
        - "*docker compose down -v*"
        - "*docker system prune*"
        - "*docker volume rm*"
---

# AprenderFrases

App híbrida (web + mobile) en React Native / Expo para aprender frases en otro idioma.
El usuario traduce oraciones de su idioma nativo al idioma objetivo.

## Contexto operativo

- El proyecto corre en Docker: `docker compose up` levanta Expo web en el puerto 8081.
- Node **no** está instalado en el host de Windows. Cualquier comando de node, npm o tsc
  debe ejecutarse dentro del contenedor con `docker compose exec -T client sh -c '...'`
  (usar comillas simples por fuera; las dobles se rompen en este shell).
- `tsc --noEmit` corre bien, pero su salida por stdout mata la sesión de
  `docker compose exec`. La vuelta: redirigir a un archivo dentro de un volumen montado
  y leerlo desde el host. `/app/src` mapea a `client/src`, así que:

  ```
  docker compose exec -T client sh -c './node_modules/.bin/tsc --noEmit > /app/src/tsc-out.txt 2>&1; echo "EXIT=$?" >> /app/src/tsc-out.txt'
  ```

  Después leer `client/src/tsc-out.txt` y **borrarlo**, que si no queda en el árbol de
  fuentes. Este es el chequeo de tipos real; hacerlo antes de dar un cambio por terminado.
- Para verificar que un cambio compila y que los imports resuelven, pedir el bundle de Metro:
  `http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=src%2Fapp&transform.reactCompiler=true`
  Un 200 confirma que los imports resuelven y que todo transpila.
- El file watcher de Metro **no** detecta cambios a través de los volúmenes de Docker en
  Windows. Si el bundle vuelve idéntico en bytes o falta código nuevo, está sirviendo
  caché: reiniciar con `docker compose restart client` y volver a verificar.
- Al usar `Invoke-WebRequest` en PowerShell, poner `$ProgressPreference='SilentlyContinue'`
  primero; si no, la barra de progreso satura el buffer de salida.

## Convenciones

- Código y comentarios en inglés; documentación y respuestas en español.
- Archivos en kebab-case, componentes en PascalCase, hooks con prefijo `use-`.
- Todo dentro de `client/src/`.

## TTS

- Web: Kokoro para inglés (`af_heart` / `bf_emma`, 24 kHz) y Piper vía vits-web para
  español (`es_MX-claude-high`, 22.05 kHz). Cada motor en su propio worker en `public/`.
- Los workers devuelven `{audio, sampleRate}`; el sample rate viaja con cada waveform
  porque los motores no coinciden. No hardcodear 24000.
- Las frases fijas de la app viven en `src/constants/speech-prompts.ts` y se precachean
  de forma persistente en el home.
- Mobile todavía usa expo-speech.
