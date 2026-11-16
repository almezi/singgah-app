# SPEC — Singgah (v0.2 — React Native)

**Source of truth for AI-driven development.** This file wins over everything, including
`docs/build-reference.md` (digest of the retired v0.1 web build) and `AGENTS.md` (working
rules). When a decision changes: update this SPEC **first**, then the digest, then code.

---

## 0. Decision changes

| Date | Decision | Effect |
|---|---|---|
| 2026-11-15 | Owner pivots the native path: **React Native** (Expo + MapLibre OSM + TypeScript) replaces the frozen **PWA → TWA** plan; the Vue web app is retired ("RN total"). | Supersedes `decision-log.md` §F (web repo) and `docs/build-reference.md` §13. Product rules (data contract, RLS, UI copy, honesty) are **unchanged** and carry over verbatim. |
| 2026-11-15 | Web and app live in **separate repositories**. This repo (`singgah-app`) owns the React Native app **and the backend** (`supabase/`, `scripts/seed-spots.mjs`, `data/playbook-spots.json`). The web repo is a **frozen reference**. | This SPEC is the single home of the frozen contract. Backend artifacts and needed docs (mockup board, research) must be copied here from the web repo (OQ-F); no new work starts in the web repo. |

## 1. Objective

Singgah is a native mobile app (Android + iOS from one React Native codebase) where cyclists
and backpackers in Indonesia find **free wash & rest spots** — masjid besar, musala, terminal,
SPBU, rest area — in Yogyakarta city and along the Jakarta→Yogya corridor.

- **Users:** touring cyclists and backpackers, mostly on phones, often on mobile data.
- **Shape:** Expo app talking directly to a Supabase Postgres table protected by Row Level
  Security. There is no backend code of our own.
- **Layout:** full-screen map with a draggable bottom sheet (the v0.1 desktop sidebar
  arrangement is retired with the web app; tablets use the phone layout).
- **Contribution:** anyone can add a spot (it lands `pending`); only the owner approves it, in
  the Supabase dashboard. No admin UI.
- **Language & honesty:** the UI is 100% Indonesian. Unknown data always reads
  **`Belum ada info`** — never a guess, never a dash. The UI never lies: success states appear
  only after the database confirms.

**Success looks like:** a touring cyclist on a real phone, on mobile data, can find a nearby
wash/rest spot, add one that is missing, and confirm one still exists — without an account.

## 2. Tech stack (locked)

| Dependency | Version (pinned 2026-11-16, task T0) | Note |
|---|---|---|
| Expo SDK | `~58.0.25` | app framework, dev client, EAS Build / Submit / Update |
| React Native / React | `0.88.1` / `19.3.0` | matched by Expo (`npx expo install`) |
| TypeScript | `~6.0.3` (strict) | replaces the old "no TypeScript" decision — the frozen contract becomes compiler-enforced types |
| `@maplibre/maplibre-react-native` | `^11.5.1` | map + pins, **OSM raster tiles** via the single `TILE_URL` constant (keeps the mandatory `© OpenStreetMap contributors` attribution, ODbL) |
| `@supabase/supabase-js` | `^2.119.0` | the only door to the database |
| `react-native-reanimated` / `react-native-gesture-handler` / `@gorhom/bottom-sheet` | `4.7.1` / `~3.3.0` / `^5.2.14` (+ peer `react-native-worklets@^0.13.0`) | draggable bottom sheet with snap points + fling |
| `expo-location` / `expo-crypto` / `expo-font` / `expo-dev-client` | SDK 58 (`~58.x`) | geolocation · `randomUUID` · Plus Jakarta Sans · dev builds |
| `react-native-svg` | `15.16.0` | marker glyphs rendered from the frozen static SVG paths |
| `@react-native-async-storage/async-storage` | `2.2.0` | `singgah-pending-mine`, `singgah-theme` (localStorage successor) |
| `@expo-google-fonts/plus-jakarta-sans` | `^0.4.2` | Plus Jakarta Sans 400–800 bundled (SPEC §12) |
| `typescript` / `@types/react` (dev) | `~6.0.3` / `~19.3.0` | typecheck gate |

**No new dependency without asking the owner.** No router (single-screen app; visibility is
managed with plain state), no Redux/Zustand (React context only) — deliberate absences,
carried over from v0.1.

