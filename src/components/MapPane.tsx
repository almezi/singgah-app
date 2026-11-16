// src/components/MapPane.tsx — peta penuh Singgah (SPEC §9 + §17, gelombang W2/W1b).
//
// Kontrak (props turun, callback naik — G1/G3/G6):
//   spots        : SPOT[] hasil filter (dari App, TIDAK dari Supabase langsung)
//   pinMode      : mode taruh-pin (dari alur `+ Tambah` milik App)
//   selectedId   : spot yang terpilih (highlight di peta)
//   userPos      : posisi pengguna (App memanggil useGeolocation → onLocate)
//   onSelect     : intent "buka detail spot"
//   onPinPlaced  : intent "pin diletakkan/dipindah" (tap peta atau selesai drag)
//   onLocate     : intent "cari posisi saya" (App yang memanggil useGeolocation)
//
// Performa (G7): marker ribuan titik dirender lewat native GeoJSONSource dengan
// `cluster: true` + CircleLayer/SymbolLayer (bukan PointAnnotation per spot).
// Redraw source di-debounce 250 ms; highlight spot terpilih memakai feature-state
// sehingga mengetik filter cepat tidak memicu recluster.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
  type CameraRef,
  type GeoJSONSourceRef,
  type LngLat,
  type PressEvent,
  type PressEventWithFeatures,
  type ViewAnnotationEvent,
} from '@maplibre/maplibre-react-native';
import { mapStyleDark, mapStyleLight } from '../lib/mapStyle';
import { SPOT_TYPES } from '../lib/spotView';
import { useTheme } from '../theme/tokens';
import type { SPOT } from '../lib/supabase';
// Ketat seperti prop `paint` Layer (bukan tipe Expression longgar legacy).
import type { DataDrivenPropertyValueSpecification } from '@maplibre/maplibre-gl-style-spec';

export type MapPaneProps = {
  /** Spot approved hasil filter — satu sumber untuk peta & daftar (SPEC §8). */
  spots: SPOT[];
  /** True saat alur `+ Tambah` aktif: ketuk peta menaruh pin. */
  pinMode: boolean;
  /** Spot terpilih — diberi halo lebih besar (feature-state, tanpa rebuild data). */
  selectedId: string | null;
  /** Posisi pengguna terakhir dari App (null = belum ada fix). */
  userPos: { lat: number; lng: number } | null;
  onSelect: (spotId: string) => void;
  onPinPlaced: (lat: number, lng: number) => void;
  onLocate: () => void;
};

// Konstanta peta — koordinat/zoom, bukan dimensi layar (yang itu lewat insets).
const DEFAULT_CENTER: LngLat = [110.3695, -7.7956]; // Yogyakarta
const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19; // batas tile raster OSM
const USER_ZOOM = 15.5;
const CLUSTER_EXPAND_MAX_ZOOM = 17;
const MARKER_DEBOUNCE_MS = 250; // G7: debounce redraw marker ≥ 200 ms
const CAMERA_DURATION_MS = 450;

const SPOTS_SOURCE_ID = 'singgah-spots';

// Font peta: Plus Jakarta Sans dibundle expo-font (App.tsx). MapLibre memakai
// font lokal saat style tanpa `glyphs` — daftar nama dicoba berurutan per
// platform (nama keluarga RN di Android, nama keluarga sistem di iOS).
const MAP_FONT_STACK = ['PlusJakartaSans_700Bold', 'Plus Jakarta Sans'];

// Huruf glyph per tipe (fallback "never color alone", SPEC §12): M = Masjid Besar,
// U = musala, T = Terminal, S = SPBU, R = Rest Area.
const TYPE_LETTERS: Record<string, string> = {
  masjid_besar: 'M',
  musala: 'U',
  terminal: 'T',
  spbu: 'S',
  rest_area: 'R',
};

// Path SVG statis (G8 — hanya konstanta modul, tidak pernah interpolasi data).
const PIN_PATH =
  'M12 0C5.37 0 0 5.37 0 12C0 18 8.5 25.5 11.1 28.3C11.6 28.9 12.4 28.9 12.9 28.3C15.5 25.5 24 18 24 12C24 5.37 18.63 0 12 0Z';

// Properti fitur yang dibaca dari event press / ekspresi style.
type SpotFeatureProps = {
  cluster?: boolean;
  cluster_id?: number;
  sid?: string;
  type?: string;
};

