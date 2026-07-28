import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AdCampaign,
  AdPhrase,
  AdRegistry,
  AdsService,
  ProficiencyLevel,
  SessionAd,
} from "@/types";
import { PROFICIENCY_LEVELS } from "@/types";

import bundledRegistry from "./bundled-registry.json";

/**
 * Static registry published on Cloudflare Pages (see /ads in the repo).
 * Configured via .env; when absent the app skips the network entirely and
 * relies on the cached/bundled registry.
 */
const REGISTRY_URL = process.env.EXPO_PUBLIC_ADS_REGISTRY_URL;

const CACHE_KEY = "ad_registry_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Never let a slow registry fetch delay the start of a practice session. */
const FETCH_TIMEOUT_MS = 3000;

interface CachedRegistry {
  fetchedAt: string;
  registry: AdRegistry;
}

function levelIndex(level: ProficiencyLevel): number {
  return PROFICIENCY_LEVELS.indexOf(level);
}

/**
 * Lists store whatever the user typed as language ("es", "español",
 * "inglés"...), mirroring the aliases the speech services accept. Campaigns
 * declare bare codes, so both sides normalize to a code before comparing.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  english: "en",
  "inglés": "en",
  ingles: "en",
  spanish: "es",
  "español": "es",
  espanol: "es",
  castellano: "es",
};

function normalizeLanguage(language: string): string {
  const lang = language.toLowerCase().replace(/_/g, "-").trim();
  return LANGUAGE_ALIASES[lang] ?? lang.split("-")[0];
}

/** Drop malformed campaigns/phrases instead of failing the whole registry. */
function sanitizeRegistry(raw: unknown): AdRegistry | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as AdRegistry).campaigns)) {
    return null;
  }
  const input = raw as AdRegistry;

  const campaigns: AdCampaign[] = [];
  for (const campaign of input.campaigns) {
    if (
      !campaign ||
      typeof campaign.id !== "string" ||
      typeof campaign.advertiser !== "string" ||
      typeof campaign.nativeLanguage !== "string" ||
      typeof campaign.targetLanguage !== "string" ||
      !Array.isArray(campaign.phrases)
    ) {
      continue;
    }

    const phrases: AdPhrase[] = campaign.phrases.filter(
      (p): p is AdPhrase =>
        Boolean(p) &&
        typeof p.id === "string" &&
        typeof p.text === "string" &&
        p.text.length > 0 &&
        Array.isArray(p.acceptedTranslations) &&
        p.acceptedTranslations.length > 0 &&
        p.acceptedTranslations.every((t) => typeof t === "string" && t.length > 0) &&
        levelIndex(p.level) >= 0 &&
        (p.order === undefined || (typeof p.order === "number" && p.order >= 1))
    );

    if (phrases.length > 0) {
      campaigns.push({ ...campaign, active: campaign.active === true, phrases });
    }
  }

  return {
    version: typeof input.version === "number" ? input.version : 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
    campaigns,
  };
}

/** Dev-only visibility into why an ad did or didn't show. Silent in prod. */
function debugLog(message: string, ...args: unknown[]) {
  if (__DEV__) console.log(`[ads] ${message}`, ...args);
}

async function fetchRemoteRegistry(): Promise<AdRegistry | null> {
  if (!REGISTRY_URL) {
    debugLog("EXPO_PUBLIC_ADS_REGISTRY_URL not set, skipping network");
    return null;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(REGISTRY_URL, { signal: controller.signal });
    if (!response.ok) {
      debugLog(`registry fetch failed: HTTP ${response.status}`);
      return null;
    }
    const registry = sanitizeRegistry(await response.json());
    debugLog(registry ? "registry fetched from network" : "remote registry is malformed");
    return registry;
  } catch (error) {
    debugLog("registry fetch threw (offline, CORS, or timeout):", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function readCache(): Promise<CachedRegistry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRegistry;
    const registry = sanitizeRegistry(parsed.registry);
    if (!registry) return null;
    return { fetchedAt: parsed.fetchedAt, registry };
  } catch {
    return null;
  }
}

async function writeCache(registry: AdRegistry): Promise<void> {
  const entry: CachedRegistry = { fetchedAt: new Date().toISOString(), registry };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // A failed cache write only costs a re-fetch next session
  }
}

/**
 * Registry-backed AdsService: cache-first with TTL, then network, then the
 * registry snapshot bundled with the app. Resolves to null rather than throw.
 */
export function createRegistryAdsService(): AdsService {
  async function loadRegistry(): Promise<AdRegistry | null> {
    try {
      const cached = await readCache();
      const fresh =
        cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_TTL_MS;
      if (cached && fresh) {
        debugLog("using fresh cached registry");
        return cached.registry;
      }

      const remote = await fetchRemoteRegistry();
      if (remote) {
        await writeCache(remote);
        return remote;
      }

      // Stale cache beats the bundled snapshot: it was published more recently
      if (cached) {
        debugLog("using stale cached registry");
        return cached.registry;
      }
    } catch (error) {
      // Whatever went wrong (storage, network edge case), ads must still work
      debugLog("loadRegistry threw, falling back to bundled:", error);
    }
    debugLog("using bundled registry snapshot");
    return sanitizeRegistry(bundledRegistry);
  }

  return {
    async getSessionAd({ level, nativeLanguage, targetLanguage }) {
      const registry = await loadRegistry();
      if (!registry) {
        debugLog("no registry available from any source");
        return null;
      }

      const userLevel = levelIndex(level);
      const matching = registry.campaigns.filter(
        (c) =>
          c.active &&
          normalizeLanguage(c.nativeLanguage) === normalizeLanguage(nativeLanguage) &&
          normalizeLanguage(c.targetLanguage) === normalizeLanguage(targetLanguage)
      );
      const pool: SessionAd[] = matching.flatMap((c) =>
        c.phrases
          .filter((p) => levelIndex(p.level) <= userLevel)
          .map((phrase) => ({ advertiser: c.advertiser, phrase }))
      );

      if (pool.length === 0) {
        debugLog(
          `no eligible ads: list is ${nativeLanguage}→${targetLanguage}, user level "${level}", ` +
            `${registry.campaigns.length} campaign(s) in registry, ${matching.length} matching languages`
        );
        return null;
      }

      const picked = pool[Math.floor(Math.random() * pool.length)];
      debugLog(`picked ad "${picked.phrase.id}" from ${pool.length} candidate(s)`);
      return picked;
    },
  };
}
