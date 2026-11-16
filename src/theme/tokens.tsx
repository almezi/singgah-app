// src/theme/tokens.ts — the ONLY source of colors, sizes, radii (SPEC §12, guardrail G5).
// Components never hardcode a color or size; they read tokens via useTheme().
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type ThemeName = 'light' | 'dark';

export type ThemeTokens = {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  primary: string;
  primaryDeep: string;
  primarySoft: string;
  amber: string;
  amberSoft: string;
  water: string;
  violet: string;
  success: string;
  onPrimary: string;
  focus: string;
  radiusCard: number;
  radiusButton: number;
  touchMin: number;
};

// Light theme — values frozen from the approved mockup board (SPEC §12).
export const light: ThemeTokens = {
  bg: '#F6F4EE',
  surface: '#FFFFFF',
  surface2: '#F1EFE6',
  ink: '#12332C',
  ink2: '#5A6E67',
  primary: '#0E7C66',
  primaryDeep: '#0B5D4E',
  primarySoft: '#DDEEE8',
  amber: '#B45309',
  amberSoft: '#FBEEDA',
  water: '#0E7490',
  violet: '#9333EA',
  success: '#15803D',
  onPrimary: '#FFFFFF',
  focus: '#0E7C66',
  radiusCard: 16,
  radiusButton: 14,
  touchMin: 44,
};

// Dark theme — the five frozen values from SPEC §12 (bg #101B17, surface #16241F,
// primary #3DBFA3, onPrimary #06231C, focus #3DBFA3). The remaining values are
// derived to hold ≥ 4.5:1 contrast on the dark surfaces — the contrast gate
// (docs/code-standards.md §3 item 15) verifies both themes before release.
export const dark: ThemeTokens = {
  bg: '#101B17',
  surface: '#16241F',
  surface2: '#1D2F29',
  ink: '#E6EDE9',
  ink2: '#9FB3AB',
  primary: '#3DBFA3',
  primaryDeep: '#2E9C86',
  primarySoft: '#12302A',
  amber: '#DCA05E',
  amberSoft: '#2A2113',
  water: '#3FB6D8',
  violet: '#B57BE8',
  success: '#4CC27E',
  onPrimary: '#06231C',
  focus: '#3DBFA3',
  radiusCard: 16,
  radiusButton: 14,
  touchMin: 44,
};

// Type tints keyed by the spotView `cls` values — every tint pairs a main color
// with a soft panel color and its darker/lighter `ink` partner (≥ 4.5:1, SPEC §12).
export type TintKey = 't-masjid' | 't-musala' | 't-terminal' | 't-spbu' | 't-rest';

export type Tint = { main: string; soft: string; ink: string };

export const TINTS: Record<ThemeName, Record<TintKey, Tint>> = {
  light: {
    't-masjid': { main: '#0E7C66', soft: '#DDEEE8', ink: '#0B5D4E' },
    't-musala': { main: '#9333EA', soft: '#F3E8FF', ink: '#6B21A8' },
    't-terminal': { main: '#B45309', soft: '#FBEEDA', ink: '#92400E' },
    't-spbu': { main: '#0E7490', soft: '#E0F2FE', ink: '#0C5A73' },
    't-rest': { main: '#15803D', soft: '#DCFCE7', ink: '#14532D' },
  },
  dark: {
    't-masjid': { main: '#3DBFA3', soft: '#12302A', ink: '#7FD6C0' },
    't-musala': { main: '#B57BE8', soft: '#241732', ink: '#CBAEF0' },
    't-terminal': { main: '#DCA05E', soft: '#2A2113', ink: '#E9C18A' },
    't-spbu': { main: '#3FB6D8', soft: '#0E2530', ink: '#8AD6EC' },
    't-rest': { main: '#4CC27E', soft: '#12291C', ink: '#8FE0AE' },
  },
};

const THEME_KEY = 'singgah-theme'; // SPEC §12 — persisted theme choice

type ThemeCtx = {
  theme: ThemeName;
  tokens: ThemeTokens;
  tints: Record<TintKey, Tint>;
  setTheme: (t: ThemeName) => void;
  ready: boolean; // true once the saved theme has been loaded (pre-render gate)
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (alive && (saved === 'dark' || saved === 'light')) setThemeState(saved);
      } catch {
        // storage unavailable → default light; the app stays usable (SPEC §8)
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t).catch(() => {});
  };

  const tokens = theme === 'dark' ? dark : light;
  const value = useMemo<ThemeCtx>(
    () => ({ theme, tokens, tints: TINTS[theme], setTheme, ready }),
    [theme, ready],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
