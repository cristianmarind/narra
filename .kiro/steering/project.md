# AprenderFrases - Proyecto

## Descripcion General

App hibrida (web + mobile) construida con React Native / Expo que ayuda al usuario a aprenderse frases en un idioma objetivo. El usuario practica traduciendo oraciones de su idioma nativo al idioma que quiere aprender.

## Arquitectura

- **client/** - App React Native con Expo (web-first, hibrida)
- **backend/** - (futuro) API para sincronizacion y datos en la nube

### Modo Offline (fase actual)

- Los datos se almacenan localmente (AsyncStorage o similar)
- No requiere conexion a internet para funcionar
- Las listas de frases se crean y gestionan en el dispositivo

### Modo Online (fase futura)

- Backend para sincronizar listas entre dispositivos
- Posibilidad de compartir listas entre usuarios
- Estadisticas centralizadas

## Stack Tecnologico

- React Native con Expo (SDK actual del proyecto)
- TypeScript
- Expo Router para navegacion
- NativeWind / Tailwind CSS para estilos
- AsyncStorage para persistencia offline
- expo-speech para text-to-speech (lectura de oraciones)

## Convenciones

- Codigo y comentarios en ingles
- Documentacion y steering en espanol
- Nombres de archivos en kebab-case
- Componentes en PascalCase
- Hooks con prefijo `use-`
- Estructura de carpetas dentro de `src/`
