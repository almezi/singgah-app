/**
 * Bug Condition Exploration Test: MapLibre TILE_URL Format
 * 
 * This test verifies that TILE_URL is properly formatted as an array with OSM subdomains.
 * MapLibre requires tile URLs to be in an array format with subdomain pattern for optimal loading.
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * 
 * Validates: Requirements 1.1, 1.2
 */

import { test, expect } from 'vitest';
import * as fc from 'fast-check';

// Import from actual source files - the fix changes TILE_URL to an array
import { TILE_URL } from '../src/lib/config';

// Define the expected subdomain pattern for OSM tiles
const OSM_SUBDOMAINS = ['a.tile.openstreetmap.org', 'b.tile.openstreetmap.org', 'c.tile.openstreetmap.org'];

/**
 * Property 1: TILE_URL must be an array
 * 
 * MapLibre requires tile sources to be configured as arrays for proper URL template handling.
 * A single string URL will cause "Unable to parse resourceUrl" errors.
 */
test('TILE_URL must be an array', () => {
  fc.assert(
    fc.property(fc.anything(), () => {
      // This is the bug condition: TILE_URL is currently a string, not an array
      const result = Array.isArray(TILE_URL);
      if (!result) {
        throw new Error(`TILE_URL should be an array but got: ${typeof TILE_URL} - "${TILE_URL}"`);
      }
      expect(result).toBe(true);
    })
  );
});

/**
 * Property 2: TILE_URL array must contain URLs with OSM subdomains
 * 
 * The array should contain URLs using a.tile.openstreetmap.org, b.tile.openstreetmap.org, 
 * and c.tile.openstreetmap.org for optimal tile loading performance.
 */
test('TILE_URL array must contain URLs with OSM subdomains', () => {
  fc.assert(
    fc.property(fc.anything(), () => {
      // First check it's an array
      if (!Array.isArray(TILE_URL)) {
        throw new Error(`TILE_URL should be an array but got: ${typeof TILE_URL} - "${TILE_URL}"`);
      }
      
      // Check each URL contains the expected subdomains
      const missingSubdomains: string[] = [];
      
      for (const subdomain of OSM_SUBDOMAINS) {
        const found = TILE_URL.some(url => 
          typeof url === 'string' && url.includes(subdomain)
        );
        if (!found) {
          missingSubdomains.push(subdomain);
        }
      }
      
      if (missingSubdomains.length > 0) {
        throw new Error(
          `TILE_URL is missing required OSM subdomains: ${missingSubdomains.join(', ')}. ` +
          `Current TILE_URL: ${JSON.stringify(TILE_URL)}`
        );
      }
      
      expect(TILE_URL.length).toBe(3);
    })
  );
});

/**
 * Property 3: TILE_URL must have valid URL template format
 * 
 * Each URL in the array must be a valid URL template with {z}, {x}, {y} placeholders
 */
test('TILE_URL must have valid URL template format with {z}/{x}/{y} placeholders', () => {
  fc.assert(
    fc.property(fc.anything(), () => {
      if (!Array.isArray(TILE_URL)) {
        throw new Error(`TILE_URL should be an array but got: ${typeof TILE_URL} - "${TILE_URL}"`);
      }
      
      const hasValidTemplate = TILE_URL.every(url => 
        typeof url === 'string' && 
        url.includes('{z}') && 
        url.includes('{x}') && 
        url.includes('{y}')
      );
      
      if (!hasValidTemplate) {
        throw new Error(
          `TILE_URL must contain valid URL templates with {z}/{x}/{y} placeholders. ` +
          `Current TILE_URL: ${JSON.stringify(TILE_URL)}`
        );
      }
      
      expect(hasValidTemplate).toBe(true);
    })
  );
});