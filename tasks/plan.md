# Plan — Singgah v0.2 (React Native rebuild)

Technical implementation plan derived from `docs/SPEC-singgah.md` (the source of truth).
Read the SPEC before acting on anything here. Task-level detail lives in `tasks/todo.md`.
The v0.1 web plan is retired with the Vue app; product rules carry over unchanged.

## 1. Components and dependencies

```
scaffold (Expo + TS + dev client + tokens + theme bootstrap)
   └── data-layer (config.ts → supabase.ts → SpotContext / useGeolocation / toast)
          └── browse (spotView.ts + MapPane(MapLibre) / SpotList(FlatList) / SpotDetail)
                 └── contribute (AddSpotSheet + pin-drop flow)
                        └── integrate (App.tsx: @gorhom sheet mechanics, FAB, toasts)
                               └── ship (EAS builds, manual checklist, store assets)

backend (schema.sql, policies.sql, bump_verified)  ── parallel, no code deps
   └── seed (playbook JSON + scripts/seed-spots.mjs)
```

- `spotView.ts` and `tokens.ts` are pure constants — buildable right after the scaffold,
  needed by browse.
- `backend` has no app dependency and runs alongside W1–W3; `seed` needs the backend live.
- `integrate` is the only place that touches everything; it must come last among code waves.
- `ship` is new versus v0.1: native builds need EAS, signing, and store assets.

## 2. Implementation order (waves)

| Wave | Content | Checkpoint after the wave |
|---|---|---|
| W0 | Scaffold: Expo app (SDK pinned in T0), TypeScript strict, `app.config.ts` (name, icons, splash, location-permission strings, MapLibre plugin), dev client build, `tokens.ts` (light + dark), theme bootstrap before first render, Plus Jakarta Sans bundled via `expo-font` | `tsc` + `expo-doctor` clean; dev client boots on Android + iOS with empty themed screen |
| W1a | Data layer: `src/lib/config.ts`, `src/lib/supabase.ts` (typed SPOT + 3 functions + gotchas), `src/lib/spotView.ts`, `SpotContext`, `useGeolocation` (expo-location), toast host | `tsc` clean; smoke against test Supabase project: load paginates, insert lands pending, `bumpVerified` returns `{ok:false}` on rate limit |
| W1b | Map baseline: MapLibre with OSM raster style (`TILE_URL`), attribution visible on both platforms | map renders tiles on both platforms, attribution legible |
| W2 | Browse: `MapPane` (cluster, per-type teardrop pins color+glyph via `react-native-svg`, geolocate button, pin-drop mode, ≥200 ms debounce redraws), `SpotList` (FlatList ≤ 50 + `Tampilkan 50 lagi`, search, chips, `Tinjauan saya`), `SpotDetail`, `DarkModeToggle` | `tsc` + smoke: list and map move together from `filteredSpots`; both themes pass contrast |
| W3 | Contribute: `AddSpotSheet` (honest `submitState` machine, failure keeps form), FAB + pin flow; Backend: apply `schema.sql`/`policies.sql`/`bump_verified`; Seed: playbook JSON + `seed-spots.mjs --dry-run` | RLS probes with anon client (pending invisible, UPDATE/DELETE rejected, rate limit holds); dry-run prints planned upserts |
| W4 | Integrate: `App.tsx` — `@gorhom/bottom-sheet` snaps (peek/half/full from `useWindowDimensions` + safe areas), fling, detail-replaces-sheet, sheet-lowering on map actions, FAB hiding, all toasts centralized, reduce-motion honored | smoke on real Android + iOS: all snaps, FAB behavior, every toast path |
| W5 | Ship: EAS preview builds both platforms, install on real devices, 26-check manual run (date + device + platform), guardrails walk, store assets (icons, splash, privacy = no data collected), deploy-gate pre-checks | checklist A + B pass on both platforms |

## 3. Risks and mitigations

| Risk | Mitigation |
|---|---|
| MapLibre cannot load in Expo Go | dev client from W0; `app.config.ts` includes the MapLibre config plugin per its Expo setup guide |
| Native package versions drifting from the SDK | only `npx expo install`; `expo-doctor` gate every merge |
| PostgREST silently caps ~1000 rows | `loadApprovedSpots()` paginates 1000 at a time (SPEC §7) |
| `.select()` on the pending insert fails with 42501 (anon can't SELECT pending) | never add `.select()`; return a locally built row keyed by `crypto.randomUUID()` |
| Rate-limit `false` misread as success — the UI lies | typed wrapper returns `{ok:false}` so the compiler forces handling; callers throw; UI never lies |
| OSM tile usage policy in a native app (valid User-Agent, no bulk caching) | tiles stay network-only via `TILE_URL`; no MapLibre offline packs; attribution baked into style JSON; OQ-3 tracks tile-provider choice |
| Location permission missing/rejected | `NSLocationWhenInUseUsageDescription` (iOS) + Android rationale set in W0; denied permission leaves the app usable (toast + manual state) |
| Store review delays / privacy declarations | privacy labels state "no data collected" (true by design); store accounts are owner actions (OQ-D) before W5 |
| EAS free-tier build queue limits | preview builds only when needed; OQ-E tracks plan choice |
| Bottom-sheet snap regressions (the v0.1 owner feedback) | snaps derived from `useWindowDimensions` + safe areas, never hardcoded; checklist guard #25-equivalent keeps the CTA ~190×44 |
| Reanimated/Gesture Handler misconfiguration (blank screen) | versions via `expo install`; babel plugin verified in W0 checkpoint |
| Bundle creep | every dependency is an owner decision (SPEC §2, guardrail 9) |
| SVG/XSS-style injection | `TYPE_GLYPHS` are static module constants rendered via `react-native-svg`; user data never enters SVG strings |
| Contract drift during rebuild | field names, labels, strings copied verbatim from SPEC §6–§13, not paraphrased |

## 4. Parallel vs sequential

- **Parallel:** `tokens.ts` ∥ `config.ts`/`supabase.ts` (both after scaffold) · backend SQL ∥
  all app waves · `seed` tooling ∥ W2–W3 (run blocked until backend is live) · store
  account paperwork (owner, OQ-D) ∥ everything.
- **Sequential:** everything inside a wave; `browse` → `contribute` → `integrate` → `ship`;
  `seed` after `backend` is live; verification last.

## 5. Verification checkpoints

- **Per wave:** `npx tsc --noEmit` + `npx expo-doctor` + `npx expo export` + smoke on the dev
  client (Android at minimum; iOS at W2/W4/W5).
- **W3 extra:** RLS probes with the anon client — pending invisible, forced `pending`/`user`
  on insert, anon UPDATE/DELETE rejected, rate limit holds.
- **W5:** full manual checklist on real Android + iOS devices (date + device + platform),
  guardrails walk, grep gates, store-gate pre-checks (privacy labels, permission strings,
  attribution visible).
- **Before store submission:** checklist A + B pass on both platforms · blocking open
  questions answered · SPEC up to date · no pending spot publicly visible · no privileged key
  in the bundle.
