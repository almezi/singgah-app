// src/components/DarkModeToggle.tsx — saklar mode gelap/terang (SPEC §12, G8).
// Tanpa props: baca useTheme(), tulis lewat setTheme() — persistensi AsyncStorage
// ('singgah-theme') sudah ditangani ThemeProvider, jadi komponen ini murni UI.
// Ikon matahari/bulan digambar react-native-svg dari path statis modul (G8 —
// tidak pernah interpolasi data pengguna ke string SVG; @expo/vector-icons
// tidak terpasang). Target sentuh ≥ 44px dari tokens.touchMin, dan kontrol
// ikon-only wajib punya accessibilityLabel (G8).
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme/tokens';

// Glyph statis — matahari (titik pusat + 8 sinar) dan bulan sabit.
const SUN_RAYS =
  'M12 3.2V5.4M12 18.6V20.8M3.2 12H5.4M18.6 12H20.8M5.9 5.9L7.4 7.4M16.6 16.6L18.1 18.1M18.1 5.9L16.6 7.4M7.4 16.6L5.9 18.1';
const MOON_PATH = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z';

/** Ikon matahari — tampil saat mode gelap (ketuk untuk kembali ke mode terang). */
function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} fill={color} />
      <Path
        d={SUN_RAYS}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Ikon bulan — tampil saat mode terang (ketuk untuk masuk mode gelap). */
function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d={MOON_PATH}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function DarkModeToggle() {
  const { theme, tokens, setTheme } = useTheme();
  // setTheme(kebalikan) — persist ke 'singgah-theme' urusan ThemeProvider.
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <TouchableOpacity
      style={[
        styles.toggle,
        {
          width: tokens.touchMin,
          height: tokens.touchMin,
          borderRadius: tokens.radiusButton,
        },
      ]}
      activeOpacity={0.85}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel="Ganti mode gelap/terang"
      accessibilityHint={
        theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'
      }
    >
      {theme === 'dark' ? <SunIcon color={tokens.ink} /> : <MoonIcon color={tokens.ink} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DarkModeToggle;
