import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ContentContainer } from "@/components/content-container";
import { Kbd } from "@/components/kbd";
import { ProgressBar } from "@/components/progress-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { AnswerInput } from "@/components/practice/answer-input";
import { PracticeFeedback } from "@/components/practice/practice-feedback";
import { Brand, Layout, Radius, Spacing } from "@/constants/theme";
import {
  FEEDBACK_CORRECT,
  FEEDBACK_INCORRECT,
  buildIntro,
  fixedPromptsFor,
  languageName,
} from "@/constants/speech-prompts";
import { usePhraseLists } from "@/hooks/use-phrase-lists";
import { usePracticeSession } from "@/hooks/use-practice-session";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useUserLevel } from "@/hooks/use-user-level";
import { useServices } from "@/services";
import type { Phrase, PhraseList, PhraseResult, SessionAd } from "@/types";
import { playBeep } from "@/utils";

const TIMER_CORRECT_SECONDS = 3;
const TIMER_INCORRECT_SECONDS = 15;

/** Max phrases warmed ahead of the current one, per language, at any time */
const WINDOW_SIZE = 5;

/**
 * Reorder phrases to match an explicit id sequence (from the list-detail
 * screen's shuffle, so the exact phrase warmed there ends up first here).
 * Ids no longer present are dropped; phrases not in the sequence (e.g. added
 * after the order was computed) are appended at the end, order preserved.
 */
function reorderByIds(phrases: Phrase[], orderParam?: string): Phrase[] {
  if (!orderParam) return phrases;

  const byId = new Map(phrases.map((p) => [p.id, p]));
  const ordered = orderParam
    .split(",")
    .map((id) => byId.get(id))
    .filter((p): p is Phrase => Boolean(p));

  const orderedIds = new Set(ordered.map((p) => p.id));
  const remaining = phrases.filter((p) => !orderedIds.has(p.id));
  return [...ordered, ...remaining];
}

/** WhatsApp contact for advertisers, opened from the CTA under the ad badge */
const ADVERTISE_WHATSAPP_URL =
  "https://wa.me/573016556270?text=" +
  encodeURIComponent("Hola, quiero publicitar mi marca en Narra");

/**
 * Insert a sponsored phrase into the session queue. The ad plays like any
 * other phrase but is excluded from scoring and persisted stats. Position is
 * the ad's fixed `order` (1-based, clamped); absent, it plays second — late
 * enough to not open the session, early enough to always be seen.
 */
function insertSessionAd(phrases: Phrase[], ad: SessionAd): Phrase[] {
  const adPhrase: Phrase = {
    id: `ad-${ad.phrase.id}`,
    nativeSentence: ad.phrase.text,
    acceptedTranslations: ad.phrase.acceptedTranslations,
    sponsoredBy: ad.advertiser,
  };
  const index =
    ad.phrase.order !== undefined
      ? Math.min(Math.max(ad.phrase.order - 1, 0), phrases.length)
      : Math.min(1, phrases.length);
  const result = [...phrases];
  result.splice(index, 0, adPhrase);
  return result;
}

/**
 * Voice mode phases:
 * - "answer": listening for the user's translation
 * - "pre-command": listening for "verify" or "repeat"
 *     verify → submit answer
 *     repeat → clear answer, re-read native phrase, go back to "answer"
 * - "post-command": listening for "next", "repeat", "stop"
 *     next → advance
 *     repeat → re-read correct answer in target language
 *     stop → cancel timer
 * - null: not in a voice phase
 */
type VoicePhase = "answer" | "pre-command" | "post-command" | null;

