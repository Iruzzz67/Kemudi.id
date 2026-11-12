# Gamepad QA dan status implementasi

## Regresi 11 November 2026

- PASS6kasus standalone sintetis69checks, fresh pada source saat ini. Seluruh
  kendaraan/transmisi, input analog, guarded gears, menu/edge-once, arbitration,
  pause/held-resume/disconnect/error safety. Tidak ada runtime gamepad diubah.
- PASS unit device/domain/UI, handling19 dan focused handling browserMOBIL/auto10.
  Arsip `artifacts/feature-qa-2026-11-11/simulator/gamepad-full-report.json`,
  `handling-report.json`, log dan `REPORT.md`; full realism6kasus49 juga PASS.
- Full look browser dibatalkan saat kasus pertama setelah assertion parsial;
  `look-partial-report.json` bukan PASS. Lima handling cases browser lain NOT RUN.
- Gamepad iframe, USB/Bluetooth fisik, kenyamanan/FFB, audio manusia, FPS dan
  sustained stability baru NOT RUN. Main keyboard iframe5893 timeout/detachment
  belum didiagnosis tuntas; jangan mengklaim iframe acceptance dari standalone.

## Handling / berat setir-stang — 5 November 2026

- Settings v1 menambah steeringWeight0..100/default50 dan steeringReturn.5..2/
  default1; optional saat load legacy, strict finite/range validation saat ada.
  Save/reset/denied storage aman, remap/preferensi lama tetap dipertahankan.
- UI berlabel dan Dpad-operable tanpa controller, preset Ringan/Normal/Berat
  dengan aria-pressed. Preset hanya mengganti berat, tidak menghapus nilai return.
  Root menerapkan state immutable hanya ke pemain, saat dibuat/setelah perubahan.
- Weight scales respons2x/1x/.5x; input analog tetap menuju full lock yang sama,
  keyboard memakai turn rate. Pemusatan terpisah dan tidak overshoot. Pembatas
  setir kecepatan tinggi, drivetrain/kopling dan shared collision tetap.
  Bukan pengaturan tahanan fisik atau force feedback perangkat.
- PASS test:handling19groups:3jenis×2input, default response, light>normal>heavy,
  full lock, return, speed clamp, atomic validation/isolation dan propose tanpa
  commit. Regresi FAIL sebelum setter diterapkan, PASS setelahnya. Bukti
  artifacts/gamepad/handling-unit-report.json.
- PASS test:gamepad device/domain/UI termasuk legacy migration/invalid fields,
  persistence/reset, no-device labels/presets/Dpad. PASS functions6, realism
  (collision11/traffic15/visual7 dan modul lain), unified7, syntax60files,
  build42files/7.176.563byte. Reviewer APPROVE. Tidak ada lint/typecheck script
  khusus; C#/.NET/backend tidak diubah/diuji ulang.
- PASS test:handling:browser default MOBIL/automatic10checks: settings UI ke
  actual snapshot.handling, presets+custom return, Dpad, storage/reload/new vehicle,
  reset dan held steering+RT ditahan sampai neutral/fresh input. No pageerrors.
  artifacts/gamepad/handling-mobil-automatic-report.json, handling-browser-report.json
  dan handling-mobil-automatic-settings.png. Browser tidak menginjeksi vehicle/
  clock/transform; navigator gamepad sintetis saja.
- Hardware/kenyamanan setir/stang manusia, full6case dan iframe NOT RUN. Browser
  fokus ini tidak mengukur slope dinamika (pure unit menguji slope); bukan klaim
  seluruh release acceptance terpenuhi. Preview8080 sengaja dibiarkan aktif.

## Verifikasi horizontal terisolasi — 5 November 2026

- Pengguna menegaskan analog kanan harus tengok kiri/kanan, tidak hanya vertikal.
  Source dan HTTP preview sudah memuat lookX/yaw. Tidak ada runtime fix baru
  diklaim karena masalah perangkat belum berhasil direproduksi dengan input standar.