**Expo Go is not enough:** MapLibre ships native code — develop with the Expo **dev client**
from W0 on. Add native packages only via `npx expo install` so versions stay SDK-aligned.

## 3. Commands

```
Install (once):      npm install
Dev:                 npx expo start          # Metro; press a (Android) / i (iOS), dev client
Typecheck:           npx tsc --noEmit        # must pass before any merge
Health:              npx expo-doctor         # must be clean before any merge
Add dependencies:    npx expo install <pkg>  # NEVER bare npm install for native packages
Device build:        eas build --profile preview --platform android|ios
Store submission:    eas submit --platform android|ios   # owner-triggered only
Seed database:       node scripts/seed-spots.mjs --dry-run   # always dry-run first
```

## 4. Project structure

| File | One line |
|---|---|
| `app.config.ts` | Expo config: name, icons, splash, location-permission strings, MapLibre plugin |
| `App.tsx` | root: theme bootstrap before first render + `SpotProvider` + layout shell + integrator (sheet, add flow, all toasts) |
| `src/theme/tokens.ts` | light + dark design-token constants — the only source of colors, sizes, radii |
| `src/lib/config.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TILE_URL` — **the only file** allowed to hold them |
| `src/lib/supabase.ts` | client + the 3 API functions (typed `SPOT`) — components never import it directly |
| `src/lib/spotView.ts` | canonical presentation metadata: labels, glyphs, chips, `isUnknown`, relative time |
| `src/lib/toast.ts` | `showToast(message)` + `ToastHost` component — global, parent-owned |
| `src/state/SpotContext.tsx` | `useSpots()` context: spots, filters, pendingMine, load/add/mark |
| `src/state/useGeolocation.ts` | `locate()` → `{lat,lng}` or failure toast; app stays usable |
| `src/components/MapPane.tsx` | MapLibre map, clustered per-type teardrop pins, geolocate button, pin-drop mode |
| `src/components/SpotList.tsx` | cards (FlatList), search box, type chips, `Tinjauan saya` (own pending) |
| `src/components/SpotDetail.tsx` | detail fields, `Masih ada ✓`, `Rute` |
| `src/components/AddSpotSheet.tsx` | add banner → form sheet → honest success state |
| `src/components/DarkModeToggle.tsx` | light/dark switch persisted in AsyncStorage |
| `scripts/seed-spots.mjs` | Node seeder: playbook JSON + Overpass → Supabase (offline only) — unchanged |
| `data/playbook-spots.json` | 11 real researched spots — research data, do not rewrite casually |
| `supabase/schema.sql`, `policies.sql`, `functions/` | table, RLS policies, `bump_verified` function — unchanged |

## 5. Capability map & build order

| Module id | Responsibility | Depends on | Wave |
|---|---|---|---|
| `scaffold` | Expo app, TypeScript, dev client + MapLibre plugin, token constants, theme bootstrap | — | W0 |
| `data-layer` | `config.ts`, `supabase.ts` (3 functions), `SpotContext`, `useGeolocation`, toast | scaffold | W1 |
| `browse` | `MapPane` (MapLibre), `SpotList`, `SpotDetail` — find and inspect spots | data-layer | W2 |
| `contribute` | `AddSpotSheet`, FAB + pin-drop flow, honest submit/success states | browse | W3 |
| `backend` | `schema.sql`, `policies.sql`, `bump_verified` | — (parallel) | W3 |
| `seed` | playbook JSON + offline seeder script | backend | W3 |
| `integrate` | `App.tsx` shell: bottom-sheet snaps, FAB, toasts, visibility state | browse + contribute | W4 |
| `ship` | EAS builds on real devices, manual checklist, store assets, guardrails walk | all | W5 |

**Build order:** `scaffold` → `data-layer` → `browse` → `contribute` → `integrate` → `ship`;
`backend` runs in parallel, `seed` follows it.

## 6. Frozen data contract — the `SPOT` fields

*Carried over verbatim from v0.1 — still frozen. Field names are exactly the `spots` columns.
Do not rename, add, or drop. In TypeScript this becomes the `SPOT` interface in
`src/lib/supabase.ts`; the compiler now enforces what the review used to enforce.*

