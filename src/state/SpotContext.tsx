// src/state/SpotContext.tsx — shared state contract (SPEC §8).
// App.tsx owns the provider and drives it: the provider NEVER fetches on its
// own — App calls load() when it wants the initial read. Components consume
// useSpots() (or receive props) and never touch the database directly (G3).
//
// pendingMine persists to AsyncStorage under exactly 'singgah-pending-mine'
// (the v0.1 localStorage key, preserved). Storage failures never crash the
// app — the database stays the source of truth; the local copy is a conveni-
// ence view of this user's own pending spots ('Tinjauan saya').
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bumpVerified,
  insertPendingSpot,
  loadApprovedSpots,
  type SPOT,
  type SpotPayload,
  type SpotType,
} from '../lib/supabase';

// SPEC §8 — persisted under the exact v0.1 key.
const PENDING_MINE_KEY = 'singgah-pending-mine';

// The five legal types (SPEC §6) — also exported standalone for chips/legend.
export const TYPES: SpotType[] = [
  'masjid_besar',
  'musala',
  'terminal',
  'spbu',
  'rest_area',
];

type SpotContextValue = {
  spots: SPOT[]; // approved spots only
  pendingMine: SPOT[]; // this user's own pending spots ('Tinjauan saya')
  query: string; // search text ('' = no query)
  // Domain type — chips adalah satu-satunya penulis, jadi '' | SpotType (bukan string)
  type: '' | SpotType; // selected chip ('' = all)
  filteredSpots: SPOT[]; // memo — drives list AND map so they move together
  TYPES: SpotType[];
  load: () => Promise<void>;
  addPending: (payload: SpotPayload) => Promise<SPOT>;
  markVerified: (spotId: string) => Promise<void>;
  // Root-only setters: App.tsx wires SpotList's onQueryChange/onTypeChange to
  // these (SPEC §9 — callbacks up). Not part of the §8 table but required for
  // the query/type members to be writable anywhere at all.
  setQuery: (query: string) => void;
  setType: (type: '' | SpotType) => void;
};

const SpotContext = createContext<SpotContextValue | null>(null);

export function SpotProvider({ children }: { children: React.ReactNode }) {
  const [spots, setSpots] = useState<SPOT[]>([]);
  const [pendingMine, setPendingMine] = useState<SPOT[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'' | SpotType>('');
  // true once the stored pendingMine has been read — the persist effect below
  // must not write '[]' over the stored rows before hydration finishes.
  const hydrated = useRef(false);

  // Hydrate pendingMine once on mount. Corrupt/unavailable storage is caught:
  // the app stays usable and simply starts with an empty local view (SPEC §8).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_MINE_KEY);
        if (!alive || raw === null) return;
        // Rows here were written only by addPending below (SPOT-shaped);
        // still, parsing runs through `unknown` and a shape check.
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setPendingMine(parsed as SPOT[]);
      } catch {
        // Storage read/parse failed — keep going with an empty list.
      } finally {
        hydrated.current = true;
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Persist on every change AFTER hydration (writes are idempotent JSON).
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(PENDING_MINE_KEY, JSON.stringify(pendingMine)).catch(
      () => {
        // Write failed — not fatal: pending rows live in the database and
        // reappear after approval; the local list just stays as-is.
      },
    );
  }, [pendingMine]);

  // Initial read. Errors propagate to the caller (App toasts honestly, G2).
  const load = useCallback(async () => {
    const rows = await loadApprovedSpots();
    setSpots(rows);
  }, []);

  // Submit + record locally. The returned row's `id` is the locally built
  // display key (see insertPendingSpot) — the database id appears only after
  // the owner approves the spot in the Supabase dashboard.
  const addPending = useCallback(async (payload: SpotPayload): Promise<SPOT> => {
    const row = await insertPendingSpot(payload);
    setPendingMine((prev) => [row, ...prev]);
    return row;
  }, []);

  // Verification bump. G2: a refused bump (`ok:false`) THROWS — rate limit is
  // failure and the UI must never pretend success. The refreshed row replaces
  // the matching entry in `spots`; if the same id exists in pendingMine its
  // copy is updated too (defensive — a pending id can never bump, but the
  // swap is harmless and keeps both lists consistent).
  const markVerified = useCallback(async (spotId: string): Promise<void> => {
    const { ok, spot } = await bumpVerified(spotId);
    if (!ok || spot === null) {
      throw new Error(
        !ok
          ? 'Verifikasi ditolak: batas 1 verifikasi per spot per jam.'
          : 'Verifikasi tercatat, tetapi baris spot tidak dapat dibaca ulang.',
      );
    }
    setSpots((prev) => prev.map((s) => (s.id === spotId ? spot : s)));
    setPendingMine((prev) => prev.map((s) => (s.id === spotId ? spot : s)));
  }, []);

  // query matches name case-insensitively (contains); type '' = all. One memo
  // drives both the list and the map so they always move together (SPEC §8).
  const filteredSpots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots.filter((spot) => {
      const matchType = type === '' || spot.type === type;
      const matchQuery = q === '' || spot.name.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [spots, query, type]);

  const value = useMemo<SpotContextValue>(
    () => ({
      spots,
      pendingMine,
      query,
      type,
      filteredSpots,
      TYPES,
      load,
      addPending,
      markVerified,
      setQuery,
      setType,
    }),
    [spots, pendingMine, query, type, filteredSpots, load, addPending, markVerified],
  );

  return <SpotContext.Provider value={value}>{children}</SpotContext.Provider>;
}

export function useSpots(): SpotContextValue {
  const ctx = useContext(SpotContext);
  if (!ctx) {
    throw new Error('useSpots harus dipakai di dalam SpotProvider');
  }
  return ctx;
}
