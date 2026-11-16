# Code Standards — Singgah (React Native)

*Kanonik untuk guardrails + checklist review versi React Native (Expo + MapLibre + TypeScript).
Disarikan dari review senior v0.1, dialihkan ke RN. Kalau ada konflik,
`docs/SPEC-singgah.md` menang — file ini menguraikan **kenapa** setiap guardrail ada dan
**bagaimana** mengeceknya saat review.*

---

## 0. Lensa review: senior mobile developer

Singgah kini benar-benar native: Android + iOS dari satu kodebase React Native. Review memakai
lensa senior mobile developer, bukan reviewer web:

- **Jaringan nyata, bukan WiFi kantor** — setiap request dianggap 4G lemah: paginated,
  di-debounce, dan gagal dengan jujur.
- **Perangkat murah, bukan flagship** — bundle ramping (Hermes), marker bercluster, redraw
  hemat, FlatList ter-windowing.
- **Jempol, bukan kursor** — target sentuh ≥ 44px (`hitSlop` diperbolehkan), semua gestur punya
  alternatif non-drag.
- **Pengguna tanpa akun** — nol data pribadi; tidak ada flow yang memaksa login.
- **UI tidak pernah berbohong** — state sukses hanya muncul setelah database konfirmasi.

### 0b. Aturan lintas-repo (efek split web/app)

- Kontrak beku punya **satu rumah**: `docs/SPEC-singgah.md` di repo app ini.
- Repo web = **referensi beku** — jangan mulai kerja baru di sana; salin yang dibutuhkan ke
  repo ini (mockup board, riset), jangan sunting di tempat.
- Perubahan keputusan: SPEC repo app dulu → baru kode. Repo web tidak pernah disunting untuk
  kerja baru.

---

## 1. Sepuluh guardrails — aturan, kenapa, cara cek

### G1 — Satu file, satu pemilik
- **Aturan:** kerja lintas-komponen hanya lewat kontrak beku (SPEC §6–§10). Props turun,
  callback naik. Di TS, interface `SPOT` dan `SpotPayload` adalah kontrak yang di-enforce
  compiler — `strict: true`, tanpa `any` di kontrak.
- **Kenapa:** perubahan silang tanpa kontrak membuat satu perbaikan merusak lane lain.
- **Cek:** diff yang menyentuh > 1 komponen harus bisa dijelaskan hanya dengan merujuk kontrak;
  `npx tsc --noEmit` bersih.

### G2 — UI tidak pernah berbohong
- **Aturan:** sukses hanya setelah database konfirmasi. `submitState` mesin
  `idle/pending/success/error`; `bumpVerified()` bertipe `{ok, spot}` sehingga rate-limit
  **tidak bisa** salah dibaca sebagai sukses; gagal mengirim membuka kembali form dengan isi
  utuh.
- **Kenapa:** mengabaikan ini membuat pengguna mengira spot tersimpan padahal insert gagal.
- **Cek:** telusuri setiap state sukses di UI ke titik di mana response database sudah
  diterima; uji jalur `{ok:false}` secara paksa.

### G3 — Komponen tidak pernah memanggil Supabase
- **Aturan:** hanya `App.tsx` (via `SpotContext`) yang menulis ke database. Komponen menerima
  props dan memancarkan intent lewat callback. **Kecualian sempit:** `import type` dari
  kontrak beku (`SPOT`, `SpotPayload`) di komponen adalah bagian dari G1 — yang dilarang
  adalah import runtime/client.
- **Kenapa:** akses database tersebar = RLS sulit diaudit dan race condition mengganda.
- **Cek:** `grep -rn "from '../lib/supabase'" src/components/` → hanya baris `import type`.

### G4 — Data unknown = `Belum ada info`
- **Aturan:** setiap nilai nullable lolos `isUnknown()` (predikat boolean, SPEC §10); `''`
  menjadi `null` di payload boundary; tidak pernah menebak (bukan `-`, bukan `N/A`, bukan
  `Tidak diketahui`).
- **Kenapa:** nilai tebakan di peta wisata = informasi salah yang membahayakan perencanaan
  perjalanan; kejujuran data adalah fitur inti aplikasi.
- **Cek:** cari render langsung field nullable tanpa `isUnknown()`; cek payload builder
  mengubah `''` → `null`.

