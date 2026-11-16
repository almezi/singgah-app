// src/lib/mapStyle.ts — style JSON MapLibre (raster OSM) untuk MapPane (SPEC §2, §11).
// Tile OSM network-only lewat konstanta TILE_URL (config.ts, satu-satunya rumah URL);
// atribusi `© OpenStreetMap contributors` WAJIB dan dibawa di field attribution sumber
// raster agar MapLibre menampilkannya di ornamen atribusi peta (ODbL, SPEC §11).
// Style diekspor sebagai objek (StyleSpecification), bukan file JSON.
// Warna diambil dari konstanta tokens — file ini tidak memuat hex langsung (G5).
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { dark, light } from '../theme/tokens';
import { TILE_URL } from './config';

// Atribusi wajib ODbL — satu konstanta, dipakai di sumber raster style.
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/**
 * Bangun style raster OSM dengan warna background dari parameter (bukan hex,
 * agar tema terang/gelap tetap satu sumber: tokens.ts).
 */
function buildRasterOsmStyle(background: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      'osm-raster': {
        type: 'raster',
        tiles: TILE_URL,
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      // Layer background tampil sebelum tile selesai dimuat / di tepi viewport.
      {
        id: 'singgah-bg',
        type: 'background',
        paint: { 'background-color': background },
      },
      // Layer raster utama — tile OSM.
      {
        id: 'osm-raster',
        type: 'raster',
        source: 'osm-raster',
      },
    ],
  };
}

// Dua objek style siap pakai — MapPane memilih lewat useTheme().theme.
// Tanpa field `glyphs`: teks pada SymbolLayer memakai font lokal (Plus Jakarta Sans
// yang dibundle expo-font), sesuai perilaku MapLibre untuk style tanpa glyphs.
export const mapStyleLight: StyleSpecification = buildRasterOsmStyle(light.bg);
export const mapStyleDark: StyleSpecification = buildRasterOsmStyle(dark.bg);
