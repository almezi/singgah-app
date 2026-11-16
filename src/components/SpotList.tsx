// src/components/SpotList.tsx — daftar kartu spot: pencarian, chip jenis, hasil,
// dan 'Tinjauan saya' untuk spot pending milik pengguna (SPEC §9, §13; gelombang W2).
// Props turun, callback naik — tanpa Supabase, tanpa toast (G3/G6); label tipe/chip
// dan teks verifikasi hanya dari spotView (G5); semua warna/ukuran dari tokens
// (G5, SPEC §12); anggaran performa: maksimum 50 kartu + 'Tampilkan 50 lagi'
// pada FlatList ter-windowing (G7).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Scrollable resmi @gorhom — integrasi scroll ↔ snap sheet (SPEC §17);
// SpotList hanya dipakai DI DALAM BottomSheet pada App.tsx (T10).
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
// Type-only import — komponen tidak menyentuh Supabase saat runtime (G3).
import type { SPOT, SpotType } from '../lib/supabase';
// Satu sumber kanonik untuk label tipe, chip, dan format verifikasi (G5).
import { SPOT_TYPES, TYPE_CHIPS, verifyText } from '../lib/spotView';
import { useTheme } from '../theme/tokens';
import DarkModeToggle from './DarkModeToggle';

// G7 — jendela kartu: 50 sekaligus; tombol 'Tampilkan 50 lagi' menambah 50 berikutnya.
const PAGE_SIZE = 50;

export type SpotListProps = {
  /** Spot approved hasil filter — satu memo untuk peta & daftar (SPEC §8). */
  spots: SPOT[];
  /** Teks pencarian terkontrol — pemilik state-nya root (App). */
  query: string;
  /** Chip jenis terpilih ('' = Semua). */
  type: '' | SpotType;
  /** Spot pending milik pengguna — tampil HANYA di bagian 'Tinjauan saya'. */
  pendingMine: SPOT[];
  /**
   * Posisi pengguna dari root — diterima sesuai kontrak §9 tetapi sengaja TIDAK
   * dipakai di komponen ini: pengurutan "terdekat" adalah wewenang root, karena
   * satu memo filteredSpots harus menggerakkan peta DAN daftar agar selalu
   * konsisten (SPEC §8). Prop tetap ada supaya wiring App tidak berubah.
   */
  userPos: { lat: number; lng: number } | null;
  onQueryChange: (q: string) => void;
  onTypeChange: (t: '' | SpotType) => void;
  onSelect: (spotId: string) => void;
  /**
   * Tinggi blok di atas kartu (judul + pencarian + chip) — diukur dari layout
   * dan dipakai root sebagai snap peek sheet. Diukur, bukan konstanta
   * (adaptasi RN dari aturan v0.1 'bottom of the search box + 8px', SPEC §17).
   */
  onHeaderLayout?: (height: number) => void;
};

