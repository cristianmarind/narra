import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DefaultListDef, DefaultListManifestEntry, DefaultListsManifest, DefaultListsService } from "@/types";

/**
 * Same worker/URL as the ads registry (see /worker in the repo — one
 * Cloudflare Worker serves both, routed by query param). Reusing the ads env
 * var means there's only one URL to configure; when absent the app skips
 * the network entirely and keeps whatever is already seeded locally
 * (bundled on first launch).
 */
const WORKER_URL = process.env.EXPO_PUBLIC_ADS_REGISTRY_URL;

/** This worker's own manifest route (see /worker/worker.js). */
function manifestUrl(baseUrl: string): string {
  return `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}defaultLists=manifest`;
}

const MANIFEST_CACHE_KEY = "default_lists_manifest_cache";
const MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** id -> updatedAt of the manifest entries already applied to local storage */
const APPLIED_KEY = "default_lists_applied_versions";

/** Background sync — never worth delaying anything the user is looking at. */
const MANIFEST_FETCH_TIMEOUT_MS = 4000;
const LIST_FETCH_TIMEOUT_MS = 8000;

interface CachedManifest {
  fetchedAt: string;
  manifest: DefaultListsManifest;
}

type AppliedVersions = Record<string, string>;

/** Drop malformed entries instead of failing the whole manifest. */
function sanitizeManifest(raw: unknown): DefaultListsManifest | null {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as DefaultListsManifest).lists)) {
    return null;
  }
  const input = raw as DefaultListsManifest;

  const lists: DefaultListManifestEntry[] = input.lists.filter(
    (entry): entry is DefaultListManifestEntry =>
      Boolean(entry) &&
      typeof entry.id === "string" &&
      entry.id.trim() !== "" &&
      typeof entry.url === "string" &&
      entry.url.trim() !== "" &&
      typeof entry.updatedAt === "string" &&
      entry.updatedAt.trim() !== ""
  );

  return {
    version: typeof input.version === "number" ? input.version : 1,
    lists,
  };
}

/** Drop malformed phrases instead of failing the whole list. */
function sanitizeListDef(raw: unknown): DefaultListDef | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  if (typeof input.name !== "string" || !input.name.trim()) return null;
  if (typeof input.nativeLanguage !== "string" || !input.nativeLanguage.trim()) return null;
  if (typeof input.targetLanguage !== "string" || !input.targetLanguage.trim()) return null;
  if (!Array.isArray(input.phrases)) return null;

  const phrases = input.phrases.filter(
    (p): p is DefaultListDef["phrases"][number] =>
      Boolean(p) &&
      typeof p === "object" &&
      typeof (p as Record<string, unknown>).nativeSentence === "string" &&
      (p as Record<string, unknown>).nativeSentence !== "" &&
      Array.isArray((p as Record<string, unknown>).acceptedTranslations) &&
      ((p as Record<string, unknown>).acceptedTranslations as unknown[]).length > 0 &&
      ((p as Record<string, unknown>).acceptedTranslations as unknown[]).every(
        (t) => typeof t === "string" && t.trim() !== ""
      ) &&
      ((p as Record<string, unknown>).properNouns === undefined ||
        (Array.isArray((p as Record<string, unknown>).properNouns) &&
          ((p as Record<string, unknown>).properNouns as unknown[]).every(
            (n) => typeof n === "string" && n.trim() !== ""
          )))
  );

  if (phrases.length === 0) return null;

  return {
    name: input.name,
    nativeLanguage: input.nativeLanguage,
    targetLanguage: input.targetLanguage,
    ...(typeof input.showTranslation === "boolean" ? { showTranslation: input.showTranslation } : {}),
    phrases,
  };
}