| Field | Type | Allowed values |
|---|---|---|
| `id` | uuid | generated |
| `name` | text | required |
| `type` | text | `masjid_besar` · `musala` · `terminal` · `spbu` · `rest_area` |
| `lat`, `lng` | double | required |
| `water` | text / null | `kran_mandi` · `wudhu_only` · `air_isi` · `tidak_ada` · `null` |
| `hours` | text / null | free text, e.g. `24 jam` |
| `bike_parking` | boolean | default `false` |
| `women_friendly` | boolean / null | `null` = **belum ada info**, never guessed |
| `notes` | text / null | etiquette notes |
| `status` | text | `approved` · `pending` (default `pending`) |
| `source` | text | `osm` · `playbook` · `user` (default `user`) |
| `last_verified_at` | timestamptz / null | `null` = belum diverifikasi |
| `created_at` | timestamptz | default `now()` |

## 7. API surface — `src/lib/supabase.ts`

Three functions, each carrying a hard-won gotcha (all still true):

| Export | Shape | Job |
|---|---|---|
| `supabase` | client | `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`, wrapped in try/catch so a missing key does not crash the app |
| `loadApprovedSpots()` | `async () => SPOT[]` | approved rows, **paginated 1000 at a time** (PostgREST silently caps ~1000 rows — a plain `.select('*')` drops the rest) |
| `insertPendingSpot(payload)` | `async (payload: SpotPayload) => SPOT` | insert pending/user — **never add `.select()`**: reading back a pending row via the anon SELECT policy fails the whole insert with 42501. Returns a locally built row (`crypto.randomUUID()` display key, not a database id) |
| `bumpVerified(spotId)` | `async (spotId: string) => { ok: boolean; spot: SPOT }` | `rpc('bump_verified', { spot_id })` — raw `false` means the 1-per-hour quota is spent; the typed wrapper converts it to `{ok:false}` so callers **cannot** mistake it for success — the UI never lies |

## 8. Shared state contract — `SpotContext`

`App.tsx` owns the provider and passes data down as props. Components never touch the
database. `localStorage` keys from v0.1 are preserved in AsyncStorage.

| Member | Shape | Job |
|---|---|---|
| `spots` | `SPOT[]` | approved spots only |
| `pendingMine` | `SPOT[]` | the user's own pending spots (AsyncStorage key `singgah-pending-mine`) |
| `query`, `type` | `string` | search text + selected chip (`''` = all) |
| `filteredSpots` | `SPOT[]` (memo) | applies query + type — drives list **and** map so they always move together |
| `TYPES` | `string[]` | the five legal types |
| `load()` / `addPending(payload)` / `markVerified(spotId)` | async | initial read · submit + record locally · bump + refresh row (throws on rate limit) |

`useGeolocation()` → `{ position, loading, locate() }` (wraps `expo-location`); on failure
`locate()` shows the `Lokasi tidak tersedia.` toast and the app stays usable.

## 9. Component contract — props down, callbacks up

| Component | Props (in) | Callbacks (out) |
|---|---|---|
| `MapPane.tsx` | `spots` (filtered), `pinMode`, `selectedId` | `onSelect(spotId)` · `onPinPlaced(lat, lng)` |
| `SpotList.tsx` | `spots`, `query`, `type`, `pendingMine`, `userPos` | `onQueryChange` · `onTypeChange` · `onSelect(spotId)` |
| `SpotDetail.tsx` | `spot` | `onClose` · `onVerify(spotId)` |
| `AddSpotSheet.tsx` | `active`, `pin` (`{lat,lng}\|null`), `submitState` (`idle/pending/success/error`) | `onCancel` · `onSubmit(payload)` |
| `DarkModeToggle.tsx` | — | — |

- The `+ Tambah` FAB belongs to `App.tsx`; it starts the add flow (`active` + `pinMode`).
- Toasts belong to `App.tsx` — child components emit intent via callbacks, the root writes and
  toasts the truth. `grep -rn "showToast" src/components/` must stay **empty**.

## 10. Presentation metadata — `src/lib/spotView.ts`

One canonical source per shared concept. Labels, glyphs, chips and time formatting live **only**
here — a duplicated constant in a component is a bug incubator.

