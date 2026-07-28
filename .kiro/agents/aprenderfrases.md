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

Node 24.18.0 está instalado en el host en `D:\programas\node` (portable, en el PATH de
usuario). Trabajar en el host es el camino preferido: el watcher de Metro funciona nativo,
así que hay hot reload real sin reiniciar nada.

- Desarrollo normal, desde `client/`: `npx expo start --web`
- Typecheck: `node .\node_modules\typescript\lib\tsc.js --noEmit`
  Redirigir a un archivo y leerlo, porque la salida larga por stdout rompe la sesión del
  shell: `... --noEmit > ..\tsc.log 2>&1; "EXIT=$LASTEXITCODE" | Add-Content ..\tsc.log`.
  Borrar el log al terminar.
- `npm` y `npx` funcionan directo (la política de ejecución del usuario está en
  `RemoteSigned`). No hace falta llamar a `npm.cmd`.
- Al usar `Invoke-WebRequest`, poner `$ProgressPreference='SilentlyContinue'` primero; si
  no, la barra de progreso satura el buffer de salida.
- `npm ci` bloquea la terminal varios minutos sin devolver salida. Para saber si terminó,
  usar `list_directory` sobre `client/node_modules/.bin` en vez de insistir con el shell.

Docker sigue disponible (`docker compose up`, puerto 8081) para paridad con producción,
pero tiene dos trampas:

- El watcher de Metro **no** ve cambios a través de los volúmenes montados en Windows. Si
  el bundle vuelve idéntico en bytes o falta código nuevo, está sirviendo caché: reiniciar
  con `docker compose restart client`.
- Comandos dentro del contenedor: `docker compose exec -T client sh -c '...'`, con comillas
  simples por fuera; las dobles se rompen en este shell.
- El contenedor usa Node 20, el host 24. Si aparece algo que solo pasa en uno de los dos,
  esa diferencia es el primer sospechoso.

Para verificar que un cambio compila y que los imports resuelven, pedir el bundle de Metro:
`http://localhost:8081/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=src%2Fapp&transform.reactCompiler=true`
Un 200 confirma que resuelve y transpila, pero **no** chequea tipos: para eso, `tsc`.

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
