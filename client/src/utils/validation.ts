/**
 * Characters treated as word separators: they become a space so that
 * "well-known" and "well known" compare as equal.
 */
const SEPARATORS = /[-–—/\\_]+/g;

/**
 * Punctuation that is dropped entirely, anywhere in the string.
 * Includes apostrophe variants, so "don't" and "dont" compare as equal —
 * speech recognition is inconsistent about them.
 */
const PUNCTUATION = /[.,!?;:¿¡"'`´‘’“”«»()[\]{}…]/g;

/**
 * Normalizes a string for comparison: lowercases, drops punctuation anywhere
 * in the text, treats hyphens and slashes as spaces, and collapses whitespace.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(SEPARATORS, " ")
    .replace(PUNCTUATION, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates a user answer against a set of accepted translations.
 * Comparison is case-insensitive and ignores punctuation and spacing
 * differences, so only the wording itself has to match.
 */
export function validateAnswer(
  userAnswer: string,
  acceptedTranslations: string[]
): boolean {
  const normalizedAnswer = normalize(userAnswer);
  if (!normalizedAnswer) return false;

  return acceptedTranslations.some(
    (translation) => normalize(translation) === normalizedAnswer
  );
}

// ===== Spoken-answer homologation =====
//
// Speech recognition mishears: a user with imperfect pronunciation gets
// "recieve" for "receive", "confortable" for "comfortable", and Spanish
// proper nouns come out mangled ("José" → "hose"). Typed answers keep the
// exact comparison above; transcripts are HOMOLOGATED first — visibly, in
// the answer field, before the user verifies:
//
// 1. Transcript words that match the expected translation exactly act as
//    anchors (the "correct words").
// 2. Each mismatched stretch between anchors is compared span-vs-span with
//    normalized edit-distance similarity. Close enough → the span is
//    replaced by the expected words; too different → the user's words stay.
// 3. Words declared in `properNouns` always pass, no matter what the
//    recognizer produced in their place.
//
// The homologated text then goes through the normal exact validation, so
// the user always sees exactly what was (and wasn't) accepted.

/** Minimum similarity (1 - editDistance/maxLen) for a mismatched span to pass */
const SPOKEN_SIMILARITY_THRESHOLD = 0.8;

/** "María" and "Maria" must compare as equal — transcripts rarely carry accents */
function stripDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface Tokens {
  /** Words as written, for display (casing, accents, punctuation kept) */
  original: string[];
  /** Parallel normalized accent-insensitive forms, for comparison */
  comparable: string[];
}

/** Tokenize keeping display and comparable forms parallel (1:1 by index). */
function tokenize(text: string): Tokens {
  const original: string[] = [];
  const comparable: string[] = [];
  for (const raw of text.replace(SEPARATORS, " ").split(/\s+/)) {
    const norm = stripDiacritics(normalize(raw));
    if (!norm) continue; // pure punctuation
    original.push(raw);
    comparable.push(norm);
  }
  return { original, comparable };
}

/** Damerau-Levenshtein: swapped adjacent letters ("recieve") cost 1, not 2 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let prevPrev: number[] | null = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (prevPrev && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prevPrev[j - 2] + 1);
      }
    }
    prevPrev = prev;
    prev = curr;
  }
  return prev[b.length];
}

/** 1 = identical, 0 = nothing in common */
function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - editDistance(a, b) / max;
}

/** One aligned region: an exact-match anchor, or the mismatched span between anchors */
interface Segment {
  matched: boolean;
  /** [start, end) into the expected token list */
  expectedStart: number;
  expectedEnd: number;
  /** [start, end) into the actual token list */
  actualStart: number;
  actualEnd: number;
}

/**
 * Groups of English words that sound identical or near-identical when
 * spoken. Edit-distance similarity (below) misses these on purpose — it
 * compares spelling, and short homophones like "I"/"eye"/"aye" share almost
 * no letters despite sounding the same. Keyed by the EXPECTED word, so a
 * substitution only ever applies when the correct translation actually
 * contains that word — never as a blanket "these sound alike" rule.
 */