function debugLog(message: string, ...args: unknown[]) {
  if (__DEV__) console.log(`[default-lists] ${message}`, ...args);
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      debugLog(`fetch failed: HTTP ${response.status} (${url})`);
      return null;
    }
    return await response.json();
  } catch (error) {
    debugLog(`fetch threw (offline, CORS, or timeout) for ${url}:`, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRemoteManifest(): Promise<DefaultListsManifest | null> {
  if (!WORKER_URL) {
    debugLog("EXPO_PUBLIC_ADS_REGISTRY_URL not set, skipping network");
    return null;
  }
  const raw = await fetchJsonWithTimeout(manifestUrl(WORKER_URL), MANIFEST_FETCH_TIMEOUT_MS);
  const manifest = raw ? sanitizeManifest(raw) : null;
  debugLog(manifest ? `manifest fetched: ${manifest.lists.length} list(s)` : "manifest fetch failed or malformed");
  return manifest;
}

async function readManifestCache(): Promise<CachedManifest | null> {
  try {
    const raw = await AsyncStorage.getItem(MANIFEST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedManifest;
    const manifest = sanitizeManifest(parsed.manifest);
    if (!manifest) return null;
    return { fetchedAt: parsed.fetchedAt, manifest };
  } catch {
    return null;
  }
}

async function writeManifestCache(manifest: DefaultListsManifest): Promise<void> {
  const entry: CachedManifest = { fetchedAt: new Date().toISOString(), manifest };
  try {
    await AsyncStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // A failed cache write only costs a re-fetch next session
  }
}

async function readApplied(): Promise<AppliedVersions> {
  try {
    const raw = await AsyncStorage.getItem(APPLIED_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AppliedVersions;
  } catch {
    return {};
  }
}

/**
 * Registry-backed DefaultListsService: cache-first (TTL) manifest, diffed
 * against what was last applied, fetching only the lists that are new or
 * changed. Resolves to [] rather than throw — the bundled lists (or
 * whatever is already in local storage) always remain the fallback.
 */
export function createRegistryDefaultListsService(): DefaultListsService {
  async function loadManifest(): Promise<DefaultListsManifest | null> {
    try {
      const cached = await readManifestCache();
      const fresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < MANIFEST_CACHE_TTL_MS;
      if (cached && fresh) {
        debugLog("using fresh cached manifest");
        return cached.manifest;
      }

      const remote = await fetchRemoteManifest();
      if (remote) {
        await writeManifestCache(remote);
        return remote;
      }

      if (cached) {
        debugLog("using stale cached manifest");
        return cached.manifest;
      }
    } catch (error) {
      debugLog("loadManifest threw:", error);
    }
    return null;
  }

  return {
    async checkForUpdates() {
      try {
        const manifest = await loadManifest();
        if (!manifest) return [];

        const applied = await readApplied();
        const changed = manifest.lists.filter((entry) => applied[entry.id] !== entry.updatedAt);
        if (changed.length === 0) {
          debugLog("no changes since last sync");
          return [];
        }
        debugLog(`${changed.length} list(s) changed or new: ${changed.map((e) => e.id).join(", ")}`);

        const fetched = await Promise.all(
          changed.map(async (entry) => {
            const raw = await fetchJsonWithTimeout(entry.url, LIST_FETCH_TIMEOUT_MS);
            const def = raw ? sanitizeListDef(raw) : null;
            if (!def) {
              debugLog(`list "${entry.id}" fetch failed or malformed, skipping`);
              return null;
            }
            return { id: entry.id, updatedAt: entry.updatedAt, def };
          })
        );

        return fetched.filter((r): r is { id: string; updatedAt: string; def: DefaultListDef } => r !== null);
      } catch (error) {
        debugLog("checkForUpdates threw:", error);
        return [];
      }
    },

    async markApplied(entries) {
      try {
        const applied = await readApplied();
        for (const entry of entries) {
          applied[entry.id] = entry.updatedAt;
        }
        await AsyncStorage.setItem(APPLIED_KEY, JSON.stringify(applied));
      } catch (error) {
        // Worst case: these entries get re-fetched (and re-diffed, no-op if
        // unchanged) next sync — not worth failing the caller over
        debugLog("markApplied threw:", error);
      }
    },
  };
}
