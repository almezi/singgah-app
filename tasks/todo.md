# Todo — Singgah v0.2 rebuild (React Native)

Work queue derived from `tasks/plan.md`. Work top to bottom; do not skip ahead — tasks are
ordered by dependency, not importance. Resolve OQ-B (credentials), OQ-D (store accounts), and
pin exact SDK versions (T0) before starting T1.

## Agent tasks

- [ ] Task: T0 — Unblock prerequisites
  - Acceptance: Supabase project URL + anon key obtained (OQ-B); exact Expo SDK + dependency versions pinned (`npx expo install` output recorded in SPEC §2); `isUnknown()` boolean predicate accepted (OQ-A, SPEC §10); backend artifacts present in this repo (`supabase/`, `data/playbook-spots.json`, `scripts/seed-spots.mjs`) plus `design/singgah-mockup-board.html` and research/decision docs (OQ-F); store accounts status noted (OQ-D — needed before W5, not before T1).
  - Verify: answers recorded in SPEC §19; SPEC §2 version table filled with exact versions.
  - Files: `docs/SPEC-singgah.md`

- [x] Task: T1 — Expo scaffold
  - Acceptance: Expo app created (SDK from T0), TypeScript `strict: true`; `app.config.ts` with app name Singgah, icons, splash, `NSLocationWhenInUseUsageDescription` + Android location rationale (Indonesian), MapLibre config plugin; dev client builds and boots on Android + iOS; `tokens.ts` carries all SPEC §12 tokens for both themes; `App.tsx` applies saved theme (`singgah-theme`, AsyncStorage) before first render; Plus Jakarta Sans bundled via `expo-font`; babel Reanimated plugin verified.
  - Verify: `npx tsc --noEmit` clean; `npx expo-doctor` clean; dev client boots both platforms showing a themed empty screen with no red screens.
  - Files: `app.config.ts`, `tsconfig.json`, `package.json`, `App.tsx`, `src/theme/tokens.ts`

- [x] Task: T2 — MapLibre baseline
  - Acceptance: MapLibre map renders OSM raster tiles from `TILE_URL` (single constant in `src/lib/config.ts`); attribution `© OpenStreetMap contributors` visible on both platforms; no offline packs enabled.
  - Verify: dev client shows tiles on Android + iOS; attribution legible; `grep -rn "offline" src/` empty.
  - Files: `src/lib/config.ts`, `src/components/MapPane.tsx` (skeleton), map style JSON

