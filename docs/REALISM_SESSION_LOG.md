# Jurnal sesi realisme Kemudi.id

Catatan bersifat append-only per sesi; pembaruan status ringkas ada di `REALISM_PROGRESS.md`.

## 2026-11-04 — melanjutkan QA dan integrasi LOD

- Permintaan: lanjutkan master plan dan simpan progres lintas hari.
- Ditemukan: modul realisme dan audit/kontrak sudah ada; laporan 3 November masih menyisakan full browser matrix, iframe/backend, stabilitas dan perceptual review.
- Baseline baru: syntax, realism unit, standalone LOD, functions, build WebGL PASS.
- Fokus: persistensi catatan, integrasi render-only traffic LOD dan tes/regresi. Jangan menandai rilis selesai dari tes unit saja.
- Hasil akhir dan titik lanjut akan ditambahkan sesudah verifikasi.

### Checkpoint implementasi dan regresi

- Diubah: `main.js` dan `index.html` menghubungkan TrafficVisualLOD setelah AI/karakter siap, update berdasarkan kamera sebelum render, dan diagnostic snapshot. Tidak mengubah registry collision/gerak AI. Player dikecualikan.
- `tools/webgl/package.json`: test LOD masuk suite realisme (sebelumnya hanya standalone).
- `realism-browser.cjs`: cek 16 AI terdaftar dalam LOD; laporan berikutnya disimpan saat kasus dimulai/selesai agar interupsi tidak menghilangkan seluruh progres.
- `collision-system.js` + `realism-collision.cjs`: perbaikan steering menjauh dari dinding dengan conservative subdivision; regression terbukti gagal sebelum fix, lulus sesudahnya. Tidak memakai endpoint-only clearance.
- PASS pasca-edit: `npm.cmd --prefix tools/webgl run build` (35 file, 7.130.849 byte), `run test:syntax` (45 file), `run test:realism` (11 grup collision, 12 grup traffic, environment/lights/horn/visual/state dan LOD).
- PASS review independen: integrasi LOD dan collision refinement. Batas kedalaman subdivision masih dapat berhenti konservatif pada celah sangat kecil; bukan klaim seluruh acceptance selesai.
- Build default .NET gagal karena DLL sedang dipakai proses Web/API lain; tidak menghentikan proses pengguna. Build alternatif memerlukan NuGet yang ditolak sandbox, lalu dijalankan ulang lewat mekanisme approval dengan `--artifacts-path artifacts/dotnet-realism`.
- Browser matrix berjalan pada build LOD; MOBIL/automatic dan MOBIL/manual dimulai sebelum build ulang collision fix, sehingga bukan bukti browser untuk fix baru. MOTOR/automatic sudah melaporkan seluruh check PASS; hasil keseluruhan menunggu proses selesai.
- Gap terkonfirmasi review: rute simpang AI masih straight-through, sein di-reset false. Prioritas fitur berikutnya: turning intent/routes + pre-turn signals dan tesnya.
- PASS build .NET alternatif setelah retry NuGet: `dotnet build Kemudi.slnx --artifacts-path artifacts/dotnet-realism`, exit 0, 19 warnings/0 errors; bukti `artifacts/realism/dotnet-build-2026-11-04.log`. Warning existing nullability/AdminBadge tidak diperbaiki karena di luar scope realisme browser.

### Hasil akhir sesi dan titik lanjut

- PASS `npm.cmd --prefix tools/webgl run test:realism:browser`, exit 0. Enam kasus MOBIL/MOTOR/TRUK × automatic/manual seluruhnya PASS (49 named case checks). Run UTC 02:10:49–02:44:50 / WIB 09:10–09:44. Bukti `artifacts/realism/browser-report-2026-11-04.json` (salinan report), screenshot per kendaraan di folder yang sama.
- Matriks 12 lingkungan awal/pause, safe spawn 16 AI, registrasi LOD, kontrol, horn event, maju/rem/mundur, kamera, sinkron HUD/kokpit dan pause lolos pada cakupan test. Tidak membuktikan suara di speaker, kualitas visual manusia, atau fitur sein AI saat belok.
- Snapshot final teramati 529–602 draw calls; sebelumnya laporan mencatat 2.134. Ini observasi berbeda run/pose, bukan benchmark A/B terkontrol atau bukti target FPS terpenuhi.
- PASS regresi functions (6), intersection pure (11), unified pure (5), `git diff --check`. Tidak ada lint/typecheck script untuk package JS; static syntax telah dijalankan. Pesan unified pure tentang crossing disabled adalah baseline CityTrack, bukan bukti pedestrian runtime tidak ada; suite realisme menguji pedestrian-system terpisah.
- PASS tes helper checkpoint report (stub fs): kasus belum selesai tetap disimpan `passed:false` bersama updatedAt; syntax browser test PASS. Proses browser matrix tadi dimulai sebelum penambahan helper checkpoint; helper diverifikasi terpisah, jangan mengklaim checkpoint per kasus dipakai pada run tersebut.
- **Belum selesai:** iframe website/backend results/idempotensi, sesi stabilitas 5–10 menit, benchmark FPS terkontrol, review visual/audio manusia, rute belok/sein AI, dan browser edge-case steering-away/batas LOD. Rilis tetap PENDING.
- **Langkah sesi berikutnya:** baca progress/jurnal/QA; cek git status. Kerjakan rute belok AI + pre-turn signal dengan test terlebih dahulu, atau tuntaskan QA iframe/backend lokal. Gunakan kontrak shared collision, jangan mematikan collider untuk LOD. Tidak ada proses test browser yang masih berjalan setelah suite selesai.

