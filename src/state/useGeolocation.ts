// src/state/useGeolocation.ts — geolocation wrapper (SPEC §8).
//
// G6 EXCEPTION (deliberate, per the data-layer task): this hook is ROOT-OWNED
// — App.tsx is the only place that calls useGeolocation() and passes
// `position` / `locate()` down as props. Because the root owns it, showToast
// from here is allowed; it is the same writer that owns ToastHost. Regular
// components must NEVER call showToast (grep gate: `grep -rn "showToast"
// src/components/` stays empty) — they emit intent via callbacks instead.
//
// Failure behavior: a denied permission or a failed fix shows the exact toast
// 'Lokasi tidak tersedia.' and returns null — the app stays fully usable
// without location (SPEC §8, manual checklist item: denied permission still
// leaves the app usable).
import { useCallback, useState } from 'react';
import * as Location from 'expo-location';
import { showToast } from '../lib/toast';

export type GeoPosition = { lat: number; lng: number };

type GeolocationState = {
  position: GeoPosition | null;
  loading: boolean;
  locate: () => Promise<GeoPosition | null>;
};

// Accuracy trade-off: 'Balanced' (~100 m) — this is a wash/rest finder, not
// turn-by-turn navigation; cheap fixes keep the mobile-data budget (G7).
const ACCURACY = Location.Accuracy.Balanced;

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(async (): Promise<GeoPosition | null> => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        showToast('Lokasi tidak tersedia.');
        return null;
      }
      const fix = await Location.getCurrentPositionAsync({ accuracy: ACCURACY });
      const next: GeoPosition = {
        lat: fix.coords.latitude,
        lng: fix.coords.longitude,
      };
      setPosition(next);
      return next;
    } catch {
      // Provider failure / timeout / sensor off — same honest path as denial.
      showToast('Lokasi tidak tersedia.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { position, loading, locate };
}
