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

export default {
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