/** Bangun GeoJSON FeatureCollection dari SPOT[] (di-memoize pemanggilnya). */
function buildFeatureCollection(spots: SPOT[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      id: spot.id,
      geometry: { type: 'Point', coordinates: [spot.lng, spot.lat] },
      properties: { type: spot.type, sid: spot.id },
    })),
  };
}

/** Ikon target geolokasi — SVG statis, warna dari tokens. */
function LocateIcon({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={12} cy={12} r={3} fill={color} />
      <Path
        d="M12 1.5V5M12 19V22.5M1.5 12H5M19 12H22.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Pin taruh-lokasi — SVG statis warna primary dengan titik kontras. */
function PinGlyph({ fill, dot }: { fill: string; dot: string }) {
  return (
    <Svg width={30} height={38} viewBox="0 0 24 30">
      <Path d={PIN_PATH} fill={fill} stroke={dot} strokeWidth={1.5} />
      <Circle cx={12} cy={11} r={4} fill={dot} />
    </Svg>
  );
}

export function MapPane({
  spots,
  pinMode,
  selectedId,
  userPos,
  onSelect,
  onPinPlaced,
  onLocate,
}: MapPaneProps) {
  const { theme, tokens, tints } = useTheme();
  const insets = useSafeAreaInsets();

  const [reduceMotion, setReduceMotion] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  const cameraRef = useRef<CameraRef | null>(null);
  const sourceRef = useRef<GeoJSONSourceRef | null>(null);

  // ---- Hormati preferensi reduce motion (G8) untuk animasi kamera ----
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduceMotion(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  // ---- Data marker: debounce + memoize (G7) ----
  // Render pertama langsung; perubahan cepat (ketikan filter) ditahan 250 ms.
  const [debouncedSpots, setDebouncedSpots] = useState<SPOT[]>(spots);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSpots(spots), MARKER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [spots]);

  const spotsJson = useMemo(
    () => JSON.stringify(buildFeatureCollection(debouncedSpots)),
    [debouncedSpots],
  );

  // ---- Highlight spot terpilih lewat feature-state (tanpa rebuild data) ----
  const selectedIdRef = useRef<string | null>(selectedId);
  const prevSelectedRef = useRef<string | null>(null);

  const syncSelectionState = useCallback(() => {
    const source = sourceRef.current;
    const current = selectedIdRef.current;
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = current;
    if (!source) return;
    void (async () => {
      try {
        if (prev !== null && prev !== current) {
          await source.removeFeatureState({ id: prev });
        }
        if (current !== null) {
          await source.setFeatureState({ id: current }, { selected: true });
        }
      } catch {
        // Sumber/fitur belum siap (peta masih memuat) — menyusul pada sinkron berikutnya.
      }
    })();
  }, []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    syncSelectionState();
  }, [selectedId, spotsJson, syncSelectionState]);

  // Setelah style selesai dimuat (juga saat tema berganti), state fitur di-reset
  // oleh native — terapkan ulang highlight.
  const handleMapLoaded = useCallback(() => {
    prevSelectedRef.current = null;
    syncSelectionState();
  }, [syncSelectionState]);

  // ---- Kamera: animasi kalem, langsung bila reduce motion ----
  const animateTo = useCallback(
    (lat: number, lng: number, zoom: number) => {
      const camera = cameraRef.current;
      if (!camera) return;
      const center: LngLat = [lng, lat];
      if (reduceMotion) {
        camera.jumpTo({ center, zoom });
      } else {
        camera.easeTo({ center, zoom, duration: CAMERA_DURATION_MS });
      }
    },
    [reduceMotion],
  );

  // Fix lokasi baru → terbang ke posisi pengguna (dipicu tombol Lokasikan saya).
  useEffect(() => {
    if (userPos) animateTo(userPos.lat, userPos.lng, USER_ZOOM);
  }, [userPos, animateTo]);

  // ---- Interaksi marker (press pada sumber; hitbox default 44×44) ----
  const handleSourcePress = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      if (pinMode) return; // mode pin: biarkan ketukan naik ke Map (menaruh pin)
      const feature = event.nativeEvent.features[0];
      if (!feature) return;
      const props = (feature.properties ?? {}) as SpotFeatureProps;
      const clusterId = props.cluster_id;
      if (typeof clusterId === 'number') {
        const [lng, lat] = event.nativeEvent.lngLat;
        const source = sourceRef.current;
        void (async () => {
          try {
            const zoom = source
              ? await source.getClusterExpansionZoom(clusterId)
              : null;
            if (typeof zoom === 'number') {
              animateTo(
                lat,
                lng,
                Math.min(zoom + 0.2, CLUSTER_EXPAND_MAX_ZOOM),
              );
            }
          } catch {
            // Cluster sudah tidak ada (peta berubah) — abaikan.
          }
        })();
        return;
      }
      if (typeof props.sid === 'string' && props.sid !== '') {
        onSelect(props.sid);
      }
    },
    [pinMode, onSelect, animateTo],
  );

  // ---- Mode pin: ketuk peta → taruh/mindah pin ----
  const handleMapPress = useCallback(
    (
      event:
        | NativeSyntheticEvent<PressEvent>
        | NativeSyntheticEvent<PressEventWithFeatures>,
    ) => {
      if (!pinMode) return;
      const [lng, lat] = event.nativeEvent.lngLat;
      setPin({ lat, lng });
      onPinPlaced(lat, lng);
    },
    [pinMode, onPinPlaced],
  );

  // Selesai drag pin → koordinat baru.
  const handlePinDragEnd = useCallback(
    (event: NativeSyntheticEvent<ViewAnnotationEvent>) => {
      const [lng, lat] = event.nativeEvent.lngLat;
      setPin({ lat, lng });
      onPinPlaced(lat, lng);
    },
    [onPinPlaced],
  );

  // Keluar mode pin → pin hilang (posisi pin TIDAK dibawa balik ke mode ini).
  useEffect(() => {
    if (!pinMode) setPin(null);
  }, [pinMode]);

  // ---- Ekspresi & warna layer (semua dari tokens/tints — G5) ----
  const mapStyle = theme === 'dark' ? mapStyleDark : mapStyleLight;

  const selectedRadius = useMemo(
    () =>
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        15,
        11,
      ] as DataDrivenPropertyValueSpecification<number>,
    [],
  );
  const selectedStrokeWidth = useMemo(
    () =>
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        3.5,
        1.5,
      ] as DataDrivenPropertyValueSpecification<number>,
    [],
  );
  const haloRadius = useMemo(
    () =>
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        22,
        0,
      ] as DataDrivenPropertyValueSpecification<number>,
    [],
  );
  const haloOpacity = useMemo(
    () =>
      [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        0.25,
        0,
      ] as DataDrivenPropertyValueSpecification<number>,
    [],
  );

  // Lingkaran titik tunggal memakai warna tipe (tints[cls].main) lewat `match`.
  const typeColorPairs = useMemo(() => {
    const pairs: string[] = [];
    (Object.keys(SPOT_TYPES) as Array<keyof typeof SPOT_TYPES>).forEach((type) => {
      pairs.push(type, tints[SPOT_TYPES[type].cls].main);
    });
    return pairs;
  }, [tints]);

  const singleCircleColor = useMemo(
    () =>
      // TS tidak bisa meng-infer tuple match dengan spread — cast lewat unknown.
      ['match', ['get', 'type'], ...typeColorPairs, tokens.ink2] as unknown as DataDrivenPropertyValueSpecification<string>,
    [typeColorPairs, tokens],
  );

  const letterField = useMemo(
    () =>
      [
        'match',
        ['get', 'type'],
        ...Object.entries(TYPE_LETTERS).flat(),
        '',
      ] as unknown as DataDrivenPropertyValueSpecification<string>,
    [],
  );

  const clusterRadiusStep = useMemo(
    () =>
      [
        'step',
        ['get', 'point_count'],
        16,
        10,
        20,
        50,
        26,
      ] as DataDrivenPropertyValueSpecification<number>,
    [],
  );

  const clusterCountField = useMemo(
    () =>
      [
        'coalesce',
        ['get', 'point_count_abbreviated'],
        ['to-string', ['get', 'point_count']],
      ] as DataDrivenPropertyValueSpecification<string>,
    [],
  );

  // Style bergantung tema (dibangun ulang saat tokens berganti).
  const themeStyles = useMemo(
    () =>
      StyleSheet.create({
        locate: {
          backgroundColor: tokens.surface,
          borderColor: tokens.surface2,
        },
        userHalo: { backgroundColor: tokens.water, opacity: 0.3 },
        userDot: { backgroundColor: tokens.water, borderColor: tokens.surface },
      }),
    [tokens],
  );

  return (
    <View style={styles.root}>
      <Map
        style={styles.map}
        mapStyle={mapStyle}
        onPress={handleMapPress}
        onDidFinishLoadingMap={handleMapLoaded}
        attribution
        attributionPosition={{ top: 8, right: 8 }} // atribusi wajib, tidak tertutup kontrol
        logo
        logoPosition={{ top: 8, left: 8 }}
        compass={false}
        scaleBar={false}
        accessibilityLabel="Peta spot muat dan istirahat"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
        />

        <GeoJSONSource
          id={SPOTS_SOURCE_ID}
          data={spotsJson}
          cluster
          clusterRadius={48}
          clusterMaxZoom={14}
          onPress={handleSourcePress}
        >
          {/* Halo spot terpilih — layer paling bawah dari marker titik tunggal */}
          <Layer
            id="spot-selected-halo"
            type="circle"
            filter={['!has', 'point_count']}
            paint={{
              'circle-radius': haloRadius,
              'circle-color': tokens.primary,
              'circle-opacity': haloOpacity,
            }}
          />
          {/* Titik tunggal per tipe: lingkaran warna tipe + stroke kontras */}
          <Layer
            id="spot-point"
            type="circle"
            filter={['!has', 'point_count']}
            paint={{
              'circle-radius': selectedRadius,
              'circle-color': singleCircleColor,
              'circle-stroke-width': selectedStrokeWidth,
              'circle-stroke-color': tokens.surface,
            }}
          />
          {/* Huruf glyph tipe (never color alone) — teks putih di atas lingkaran */}
          <Layer
            id="spot-letter"
            type="symbol"
            filter={['!has', 'point_count']}
            layout={{
              'text-field': letterField,
              'text-font': MAP_FONT_STACK,
              'text-size': 11,
              'text-allow-overlap': false,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': tokens.onPrimary }}
          />
          {/* Lingkaran cluster — warna primary, ukuran mengikuti jumlah titik */}
          <Layer
            id="spot-cluster"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-radius': clusterRadiusStep,
              'circle-color': tokens.primary,
              'circle-stroke-width': 2,
              'circle-stroke-color': tokens.surface,
            }}
          />
          {/* Jumlah titik pada cluster — Plus Jakarta Sans tebal */}
          <Layer
            id="spot-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': clusterCountField,
              'text-font': MAP_FONT_STACK,
              'text-size': 12,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            }}
            paint={{ 'text-color': tokens.onPrimary }}
          />
        </GeoJSONSource>

        {/* Titik pengguna — annotation tunggal (bukan bagian source bercluster) */}
        {userPos ? (
          <ViewAnnotation
            id="user-position"
            lngLat={[userPos.lng, userPos.lat]}
            anchor="center"
          >
            <View style={[styles.userHalo, themeStyles.userHalo]}>
              <View style={[styles.userDot, themeStyles.userDot]} />
            </View>
          </ViewAnnotation>
        ) : null}

        {/* Pin taruh-lokasi — PointAnnotation tunggal yang bisa digeser */}
        {pinMode && pin ? (
          <ViewAnnotation
            id="pin-drop"
            lngLat={[pin.lng, pin.lat]}
            anchor="bottom"
            draggable
            onDragEnd={handlePinDragEnd}
          >
            <View collapsable={false}>
              <PinGlyph fill={tokens.primary} dot={tokens.onPrimary} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>

      {/* Tombol geolokasi — kiri bawah, aman dari safe area (SPEC §17) */}
      <TouchableOpacity
        style={[
          styles.locate,
          themeStyles.locate,
          {
            width: tokens.touchMin,
            height: tokens.touchMin,
            borderRadius: tokens.radiusButton,
            left: 12,
            bottom: insets.bottom + 12,
          },
        ]}
        onPress={onLocate}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Lokasikan saya"
        accessibilityHint="Cari posisi Anda dan dekatkan peta ke sana"
      >
        <LocateIcon color={tokens.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  locate: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userHalo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