- `UNKNOWN_LABEL` = `'Belum ada info'`
- `isUnknown(value)` → **boolean** (`true` for `null / undefined / ''`). OQ-A is resolved by
  this spec: there is no legacy implementation to match, so the predicate shape is chosen for
  clarity. Render sites write `isUnknown(v) ? UNKNOWN_LABEL : v`.
- `SPOT_TYPES` → `{ label, cls }` per type (cls = tint key `t-masjid` … `t-rest`, mapped to
  token constants)
- `TYPE_GLYPHS` → static SVG path data per type, rendered through `react-native-svg`
  (`<Svg><Path d={…}/></Svg>`) — never interpolate user data into SVG strings
- `WATER_LABELS` → `kran_mandi: 'Kran mandi'` … `tidak_ada: 'Tidak ada'`
- `TYPE_CHIPS` → `Semua` + the five types
- `relTime(iso)` → `'baru saja'` · `'2 jam lalu'` · `'3 hari lalu'`;
  `verifyText(iso)` → `'Diverifikasi …'` / `'Belum diverifikasi'`

## 11. Database & RLS rules — unchanged

| Who | Action | Rule |
|---|---|---|
| anon | `SELECT` | only `status = 'approved'` |
| anon | `INSERT` | allowed, forced to `status='pending'`, `source='user'` |
| anon | `UPDATE` / `DELETE` | **forbidden — no policy exists** |
| anon | `EXECUTE bump_verified(spot_id)` | allowed — only touches `last_verified_at`, 1/spot/hour |
| owner (dashboard) | all | approving pending rows is manual, there is no admin UI |

- Row sources: `playbook` (seed, approved) · `osm` (seed, approved) · `user` (form, pending).
- Seed target: **≥ 100 approved spots** across Yogya + the corridor.
- Honesty limits: OSM facility tags are effectively empty — unknown stays `null`. Terminal
  Pondok Pinang and any SPBU are skipped on purpose (no mappable point).
