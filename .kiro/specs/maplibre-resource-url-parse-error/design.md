# MapLibre Resource URL Parse Error Bugfix Design

## Overview

This document outlines the fix for the MapLibre "Unable to parse resourceUrl" error that occurs when the app tries to load OpenStreetMap (OSM) raster tiles. The bug manifests as a console error when the Map component initializes, preventing map tiles from displaying properly.

The root cause appears to be related to how MapLibre interprets the tile URL template. The current implementation uses a simple URL string with placeholders (`{z}/{x}/{y}`), but MapLibre may require additional configuration such as subdomain support for parallel tile requests.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the URL parse error - when the Map component initializes with an improperly formatted or incomplete tile URL configuration
- **Property (P)**: The desired behavior - map tiles should load successfully from the OSM tile server without URL parsing errors
- **Preservation**: Existing functionality that must remain unchanged after the fix (other MapLibre features, UI controls, theme switching)
- **TILE_URL**: The constant in `src/lib/config.ts` that defines the OSM tile server endpoint
- **mapStyle**: The StyleSpecification object in `src/lib/mapStyle.ts` that configures the MapLibre map display
- **raster source**: MapLibre's data source type for raster (image) tiles like OSM

## Bug Details

### Bug Condition

The bug manifests when the Map component in MapPane.tsx initializes and attempts to load raster tiles from the OSM tile server. The URL template in the raster source configuration fails MapLibre's URL parsing validation, resulting in an error logged to the console.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type MapInitializationEvent
  OUTPUT: boolean
  
  RETURN mapStyle.sources['osm-raster'].tiles contains invalid URL template
         OR mapStyle.sources['osm-raster'] missing required configuration
         AND map attempts to fetch tiles
         AND console shows "Unable to parse resourceUrl" error
