# Bugfix Requirements Document

## Introduction

This bugfix addresses the MapLibre resource URL parse error that occurs when the app tries to load map tiles. The error "Unable to parse resourceUrl" appears in the console when the Map component initializes, preventing the map from displaying tiles properly.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Map component initializes with the OSM raster style THEN MapLibre throws "Unable to parse resourceUrl" error in the console
1.2 WHEN the map attempts to fetch tiles from the tile server THEN the request fails due to malformed resource URL

### Expected Behavior (Correct)

2.1 WHEN the Map component initializes THEN the system SHALL load map tiles successfully without URL parsing errors
2.2 WHEN the map requests tiles for a given zoom/x/y coordinate THEN the system SHALL return valid tile images from the OSM tile server

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the map is not displaying tiles (initial load or offline) THEN the system SHALL CONTINUE TO render the map background and UI controls
3.2 WHEN other MapLibre features are used (markers, clusters, user location, pin-drop mode) THEN the system SHALL CONTINUE TO function as implemented in MapPane.tsx
3.3 WHEN the app switches between light and dark themes THEN the system SHALL CONTINUE TO apply the correct map style (mapStyleLight/mapStyleDark)