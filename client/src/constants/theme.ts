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
  /** Very light violet, for badges and selected rows on light surfaces */
  accentWash: '#EEEDFE',
  /** Text/icons placed on top of primary or accent fills */
  onPrimary: '#FFFFFF',
  /** Feedback colors */
  success: '#1D9E75',
  error: '#D85A30',
} as const;

/**
 * Feedback tones, each with a fill, a readable text color on that fill, and a
 * strong color for icons and numbers.
 */
export const Feedback = {
  correct: {
    surface: '#E1F5EE',
    text: '#0F6E56',
    strong: '#1D9E75',
  },
  incorrect: {
    surface: '#FAECE7',
    text: '#993C1D',
    strong: '#D85A30',
  },
} as const;

/** Language chips shown on list cards: native vs target */
export const LanguageBadge = {
  native: { surface: '#EEEDFE', text: '#534AB7' },
  target: { surface: '#E6F1FB', text: '#185FA5' },
} as const;

/**
 * Viewport widths where the layout changes.
 * `md` is where the sidebar becomes persistent and grids gain columns.
 */
export const Breakpoints = {
  md: 768,
  lg: 1100,
} as const;

/** Corner radii, from chips up to cards */
export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  xxl: 12,
  pill: 999,
} as const;

/**
 * Layout constraints. Without these the content stretches across the full
 * viewport on desktop, which is the main complaint about the mobile-first design.
 */
export const Layout = {
  /** Persistent sidebar width on >= md */
  sidebarWidth: 220,
  /** Drawer width on mobile */
  drawerWidth: 280,
  /** Wide screens: list grids and dashboards */
  contentMaxWidth: 1100,
  /** Medium: forms and list detail */
  formMaxWidth: 700,
  /** Narrow: anything meant to be read, like the practice phrase */
  readingMaxWidth: 580,
} as const;

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Lowest-emphasis text: timestamps, counts, placeholders */
    textMuted: '#9A9AA0',
    /** Card and input borders */
    border: '#E4E4E7',
    /** Hairlines between sections of the same surface */
    borderSubtle: '#F0F0F0',
    /** Raised surfaces such as cards, above `background` */
    surface: '#FFFFFF',
    /** Recessed surfaces such as stat tiles and search fields */
    surfaceMuted: '#F7F7F7',
    /** Neutral track behind a progress fill */
    track: '#F0F0F0',
    /** Interactive elements: buttons, links, active states */
    tint: Brand.accent,
    /** Filled surfaces that carry the brand, e.g. banners */
    brandSurface: Brand.primary,
    /** Content on top of brandSurface */
    onBrandSurface: Brand.accentSoft,
  },
  dark: {
    text: '#F5F5F7',
    background: '#0E0E11',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    textMuted: '#7E828A',
    border: '#2E3135',
    borderSubtle: '#1E1F22',
    surface: '#17181B',
    surfaceMuted: '#1E1F22',
    track: '#2E3135',
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