- Attribution `© OpenStreetMap contributors` is mandatory (ODbL) and must stay visible on the
  MapLibre map (baked into the style JSON's attribution field).

## 12. Design system

*Visual source of truth: `design/singgah-mockup-board.html` (approved 12-frame board). With
Bootstrap retired, tokens move to `src/theme/tokens.ts` as typed constants; components are
custom RN views. The Bootstrap-first rule is replaced by: **token-first — no component may
hardcode a color, radius, or size outside `tokens.ts`**.*

**Tokens** (warm sand + teal — values unchanged from v0.1):

| Token | Light | Used for |
|---|---|---|
| `--bg` / `--surface` / `--surface-2` | `#F6F4EE` / `#FFFFFF` / `#F1EFE6` | page / cards / tinted panels |
| `--ink` / `--ink2` | `#12332C` / `#5A6E67` | text / muted text |
| `--primary` / `--primary-deep` / `--primary-soft` | `#0E7C66` / `#0B5D4E` / `#DDEEE8` | brand teal |
| `--amber` / `--amber-soft` | `#B45309` / `#FBEEDA` | etiquette note, terminal |
| `--water` / `--violet` | `#0E7490` / `#9333EA` | SPBU / musala |
| `--success` | `#15803D` | rest area, confirmations |

**Dark theme** (OQ-5 = yes, carried over): background `#101B17`, surface `#16241F`, primary
`#3DBFA3`, text on it `#06231C`, focus outline `#3DBFA3`. Theme choice persists in AsyncStorage
key `singgah-theme` and is applied **before first render** (no light/dark flash). Contrast must
hold in **both** themes.

- Font: **Plus Jakarta Sans** (bundled as assets, loaded via `expo-font`; weights 400–800).
- Card/button radius **14–16px**. Every soft-tinted text uses its darker `--*-ink` partner —
  all pairs ≥ 4.5:1.
- **Markers:** one color + one white glyph per type, never color alone: masjid `#0E7C66` (dome)
  · musala `#9333EA` (building) · terminal `#B45309` (bus) · spbu `#0E7490` (droplet) · rest
  area `#15803D` (tent). Legend appears in `SpotList` header.
- **Layout:** full-screen map + draggable bottom sheet on all form factors. Reference frame:
  phone 390×844 (portrait). Sheet snaps and safe areas use `useWindowDimensions` +
  `react-native-safe-area-context` — never hardcoded screen sizes.
- **Icons/glyphs:** marker glyphs are the frozen static SVG paths via `react-native-svg`.
  UI icons come from `@expo/vector-icons` only if a glyph equivalent is needed — no icon fonts
  bundled ad hoc; additions are owner decisions (G9).

**Accessibility (non-negotiable):** contrast ≥ 4.5:1 in both themes · touch targets ≥ 44px
(`hitSlop` allowed to reach it) · no label under 11px · no color-only encoding (glyph + color)
· visible labels on every form field · `accessibilityLabel` on icon-only controls ·
`AccessibilityInfo.isReduceMotionEnabled` honored (disable fling/spring animations) ·
non-drag alternative for every sheet action · no horizontal scrolling lists.

**Button sizing lesson (owner feedback, carried over):** never reuse a `flex:1` button style
outside a row — the submit CTA stays fixed ~190×44 (compact). Checklist guard keeps this.

## 13. UI copy rules — unchanged, verbatim

Zero English in the UI — the only exception is `© OpenStreetMap contributors`.

**The non-negotiable string:** any missing value renders exactly **`Belum ada info`** — never a
dash, `N/A`, `Tidak diketahui`, or a guess. Related: `Belum diverifikasi` / `Diverifikasi 3
hari lalu` / `✓ 2 jam lalu`.

| Element | Exact text |
|---|---|
| Search placeholder | `Cari masjid, musala, SPBU…` |
| Sheet title | `Terdekat dari saya` |
| Chips | `Semua` · `Masjid Besar` · `Musala` · `Terminal` · `SPBU` · `Rest Area` |
| Add FAB | `+ Tambah` |
| Own-pending section | `Tinjauan saya` (badge: `Menunggu tinjauan`) |
| Detail labels | `Air` · `Jam` · `Parkir sepeda` · `Ramah perempuan` · `Catatan` |
| Detail buttons | `Masih ada ✓` · `Rute` |
| Add banner | `Ketuk peta untuk menaruh pin` |
| Add submit | `Kirim untuk ditinjau` + reassurance `Spot baru diperiksa dulu sebelum tampil di peta.` |
| Success | `Terima kasih!` · `Spot kamu menunggu persetujuan.` · `Kembali ke peta` |
| Toasts (in code) | `Terima kasih! Verifikasi tercatat.` · `Lokasi tidak tersedia.` · `Gagal mengirim spot. Periksa koneksi lalu coba lagi.` · `Gagal menyimpan verifikasi. Coba lagi nanti.` |

Six strings still have two variants across the old prompts (search placeholder, mosque chip,
continue button, success heading/body, water labels) — **the approved board wins until the
owner decides** (OQ-8). Never mix variants on one screen.

**Forbidden in the UI:** `Login` · `Sign up` · `Review` · `Rating` · `Foto` · `Upload` ·
`Email` · `Akun` · `Profil` · `N/A` · `Unknown` · `Submit` · `Search` · `Map` · `Close` ·
`Cancel` · `Loading...` · any English error message · any guessed value · any scolding about
pending review.

## 14. Code style

*Canonical expanded version with per-rule rationale and the senior mobile review checklist:
`docs/code-standards.md`. This section is the binding summary.*

The ten guardrails — each exists because breaking it caused a real bug:

1. **One file, one owner** — cross-component work only via the frozen contract.
2. **The UI never lies** — success only after the database confirms (`submitState` machine;
   rate-limit `false` is failure).
3. **Components never call Supabase** — only `App.tsx` (via `SpotContext`) writes; props down,
   callbacks up.
4. **Unknown data is `Belum ada info`** — every nullable value passes `isUnknown()`; empty
   strings become `null` at the payload boundary.
5. **One canonical source per shared concept** — labels/glyphs/tokens live only in
   `spotView.ts` / `tokens.ts`.
6. **Toasts belong to the root** — child emits, `App.tsx` writes and toasts.
7. **Performance budgets** — ≤ 50 cards + `Tampilkan 50 lagi` (FlatList windowing) · clustered
   markers · ≥ 200 ms debounce on marker redraws · paginated queries · no `.select()` on the
   pending insert.
8. **Accessibility and Indonesian are not optional** — ≥ 44px targets, `accessibilityLabel`,
   `aria-live` equivalents (`accessibilityLiveRegion`), SVG only from static module constants.
9. **Dependencies are locked** — every addition is an owner decision, installed with
   `npx expo install`, and must earn its bundle weight.
10. **Secrets and safety** — `service_role`/`sb_secret_` keys never touch the app bundle, repo,
    or logs; RLS stays on; a pending-review page needs login (v0.2, OQ-17 — not improvised).

Reference shape — child components emit intent and never import `supabase.ts` or `toast.ts`:

```tsx
// src/components/SpotDetail.tsx — the shape every component follows
import { SPOT_TYPES, isUnknown, UNKNOWN_LABEL } from '../lib/spotView'
import { useTheme } from '../theme/tokens'

type Props = {
  spot: SPOT                      // one SPOT row (already approved/filtered)
  onClose: () => void             // intent only — no fetch, no Supabase, no toast
  onVerify: (spotId: string) => void
}

export function SpotDetail({ spot, onClose, onVerify }: Props) {
  const t = useTheme()            // tokens only — never a hardcoded color
  return (
    <View style={styles.card}>
      <Text style={[styles.badge, { backgroundColor: t.type[spot.type].soft }]}>
        {SPOT_TYPES[spot.type].label}
      </Text>
      {/* unknown renders `Belum ada info`, never a guess (guardrail 4) */}
      <Text style={styles.value}>{isUnknown(spot.hours) ? UNKNOWN_LABEL : spot.hours}</Text>
      <TouchableOpacity
        style={styles.cta}        // fixed ~190×44 — the sizing lesson
        onPress={() => onVerify(spot.id)}
      >
        <Text style={styles.ctaText}>Masih ada ✓</Text>
      </TouchableOpacity>
    </View>
  )
}
```

```ts
// At the payload boundary: '' → null, so the database never stores empty strings
const payload: SpotPayload = {
  name: form.name.trim(),
  water: form.water || null,
  hours: form.hours.trim() || null,
  status: 'pending',   // RLS forces this anyway — the client does not get to choose
  source: 'user',
}
```

Conventions: function components + hooks · strict TypeScript (`strict: true`) · components
PascalCase.tsx, lib/state camelCase.ts · all colors/sizes through `tokens.ts` · `StyleSheet`
per component · no `any` on the SPOT contract.

## 15. Testing strategy

There is **no unit test runner** — still a deliberate absence (revisit only with owner
approval). The quality gates are:

1. **Type gate:** `npx tsc --noEmit` clean before any merge.
2. **Health gate:** `npx expo-doctor` clean before any merge.
3. **Bundle gate:** `npx expo export --platform android` (and ios) succeeds — the "build
   check" replacement for `npm run build`.
4. **Manual test checklist (26 checks):** the only test runner — now executed on **real
   Android and iOS devices** over mobile data; write date + device + platform at the top of
   each run. The 7 SPEC checks:
   - map + geolocate (denied permission still leaves the app usable)
   - approved markers only; pending invisible everywhere except `Tinjauan saya`
   - detail shows every field or `Belum ada info`
   - add flow lands a `pending`/`user` row in Supabase
   - dashboard approval makes it appear
   - `Masih ada ✓` writes `last_verified_at` (rate limit holds)
   - the whole flow works on a real phone over mobile data
5. **Grep gates:** `grep -rn "showToast" src/components/` empty · no hardcoded color outside
   `tokens.ts` · no duplicated label constants outside `spotView.ts`.
6. **Store gate:** EAS preview builds succeed on both platforms; Play Data safety form and
   App Store privacy labels state **no data collected** (true by design); location permission
   strings present.

## 16. Boundaries

- **Always:** typecheck + expo-doctor before merges · walk the review checklist · keep the UI
  Indonesian and `Belum ada info` for unknowns · props down, callbacks up · treat rate-limit
  `false` as failure · use `npx expo install` for native packages.
- **Ask first:** schema changes · any new dependency · auth · photos · EAS plan changes ·
  store account setup · instant-publish / OTA policy · changes to the frozen contract
  (§6–§10) · touching `data/playbook-spots.json` · editing the approved mockup board.
- **Never:** `service_role`/`sb_secret_` keys in the app bundle, repo, or logs · collect
  personal data · ship a build with pending spots publicly visible · enable MapLibre offline
  packs or any tile pre-caching (OSM tile policy) · show a guessed value · hardcode colors or
  screen dimensions outside `tokens.ts` / `useWindowDimensions`.

## 17. Screen flow & mobile mechanics

```
map + list ──tap card/marker──> detail ──Rute──> Google/Apple Maps (external via Linking)
    │                             │
    │ + Tambah                    └─ Masih ada ✓ ─> bumpVerified() ─> line re-renders
    ▼
pin-drop mode ──pin placed──> Lanjut ──> add form (bottom sheet)
                                            │ Kirim untuk ditinjau
                                            ▼
                                     success state ──> back to list
```

No router: `App.tsx` decides what is visible with plain state. Mechanics (v0.1 owner feedback
baked in — do not regress):

- **Sheet snaps** (`@gorhom/bottom-sheet`): peek (search + chips + 1 card; content-derived
  height where possible, fallback ~180px) · half · full (`useWindowDimensions` height − safe
  areas). Drag from the handle; a fast fling jumps to the next snap, Google-Maps style.
- **Detail on phone replaces the sheet content** (no overlay) and the sheet grows
  accordingly.
- **Map actions lower the sheet:** starting the add flow or getting a location fix drops the
  sheet to peek so the map is free to tap.
- **FAB `+ Tambah` hides** while the add flow is active or a detail is open; it never covers
  the attribution.
- **Pinning is honest:** `Lanjut` stays disabled until a pin exists; success screens appear
  only after the write resolves; failure keeps the form open with its content intact.
- **`Rute` opens external maps** via `Linking` (`geo:` URI on Android, Apple Maps on iOS).
- **Reduce motion honored:** when `AccessibilityInfo.isReduceMotionEnabled` is true, snaps
  happen instantly (no spring/fling animation).

## 18. Success criteria

1. App boots on real Android **and** iOS devices (dev client / EAS builds), on mobile data.
2. Map renders approved spots with clustered, per-type colored + glyphed pins on OSM tiles
   with visible attribution; geolocate works and denied permission still leaves the app
   usable.
3. Pending spots are invisible everywhere except `Tinjauan saya` — filtering happens in the
   database (RLS), never in app code.
4. Detail shows every field or `Belum ada info`.
5. Add flow lands a `pending`/`user` row in Supabase; dashboard approval makes it appear.
6. `Masih ada ✓` writes `last_verified_at`; the 1-per-hour rate limit holds; `false` is
   treated as failure.
7. ≥ 100 approved spots seeded across Yogya + the corridor.
8. `npx tsc --noEmit` clean · `npx expo-doctor` clean · `npx expo export` succeeds on both
   platforms · both themes pass contrast.
9. Store gate: EAS preview builds installed and pass the manual checklist on both platforms;
   store privacy declarations say "no data collected".

## 19. Open questions

| Id | Question | Status |
|---|---|---|
| OQ-3 | MapLibre style choice (raster OSM now; vector style later?) | open — owner decides |
| OQ-4 | Weekly heartbeat to keep Supabase free tier awake | open — owner action |
| OQ-8 | Six strings with two variants (search placeholder, mosque chip, continue button, success heading/body, water labels) | open — approved board wins until owner decides; never mix variants on one screen |
| OQ-17 | Pending-review page needs login (v0.2) | deferred — do not improvise |
| D1 | Owner approves full seed run (dry run passed: playbook 11 + OSM ≈ 7168) | pending owner action |
| OQ-A | ~~`isUnknown()` return shape~~ | **resolved by this spec:** boolean predicate (§10) |
| OQ-B | Supabase project credentials (URL + anon key) and the env var name for the seed script's privileged key | open — owner provides |
| OQ-C | ~~Rebuild vs restore~~ | **answered:** RN total rebuild (§0) |
| OQ-D | Store developer accounts: Google Play ($25 once) + Apple Developer ($99/yr) | open — owner action before W5 |
| OQ-E | EAS plan/tier (free tier has limited build queue) and OTA update policy (EAS Update) | open — owner decides |
| OQ-F | Copy from the web repo into this repo: `supabase/`, `data/playbook-spots.json`, `scripts/seed-spots.mjs`, `design/singgah-mockup-board.html`, `decision-log.md`, `research-*.md` | open — owner copies; the web repo becomes frozen reference afterward |
