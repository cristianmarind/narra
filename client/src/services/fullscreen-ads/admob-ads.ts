import AsyncStorage from "@react-native-async-storage/async-storage";
import mobileAds, {
  AdEventType,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

import type { FullscreenAdsService } from "@/types";

const LAST_SHOWN_KEY = "fullscreen_ads_last_shown_at";

/** Minimum gap between automatic (non user-initiated) full-screen ads. */
const SESSION_AD_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;

// Google's test units in dev; real units come from the environment in
// production builds (see .env.example). Falling back to test units means a
// misconfigured build shows test ads instead of breaking or violating policy.
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID || TestIds.INTERSTITIAL;
const REWARDED_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID || TestIds.REWARDED;

// Until a consent flow (UMP) exists, request only non-personalized ads so the
// app stays on the safe side of GDPR without asking anything at startup.
const REQUEST_OPTIONS = { requestNonPersonalizedAdsOnly: true };

async function readLastShownAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(LAST_SHOWN_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

async function markShownNow(): Promise<void> {
  await AsyncStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
}

/** Resolve true when the ad finishes loading, false on error or timeout. */
function waitForLoad(ad: RewardedAd, timeoutMs: number): Promise<boolean> {
  if (ad.loaded) return Promise.resolve(true);

  return new Promise((resolve) => {
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      unsubLoaded();
      unsubError();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () =>
      finish(true),
    );
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () =>
      finish(false),
    );
    ad.load();
  });
}

export function createAdmobAdsService(): FullscreenAdsService {
  // Throws in environments without the native module (caught by index.ts)
  const interstitial = InterstitialAd.createForAdRequest(
    INTERSTITIAL_UNIT_ID,
    REQUEST_OPTIONS,
  );
  const rewarded = RewardedAd.createForAdRequest(
    REWARDED_UNIT_ID,
    REQUEST_OPTIONS,
  );

  void mobileAds().initialize();

  // Keep one ad of each type preloaded; refill after every presentation
  interstitial.addAdEventListener(AdEventType.CLOSED, () => interstitial.load());
  rewarded.addAdEventListener(AdEventType.CLOSED, () => rewarded.load());
  // Swallow load failures (offline, no fill) — the next maybeShow retries
  interstitial.addAdEventListener(AdEventType.ERROR, () => {});
  rewarded.addAdEventListener(AdEventType.ERROR, () => {});
  interstitial.load();
  rewarded.load();

  return {
    isAvailable: true,

    async maybeShowSessionAd() {
      try {
        const lastShownAt = await readLastShownAt();
        if (lastShownAt === null) {
          // First run: start the 2-day window now, so a brand-new user's
          // first practice is never interrupted by an ad
          await markShownNow();
          return false;
        }
        if (Date.now() - lastShownAt < SESSION_AD_INTERVAL_MS) return false;
        if (!interstitial.loaded) {
          // Missed the moment; make sure one is ready for the next chance
          interstitial.load();
          return false;
        }
        await interstitial.show();
        await markShownNow();
        return true;
      } catch {
        return false;
      }
    },

    async showSupportAd() {
      try {
        if (!(await waitForLoad(rewarded, 10_000))) return false;

        const watched = await new Promise<boolean>((resolve) => {
          let earned = false;
          const finish = (ok: boolean) => {
            unsubEarned();
            unsubClosed();
            unsubError();
            resolve(ok);
          };
          const unsubEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            () => {
              earned = true;
            },
          );
          const unsubClosed = rewarded.addAdEventListener(
            AdEventType.CLOSED,
            () => finish(earned),
          );
          const unsubError = rewarded.addAdEventListener(
            AdEventType.ERROR,
            () => finish(false),
          );
          rewarded.show().catch(() => finish(false));
        });

        // A voluntary ad counts as the user's contribution for this window
        if (watched) await markShownNow();
        return watched;
      } catch {
        return false;
      }
    },
  };
}
