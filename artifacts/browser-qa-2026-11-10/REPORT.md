# Browser QA Kemudi.id — 10 November 2026

## Hasil
Project berjalan pada http://127.0.0.1:5891/ dengan API http://127.0.0.1:5890/.
Pengujian memakai MCP Playwright, database lokal terisolasi, dan akun dummy.
Tidak ada perbaikan source aplikasi. Ini smoke/functional QA terbatas, bukan sertifikasi bebas bug.

## Temuan terkonfirmasi
1. **Sedang — mentor terpilih hilang saat pendaftaran.** Dari /kursus → profil Budi Santoso → Lanjutkan Pendaftaran, URL menjadi /kursus/personal?mentor=budi-santoso tetapi dropdown Mentor kosong. Pengguna harus memilih ulang. MentorDetail.razor:50 mengirim query; Personal.razor:121,130–134 tidak membacanya.
2. **Sedang — teks kode tampil pada ringkasan.** Pada halaman personal, pilih Budi Santoso dan Mobil Reguler. Ringkasan menjadi Budi Santoso ?? "Belum dipilih" dan Mobil Reguler ?? "Belum dipilih". Personal.razor:80–81 memakai ekspresi implisit tanpa membungkus null-coalescing. Screenshot course-summary.png.
3. **Rendah — validasi login menyesatkan.** Dalam browser context baru, klik Masuk tanpa mengisi form. UI mengatakan Email atau password salah, bukan field wajib. BrowserApiEndpoints.cs:53–54 mengubah semua upstream failure menjadi pesan sama. AuthController.cs:67–72 membedakan kosong400 dan credential mismatch401. Password salah dengan field tersinkronisasi benar-benar menghasilkan401; login benar juga berhasil.
4. **Rendah — label form kursus tidak terhubung ke input.** Tujuh label Nama/Email/Telepon/NIK/Alamat/Mentor/Paket memiliki htmlFor kosong dan label.control null. Ini mengurangi aksesibilitas dan klik label tidak memfokuskan kontrol. Bukti DOM course-results.json.

## Matrix aktual
| Skenario | Hasil | Bukti |
|---|---|---|
| Build solusi .NET default --no-restore | PASS, exit0, 0 warning/error (incremental) | dotnet-build-default.log |
| test:syntax | PASS exit0, 60 authored files | baseline-tests.log |
| Functions assertions | PASS exit0, 6 groups | baseline-tests.log |
| test:realism | PASS exit0; collision11, visual7, traffic15, environment/lights/horn/LOD | baseline-tests.log |
| Beranda/kursus/materi/login/register/dashboard guest | PASS HTTP200; dashboard melindungi data guest | routes-results.json |
| Empat detail materi | PASS HTTP200 dan judul/konten ada | detail-mobile-results.json |
| Filter Mobil pada kursus | PASS, 3 paket mobil dan mentor relevan | Observasi MCP; ringkasan sesi |
| Profil mentor → form pendaftaran | FAIL, query mentor diabaikan | source-findings.md; course-results.json |
| Ringkasan pilihan kursus | FAIL, literal kode | course-summary.png |
| Register dummy → dashboard | PASS, total percobaan0 | Observasi MCP; login-success.json membuktikan akun dapat dipakai lagi |
| Logout → login benar | PASS setelah blur dan tunggu sinkronisasi input | login-success.json |
| Password salah | PASS ditolak401 | login-validation.json |
| Login kosong | FAIL pesan validasi menyesatkan | login-validation.json |
| Kursus mobile390×844, menu hamburger | PASS, tidak overflow horizontal, menu membuka link | mobile-courses.png; detail-mobile-results.json |
| /simulasi dan /simulasi/play iframe | PASS ready, model/aset HTTP200 | simulator-loaded.png |
| Mobil/automatic: masuk/mesin/sabuk/rem tangan/gas/rem | PASS, speed0→1.5→0; posisi berubah tanpa mutasi state | simulator-results.json |
| Pause | PASS, tick1530 dan posisi tidak berubah antara sampel | simulator-results.json; simulator-pause.png |

Functions memakai assertion asli dengan shim penulisan laporan ke stdout agar artefak sesi lama tidak tertimpa; bukan literal npm run test:functions.
Pemeriksaan file /admin dan URL sembarang menghasilkan404; tidak dihitung sebagai bug karena tidak ada bukti route /admin adalah kontrak halaman yang benar.

## Kendala lingkungan/harness — bukan bug terkonfirmasi
- Build alternatif --artifacts-path dengan --no-restore awalnya gagal NETSDK1004 karena folder assets baru belum direstore. Build default berikutnya PASS.
- Proses .NET dalam sandbox gagal DataProtection DPAPI/EventLog access denied, menghasilkan empty response/500. Kedua server dijalankan ulang dengan approval di luar sandbox; website kemudian200. Tidak menghapus atau mengganti kunci Windows.
- Percobaan awal login400 tidak membuktikan credential storage rusak. Login benar PASS setelah blur/input-sync; empty-submit direproduksi terpisah pada context baru.
- Input keyboard simulator pertama timeout karena handbrake belum berubah. Ulang dengan fokus canvas, key delay, dan tunggu state: driving/brake/pause PASS. Bukan bukti bug fisika.
- require tidak tersedia di harness MCP; satu batch navigasi terhenti pada404. Batch diulang dengan penanganan per-route, hasil disimpan terpisah.
- Iframe sempat detached pada startup; reacquire live frame kemudian ready dan render PASS. Belum diklasifikasikan product defect.
- Console simulator akhir: 0 error, 1 warning allow vs allowfullscreen. Sesi keseluruhan juga mencatat favicon404, intentional401/400/404, dan500 dari kendala lingkungan awal; tidak diklaim seluruh console bersih.

## Batasan dan kelanjutan
NOT RUN: pembayaran/enrollment final, akses admin berwenang, seluruh6kombinasi kendaraan/transmisi, finish→save→retry→dashboard, hardware controller, audio speaker, performance/stability panjang, security audit menyeluruh. Tidak ada script lint/typecheck khusus dijalankan; syntax bukan penggantinya.
Sumber kerja pengguna yang staged/unstaged/deleted dibiarkan. Tidak ada dependency, refactor, atau build WebGL baru.
Perubahan sesi: bukti di folder ini, .gitignore lokal test.db*, tambahan bagian pada REALISM_PROGRESS/QA_REPORT/SESSION_LOG. Tidak mencatat password/token/cookie ke laporan.
Server Web dan API preview sengaja dibiarkan hidup (exec sessions86214 dan56466); server sandbox terdahulu milik sesi sudah dihentikan. Port8080 tidak dijalankan.
DB test.db* diabaikan oleh .gitignore lokal; jangan commit database atau data sesi.
Langkah berikut: perbaiki parsing query mentor, ekspresi ringkasan dan label/validasi form, tambah regression UI, lalu ulang alur pendaftaran. Tidak ada klaim bug tersebut sudah diperbaiki.