export function SpotList({
  spots,
  query,
  type,
  pendingMine,
  // userPos sengaja tidak didestrukturisasi — lihat dokumentasi SpotListProps.
  onQueryChange,
  onTypeChange,
  onSelect,
  onHeaderLayout,
}: SpotListProps) {
  const { tokens, tints } = useTheme();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filter baru (ketikan / ganti chip) mengembalikan jendela ke 50 kartu pertama.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, type]);

  const visibleSpots = useMemo(
    () => spots.slice(0, visibleCount),
    [spots, visibleCount],
  );
  const hasMore = spots.length > visibleSpots.length;

  const keyExtractor = useCallback((spot: SPOT) => spot.id, []);

  const renderSpotCard = useCallback(
    ({ item }: { item: SPOT }) => {
      const meta = SPOT_TYPES[item.type];
      const tint = tints[meta.cls];
      return (
        <TouchableOpacity
          style={[
            styles.card,
            styles.cardShadow,
            {
              backgroundColor: tokens.surface,
              borderRadius: tokens.radiusCard,
              shadowColor: tokens.ink,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => onSelect(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Buka detail ${item.name}`}
        >
          <View style={styles.cardTop}>
            <Text
              numberOfLines={1}
              style={[styles.cardName, { color: tokens.ink }]}
            >
              {item.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: tint.soft }]}>
              <Text style={[styles.badgeText, { color: tint.ink }]}>
                {meta.label}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardVerify, { color: tokens.ink2 }]}>
            {verifyText(item.last_verified_at)}
          </Text>
        </TouchableOpacity>
      );
    },
    [tints, tokens, onSelect],
  );

  // Kartu pending — tampilan tenang, tanpa kata menyalahkan; tap tetap membuka
  // detail (pending punya last_verified_at null → 'Belum diverifikasi', jujur).
  const renderPendingCard = (spot: SPOT) => (
    <TouchableOpacity
      key={spot.id}
      style={[
        styles.card,
        styles.cardShadow,
        {
          backgroundColor: tokens.surface,
          borderRadius: tokens.radiusCard,
          shadowColor: tokens.ink,
        },
      ]}
      activeOpacity={0.85}
      onPress={() => onSelect(spot.id)}
      accessibilityRole="button"
      accessibilityLabel={`Buka detail ${spot.name}`}
    >
      <Text numberOfLines={1} style={[styles.cardName, { color: tokens.ink }]}>
        {spot.name}
      </Text>
      <Text style={[styles.cardVerify, { color: tokens.ink2 }]}>
        {verifyText(spot.last_verified_at)}
      </Text>
    </TouchableOpacity>
  );

  // Header daftar: 'Tinjauan saya' (bila ada pending milik sendiri) + hitungan
  // hasil dengan accessibilityLiveRegion (G8) agar perubahan filter diumumkan.
  const listHeader = (
    <>
      {pendingMine.length > 0 ? (
        <View style={styles.pendingSection}>
          <View style={styles.pendingHeader}>
            <Text style={[styles.pendingTitle, { color: tokens.ink }]}>
              Tinjauan saya
            </Text>
            <View style={[styles.pendingBadge, { backgroundColor: tokens.amberSoft }]}>
              <Text style={[styles.pendingBadgeText, { color: tokens.amber }]}>
                Menunggu tinjauan
              </Text>
            </View>
          </View>
          {pendingMine.map(renderPendingCard)}
        </View>
      ) : null}
      <Text
        style={[styles.count, { color: tokens.ink2 }]}
        accessibilityLiveRegion="polite"
      >
        {spots.length === 0 ? 'Tidak ada spot yang cocok.' : `${spots.length} spot`}
      </Text>
    </>
  );

  const listFooter = hasMore ? (
    <TouchableOpacity
      style={[
        styles.more,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.ink2,
          borderRadius: tokens.radiusButton,
          minHeight: tokens.touchMin,
        },
      ]}
      activeOpacity={0.85}
      onPress={() => setVisibleCount((current) => current + PAGE_SIZE)}
      accessibilityRole="button"
      accessibilityLabel="Tampilkan 50 lagi"
    >
      <Text style={[styles.moreText, { color: tokens.ink }]}>Tampilkan 50 lagi</Text>
    </TouchableOpacity>
  ) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      {/* Blok terukur di atas kartu (judul + pencarian + chip): tingginya menentukan
          snap peek sheet — diukur dari layout, bukan konstanta (SPEC §17). */}
      <View
        style={styles.measuredHeader}
        onLayout={
          onHeaderLayout
            ? (event) => onHeaderLayout(event.nativeEvent.layout.height)
            : undefined
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.ink }]}>Terdekat dari saya</Text>
          <DarkModeToggle />
        </View>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.ink2,
              color: tokens.ink,
              borderRadius: tokens.radiusButton,
              minHeight: tokens.touchMin,
            },
          ]}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Cari masjid, musala, SPBU…"
          placeholderTextColor={tokens.ink2}
          returnKeyType="search"
          accessibilityLabel="Cari masjid, musala, SPBU"
        />

        {/* Baris chip horizontal yang melipat — bukan ScrollView horizontal (G8:
            nol horizontal scroll). Chip 'Semua' (tanpa tint) aktif memakai
            tokens.primary; chip jenis aktif memakai tints[cls].main. */}
        <View
          style={styles.chipRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Filter jenis spot"
        >
          {TYPE_CHIPS.map((chip) => {
            const active = type === chip.value;
            const tint = chip.value === '' ? null : tints[SPOT_TYPES[chip.value].cls];
            const activeBg = tint ? tint.main : tokens.primary;
            return (
              <TouchableOpacity
                key={chip.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? activeBg : tokens.surface,
                    borderColor: active ? activeBg : tokens.ink2,
                    borderRadius: tokens.radiusButton,
                    minHeight: tokens.touchMin,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => onTypeChange(chip.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={chip.label}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? tokens.onPrimary : tokens.ink2 },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <BottomSheetFlatList
        style={styles.list}
        data={visibleSpots}
        extraData={tints}
        keyExtractor={keyExtractor}
        renderItem={renderSpotCard}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

export default SpotList;

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Kontainer terukur untuk snap peek (tingginya dilaporkan via onHeaderLayout).
  measuredHeader: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 18,
  },
  search: {
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  chipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  pendingSection: { marginBottom: 14 },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pendingTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pendingBadgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },
  count: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    marginBottom: 10,
  },
  card: { padding: 14, marginBottom: 10 },
  cardShadow: {
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
  badge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },
  cardVerify: {
    marginTop: 6,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  more: {
    alignSelf: 'center',
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
});
