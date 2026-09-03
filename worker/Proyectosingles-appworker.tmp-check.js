/**
 * Narra's Cloudflare Worker — the single source of truth for both the ads
 * registry and the default-lists manifest. This file IS the deploy: edit
 * ADS_REGISTRY / DEFAULT_LISTS directly below, save, and paste the whole
 * file into the Cloudflare Worker (dashboard editor or `wrangler deploy`).
 * See README.md for the schema of each and how to add a new default list.
 *
 * One worker, one URL, routed by query param:
 *   - GET /                        -> the ads registry (this is what
 *                                      EXPO_PUBLIC_ADS_REGISTRY_URL points at)
 *   - GET /?defaultLists=manifest  -> the default-lists manifest
 *   - GET /?defaultLists=<id>      -> that default list's full content
 *
 * The manifest's "url" per entry is built from the request itself
 * (origin + pathname), so it keeps working under whatever domain/route this
 * worker is deployed at.
 */
const DEFAULT_LISTS_VERSION = 1;

const ADS_REGISTRY = {
  "version": 1,
  "updatedAt": "2026-07-27T00:00:00Z",
  "campaigns": [
    {
      "id": "narra-share-2026-08",
      "advertiser": "Narra",
      "active": true,
      "nativeLanguage": "es",
      "targetLanguage": "en",
      "phrases": [
        {
          "id": "narra-001",
          "text": "Comparte esta app.",
          "acceptedTranslations": [
            "Share this app.",
            "Share the app."
          ],
          "level": "none"
        },
        {
          "id": "narra-002",
          "text": "Con Narra aprendes inglés.",
          "acceptedTranslations": [
            "With Narra, you learn English.",
            "You learn English with Narra."
          ],
          "level": "beginner"
        }
      ]
    }
  ]
};

