// src/components/SpotDetail.tsx — detail satu spot (SPEC §9, §13; gelombang W2).
// Props turun (`spot`), callback naik (`onClose`, `onVerify`) — intent saja:
// tanpa fetch, tanpa Supabase, tanpa toast (G3/G6; App yang menulis data dan
// memanggang toast kebenaran). Semua nilai nullable lolos isUnknown() sehingga
// unknown membaca string kanonik via UNKNOWN_LABEL — literal itu hanya hidup di spotView
// (G4/G5). CTA 'Masih ada ✓' fixed 190×44 — pelajaran sizing owner, tidak
// pernah flex:1 (SPEC §12). 'Rute' membuka peta eksternal via Linking (SPEC §17).
import React from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
// Type-only import — komponen tidak menyentuh Supabase saat runtime (G3).
import type { SPOT } from '../lib/supabase';
// Satu sumber kanonik untuk label tipe, label air, dan format verifikasi (G5).
import {
  isUnknown,
  SPOT_TYPES,
  UNKNOWN_LABEL,
  verifyText,
  WATER_LABELS,
} from '../lib/spotView';
import { useTheme } from '../theme/tokens';

// Path statis tombol tutup (G8 — SVG hanya dari konstanta modul, tidak pernah
// interpolasi data pengguna ke string SVG).
const CLOSE_PATH = 'M6 6L18 18M18 6L6 18';

/** Ikon X tombol tutup — digambar react-native-svg (@expo/vector-icons tidak terpasang). */
function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d={CLOSE_PATH}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Predikat kanonik isUnknown() dibungkus type-guard supaya strict TypeScript
// ikut menipiskan tipe di cabang `true` — logikanya tetap satu sumber di
// spotView (G5), tidak ada duplikasi aturan unknown.
function isKnown<T extends string>(value: T | null | undefined): value is T {
  return !isUnknown(value);
}

export type SpotDetailProps = {
  /** Satu baris SPOT (approved, hasil filter root). */
  spot: SPOT;
  /** Intent "tutup" — App yang mengganti isi sheet. */
  onClose: () => void;
  /** Intent "Masih ada ✓" — App menulis via SpotContext; rate-limit = gagal (G2). */
  onVerify: (spotId: string) => void;
};

export function SpotDetail({ spot, onClose, onVerify }: SpotDetailProps) {
  const { tokens, tints } = useTheme();
  const tint = tints[SPOT_TYPES[spot.type].cls];

  // G4 — setiap nullable lolos isUnknown(): unknown → label kanonik, bukan tebakan.
  const waterLabel = isKnown(spot.water) ? WATER_LABELS[spot.water] : UNKNOWN_LABEL;
  const hoursLabel = isKnown(spot.hours) ? spot.hours : UNKNOWN_LABEL;
  const notesLabel = isKnown(spot.notes) ? spot.notes : UNKNOWN_LABEL;
  // bike_parking non-nullable → 'Ya'/'Tidak'; women_friendly null = belum ada
  // info dan TIDAK PERNAH ditebak (G4 / SPEC §6).
  const bikeLabel = spot.bike_parking ? 'Ya' : 'Tidak';
  const womenLabel =
    spot.women_friendly === null
      ? UNKNOWN_LABEL
      : spot.women_friendly
        ? 'Ya'
        : 'Tidak';

  // 'Rute' → peta eksternal: geo: URI di Android, Apple Maps di iOS (SPEC §17).
  // Kegagalan (tidak ada aplikasi peta yang merespons) diam — tidak ada pesan
  // palsu; toast milik root (G2/G6).
  const openRute = async () => {
    const url = Platform.select({
      android: `geo:${spot.lat},${spot.lng}?q=${spot.lat},${spot.lng}(${encodeURIComponent(spot.name)})`,
      ios: `https://maps.apple.com/?ll=${spot.lat},${spot.lng}&q=${encodeURIComponent(spot.name)}`,
    });
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // Tidak ada aplikasi peta yang merespons — biarkan tanpa mengarang keberhasilan.
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            styles.cardShadow,
            {
              backgroundColor: tokens.surface,
              borderRadius: tokens.radiusCard,
              shadowColor: tokens.ink,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text numberOfLines={2} style={[styles.name, { color: tokens.ink }]}>
                {spot.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: tint.soft }]}>
                <Text style={[styles.badgeText, { color: tint.ink }]}>
                  {SPOT_TYPES[spot.type].label}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.close,
                {
                  width: tokens.touchMin,
                  height: tokens.touchMin,
                  borderRadius: tokens.radiusButton,
                },
              ]}
              activeOpacity={0.85}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup detail"
            >
              <CloseIcon color={tokens.ink} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.verify, { color: tokens.ink2 }]}>
            {verifyText(spot.last_verified_at)}
          </Text>

          <View style={[styles.divider, { backgroundColor: tokens.surface2 }]} />

          <View style={styles.grid}>
            <View style={styles.cell}>
              <Text style={[styles.label, { color: tokens.ink2 }]}>Air</Text>
              <Text style={[styles.value, { color: tokens.ink }]}>{waterLabel}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={[styles.label, { color: tokens.ink2 }]}>Jam</Text>
              <Text style={[styles.value, { color: tokens.ink }]}>{hoursLabel}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.cell}>
              <Text style={[styles.label, { color: tokens.ink2 }]}>Parkir sepeda</Text>
              <Text style={[styles.value, { color: tokens.ink }]}>{bikeLabel}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={[styles.label, { color: tokens.ink2 }]}>Ramah perempuan</Text>
              <Text style={[styles.value, { color: tokens.ink }]}>{womenLabel}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: tokens.ink2 }]}>Catatan</Text>
            <Text style={[styles.notes, { color: tokens.ink }]}>{notesLabel}</Text>
          </View>

          <View style={styles.actions}>
            {/* Fixed 190×44 — pelajaran sizing owner: CTA tidak pernah flex:1 (SPEC §12). */}
            <TouchableOpacity
              style={[
                styles.cta,
                { backgroundColor: tokens.primary, borderRadius: tokens.radiusButton },
              ]}
              activeOpacity={0.85}
              onPress={() => onVerify(spot.id)}
              accessibilityRole="button"
              accessibilityLabel="Masih ada ✓"
            >
              <Text style={[styles.ctaText, { color: tokens.onPrimary }]}>
                Masih ada ✓
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.route,
                {
                  borderColor: tokens.primary,
                  borderRadius: tokens.radiusButton,
                  minHeight: tokens.touchMin,
                },
              ]}
              activeOpacity={0.85}
              onPress={openRute}
              accessibilityRole="button"
              accessibilityLabel="Rute"
            >
              <Text style={[styles.routeText, { color: tokens.primary }]}>Rute</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default SpotDetail;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { padding: 16 },
  cardShadow: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1 },
  name: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },
  close: { alignItems: 'center', justifyContent: 'center' },
  verify: {
    marginTop: 8,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    marginBottom: 14,
  },
  grid: { flexDirection: 'row', gap: 16 },
  cell: { flex: 1, marginBottom: 14 },
  field: { marginBottom: 14 },
  label: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  notes: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  // CTA fixed — jangan pernah memakai ulang style flex:1 di luar flex row (SPEC §12).
  cta: {
    width: 190,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  route: {
    borderWidth: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
});