- realism-visual.cjs kini menguji yaw kiri/kanan tanpa pitch untuk3jenis kokpit:
  arah kamera aktual berubah horizontal, vertikal tetap, posisi di mata pengemudi.
  gamepad-look-browser.cjs menambah dua horizontal-only checks terpisah.
- PASS node tools/webgl/realism-visual.cjs (7role/typecases), test:syntax58files,
  GAMEPAD_LOOK_CASE=TRUK/automatic test:gamepad:look (17checks), exit0. Kiri/kanan
  horizontal aktual, kombinasi vertikal, independent sticks dan gate safety lolos.
  Bukti artifacts/gamepad/look-horizontal-truk-automatic-report.json, screenshot
  look-horizontal-left-truk-automatic.png dan look-horizontal-right-truk-automatic.png.
- Hanya test/docs berubah; tidak perlu build runtime ulang. Tidak mengubah mapping
  perangkat berdasarkan tebakan. Model/perilaku controller pengguna masih diminta;
  hardware dan fullmatrix belum dibuktikan oleh run ini.

## Analog kanan / first-person — 5 November 2026

- Axes2/3 masuk continuous.lookX/lookY melalui adapter/router/domain yang sama;
  deadzone existing dan gate pause/focus/disconnect ikut melindungi kamera.
  Fresh deflection saat driving masuk FPV; release menahan pandangan. Y/C
  cycle+reset menang terhadap stick yang masih ditahan. Walking tidak berubah.
- Kokpit menggabungkan posisi mata, mirror dan yaw/pitch. Reviewer menemukan
  jalur aksi menu lupa meneruskan look; diperbaiki dan regression browser
  memastikan arah kamera aktual tidak snap saat paused action. Re-review APPROVE.
- PASS `test:gamepad` (device/domain/UI), `test:functions`6checks,
  `test:realism` (collision11, traffic15, visual7role/typecases, modul lainnya),
  `test:syntax`57files dan build42files/7.173.341byte. Tidak ada script lint/
  typecheck khusus; .NET tidak diulang karena tidak ada source C# berubah.
- PASS `GAMEPAD_LOOK_CASE=MOBIL/automatic` dengan `test:gamepad:look`:
  15checks, termasuk arah kamera aktual, cockpit/head visibility, batas sudut,
  kontrol dua stick independen, Y/C, neutral/deadzone dan resume/menu/reconnect.
  Bukti `artifacts/gamepad/look-mobil-automatic-report.json`, screenshot
  `look-mobil-automatic.png`, log `right-stick-unit.log`/`right-stick-visual.log`.
- PASS browser TRUK/manual15checks dengan command yang sama dan filter kasus
  sesuai; bukti `artifacts/gamepad/look-truk-manual-report.json` serta screenshot
  `look-truk-manual.png`. Total30checks dari2kasus terarah, bukan fullmatrix6.
- Full6case/iframe baru dan hardware fisik
  NOT RUN; tes sintetis bukan bukti kompatibilitas controller pengguna.

## Pemeriksaan kesiapan 5 November 2026

- Lanjutan permintaan run: `npm.cmd --prefix tools/webgl start` membangun
  42 file/7.171.540 byte dan menjalankan preview8080. HTTP200 halaman MOBIL/
  automatic, input/gamepad-adapter.js dan input/gamepad-ui.js. Server dibiarkan
  aktif untuk pengguna; ini bukan acceptance hardware atau full browser matrix.

- `npm.cmd --prefix tools/webgl run test:gamepad`: PASS exit 0, seluruh
  device/settings/normalisasi, domain dan UI DOM checks.
- HTTP preview: localhost:8080 timeout (4 detik); Web5891 connection failed.
  Tidak ada server baru dijalankan. Restart mandiri dengan perintah start di bawah.
- Controller fisik USB/Bluetooth dan browser matrix tidak diuji ulang;
  kesiapan untuk uji hardware bukan bukti kompatibilitas model perangkat.

Tanggal: 4 November 2026. Target: runtime Three.js, bukan Unity.
**Status: implementasi terpasang; penerimaan perangkat fisik belum dilakukan.**

## Implementasi dan keputusan