const HOMOPHONE_GROUPS: string[][] = [
  ["i", "aye", "eye"],
  ["you", "ewe", "u"],
  ["to", "too", "two"],
  ["for", "four", "fore"],
  ["be", "bee"],
  ["see", "sea", "si"],
  ["no", "know"],
  ["write", "right", "rite"],
  ["there", "their", "theyre"],
  ["hear", "here"],
  ["buy", "by", "bye"],
  ["one", "won"],
  ["some", "sum"],
  ["flower", "flour"],
  ["new", "knew"],
  ["ate", "eight"],
  ["night", "knight"],
  ["weak", "week"],
  ["meat", "meet"],
  ["son", "sun"],
  ["great", "grate"],
  ["plain", "plane"],
  ["rose", "rows"],
  ["pair", "pear", "pare"],
  ["steal", "steel"],
  ["peace", "piece"],
  ["blue", "blew"],
  ["would", "wood"],
  ["our", "hour"],
  ["allowed", "aloud"],
  ["board", "bored"],
  ["break", "brake"],
  ["cell", "sell"],
  ["cent", "scent", "sent"],
  ["die", "dye"],
  ["fair", "fare"],
  ["flee", "flea"],
  ["flew", "flu", "flue"],
  ["hair", "hare"],
  ["heal", "heel"],
  ["him", "hymn"],
  ["hole", "whole"],
  ["made", "maid"],
  ["mail", "male"],
  ["pause", "paws"],
  ["peak", "peek", "pique"],
  ["rain", "reign", "rein"],
  ["road", "rode", "rowed"],
  ["role", "roll"],
  ["sail", "sale"],
  ["scene", "seen"],
  ["soar", "sore"],
  ["stair", "stare"],
  ["suite", "sweet"],
  ["tail", "tale"],
  ["vain", "vein", "vane"],
  ["waist", "waste"],
  ["wait", "weight"],
  ["ware", "wear", "where"],
  ["way", "weigh"],
  ["weather", "whether"],
  ["which", "witch"],
];

/** expected word -> its homophones, built once from HOMOPHONE_GROUPS */
const HOMOPHONES: Map<string, Set<string>> = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of HOMOPHONE_GROUPS) {
    for (const word of group) {
      const others = map.get(word) ?? new Set<string>();
      for (const candidate of group) {
        if (candidate !== word) others.add(candidate);
      }
      map.set(word, others);
    }
  }
  return map;
})();

/** True when `actual` is either identical to `expected` or a known homophone of it */
function tokensMatch(expected: string, actual: string): boolean {
  return expected === actual || (HOMOPHONES.get(expected)?.has(actual) ?? false);
}

/**
 * Align two token sequences on their longest common subsequence (the anchor
 * words), returning anchors and the mismatched spans left between them.
 */
