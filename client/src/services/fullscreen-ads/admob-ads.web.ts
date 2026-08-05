import type { FullscreenAdsService } from "@/types";
import { createNoopFullscreenAdsService } from "./index";

/**
 * Web stub. AdMob full-screen ads are mobile-only; resolving this file instead
 * of admob-ads.ts keeps react-native-google-mobile-ads out of the web bundle.
 */
export function createAdmobAdsService(): FullscreenAdsService {
  return createNoopFullscreenAdsService();
}
