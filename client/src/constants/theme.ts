/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Narra brand palette.
 * Taken from the logo assets in `assets/brand/`.
 */
export const Brand = {
  /** Primary — rgb(38, 33, 92). Deep indigo, used for the dark logo and app chrome */
  primary: '#26215C',
  /** The violet from the light logo mark, used for interactive elements */
  accent: '#534AB7',
  /** Soft lavender from the dark logo bars, for accents on dark surfaces */
  accentSoft: '#AFA9EC',
  /** Text/icons placed on top of primary or accent fills */
  onPrimary: '#FFFFFF',
  /** Feedback colors */
  success: '#28A745',
  error: '#DC3545',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Interactive elements: buttons, links, active states */
    tint: Brand.accent,
    /** Filled surfaces that carry the brand, e.g. banners */
    brandSurface: Brand.primary,
    /** Content on top of brandSurface */
    onBrandSurface: Brand.accentSoft,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: Brand.accentSoft,
    brandSurface: Brand.primary,
    onBrandSurface: Brand.accentSoft,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
