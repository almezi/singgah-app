// src/lib/spotView.ts — canonical presentation metadata (SPEC §10, guardrail G5).
// One source per shared concept: labels, glyphs, chips and time formatting live
// ONLY here — a duplicated constant in a component is a bug incubator.
import type { SpotType, WaterValue } from './supabase';
import type { TintKey } from '../theme/tokens';

// The non-negotiable string (SPEC §13): any missing value renders exactly this —
// never a dash, never `N/A`, never a guess.
export const UNKNOWN_LABEL = 'Belum ada info';

// OQ-A resolved by SPEC §10: boolean predicate (true for null / undefined / '').
// Render sites write `isUnknown(v) ? UNKNOWN_LABEL : v`.
export function isUnknown(value: string | null | undefined): boolean {
  return value === null || value === undefined || value === '';
}

// Type labels + tint keys (`cls` maps to the TINTS in src/theme/tokens.tsx).
// Chip labels are referenced from here so there is still one label source.
export const SPOT_TYPES: Record<SpotType, { label: string; cls: TintKey }> = {
  masjid_besar: { label: 'Masjid Besar', cls: 't-masjid' },
  musala: { label: 'Musala', cls: 't-musala' },
  terminal: { label: 'Terminal', cls: 't-terminal' },
  spbu: { label: 'SPBU', cls: 't-spbu' },
  rest_area: { label: 'Rest Area', cls: 't-rest' },
};

// TYPE_GLYPHS — frozen static SVG path data per type, rendered through
// react-native-svg as `<Svg><Path d={…} /></Svg>`. User data is never
// interpolated into an SVG string (G8); these are module constants only.
//
// SOURCE: extracted from the approved board `design/singgah-mockup-board.html`
// (symbols `glyph-masjid` … `glyph-rest`, SPEC §12: dome · building · bus ·
// droplet · tent). The board draws them stroke-only inside the teardrop pin in
// a local ±6 coordinate space; here they are normalized to the 24×24 box the
// contract requires via x' = 12 + 2x, y' = 12 + 2y (scale ×2, center +12) —
// geometry unchanged. Render with fill="none", stroke round cap/join and
// strokeWidth ≈ 3.6 (the board's 1.8 × 2 after the same scale).
// Terminal's board `<rect>` was converted to equivalent path commands so every
// glyph is a single `d` string.
export const TYPE_GLYPHS: Record<SpotType, string> = {
  // Board: `M-5 1.5 A5 5 0 0 1 5 1.5 M-6 1.5 H6 M0 -3.5 V-6` (dome + base + finial)
  masjid_besar: 'M2 15 A10 10 0 0 1 22 15 M0 15 H24 M12 5 V0',
  // Board: `M-5 1.5 L0 -4 L5 1.5 M-6 1.5 H6 M-4 1.5 V5 M4 1.5 V5` (roof + base + walls)
  musala: 'M2 15 L12 4 L22 15 M0 15 H24 M4 15 V22 M20 15 V22',
  // Board: <rect x="-5" y="-4.5" width="10" height="8" rx="2"/> + `M-5 0 H5 M-3 3.5 V5.5 M3 3.5 V5.5`
  terminal:
    'M6 3 H18 A4 4 0 0 1 22 7 V15 A4 4 0 0 1 18 19 H6 A4 4 0 0 1 2 15 V7 A4 4 0 0 1 6 3 Z M2 12 H22 M6 19 V23 M18 19 V23',
  // Board: `M0 -5.5 C-3 -1.5 -4.5 0.5 -4.5 2.5 A4.5 4.5 0 0 0 4.5 2.5 C4.5 0.5 3 -1.5 0 -5.5Z` (droplet)
  spbu: 'M12 1 C6 9 3 13 3 17 A9 9 0 0 0 21 17 C21 13 18 9 12 1 Z',
  // Board: `M-6 5 L0 -5 L6 5 Z M0 -5 V5` (tent + center seam)
  rest_area: 'M0 22 L12 2 L24 22 Z M12 2 V22',
};

// Water labels — OQ-8 variants resolved per SPEC §13 ("the approved board wins
// until the owner decides"): the board renders `Wudhu saja` and `Air isi`
// (design/singgah-mockup-board.html list cards), so those variants are used
// here — NOT `Khusus wudhu` / `Air isi ulang`. Owner decision pending in OQ-8.
export const WATER_LABELS: Record<WaterValue, string> = {
  kran_mandi: 'Kran mandi',
  wudhu_only: 'Wudhu saja',
  air_isi: 'Air isi',
  tidak_ada: 'Tidak ada',
};

// Filter chips — `''` means "all". Labels come from SPOT_TYPES (single source).
export const TYPE_CHIPS: Array<{ label: string; value: '' | SpotType }> = [
  { label: 'Semua', value: '' },
  { label: SPOT_TYPES.masjid_besar.label, value: 'masjid_besar' },
  { label: SPOT_TYPES.musala.label, value: 'musala' },
  { label: SPOT_TYPES.terminal.label, value: 'terminal' },
  { label: SPOT_TYPES.spbu.label, value: 'spbu' },
  { label: SPOT_TYPES.rest_area.label, value: 'rest_area' },
];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Relative time (SPEC §10): < 1 h → 'baru saja'; < 24 h → 'N jam lalu';
// otherwise 'N hari lalu' with whole-day precision (floor — never overstates
// recency). A malformed timestamp renders UNKNOWN_LABEL (honest, not a guess);
// a clock-skewed future timestamp reads 'baru saja'.
export function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return UNKNOWN_LABEL;
  const diff = Date.now() - then;
  if (diff < HOUR_MS) return 'baru saja';
  if (diff < DAY_MS) return `${Math.floor(diff / HOUR_MS)} jam lalu`;
  return `${Math.floor(diff / DAY_MS)} hari lalu`;
}

// Detail verify line (SPEC §13): 'Belum diverifikasi' / 'Diverifikasi 3 hari lalu'.
// `''` counts as unknown too (G4) — empty strings never masquerade as data.
export function verifyText(iso: string | null): string {
  if (isUnknown(iso)) return 'Belum diverifikasi';
  // isUnknown() just ruled out null and '' — the cast only narrows that.
  return `Diverifikasi ${relTime(iso as string)}`;
}
