# AGENTS.md — Singgah

How any AI agent (or human) works in this repository. What is true lives in
`docs/SPEC-singgah.md` — **the SPEC wins over everything**, including this file and
`docs/build-reference.md` (digest of the retired v0.1 web build).

## Bahasa (language rule)

**Selalu merespons dalam Bahasa Indonesia di project ini** — setiap balasan, penjelasan,
dan ringkasan review. Dokumen teknis mengikuti bahasa file masing-masing; string UI wajib
Bahasa Indonesia (SPEC §13).

## Repository map (split-repo rule)

- **This repo (`singgah-app`)** — the React Native app (Expo) **and the backend owner**:
  `supabase/` (SQL, policies, functions), `scripts/seed-spots.mjs`,
  `data/playbook-spots.json`. The frozen contract's single home is
  `docs/SPEC-singgah.md` here.
- **The web repo (Vue v0.1)** — **frozen reference only.** Do not start new work there.
  Anything still needed (mockup board, research docs) gets *copied* into this repo (OQ-F),
  never edited in place.

## Workflow — spec-driven development

1. **Read before writing.** `docs/SPEC-singgah.md` first, then the section of
   `docs/build-reference.md` relevant to product history. Never implement from memory.
2. **Work only from `tasks/todo.md`.** Never implement anything not covered by a task or the
   SPEC. If a change needs something new: update the SPEC **first** → owner approves → only
   then add a task and code it.
3. **One task at a time, in dependency order.** Each task in `tasks/todo.md` lists
   Acceptance / Verify / Files. Do not start the next task until the current one verifies.
4. **Spec first, always.** When a decision changes: update `docs/SPEC-singgah.md` → then the
   digest → then code. Never the reverse.
5. **Plan lives in `tasks/plan.md`.** Implementation order, risks, and checkpoints are decided
   there, not improvised mid-task.

## Locked stack (no exceptions without the owner)

| Dependency | Version | Note |
|---|---|---|
| Expo SDK | latest stable — pinned in task T0 (≥ 54) | app framework, dev client, EAS |
| React Native + React | matched by Expo (`npx expo install`) | runtime |
| TypeScript | Expo-matched (5.x) | strict mode; the frozen contract is compiler-enforced |
| `@maplibre/maplibre-react-native` | latest compatible | map + pins, OSM raster tiles via `TILE_URL` |
| `@supabase/supabase-js` | 2.49.4+ | the only door to the database |
| `react-native-reanimated` / `react-native-gesture-handler` / `@gorhom/bottom-sheet` | Expo-installed | draggable bottom sheet |
| `expo-location` | SDK version | geolocation |
| `react-native-svg` | SDK version | marker glyphs from frozen static SVG paths |

No router, no Redux/Zustand (React context only), no unit test runner — deliberate absences.
Develop with the Expo **dev client** (MapLibre cannot load in Expo Go). Native packages are
installed only with `npx expo install`.

## Commands

```
npm install                              # once
npx expo start                           # Metro dev server (press a / i with dev client)
npx tsc --noEmit                         # must pass before any merge
npx expo-doctor                          # must be clean before any merge
npx expo install <pkg>                   # the ONLY way to add native packages
eas build --profile preview              # real-device builds (owner-triggered for store)
node scripts/seed-spots.mjs --dry-run    # ALWAYS dry-run first
```

## Hard boundaries (never cross)

- **Never** put `service_role` / `sb_secret_` keys in the app bundle, repo, or logs. Anon key
  only; RLS stays on.
- **Never** collect personal data — no emails, phones, accounts, photos, reviews.
- **Never** ship a build where pending spots are publicly visible.
- **Never** enable MapLibre offline packs or pre-cache OSM tiles (tile usage policy); tiles
  stay network-only behind the one `TILE_URL` constant.
- **Never** show a guessed value — `Belum ada info` always.
- **Never** hardcode colors or screen dimensions outside `tokens.ts` /
  `useWindowDimensions`.
- **Ask the owner before:** schema changes, any new dependency, auth, photos, EAS plan
  changes, store account setup, OTA/instant-publish policy.

## Definition of done (every change)

1. `npx tsc --noEmit` clean; `npx expo-doctor` clean; `npx expo export` succeeds.
2. Verified on the touched platform(s): app boots, zero red screens / console errors, the
   touched flow works — real device preferred.
3. The senior review checklist walked (`docs/code-standards.md` §3 — canonical guardrails;
   summary in SPEC §14).
4. UI is 100% Indonesian; unknowns read `Belum ada info`.
5. The change description stands alone in git history.

There is no linter/CI unit runner — this file, the SPEC, and the manual test checklist
**are** the quality gate.
