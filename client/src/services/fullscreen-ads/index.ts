import type { FullscreenAdsService } from "@/types";

/**
 * Full-screen AdMob ads (interstitial + rewarded), behind the low-intrusion
 * policy described in FullscreenAdsService.
 *
 * Platform selection: Metro resolves `./admob-ads` to `admob-ads.web.ts` on
 * web (a stub, so the native SDK never ships in the web bundle). On native the
 * lazy require lets a missing native module (e.g. Expo Go) degrade to a noop
 * service instead of crashing at import time.
 */
export function createFullscreenAdsService(): FullscreenAdsService {
  try {
    const { createAdmobAdsService } =
      require("./admob-ads") as typeof import("./admob-ads");
    return createAdmobAdsService();
  } catch {
    return createNoopFullscreenAdsService();
  }
}

export function createNoopFullscreenAdsService(): FullscreenAdsService {
  return {
    isAvailable: false,
    async maybeShowSessionAd() {
      return false;
    },
    async showSupportAd() {
      return false;
    },
  };
}