export default function PracticeScreen() {
  const { id, voiceMode: voiceModeParam, order: orderParam } = useLocalSearchParams<{
    id: string;
    voiceMode?: string;
    /** Comma-separated phrase ids, fixing the exact play order (set by the list screen's random toggle) */
    order?: string;
  }>();
  const voiceMode = voiceModeParam === "1";

  const { lists, addUserTranslation, recordPhraseResult } = usePhraseLists();
  const { speech, ads } = useServices();
  const { level: userLevel } = useUserLevel();
  const { colors } = useAppTheme();
  const router = useRouter();
  const { speak, speakFixed, speaking, stop: stopSpeaking } = useSpeech();
  const {
    listening,
    transcript,
    available: micAvailable,
    listen,
    stop: stopListening,
    clear: clearTranscript,
  } = useSpeechRecognition();
  const {
    status,
    currentPhrase,
    progress,
    score,
    start,
    submitAnswer,
    overrideAsCorrect,
    next,
  } = usePracticeSession();

  const [answer, setAnswer] = useState("");
  const [lastResult, setLastResult] = useState<PhraseResult | null>(null);
  const [list, setList] = useState<PhraseList | null>(null);
  const [started, setStarted] = useState(false);
  // Mirrors exactly what was passed to start(), so the lookahead window can
  // look up phrases by session position instead of list order
  const [sessionPhrases, setSessionPhrases] = useState<Phrase[]>([]);

  // Timer state
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voice mode state
  const [voicePhase, setVoicePhase] = useState<VoicePhase>(null);
  const voicePhaseRef = useRef<VoicePhase>(null);
  const answerRef = useRef("");

  // The intro is spoken only before the first phrase of the session
  const introSpokenRef = useRef(false);

  // Bumped when the user advances or leaves; speech chains capture the value
  // at their start and bail if it changed, so stopping the current utterance
  // also cancels the queued ones instead of letting them overlap the next
  // phrase's audio
  const speechEpochRef = useRef(0);

  // Voice phases must never (re)activate the microphone once the screen lost
  // focus — every activation path checks this first
  const isFocusedRef = useRef(true);

  function cancelSpeech() {
    speechEpochRef.current++;
    stopSpeaking();
  }

  // Keep refs in sync
  useEffect(() => {
    voicePhaseRef.current = voicePhase;
  }, [voicePhase]);
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // Find the list and start session
  useEffect(() => {
    const found = lists.find((l) => l.id === id) ?? null;
    setList(found);
    if (found && found.phrases.length > 0 && status === "idle" && !started) {
      setStarted(true);
      (async () => {
        // `order` comes from the list screen's random toggle; absent, phrases
        // play in their normal list order
        const ordered = reorderByIds(found.phrases, orderParam);

        // One sponsored phrase per session; the service resolves fast (cache
        // + fetch timeout) and to null on any failure, so it can't stall this
        const ad = await ads
          .getSessionAd({
            level: userLevel,
            nativeLanguage: found.nativeLanguage,
            targetLanguage: found.targetLanguage,
          })
          .catch(() => null);
        const sessionList = ad ? insertSessionAd(ordered, ad) : ordered;

        setSessionPhrases(sessionList);
        start(found.id, sessionList);

        // Whatever the detail screen (or a previous list) was still warming is
        // stale now — drop it so this session's audio doesn't queue behind it
        speech.cancelWarmups?.();

        // Fixed app messages: pinned (fixed speed, never purged). Idempotent —
        // cheap to call again if already warm from the lobby.
        speech.pregeneratePinned?.(fixedPromptsFor(found.targetLanguage), found.nativeLanguage);

        // Only warm the initial lookahead window, not the whole list — the
        // sliding-window effect below keeps it topped up as the user advances
        if (speech.pregenerate) {
          const lookahead = sessionList.slice(0, WINDOW_SIZE);
          speech.pregenerate(lookahead.map((p) => p.acceptedTranslations[0]), found.targetLanguage);
          speech.pregenerate(lookahead.map((p) => p.nativeSentence), found.nativeLanguage);
        }
      })();
    }
  }, [lists, id, status, start, started]);

  // Sliding lookahead window: keeps at most WINDOW_SIZE phrases warmed ahead
  // of the current one, per language. Advancing evicts the phrase that fell
  // behind (unless it's pinned/persisted) and warms the one that just entered
  // the tail of the window.
  useEffect(() => {
    if (!list || sessionPhrases.length === 0 || status !== "active") return;

    const currentIndex = progress.current - 1;
    // The initial window (indices 0..WINDOW_SIZE-1) is already warmed at session start
    if (currentIndex <= 0) return;

    const evictPhrase = sessionPhrases[currentIndex - 1];
    if (evictPhrase && speech.forget) {
      speech.forget([evictPhrase.acceptedTranslations[0]], list.targetLanguage);
      speech.forget([evictPhrase.nativeSentence], list.nativeLanguage);
    }

    const enterPhrase = sessionPhrases[currentIndex + WINDOW_SIZE - 1];
    if (enterPhrase && speech.pregenerate) {
      speech.pregenerate([enterPhrase.acceptedTranslations[0]], list.targetLanguage);
      speech.pregenerate([enterPhrase.nativeSentence], list.nativeLanguage);
    }
  }, [progress.current]);

  // Auto-speak the native sentence when phrase changes, then activate voice mode.
  // On the very first phrase, an intro is read before it.
  useEffect(() => {
    if (currentPhrase && list && status === "active" && !lastResult) {
      // Stop listening before TTS speaks to avoid capturing the app's own voice
      if (listening) {
        stopListening();
      }
      setVoicePhase(null);

      const withIntro = !introSpokenRef.current;
      introSpokenRef.current = true;

      const epoch = speechEpochRef.current;
      (async () => {
        if (withIntro) {
          await speakFixed(buildIntro(list.targetLanguage), list.nativeLanguage);
        }
        if (speechEpochRef.current !== epoch) return;
        await speak(currentPhrase.nativeSentence, list.nativeLanguage);
      })().then(() => {
        if (speechEpochRef.current !== epoch) return;
        if (voiceMode) {
          startVoicePhase("answer");
        }
      });
    }
  }, [currentPhrase?.id, status]);

  // Process transcript based on current voice phase
  useEffect(() => {
    if (!transcript) return;

    const phase = voicePhaseRef.current;
    const normalized = transcript.toLowerCase().trim();

    if (phase === "answer") {
      // Just capture into the answer field
      setAnswer(transcript);
    } else if (phase === "pre-command") {
      if (normalized.includes("verify") || normalized.includes("verificar")) {
        clearTranscript();
        setVoicePhase(null);
        // Use ref for the latest answer value
        if (answerRef.current.trim()) {
          doSubmit(answerRef.current.trim());
        }
      } else if (normalized.includes("repeat") || normalized.includes("repetir")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        // Clear answer, re-read phrase, go back to answer phase
        setAnswer("");
        if (currentPhrase && list) {
          playBeep(600, 100);
          speak(currentPhrase.nativeSentence, list.nativeLanguage).then(() => {
            startVoicePhase("answer");
          });
        }
      }
    } else if (phase === "post-command") {
      if (normalized.includes("next") || normalized.includes("siguiente")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        handleNext();
      } else if (normalized.includes("repeat") || normalized.includes("repetir")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        if (currentPhrase && list) {
          speak(currentPhrase.acceptedTranslations[0], list.targetLanguage).then(() => {
            startVoicePhase("post-command");
          });
        }
      } else if (normalized.includes("stop") || normalized.includes("parar")) {
        clearTranscript();
        setVoicePhase(null);
        if (listening) stopListening();
        handleCancelTimer();
        setTimeout(() => startVoicePhase("post-command"), 300);
      }
    } else if (!phase && !voiceMode) {
      // Manual mic usage (non-voice mode)
      setAnswer(transcript);
    }
  }, [transcript]);

  // When listening stops in voice mode, handle re-activation based on phase
  useEffect(() => {
    if (!voiceMode || listening) return;

    const phase = voicePhaseRef.current;
    if (!phase) return;

    if (phase === "answer") {
      // User finished speaking their answer
      const timeout = setTimeout(() => {
        if (answerRef.current.trim()) {
          startVoicePhase("pre-command");
        } else {
          // Nothing captured, try listening again
          startVoicePhase("answer");
        }
      }, 700);
      return () => clearTimeout(timeout);
    }

    if (phase === "pre-command" || phase === "post-command") {
      // Command phase lost listening (timeout/silence) — re-activate
      const timeout = setTimeout(() => {
        // Only re-activate if still in the same command phase
        if (voicePhaseRef.current === phase) {
          clearTranscript();
          listen("en");
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [listening]);

  function startVoicePhase(phase: VoicePhase) {
    // Never reopen the mic on a screen the user already left
    if (!isFocusedRef.current) return;
    if (!list || speaking) {
      // If still speaking, retry after a short delay
      if (speaking) {
        setTimeout(() => startVoicePhase(phase), 300);
      }
      return;
    }
    // Ensure mic is off before starting a new phase
    if (listening) {
      stopListening();
    }
    playBeep(phase === "answer" ? 800 : phase === "pre-command" ? 1000 : 600, 120);
    setVoicePhase(phase);
    clearTranscript();

    // Listen in target language for answers, English for commands
    const listenLang = phase === "answer" ? list.targetLanguage : "en";
    // Delay to avoid catching leftover audio or TTS echo; the guard covers a
    // blur happening inside that delay
    setTimeout(() => {
      if (isFocusedRef.current) listen(listenLang);
    }, 400);
  }

  // Navigate to results when completed
  useEffect(() => {
    if (status === "completed") {
      // score excludes sponsored phrases, so the total must too
      router.replace(
        `/list/${id}/results?correct=${score.correct}&incorrect=${score.incorrect}&total=${score.correct + score.incorrect}&percentage=${score.percentage}`
      );
    }
  }, [status]);

  // Timer logic
  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (countdown === 0 && lastResult) {
      stopTimer();
      handleNext();
    }
  }, [countdown]);

  // Blur, not unmount: the sidebar navigates with push(), which keeps this
  // screen mounted underneath the new one — an unmount cleanup would never
  // fire. Losing focus by any route (✕, sidebar, back) must silence the TTS,
  // kill queued speech chains, and release the microphone.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
        stopTimer();
        speechEpochRef.current++;
        speech.stop();
        stopListening();
        setVoicePhase(null);
        clearTranscript();
      };
    }, [speech, stopListening, clearTranscript])
  );

  // Enter advances to the next phrase, matching the hint shown next to the button.
  // The answer field handles Enter itself via onSubmitEditing, so this only runs
  // while feedback is on screen.
  useEffect(() => {
    if (Platform.OS !== "web" || !lastResult) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastResult]);

  function handleCancelTimer() {
    stopTimer();
    setCountdown(-1);
  }

  function doSubmit(answerText: string) {
    if (!currentPhrase || !list) return;
    // The phrase may still be being read (user answered early): cut it and
    // invalidate its chain so it can't overlap the feedback audio below
    cancelSpeech();
    // Stop listening before TTS feedback
    if (listening) {
      stopListening();
    }
    const result = submitAnswer(answerText);
    setLastResult(result);
    setAnswer("");
    clearTranscript();
    setVoicePhase(null);
    // Sponsored phrases don't belong to the list — nothing to persist
    if (!currentPhrase.sponsoredBy) {
      recordPhraseResult(list.id, currentPhrase.id, result.isCorrect);
    }

    const prefix = result.isCorrect ? FEEDBACK_CORRECT : FEEDBACK_INCORRECT;
    const correctAnswer = currentPhrase.acceptedTranslations[0];

    const epoch = speechEpochRef.current;
    speakFixed(prefix, list.nativeLanguage).then(() => {
      if (speechEpochRef.current !== epoch) return;
      speak(correctAnswer, list.targetLanguage).then(() => {
        if (speechEpochRef.current !== epoch) return;
        startTimer(result.isCorrect ? TIMER_CORRECT_SECONDS : TIMER_INCORRECT_SECONDS);
        if (voiceMode) {
          startVoicePhase("post-command");
        }
      });
    });
  }

  function handleSubmit() {
    if (!answer.trim()) return;
    doSubmit(answer.trim());
  }

  function handleNext() {
    // Cut any feedback still being read so it can't overlap the next phrase
    cancelSpeech();
    stopTimer();
    setCountdown(null);
    setLastResult(null);
    setVoicePhase(null);
    clearTranscript();
    setAnswer("");
    next();
  }

  async function handleAddAsCorrect() {
    if (!lastResult || !currentPhrase || !list) return;
    if (!currentPhrase.sponsoredBy) {
      await addUserTranslation(list.id, currentPhrase.id, lastResult.userAnswer);
      await recordPhraseResult(list.id, currentPhrase.id, true);
    }
    overrideAsCorrect(currentPhrase.id);
    setLastResult({ ...lastResult, isCorrect: true, overridden: true });
    startTimer(TIMER_CORRECT_SECONDS);
  }

  function handleReplay() {
    if (currentPhrase && list) {
      speak(currentPhrase.nativeSentence, list.nativeLanguage);
    }
  }

  function handleMicPress() {
    if (listening) {
      stopListening();
    } else if (list) {
      listen(list.targetLanguage);
    }
  }

  /** Leaves the session. Results already recorded are kept. */
  function handleExit() {
    cancelSpeech();
    stopTimer();
    if (listening) stopListening();
    router.replace(`/list/${id}`);
  }

  if (!list || status === "idle") {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText themeColor="textSecondary">Cargando...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const percent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Progress: position, percentage, and a way out */}
        <View style={[styles.topBar, { borderBottomColor: colors.borderSubtle }]}>
          <ProgressBar percent={percent} color={Brand.accent} height={5} style={styles.bar} />
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {progress.current} / {progress.total} · {Math.round(percent)}%
          </Text>
          <Pressable
            onPress={handleExit}
            accessibilityLabel="Salir de la práctica"
            style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
          >
            <Text style={[styles.exitIcon, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        </View>

        {voiceMode && (
          <View style={styles.voiceIndicator}>
            <Text style={styles.voiceIndicatorText}>
              🎙️ Modo voz
              {voicePhase === "answer" && " · Escuchando respuesta..."}
              {voicePhase === "pre-command" && ' · Di: "verify" o "repeat"'}
              {voicePhase === "post-command" && ' · Di: "next", "repeat" o "stop"'}
            </Text>
          </View>
        )}

        {/* The phrase gets the vertical space; everything else hugs the edges */}
        <ContentContainer maxWidth={Layout.readingMaxWidth} style={styles.stage}>
          <View style={styles.phraseArea}>
            {currentPhrase?.sponsoredBy && (
              <View style={styles.sponsoredArea}>
                <View style={styles.sponsoredBadge}>
                  <Text style={styles.sponsoredText}>
                    📢 PUBLICIDAD PÚBLICA PAGADA
                  </Text>
                  <Text style={styles.sponsoredAdvertiser}>
                    {currentPhrase.sponsoredBy}
                  </Text>
                </View>
                <Pressable
                  onPress={() => Linking.openURL(ADVERTISE_WHATSAPP_URL)}
                  accessibilityLabel="Contactar por WhatsApp para publicitar"
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={[styles.advertiseCta, { color: colors.textMuted }]}>
                    ¿Quieres anunciarte aquí? 💬 Escríbenos por WhatsApp
                  </Text>
                </Pressable>
              </View>
            )}
            <Text style={[styles.prompt, { color: colors.textMuted }]}>
              Traduce al {languageName(list.targetLanguage).toUpperCase()}:
            </Text>
            <ThemedText style={styles.phrase}>{currentPhrase?.nativeSentence}</ThemedText>

            {/* Learning mode: the expected answer stays visible while typing.
                Hidden once feedback is up — it already shows the answer. */}
            {list.showTranslation && currentPhrase && !lastResult && (
              <Text style={[styles.revealedTranslation, { color: colors.textSecondary }]}>
                💡 {currentPhrase.acceptedTranslations[0]}
              </Text>
            )}

            <Pressable
              onPress={handleReplay}
              disabled={speaking}
              style={({ pressed }) => [
                styles.listen,
                { backgroundColor: colors.surfaceMuted },
                pressed && styles.pressed,
                speaking && styles.disabled,
              ]}
            >
              <Text style={[styles.listenText, { color: Brand.accent }]}>
                {speaking ? "🔊 ..." : "🔊 Escuchar"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            {lastResult && currentPhrase ? (
              <>
                <PracticeFeedback
                  result={lastResult}
                  phrase={currentPhrase}
                  countdown={countdown}
                  onCancelTimer={handleCancelTimer}
                  onAddAsCorrect={handleAddAsCorrect}
                  onReplayAnswer={() => {
                    if (currentPhrase && list) {
                      speak(currentPhrase.acceptedTranslations[0], list.targetLanguage);
                    }
                  }}
                />
                <View style={styles.nextRow}>
                  <Pressable
                    onPress={handleNext}
                    style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.nextButtonText}>Siguiente →</Text>
                  </Pressable>
                  <Kbd>Enter</Kbd>
                </View>
              </>
            ) : (
              <AnswerInput
                value={answer}
                onChangeText={setAnswer}
                onSubmit={handleSubmit}
                micAvailable={micAvailable}
                listening={listening}
                onMicPress={handleMicPress}
              />
            )}
          </View>
        </ContentContainer>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  bar: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 11,
  },
  exit: {
    padding: Spacing.one,
  },
  exitIcon: {
    fontSize: 16,
    lineHeight: 18,
  },
  voiceIndicator: {
    alignSelf: "center",
    marginTop: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
  },
  voiceIndicatorText: {
    color: Brand.accentSoft,
    fontSize: 11,
    fontWeight: "600",
  },
  stage: {
    paddingHorizontal: Spacing.four,
  },
  phraseArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.two,
  },
  prompt: {
    fontSize: 11,
  },
  sponsoredArea: {
    alignItems: "center",
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  sponsoredBadge: {
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    backgroundColor: Brand.accent,
  },
  sponsoredText: {
    color: Brand.onPrimary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sponsoredAdvertiser: {
    color: Brand.onPrimary,
    fontSize: 10,
    opacity: 0.85,
  },
  advertiseCta: {
    fontSize: 11,
    textDecorationLine: "underline",
  },
  phrase: {
    // Readable rather than oversized: long sentences still fit without shrinking
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
  },
  revealedTranslation: {
    fontSize: 16,
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },
  listen: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
  },
  listenText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  nextButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    alignItems: "center",
    backgroundColor: Brand.accent,
  },
  nextButtonText: {
    color: Brand.onPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