## 2026-11-04 — lanjutan belok/sein AI dan preview lokal

- Permintaan: lanjutkan yang tertunda dan jalankan agar pengguna dapat mencoba.
- Server standalone dimulai di `http://localhost:8080/`. Port Web/API lama 5290/5090 telah digunakan, tidak dihentikan. Instance uji tersendiri: API 5890, Web 5891 dengan `artifacts/realism/preview.db` (diabaikan Git).
- Sandbox .NET mengalami EventLog/DataProtection permission failure; retry lewat mekanisme approval memakai port terpisah. Bukan alasan mengubah konfigurasi keamanan produksi.
- Implementasi awal turn routes/sein diuji, tetapi review menemukan red cross-road queue menghalangi belok hijau. Reproduksi konkret sudah diteruskan untuk regression+repair sebelum acceptance. Jangan mengklaim versi awal selesai.
- QA gateway: enam pemeriksaan auth/CSRF/idempotensi/isolation PASS, lalu backend-smoke FAIL pada asumsi selection screen lama (iframe sekarang autostart). Test-only repair sedang dikerjakan; source results/backend tidak diubah.
- Uji kestabilan hujan malam 300 detik dan result-errors gateway dimulai; hasil akhir akan ditambahkan. Catatan ini bukan klaim kedua tes lulus.

### Hasil akhir lanjutan dan preview

- `traffic-routes.js`: adapter kurva belok kiri/kanan dari lane simpang nyata; tidak menyalakan flag legacy `turnsEnabled` yang tidak didukung. `traffic-system.js`: trailing E/W berbelok, perlambatan/sein pra-belok, tetap menyala selama belok lalu auto-cancel. Spine/leading actors tetap straight, total16 aktor dan shared collision tetap.
- Review menemukan reservation menganggap queue merah sebagai konflik. Regression dipasang FAIL dahulu, predicate non-RED memperbaiki; occupancy pusat simpang tetap hard yield. Independent reviewer APPROVE setelah reproduksi 2-aktor hijau/merah berhasil clear.
- Suite traffic diperkuat120 detik simulasi (bukan wall): seluruh4 aktor belok5/7/13/15 wajib benar-benar clear, bukan hanya maju di approach. All15 groups PASS oleh implementer. Pada60 detik sebagian menunggu merah/penyeberang secara sah; selesai pada siklus berikutnya.
- PASS `result-errors.cjs` terhadap Web5891/API5890: 4 checks anonymous/session recovery, pending save setelah login, standalone backend-unavailable. Bukti `artifacts/backend-integration/recovery-report.json`.
- PASS stability300 detik wall,57 sampel, clock55→3690 (sekitar60,6 detik simulasi), errors kosong, overlap dicek. `artifacts/realism/stability-report-2026-11-04.json`, `stability-samples.json`, `night-heavy-rain-stability.png`. Run memakai build sebelum refinement predicate non-RED terakhir; final predicate dibuktikan regression/review, bukan pengulangan300s pada final build. Tidak klaim target FPS/memory leak final.
- `backend-smoke.cjs` diperbaiki test-only: walking autostart, navigasi keyboard mengikuti read-only navigationTarget, injeksi failure ke PedestrianSystem yang benar dan timeout configurable. Diagnostic120s wall FAIL karena full finish belum tercapai:45m/11,5 detik simulasi; enam checks API sebelumnya PASS. Full finish/save/retry/failure/dashboard tetap UNVERIFIED. Bukti `artifacts/backend-integration/report.json`, lastDrivingState.
- Ditambahkan `tools/webgl/realism-iframe.cjs` dan npm `test:realism:iframe`. Percobaan klik button timeout pada host, input keyboard Enter yang didukung berhasil: TRUK/manual unified masuk driving,16 real loaded/active AI, registrasiLOD16, tanpa pageerror. PASS exit0; bukti `artifacts/realism/iframe-report.json`, `iframe-preview.png`.
- Build terbaru PASS35 file /7.133.723 byte, syntax46 authored files PASS. Full suite final root sedang dituntaskan dan akan dicatat di checkpoint penutup. Matrix6 kasus sesi sebelumnya tidak dijalankan ulang setelah turns; jangan klaim full matrix baru.
- HTTP standalone8080 dan website5891 mengembalikan200. Server sengaja tetap aktif untuk uji pengguna. Restart mandiri: `npm.cmd --prefix tools/webgl start`. Website/API: `dotnet run --project src/Kemudi.Api --no-build --no-launch-profile -- --urls http://127.0.0.1:5890 --environment Development "--ConnectionStrings:KemudiDb=Data Source=C:\Users\user\Kemudi.id\artifacts\realism\preview.db"`; `dotnet run --project src/Kemudi.Web --no-build --no-launch-profile -- --urls http://127.0.0.1:5891 --environment Development --Api:BaseUrl=http://127.0.0.1:5890`.
- Berikutnya: hasil coba pengguna (visual/kontrol), edge-case browser wall-escape/LOD, benchmark FPS terkontrol, dan backend full drive dengan `BACKEND_DRIVE_TIMEOUT_MS` cukup. Jangan hilangkan assertion hanya agar test hijau. Database uji tidak masuk Git; tidak ada production API/database yang disentuh.
- Checkpoint penutup: full `npm.cmd --prefix tools/webgl run test:realism` root **PASS exit0** pada source final:11 collision groups,15 traffic groups (120s full world, all4turns clear), environment/state/lighting/horn/visual/LOD. Tidak ada browser test yang masih berjalan; hanya server preview yang dibiarkan aktif.

