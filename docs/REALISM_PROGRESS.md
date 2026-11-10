# Progres realisme — titik lanjut lintas sesi

Terakhir diperbarui: 2026-11-05 (Asia/Jakarta).

## Perbaikan sambungan jalan — 5 November 2026

- Bug truk tertahan di sambungan perumahan/utara diperbaiki di city-track.js.
  Guard lama meminta seluruh footprint masuk satu region; overlap5m lebih
  pendek daripada footprint truk5,9524m. Koridor tengah disatukan di dalam
  union area lama; collision bangunan/AI dan batas luar tidak dimatikan.
- PASS regression unified7checks (4.932pose seam3jenis +6probe batas),
  functions6, realism lengkap (collision11/traffic15), syntax58files,
  build42files/7.173.580byte. Review independen APPROVE.
- PASS browser TRUK/automatic5checks dari spawn normal24m melewati z<-38,
  lajur tetap/penalti tidak bertambah, lalu berhenti dengan rem normal.
  Bukti di QA/jurnal. Bukan fullmatrix atau penerimaan rilis.

## Cara melanjutkan di setiap sesi

1. Baca file ini, `REALISM_SESSION_LOG.md`, master plan di root, dan `REALISM_QA_REPORT.md`.
2. Periksa `git status` serta source aktual; jangan menganggap checklist rencana sebagai bukti selesai.
3. Kerjakan prioritas terbuka, jalankan tes relevan, lalu perbarui progres dan tambahkan entri jurnal sebelum mengakhiri sesi. Jangan hapus riwayat entri lama.
4. Catat PASS/FAIL/NOT RUN, command, lokasi bukti, blocker, dan langkah lanjut yang spesifik. Jangan simpan rahasia/token.

## Status yang ditemukan saat melanjutkan

- P0/P1: audit baseline dan kontrak v1 tersedia di `docs/REALISM_BASELINE_AUDIT.md`, `REALISM_BASELINE_TESTS.md`, `REALISM_INTEGRATION_CONTRACT.md`.
- P2/P3: modul environment, collision, traffic/pedestrian, lampu/horn, instrumen, karakter dan kokpit sudah tersambung ke runtime. Bukan bukti seluruh acceptance selesai.
- P4/P5: sebagian. Enam kombinasi browser sebelumnya PASS; lanjutan sesi ini membuktikan iframe website, recovery gateway, dan kestabilan 300 detik. Rilis belum selesai; perjalanan penuh/save/dashboard masih belum terverifikasi.
- Karakter/kokpit memakai fallback prosedural asli, bukan GLB final.

## Antrean pekerjaan

1. DONE sesi ini: integrasi LOD, perbaikan collision steering-away, dan browser enam kombinasi (semua PASS). Bukti dan batas versi build ada di jurnal.
2. Uji browser terarah untuk steering-away pada source terbaru (collision fix sudah punya regression unit/review PASS); uji pendekatan/menjauh batas LOD di browser. Jangan menyamakan full matrix dengan setiap edge case collision.
3. Iframe website PASS, recovery gateway 4 checks PASS, auth/CSRF/idempotensi/isolation 6 checks PASS. Lanjutkan perjalanan penuh → finish/save/retry/failure/dashboard; diagnostic 120 detik wall belum cukup di host ini. Gunakan DB lokal terpisah.
4. Stabilitas hujan malam 300 detik wall PASS (57 sampel, clock tick 55→3690); benchmark FPS terkontrol/review visual/audio masih pending. Ini bukan 300 detik waktu simulasi atau bukti bebas semua memory leak.
5. Validasi final build/regresi dan perbarui QA; status rilis tetap pending sampai bukti wajib lengkap.
6. DONE lanjutan: rute belok kiri/kanan, sein pra-belok/selama belok dan auto-cancel. Empat aktor belok runtime (trailing E/W) selesai dalam tes dunia penuh 120 detik simulasi; all 15 traffic groups PASS. Review memperbaiki starvation oleh antrean merah. Visual alignment tetap perlu dicoba pengguna.

## Preview lokal aktif

- Standalone: `http://localhost:8080/` (build terbaru dengan turns dan predicate review fix).
- Website: `http://127.0.0.1:5891/simulasi/play`.
- API uji: `http://127.0.0.1:5890`, database `artifacts/realism/preview.db` diabaikan Git. Tidak mengganti/menghentikan server lama port5290/5090.
- Ketiganya sengaja dibiarkan aktif agar pengguna dapat mencoba. Jika berhenti setelah restart aplikasi/komputer, jalankan ulang sesuai command di jurnal.

## Validasi sesi berjalan

2026-11-04: PASS syntax (45 file), realism unit suite (termasuk 12 grup traffic), LOD standalone, functions (6 checks), build WebGL (35 file / 7.129.151 byte) sebelum integrasi LOD. Bukti terminal; hasil sesudah edit dicatat di jurnal.

Perbaikan tambahan: collision refinement untuk aman menyetir menjauhi dinding; regression awal FAIL lalu 11 grup collision + 12 grup traffic PASS. Independently reviewed LOD integration: APPROVE bounded integration, bukan full release. Default `dotnet build` gagal karena DLL dipakai server Web/API yang sudah berjalan; jangan hentikan proses milik pengguna. Build alternatif memakai `--artifacts-path artifacts/dotnet-realism`.

Build alternatif .NET **PASS**, 19 warning / 0 error, setelah retry akses NuGet lewat approval. Log: `artifacts/realism/dotnet-build-2026-11-04.log`. Warning berada di nullability source C# dan komponen AdminBadge; source tersebut tidak diubah sesi ini. Build default tetap tidak diklaim PASS.

## Batasan

Dokumentasi sumber `DOKUMENTASI_WEBSITE_DAN_SIMULASI.md` tidak ditemukan oleh audit sebelumnya. Referensi implementasi: master plan dan source nyata. Tidak ada klaim semua pekerjaan kemarin selesai.

## Browser QA terbatas — 10 November 2026
- Website5891/API5890 dijalankan dengan database uji terisolasi; smoke MCP Playwright.
- PASS build default .NET --no-restore (exit0), syntax60, functions6, realism suite; browser halaman publik/detail materi/auth, mobile kursus, iframe mobil otomatis masuk→mesin→gas→rem→pause.
- Temuan: query mentor diabaikan, ringkasan kursus menampilkan literal null-coalescing, pesan login kosong menyesatkan, label form kursus tidak terhubung ke input.
- Tidak mengubah source aplikasi. Bukti dan batas: artifacts/browser-qa-2026-11-10/REPORT.md.
- Fullmatrix kendaraan, finish/save/dashboard, pembayaran/admin/hardware/audio/performance NOT RUN. Bukan acceptance rilis.
