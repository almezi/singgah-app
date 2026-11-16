# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Map Tiles URL Parse Error
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that TILE_URL in config.ts is properly formatted as an array with OSM subdomain pattern
  - The test should verify: TILE_URL is an array with URLs using a.tile.openstreetmap.org, b.tile.openstreetmap.org, c.tile.openstreetmap.org
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves TILE_URL is not properly configured as array with subdomains)
  - Document counterexamples found (e.g., "TILE_URL is a string 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' instead of array with subdomains")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Tile URL Features Work Correctly
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-tile URL features
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that mapStyleLight and mapStyleDark build correctly with raster source configuration
  - Test that markers (masjid, musala, terminal, SPBU, rest area) continue to display
  - Test that theme switching (light/dark) continues to apply the correct background color
  - Verify TILE_URL constant exists and is accessible (even if incorrectly formatted)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix for MapLibre Resource URL Parse Error

  - [x] 3.1 Implement the fix
    - Change TILE_URL from single string to array with OSM subdomain pattern
    - Update src/lib/config.ts: export const TILE_URL = ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png']
    - Verify mapStyle.ts correctly uses the array (tiles: [TILE_URL] becomes valid array usage)
    - _Bug_Condition: isBugCondition(input) where TILE_URL is not an array with subdomain URLs_
    - _Expected_Behavior: MapLibre successfully parses resourceUrl and loads tiles without errors_
    - _Preservation: All non-tile URL features (markers, clusters, user location, pin-drop mode, theme switching) continue to work_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Map Tiles URL Parse Error Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - TILE_URL is now properly formatted)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Tile URL Features Still Work
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.