## 2026-11-04 — pemulihan README proyek

- Permintaan pengguna: buat ulang README root yang terhapus.
- Dibuat `README.md` bahasa Indonesia berdasarkan solusi/csproj, konfigurasi startup, source Web/API, script npm dan catatan QA aktual; bukan menyalin cakupan Unity lama sebagai status browser sekarang.
- Isi: arsitektur/source runtime, prasyarat, simulator mandiri, website/API dengan DB preview terpisah, kontrol, build/tes, keamanan, troubleshooting, tautan progres dan jurnal.
- Perubahan hanya dokumentasi. Tidak mengubah runtime, konfigurasi server, database atau menghentikan preview yang berjalan. Validasi tautan lokal/script/path dan whitespace dilakukan sebelum penutupan; build/suite runtime tidak diulang untuk perubahan README saja.
- Saat validasi, master plan root yang sebelumnya ada tidak lagi ditemukan (git menunjukkan deleted). Tidak dipulihkan tanpa permintaan; tautan README ke file yang hilang dihapus agar tidak broken. File progress/QA tetap menjadi rujukan status.

## 2026-11-04 — integrasi gamepad, dilanjutkan setelah interupsi

- Permintaan: implementasikan RENCANA_INTEGRASI_GAMEPAD_KEMUDI_ID_MULTI_AGENT_CODEX.md. Seluruh rencana dibaca, baseline build/functions/syntax PASS, kontrak freeze sebelum native agent device/settings dan UI mulai. Unity/backend/hasil tidak diubah.
- Audit/kontrak/status baru: `GAMEPAD_AUDIT.md`, `GAMEPAD_CONTRACT.md`, `GAMEPAD_PROGRESS.md`, `GAMEPAD_QA.md`. Ownership G0/G3 root main/controls/vehicle; G1/G2 device+settings; G4 UI; G5 official docs; G6 test specialist browser. Integrasi dan final verification tetap root.
- Root lanjut solo setelah beberapa agent terkena usage limit; tidak menganggap hasil agent error sebagai PASS. Browser awal membuktikan10checks MOBIL/automatic namun iframe initial hydration detached; test reacquire hanya initial frame yang terlepas.
- Safety fixes: View consumeonce, keyboard sparse edges/horn zerotick, perRAF focus guard, residual roll direction, invalid axes lost transition (regression FAIL→PASS), gate manual menjaga netral lalu fresh clutch tanpa tick unclutched.
- Unit device/domain/DOM PASS; build42files; .NET alternate no-restore PASS0errors/3NU1900warnings (auditNuGet tidak tersedia). Full matrix gamepad dan final regresi masih diproses, bukan release acceptance hardware.

### Checkpoint gamepad sebelum inisialisasi AGENTS.md

