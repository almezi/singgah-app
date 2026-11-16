/**
 * Preservation Property Tests: Non-Tile URL Features
 * 
 * These tests verify that all non-tile URL features continue to work correctly
 * before and after the fix. They test the baseline behavior that should be preserved.
 * 
 * **IMPORTANT**: These tests should PASS on unfixed code - they confirm baseline behavior.
 * 
 * Validates: Requirements 3.1, 3.2, 3.3
 */

import { test, expect, describe } from 'vitest';
import * as fc from 'fast-check';

// Import from actual source files
import { TILE_URL } from '../src/lib/config';
import { mapStyleLight, mapStyleDark, OSM_ATTRIBUTION } from '../src/lib/mapStyle';
import { SPOT_TYPES, TYPE_GLYPHS, SpotType } from '../src/lib/spotView';
import { light, dark } from '../src/theme/tokens';

describe('Property 1: mapStyle builds correctly', () => {
  /**
   * Test that mapStyleLight is a valid StyleSpecification with required structure
   */
  test('mapStyleLight has valid structure', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        // Verify it's a valid object
        expect(mapStyleLight).toBeDefined();
        expect(typeof mapStyleLight).toBe('object');
        
        // Verify version
        expect(mapStyleLight.version).toBe(8);
        
        // Verify sources exist
        expect(mapStyleLight.sources).toBeDefined();
        expect(mapStyleLight.sources['osm-raster']).toBeDefined();
        
        // Verify raster source properties
        const source = mapStyleLight.sources['osm-raster'] as any;
        expect(source.type).toBe('raster');
        expect(source.tileSize).toBe(256);
        expect(source.attribution).toBe(OSM_ATTRIBUTION);
        
        // Verify tiles array exists (even if incorrectly formatted - that's the bug)
        expect(Array.isArray(source.tiles)).toBe(true);
        expect(source.tiles.length).toBeGreaterThan(0);
      })
    );
  });

  /**
   * Test that mapStyleDark has valid structure
   */
  test('mapStyleDark has valid structure', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        expect(mapStyleDark).toBeDefined();
        expect(mapStyleDark.version).toBe(8);
        expect(mapStyleDark.sources).toBeDefined();
        expect(mapStyleDark.sources['osm-raster']).toBeDefined();
        
        const source = mapStyleDark.sources['osm-raster'] as any;
        expect(source.type).toBe('raster');
        expect(source.tileSize).toBe(256);
        expect(source.attribution).toBe(OSM_ATTRIBUTION);
      })
    );
  });

  /**
   * Test that both styles have background layer with correct theme colors
   */
  test('mapStyle has background layer with theme colors', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        // Light style uses light.bg
        const lightLayers = mapStyleLight.layers as any[];
        const lightBgLayer = lightLayers.find(l => l.id === 'singgah-bg');
        expect(lightBgLayer).toBeDefined();
        expect(lightBgLayer.type).toBe('background');
        expect(lightBgLayer.paint?.['background-color']).toBe(light.bg);
        
        // Dark style uses dark.bg
        const darkLayers = mapStyleDark.layers as any[];
        const darkBgLayer = darkLayers.find(l => l.id === 'singgah-bg');
        expect(darkBgLayer).toBeDefined();
        expect(darkBgLayer.type).toBe('background');
        expect(darkBgLayer.paint?.['background-color']).toBe(dark.bg);
      })
    );
  });
});

describe('Property 2: Spot types configuration preserved', () => {
  /**
   * Test that all required spot types are defined
   */
  test('all spot types are defined', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const expectedTypes: SpotType[] = ['masjid_besar', 'musala', 'terminal', 'spbu', 'rest_area'];
        
        for (const spotType of expectedTypes) {
          expect(SPOT_TYPES[spotType]).toBeDefined();
          expect(SPOT_TYPES[spotType].label).toBeDefined();
          expect(SPOT_TYPES[spotType].cls).toBeDefined();
        }
      })
    );
  });

  /**
   * Test that all spot types have valid glyphs
   */
  test('all spot types have glyphs', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const expectedTypes: SpotType[] = ['masjid_besar', 'musala', 'terminal', 'spbu', 'rest_area'];
        
        for (const spotType of expectedTypes) {
          expect(TYPE_GLYPHS[spotType]).toBeDefined();
          expect(typeof TYPE_GLYPHS[spotType]).toBe('string');
          expect(TYPE_GLYPHS[spotType].length).toBeGreaterThan(0);
        }
      })
    );
  });
});

describe('Property 3: TILE_URL constant is accessible', () => {
  /**
   * Test that TILE_URL constant exists and is accessible
   * (even if incorrectly formatted - that's the bug we're fixing)
   */
  test('TILE_URL constant is defined', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        expect(TILE_URL).toBeDefined();
        // Should be either string or array (we test the format separately)
        expect(typeof TILE_URL === 'string' || Array.isArray(TILE_URL)).toBe(true);
      })
    );
  });
});

describe('Property 4: Theme switching works correctly', () => {
  /**
   * Test that light and dark theme tokens have different background colors
   */
  test('light and dark themes have different background colors', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        expect(light.bg).toBeDefined();
        expect(dark.bg).toBeDefined();
        expect(light.bg).not.toBe(dark.bg);
      })
    );
  });

  /**
   * Test that theme tokens have valid color format
   */
  test('theme colors are valid hex colors', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        expect(hexColorRegex.test(light.bg)).toBe(true);
        expect(hexColorRegex.test(dark.bg)).toBe(true);
      })
    );
  });
});

describe('Property 5: Raster source configuration preserved', () => {
  /**
   * Test that raster source exists in both styles
   */
  test('raster source exists in both styles', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const lightSource = (mapStyleLight.sources as any)['osm-raster'];
        const darkSource = (mapStyleDark.sources as any)['osm-raster'];
        
        expect(lightSource).toBeDefined();
        expect(darkSource).toBeDefined();
        expect(lightSource.type).toBe('raster');
        expect(darkSource.type).toBe('raster');
      })
    );
  });

  /**
   * Test that tileSize is correctly set
   */
  test('tileSize is correctly set to 256', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const lightSource = (mapStyleLight.sources as any)['osm-raster'];
        const darkSource = (mapStyleDark.sources as any)['osm-raster'];
        
        expect(lightSource.tileSize).toBe(256);
        expect(darkSource.tileSize).toBe(256);
      })
    );
  });

  /**
   * Test that attribution is present
   */
  test('attribution is present and correct', () => {
    fc.assert(
      fc.property(fc.anything(), () => {
        const lightSource = (mapStyleLight.sources as any)['osm-raster'];
        const darkSource = (mapStyleDark.sources as any)['osm-raster'];
        
        expect(lightSource.attribution).toBe(OSM_ATTRIBUTION);
        expect(darkSource.attribution).toBe(OSM_ATTRIBUTION);
        expect(lightSource.attribution).toContain('OpenStreetMap');
      })
    );
  });
});