function alignTokens(expected: string[], actual: string[]): Segment[] {
  const n = expected.length;
  const m = actual.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        tokensMatch(expected[i], actual[j])
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const segments: Segment[] = [];
  let i = 0;
  let j = 0;
  let spanStartE = 0;
  let spanStartA = 0;
  const flushSpan = () => {
    if (spanStartE < i || spanStartA < j) {
      segments.push({
        matched: false,
        expectedStart: spanStartE,
        expectedEnd: i,
        actualStart: spanStartA,
        actualEnd: j,
      });
    }
  };

  while (i < n && j < m) {
    if (tokensMatch(expected[i], actual[j])) {
      flushSpan();
      segments.push({
        matched: true,
        expectedStart: i,
        expectedEnd: i + 1,
        actualStart: j,
        actualEnd: j + 1,
      });
      i++;
      j++;
      spanStartE = i;
      spanStartA = j;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  i = n;
  j = m;
  flushSpan();

  return segments;
}

/**
 * Decide whether one mismatched span is close enough to what was expected.
 * Proper nouns pass unconditionally: each one discards the actual token most
 * similar to it (the recognizer's rendering of the name), so the mangled name
 * doesn't drag down the comparison of the surrounding words.
 */
function spanPasses(
  expectedSpan: string[],
  actualSpan: string[],
  properNouns: Set<string>
): boolean {
  const expectedRest: string[] = [];
  const actualRest = [...actualSpan];
  let hadProperNoun = false;

  for (const token of expectedSpan) {
    if (!properNouns.has(token)) {
      expectedRest.push(token);
      continue;
    }
    hadProperNoun = true;
    if (actualRest.length > 0) {
      let bestIndex = 0;
      let bestSimilarity = -1;
      actualRest.forEach((candidate, index) => {
        const s = similarity(token, candidate);
        if (s > bestSimilarity) {
          bestSimilarity = s;
          bestIndex = index;
        }
      });
      actualRest.splice(bestIndex, 1);
    }
  }

  if (expectedRest.length === 0) {
    // Only proper nouns were expected here: leftover actual tokens are the
    // recognizer's fragments of them. Without nouns, leftovers are words the
    // user added that nobody asked for.
    return hadProperNoun || actualRest.length === 0;
  }
  if (actualRest.length === 0) return false;

  // Compare joined spans (not word-by-word) so split/merged words still line
  // up: "can not" vs "cannot", "ice cream" vs "icecream"
  const expectedText = expectedRest.join(" ");
  const actualText = actualRest.join(" ");
  const spaced = similarity(expectedText, actualText);
  const collapsed = similarity(
    expectedText.replace(/ /g, ""),
    actualText.replace(/ /g, "")
  );
  return Math.max(spaced, collapsed) >= SPOKEN_SIMILARITY_THRESHOLD;
}

/**
 * Homologate a spoken (transcribed) answer against the accepted translations:
 * spans the recognizer plausibly misheard — and proper nouns always — are
 * replaced by the expected wording; spans too different from anything
 * expected are kept as heard. Called BEFORE validation so the user sees in
 * the answer field exactly what was accepted.
 *
 * Picks the accepted translation that leaves the fewest rejected spans.
 */
export function homologateSpokenAnswer(
  userAnswer: string,
  acceptedTranslations: string[],
  properNouns: string[] = []
): string {
  const actual = tokenize(userAnswer);
  if (actual.comparable.length === 0) return userAnswer;

  // Multi-word names ("New York") bias per word
  const nounTokens = new Set(properNouns.flatMap((n) => tokenize(n).comparable));

  let best: { text: string; rejectedSpans: number } | null = null;

  for (const translation of acceptedTranslations) {
    const expected = tokenize(translation);
    if (expected.comparable.length === 0) continue;

    const parts: string[] = [];
    let rejected = 0;
    for (const segment of alignTokens(expected.comparable, actual.comparable)) {
      const accepted =
        segment.matched ||
        spanPasses(
          expected.comparable.slice(segment.expectedStart, segment.expectedEnd),
          actual.comparable.slice(segment.actualStart, segment.actualEnd),
          nounTokens
        );
      if (accepted) {
        parts.push(...expected.original.slice(segment.expectedStart, segment.expectedEnd));
      } else {
        rejected++;
        parts.push(...actual.original.slice(segment.actualStart, segment.actualEnd));
      }
    }

    if (!best || rejected < best.rejectedSpans) {
      best = { text: parts.join(" "), rejectedSpans: rejected };
    }
    if (rejected === 0) break;
  }

  return best?.text ?? userAnswer;
}

/**
 * Validates a spoken answer: homologation plus the normal exact comparison.
 * Provided for callers that don't need to display the homologated text.
 */
export function validateSpokenAnswer(
  userAnswer: string,
  acceptedTranslations: string[],
  properNouns: string[] = []
): boolean {
  return validateAnswer(
    homologateSpokenAnswer(userAnswer, acceptedTranslations, properNouns),
    acceptedTranslations
  );
}