- Matrix sintetis6kendaraan/transmisi +iframe TRUK/manual PASS67checks; snapshot `artifacts/gamepad/browser-report-2026-11-04.json`. Browser149.0.7827.55 Windowsx64 Node24.18.0. Tidak ada hardware fisik yang diuji.
- Ditemukan regresi keyboard setelah resume: gate menahan seluruh dunia sehingga lampu AI belum mengikuti lingkungan. Repair membatasi halt ke pemain; AI/sinyal/lingkungan tetap tick. Keyboard MOBIL/automatic realism smoke PASS ulang, gamepad MOBIL/manual+iframe TRUK/manual PASS ulang.
- Tambahan consume-once View+Start simultan diverifikasi focused MOBIL/automatic PASS12checks, tidak resume di frame yang sama. Unit/domain/DOM, functions6, realism15traffic/11collision, syntax56 PASS. Build terakhir42files/7.171.540byte.
- Matrix lengkap sebelum refinement gate-player-only/labelgear; post-repair smoke terarah tidak dilabeli sebagai fullmatrix baru. Raw report fokus terakhir disalin ke `artifacts/gamepad/final-focused-auto-report.json`; keyboard smoke ke `artifacts/gamepad/keyboard-regression-report.json`.
- Hardware dan full journey/finish/save/retry/dashboard gamepad tetap NOT RUN/UNVERIFIED. Tidak ada browser test yang masih berjalan; server preview tetap hidup.

## 2026-11-04 — /init agent.md

- Memperbarui `AGENTS.md` yang sudah ada, bukan membuat kontrol instruksi ganda di `agent.md`.
- Isi: struktur Blazor/.NET/Three.js aktual, entry iframe yang benar, source-vs-build, aturan input/physics/results, ownership/delegasi, command tes, DB uji/privasi dan jurnal lintas sesi.
- Blok marker Next.js existing dipertahankan dan diberi cakupan legacy-only. Perubahan staged dan penghapusan pengguna tidak dipulihkan atau di-reset.
- Validasi dokumentasi: path dan script npm yang dirujuk, whitespace diff. Tidak ada perubahan runtime tambahan untuk permintaan init.

## 2026-11-05 — cek kesiapan pengujian controller

- Permintaan: apakah integrasi sesi sebelumnya sudah dapat dicoba dengan gamepad.
- Membaca README, progres/kontrak/QA dan jurnal; memeriksa entry runtime yang
  memuat modul input. Tidak mengubah runtime atau staged changes pengguna.
- PASS `npm.cmd --prefix tools/webgl run test:gamepad`, exit 0: device/settings,
  normalisasi, domain MOTOR/MOBIL/TRUK, safety/arbitration dan UI DOM.
- HTTP localhost:8080 timeout setelah 4 detik; Web5891 connection failed.
  Tidak menjalankan atau menghentikan proses preview. Hasil tes berada di output
  command sesi ini; tidak membuat laporan browser matrix baru.
- Diperbarui GAMEPAD_PROGRESS.md dan GAMEPAD_QA.md. Physical hardware NOT RUN;
  matrix browser, full finish/save/retry/dashboard tidak diulang.
- Langkah berikutnya: jalankan simulator mandiri bila diperlukan, lalu checklist
  hardware GAMEPAD_QA.md dengan mencatat model, koneksi, browser dan mapping.

## 2026-11-05 — menjalankan preview untuk pengguna

- Permintaan: run simulator untuk dicoba menggunakan controller.
- `npm.cmd --prefix tools/webgl start`: build PASS42files/7.171.540byte,
  server http://127.0.0.1:8080/ aktif; sesi proses81773 sengaja tetap hidup.
- PASS HTTP200 halaman MOBIL/automatic autostart serta gamepad-adapter.js dan
  gamepad-ui.js. Bukti di output command sesi; tidak ada matriks baru.
- Tidak mengubah runtime, menjalankan API/DB atau menghentikan proses lain.
  GAMEPAD_PROGRESS.md dan GAMEPAD_QA.md diperbarui.
- Hardware tetap NOT RUN oleh agen. Berikutnya pengguna mencoba controller
  fisik dan melaporkan deteksi, mapping serta kontrol yang bermasalah.

## 2026-11-05 — analog kanan untuk first-person look

- Permintaan: analog kanan menggerakkan kamera first-person. Implementasi
  axes2/3 -> adapter/router -> DomainInput.lookX/lookY -> fixed-tick kamera.
  Fresh deflection saat driving masuk FPV; yaw/pitch dibatasi100/55derajat,
  netral menahan pandangan; Y/C tetap cycle+reset. Walking tidak diubah.
- Runtime berubah: input/gamepad-adapter.js, input/input-router.js,
  controls.js, main.js, systems/cockpit-system.js. Kokpit kini menerapkan mirror
  dan arah pandang bersama tanpa mengubah gerak kendaraan/AI/results/backend.
  Tidak ada dependency, KeyboardEvent palsu atau RAF tambahan.
- Test berubah: gamepad-device.cjs, gamepad-domain.cjs, realism-visual.cjs;
  baru gamepad-look-browser.cjs dan npm test:gamepad:look. Native input/test
  slices terpisah; integrasi/build root. Review menemukan jalur aksi menu lupa
  cameraLook; diperbaiki, regression arah kamera aktual ditambah, narrow
  re-review APPROVE tanpa temuan tersisa.
