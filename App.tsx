// App.tsx — root & integrator (SPEC §4, §9, §17): peta penuh di belakang, satu
// sheet draggable di depan, alur `+ Tambah` (pin → form → sukses jujur), dan
// SEMUA toast di sini (G6 — komponen anak hanya memancarkan intent).
// Tidak ada router — apa yang tampak ditentukan state biasa.
import 'react-native-gesture-handler';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { default as BottomSheet, BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import type { WithTimingConfig } from 'react-native-reanimated';
// Subpath import — root index paket mem-bundle SEMUA varian (termasuk italic);
// ini menjaga bundle tetap ramping (G7).
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { ThemeProvider, useTheme } from './src/theme/tokens';
import { SpotProvider, useSpots } from './src/state/SpotContext';
import { useGeolocation } from './src/state/useGeolocation';
import { showToast } from './src/lib/toast';
import { ToastHost } from './src/components/ToastHost';
import { MapPane } from './src/components/MapPane';
import { SpotList } from './src/components/SpotList';
import { SpotDetail } from './src/components/SpotDetail';
import { AddSpotSheet, type AddSpotSubmitState } from './src/components/AddSpotSheet';
import type { SpotPayload } from './src/lib/supabase';

// Alur tambah-spot: idle → pin (taruh pin di peta) → form (AddSpotSheet) → idle.
type AddPhase = 'idle' | 'pin' | 'form';

function Shell() {
  const { tokens, theme, ready } = useTheme();
  const {
    spots,
    pendingMine,
    query,
    type,
    filteredSpots,
    load,
    addPending,
    markVerified,
    setQuery,
    setType,
  } = useSpots();
  const { position: userPos, locate } = useGeolocation();
  const { height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<AddPhase>('idle');
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [submitState, setSubmitState] = useState<AddSpotSubmitState>('idle');
  // Fallback 180px — angka nyata datang dari pengukuran layout SpotList (SPEC §17).
  const [peekHeight, setPeekHeight] = useState(180);
  const [reduceMotion, setReduceMotion] = useState(false);

  const listSheetRef = useRef<ComponentRef<typeof BottomSheet> | null>(null);
  const addSheetRef = useRef<ComponentRef<typeof BottomSheetModal> | null>(null);

  // Baca awal: approved saja (RLS). Kredensial kosong (OQ-B) → app tetap hidup.
  useEffect(() => {
    load().catch((err: unknown) => {
      console.warn(
        '[Singgah] gagal memuat spot:',
        err instanceof Error ? err.message : err,
      );
    });
  }, [load]);

  // SPEC §17: hormati preferensi reduce-motion — snap tanpa animasi.
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  const selectedSpot = useMemo(
    () => (selectedId ? (spots.find((s) => s.id === selectedId) ?? null) : null),
    [selectedId, spots],
  );

  // Snap points (SPEC §17): peek diukur dari layout SpotList (fallback 180) ·
  // half '55%' · full winH − 96. Detail mengganti isi sheet → min(70dvh, 590).
  const snapPoints = useMemo(() => {
    if (selectedSpot) return [Math.min(winH * 0.7, 590)];
    return [peekHeight, '55%', winH - 96];
  }, [selectedSpot, peekHeight, winH]);

  const sheetAnimation = reduceMotion
    ? ({ duration: 0 } as WithTimingConfig)
    : undefined;

  const snapTo = useCallback((index: number) => {
    listSheetRef.current?.snapToIndex(index);
  }, []);

  const handleSelect = useCallback(
    (spotId: string) => {
      setSelectedId(spotId);
      snapTo(0);
    },
    [snapTo],
  );

  const handleDetailClose = useCallback(() => {
    setSelectedId(null);
    snapTo(1); // kembali ke half — daftar tampak lagi (SPEC §17)
  }, [snapTo]);

  // G2/G6: App menulis, App men-toast kebenaran. Rate limit → gagal → toast gagal.
  const handleVerify = useCallback(
    async (spotId: string) => {
      try {
        await markVerified(spotId);
        showToast('Terima kasih! Verifikasi tercatat.');
      } catch {
        showToast('Gagal menyimpan verifikasi. Coba lagi nanti.');
      }
    },
    [markVerified],
  );

  const handlePinPlaced = useCallback((lat: number, lng: number) => {
    setPin({ lat, lng });
  }, []);

  // Fix lokasi menurunkan sheet ke peek agar peta bebas ketuk (SPEC §17).
  const handleLocate = useCallback(async () => {
    const pos = await locate(); // gagal → toast 'Lokasi tidak tersedia.' di dalam
    if (pos) snapTo(0);
  }, [locate, snapTo]);

  const handleStartAdd = useCallback(() => {
    setPhase('pin');
    setPin(null);
    snapTo(0); // alur peta menurunkan sheet (SPEC §17)
  }, [snapTo]);

  const handleLanjut = useCallback(() => {
    setPhase('form');
    addSheetRef.current?.present();
  }, []);

  // G2: sukses hanya setelah database konfirmasi; gagal membuka form dengan isi utuh.
  const handleSubmit = useCallback(
    async (payload: SpotPayload) => {
      setSubmitState('pending');
      try {
        await addPending(payload);
        setSubmitState('success');
      } catch {
        setSubmitState('error');
        showToast('Gagal mengirim spot. Periksa koneksi lalu coba lagi.');
      }
    },
    [addPending],
  );

  // Dipanggil saat modal benar-benar tertutup (dismiss gestur maupun tombol).
  const resetAddFlow = useCallback(() => {
    setPhase('idle');
    setPin(null);
    setSubmitState('idle');
  }, []);

  const handleAddCancel = useCallback(() => {
    addSheetRef.current?.dismiss();
  }, []);

  if (!ready) return null; // tema tersimpan diterapkan sebelum render pertama

  return (
    <View style={styles.flex}>
      {/* Peta penuh di belakang — satu DOM, dua susunan tidak ada di RN (SPEC §1) */}
      <View style={StyleSheet.absoluteFill}>
        <MapPane
          spots={filteredSpots}
          pinMode={phase === 'pin'}
          selectedId={selectedId}
          userPos={userPos}
          onSelect={handleSelect}
          onPinPlaced={handlePinPlaced}
          onLocate={handleLocate}
        />
      </View>

      <BottomSheet
        ref={listSheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        animationConfigs={sheetAnimation}
        backgroundStyle={{ backgroundColor: tokens.surface }}
        handleIndicatorStyle={{ backgroundColor: tokens.ink2 }}
      >
        {selectedSpot ? (
          <SpotDetail
            spot={selectedSpot}
            onClose={handleDetailClose}
            onVerify={handleVerify}
          />
        ) : (
          <SpotList
            spots={filteredSpots}
            query={query}
            type={type}
            pendingMine={pendingMine}
            userPos={userPos}
            onQueryChange={setQuery}
            onTypeChange={setType}
            onSelect={handleSelect}
            onHeaderLayout={setPeekHeight}
          />
        )}
      </BottomSheet>

      <BottomSheetModal
        ref={addSheetRef}
        snapPoints={[winH - insets.top - 24]}
        enableDynamicSizing={false}
        animationConfigs={sheetAnimation}
        onDismiss={resetAddFlow}
        backgroundStyle={{ backgroundColor: tokens.surface }}
        handleIndicatorStyle={{ backgroundColor: tokens.ink2 }}
      >
        <View style={styles.flex}>
          <AddSpotSheet
            active={phase === 'form'}
            pin={pin}
            submitState={submitState}
            onCancel={handleAddCancel}
            onSubmit={handleSubmit}
          />
        </View>
      </BottomSheetModal>

      {/* FAB tersembunyi saat alur tambah aktif atau detail terbuka (SPEC §17) */}
      {phase === 'idle' && !selectedSpot ? (
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: insets.bottom + 16, backgroundColor: tokens.primary },
          ]}
          activeOpacity={0.85}
          onPress={handleStartAdd}
          accessibilityRole="button"
          accessibilityLabel="Tambah spot baru"
        >
          <Text style={[styles.fabText, { color: tokens.onPrimary }]}>
            + Tambah
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Banner mode pin — 'Lanjut' mati sampai pin ada (SPEC §17, pin jujur) */}
      {phase === 'pin' ? (
        <View style={[styles.bannerWrap, { bottom: insets.bottom + 16 }]}>
          <View style={[styles.banner, { backgroundColor: tokens.surface }]}>
            <Text style={[styles.bannerText, { color: tokens.ink }]}>
              Ketuk peta untuk menaruh pin
            </Text>
            <TouchableOpacity
              style={[
                styles.lanjutBtn,
                { backgroundColor: pin ? tokens.primary : tokens.surface2 },
              ]}
              disabled={!pin}
              onPress={handleLanjut}
              accessibilityRole="button"
              accessibilityLabel="Lanjut ke form tambah spot"
            >
              <Text
                style={[
                  styles.lanjutText,
                  { color: pin ? tokens.onPrimary : tokens.ink2 },
                ]}
              >
                Lanjut
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ToastHost />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!fontsLoaded) return null; // font + tema siap sebelum render pertama

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SpotProvider>
            <BottomSheetModalProvider>
              <StatusBar />
              <Shell />
              <ToastHost />
            </BottomSheetModalProvider>
          </SpotProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  bannerWrap: { position: 'absolute', left: 16, right: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
  },
  bannerText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
  },
  lanjutBtn: {
    minWidth: 96,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lanjutText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
});