### G5 — Satu sumber kanonik per konsep bersama
- **Aturan:** label, glyph, chip, format waktu hanya di `spotView.ts`; warna/ukuran/radius
  hanya di `tokens.ts`.
- **Kenapa:** duplikasi konstan adalah inkubator bug — review 2026-11-15 menghapus persis ini;
  sekarang berlaku juga lintas-repo (kontrak hanya di SPEC repo app).
- **Cek:** `grep -rn "Belum ada info" src/` → hanya `spotView.js/ts`; `grep -rn "#[0-9A-Fa-f]\{6\}" src/`
  di luar `tokens.ts` → kosong.

### G6 — Toast milik root
- **Aturan:** komponen anak memancarkan intent; `App.tsx` yang menulis data dan memanggang
  toast kebenaran (`ToastHost` hanya dirender di root).
- **Kenapa:** toast ganda/kontradiktif muncul saat dua sumber memanggang pesan untuk satu
  kejadian.
- **Cek:** `grep -rn "showToast" src/components/` → **kosong**.

### G7 — Anggaran performa
- **Aturan:** ≤ 50 kartu + `Tampilkan 50 lagi` (FlatList windowing) · marker bercluster di
  MapLibre · debounce ≥ 200 ms pada redraw marker · query paginated 1000 · tanpa `.select()`
  pada insert pending · Hermes menyala.
- **Kenapa:** PostgREST diam-diam membatasi ~1000 baris (data hilang tanpa error); `.select()`
  pada insert pending gagal 42501; ribuan marker tanpa cluster membekukan ponsel murah.
- **Cek:** hitung render kartu; periksa debounce di `MapPane`; periksa pagination di
  `loadApprovedSpots()`; cek Hermes aktif di build.

### G8 — Aksesibilitas & Bahasa Indonesia bukan opsional
- **Aturan:** target ≥ 44px (`hitSlop` boleh) · `accessibilityLabel` pada kontrol ikon ·
  `accessibilityLiveRegion` untuk hitungan · kontras ≥ 4.5:1 di **kedua** tema ·
  `AccessibilityInfo.isReduceMotionEnabled` dihormati (spring/fling mati) · SVG hanya dari
  konstanta modul statis (`TYPE_GLYPHS` via `react-native-svg`), tidak pernah interpolasi data
  pengguna ke string SVG · nol bahasa Inggris di UI (kecuali `© OpenStreetMap contributors`).
- **Ke khusus native:** uji di **kedua** platform — TalkBack (Android) dan VoiceOver (iOS).
- **Cek:** navigasi screen-reader satu loop; cek kontras token di dua tema; grep string
  Inggris di render.

### G9 — Dependency terkunci
- **Aturan:** setiap dependency baru adalah keputusan owner, di-install hanya dengan
  `npx expo install` (bukan npm/yarn/pnpm langsung untuk paket native), dan harus membayar
  bobot bundlenya. Tanpa router, tanpa Redux/Zustand, tanpa test runner — absensi yang
  disengaja.
- **Kenapa:** versi paket native yang tidak selaras SDK adalah sumber red screen paling umum
  di Expo; bundle besar membunuh pengguna mobile data.
- **Cek:** diff `package.json` harus kosong atau ada persetujuan owner tercatat; `npx
  expo-doctor` bersih.

### G10 — Secrets & keselamatan
- **Aturan:** kunci `service_role`/`sb_secret_` tidak pernah menyentuh bundle, repo, atau log;
  anon key only; RLS tetap menyala; keystore/signing dikelola EAS dan tidak pernah
  di-commit; `.env` masuk `.gitignore`; halaman review-pending butuh login (v0.2, OQ-17 —
  tidak diimprovisasi); tidak pernah mengumpulkan data pribadi.
- **Kenapa:** satu kunci privileged di bundle = seluruh tabel bisa dihapus oleh siapa pun;
  keystore yang bocor = orang lain bisa menerbitkan update palsu atas nama aplikasi.
- **Cek:** `grep -rn "service_role\|sb_secret_" src/ scripts/` → kosong; `git status` bersih
  dari `.env`/keystore; probe RLS dengan anon client sebelum rilis.

---

## 2. Aturan mobile tambahan (baked-in owner feedback — jangan regresi)

- **Sheet snap dari pengukuran, bukan angka keras** — `@gorhom/bottom-sheet` dengan snap point
  diturunkan dari `useWindowDimensions` + safe area (peek: konten search + chips + 1 kartu,
  fallback ~180px). Jangan pernah meng-hardcode tinggi layar.