- Regression unit dibuktikan FAIL sebelum implementasi lalu PASS. Browser awal
  gagal pada baseline gearbox otomatis N->D saat neutral gate baru re-arm,
  lalu strictEqual signedzero (-0 vs0); setup kini re-arm dengan sein dua kali
  sebelum baseline dan menguji magnitudo kecepatan0. Assertion gear/posisi tetap
  dipertahankan; runtime gearbox tidak diubah untuk meloloskan test.
- PASS exit0: test:gamepad (device/domain/UI), test:functions6checks,
  test:realism (collision11groups, traffic15groups, visual7role/typecases,
  state/environment/lights/horn/LOD), test:syntax57files, build42files/
  7.173.341byte. Log unit/visual di artifacts/gamepad/right-stick-unit.log dan
  right-stick-visual.log; npm notice stderr dirender PowerShell sebagai
  NativeCommandError saat Tee, tetapi suite selesai exit0 tanpa assertion gagal.
- PASS browser masing-masing15checks: GAMEPAD_LOOK_CASE=MOBIL/automatic dan
  TRUK/manual dengan npm.cmd --prefix tools/webgl run test:gamepad:look.
  Snapshot final terpisah look-mobil-automatic-report.json dan
  look-truk-manual-report.json, screenshot look-*.png di artifacts/gamepad/.
  Actual camera direction, cockpit/head visibility, independent sticks,
  limits/deadzone/release, Y/C dan pause/menu/reconnect lolos. Total30checks,
  bukan full6case matrix atau bukti hardware.