END FUNCTION
```

### Examples

- **Example 1 - Initial Load**: When the app starts and MapPane mounts, MapLibre logs `[Mbgl-HttpRequest] [HTTP] Unable to parse resourceUrl` error
- **Example 2 - Style Switch**: When switching between light and dark themes (which rebuilds the map style), the error reappears
- **Example 3 - Re-render**: When the map re-renders after spot data updates, the error may appear in console

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Map background color must continue to render correctly in both light and dark themes
- Spot markers (masjid, musala, terminal, SPBU, rest area) must continue to display with proper clustering
- User location display (blue dot) must continue to work
- Pin-drop mode for adding new spots must continue to function
- Camera animations (zoom, pan, locate me) must continue to work
- Theme switching (light/dark) must continue to apply the correct background color
- Touch interactions (spot selection, cluster expansion) must remain functional
- Debounced marker rendering (250ms) must continue to optimize performance

**Scope:**
All inputs that do NOT involve the tile URL configuration should be completely unaffected by this fix. This includes:
- All spot data handling and filtering
- All user interaction events (touch, gesture)
- All theme and styling logic
- All camera and animation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Missing Subdomain Configuration**: MapLibre may expect tile URLs to use subdomain patterns (e.g., `a.tile.openstreetmap.org`, `b.tile.openstreetmap.org`, `c.tile.openstreetmap.org`) for parallel loading, and the single URL may cause parsing issues
   - OSM recommends using subdomains for production tile loading
   - The current single URL may trigger URL validation failures in MapLibre

2. **URL Template Format Issue**: The placeholder format `{z}/{x}/{y}` may need escaping or specific formatting for MapLibre's URL parser
   - Some MapLibre versions expect URL templates in a specific format
   - The `tiles` array might require multiple URL variants

3. **Missing tileSize in Source Configuration**: While tileSize is specified (256), the way it's defined might not match MapLibre's expectations for raster sources

4. **HTTPS/TLS Certificate Issues**: The OSM tile server might have certificate chain issues that MapLibre's HTTP handler flags as invalid

5. **Network Request Interception**: There may be an issue with how the request is being constructed or intercepted in the React Native environment

## Correctness Properties

Property 1: Bug Condition - Map Tiles Load Successfully

_For any_ map initialization event where the map style contains a valid raster source configuration, the MapLibre map SHALL load tiles from the OSM tile server without URL parsing errors, and the tiles SHALL be visible on the map canvas.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Tile URL Features

_For any_ input that does NOT involve tile loading (spot markers, user location, pin-drop mode, theme switching, camera controls, touch interactions), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing MapLibre functionality.

**Validates: Requirements 3.1, 3.2, 3.3**

## Fix Implementation

### Changes Required

Based on the root cause analysis, the following changes will be made:

**File**: `src/lib/config.ts`

**Constant**: `TILE_URL`

**Specific Changes**:

1. **Add Subdomain Support**: Replace the single tile URL with an array of URLs using OSM's recommended subdomain pattern
   - Change from: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
   - Change to array: `['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png']`

2. **Verify URL Template Format**: Ensure the placeholder format matches MapLibre's expected pattern
   - Verify `{z}`, `{x}`, `{y}` placeholders work correctly with the array format

**Alternative Approach** (if subdomain approach doesn't resolve the issue):

3. **Alternative Tile Server**: Consider using an alternative tile server that provides better MapLibre compatibility
   - Option A: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (verify array works)
   - Option B: Stamen tiles (if available and licensed)
   - Option C: Custom tile server with proper CORS headers

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Confirm the URL parsing error appears on unfixed code and understand the exact conditions that trigger it.

**Test Plan**: Initialize the Map component and observe console for the "Unable to parse resourceUrl" error. Test with different URL configurations to find the working solution.

**Test Cases**:
1. **Initial Load Test**: Start app, observe console for MapLibre errors during map initialization (will fail on unfixed code with URL parse error)
2. **Theme Switch Test**: Toggle between light and dark mode, observe if error reappears (will fail on unfixed code)
3. **Re-render Test**: Trigger map re-render (add/remove spots), observe console for repeated errors (may fail on unfixed code)
4. **Network Test**: Verify the device has network connectivity and can reach OSM tile servers

**Expected Counterexamples**:
- Console shows "MapLibre Native [ERROR] [Mbgl-HttpRequest] [HTTP] Unable to parse resourceUrl"
- Map displays background color but no tiles are loaded
- Tiles may appear after a delay or not at all

### Fix Checking

**Goal**: Verify that for all map initialization events, the fixed URL configuration loads tiles successfully without errors.

**Pseudocode:**
```
FOR ALL mapInitializationEvent WHERE mapStyle.sources contains raster source DO
  result := initializeMap(mapStyle)
  ASSERT tileRequestsSucceed(result)
  ASSERT noUrlParseErrors(result)
  ASSERT tilesAreVisible(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all non-tile-url features, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE input does NOT involve TILE_URL configuration DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different map states
- It catches edge cases in feature interactions
- It provides strong guarantees that behavior is unchanged for all non-tile features

**Test Plan**: Verify that all MapLibre features (markers, clustering, user location, pin-drop, theme switching, camera controls) continue to work identically before and after the URL fix.

**Test Cases**:
1. **Marker Display Preservation**: Verify spots render correctly with clustering
2. **User Location Preservation**: Verify user location dot appears and updates
3. **Pin Mode Preservation**: Verify pin-drop works for adding new spots
4. **Theme Preservation**: Verify background color switches correctly with theme
5. **Interaction Preservation**: Verify touch events (select, pan, zoom) work

### Unit Tests

- Test TILE_URL constant value and format
- Test mapStyleLight and mapStyleDark build correctly
- Test raster source configuration structure
- Test attribution string is present and correct

### Property-Based Tests

- Generate random map initialization scenarios and verify URL is parseable
- Generate random theme switches and verify style rebuilds correctly
- Generate random spot data sets and verify markers render

### Integration Tests

- Full map initialization flow with tile loading
- Theme switching with tile reload
- Network condition handling (offline, slow connection)
- Cross-platform verification (iOS and Android)