const DEFAULT_LISTS = {
  "lista-1": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Inglés básico - Nivel 1 (Sin conocimientos)",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "showTranslation": true,
      "phrases": [
        {
          "nativeSentence": "Yo",
          "acceptedTranslations": [
            "I"
          ]
        },
        {
          "nativeSentence": "Tú",
          "acceptedTranslations": [
            "You"
          ]
        },
        {
          "nativeSentence": "Él",
          "acceptedTranslations": [
            "He"
          ]
        },
        {
          "nativeSentence": "Ella",
          "acceptedTranslations": [
            "She"
          ]
        },
        {
          "nativeSentence": "Un",
          "acceptedTranslations": [
            "A",
            "An"
          ]
        },
        {
          "nativeSentence": "Una",
          "acceptedTranslations": [
            "A",
            "An"
          ]
        },
        {
          "nativeSentence": "El / La",
          "acceptedTranslations": [
            "The"
          ]
        },
        {
          "nativeSentence": "Soy / Estoy",
          "acceptedTranslations": [
            "I am",
            "I'm"
          ]
        },
        {
          "nativeSentence": "Es / Está",
          "acceptedTranslations": [
            "Is",
            "'s"
          ]
        },
        {
          "nativeSentence": "Doctor",
          "acceptedTranslations": [
            "Doctor"
          ]
        },
        {
          "nativeSentence": "Hotel",
          "acceptedTranslations": [
            "Hotel"
          ]
        },
        {
          "nativeSentence": "Hospital",
          "acceptedTranslations": [
            "Hospital"
          ]
        },
        {
          "nativeSentence": "Animal",
          "acceptedTranslations": [
            "Animal"
          ]
        },
        {
          "nativeSentence": "Chocolate",
          "acceptedTranslations": [
            "Chocolate"
          ]
        },
        {
          "nativeSentence": "Familia",
          "acceptedTranslations": [
            "Family"
          ]
        },
        {
          "nativeSentence": "Música",
          "acceptedTranslations": [
            "Music"
          ]
        },
        {
          "nativeSentence": "Un doctor",
          "acceptedTranslations": [
            "A doctor"
          ]
        },
        {
          "nativeSentence": "Un animal",
          "acceptedTranslations": [
            "An animal"
          ]
        },
        {
          "nativeSentence": "El hotel",
          "acceptedTranslations": [
            "The hotel"
          ]
        },
        {
          "nativeSentence": "El hospital",
          "acceptedTranslations": [
            "The hospital"
          ]
        },
        {
          "nativeSentence": "Soy un doctor.",
          "acceptedTranslations": [
            "I am a doctor.",
            "I'm a doctor."
          ]
        },
        {
          "nativeSentence": "Ella es doctora.",
          "acceptedTranslations": [
            "She is a doctor.",
            "She's a doctor."
          ]
        },
        {
          "nativeSentence": "Él está en el hospital.",
          "acceptedTranslations": [
            "He is at the hospital.",
            "He's at the hospital."
          ]
        },
        {
          "nativeSentence": "Estoy en el hotel.",
          "acceptedTranslations": [
            "I am at the hotel.",
            "I'm at the hotel."
          ]
        },
        {
          "nativeSentence": "Mi familia está en el hotel.",
          "acceptedTranslations": [
            "My family is at the hotel.",
            "My family's at the hotel."
          ]
        }
      ]
    }
  },
  "lista-2": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Inglés básico - Nivel 2 (Principiante)",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        {
          "nativeSentence": "Nosotros",
          "acceptedTranslations": [
            "We"
          ]
        },
        {
          "nativeSentence": "Ellos",
          "acceptedTranslations": [
            "They"
          ]
        },
        {
          "nativeSentence": "Somos / Estamos",
          "acceptedTranslations": [
            "We are",
            "We're"
          ]
        },
        {
          "nativeSentence": "Son / Están",
          "acceptedTranslations": [
            "They are",
            "They're"
          ]
        },
        {
          "nativeSentence": "Casa",
          "acceptedTranslations": [
            "House",
            "Home"
          ]
        },
        {
          "nativeSentence": "Carro",
          "acceptedTranslations": [
            "Car",
            "Automobile"
          ]
        },
        {
          "nativeSentence": "Escuela",
          "acceptedTranslations": [
            "School"
          ]
        },
        {
          "nativeSentence": "Trabajo",
          "acceptedTranslations": [
            "Work",
            "Job"
          ]
        },
        {
          "nativeSentence": "Amigo",
          "acceptedTranslations": [
            "Friend"
          ]
        },
        {
          "nativeSentence": "Comida",
          "acceptedTranslations": [
            "Food"
          ]
        },
        {
          "nativeSentence": "Mi amigo",
          "acceptedTranslations": [
            "My friend"
          ]
        },
        {
          "nativeSentence": "Nuestra casa",
          "acceptedTranslations": [
            "Our house",
            "Our home"
          ]
        },
        {
          "nativeSentence": "Ellos están en la escuela.",
          "acceptedTranslations": [
            "They are at school.",
            "They're at school."
          ]
        },
        {
          "nativeSentence": "Nosotros estamos en casa.",
          "acceptedTranslations": [
            "We are at home.",
            "We're at home."
          ]
        },
        {
          "nativeSentence": "Mi amigo tiene un carro.",
          "acceptedTranslations": [
            "My friend has a car.",
            "My friend has an automobile."
          ]
        },
        {
          "nativeSentence": "Ella tiene un perro.",
          "acceptedTranslations": [
            "She has a dog.",
            "She's got a dog."
          ]
        },
        {
          "nativeSentence": "Él tiene un gato.",
          "acceptedTranslations": [
            "He has a cat.",
            "He's got a cat."
          ]
        },
        {
          "nativeSentence": "Me gusta la comida.",
          "acceptedTranslations": [
            "I like food.",
            "I enjoy food."
          ]
        },
        {
          "nativeSentence": "Quiero ir a casa.",
          "acceptedTranslations": [
            "I want to go home.",
            "I'd like to go home."
          ]
        },
        {
          "nativeSentence": "Necesitamos un doctor.",
          "acceptedTranslations": [
            "We need a doctor.",
            "We need the doctor."
          ]
        },
        {
          "nativeSentence": "Ellos trabajan en un hospital.",
          "acceptedTranslations": [
            "They work at a hospital.",
            "They're working at a hospital."
          ]
        },
        {
          "nativeSentence": "Mi familia vive en esta casa.",
          "acceptedTranslations": [
            "My family lives in this house.",
            "My family lives in this home."
          ]
        },
        {
          "nativeSentence": "Ella está en el hotel con su familia.",
          "acceptedTranslations": [
            "She is at the hotel with her family.",
            "She's at the hotel with her family."
          ]
        },
        {
          "nativeSentence": "Nos gusta escuchar música.",
          "acceptedTranslations": [
            "We like listening to music.",
            "We like to listen to music."
          ]
        },
        {
          "nativeSentence": "Estamos listos para comenzar.",
          "acceptedTranslations": [
            "We are ready to start.",
            "We're ready to start."
          ]
        }
      ]
    }
  },
  "lista-3": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Inglés básico - Nivel 3 (Intermedio)",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        {
          "nativeSentence": "¿A qué te dedicas?",
          "acceptedTranslations": [
            "What do you do?",
            "What do you do for a living?"
          ]
        },
        {
          "nativeSentence": "Trabajo como ingeniero de software.",
          "acceptedTranslations": [
            "I work as a software engineer.",
            "I'm a software engineer."
          ]
        },
        {
          "nativeSentence": "¿Cuánto tiempo llevas estudiando inglés?",
          "acceptedTranslations": [
            "How long have you been studying English?",
            "How long have you studied English?"
          ]
        },
        {
          "nativeSentence": "He estado aprendiendo inglés durante dos años.",
          "acceptedTranslations": [
            "I've been learning English for two years.",
            "I have been learning English for two years."
          ]
        },
        {
          "nativeSentence": "Normalmente me levanto temprano.",
          "acceptedTranslations": [
            "I usually wake up early.",
            "I normally wake up early."
          ]
        },
        {
          "nativeSentence": "Estoy trabajando en un proyecto nuevo.",
          "acceptedTranslations": [
            "I'm working on a new project.",
            "I am working on a new project."
          ]
        },
        {
          "nativeSentence": "Ayer terminé mi trabajo temprano.",
          "acceptedTranslations": [
            "I finished my work early yesterday.",
            "Yesterday I finished my work early."
          ]
        },
        {
          "nativeSentence": "¿Has visitado otro país alguna vez?",
          "acceptedTranslations": [
            "Have you ever visited another country?",
            "Have you ever been to another country?"
          ]
        },
        {
          "nativeSentence": "Todavía no he terminado.",
          "acceptedTranslations": [
            "I haven't finished yet.",
            "I have not finished yet."
          ]
        },
        {
          "nativeSentence": "¿Podrías ayudarme con este problema?",
          "acceptedTranslations": [
            "Could you help me with this problem?",
            "Can you help me with this problem?"
          ]
        },
        {
          "nativeSentence": "Si tengo tiempo, iré contigo.",
          "acceptedTranslations": [
            "If I have time, I'll go with you.",
            "If I have time, I will go with you."
          ]
        },
        {
          "nativeSentence": "Creo que esta es la mejor opción.",
          "acceptedTranslations": [
            "I think this is the best option.",
            "I believe this is the best option."
          ]
        },
        {
          "nativeSentence": "Prefiero trabajar desde casa.",
          "acceptedTranslations": [
            "I prefer working from home.",
            "I prefer to work from home."
          ]
        },
        {
          "nativeSentence": "Siempre intento aprender algo nuevo.",
          "acceptedTranslations": [
            "I always try to learn something new.",
            "I always try learning something new."
          ]
        },
        {
          "nativeSentence": "¿Qué harías en esta situación?",
          "acceptedTranslations": [
            "What would you do in this situation?",
            "What would you do if you were in this situation?"
          ]
        },
        {
          "nativeSentence": "Es importante mantener la calma.",
          "acceptedTranslations": [
            "It's important to stay calm.",
            "It is important to remain calm."
          ]
        },
        {
          "nativeSentence": "No estoy seguro de la respuesta.",
          "acceptedTranslations": [
            "I'm not sure about the answer.",
            "I am not sure about the answer."
          ]
        },
        {
          "nativeSentence": "Podemos resolver este problema juntos.",
          "acceptedTranslations": [
            "We can solve this problem together.",
            "We can figure this problem out together."
          ]
        },
        {
          "nativeSentence": "Me habría gustado saber eso antes.",
          "acceptedTranslations": [
            "I wish I had known that earlier.",
            "I would've liked to know that sooner."
          ]
        },
        {
          "nativeSentence": "Cuanto más practico, más confianza tengo.",
          "acceptedTranslations": [
            "The more I practice, the more confident I become.",
            "The more I practice, the more confidence I have."
          ]
        },
        {
          "nativeSentence": "Aunque fue difícil, nunca me rendí.",
          "acceptedTranslations": [
            "Even though it was difficult, I never gave up.",
            "Although it was hard, I never gave up."
          ]
        },
        {
          "nativeSentence": "Estoy buscando una oportunidad para crecer profesionalmente.",
          "acceptedTranslations": [
            "I'm looking for an opportunity to grow professionally.",
            "I am looking for a chance to grow professionally."
          ]
        },
        {
          "nativeSentence": "¿Puedes explicarlo de otra manera?",
          "acceptedTranslations": [
            "Can you explain it in another way?",
            "Could you explain it differently?"
          ]
        },
        {
          "nativeSentence": "Estoy de acuerdo contigo.",
          "acceptedTranslations": [
            "I agree with you.",
            "I completely agree with you."
          ]
        },
        {
          "nativeSentence": "Eso tiene mucho sentido.",
          "acceptedTranslations": [
            "That makes a lot of sense.",
            "That makes sense."
          ]
        }
      ]
    }
  },
  "lista-4": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Inglés básico - Nivel 4 (Avanzado)",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        {
          "nativeSentence": "Si hubiera sabido eso antes, habría tomado una decisión diferente.",
          "acceptedTranslations": [
            "If I had known that earlier, I would have made a different decision.",
            "Had I known that sooner, I would've made a different decision."
          ]
        },
        {
          "nativeSentence": "A pesar de las dificultades, logramos cumplir todos los objetivos.",
          "acceptedTranslations": [
            "Despite the difficulties, we managed to achieve all the goals.",
            "In spite of the challenges, we were able to meet all the objectives."
          ]
        },
        {
          "nativeSentence": "Cuanto más practico inglés, más natural me resulta hablarlo.",
          "acceptedTranslations": [
            "The more I practice English, the more natural it becomes to speak it.",
            "The more I practice English, the more naturally I can speak it."
          ]
        },
        {
          "nativeSentence": "No fue hasta el año pasado que empecé a sentirme seguro hablando inglés.",
          "acceptedTranslations": [
            "It wasn't until last year that I started feeling confident speaking English.",
            "I didn't start feeling confident speaking English until last year."
          ]
        },
        {
          "nativeSentence": "Me habría gustado viajar más cuando tenía más tiempo libre.",
          "acceptedTranslations": [
            "I wish I had traveled more when I had more free time.",
            "I would've liked to travel more when I had more free time."
          ]
        },
        {
          "nativeSentence": "Aunque no estoy completamente de acuerdo, entiendo tu punto de vista.",
          "acceptedTranslations": [
            "Although I don't completely agree, I understand your point of view.",
            "Even though I don't fully agree, I understand your perspective."
          ]
        },
        {
          "nativeSentence": "No tengo ningún problema en admitir cuando me equivoco.",
          "acceptedTranslations": [
            "I have no problem admitting when I'm wrong.",
            "I don't mind admitting when I've made a mistake."
          ]
        },
        {
          "nativeSentence": "Es una de las mejores decisiones que he tomado.",
          "acceptedTranslations": [
            "It's one of the best decisions I've ever made.",
            "It is one of the best decisions I have ever made."
          ]
        },
        {
          "nativeSentence": "Mientras más aprendo, más me doy cuenta de todo lo que aún me falta por aprender.",
          "acceptedTranslations": [
            "The more I learn, the more I realize how much I still have to learn.",
            "The more I learn, the more I realize there's still so much to learn."
          ]
        },
        {
          "nativeSentence": "No estoy acostumbrado a hablar en público, pero estoy mejorando.",
          "acceptedTranslations": [
            "I'm not used to speaking in public, but I'm improving.",
            "I am not used to public speaking, but I'm getting better."
          ]
        },
        {
          "nativeSentence": "Ojalá hubiera empezado a estudiar inglés hace más años.",
          "acceptedTranslations": [
            "I wish I had started studying English years ago.",
            "If only I had started learning English earlier."
          ]
        },
        {
          "nativeSentence": "A menos que ocurra algo inesperado, llegaré a tiempo.",
          "acceptedTranslations": [
            "Unless something unexpected happens, I'll arrive on time.",
            "Unless anything unexpected comes up, I will be on time."
          ]
        },
        {
          "nativeSentence": "Estoy convencido de que la práctica constante marca la diferencia.",
          "acceptedTranslations": [
            "I'm convinced that consistent practice makes a difference.",
            "I believe consistent practice is what makes the difference."
          ]
        },
        {
          "nativeSentence": "No solo aprendí un nuevo idioma, sino que también gané más confianza.",
          "acceptedTranslations": [
            "Not only did I learn a new language, but I also gained more confidence.",
            "I not only learned a new language, but I also became more confident."
          ]
        },
        {
          "nativeSentence": "Si pudiera darle un consejo a mi yo del pasado, sería empezar antes.",
          "acceptedTranslations": [
            "If I could give my younger self one piece of advice, it would be to start earlier.",
            "If I could give my past self some advice, I'd tell myself to start sooner."
          ]
        },
        {
          "nativeSentence": "No importa cuántos errores cometas; lo importante es seguir aprendiendo.",
          "acceptedTranslations": [
            "It doesn't matter how many mistakes you make; what matters is that you keep learning.",
            "No matter how many mistakes you make, the important thing is to keep learning."
          ]
        },
        {
          "nativeSentence": "Después de pensarlo detenidamente, cambié completamente de opinión.",
          "acceptedTranslations": [
            "After thinking it over carefully, I completely changed my mind.",
            "After giving it a lot of thought, I changed my mind completely."
          ]
        },
        {
          "nativeSentence": "Nunca había visto algo tan impresionante.",
          "acceptedTranslations": [
            "I'd never seen anything so impressive.",
            "I had never seen anything that impressive."
          ]
        },
        {
          "nativeSentence": "No puedo evitar sonreír cuando recuerdo ese momento.",
          "acceptedTranslations": [
            "I can't help smiling when I remember that moment.",
            "I can't help but smile whenever I remember that moment."
          ]
        },
        {
          "nativeSentence": "Mientras sigas practicando, continuarás mejorando.",
          "acceptedTranslations": [
            "As long as you keep practicing, you'll continue improving.",
            "As long as you keep practicing, you'll keep getting better."
          ]
        },
        {
          "nativeSentence": "No siempre es fácil salir de la zona de confort, pero vale la pena.",
          "acceptedTranslations": [
            "It's not always easy to step out of your comfort zone, but it's worth it.",
            "Leaving your comfort zone isn't always easy, but it's definitely worth it."
          ]
        },
        {
          "nativeSentence": "A decir verdad, nunca imaginé que disfrutaría tanto aprender inglés.",
          "acceptedTranslations": [
            "To be honest, I never imagined I'd enjoy learning English so much.",
            "Honestly, I never thought I'd enjoy learning English this much."
          ]
        },
        {
          "nativeSentence": "Lo que más admiro de las personas exitosas es su disciplina.",
          "acceptedTranslations": [
            "What I admire most about successful people is their discipline.",
            "The thing I admire most about successful people is their discipline."
          ]
        },
        {
          "nativeSentence": "Si sigues posponiéndolo, nunca encontrarás el momento perfecto.",
          "acceptedTranslations": [
            "If you keep putting it off, you'll never find the perfect time.",
            "If you continue to procrastinate, you'll never find the right moment."
          ]
        },
        {
          "nativeSentence": "Al final del día, lo único que realmente importa es seguir avanzando.",
          "acceptedTranslations": [
            "At the end of the day, the only thing that really matters is keeping moving forward.",
            "When all is said and done, what truly matters is continuing to move forward."
          ]
        }
      ]
    }
  },
  "lista-5": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Frases en primera persona en todos los tiempos",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        {
          "nativeSentence": "Yo",
          "acceptedTranslations": [
            "I"
          ]
        },
        {
          "nativeSentence": "Gustar",
          "acceptedTranslations": [
            "like"
          ]
        },
        {
          "nativeSentence": "Casa",
          "acceptedTranslations": [
            "house",
            "home"
          ]
        },
        {
          "nativeSentence": "Me gusta la casa.",
          "acceptedTranslations": [
            "I like the house.",
            "I like the home."
          ]
        },
        {
          "nativeSentence": "Mi",
          "acceptedTranslations": [
            "my"
          ]
        },
        {
          "nativeSentence": "Me gusta mi casa.",
          "acceptedTranslations": [
            "I like my house.",
            "I like my home."
          ]
        },
        {
          "nativeSentence": "Querer",
          "acceptedTranslations": [
            "want"
          ]
        },
        {
          "nativeSentence": "Quiero mi casa.",
          "acceptedTranslations": [
            "I want my house.",
            "I want my home."
          ]
        },
        {
          "nativeSentence": "Estar / Ser",
          "acceptedTranslations": [
            "I am",
            "I'm"
          ]
        },
        {
          "nativeSentence": "Listo",
          "acceptedTranslations": [
            "ready"
          ]
        },
        {
          "nativeSentence": "Estoy listo.",
          "acceptedTranslations": [
            "I am ready.",
            "I'm ready."
          ]
        },
        {
          "nativeSentence": "Cansado",
          "acceptedTranslations": [
            "tired"
          ]
        },
        {
          "nativeSentence": "Estoy cansado.",
          "acceptedTranslations": [
            "I am tired.",
            "I'm tired."
          ]
        },
        {
          "nativeSentence": "Fui / Estuve",
          "acceptedTranslations": [
            "I was"
          ]
        },
        {
          "nativeSentence": "Estuve en casa.",
          "acceptedTranslations": [
            "I was at home.",
            "I was in the house."
          ]
        },
        {
          "nativeSentence": "Estuve cansado.",
          "acceptedTranslations": [
            "I was tired.",
            "I felt tired."
          ]
        },
        {
          "nativeSentence": "Estuve listo.",
          "acceptedTranslations": [
            "I was ready.",
            "I was prepared."
          ]
        },
        {
          "nativeSentence": "Ayer estuve en casa.",
          "acceptedTranslations": [
            "I was at home yesterday.",
            "Yesterday, I was at home."
          ]
        },
        {
          "nativeSentence": "Haré / Voy a",
          "acceptedTranslations": [
            "I will",
            "I'll"
          ]
        },
        {
          "nativeSentence": "Trabajar",
          "acceptedTranslations": [
            "work"
          ]
        },
        {
          "nativeSentence": "Trabajaré mañana.",
          "acceptedTranslations": [
            "I will work tomorrow.",
            "I'll work tomorrow."
          ]
        },
        {
          "nativeSentence": "Estaré en casa mañana.",
          "acceptedTranslations": [
            "I will be at home tomorrow.",
            "I'll be at home tomorrow."
          ]
        },
        {
          "nativeSentence": "Querría / Me gustaría",
          "acceptedTranslations": [
            "I would",
            "I'd"
          ]
        },
        {
          "nativeSentence": "Me gustaría una casa.",
          "acceptedTranslations": [
            "I would like a house.",
            "I'd like a house."
          ]
        },
        {
          "nativeSentence": "Me gustaría mi propia casa.",
          "acceptedTranslations": [
            "I would like my own house.",
            "I'd like my own home."
          ]
        },
        {
          "nativeSentence": "Me gustaría trabajar desde casa.",
          "acceptedTranslations": [
            "I would like to work from home.",
            "I'd like to work from home."
          ]
        },
        {
          "nativeSentence": "Me gusta trabajar desde casa.",
          "acceptedTranslations": [
            "I like working from home.",
            "I like to work from home."
          ]
        },
        {
          "nativeSentence": "Quiero trabajar desde casa.",
          "acceptedTranslations": [
            "I want to work from home.",
            "I want to work from my house."
          ]
        },
        {
          "nativeSentence": "Me gusta mi trabajo.",
          "acceptedTranslations": [
            "I like my job.",
            "I like my work."
          ]
        },
        {
          "nativeSentence": "Quiero mejorar.",
          "acceptedTranslations": [
            "I want to improve.",
            "I want to get better."
          ]
        },
        {
          "nativeSentence": "Me gustaría mejorar.",
          "acceptedTranslations": [
            "I would like to improve.",
            "I'd like to get better."
          ]
        },
        {
          "nativeSentence": "Ayer trabajé en casa.",
          "acceptedTranslations": [
            "I worked at home yesterday.",
            "I worked from home yesterday."
          ]
        },
        {
          "nativeSentence": "He trabajado desde casa.",
          "acceptedTranslations": [
            "I have worked from home.",
            "I've worked from home."
          ]
        },
        {
          "nativeSentence": "He estado trabajando desde casa.",
          "acceptedTranslations": [
            "I have been working from home.",
            "I've been working from home."
          ]
        },
        {
          "nativeSentence": "Había trabajado desde casa.",
          "acceptedTranslations": [
            "I had worked from home.",
            "I'd worked from home."
          ]
        },
        {
          "nativeSentence": "Había estado trabajando desde casa.",
          "acceptedTranslations": [
            "I had been working from home.",
            "I'd been working from home."
          ]
        },
        {
          "nativeSentence": "Trabajaré desde casa.",
          "acceptedTranslations": [
            "I will work from home.",
            "I'll work from home."
          ]
        },
        {
          "nativeSentence": "Habré terminado el trabajo.",
          "acceptedTranslations": [
            "I will have finished the work.",
            "I'll have finished the work."
          ]
        },
        {
          "nativeSentence": "Trabajaría desde casa.",
          "acceptedTranslations": [
            "I would work from home.",
            "I'd work from home."
          ]
        },
        {
          "nativeSentence": "Trabajaría más si tuviera tiempo.",
          "acceptedTranslations": [
            "I would work more if I had time.",
            "I'd work more if I had time."
          ]
        },
        {
          "nativeSentence": "Me habría gustado trabajar desde casa.",
          "acceptedTranslations": [
            "I would have liked to work from home.",
            "I'd have liked to work from home."
          ]
        },
        {
          "nativeSentence": "Me gusta aprender cosas nuevas.",
          "acceptedTranslations": [
            "I like learning new things.",
            "I like to learn new things."
          ]
        },
        {
          "nativeSentence": "Quiero aprender algo nuevo.",
          "acceptedTranslations": [
            "I want to learn something new.",
            "I want to learn something new."
          ]
        },
        {
          "nativeSentence": "Me gustaría aprender más.",
          "acceptedTranslations": [
            "I would like to learn more.",
            "I'd like to learn more."
          ]
        },
        {
          "nativeSentence": "Sé que puedo mejorar.",
          "acceptedTranslations": [
            "I know I can improve.",
            "I know that I can get better."
          ]
        }
      ]
    }
  },
  "lista-6": {
    "updatedAt": "2026-08-22T00:00:00.000Z",
    "def": {
      "name": "Adjetivos y determinantes en inglés",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "showTranslation": true,
      "phrases": [
        {
          "nativeSentence": "Bueno",
          "acceptedTranslations": ["Good"]
        },
        {
          "nativeSentence": "Malo",
          "acceptedTranslations": ["Bad"]
        },
        {
          "nativeSentence": "Feliz",
          "acceptedTranslations": ["Happy"]
        },
        {
          "nativeSentence": "Triste",
          "acceptedTranslations": ["Sad"]
        },
        {
          "nativeSentence": "Grande",
          "acceptedTranslations": ["Big"]
        },
        {
          "nativeSentence": "Pequeño",
          "acceptedTranslations": ["Small"]
        },
        {
          "nativeSentence": "Rápido",
          "acceptedTranslations": ["Fast"]
        },
        {
          "nativeSentence": "Lento",
          "acceptedTranslations": ["Slow"]
        },
        {
          "nativeSentence": "Amable",
          "acceptedTranslations": ["Kind"]
        },
        {
          "nativeSentence": "Inteligente",
          "acceptedTranslations": ["Smart"]
        },
        {
          "nativeSentence": "Este / Esto",
          "acceptedTranslations": ["This"]
        },
        {
          "nativeSentence": "Ese / Eso",
          "acceptedTranslations": ["That"]
        },
        {
          "nativeSentence": "Estos / Estas",
          "acceptedTranslations": ["These"]
        },
        {
          "nativeSentence": "Esos / Esas",
          "acceptedTranslations": ["Those"]
        },
        {
          "nativeSentence": "Mi",
          "acceptedTranslations": ["My"]
        },
        {
          "nativeSentence": "Tu",
          "acceptedTranslations": ["Your"]
        },
        {
          "nativeSentence": "Su (de él)",
          "acceptedTranslations": ["His"]
        },
        {
          "nativeSentence": "Su (de ella)",
          "acceptedTranslations": ["Her"]
        },
        {
          "nativeSentence": "Su (de eso)",
          "acceptedTranslations": ["Its"]
        },
        {
          "nativeSentence": "Nuestro",
          "acceptedTranslations": ["Our"]
        },
        {
          "nativeSentence": "Su (de ellos)",
          "acceptedTranslations": ["Their"]
        },
        {
          "nativeSentence": "Algunos",
          "acceptedTranslations": ["Some"]
        },
        {
          "nativeSentence": "Alguno / Cualquiera",
          "acceptedTranslations": ["Any"]
        },
        {
          "nativeSentence": "Mucho (incontable)",
          "acceptedTranslations": ["Much"]
        },
        {
          "nativeSentence": "Muchos (contable)",
          "acceptedTranslations": ["Many"]
        },
        {
          "nativeSentence": "Pocos",
          "acceptedTranslations": ["Few"]
        },
        {
          "nativeSentence": "Poco (incontable)",
          "acceptedTranslations": ["Little"]
        }
      ]
    }
  },
  "lista-7": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 1",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        {
          "nativeSentence": "También",
          "acceptedTranslations": ["Also", "As well"]
        },
        {
          "nativeSentence": "También quiero aprender inglés.",
          "acceptedTranslations": ["I also want to learn English.", "I want to learn English too."]
        },
        {
          "nativeSentence": "Ella habla francés también.",
          "acceptedTranslations": ["She speaks French as well.", "She also speaks French."]
        },
        {
          "nativeSentence": "Entonces",
          "acceptedTranslations": ["So"]
        },
        {
          "nativeSentence": "Entonces, ¿qué hacemos ahora?",
          "acceptedTranslations": ["So, what do we do now?", "So what should we do now?"]
        },
        {
          "nativeSentence": "No tenía tiempo, entonces me quedé en casa.",
          "acceptedTranslations": ["I didn't have time, so I stayed home.", "I did not have time, so I stayed at home."]
        },
        {
          "nativeSentence": "Tal",
          "acceptedTranslations": ["Such"]
        },
        {
          "nativeSentence": "Es una casa tan grande.",
          "acceptedTranslations": ["It's such a big house.", "It is such a big house."]
        },
        {
          "nativeSentence": "Nunca dije tal cosa.",
          "acceptedTranslations": ["I never said such a thing.", "I never said anything like that."]
        },
        {
          "nativeSentence": "Incluso",
          "acceptedTranslations": ["Even"]
        },
        {
          "nativeSentence": "Incluso los expertos cometen errores.",
          "acceptedTranslations": ["Even experts make mistakes.", "Even the experts make mistakes."]
        },
        {
          "nativeSentence": "Trabajé incluso los fines de semana.",
          "acceptedTranslations": ["I even worked on weekends.", "I worked even on weekends."]
        },
        {
          "nativeSentence": "Alguna vez",
          "acceptedTranslations": ["Ever"]
        },
        {
          "nativeSentence": "¿Has estado alguna vez en Londres?",
          "acceptedTranslations": ["Have you ever been to London?", "Have you ever visited London?"]
        },
        {
          "nativeSentence": "Es el mejor libro que he leído jamás.",
          "acceptedTranslations": ["It's the best book I've ever read.", "It is the best book I have ever read."]
        },
        {
          "nativeSentence": "Aún",
          "acceptedTranslations": ["Still"]
        },
        {
          "nativeSentence": "Aún estoy esperando la respuesta.",
          "acceptedTranslations": ["I'm still waiting for the answer.", "I am still waiting for the answer."]
        },
        {
          "nativeSentence": "Él aún vive en esa casa.",
          "acceptedTranslations": ["He still lives in that house.", "He's still living in that house."]
        },
        {
          "nativeSentence": "Sin embargo",
          "acceptedTranslations": ["However"]
        },
        {
          "nativeSentence": "Quería ir; sin embargo, estaba cansado.",
          "acceptedTranslations": ["I wanted to go; however, I was tired.", "I wanted to go. However, I was tired."]
        },
        {
          "nativeSentence": "El plan es bueno. Sin embargo, es caro.",
          "acceptedTranslations": ["The plan is good. However, it's expensive.", "The plan is good; however, it is expensive."]
        },
        {
          "nativeSentence": "Si",
          "acceptedTranslations": ["Whether"]
        },
        {
          "nativeSentence": "No sé si vendrá o no.",
          "acceptedTranslations": ["I don't know whether he will come or not.", "I don't know whether or not he'll come."]
        },
        {
          "nativeSentence": "Pregúntale si quiere café.",
          "acceptedTranslations": ["Ask her whether she wants coffee.", "Ask her whether she'd like coffee."]
        },
        {
          "nativeSentence": "Cada",
          "acceptedTranslations": ["Every"]
        },
        {
          "nativeSentence": "Cada mañana bebo café.",
          "acceptedTranslations": ["I drink coffee every morning.", "Every morning I drink coffee."]
        },
        {
          "nativeSentence": "Cada estudiante tiene un libro.",
          "acceptedTranslations": ["Every student has a book.", "Each student has a book."]
        },
        {
          "nativeSentence": "Bastante",
          "acceptedTranslations": ["Quite"]
        },
        {
          "nativeSentence": "Este examen es bastante difícil.",
          "acceptedTranslations": ["This exam is quite difficult.", "This test is quite hard."]
        },
        {
          "nativeSentence": "Estoy bastante seguro de eso.",
          "acceptedTranslations": ["I'm quite sure about that.", "I am quite certain about that."]
        },
        {
          "nativeSentence": "En cambio",
          "acceptedTranslations": ["Instead"]
        },
        {
          "nativeSentence": "No fui al cine; en cambio, me quedé en casa.",
          "acceptedTranslations": ["I didn't go to the movies; instead, I stayed home.", "I didn't go to the cinema. Instead, I stayed at home."]
        },
        {
          "nativeSentence": "En cambio, decidimos esperar.",
          "acceptedTranslations": ["Instead, we decided to wait.", "We decided to wait instead."]
        },
        {
          "nativeSentence": "Pero",
          "acceptedTranslations": ["But"]
        },
        {
          "nativeSentence": "Quiero ir, pero no tengo tiempo.",
          "acceptedTranslations": ["I want to go, but I don't have time.", "I want to go, but I have no time."]
        },
        {
          "nativeSentence": "Es caro, pero vale la pena.",
          "acceptedTranslations": ["It's expensive, but it's worth it.", "It is expensive, but it is worth it."]
        },
        {
          "nativeSentence": "En / Hacia",
          "acceptedTranslations": ["Into"]
        },
        {
          "nativeSentence": "Entró en la casa.",
          "acceptedTranslations": ["He went into the house.", "He walked into the house."]
        },
        {
          "nativeSentence": "Traduce esta frase al inglés.",
          "acceptedTranslations": ["Translate this sentence into English.", "Translate this phrase into English."]
        },
        {
          "nativeSentence": "Suficiente",
          "acceptedTranslations": ["Enough"]
        },
        {
          "nativeSentence": "No tenemos suficiente tiempo.",
          "acceptedTranslations": ["We don't have enough time.", "We do not have enough time."]
        },
        {
          "nativeSentence": "Ella es lo suficientemente inteligente para resolverlo.",
          "acceptedTranslations": ["She's smart enough to solve it.", "She is smart enough to figure it out."]
        }
      ]
    }
  },
  "lista-8": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 2",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Solo", "acceptedTranslations": ["Just"] },
        { "nativeSentence": "Solo quiero ayudar.", "acceptedTranslations": ["I just want to help.", "I only want to help."] },
        { "nativeSentence": "Acabamos de llegar.", "acceptedTranslations": ["We just arrived.", "We've just arrived."] },
        { "nativeSentence": "Puede", "acceptedTranslations": ["May"] },
        { "nativeSentence": "Puede que llueva mañana.", "acceptedTranslations": ["It may rain tomorrow.", "It might rain tomorrow."] },
        { "nativeSentence": "¿Puedo entrar?", "acceptedTranslations": ["May I come in?", "May I enter?"] },
        { "nativeSentence": "A menudo", "acceptedTranslations": ["Often"] },
        { "nativeSentence": "A menudo como en casa.", "acceptedTranslations": ["I often eat at home.", "I eat at home often."] },
        { "nativeSentence": "Ella viaja a menudo por trabajo.", "acceptedTranslations": ["She often travels for work.", "She travels for work often."] },
        { "nativeSentence": "Siempre", "acceptedTranslations": ["Always"] },
        { "nativeSentence": "Siempre llego temprano.", "acceptedTranslations": ["I always arrive early.", "I'm always early."] },
        { "nativeSentence": "Él siempre dice la verdad.", "acceptedTranslations": ["He always tells the truth.", "He's always honest."] },
        { "nativeSentence": "Cuando sea", "acceptedTranslations": ["Whenever"] },
        { "nativeSentence": "Llámame cuando quieras.", "acceptedTranslations": ["Call me whenever you want.", "Call me whenever you'd like."] },
        { "nativeSentence": "Puedes venir cuando sea.", "acceptedTranslations": ["You can come whenever.", "You can come whenever you like."] },
        { "nativeSentence": "En vez de", "acceptedTranslations": ["Rather than"] },
        { "nativeSentence": "Prefiero caminar en vez de conducir.", "acceptedTranslations": ["I'd rather walk than drive.", "I prefer walking rather than driving."] },
        { "nativeSentence": "Elegimos esperar en vez de arriesgarnos.", "acceptedTranslations": ["We chose to wait rather than take the risk.", "We decided to wait rather than risk it."] },
        { "nativeSentence": "Además", "acceptedTranslations": ["Furthermore"] },
        { "nativeSentence": "El plan es caro. Además, tomará mucho tiempo.", "acceptedTranslations": ["The plan is expensive. Furthermore, it will take a long time.", "The plan is expensive; furthermore, it will take a lot of time."] },
        { "nativeSentence": "Además, necesitamos más información.", "acceptedTranslations": ["Furthermore, we need more information.", "Furthermore, we need additional information."] },
        { "nativeSentence": "A pesar de", "acceptedTranslations": ["Despite"] },
        { "nativeSentence": "A pesar de la lluvia, salimos a caminar.", "acceptedTranslations": ["Despite the rain, we went for a walk.", "Despite the rain, we went out for a walk."] },
        { "nativeSentence": "Ella terminó el proyecto a pesar de las dificultades.", "acceptedTranslations": ["She finished the project despite the difficulties.", "She finished the project despite the challenges."] },
        { "nativeSentence": "Mejor", "acceptedTranslations": ["Better"] },
        { "nativeSentence": "Esta opción es mejor.", "acceptedTranslations": ["This option is better.", "This choice is better."] },
        { "nativeSentence": "Me siento mejor hoy.", "acceptedTranslations": ["I feel better today.", "I'm feeling better today."] },
        { "nativeSentence": "Excelente", "acceptedTranslations": ["Great"] },
        { "nativeSentence": "Tuvimos una idea excelente.", "acceptedTranslations": ["We had a great idea.", "We came up with a great idea."] },
        { "nativeSentence": "Es un excelente doctor.", "acceptedTranslations": ["He is a great doctor.", "He's a great doctor."] },
        { "nativeSentence": "Mantener", "acceptedTranslations": ["Keep"] },
        { "nativeSentence": "Necesito mantener la calma.", "acceptedTranslations": ["I need to keep calm.", "I need to stay calm."] },
        { "nativeSentence": "Ella mantiene su promesa.", "acceptedTranslations": ["She keeps her promise.", "She keeps her word."] },
        { "nativeSentence": "Dejar", "acceptedTranslations": ["Leave"] },
        { "nativeSentence": "Voy a dejar la ciudad mañana.", "acceptedTranslations": ["I'm going to leave the city tomorrow.", "I will leave the city tomorrow."] },
        { "nativeSentence": "Él dejó las llaves en la mesa.", "acceptedTranslations": ["He left the keys on the table.", "He left his keys on the table."] },
        { "nativeSentence": "Traer", "acceptedTranslations": ["Bring"] },
        { "nativeSentence": "¿Puedes traer el postre?", "acceptedTranslations": ["Can you bring dessert?", "Could you bring the dessert?"] },
        { "nativeSentence": "Ella aporta muchas ideas nuevas.", "acceptedTranslations": ["She brings a lot of new ideas.", "She brings many new ideas."] },
        { "nativeSentence": "Aferrarse", "acceptedTranslations": ["Hold on", "To hold on"] },
        { "nativeSentence": "Tienes que aferrarte a tus sueños.", "acceptedTranslations": ["You have to hold on to your dreams.", "You've got to hold on to your dreams."] },
        { "nativeSentence": "Ella se aferró a la esperanza.", "acceptedTranslations": ["She held on to hope.", "She clung to hope."] },
        { "nativeSentence": "Cualquiera", "acceptedTranslations": ["Either"] },
        { "nativeSentence": "Puedes elegir cualquiera de los dos.", "acceptedTranslations": ["You can choose either one.", "You can pick either one."] },
        { "nativeSentence": "No me gusta ninguna de las dos opciones.", "acceptedTranslations": ["I don't like either option.", "I don't like either one."] }
      ]
    }
  },
  "lista-9": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 3",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Conseguido", "acceptedTranslations": ["Got"] },
        { "nativeSentence": "Ya lo tengo.", "acceptedTranslations": ["I've got it.", "I have got it."] },
        { "nativeSentence": "Ella consiguió el trabajo.", "acceptedTranslations": ["She got the job.", "She landed the job."] },
        { "nativeSentence": "Tenía", "acceptedTranslations": ["Had"] },
        { "nativeSentence": "Yo tenía un perro cuando era niño.", "acceptedTranslations": ["I had a dog when I was a kid.", "I had a dog as a child."] },
        { "nativeSentence": "Ellos ya habían comido.", "acceptedTranslations": ["They had already eaten.", "They'd already eaten."] },
        { "nativeSentence": "Capaz", "acceptedTranslations": ["Able"] },
        { "nativeSentence": "Ella es capaz de resolverlo sola.", "acceptedTranslations": ["She is able to solve it alone.", "She's able to solve it on her own."] },
        { "nativeSentence": "No fui capaz de terminar a tiempo.", "acceptedTranslations": ["I wasn't able to finish on time.", "I was not able to finish on time."] },
        { "nativeSentence": "Cierto", "acceptedTranslations": ["Certain"] },
        { "nativeSentence": "Es cierto que él tiene razón.", "acceptedTranslations": ["It's certain that he's right.", "It is certain that he is right."] },
        { "nativeSentence": "Hay ciertas reglas que debes seguir.", "acceptedTranslations": ["There are certain rules you must follow.", "There are certain rules you have to follow."] },
        { "nativeSentence": "Parecer", "acceptedTranslations": ["Seem"] },
        { "nativeSentence": "Pareces cansado hoy.", "acceptedTranslations": ["You seem tired today.", "You look tired today."] },
        { "nativeSentence": "Esto parece complicado.", "acceptedTranslations": ["This seems complicated.", "This seems complex."] },
        { "nativeSentence": "Parece", "acceptedTranslations": ["Seems"] },
        { "nativeSentence": "Ella parece feliz.", "acceptedTranslations": ["She seems happy.", "She looks happy."] },
        { "nativeSentence": "Parece que va a llover.", "acceptedTranslations": ["It seems like it's going to rain.", "It seems it will rain."] },
        { "nativeSentence": "Sintió", "acceptedTranslations": ["Felt"] },
        { "nativeSentence": "Me sentí muy feliz ayer.", "acceptedTranslations": ["I felt very happy yesterday.", "I felt really happy yesterday."] },
        { "nativeSentence": "Él sintió miedo.", "acceptedTranslations": ["He felt scared.", "He felt afraid."] },
        { "nativeSentence": "Sentimiento", "acceptedTranslations": ["Feeling"] },
        { "nativeSentence": "Tengo un buen sentimiento sobre esto.", "acceptedTranslations": ["I have a good feeling about this.", "I've got a good feeling about this."] },
        { "nativeSentence": "Es un sentimiento extraño.", "acceptedTranslations": ["It's a strange feeling.", "It is a strange feeling."] },
        { "nativeSentence": "Podría", "acceptedTranslations": ["Could"] },
        { "nativeSentence": "Podría ayudarte mañana.", "acceptedTranslations": ["I could help you tomorrow.", "I could help you out tomorrow."] },
        { "nativeSentence": "¿Podrías cerrar la puerta?", "acceptedTranslations": ["Could you close the door?", "Could you shut the door?"] },
        { "nativeSentence": "Convertirse", "acceptedTranslations": ["Become"] },
        { "nativeSentence": "Quiero convertirme en doctor.", "acceptedTranslations": ["I want to become a doctor.", "I want to become a physician."] },
        { "nativeSentence": "La situación se volvió difícil.", "acceptedTranslations": ["The situation became difficult.", "The situation became hard."] },
        { "nativeSentence": "Propio", "acceptedTranslations": ["Own"] },
        { "nativeSentence": "Ella tiene su propia casa.", "acceptedTranslations": ["She has her own house.", "She has her own home."] },
        { "nativeSentence": "Quiero mi propio negocio.", "acceptedTranslations": ["I want my own business.", "I want my own company."] },
        { "nativeSentence": "Pocos", "acceptedTranslations": ["Few"] },
        { "nativeSentence": "Tengo pocos amigos cercanos.", "acceptedTranslations": ["I have few close friends.", "I don't have many close friends."] },
        { "nativeSentence": "Faltan pocos días para el viaje.", "acceptedTranslations": ["There are few days left before the trip.", "Only a few days are left before the trip."] },
        { "nativeSentence": "Temprano", "acceptedTranslations": ["Early"] },
        { "nativeSentence": "Me levanto temprano todos los días.", "acceptedTranslations": ["I wake up early every day.", "I get up early every day."] },
        { "nativeSentence": "Llegamos temprano a la reunión.", "acceptedTranslations": ["We arrived early for the meeting.", "We got to the meeting early."] },
        { "nativeSentence": "Asunto", "acceptedTranslations": ["Matter"] },
        { "nativeSentence": "Es un asunto importante.", "acceptedTranslations": ["It's an important matter.", "It is an important matter."] },
        { "nativeSentence": "No importa lo que digas.", "acceptedTranslations": ["It doesn't matter what you say.", "It does not matter what you say."] },
        { "nativeSentence": "Suerte", "acceptedTranslations": ["Luck"] },
        { "nativeSentence": "Tuvimos mucha suerte hoy.", "acceptedTranslations": ["We had a lot of luck today.", "We were very lucky today."] },
        { "nativeSentence": "¡Buena suerte en tu examen!", "acceptedTranslations": ["Good luck on your exam!", "Good luck with your test!"] }
      ]
    }
  },
  "lista-10": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 4",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Gastar", "acceptedTranslations": ["Spend"] },
        { "nativeSentence": "No quiero gastar mucho dinero.", "acceptedTranslations": ["I don't want to spend a lot of money.", "I don't want to spend too much money."] },
        { "nativeSentence": "Ellos pasan tiempo juntos los domingos.", "acceptedTranslations": ["They spend time together on Sundays.", "They spend Sundays together."] },
        { "nativeSentence": "Gastado", "acceptedTranslations": ["Spent"] },
        { "nativeSentence": "Gasté todo mi dinero en libros.", "acceptedTranslations": ["I spent all my money on books.", "I spent all of my money on books."] },
        { "nativeSentence": "Pasamos tres horas esperando.", "acceptedTranslations": ["We spent three hours waiting.", "We spent three hours waiting around."] },
        { "nativeSentence": "Tomó", "acceptedTranslations": ["Took"] },
        { "nativeSentence": "Ella tomó el autobús esta mañana.", "acceptedTranslations": ["She took the bus this morning.", "She took the bus today."] },
        { "nativeSentence": "Me tomó dos horas terminar.", "acceptedTranslations": ["It took me two hours to finish.", "It took me two hours to be done."] },
        { "nativeSentence": "Trajo", "acceptedTranslations": ["Brought"] },
        { "nativeSentence": "Él trajo comida para todos.", "acceptedTranslations": ["He brought food for everyone.", "He brought food for all of us."] },
        { "nativeSentence": "Trajimos buenas noticias.", "acceptedTranslations": ["We brought good news.", "We've brought good news."] },
        { "nativeSentence": "Vino", "acceptedTranslations": ["Came"] },
        { "nativeSentence": "Ella vino a la fiesta anoche.", "acceptedTranslations": ["She came to the party last night.", "She came to the party yesterday."] },
        { "nativeSentence": "El paquete llegó tarde.", "acceptedTranslations": ["The package came late.", "The package arrived late."] },
        { "nativeSentence": "Venir", "acceptedTranslations": ["Come"] },
        { "nativeSentence": "¿Puedes venir a mi casa?", "acceptedTranslations": ["Can you come to my house?", "Could you come to my place?"] },
        { "nativeSentence": "Ellos vienen todos los años.", "acceptedTranslations": ["They come every year.", "They come here every year."] },
        { "nativeSentence": "Compró", "acceptedTranslations": ["Bought"] },
        { "nativeSentence": "Mi mamá compró un carro nuevo.", "acceptedTranslations": ["My mom bought a new car.", "My mother bought a new car."] },
        { "nativeSentence": "Compramos boletos para el concierto.", "acceptedTranslations": ["We bought tickets for the concert.", "We bought concert tickets."] },
        { "nativeSentence": "Dijo", "acceptedTranslations": ["Told"] },
        { "nativeSentence": "Él me dijo la verdad.", "acceptedTranslations": ["He told me the truth.", "He told me the truth about it."] },
        { "nativeSentence": "Ella nos dijo que vendría.", "acceptedTranslations": ["She told us she would come.", "She told us she'd come."] },
        { "nativeSentence": "Comenzó", "acceptedTranslations": ["Began"] },
        { "nativeSentence": "La clase comenzó a las ocho.", "acceptedTranslations": ["The class began at eight.", "The class started at eight."] },
        { "nativeSentence": "Comenzó a llover de repente.", "acceptedTranslations": ["It began to rain suddenly.", "It suddenly began to rain."] },
        { "nativeSentence": "Comienza", "acceptedTranslations": ["Begins"] },
        { "nativeSentence": "La película comienza en diez minutos.", "acceptedTranslations": ["The movie begins in ten minutes.", "The movie starts in ten minutes."] },
        { "nativeSentence": "El curso comienza el lunes.", "acceptedTranslations": ["The course begins on Monday.", "The course starts on Monday."] },
        { "nativeSentence": "Comenzado", "acceptedTranslations": ["Begun"] },
        { "nativeSentence": "El proyecto ya ha comenzado.", "acceptedTranslations": ["The project has already begun.", "The project has already started."] },
        { "nativeSentence": "Habíamos comenzado antes de que llegaras.", "acceptedTranslations": ["We had begun before you arrived.", "We'd already begun before you got there."] },
        { "nativeSentence": "Corrió", "acceptedTranslations": ["Ran"] },
        { "nativeSentence": "Él corrió cinco kilómetros ayer.", "acceptedTranslations": ["He ran five kilometers yesterday.", "Yesterday he ran five kilometers."] },
        { "nativeSentence": "Ella corrió para no perder el tren.", "acceptedTranslations": ["She ran to catch the train.", "She ran so she wouldn't miss the train."] },
        { "nativeSentence": "Colgado", "acceptedTranslations": ["Hung"] },
        { "nativeSentence": "Colgamos el cuadro en la pared.", "acceptedTranslations": ["We hung the picture on the wall.", "We hung the painting on the wall."] },
        { "nativeSentence": "Él colgó el teléfono de repente.", "acceptedTranslations": ["He hung up the phone suddenly.", "He suddenly hung up the phone."] },
        { "nativeSentence": "Tener puesto", "acceptedTranslations": ["Wear"] },
        { "nativeSentence": "Ella siempre tiene puesto un sombrero.", "acceptedTranslations": ["She always wears a hat.", "She's always wearing a hat."] },
        { "nativeSentence": "Voy a usar mi chaqueta nueva.", "acceptedTranslations": ["I'm going to wear my new jacket.", "I am going to wear my new jacket."] },
        { "nativeSentence": "Caer", "acceptedTranslations": ["To drop", "To fall"] },
        { "nativeSentence": "El vaso se cayó al piso.", "acceptedTranslations": ["The glass dropped to the floor.", "The glass fell to the floor."] },
        { "nativeSentence": "Los precios cayeron mucho este año.", "acceptedTranslations": ["Prices dropped a lot this year.", "Prices fell a lot this year."] }
      ]
    }
  },
  "lista-11": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 5",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Soltar", "acceptedTranslations": ["To drop", "Drop"] },
        { "nativeSentence": "No sueltes el bolso.", "acceptedTranslations": ["Don't drop the bag.", "Don't drop your bag."] },
        { "nativeSentence": "Soltó las llaves sin querer.", "acceptedTranslations": ["He dropped the keys by accident.", "He accidentally dropped the keys."] },
        { "nativeSentence": "Gota", "acceptedTranslations": ["Drop"] },
        { "nativeSentence": "Cayó una gota de lluvia.", "acceptedTranslations": ["A drop of rain fell.", "A raindrop fell."] },
        { "nativeSentence": "Solo necesitas una gota de aceite.", "acceptedTranslations": ["You only need a drop of oil.", "You just need one drop of oil."] },
        { "nativeSentence": "Figura", "acceptedTranslations": ["Figure"] },
        { "nativeSentence": "Es una figura importante en la historia.", "acceptedTranslations": ["He's an important figure in history.", "He is an important figure in history."] },
        { "nativeSentence": "Ella dibujó una figura extraña.", "acceptedTranslations": ["She drew a strange figure.", "She drew a weird figure."] },
        { "nativeSentence": "Cifra", "acceptedTranslations": ["Figure"] },
        { "nativeSentence": "Las ventas alcanzaron una cifra récord.", "acceptedTranslations": ["Sales reached a record figure.", "Sales hit a record figure."] },
        { "nativeSentence": "No recuerdo la cifra exacta.", "acceptedTranslations": ["I don't remember the exact figure.", "I can't remember the exact figure."] },
        { "nativeSentence": "Preocuparse", "acceptedTranslations": ["To worry", "Worry"] },
        { "nativeSentence": "No te preocupes por eso.", "acceptedTranslations": ["Don't worry about that.", "Don't worry about it."] },
        { "nativeSentence": "Ella se preocupa mucho por su familia.", "acceptedTranslations": ["She worries a lot about her family.", "She worries about her family a lot."] },
        { "nativeSentence": "Preocupado", "acceptedTranslations": ["Worried"] },
        { "nativeSentence": "Estoy preocupado por el examen.", "acceptedTranslations": ["I'm worried about the exam.", "I am worried about the exam."] },
        { "nativeSentence": "Ellos estaban preocupados por el clima.", "acceptedTranslations": ["They were worried about the weather.", "They were worried about the weather conditions."] },
        { "nativeSentence": "Disfrutar", "acceptedTranslations": ["Enjoy"] },
        { "nativeSentence": "Disfruto mucho la música.", "acceptedTranslations": ["I really enjoy music.", "I enjoy music a lot."] },
        { "nativeSentence": "Espero que disfrutes tu viaje.", "acceptedTranslations": ["I hope you enjoy your trip.", "I hope you enjoy your journey."] },
        { "nativeSentence": "Error", "acceptedTranslations": ["Mistake"] },
        { "nativeSentence": "Cometí un error grande.", "acceptedTranslations": ["I made a big mistake.", "I made a huge mistake."] },
        { "nativeSentence": "Todos cometemos errores.", "acceptedTranslations": ["We all make mistakes.", "Everyone makes mistakes."] },
        { "nativeSentence": "Pareja", "acceptedTranslations": ["Couple"] },
        { "nativeSentence": "Son una pareja feliz.", "acceptedTranslations": ["They are a happy couple.", "They're a happy couple."] },
        { "nativeSentence": "Necesito un par de minutos.", "acceptedTranslations": ["I need a couple of minutes.", "I need a couple minutes."] },
        { "nativeSentence": "Amable", "acceptedTranslations": ["Kind"] },
        { "nativeSentence": "Ella es muy amable con todos.", "acceptedTranslations": ["She is very kind to everyone.", "She's very kind to everyone."] },
        { "nativeSentence": "Gracias por ser tan amable.", "acceptedTranslations": ["Thank you for being so kind.", "Thanks for being so kind."] },
        { "nativeSentence": "Maravilloso", "acceptedTranslations": ["Wonderful"] },
        { "nativeSentence": "Tuvimos un día maravilloso.", "acceptedTranslations": ["We had a wonderful day.", "We had such a wonderful day."] },
        { "nativeSentence": "Es una idea maravillosa.", "acceptedTranslations": ["It's a wonderful idea.", "It is a wonderful idea."] },
        { "nativeSentence": "Bonito", "acceptedTranslations": ["Pretty"] },
        { "nativeSentence": "El vestido es muy bonito.", "acceptedTranslations": ["The dress is very pretty.", "The dress is really pretty."] },
        { "nativeSentence": "Estoy bastante seguro de que ganaremos.", "acceptedTranslations": ["I'm pretty sure we'll win.", "I am pretty sure we will win."] },
        { "nativeSentence": "Ocupado", "acceptedTranslations": ["Busy"] },
        { "nativeSentence": "Estoy muy ocupado esta semana.", "acceptedTranslations": ["I'm very busy this week.", "I am really busy this week."] },
        { "nativeSentence": "Ella tiene un horario ocupado.", "acceptedTranslations": ["She has a busy schedule.", "She's got a busy schedule."] },
        { "nativeSentence": "Juntos", "acceptedTranslations": ["Together"] },
        { "nativeSentence": "Trabajamos juntos en el proyecto.", "acceptedTranslations": ["We worked together on the project.", "We worked on the project together."] },
        { "nativeSentence": "Vivimos juntos desde hace un año.", "acceptedTranslations": ["We've lived together for a year.", "We have lived together for a year."] },
        { "nativeSentence": "Infancia", "acceptedTranslations": ["Childhood"] },
        { "nativeSentence": "Tuve una infancia feliz.", "acceptedTranslations": ["I had a happy childhood.", "I had a happy childhood growing up."] },
        { "nativeSentence": "Ella recuerda su infancia con cariño.", "acceptedTranslations": ["She remembers her childhood fondly.", "She remembers her childhood with affection."] }
      ]
    }
  },
  "lista-12": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 6",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Hija", "acceptedTranslations": ["Daughter"] },
        { "nativeSentence": "Mi hija tiene diez años.", "acceptedTranslations": ["My daughter is ten years old.", "My daughter's ten years old."] },
        { "nativeSentence": "Ella es la hija mayor.", "acceptedTranslations": ["She's the eldest daughter.", "She is the oldest daughter."] },
        { "nativeSentence": "Platos", "acceptedTranslations": ["Dishes"] },
        { "nativeSentence": "Tengo que lavar los platos.", "acceptedTranslations": ["I have to wash the dishes.", "I've got to wash the dishes."] },
        { "nativeSentence": "Los platos están en la mesa.", "acceptedTranslations": ["The dishes are on the table.", "The plates are on the table."] },
        { "nativeSentence": "Fila", "acceptedTranslations": ["Line"] },
        { "nativeSentence": "Espera en la fila, por favor.", "acceptedTranslations": ["Please wait in line.", "Please stand in line."] },
        { "nativeSentence": "Dibuja una línea recta.", "acceptedTranslations": ["Draw a straight line.", "Draw a straight line, please."] },
        { "nativeSentence": "Calentar", "acceptedTranslations": ["Warm up", "To warm up"] },
        { "nativeSentence": "Voy a calentar la comida.", "acceptedTranslations": ["I'm going to warm up the food.", "I am going to warm up the food."] },
        { "nativeSentence": "El sol calienta la habitación.", "acceptedTranslations": ["The sun warms up the room.", "The sun warms the room."] },
        { "nativeSentence": "Compañero", "acceptedTranslations": ["Mate"] },
        { "nativeSentence": "Es mi compañero de trabajo.", "acceptedTranslations": ["He's my work mate.", "He is my workmate."] },
        { "nativeSentence": "Mi compañero de cuarto es muy ordenado.", "acceptedTranslations": ["My roommate is very tidy.", "My roommate is really neat."] },
        { "nativeSentence": "Guapo", "acceptedTranslations": ["Handsome"] },
        { "nativeSentence": "Es un hombre muy guapo.", "acceptedTranslations": ["He's a very handsome man.", "He is a very handsome man."] },
        { "nativeSentence": "Se veía guapo con ese traje.", "acceptedTranslations": ["He looked handsome in that suit.", "He looked handsome wearing that suit."] },
        { "nativeSentence": "Meta", "acceptedTranslations": ["Goal"] },
        { "nativeSentence": "Mi meta es aprender inglés este año.", "acceptedTranslations": ["My goal is to learn English this year.", "My goal this year is to learn English."] },
        { "nativeSentence": "Alcanzamos nuestra meta juntos.", "acceptedTranslations": ["We reached our goal together.", "We achieved our goal together."] },
        { "nativeSentence": "Resultados", "acceptedTranslations": ["Outcomes"] },
        { "nativeSentence": "Los resultados fueron positivos.", "acceptedTranslations": ["The outcomes were positive.", "The results were positive."] },
        { "nativeSentence": "Necesitamos mejores resultados este trimestre.", "acceptedTranslations": ["We need better outcomes this quarter.", "We need better results this quarter."] },
        { "nativeSentence": "Ingreso", "acceptedTranslations": ["Income"] },
        { "nativeSentence": "Su ingreso mensual es alto.", "acceptedTranslations": ["His monthly income is high.", "He has a high monthly income."] },
        { "nativeSentence": "Necesitamos aumentar nuestros ingresos.", "acceptedTranslations": ["We need to increase our income.", "We need to raise our income."] },
        { "nativeSentence": "Falta", "acceptedTranslations": ["Lack"] },
        { "nativeSentence": "Hay una falta de información.", "acceptedTranslations": ["There is a lack of information.", "There's a lack of information."] },
        { "nativeSentence": "El problema es la falta de tiempo.", "acceptedTranslations": ["The problem is a lack of time.", "The problem is the lack of time."] },
        { "nativeSentence": "Proporcionar", "acceptedTranslations": ["Provide"] },
        { "nativeSentence": "La empresa proporciona capacitación.", "acceptedTranslations": ["The company provides training.", "The company provides training for employees."] },
        { "nativeSentence": "Podemos proporcionar más detalles.", "acceptedTranslations": ["We can provide more details.", "We can provide additional details."] },
        { "nativeSentence": "Evitar", "acceptedTranslations": ["Avoid"] },
        { "nativeSentence": "Debemos evitar ese error.", "acceptedTranslations": ["We must avoid that mistake.", "We have to avoid that mistake."] },
        { "nativeSentence": "Ella evita el tráfico saliendo temprano.", "acceptedTranslations": ["She avoids traffic by leaving early.", "She avoids the traffic by leaving early."] },
        { "nativeSentence": "Asegurar", "acceptedTranslations": ["Ensure"] },
        { "nativeSentence": "Queremos asegurar la calidad del producto.", "acceptedTranslations": ["We want to ensure the product's quality.", "We want to ensure the quality of the product."] },
        { "nativeSentence": "Esto asegura un buen resultado.", "acceptedTranslations": ["This ensures a good outcome.", "This ensures a good result."] },
        { "nativeSentence": "Llevar a cabo", "acceptedTranslations": ["Perform", "To perform"] },
        { "nativeSentence": "Vamos a llevar a cabo el plan.", "acceptedTranslations": ["We're going to carry out the plan.", "We are going to carry out the plan."] },
        { "nativeSentence": "El equipo llevó a cabo la tarea con éxito.", "acceptedTranslations": ["The team performed the task successfully.", "The team carried out the task successfully."] },
        { "nativeSentence": "Intentar", "acceptedTranslations": ["Attempt"] },
        { "nativeSentence": "Voy a intentar resolverlo.", "acceptedTranslations": ["I'm going to attempt to solve it.", "I will attempt to solve it."] },
        { "nativeSentence": "Ella intentó explicarlo de nuevo.", "acceptedTranslations": ["She attempted to explain it again.", "She tried to explain it again."] }
      ]
    }
  },
  "lista-13": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 7",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Lanzar", "acceptedTranslations": ["Launch"] },
        { "nativeSentence": "Vamos a lanzar el producto en marzo.", "acceptedTranslations": ["We're going to launch the product in March.", "We are launching the product in March."] },
        { "nativeSentence": "La empresa lanzó una nueva app.", "acceptedTranslations": ["The company launched a new app.", "The company launched a new application."] },
        { "nativeSentence": "Poder pagar", "acceptedTranslations": ["Afford", "To afford"] },
        { "nativeSentence": "No puedo pagar ese carro.", "acceptedTranslations": ["I can't afford that car.", "I cannot afford that car."] },
        { "nativeSentence": "¿Puedes pagar las vacaciones este año?", "acceptedTranslations": ["Can you afford the vacation this year?", "Can you afford this year's vacation?"] },
        { "nativeSentence": "Honorarios", "acceptedTranslations": ["Fees"] },
        { "nativeSentence": "Los honorarios del abogado son altos.", "acceptedTranslations": ["The lawyer's fees are high.", "The lawyer's fees are expensive."] },
        { "nativeSentence": "Hay que pagar una cuota de inscripción.", "acceptedTranslations": ["You have to pay a registration fee.", "There's a registration fee to pay."] },
        { "nativeSentence": "Duda", "acceptedTranslations": ["Doubt"] },
        { "nativeSentence": "Tengo una duda sobre esto.", "acceptedTranslations": ["I have a doubt about this.", "I've got a doubt about this."] },
        { "nativeSentence": "Sin duda, es la mejor opción.", "acceptedTranslations": ["Without a doubt, it's the best option.", "No doubt, it is the best option."] },
        { "nativeSentence": "Salir", "acceptedTranslations": ["Go out"] },
        { "nativeSentence": "Vamos a salir esta noche.", "acceptedTranslations": ["We're going out tonight.", "We are going out tonight."] },
        { "nativeSentence": "Ella sale con sus amigas los viernes.", "acceptedTranslations": ["She goes out with her friends on Fridays.", "She goes out with her friends every Friday."] },
        { "nativeSentence": "Revisar", "acceptedTranslations": ["Check out"] },
        { "nativeSentence": "Deberías revisar este restaurante.", "acceptedTranslations": ["You should check out this restaurant.", "You should check this restaurant out."] },
        { "nativeSentence": "Vamos a revisar la nueva tienda.", "acceptedTranslations": ["Let's check out the new store.", "Let's go check out the new store."] },
        { "nativeSentence": "Abandonar", "acceptedTranslations": ["Drop out", "To drop out"] },
        { "nativeSentence": "Él decidió abandonar la universidad.", "acceptedTranslations": ["He decided to drop out of college.", "He decided to drop out of university."] },
        { "nativeSentence": "Muchos estudiantes abandonan el primer año.", "acceptedTranslations": ["Many students drop out in the first year.", "Many students drop out during the first year."] },
        { "nativeSentence": "Seguir adelante", "acceptedTranslations": ["Move on", "To move on"] },
        { "nativeSentence": "Es hora de seguir adelante.", "acceptedTranslations": ["It's time to move on.", "It is time to move on."] },
        { "nativeSentence": "Ella logró seguir adelante después del cambio.", "acceptedTranslations": ["She managed to move on after the change.", "She was able to move on after the change."] },
        { "nativeSentence": "Por ejemplo", "acceptedTranslations": ["For instance"] },
        { "nativeSentence": "Hay muchas opciones; por ejemplo, el tren.", "acceptedTranslations": ["There are many options; for instance, the train.", "There are many options — the train, for instance."] },
        { "nativeSentence": "Por ejemplo, podríamos empezar mañana.", "acceptedTranslations": ["For instance, we could start tomorrow.", "For example, we could start tomorrow."] },
        { "nativeSentence": "En ese caso", "acceptedTranslations": ["If so"] },
        { "nativeSentence": "¿Vas a venir? Si es así, avísame.", "acceptedTranslations": ["Are you coming? If so, let me know.", "Are you coming? If so, please let me know."] },
        { "nativeSentence": "En ese caso, cambiemos el plan.", "acceptedTranslations": ["If so, let's change the plan.", "If that's the case, let's change the plan."] },
        { "nativeSentence": "Al menos", "acceptedTranslations": ["At least"] },
        { "nativeSentence": "Necesitamos al menos dos horas.", "acceptedTranslations": ["We need at least two hours.", "We need two hours at least."] },
        { "nativeSentence": "Al menos lo intentamos.", "acceptedTranslations": ["At least we tried.", "At least we gave it a try."] },
        { "nativeSentence": "A lo largo de", "acceptedTranslations": ["Throughout", "Along"] },
        { "nativeSentence": "Trabajamos juntos a lo largo del proyecto.", "acceptedTranslations": ["We worked together throughout the project.", "We worked together throughout the whole project."] },
        { "nativeSentence": "Caminamos a lo largo de la playa.", "acceptedTranslations": ["We walked along the beach.", "We walked along the shore."] },
        { "nativeSentence": "Enorme", "acceptedTranslations": ["Huge"] },
        { "nativeSentence": "Fue un éxito enorme.", "acceptedTranslations": ["It was a huge success.", "It was a huge hit."] },
        { "nativeSentence": "Viven en una casa enorme.", "acceptedTranslations": ["They live in a huge house.", "They live in a huge home."] },
        { "nativeSentence": "Dispuesto", "acceptedTranslations": ["Willing"] },
        { "nativeSentence": "Estoy dispuesto a ayudar.", "acceptedTranslations": ["I'm willing to help.", "I am willing to help."] },
        { "nativeSentence": "Ella está dispuesta a viajar por trabajo.", "acceptedTranslations": ["She's willing to travel for work.", "She is willing to travel for work."] },
        { "nativeSentence": "Solidario", "acceptedTranslations": ["Supportive"] },
        { "nativeSentence": "Mi familia es muy solidaria.", "acceptedTranslations": ["My family is very supportive.", "My family is really supportive."] },
        { "nativeSentence": "Ella tuvo un jefe muy solidario.", "acceptedTranslations": ["She had a very supportive boss.", "She had a really supportive boss."] }
      ]
    }
  },
  "lista-14": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 8",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Desplazar", "acceptedTranslations": ["Displace"] },
        { "nativeSentence": "La guerra desplazó a miles de personas.", "acceptedTranslations": ["The war displaced thousands of people.", "The war displaced thousands of people from their homes."] },
        { "nativeSentence": "La nueva tecnología desplazó a la anterior.", "acceptedTranslations": ["The new technology displaced the old one.", "New technology displaced the older one."] },
        { "nativeSentence": "Descuidado", "acceptedTranslations": ["Careless"] },
        { "nativeSentence": "Fue un error descuidado.", "acceptedTranslations": ["It was a careless mistake.", "That was a careless mistake."] },
        { "nativeSentence": "No seas tan descuidado con tus cosas.", "acceptedTranslations": ["Don't be so careless with your things.", "Don't be so careless with your belongings."] },
        { "nativeSentence": "Aumentar", "acceptedTranslations": ["Increase", "Raise"] },
        { "nativeSentence": "Necesitamos aumentar las ventas.", "acceptedTranslations": ["We need to increase sales.", "We need to raise sales."] },
        { "nativeSentence": "La empresa aumentó los precios.", "acceptedTranslations": ["The company increased the prices.", "The company raised the prices."] },
        { "nativeSentence": "Abrumado", "acceptedTranslations": ["Overwhelmed"] },
        { "nativeSentence": "Me siento abrumado con tanto trabajo.", "acceptedTranslations": ["I feel overwhelmed with so much work.", "I'm feeling overwhelmed with so much work."] },
        { "nativeSentence": "Ella estaba abrumada por las noticias.", "acceptedTranslations": ["She was overwhelmed by the news.", "She felt overwhelmed by the news."] },
        { "nativeSentence": "Atascado", "acceptedTranslations": ["Stuck"] },
        { "nativeSentence": "El carro quedó atascado en el barro.", "acceptedTranslations": ["The car got stuck in the mud.", "The car was stuck in the mud."] },
        { "nativeSentence": "Estoy atascado en este problema.", "acceptedTranslations": ["I'm stuck on this problem.", "I am stuck on this problem."] },
        { "nativeSentence": "Agujero", "acceptedTranslations": ["Hole"] },
        { "nativeSentence": "Hay un agujero en la pared.", "acceptedTranslations": ["There's a hole in the wall.", "There is a hole in the wall."] },
        { "nativeSentence": "El perro cavó un agujero en el jardín.", "acceptedTranslations": ["The dog dug a hole in the yard.", "The dog dug a hole in the garden."] },
        { "nativeSentence": "Harto", "acceptedTranslations": ["Fed up"] },
        { "nativeSentence": "Estoy harto de este ruido.", "acceptedTranslations": ["I'm fed up with this noise.", "I am fed up with this noise."] },
        { "nativeSentence": "Ella está harta de esperar.", "acceptedTranslations": ["She's fed up with waiting.", "She is fed up with waiting."] },
        { "nativeSentence": "Deber", "acceptedTranslations": ["Owe"] },
        { "nativeSentence": "Te debo veinte dólares.", "acceptedTranslations": ["I owe you twenty dollars.", "I owe you twenty bucks."] },
        { "nativeSentence": "Todavía le debemos dinero al banco.", "acceptedTranslations": ["We still owe money to the bank.", "We still owe the bank money."] },
        { "nativeSentence": "Renunciar", "acceptedTranslations": ["Resign"] },
        { "nativeSentence": "Él decidió renunciar a su trabajo.", "acceptedTranslations": ["He decided to resign from his job.", "He decided to resign from his position."] },
        { "nativeSentence": "Ella renunció el mes pasado.", "acceptedTranslations": ["She resigned last month.", "She resigned last month from her job."] },
        { "nativeSentence": "Dejar ir", "acceptedTranslations": ["Let go of"] },
        { "nativeSentence": "Es difícil dejar ir el pasado.", "acceptedTranslations": ["It's hard to let go of the past.", "It is hard to let go of the past."] },
        { "nativeSentence": "Tienes que dejar ir ese miedo.", "acceptedTranslations": ["You have to let go of that fear.", "You need to let go of that fear."] },
        { "nativeSentence": "Pertenecer", "acceptedTranslations": ["Belong"] },
        { "nativeSentence": "Este libro pertenece a la biblioteca.", "acceptedTranslations": ["This book belongs to the library.", "This book belongs in the library."] },
        { "nativeSentence": "Sentimos que pertenecemos aquí.", "acceptedTranslations": ["We feel like we belong here.", "We feel we belong here."] },
        { "nativeSentence": "Desear", "acceptedTranslations": ["Wish"] },
        { "nativeSentence": "Deseo que tengas un buen día.", "acceptedTranslations": ["I wish you a good day.", "I wish you a nice day."] },
        { "nativeSentence": "Ojalá pudiera viajar más.", "acceptedTranslations": ["I wish I could travel more.", "I wish I could travel more often."] },
        { "nativeSentence": "Provechoso", "acceptedTranslations": ["Rewarding"] },
        { "nativeSentence": "Fue un trabajo muy provechoso.", "acceptedTranslations": ["It was very rewarding work.", "It was a very rewarding job."] },
        { "nativeSentence": "Enseñar es una profesión provechosa.", "acceptedTranslations": ["Teaching is a rewarding profession.", "Teaching is a rewarding career."] },
        { "nativeSentence": "Tengo muchas ganas de", "acceptedTranslations": ["I am looking forward to", "I'm looking forward to"] },
        { "nativeSentence": "Tengo muchas ganas de verte.", "acceptedTranslations": ["I'm looking forward to seeing you.", "I am looking forward to seeing you."] },
        { "nativeSentence": "Tenemos muchas ganas de las vacaciones.", "acceptedTranslations": ["We are looking forward to the vacation.", "We're looking forward to the vacation."] }
      ]
    }
  },
  "lista-15": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 9",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Importante", "acceptedTranslations": ["Major"] },
        { "nativeSentence": "Fue un cambio importante en la empresa.", "acceptedTranslations": ["It was a major change in the company.", "It was a major shift in the company."] },
        { "nativeSentence": "Tuvimos un problema importante ayer.", "acceptedTranslations": ["We had a major problem yesterday.", "We had a major issue yesterday."] },
        { "nativeSentence": "Especialidad", "acceptedTranslations": ["Major"] },
        { "nativeSentence": "Su especialidad es la biología.", "acceptedTranslations": ["Her major is biology.", "Her major is in biology."] },
        { "nativeSentence": "¿Cuál es tu especialidad en la universidad?", "acceptedTranslations": ["What's your major in college?", "What is your major at university?"] },
        { "nativeSentence": "Difícil", "acceptedTranslations": ["Tough"] },
        { "nativeSentence": "Fue una semana difícil.", "acceptedTranslations": ["It was a tough week.", "It was a tough week for us."] },
        { "nativeSentence": "Tomar esa decisión fue difícil.", "acceptedTranslations": ["Making that decision was tough.", "That decision was tough to make."] },
        { "nativeSentence": "Duro", "acceptedTranslations": ["Tough"] },
        { "nativeSentence": "Esta carne está muy dura.", "acceptedTranslations": ["This meat is very tough.", "This meat is really tough."] },
        { "nativeSentence": "Es un material muy duro.", "acceptedTranslations": ["It's a very tough material.", "It is a very tough material."] },
        { "nativeSentence": "Abarcar", "acceptedTranslations": ["Embrace"] },
        { "nativeSentence": "Debemos abarcar el cambio.", "acceptedTranslations": ["We must embrace change.", "We have to embrace change."] },
        { "nativeSentence": "La empresa abraza nuevas ideas.", "acceptedTranslations": ["The company embraces new ideas.", "The company embraces new concepts."] },
        { "nativeSentence": "Pulir", "acceptedTranslations": ["Polish"] },
        { "nativeSentence": "Necesito pulir mi presentación.", "acceptedTranslations": ["I need to polish my presentation.", "I need to polish up my presentation."] },
        { "nativeSentence": "Ella pulió el texto antes de enviarlo.", "acceptedTranslations": ["She polished the text before sending it.", "She polished up the text before sending it."] },
        { "nativeSentence": "Encuesta", "acceptedTranslations": ["Survey"] },
        { "nativeSentence": "Hicimos una encuesta a los clientes.", "acceptedTranslations": ["We did a survey of the customers.", "We conducted a survey of our customers."] },
        { "nativeSentence": "Completa esta encuesta rápida.", "acceptedTranslations": ["Complete this quick survey.", "Fill out this quick survey."] },
        { "nativeSentence": "Tener cuidado", "acceptedTranslations": ["Beware"] },
        { "nativeSentence": "Ten cuidado con ese perro.", "acceptedTranslations": ["Beware of that dog.", "Beware of the dog."] },
        { "nativeSentence": "Debes tener cuidado con esos correos.", "acceptedTranslations": ["You should beware of those emails.", "You should be wary of those emails."] },
        { "nativeSentence": "Contrarrestar", "acceptedTranslations": ["Counter"] },
        { "nativeSentence": "Necesitamos contrarrestar ese argumento.", "acceptedTranslations": ["We need to counter that argument.", "We need to counter that point."] },
        { "nativeSentence": "La empresa contrarrestó la crítica rápidamente.", "acceptedTranslations": ["The company countered the criticism quickly.", "The company quickly countered the criticism."] },
        { "nativeSentence": "Confiable", "acceptedTranslations": ["Reliable"] },
        { "nativeSentence": "Es una fuente confiable.", "acceptedTranslations": ["It's a reliable source.", "It is a reliable source."] },
        { "nativeSentence": "Necesitamos un carro más confiable.", "acceptedTranslations": ["We need a more reliable car.", "We need a more reliable vehicle."] },
        { "nativeSentence": "Refuerzo", "acceptedTranslations": ["Booster"] },
        { "nativeSentence": "Recibí la dosis de refuerzo ayer.", "acceptedTranslations": ["I got the booster dose yesterday.", "I got the booster shot yesterday."] },
        { "nativeSentence": "Esto es un refuerzo de confianza.", "acceptedTranslations": ["This is a confidence booster.", "It's a real confidence booster."] },
        { "nativeSentence": "Fragmentos", "acceptedTranslations": ["Snippets"] },
        { "nativeSentence": "Él compartió algunos fragmentos del código.", "acceptedTranslations": ["He shared a few code snippets.", "He shared some snippets of code."] },
        { "nativeSentence": "Vi fragmentos de la entrevista.", "acceptedTranslations": ["I saw snippets of the interview.", "I saw a few snippets from the interview."] },
        { "nativeSentence": "Instrucciones", "acceptedTranslations": ["Briefing"] },
        { "nativeSentence": "Tuvimos una reunión de instrucciones esta mañana.", "acceptedTranslations": ["We had a briefing this morning.", "We had a briefing meeting this morning."] },
        { "nativeSentence": "El jefe dio las instrucciones antes del viaje.", "acceptedTranslations": ["The boss gave the briefing before the trip.", "The boss gave a briefing before the trip."] },
        { "nativeSentence": "En curso", "acceptedTranslations": ["Ongoing"] },
        { "nativeSentence": "Es un proyecto en curso.", "acceptedTranslations": ["It's an ongoing project.", "It is an ongoing project."] },
        { "nativeSentence": "La investigación sigue en curso.", "acceptedTranslations": ["The investigation is still ongoing.", "The investigation remains ongoing."] },
        { "nativeSentence": "Abarca", "acceptedTranslations": ["Comprises"] },
        { "nativeSentence": "El equipo abarca cinco departamentos.", "acceptedTranslations": ["The team comprises five departments.", "The team comprises five different departments."] },
        { "nativeSentence": "El curso abarca varios temas.", "acceptedTranslations": ["The course comprises several topics.", "The course comprises various topics."] }
      ]
    }
  },
  "lista-16": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 10",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Compuesto", "acceptedTranslations": ["Made up"] },
        { "nativeSentence": "El equipo está compuesto por diez personas.", "acceptedTranslations": ["The team is made up of ten people.", "The team is made up of ten members."] },
        { "nativeSentence": "La historia está compuesta de varias partes.", "acceptedTranslations": ["The story is made up of several parts.", "The story is made up of many parts."] },
        { "nativeSentence": "Formado", "acceptedTranslations": ["Make up"] },
        { "nativeSentence": "Estas piezas forman el motor.", "acceptedTranslations": ["These parts make up the engine.", "These pieces make up the engine."] },
        { "nativeSentence": "Los estudiantes forman la mayoría del grupo.", "acceptedTranslations": ["The students make up most of the group.", "The students make up the majority of the group."] },
        { "nativeSentence": "Tratar", "acceptedTranslations": ["Treat"] },
        { "nativeSentence": "Ella me trató muy bien.", "acceptedTranslations": ["She treated me very well.", "She treated me really well."] },
        { "nativeSentence": "Lo trataron con respeto.", "acceptedTranslations": ["They treated him with respect.", "He was treated with respect."] },
        { "nativeSentence": "Dañar", "acceptedTranslations": ["Harm"] },
        { "nativeSentence": "No queremos dañar el medio ambiente.", "acceptedTranslations": ["We don't want to harm the environment.", "We don't want to cause harm to the environment."] },
        { "nativeSentence": "Eso podría dañar tu reputación.", "acceptedTranslations": ["That could harm your reputation.", "That could damage your reputation."] },
        { "nativeSentence": "Sí mismo", "acceptedTranslations": ["Himself"] },
        { "nativeSentence": "Él se hizo daño a sí mismo.", "acceptedTranslations": ["He hurt himself.", "He hurt himself by accident."] },
        { "nativeSentence": "Juan lo hizo todo él mismo.", "acceptedTranslations": ["Juan did it all by himself.", "Juan did everything by himself."], "properNouns": ["Juan"] },
        { "nativeSentence": "Ellos mismos", "acceptedTranslations": ["Themselves"] },
        { "nativeSentence": "Los niños se vistieron ellos mismos.", "acceptedTranslations": ["The kids dressed themselves.", "The children dressed themselves."] },
        { "nativeSentence": "Ellos resolvieron el problema ellos mismos.", "acceptedTranslations": ["They solved the problem themselves.", "They solved the problem by themselves."] },
        { "nativeSentence": "Comprender", "acceptedTranslations": ["Grasp"] },
        { "nativeSentence": "Me cuesta comprender este concepto.", "acceptedTranslations": ["I find it hard to grasp this concept.", "I have trouble grasping this concept."] },
        { "nativeSentence": "Ella comprendió la idea rápidamente.", "acceptedTranslations": ["She grasped the idea quickly.", "She quickly grasped the idea."] },
        { "nativeSentence": "Levemente", "acceptedTranslations": ["Slightly"] },
        { "nativeSentence": "El precio subió levemente.", "acceptedTranslations": ["The price went up slightly.", "The price rose slightly."] },
        { "nativeSentence": "Está levemente mejor hoy.", "acceptedTranslations": ["He's slightly better today.", "He is slightly better today."] },
        { "nativeSentence": "Brevemente", "acceptedTranslations": ["Briefly"] },
        { "nativeSentence": "Hablamos brevemente sobre el plan.", "acceptedTranslations": ["We talked briefly about the plan.", "We briefly talked about the plan."] },
        { "nativeSentence": "Explícalo brevemente, por favor.", "acceptedTranslations": ["Explain it briefly, please.", "Please explain it briefly."] },
        { "nativeSentence": "Principalmente", "acceptedTranslations": ["Mainly"] },
        { "nativeSentence": "Trabajamos principalmente por las mañanas.", "acceptedTranslations": ["We mainly work in the mornings.", "We work mainly in the mornings."] },
        { "nativeSentence": "El problema es principalmente el tiempo.", "acceptedTranslations": ["The problem is mainly the time.", "The problem is mainly about time."] },
        { "nativeSentence": "Suavemente", "acceptedTranslations": ["Smoothly"] },
        { "nativeSentence": "El proyecto avanzó suavemente.", "acceptedTranslations": ["The project went smoothly.", "The project ran smoothly."] },
        { "nativeSentence": "Todo salió suavemente ese día.", "acceptedTranslations": ["Everything went smoothly that day.", "Everything ran smoothly that day."] },
        { "nativeSentence": "Sabiamente", "acceptedTranslations": ["Wisely"] },
        { "nativeSentence": "Ella invirtió su dinero sabiamente.", "acceptedTranslations": ["She invested her money wisely.", "She wisely invested her money."] },
        { "nativeSentence": "Debemos usar el tiempo sabiamente.", "acceptedTranslations": ["We should use our time wisely.", "We must use our time wisely."] },
        { "nativeSentence": "Íntimamente", "acceptedTranslations": ["Intimately"] },
        { "nativeSentence": "Él conoce el tema íntimamente.", "acceptedTranslations": ["He knows the subject intimately.", "He is intimately familiar with the subject."] },
        { "nativeSentence": "Están íntimamente relacionados.", "acceptedTranslations": ["They are intimately related.", "They're intimately connected."] },
        { "nativeSentence": "Correctamente", "acceptedTranslations": ["Properly"] },
        { "nativeSentence": "Hazlo correctamente esta vez.", "acceptedTranslations": ["Do it properly this time.", "Do it the right way this time."] },
        { "nativeSentence": "El equipo no funciona correctamente.", "acceptedTranslations": ["The equipment isn't working properly.", "The equipment is not working properly."] },
        { "nativeSentence": "Largo", "acceptedTranslations": ["Lengthy"] },
        { "nativeSentence": "Fue una reunión larga.", "acceptedTranslations": ["It was a lengthy meeting.", "It was a really long meeting."] },
        { "nativeSentence": "El proceso fue muy largo.", "acceptedTranslations": ["The process was very lengthy.", "The process was quite lengthy."] }
      ]
    }
  },
  "lista-17": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 11",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Lograr", "acceptedTranslations": ["Accomplish"] },
        { "nativeSentence": "Logramos nuestro objetivo este año.", "acceptedTranslations": ["We accomplished our goal this year.", "We achieved our goal this year."] },
        { "nativeSentence": "Ella logró mucho en poco tiempo.", "acceptedTranslations": ["She accomplished a lot in a short time.", "She achieved a lot in a short time."] },
        { "nativeSentence": "Precisión", "acceptedTranslations": ["Accuracy"] },
        { "nativeSentence": "Necesitamos mejorar la precisión de los datos.", "acceptedTranslations": ["We need to improve the accuracy of the data.", "We need to improve data accuracy."] },
        { "nativeSentence": "Él trabaja con mucha precisión.", "acceptedTranslations": ["He works with great accuracy.", "He works with a lot of accuracy."] },
        { "nativeSentence": "Evaluar", "acceptedTranslations": ["Assess"] },
        { "nativeSentence": "Vamos a evaluar la situación.", "acceptedTranslations": ["We're going to assess the situation.", "We are going to assess the situation."] },
        { "nativeSentence": "El médico evaluó al paciente.", "acceptedTranslations": ["The doctor assessed the patient.", "The doctor assessed the patient's condition."] },
        { "nativeSentence": "Evaluación", "acceptedTranslations": ["Assessment"] },
        { "nativeSentence": "Hicimos una evaluación completa.", "acceptedTranslations": ["We did a full assessment.", "We conducted a full assessment."] },
        { "nativeSentence": "La evaluación mostró buenos resultados.", "acceptedTranslations": ["The assessment showed good results.", "The assessment revealed good results."] },
        { "nativeSentence": "Mejorar", "acceptedTranslations": ["Enhance"] },
        { "nativeSentence": "Queremos mejorar la experiencia del usuario.", "acceptedTranslations": ["We want to enhance the user experience.", "We want to improve the user experience."] },
        { "nativeSentence": "Esto mejora el sabor del plato.", "acceptedTranslations": ["This enhances the flavor of the dish.", "This enhances the dish's flavor."] },
        { "nativeSentence": "Evolucionar", "acceptedTranslations": ["Evolve"] },
        { "nativeSentence": "La tecnología sigue evolucionando.", "acceptedTranslations": ["Technology keeps evolving.", "Technology continues to evolve."] },
        { "nativeSentence": "Nuestra empresa ha evolucionado mucho.", "acceptedTranslations": ["Our company has evolved a lot.", "Our company has evolved significantly."] },
        { "nativeSentence": "Averiguar", "acceptedTranslations": ["Figure out"] },
        { "nativeSentence": "Necesito averiguar cómo funciona esto.", "acceptedTranslations": ["I need to figure out how this works.", "I need to figure out how it works."] },
        { "nativeSentence": "Ella averiguó la solución sola.", "acceptedTranslations": ["She figured out the solution on her own.", "She figured out the solution by herself."] },
        { "nativeSentence": "Huecos", "acceptedTranslations": ["Gaps"] },
        { "nativeSentence": "Hay huecos en el plan.", "acceptedTranslations": ["There are gaps in the plan.", "There are some gaps in the plan."] },
        { "nativeSentence": "Necesitamos cerrar esos huecos de información.", "acceptedTranslations": ["We need to close those information gaps.", "We need to close those gaps in information."] },
        { "nativeSentence": "Traspasos", "acceptedTranslations": ["Handoffs"] },
        { "nativeSentence": "Los traspasos entre equipos fueron difíciles.", "acceptedTranslations": ["The handoffs between teams were difficult.", "The handoffs between the teams were difficult."] },
        { "nativeSentence": "Mejoramos el proceso de traspasos.", "acceptedTranslations": ["We improved the handoff process.", "We improved the handoffs process."] },
        { "nativeSentence": "Aprovechar", "acceptedTranslations": ["Leverage", "Harness"] },
        { "nativeSentence": "Debemos aprovechar esta oportunidad.", "acceptedTranslations": ["We should leverage this opportunity.", "We should harness this opportunity."] },
        { "nativeSentence": "La empresa aprovecha la tecnología nueva.", "acceptedTranslations": ["The company leverages new technology.", "The company harnesses new technology."] },
        { "nativeSentence": "Probabilidad", "acceptedTranslations": ["Likelihood"] },
        { "nativeSentence": "Hay poca probabilidad de lluvia hoy.", "acceptedTranslations": ["There's little likelihood of rain today.", "There is little likelihood of rain today."] },
        { "nativeSentence": "Esto aumenta la probabilidad de éxito.", "acceptedTranslations": ["This increases the likelihood of success.", "This raises the likelihood of success."] },
        { "nativeSentence": "Reembolso", "acceptedTranslations": ["Reimbursement"] },
        { "nativeSentence": "Pedí un reembolso por el vuelo.", "acceptedTranslations": ["I requested a reimbursement for the flight.", "I asked for a reimbursement for the flight."] },
        { "nativeSentence": "El reembolso tarda dos semanas.", "acceptedTranslations": ["The reimbursement takes two weeks.", "The reimbursement takes about two weeks."] },
        { "nativeSentence": "Contratiempo", "acceptedTranslations": ["Setback"] },
        { "nativeSentence": "Tuvimos un contratiempo con el proyecto.", "acceptedTranslations": ["We had a setback with the project.", "We had a setback on the project."] },
        { "nativeSentence": "Fue un pequeño contratiempo.", "acceptedTranslations": ["It was a small setback.", "It was a minor setback."] },
        { "nativeSentence": "Restricciones", "acceptedTranslations": ["Constraints"] },
        { "nativeSentence": "Trabajamos bajo ciertas restricciones.", "acceptedTranslations": ["We work under certain constraints.", "We're working under certain constraints."] },
        { "nativeSentence": "Hay restricciones de tiempo y dinero.", "acceptedTranslations": ["There are constraints on time and money.", "There are time and money constraints."] }
      ]
    }
  },
  "lista-18": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 12",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Contando con", "acceptedTranslations": ["Counting on"] },
        { "nativeSentence": "Estoy contando contigo.", "acceptedTranslations": ["I'm counting on you.", "I am counting on you."] },
        { "nativeSentence": "Estamos contando con su ayuda.", "acceptedTranslations": ["We're counting on his help.", "We are counting on his help."] },
        { "nativeSentence": "Ralentiza", "acceptedTranslations": ["Slows"] },
        { "nativeSentence": "La lluvia ralentiza el tráfico.", "acceptedTranslations": ["The rain slows down traffic.", "The rain slows traffic down."] },
        { "nativeSentence": "Este problema ralentiza el proceso.", "acceptedTranslations": ["This problem slows down the process.", "This issue slows the process down."] },
        { "nativeSentence": "Bien definido", "acceptedTranslations": ["Well-defined"] },
        { "nativeSentence": "Tenemos un plan bien definido.", "acceptedTranslations": ["We have a well-defined plan.", "We have a clearly defined plan."] },
        { "nativeSentence": "El proyecto tiene objetivos bien definidos.", "acceptedTranslations": ["The project has well-defined goals.", "The project has clearly defined goals."] },
        { "nativeSentence": "Desde el inicio", "acceptedTranslations": ["Upfront", "From the start"] },
        { "nativeSentence": "Hablamos de eso desde el inicio, en la reunión de arranque.", "acceptedTranslations": ["We talked about that upfront, during the kickoff meeting.", "We discussed that upfront, during the kickoff."] },
        { "nativeSentence": "Es mejor aclarar las reglas desde el inicio.", "acceptedTranslations": ["It's better to clarify the rules upfront.", "It's best to clarify the rules from the start."] },
        { "nativeSentence": "Comenzar desde cero", "acceptedTranslations": ["Start from scratch"] },
        { "nativeSentence": "Tuvimos que comenzar desde cero.", "acceptedTranslations": ["We had to start from scratch.", "We had to start over from scratch."] },
        { "nativeSentence": "Prefiero comenzar desde cero que corregir esto.", "acceptedTranslations": ["I'd rather start from scratch than fix this.", "I would rather start from scratch than fix this."] },
        { "nativeSentence": "Desde la base", "acceptedTranslations": ["From the ground up"] },
        { "nativeSentence": "Construimos la empresa desde la base.", "acceptedTranslations": ["We built the company from the ground up.", "We built the company from scratch."] },
        { "nativeSentence": "Diseñaron el sistema desde la base.", "acceptedTranslations": ["They designed the system from the ground up.", "They designed the system from scratch."] },
        { "nativeSentence": "Para empezar", "acceptedTranslations": ["To get things started"] },
        { "nativeSentence": "Para empezar, revisemos la agenda.", "acceptedTranslations": ["To get things started, let's review the agenda.", "To get things started, let's go over the agenda."] },
        { "nativeSentence": "Necesitamos un plan para empezar.", "acceptedTranslations": ["We need a plan to get things started.", "We need a plan to get started."] },
        { "nativeSentence": "Enfocarse demasiado en los detalles", "acceptedTranslations": ["To get stuck in the weeds"] },
        { "nativeSentence": "No quiero enfocarme demasiado en los detalles pequeños.", "acceptedTranslations": ["I don't want to get stuck in the weeds.", "I don't want to get lost in the details."] },
        { "nativeSentence": "El equipo se enfocó demasiado en los detalles y perdió tiempo.", "acceptedTranslations": ["The team got stuck in the weeds and lost time.", "The team got lost in the weeds and wasted time."] },
        { "nativeSentence": "Lo que significa", "acceptedTranslations": ["Which means"] },
        { "nativeSentence": "Llegamos tarde, lo que significa que perdimos el tren.", "acceptedTranslations": ["We arrived late, which means we missed the train.", "We were late, which means we missed the train."] },
        { "nativeSentence": "El precio bajó, lo que significa más ventas.", "acceptedTranslations": ["The price dropped, which means more sales.", "The price went down, which means more sales."] },
        { "nativeSentence": "Que tiene", "acceptedTranslations": ["Which has"] },
        { "nativeSentence": "Compramos una casa que tiene tres cuartos.", "acceptedTranslations": ["We bought a house which has three bedrooms.", "We bought a house that has three bedrooms."] },
        { "nativeSentence": "Es un plan que tiene varias etapas.", "acceptedTranslations": ["It's a plan which has several stages.", "It is a plan that has several stages."] },
        { "nativeSentence": "Medio", "acceptedTranslations": ["Means"] },
        { "nativeSentence": "El correo es un buen medio de comunicación.", "acceptedTranslations": ["Email is a good means of communication.", "Email is a good way to communicate."] },
        { "nativeSentence": "No tenemos los medios para hacerlo.", "acceptedTranslations": ["We don't have the means to do it.", "We don't have the means to do that."] },
        { "nativeSentence": "Como (en ejemplos)", "acceptedTranslations": ["Such as"] },
        { "nativeSentence": "Me gustan varios deportes, como el fútbol y el tenis.", "acceptedTranslations": ["I like several sports, such as soccer and tennis.", "I like several sports, such as football and tennis."] },
        { "nativeSentence": "Hay muchas frutas, como manzanas y naranjas.", "acceptedTranslations": ["There are many fruits, such as apples and oranges.", "There are many kinds of fruit, such as apples and oranges."] },
        { "nativeSentence": "Estar empezando", "acceptedTranslations": ["Starting out"] },
        { "nativeSentence": "Cuando estaba empezando, cometí muchos errores.", "acceptedTranslations": ["When I was starting out, I made a lot of mistakes.", "When I was just starting out, I made many mistakes."] },
        { "nativeSentence": "Es difícil cuando apenas estás empezando.", "acceptedTranslations": ["It's hard when you're just starting out.", "It is hard when you're just starting out."] },
        { "nativeSentence": "Desde... hasta...", "acceptedTranslations": ["Up to", "From ... up to ..."] },
        { "nativeSentence": "El precio va desde diez hasta veinte dólares.", "acceptedTranslations": ["The price ranges from ten up to twenty dollars.", "The price goes from ten up to twenty dollars."] },
        { "nativeSentence": "Puedes invitar hasta diez personas.", "acceptedTranslations": ["You can invite up to ten people.", "You can invite up to ten guests."] },
        { "nativeSentence": "Impulso", "acceptedTranslations": ["Urge"] },
        { "nativeSentence": "Sentí el impulso de llamarla.", "acceptedTranslations": ["I felt the urge to call her.", "I felt an urge to call her."] },
        { "nativeSentence": "Le urgí que aceptara la oferta.", "acceptedTranslations": ["I urged him to accept the offer.", "I urged him to take the offer."] }
      ]
    }
  },
  "lista-19": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 13",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Ensayar", "acceptedTranslations": ["Rehearse"] },
        { "nativeSentence": "Vamos a ensayar la obra esta tarde.", "acceptedTranslations": ["We're going to rehearse the play this afternoon.", "We are going to rehearse the play this afternoon."] },
        { "nativeSentence": "Ella ensaya su discurso todos los días.", "acceptedTranslations": ["She rehearses her speech every day.", "She rehearses her speech daily."] },
        { "nativeSentence": "¡Cuidado!", "acceptedTranslations": ["Watch out!"] },
        { "nativeSentence": "¡Cuidado con ese carro!", "acceptedTranslations": ["Watch out for that car!", "Watch out for the car!"] },
        { "nativeSentence": "Cuidado, el piso está mojado.", "acceptedTranslations": ["Watch out, the floor is wet.", "Watch out — the floor's wet."] },
        { "nativeSentence": "Cuidadoso", "acceptedTranslations": ["Careful"] },
        { "nativeSentence": "Sé cuidadoso con esos vasos.", "acceptedTranslations": ["Be careful with those glasses.", "Be careful with those cups."] },
        { "nativeSentence": "Es una persona muy cuidadosa.", "acceptedTranslations": ["She's a very careful person.", "She is a very careful person."] },
        { "nativeSentence": "Querida", "acceptedTranslations": ["Darling"] },
        { "nativeSentence": "Buenos días, querida.", "acceptedTranslations": ["Good morning, darling.", "Good morning, my darling."] },
        { "nativeSentence": "Gracias, querido, por tu ayuda.", "acceptedTranslations": ["Thank you, darling, for your help.", "Thanks, darling, for your help."] },
        { "nativeSentence": "Refugio", "acceptedTranslations": ["Haven"] },
        { "nativeSentence": "Esta playa es un refugio tranquilo.", "acceptedTranslations": ["This beach is a peaceful haven.", "This beach is a quiet haven."] },
        { "nativeSentence": "Su casa es un refugio para ella.", "acceptedTranslations": ["Her house is a haven for her.", "Her home is a haven for her."] },
        { "nativeSentence": "Casualidad", "acceptedTranslations": ["Happenstance"] },
        { "nativeSentence": "Nos conocimos por pura casualidad.", "acceptedTranslations": ["We met by pure happenstance.", "We met purely by happenstance."] },
        { "nativeSentence": "Fue casualidad que estuviéramos ahí.", "acceptedTranslations": ["It was happenstance that we were there.", "It was pure happenstance that we were there."] },
        { "nativeSentence": "Dicha", "acceptedTranslations": ["Bliss"] },
        { "nativeSentence": "Fue un momento de pura dicha.", "acceptedTranslations": ["It was a moment of pure bliss.", "It was a moment of complete bliss."] },
        { "nativeSentence": "Vivir aquí es una dicha.", "acceptedTranslations": ["Living here is bliss.", "Living here is pure bliss."] },
        { "nativeSentence": "Apostar", "acceptedTranslations": ["Bet"] },
        { "nativeSentence": "Te apuesto que gana el equipo local.", "acceptedTranslations": ["I bet the home team wins.", "I bet you the home team will win."] },
        { "nativeSentence": "Apostamos diez dólares.", "acceptedTranslations": ["We bet ten dollars.", "We bet ten bucks."] },
        { "nativeSentence": "Factura", "acceptedTranslations": ["Bill"] },
        { "nativeSentence": "Tengo que pagar la factura del agua.", "acceptedTranslations": ["I have to pay the water bill.", "I need to pay the water bill."] },
        { "nativeSentence": "La factura llegó más alta este mes.", "acceptedTranslations": ["The bill was higher this month.", "The bill came in higher this month."] },
        { "nativeSentence": "Prestado", "acceptedTranslations": ["Borrowed"] },
        { "nativeSentence": "Este libro es prestado.", "acceptedTranslations": ["This book is borrowed.", "This is a borrowed book."] },
        { "nativeSentence": "Le pedí prestado el carro a mi hermano.", "acceptedTranslations": ["I borrowed my brother's car.", "I borrowed the car from my brother."] },
        { "nativeSentence": "Incendio", "acceptedTranslations": ["Fire", "Burning"] },
        { "nativeSentence": "Vimos el incendio desde lejos.", "acceptedTranslations": ["We saw the fire from far away.", "We saw the fire from a distance."] },
        { "nativeSentence": "Olía a algo quemándose.", "acceptedTranslations": ["It smelled like something burning.", "It smelled of something burning."] },
        { "nativeSentence": "Cojín", "acceptedTranslations": ["Cushion"] },
        { "nativeSentence": "Este cojín es muy cómodo.", "acceptedTranslations": ["This cushion is very comfortable.", "This cushion is really comfortable."] },
        { "nativeSentence": "Ella puso un cojín en la silla.", "acceptedTranslations": ["She put a cushion on the chair.", "She placed a cushion on the chair."] },
        { "nativeSentence": "Tenemos que", "acceptedTranslations": ["We gotta", "We've got to"] },
        { "nativeSentence": "Tenemos que irnos ya.", "acceptedTranslations": ["We gotta go now.", "We've got to go now."] },
        { "nativeSentence": "Tengo que terminar esto hoy.", "acceptedTranslations": ["I gotta finish this today.", "I've got to finish this today."] },
        { "nativeSentence": "Paquete", "acceptedTranslations": ["Parcel"] },
        { "nativeSentence": "Llegó un paquete para ti.", "acceptedTranslations": ["A parcel arrived for you.", "A package arrived for you."] },
        { "nativeSentence": "Envié el paquete ayer.", "acceptedTranslations": ["I sent the parcel yesterday.", "I sent the package yesterday."] },
        { "nativeSentence": "Envolver", "acceptedTranslations": ["Wrap", "To wrap"] },
        { "nativeSentence": "Voy a envolver el regalo.", "acceptedTranslations": ["I'm going to wrap the gift.", "I am going to wrap the present."] },
        { "nativeSentence": "Ella envolvió el paquete con cuidado.", "acceptedTranslations": ["She wrapped the parcel carefully.", "She carefully wrapped the parcel."] }
      ]
    }
  },
  "lista-20": {
    "updatedAt": "2026-08-26T00:00:00.000Z",
    "def": {
      "name": "Palabras por aprender - Grupo 14",
      "nativeLanguage": "español",
      "targetLanguage": "inglés",
      "phrases": [
        { "nativeSentence": "Ser", "acceptedTranslations": ["Being"] },
        { "nativeSentence": "Ser honesto es importante.", "acceptedTranslations": ["Being honest is important.", "Being honest matters."] },
        { "nativeSentence": "Estoy cansado de estar solo.", "acceptedTranslations": ["I'm tired of being alone.", "I am tired of being alone."] },
        { "nativeSentence": "Lucha", "acceptedTranslations": ["Fight"] },
        { "nativeSentence": "Fue una lucha difícil.", "acceptedTranslations": ["It was a tough fight.", "It was a difficult fight."] },
        { "nativeSentence": "Tuvieron una pelea anoche.", "acceptedTranslations": ["They had a fight last night.", "They got into a fight last night."] },
        { "nativeSentence": "Docena", "acceptedTranslations": ["Dozen"] },
        { "nativeSentence": "Compré una docena de huevos.", "acceptedTranslations": ["I bought a dozen eggs.", "I bought a dozen eggs at the store."] },
        { "nativeSentence": "Invitamos a media docena de amigos.", "acceptedTranslations": ["We invited half a dozen friends.", "We invited about half a dozen friends."] },
        { "nativeSentence": "Te quedas", "acceptedTranslations": ["You are left", "You're left"] },
        { "nativeSentence": "Al final, te quedas con las manos vacías.", "acceptedTranslations": ["In the end, you're left with nothing.", "In the end, you are left empty-handed."] },
        { "nativeSentence": "Después del gasto, te quedas con poco dinero.", "acceptedTranslations": ["After the expense, you're left with little money.", "After the expense, you are left with little money."] },
        { "nativeSentence": "Te refieres", "acceptedTranslations": ["You mean"] },
        { "nativeSentence": "¿Te refieres a mañana o a hoy?", "acceptedTranslations": ["Do you mean tomorrow or today?", "You mean tomorrow or today?"] },
        { "nativeSentence": "¿Te refieres a este documento?", "acceptedTranslations": ["Do you mean this document?", "You mean this document?"] },
        { "nativeSentence": "Cascos", "acceptedTranslations": ["Helmets"] },
        { "nativeSentence": "Debemos usar cascos en la obra.", "acceptedTranslations": ["We must wear helmets at the construction site.", "We have to wear helmets on the construction site."] },
        { "nativeSentence": "Los ciclistas necesitan cascos.", "acceptedTranslations": ["Cyclists need helmets.", "Cyclists need to wear helmets."] },
        { "nativeSentence": "Marchitar", "acceptedTranslations": ["Wilt", "To wilt"] },
        { "nativeSentence": "Las flores se marchitaron rápido.", "acceptedTranslations": ["The flowers wilted quickly.", "The flowers wilted fast."] },
        { "nativeSentence": "Sin agua, la planta se marchitará.", "acceptedTranslations": ["Without water, the plant will wilt.", "The plant will wilt without water."] },
        { "nativeSentence": "Vivienda", "acceptedTranslations": ["Tenement"] },
        { "nativeSentence": "Vivían en una vivienda pequeña en la ciudad.", "acceptedTranslations": ["They lived in a small tenement in the city.", "They lived in a small tenement building in the city."] },
        { "nativeSentence": "El edificio era una vivienda antigua.", "acceptedTranslations": ["The building was an old tenement.", "The building was an old tenement house."] },
        { "nativeSentence": "Envejecido", "acceptedTranslations": ["Grown old"] },
        { "nativeSentence": "Mis abuelos han envejecido mucho.", "acceptedTranslations": ["My grandparents have grown old.", "My grandparents have grown really old."] },
        { "nativeSentence": "La ciudad ha envejecido con el tiempo.", "acceptedTranslations": ["The city has grown old over time.", "The city has grown old with time."] },
        { "nativeSentence": "Llueve", "acceptedTranslations": ["It rains", "Rains"] },
        { "nativeSentence": "Aquí llueve mucho en abril.", "acceptedTranslations": ["It rains a lot here in April.", "It rains here a lot in April."] },
        { "nativeSentence": "Cuando llueve, me quedo en casa.", "acceptedTranslations": ["When it rains, I stay home.", "When it rains, I stay at home."] }
      ]
    }
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

globalThis.__handler = {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const defaultListsParam = url.searchParams.get("defaultLists");

    if (defaultListsParam) {
      if (defaultListsParam === "manifest") {
        const base = `${url.origin}${url.pathname}`;
        return jsonResponse({
          version: DEFAULT_LISTS_VERSION,
          lists: Object.entries(DEFAULT_LISTS).map(([id, entry]) => ({
            id,
            url: `${base}?defaultLists=${id}`,
            updatedAt: entry.updatedAt,
          })),
        });
      }

      const entry = DEFAULT_LISTS[defaultListsParam];
      if (!entry) {
        return jsonResponse({ error: `unknown list "${defaultListsParam}"` }, 404);
      }
      return jsonResponse(entry.def);
    }

    // No "defaultLists" param: ads registry — same response shape as before
    // this worker also served default lists.
    return jsonResponse(ADS_REGISTRY);
  },
};