- G0/G3: domain snapshot keyboard/gamepad, arbitration satu sumber, satu polling
  dalam RAF existing, sparse edge buffering pada fixed tick, analog adapter di
  Vehicle dan guard arah otomatis. Tombol keyboard lama tidak diganti.
- G1/G2: reader current Gamepad API, normalisasi/histeresis, standard mapping,
  pemilihan device, settings schema1 immutable, remap unik, storage fallback.
- G4: status dan dialog aksi/settings, Dpad/A/B + keyboard/mouse, peralatan sesuai
  jenis kendaraan, device picker/remap/reset. Device ID dirender sebagai teks.
- G5: iframe tetap same-origin dengan policy existing; tidak ada header/sandbox
  yang dilemahkan. Tidak ada endpoint input atau perubahan payload hasil.
- G6: unit, DOM browser dan actual-runtime browser sintetis; bukti di
  `artifacts/gamepad/`. Synthetic provider hanya dipasang oleh Playwright lewat
  addInitScript, tidak ada hook mutasi kendaraan/clock dalam aplikasi produksi.

## Safety dan temuan review

- View yang semula langsung menutup dialog diperbaiki dengan consume-once menu
  edge. Edge keyboard yang semula tertimpa false di zero-tick frame sekarang
  diakumulasi hanya saat true, termasuk horn keyboard.
- Blur/visibility dan kehilangan device mengosongkan input, buffer dan audio,
  lalu pause. Guard fokus juga dilakukan per RAF agar async entering/loading
  tidak memulai driving ketika iframe sudah kehilangan fokus.
- Resume memerlukan kontrol netral lalu **aktivasi baru**. Gerak/dinamika pemain
  ditahan selama gate agar tidak melepas kopling manual secara implisit ke gigi
  yang engaged. AI/sinyal/lingkungan tetap tick setelah resume. Setelah netral,
  tahan L3 lagi untuk melanjutkan manual.
- Data axes rusak memicu safe pause pada transisi saja, bukan setiap frame;
  regression terbukti FAIL sebelum repair dan PASS sesudahnya. Keyboard dapat
  dipakai setelah resume sengaja walau perangkat tetap error.
- Pilih Drive/Reverse hanya dengan brake>.1 dan speed<=.5km/h. Brake menghapus
  residual roll kecil agar gearbox tidak membatalkan permintaan Drive. Manual
  gear tetap membutuhkan kopling; bantuan kopling diberi label dan default OFF.
- Source keyboard dan gamepad tidak dicampur. Pause adalah pengecualian global
  OR sekali; cooldown pergantian sumber200ms. Tidak ada loop input tambahan.

## Bukti yang telah dijalankan

| Pemeriksaan | Hasil / batas |
| --- | --- |
| Baseline sebelum edit | PASS build35files, functions6, syntax46files |
| `npm.cmd --prefix tools/webgl run test:gamepad` | PASS device/normalisasi/settings, domain3jenis, arbitration/safety/buffer/horn, isolated UI DOM |
| `npm.cmd --prefix tools/webgl run test:functions` | PASS6checks setelah adapter analog pertama; final regresi dicatat di jurnal |
| `npm.cmd --prefix tools/webgl run build` | PASS42files; input scripts/CSS masuk build, asset hashes tetap divalidasi |
| Syntax | PASS setelah integrasi awal; final jumlah dicatat di jurnal |
| .NET alternate build `--no-restore --artifacts-path artifacts/dotnet-realism` | PASS0errors/3warnings NU1900 audit NuGet tidak tersedia; bukan bukti vulnerability scan bersih |
| Browser actual runtime | Sebelum refinement gate terakhir: MOBIL/automatic10checks PASS; iframe gagal initial hydration detached. Test diperbaiki hanya untuk reacquire initial prerendered frame; matrix final sedang dijalankan |
| Physical USB/Bluetooth | NOT RUN; tidak ada perangkat yang diverifikasi di sesi ini |

Log .NET: `artifacts/realism/dotnet-gamepad-build.log`. Test DOM memakai Chromium
dan fake API menguji integrasi, **bukan** bukti driver/hardware/audio speaker.
Six-case realism matrix lama bukan pengganti matrix gamepad terbaru.

