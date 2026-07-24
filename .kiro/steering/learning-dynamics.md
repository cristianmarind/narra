# Dinamica de Aprendizaje

## Modelo de Datos

### PhraseList (Lista de Frases)

```typescript
interface PhraseList {
  id: string;
  name: string;
  nativeLanguage: string;    // ej: "es" (idioma nativo del usuario)
  targetLanguage: string;    // ej: "en" (idioma por aprender)
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
}
```

### Phrase (Frase)

```typescript
interface Phrase {
  id: string;
  nativeSentence: string;           // Oracion en idioma nativo
  acceptedTranslations: string[];   // Conjunto de traducciones validas
}
```

### PracticeSession (Sesion de Practica)

```typescript
interface PracticeSession {
  listId: string;
  currentIndex: number;
  results: PhraseResult[];
  startedAt: string;
  completedAt?: string;
}

interface PhraseResult {
  phraseId: string;
  userAnswer: string;
  isCorrect: boolean;
}
```

## Flujo de la Dinamica

### 1. Seleccion de Lista

- El usuario ve todas sus listas de frases
- Selecciona una (o varias en el futuro) para practicar
- Se inicia una sesion de practica

### 2. Presentacion de Frase

- Se muestra la oracion en idioma nativo en pantalla
- El app lee la oracion en voz alta usando text-to-speech (expo-speech)
- El usuario puede reproducir el audio de nuevo si lo necesita

### 3. Respuesta del Usuario

- El usuario traduce la frase al idioma objetivo
- Puede hacerlo de dos formas:
  - **Escribiendo**: campo de texto donde escribe la traduccion
  - **Hablando**: (futuro) reconocimiento de voz para capturar la respuesta

### 4. Validacion

- Se compara la respuesta del usuario contra el conjunto de traducciones aceptadas
- La comparacion es case-insensitive y tolera diferencias menores de puntuacion
- Se marca como correcta o incorrecta
- Se muestra feedback inmediato (correcto/incorrecto + la respuesta esperada si fallo)

### 5. Progreso y Resultado

- Se avanza a la siguiente frase automaticamente o con accion del usuario
- Se lleva cuenta de aciertos/errores
- Al terminar todas las frases se muestra resumen:
  - Total de frases
  - Correctas / Incorrectas
  - Porcentaje de acierto

## Gestion de Listas

- Crear nueva lista (nombre, idioma nativo, idioma objetivo)
- Agregar frases a una lista (oracion nativa + traducciones aceptadas)
- Editar frases existentes
- Eliminar frases o listas completas
- Las listas se persisten en almacenamiento local (AsyncStorage)