- Dokumen: README root/tools, GAMEPAD_CONTRACT/PROGRESS/QA diperbarui.
  Whitespace/syntax diperiksa; tidak ada lint/typecheck script khusus.
  .NET/backend/iframe/full finish-save tidak diuji ulang (C# tidak berubah).
- Preview8080 existing dipakai ulang: percobaan server kedua EADDRINUSE,
  tidak menghentikan proses lain. HTTP200 main.js berisi cameraLookActive dan
  halaman index; build terbaru disajikan. Server sengaja dibiarkan aktif,
  pengguna perlu reload halaman. Tidak ada tes browser yang masih berjalan.
- Berikutnya: uji controller fisik USB/Bluetooth, khususnya drift/kenyamanan
  kecepatan tengok, lalu full6case/iframe bila dibutuhkan untuk gate rilis.

## 2026-11-05 — truk tertahan di sambungan jalan perumahan

- Pengguna melaporkan penghalang tak terlihat dengan Screenshot(34).png.
  Inspeksi gambar dan pure reproduction menemukan guard CityTrack.collisionAt
  (bukan collider fisik): original z[-33,33] dan north z[-144,-28] overlap5m,
  sedangkan footprint TRUK sepanjang5,9524m. Center sekitar z-30,5 ditolak
  Batas area; main membatalkan gerak dan menambah pelanggaran seperti benturan.
- Fix hanya city-track.js: koridor x[-8,8] diteruskan sampai z33 di dalam area
  original yang sudah diizinkan. Tidak mengubah main/input/gamepad/ukuran truk,
  shared collision, collider bangunan/AI, score atau results/backend.
- tools/webgl/unified-tests.cjs memakai config kendaraan aktual dan scan4.932
  pose untuk3jenis, dua lajur, dua arah/yaw. FAIL sebelum fix: TRUK pada
  x-1,75 z-30,125 Batas area. PASS sesudah fix, termasuk enam probe batas luar/
  uncovered corner tetap ditolak. Percobaan test awal diperluas sampai z-44
  mengenai legacy agent fixture yang sah; cakupan dipersempit sampai z-37
  agar tetap menguji seluruh seam tanpa menghapus assertion/collider aktor.
- Native geometry diagnosis independen dan review APPROVE mendukung fix;
  root memiliki implementasi dan verifikasi. Test specialist membuat
  road-seam-browser.cjs saja. Package menambah test:road-seam; tidak ada deps.
- PASS exit0: node tools/webgl/unified-tests.cjs (7checks),
  node tools/webgl/realism-collision.cjs (11groups), test:functions6,
  test:realism (termasuk traffic15/120simseconds), test:syntax58authoredfiles,
  build42files/7.173.580byte. Tidak ada script lint/typecheck khusus.
- PASS npm.cmd --prefix tools/webgl run test:road-seam: unit7checks lalu
  browser5checks TRUK/automatic; normal spawn24m -> Enter/I/B/Space/W -> z<-38,
  lajur tetap, pelanggaran tidak bertambah, lalu S/rem tangan berhenti.
  Tidak memakai hook mutasi posisi/vehicle/clock. Bukti:
  artifacts/unified/unit-report.json,
  artifacts/realism/road-seam-browser-report.json dan
  artifacts/realism/road-seam-truk-automatic.png. Pageerrors kosong.
- Progress/QA realisme diperbarui. Preview8080 existing menyajikan fix HTTP200
  dan sengaja tetap aktif; tidak menjalankan/menghentikan Web/API/DB. Semua
  browser test sesi ini sudah selesai. Pengguna perlu Ctrl+F5 untuk source baru.
- Gap: fullmatrix6kasus/iframe/backend/USB-Bluetooth tidak diulang; tes browser
  baru memakai keyboard, sementara boundary guard sama untuk semua sumber.
  Langkah berikutnya pengguna ulangi lokasi screenshot dengan controller nyata;
  bila macet di lokasi berbeda, ambil posisi/arah dan screenshot untuk diagnosis.

## 2026-11-05 — memastikan analog kanan tengok kiri dan kanan

- Permintaan: analog kanan tidak hanya atas/bawah, tetapi juga kiri/kanan.
  Membaca ulang source adapter/router/DomainInput/main/kokpit dan preview HTTP.
  Jalur axes2 -> lookX -> yaw sudah ada; tidak menemukan reproduksi kerusakan
  horizontal dengan mapping standar. Model controller/perilaku aktual diminta
  via pertanyaan native; tidak mengasumsikan perangkat pengguna sudah lolos.
- Perubahan hanya tools/webgl/realism-visual.cjs dan gamepad-look-browser.cjs:
  isolated yaw left/right di semua3kokpit dan dua browser checks horizontal-only
  terpisah, menguji arah kamera aktual serta pitch/setir/posisi tetap.
- PASS exit0 visual7role/typecases, syntax58authoredfiles, dan
  GAMEPAD_LOOK_CASE=TRUK/automatic npm.cmd --prefix tools/webgl run test:gamepad:look
  (17checks). Bukti artifacts/gamepad/look-horizontal-truk-automatic-report.json,
  look-horizontal-left-truk-automatic.png dan look-horizontal-right-truk-automatic.png.
- GAMEPAD_PROGRESS/QA diperbarui, whitespace diperiksa. Tidak mengubah runtime,
  setting/mapping, backend atau data; build/fullrealism/fullmatrix/iframe tidak
  diulang karena tes/dokumen saja berubah. Preview8080 existing HTTP200 tetap
  hidup; browser test sudah selesai. Tidak ada klaim hardware fix baru.
- Berikutnya: bila pengguna memang hanya mendapat gerak vertikal, gunakan
  model controller dan pembacaan axis aktual untuk diagnosis mapping, bukan
  mengubah axis default secara spekulatif. Acceptance perangkat masih terbuka.

## 2026-11-05 — pengaturan handling dan berat setir/stang

- Permintaan: pengguna bisa menyesuaikan berat/ringan setir atau stang.
  Scope respons simulasi untuk MOTOR/MOBIL/TRUK dan keyboard/gamepad, bukan
  physical force feedback. Normal50/return1 menjaga response turn existing.
- vehicle.js: immutable per-instance setHandling, weight0..100 mengatur
  response2x→.5x tanpa mengubah max lock/grip/speed guard; return.5..2 terpisah,
  keyboard clamp ke nol mencegah overshoot. main.js menerapkan preferences hanya
  ke pemain saat creation/change/reset dan menambah read-only handling snapshot.
  Tidak menambah RAF/dependency atau mengubah result/AI/collision/transmisi.
- input/gamepad-settings.js mempertahankan schema/keyv1 dan remap lama; UI/CSS
  menambah Handling & setir / stang, presets/label/aria-pressed dan Dpad fields.
  Nilai tersimpan lokal dan ikut pada kendaraan baru; tidak menimpa browser
  pengguna lewat tes (Playwright memakai context terisolasi).
- Native UI/settings slice memiliki lima file sendiri, test specialist hanya
  handling-browser.cjs, root vehicle/main/pure tests/package/build/integrasi.
  Independent review7files APPROVE tanpa temuan. Test settings/UI dan pure unit
  dibuktikan FAIL sebelum implementation kemudian PASS; tidak melemahkan test.
- PASS exit0 test:handling19groups (6type/input combinations), test:gamepad
  (device/domain/UI termasuk migration/presets), test:functions6,
  test:realism (collision11,traffic15/120simseconds,visual7 dan modul lain),
  node tools/webgl/unified-tests.cjs7checks, test:syntax60authoredfiles,
  build42files/7.176.563byte. Tidak ada lint/typecheck script terpisah.
- PASS test:handling:browser MOBIL/automatic10checks. Actual UI→player handling,
  light/heavy/normal/custom weight+return, Dpad, persistence/reload/new vehicle,
  reset, neutral gate/fresh activation dan tidak ada gerak tidak disengaja.
  No pageerrors. Bukti artifacts/gamepad/handling-unit-report.json,
  handling-browser-report.json, handling-mobil-automatic-report.json dan
  handling-mobil-automatic-settings.png. Screenshot settings juga diinspeksi;
  bukan review kenyamanan fisik/controller acceptance.
- README root/tools, GAMEPAD_CONTRACT/PROGRESS/QA diperbarui. Source/settings
  controller lama dipertahankan; hanya state handling pemain baru diterapkan.
  .NET/backend/full6case/iframe/hardware tidak dijalankan ulang. Semua proses tes
  sudah selesai; preview8080 existing HTTP200 tetap hidup, perlu reload pengguna.
- Berikutnya: pengguna mencoba Ringan/Normal/Berat sesuai kendaraan dan perangkat;
  catat kenyamanan/rentang nilai yang diinginkan. Fullmatrix/iframe bila dibutuhkan
  sebagai gate rilis; jangan menyebut software steering weight sebagai FFB fisik.

## 2026-11-10 — menjalankan project dan QA browser MCP Playwright
- Permintaan pengguna: run project dan cari bug/error lewat browser.
- Hanya menambah bukti artifacts/browser-qa-2026-11-10/ serta entri progress/QA/jurnal; source aplikasi, tes dan perubahan existing tidak diubah.
- PASS exit0 dotnet build Kemudi.slnx --no-restore, 0 warning/error incremental; test:syntax60; functions6 (assertion asli via redirect laporan ke stdout); test:realism termasuk collision11/visual7/traffic15/full-world120simseconds.
- Build alternatif --no-restore awal gagal NETSDK1004 karena belum ada assets di folder baru; default build berikutnya PASS. DPAPI/EventLog sandbox memutus response awal; Web/API direstart dengan approval di luar sandbox. Bukan klaim defect deployment.
- MCP browser PASS halaman publik/detail materi, register dummy/dashboard, logout/login benar, password salah401, filter kursus/mobile menu; iframe /simulasi dan /simulasi/play siap, mobil otomatis masuk/mesin/sabuk/rem tangan/gas/rem/pause. Tick1530/posisi freeze saat pause. Screenshot actual renderer diinspeksi.
- FAIL terkonfirmasi: mentor query hilang pada form, ringkasan literal ?? fallback, pesan login kosong salah, label form kursus tidak memiliki control. Source diagnosis di source-findings.md; tidak ada fix.
- Login awal400 dan input simulator timeout dievaluasi ulang, bukan disimpulkan hashing/fisika rusak; ulang dengan sinkronisasi input/fokus canvas PASS. Frame startup sempat detached; live frame berikutnya ready.
- Bukti REPORT.md, baseline-tests.log, dotnet-build-default.log, routes-results.json, course-results.json, login-success.json/login-validation.json, simulator-results.json, PNG course-summary/mobile-courses/simulator-loaded/simulator-pause. DB test.db* di-ignore lokal; tidak simpan password/token/cookie di laporan.
- Server preview5891 (exec86214) dan API5890 (exec56466) sengaja dibiarkan hidup dengan DB terpisah artifacts/browser-qa-2026-11-10/test.db; sandbox server milik sesi sudah berhenti; tidak menjalankan8080.
- NOT RUN pembayaran/enrollment final, admin berwenang, full6case, finish/save/retry/dashboard, controller fisik/audio/FPS/stability panjang/security audit. Tidak mengubah status acceptance/rilis.
- Next: perbaiki query mentor dan ringkasan Razor, validasi/label form; tambah regression UI dan ulang pendaftaran sebelum pengujian pembayaran.

## 2026-11-11 — QA fitur menyeluruh terjangkau dan perbaikan 13 warning

- Pengguna meminta uji fitur, laporkan penyebab warning sebelum fix. Laporan
  awal disampaikan sebelum edit aplikasi. Tiga edit produksi: VehicleData.cs
  menghapus explicit null default FirstOrDefault; AppDbContext.cs null-safe
  structural predicate; Components/_Imports.razor mengimpor namespace AdminBadge.
  Tidak mengubah schema, CSV converter, simulator/input/results/scoring atau API.
- Tambah tools/Kemudi.RegressionTests (console/self-check, tanpa dependency baru)
  untuk lookup, comparer null/equality/hash, mutation/snapshot EF, render actual
  AdminKursus. RED dua checks sebelum fix; GREEN10/10 sesudah dan final ulang.
  tools/webgl/backend-smoke.cjs menunggu validasi form kosong agar input masuk
  setelah Blazor interactive; assertion auth/results/drive lama dipertahankan.
- Command PASS: `dotnet restore Kemudi.slnx --artifacts-path
  artifacts/dotnet-warning-tests --source $env:USERPROFILE/.nuget/packages`, lalu
  `dotnet build Kemudi.slnx --artifacts-path artifacts/dotnet-warning-tests
  --no-restore -t:Rebuild --nologo -warnaserror` =>0warnings/0errors. NuGetonline
  sebelumnya gagal sandbox, retry approved masih bermasalah/audit tidak terambil;
  cache restore bukan bukti online vulnerability audit. Tidak ada suppression.
- PASS `dotnet run --project tools/Kemudi.RegressionTests --artifacts-path
  artifacts/dotnet-warning-tests --no-restore`, final `--no-build --no-restore`;
  node syntax dan scoped git diff --check. Review independen APPROVE tanpa temuan
  pada diff warning/tes. Bukti warnings-before/after/final.log, dotnet-build.log.
- Native QA lane website:60PASS/7FAIL67checks +3focused probes. Public routes,
 3course filters,4mentor profiles,4materi details, auth/reload/profile,12adminAPI
  authorization dan9UI redirects,3local enrollment/payment instruction flows.
  Temuan8: pembayaran anonymous paid/duplicate; login admin circuit failure;
  invalid-cookie authenticated UI; mentor query hilang; literal ?? summary;
 7label tanpa control; pesan login kosong; mobile home390→495px overflow.
  Pembayaran dibuktikan hanya pada dummy milik tes; bukan transaksi bank.
  Temuan fitur tidak diperbaiki diam-diam di scope warning.
- PASS simulator `npm.cmd --prefix tools/webgl run build`42files/7.176.563bytes,
  test:syntax60, test:functions6, test:realism collision11/traffic15fullworld120s,
  test:gamepad device/domain/UI, test:handling19, intersection/unified unit7.
- PASS browser smoke3automatic vehicles, intersection, unifiedlegacyaliases,
  road-seamTRUK5. Fullrealism6vehicle/transmission49checks+environment matrices
  PASS35m33s; syntheticgamepad6standalone69checks PASS24m43s; focused handling
  MOBIL/automatic10checks. Waktu wall bukan hardware FPS benchmark. Fulllook
  dibatalkan saat kasus pertama (partial bukan PASS), handling5lainnya NOT RUN.
- Backend awal FAIL register input hilang/hydration; evidence baseline disimpan.
  Sesudah observable readiness, `WEB_URL=5891 API_URL=5890
  BACKEND_DRIVE_TIMEOUT_MS=180000 node tools/webgl/backend-smoke.cjs` meluluskan
 6checks anonymous/HttpOnly/logout-login/CSRF+validation/concurrentretry/isolation,
  kemudian FAIL belum finis (clock12,58s, z=-20,35m). Tidak mengklaim downstream
  fulljourney save/failure/retry/dashboard. Result-errors4checks PASS5891 dan5893.
- Fresh build Web5893/API5892 HTTP200 (root/login/kursus/Swagger), API tidak perlu
  migrasi baru. `WEB_URL=5893 node tools/webgl/realism-iframe.cjs` FAIL wait driving;
  diagnostic artifact menangkap initial detached frame dan retry canvas-click
  timeout. Penyebab belum dipastikan, tidak dicatat sebagai PASS iframe.
- `node artifacts/feature-qa-2026-11-11/gateway-results.cjs` PASS3checks tanpa3D:
  respons sudah-save hilang→503→retry satuAttemptId; completed/failed tersimpan;
  dashboard kedua status bertahan reload. Payload diinjeksi tes, bukan perjalanan.
- Evidence lengkap `artifacts/feature-qa-2026-11-11/REPORT.md`, website/REPORT.md,
  simulator/REPORT.md dan report/log/screenshots terkait. Existing test scripts
  memperbarui canonical artifact/screenshot di artifacts/{webgl,realism,gamepad,
  intersection,unified,backend-integration}; tidak menghapus/memulihkan artefak lama.
  Tidak menyimpan credential/token/cookie; DBpreview di-ignore, bukan produksi.
- Preview baru sengaja aktif: Web5893 exec9001, API5892 exec95111, memakai
  `dotnet run --artifacts-path artifacts/dotnet-warning-tests --no-build
  --no-launch-profile` dan DB artifacts/realism/preview.db. Standalone8080
  exec80413 tetapaktif. Upaya stop tool sessions lama tidak membebaskan listener
 5890/5891; startup ulang portlama gagalbind, tidak memaksa kill PID tanpa proof.
- NOT RUN: genuineauthorizedadmin CRUD/settings/schedules, externalproviders,
  hardwarecontroller, audio/visual manusia, hardwareFPS dan stability5menitbaru.
  Rilis tetap NEEDSATTENTION. Next spesifik: perbaiki payment trust boundary dan
  adminlogin dengan regresi, lanjut query/summary/labels/mobile, diagnosis iframe
  hydration/fokus, kemudian real journey finish/save/retry/dashboard pada host
  dan batas waktu memadai. Pengujian luas ini bukan bukti seluruh fitur sempurna.