- [x] Task: T3 — Data layer
  - Acceptance: `config.ts` is the only file holding `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`TILE_URL`; `supabase.ts` exports typed `SPOT` (exact SPEC §6 columns) + client (try/catch — missing key does not crash) + `loadApprovedSpots()` (paginated 1000) + `insertPendingSpot()` (no `.select()`, returns locally built row with `crypto.randomUUID()` key) + `bumpVerified()` returning `{ok, spot}` so rate-limit `false` cannot be misread.
  - Verify: `tsc` clean; against the test Supabase project — load >1000 rows if available; insert a pending row succeeds without 42501; bump on a fresh row returns `{ok:true}`, second bump within the hour returns `{ok:false}`.
  - Files: `src/lib/config.ts`, `src/lib/supabase.ts`

- [x] Task: T4 — Canonical presentation metadata
  - Acceptance: `spotView.ts` exports `UNKNOWN_LABEL`, `isUnknown` (boolean predicate — SPEC §10), `SPOT_TYPES` (label + tint key per type), `TYPE_GLYPHS` (static SVG path data for `react-native-svg`), `WATER_LABELS`, `TYPE_CHIPS`, `relTime`, `verifyText` — exactly the SPEC §10 values.
  - Verify: `tsc` clean; `grep -rn "Belum ada info" src/` hits only `spotView.ts`; no label constants duplicated in components.
  - Files: `src/lib/spotView.ts`

- [x] Task: T5 — State: context, geolocation, toasts
  - Acceptance: `SpotContext` exposes `spots`, `pendingMine` (AsyncStorage `singgah-pending-mine`), `query`, `type`, memoized `filteredSpots` (query + type), `TYPES`, `load()`/`addPending()`/`markVerified()` (throws on rate-limit); `useGeolocation()` wraps `expo-location` exposing `position/loading/locate()` with the `Lokasi tidak tersedia.` failure path (denied permission leaves the app usable); `toast.ts` provides `showToast(message)` + `ToastHost` rendered only by `App.tsx`.
  - Verify: dev-client smoke — load approved rows, filter by query + chip, submit a pending spot (appears in `Tinjauan saya`), bump an approved row; deny location permission and confirm the app stays usable.
  - Files: `src/state/SpotContext.tsx`, `src/state/useGeolocation.ts`, `src/lib/toast.ts`

- [x] Task: T6 — SpotList + DarkModeToggle
  - Acceptance: `SpotList` renders ≤ 50 cards + `Tampilkan 50 lagi` (FlatList windowing), search box (`Cari masjid, musala, SPBU…`), type chips (`Semua` + five), `Tinjauan saya` with `Menunggu tinjauan` badge, legend in header; all touch targets ≥ 44px; callbacks only (`onQueryChange`/`onTypeChange`/`onSelect`); `DarkModeToggle` flips tokens and persists `singgah-theme`.
  - Verify: `tsc` clean; smoke — list and map state stay in sync through `filteredSpots`; both themes render with ≥ 4.5:1 contrast on chip/badge pairs.
  - Files: `src/components/SpotList.tsx`, `src/components/DarkModeToggle.tsx`

- [x] Task: T7 — MapPane full
  - Acceptance: clustered markers; per-type teardrop pins (SPEC §12 color + white glyph from `TYPE_GLYPHS` via `react-native-svg`, never color alone); geolocate button; pin-drop mode (`pinMode` + `onPinPlaced(lat,lng)`); marker selection (`onSelect`); ≥ 200 ms debounce on marker redraws; attribution never covered by controls.
  - Verify: `tsc` clean; smoke — tap marker selects; pin-drop emits coordinates; rapid filter changes do not thrash redraws (debounce verified).
  - Files: `src/components/MapPane.tsx`

- [x] Task: T8 — SpotDetail
  - Acceptance: every field rendered or `Belum ada info` (`Air`, `Jam`, `Parkir sepeda`, `Ramah perempuan`, `Catatan`); `Masih ada ✓` emits `onVerify`; `Rute` opens external maps via `Linking` (`geo:` on Android, Apple Maps on iOS); relative verify line (`Diverifikasi …` / `Belum diverifikasi`); callbacks only.
  - Verify: `tsc` clean; smoke — detail with all-null optional fields shows `Belum ada info` everywhere; `Rute` opens the correct external app on both platforms.
  - Files: `src/components/SpotDetail.tsx`

- [x] Task: T9 — Contribute flow
  - Acceptance: `AddSpotSheet` bottom-sheet form with `pin` prop and honest `submitState` machine (`idle/pending/success/error`); banner `Ketuk peta untuk menaruh pin`; submit `Kirim untuk ditinjau` + reassurance string; success strings `Terima kasih!` / `Spot kamu menunggu persetujuan.` / `Kembali ke peta`; failure keeps the form open with content intact; empty strings → `null` at the payload boundary; `Lanjut` disabled until a pin exists; CTA fixed ~190×44 (not `flex:1`); callbacks only (`onCancel`/`onSubmit`).
  - Verify: `tsc` clean; smoke — full add flow lands a `pending`/`user` row; forced-failure path keeps the form; success screens appear only after the write resolves.
  - Files: `src/components/AddSpotSheet.tsx`

- [x] Task: T10 — App.tsx integration
  - Acceptance: full-screen map + `@gorhom/bottom-sheet` with snap points (peek: search + chips + 1 card, content-derived with fallback ~180px; half; full from `useWindowDimensions` − safe areas); fast fling jumps snaps; detail replaces sheet content; map actions (add flow start, location fix) lower the sheet to peek; FAB `+ Tambah` hides during add flow/detail and never covers attribution; ALL toasts live here (`grep -rn "showToast" src/components/` empty); no router; reduce-motion disables spring/fling animations; every sheet action has a non-drag alternative.
  - Verify: `tsc` + smoke on real Android + iOS — all snaps, fling, FAB behavior, every toast path, reduce-motion mode.
  - Files: `App.tsx`

- [ ] Task: T11 — Supabase backend
  - Acceptance: `schema.sql` (SPOT columns exactly SPEC §6), `policies.sql` (anon SELECT approved only; INSERT forced `pending`/`user`; no UPDATE/DELETE policy for anon), `functions/bump_verified` (security definer; only touches `last_verified_at`; 1 bump per spot per hour) — applied in the dashboard.
  - Verify: anon-client probes — pending rows invisible; insert forced pending; UPDATE/DELETE rejected; second bump within an hour returns `false`.
  - Files: `supabase/schema.sql`, `supabase/policies.sql`, `supabase/functions/bump_verified.sql`

- [ ] Task: T12 — Seed tooling
  - Acceptance: `data/playbook-spots.json` (11 real researched spots, carried over); `scripts/seed-spots.mjs` reads playbook + Overpass, dedupes, upserts `approved` rows; privileged key from the environment only; `--dry-run` supported; never runs in the app bundle.
  - Verify: `node scripts/seed-spots.mjs --dry-run` prints the planned upserts; owner approves (D1) before the real run.
  - Files: `data/playbook-spots.json`, `scripts/seed-spots.mjs`

- [ ] Task: T13 — Ship gate
  - Acceptance: EAS preview builds succeed and install on real Android + iOS devices; 26-check manual run completed on both platforms (date + device + platform written at top); senior review checklist walked (`docs/code-standards.md` §3); grep gates pass; store assets ready (icons, splash, store listings, Play Data safety + App Store privacy = **no data collected**); deploy-gate pre-checks pass.
  - Verify: the checklist run itself — sections A + B pass on both platforms.
  - Files: store assets, none in code (checklist run only)

## Owner actions (agent never does these unasked)

- [ ] OQ-B — provide Supabase credentials + seed key env var name
- [ ] OQ-F — copy from the web repo into this repo: `supabase/`, `data/playbook-spots.json`, `scripts/seed-spots.mjs`, `design/singgah-mockup-board.html`, `decision-log.md`, `research-*.md` — then the web repo becomes a frozen reference (no new edits there)
- [ ] OQ-D — create store developer accounts (Google Play $25 once; Apple Developer $99/yr)
- [ ] OQ-E — choose EAS plan + OTA update policy
- [ ] D1 — approve the full seed run (dry run passed: playbook 11 + OSM ≈ 7168)
- [ ] P1 — EAS build + store submission
- [ ] P2 — approve-one-spot test
- [ ] P3 — verify-write test
- [ ] P4 — 100+ spots check
- [ ] P5 — real-trip dogfood (now on native Android + iOS)
- [ ] OQ-3 — tile/style decision (raster OSM for now)
- [ ] OQ-4 — weekly heartbeat for the Supabase free tier
- [ ] OQ-8 — settle the six two-variant strings (approved board wins meanwhile)