- **CTA `~190×44` fixed** — jangan pernah memakai ulang style tombol `flex:1` di luar flex
  row; pelajaran feedback owner, dijaga oleh checklist.
- **Nol horizontal scroll** — semua list vertikal; reference frame phone 390×844 (portrait).
- **Tile OSM jangan pernah di-cache** — tidak ada MapLibre offline pack; tiles network-only di
  belakang satu konstanta `TILE_URL`; atribusi `© OpenStreetMap contributors` tetap terlihat.
- **`prefers-reduce-motion` dihormati** — `AccessibilityInfo.isReduceMotionEnabled` mematikan
  animasi spring/fling pada sheet.
- **Alternatif non-drag untuk semua aksi sheet** — tombol snap/kip, bukan cuma gestur.
- **`Rute` via `Linking`** — `geo:` URI di Android, Apple Maps di iOS; jangan embed navigator
  di dalam app.
- **Jalur native adalah React Native** — PWA → TWA dipensiunkan (keputusan owner
  2026-11-15); jangan ikhtiar solusi WebView-hybrid untuk menghemat kerja.

---

## 3. Checklist review senior

Jalankan semua sebelum menyatakan selesai. Tanggal + perangkat + platform ditulis di atas
setiap run. Gerbang otomatis: `npx tsc --noEmit` · `npx expo-doctor` · `npx expo export` kedua
platform.

**A. Kontrak & arsitektur**
1. [ ] Diff > 1 komponen dapat dijelaskan lewat kontrak beku (G1)
2. [ ] Props turun, callback naik; tidak ada prop yang dimutasi anak (G1)
3. [ ] `grep -rn "supabase" src/components/` kosong (G3)
4. [ ] `grep -rn "showToast" src/components/` kosong (G6)
5. [ ] Tidak ada konstanta label/glyph/warna duplikat di luar `spotView.ts`/`tokens.ts` (G5)

**B. Kejujuran UI**
6. [ ] Setiap state sukses terikat ke konfirmasi database (G2)
7. [ ] Rate-limit `{ok:false}` → gagal, bukan sukses (G2)
8. [ ] Gagal submit membuka kembali form dengan isi utuh (G2)
9. [ ] `Lanjut` (pin-drop) disabled sampai pin ada (SPEC §17)

**C. Performa mobile**
10. [ ] Query paginated; tanpa `.select()` pada insert pending (G7)
11. [ ] Marker bercluster; debounce ≥ 200 ms pada redraw (G7)
12. [ ] ≤ 50 kartu + `Tampilkan 50 lagi`; FlatList ter-windowing (G7)
13. [ ] Tidak ada request berulang yang bisa di-debounce/di-batalkan; paket native di-install
      via `npx expo install` (G9)

**D. Aksesibilitas & bahasa**
14. [ ] Target sentuh ≥ 44px; label form terlihat; `accessibilityLabel` ada (G8)
15. [ ] Kontras ≥ 4.5:1 di tema terang **dan** gelap; teruji di kedua platform (G8)
16. [ ] Nol string Inggris di UI; unknown = `Belum ada info` (G8, G4)

**E. Keamanan & data**
17. [ ] `grep -rn "service_role\|sb_secret_" src/ scripts/` kosong (G10)
18. [ ] `package.json` tidak berubah tanpa persetujuan owner; semua via `npx expo install` (G9)
19. [ ] Tidak ada data pribadi baru yang dikumpulkan; store privacy labels = "no data
      collected" (G10)
20. [ ] RLS tetap menyala; probe anon: pending tidak terlihat, UPDATE/DELETE ditolak; keystore
      dan `.env` tidak di-commit (G10)

---

## 4. Definition of done

1. `npx tsc --noEmit` bersih; `npx expo-doctor` bersih; `npx expo export` sukses di kedua
   platform.
2. Terverifikasi di platform yang disentuh (perangkat nyata lebih disukai): app boot, nol red
   screen / console error, flow yang disentuh bekerja.
3. Checklist review senior (§3) lulus semua.
4. UI 100% Bahasa Indonesia; unknown membaca `Belum ada info`.
5. Deskripsi perubahan berdiri sendiri di riwayat git.

Tidak ada linter/CI unit runner — file ini, SPEC, dan manual test checklist **adalah** gerbang
kualitas.
