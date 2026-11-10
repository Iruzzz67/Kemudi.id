# Titik lanjut gamepad

## 5 November 2026 — pengaturan handling setir/stang

- Menu Controller / Aksi memiliki preset Ringan/Normal/Berat, berat0–100
  (default50) dan kembali ke tengah0,5–2× (default1). Berlaku untuk input
  keyboard/gamepad pada pemain; pengaturan lokal v1 lama tetap kompatibel.
- Berat mengubah respons belok, bukan max lock/grip/force feedback fisik.
  AI/config kendaraan tidak diubah. Return keyboard kini tidak melewati netral.
- PASS handling19groups (3jenis×2input), device/domain/UI, functions6,
  realism lengkap (collision11/traffic15), unified7, syntax60files dan
  build42files/7.176.563byte. Review independen APPROVE.
- PASS browser MOBIL/automatic10checks untuk UI→pemain, Dpad, persist/reload,
  reset dan held-input safety. Bukti artifacts/gamepad/handling-unit-report.json,
  handling-mobil-automatic-report.json dan handling-mobil-automatic-settings.png.
- Preview8080 aktif; reload untuk kontrol baru. Hardware/kenyamanan manusia,
  full6case browser dan iframe belum diuji untuk fitur ini.

## 5 November 2026 — verifikasi kiri/kanan analog kanan

- Permintaan pengguna menegaskan tengok horizontal selain vertikal. Source dan
  preview sudah memiliki axes2 -> lookX -> yaw; tidak mengubah runtime tanpa
  reproduksi bug. Tambah tes horizontal-only kiri dan kanan, bukan hanya diagonal.
- PASS visual unit3jenis, syntax58files dan browser TRUK/automatic17checks.
  Kamera aktual bergerak kedua arah tanpa pitch/setir/posisi kendaraan berubah.
  Bukti artifacts/gamepad/look-horizontal-truk-automatic-report.json dan
  look-horizontal-left/right-truk-automatic.png.
- Masalah pada controller fisik belum terkonfirmasi/terdiagnosis; model dan
  perilaku perangkat diminta dari pengguna. Jangan menganggap tes sintetis
  menutup laporan perangkat. Build tidak diulang (hanya tes/dokumentasi berubah).

## 5 November 2026 — analog kanan / first-person

- Implementasi: stick kanan axes2/3 memilih FPV saat driving dan menggerakkan
  yaw/pitch; deadzone existing, batas100/55derajat, release menahan pandangan.
  Y/C tetap cycle+reset; tidak mengubah setir/kopling/gigi atau loop simulasi.
- PASS unit device/domain/UI, visual kokpit3jenis, functions6, realism lengkap,
  syntax57files dan build42files/7.173.341byte. Browser MOBIL/automatic15checks
  PASS; browser TRUK/manual15checks juga PASS (hasil final di QA/jurnal).
- Preview8080 menyajikan modul baru (HTTP200). Reload halaman untuk mencoba.
  Physical controller tetap NOT RUN; bukan penerimaan seluruh6kasus/iframe.

5 November 2026 (preview): permintaan run dipenuhi; build42files/7.171.540byte
PASS, standalone http://127.0.0.1:8080/ aktif (HTTP200 halaman dan modul gamepad).
Server sengaja dibiarkan hidup untuk uji controller pengguna; hardware belum dinilai.

5 November 2026: cek kesiapan pengguna; `test:gamepad` PASS ulang (exit 0).
Hardware tetap NOT RUN. Preview8080 timeout dan Web5891 tidak terhubung;
tidak menjalankan server baru. Langkah berikutnya tetap checklist hardware.

4 November2026: G0 audit/kontrak, G1/G2 device/settings, G3 arbitration/analog,
G4 menu/status dan G5 platform audit sudah terintegrasi. Source bukan Unity.

Lihat `GAMEPAD_AUDIT.md`, `GAMEPAD_CONTRACT.md`, `GAMEPAD_QA.md` dan
`REALISM_SESSION_LOG.md` sebelum melanjutkan. Preserve staged user deletions.

## Sesi berjalan

- Regression unit device/domain/DOM PASS; build input folder42files PASS.
- Data malformed lost-loop, View auto-close, sparse edges/horn, async focus,
  residual reverse velocity dan manual resume gate sudah diperbaiki.
- Matrix sintetis6cases+iframe PASS67checks; snapshot tetap disimpan di
  `artifacts/gamepad/browser-report-2026-11-04.json`. Chromium149.0.7827.55,
  Windowsx64, Node24.18.0; bukan bukti hardware.
- Physical controller: NOT RUN. Nonstandard mapping: unsupported eksplisit.
- Post-repair: neutral gate hanya menahan pemain, tidak memblokir AI/lingkungan.
  Keyboard MOBIL/automatic realism smoke PASS; gamepad MOBIL/manual + TRUK/manual
  iframe PASS ulang. Simultaneous View+Start PASS pada focused MOBIL/automatic.
- Unit/domain/UI, syntax56files, functions6, realism15traffic/11collisiongroups
  PASS; build42files/7.171.540byte. .NET alternate PASS0errors/3NU1900warnings.
- README/panduan simulator diperbarui. User kemudian meminta `/init agent.md`;
  `AGENTS.md` diinisialisasi sesuai arsitektur aktual. Tidak ada test yang masih
  berjalan; preview8080/Web5891/API5890 tidak dihentikan.

## Langkah berikutnya

1. Jalankan checklist hardware di GAMEPAD_QA.md dengan controller nyata.
2. Full finish/save/retry/dashboard menggunakan gamepad masih belum terverifikasi;
   jangan mengumumkan release-ready dari matrix input sintetis saja.
3. Matrix6kasus lengkap mendahului refinement gate-player-only/labelgear; smoke
   auto/manual+iframe dan unit diuji ulang sesudahnya. Ulangi fullmatrix pada final
   build bila diperlukan sebagai gate rilis, lalu perbarui QA dan jurnal.