## Jalankan tes

### Checkpoint terakhir sebelum `/init agent.md`

- Full matrix sintetis6kasus+iframe PASS67checks, tersimpan di
  `artifacts/gamepad/browser-report-2026-11-04.json`; Windowsx64,
  Chromium149.0.7827.55, Node24.18.0.
- Setelah refinement gate-player-only: keyboard MOBIL/automatic realism smoke
  PASS, gamepad MOBIL/manual +TRUK/manual iframe PASS. Setelah consume-once
  View+Start: focused MOBIL/automatic PASS12checks. Fokus terakhir dan keyboard
  report di `artifacts/gamepad/final-focused-auto-report.json` dan
  `artifacts/gamepad/keyboard-regression-report.json`.
- Final unit/DOM/domain, syntax56files, functions6 dan realism suite PASS;
  build42files/7,171,540byte. Fullmatrix6kasus mendahului refinement terakhir,
  bukan fullmatrix baru pada setiap revisi. Independent review awal menemukan
  bug yang diperbaiki; final independent re-review terhenti usage limit, root
  memverifikasi perbaikan lewat regresi. Tidak ada klaim final reviewer APPROVE.
- Physical hardware dan full gamepad journey→finish/save/dashboard belum
  terverifikasi. Status belum release-ready; lanjutkan checklist di bawah.

```powershell
npm.cmd --prefix tools/webgl run test:gamepad
npm.cmd --prefix tools/webgl start
# Terminal lain:
$env:WEB_URL = 'http://127.0.0.1:5891' # opsional: website/API lokal aktif
npm.cmd --prefix tools/webgl run test:gamepad:browser
# Satu kasus diagnostik (bukan seluruh matrix):
$env:GAMEPAD_CASE = 'MOBIL/automatic'
npm.cmd --prefix tools/webgl run test:gamepad:browser
Remove-Item Env:GAMEPAD_CASE
```

## Checklist manual hardware — semua NOT RUN

Catat tanggal, merek/model, USB/Bluetooth, OS, browser/version dan mapping browser.
Jangan menyimpulkan kompatibilitas semua controller dari label `standard` saja.

1. Fokuskan simulator, tekan/release tombol untuk discovery, kemudian A lagi
   untuk masuk. Cek status dan pilih device yang benar bila lebih dari satu.
2. MOTOR/MOBIL/TRUK × automatic/manual: partial/full RT/LT, stick netral/jitter,
   setir, engine X, rem tangan Dpad bawah, kamera Y, lampu/sein/hazard/horn.
   Analog kanan harus masuk FPV saat driving, tengok dua sumbu, berhenti saat
   netral tanpa drift; Y/C tetap bisa mengganti mode dan mereset pandangan.
3. Manual: L3+gigi Dpad; gear tanpa kopling ditolak. Automatic: moving reverse
   ditolak; berhenti+LT memilih reverse/drive. Uji bantuan kopling terpisah.
4. View → peralatan motor4item/sabuk → B kembali. Coba settings, remap, reset,
   device picker, disable dan keyboard fallback; fokus selalu terlihat.
5. RT ditahan: pause/resume, cabut/reconnect, blur/tab hidden/iframe focus.
   Tidak boleh akselerasi dari input lama; release netral dan aktivasi sengaja.
6. Ulangi standalone dan website iframe; periksa console, finish/gagal,
   penyimpanan dan retry AttemptId. Full backend drive masih memiliki gap lama.

## Sumber platform

- [MDN Using Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- [MDN getGamepads](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getGamepads)
- [MDN Permissions-Policy gamepad](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/gamepad)
- [W3C standard mapping](https://w3c.github.io/gamepad/#remapping)
- [MDN secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)

Riset4November: tangkap SecurityError, reacquire device setiap frame dan jangan
mengasumsikan event connection memberi state tombol live. Policy tidak diubah
hanya berdasarkan asumsi. Hardware dan lingkungan embedding tetap perlu diuji.
