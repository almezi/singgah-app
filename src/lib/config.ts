// src/lib/config.ts — the ONLY file allowed to hold these constants (SPEC §4).
// Credentials come from the environment (OQ-B): the owner fills .env (git-ignored)
// using .env.example as the template. A missing key must not crash the app —
// supabase.ts wraps client creation in try/catch and the UI degrades gracefully.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// OSM raster tiles — network-only, never cached or bundled (SPEC §16, OSM tile
// policy). Attribution `© OpenStreetMap contributors` is mandatory and must stay
// visible on the map (ODbL) — the map style carries it (src/lib/mapStyle.ts).
export const TILE_URL = [
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
];
