# Pengujian fitur dan perbaikan 13 warning — 11 November 2026

## Hasil

**Warning diperbaiki; aplikasi masih NEEDS ATTENTION, bukan siap produksi.**
Pengujian mencakup website Blazor, API lokal dan simulator browser Three.js.
Unity/proyek legacy tambahan tidak diuji fungsional. Semua akun/pendaftaran baru
hanya data dummy di database preview, tanpa pembayaran/provider/produksi sungguhan.

## 13 warning: penyebab, dampak dan perbaikan

| Jumlah | Diagnostik / lokasi | Penyebab dan perbaikan |
|---|---|---|
| 10 | RZ10012, delapan halaman admin | Namespace `Kemudi.Web.Components.Admin` belum diimpor. Razor menganggap `AdminBadge` tag HTML asing sehingga label/status badge tidak tampil. Satu import di `src/Kemudi.Web/Components/_Imports.razor` memperbaiki semua pemakai. |
| 2 | CS8604, `src/Kemudi.Infrastructure/Data/AppDbContext.cs:65` | Operand nullable diberikan ke `SequenceEqual`. Predicate comparer kini menangani referensi sama/kedua-null dan memeriksa kedua operand sebelum membandingkan isi. Direct-predicate regression sebelumnya melempar `ArgumentNullException`; tidak berarti exception ini sudah terjadi pada pengguna produksi. Converter CSV, schema, migrasi, hash dan snapshot tidak diubah. |
| 1 | CS8602, `src/Kemudi.App/Data/VehicleData.cs:13` | Default `null` eksplisit pada overload `FirstOrDefault` membuat inferensi elemen nullable. Argumen berlebih dihapus; hasil kendaraan dikenal/tidak dikenal tetap sama. |

Perubahan aplikasi hanya tiga baris tersebut; tidak memakai pragma, null-forgiving
atau penonaktifan warning. `tools/Kemudi.RegressionTests/` menambah self-check tanpa
dependency baru. `tools/webgl/backend-smoke.cjs` menunggu validasi form kosong untuk
membuktikan Blazor interaktif sebelum mengisi input; seluruh assertion lama tetap.
Run awal gagal karena input nama hilang pada fase prerender/hydration, bukan
bukti registrasi selalu gagal. Bukti awal dipertahankan terpisah.

## Bukti validasi

| Area | Hasil aktual |
|---|---|
| .NET rebuild seluruh solusi, `-warnaserror` | **PASS, 0 warning / 0 error**; `dotnet-build.log`, output alternatif `artifacts/dotnet-warning-tests` agar binary preview lama tidak ditimpa |
| Regresi C# | **RED sebelum fix**: comparer-null dan render admin gagal. **GREEN sesudah fix: 10/10**; `warnings-before.log`, `warnings-after.log`, `warnings-final.log` |
| Review independen | **APPROVE**, tidak ada temuan pada diff warning/test yang dibatasi; bukan security audit seluruh aplikasi |
| Website | **60 PASS / 7 FAIL (67 checks)** dan 3 probe diagnostik; [laporan website](website/REPORT.md) |
| Simulator build/unit/syntax | **PASS**: build42file, syntax60, functions6, collision11groups, traffic15groups, handling19groups, gamepad device/domain/UI, intersection/unified |
| Browser simulator | **PASS**: smoke3kendaraan otomatis, simpang/alias lama/seam truk; full realism6kasus49checks termasuk matriks waktu/cuaca awal dan pause |
| Browser gamepad | **PASS**: full6kasus standalone69checks sintetis; handling MOBIL/automatic10checks. [Laporan simulator](simulator/REPORT.md) |
| Backend real journey | **FAIL batas waktu180detik**, sesudah6checks auth/CSRF/validasi/idempotensi/isolation lulus. Masih driving, clock12,58s, posisi z=-20,35m; bukan finish/save/dashboard lengkap. `backend-smoke-retry.log`, canonical `artifacts/backend-integration/report.json` |
| Result-panel recovery | **PASS 4checks** pada Web5891 dan build terbaru5893: anonymous/expired-session, auth restored, standalone unavailable |
| HTTP build terbaru | **PASS200** website/login/kursus5893 dan SwaggerAPI5892 |
| Iframe pada Web5893 | **FAIL automation / penyebab belum tuntas**: original TRUK/manual probe timeout menunggu driving; diagnostic awal frame detached saat hydration, retry berikutnya canvas-click timeout. Bukti `iframe-initial-report.json`, `focused-initial-detached.json`, `focused-integration-report.json`. Bukan PASS iframe dan bukan bukti pasti defect fisika. |
| Result panel + dashboard tanpa 3D | **PASS 3checks** build terbaru: respons save hilang lalu503 dan retry tetap satu AttemptId, hasil selesai/gagal tersimpan, kedua status bertahan setelah reload dashboard. `gateway-results-report.json`. Payload diinjeksi oleh tes, bukan perjalanan mengemudi sungguhan. |
| Static checks | Scoped `git diff --check`, `node --check` tes backend dan artefak QA **PASS**. Tidak ada script lint/typecheck JavaScript khusus. |

Restore NuGet online awal gagal karena pembatasan jaringan, retry di luar sandbox
masih mengalami masalah akses/audit. Restore dari cache paket lokal berhasil;
tidak mengubah dependency atau mematikan diagnostik. Build bersih ini **bukan**
bukti vulnerability audit NuGet online lulus.

## Masalah fitur yang belum diperbaiki

1. **Tinggi — pembayaran:** endpoint anonymous langsung memberi status lunas
   tanpa bukti/provider; request ulang membuat record pembayaran baru. Dibuktikan
   hanya pada pendaftaran dummy milik tes. Jangan dipakai sebagai settlement produksi.
2. **Tinggi — login admin:** kredensial user biasa menyebabkan circuit Blazor
   berhenti, bukan pesan penolakan. API admin sendiri mengembalikan403 dengan benar.
   Penyebab cookie-write saat event interaktif masih inference, bukan stack trace terbukti.
3. **Sedang — UI sesi:** cookie JWT tidak valid tetap membuat dashboard tampak login;
   belum ada bukti bypass akses data backend.
4. **Sedang — mentor:** pilihan dari link profil tidak terisi di form pendaftaran.
5. **Sedang — ringkasan:** form menampilkan literal `?? "Belum dipilih"`.
6. **Sedang — mobile:** homepage390px meluber menjadi495px.
7. **Rendah — aksesibilitas:** tujuh label pendaftaran tidak terkait kontrolnya.
8. **Rendah — validasi login:** input kosong diberi pesan password/email salah.

Reproduksi, sumber dan batas kesimpulan: [website/REPORT.md](website/REPORT.md).
Semua temuan tersebut di luar perbaikan warning yang diminta; tidak diperbaiki diam-diam.

## Preview dan batas penerimaan

- Build perbaikan berjalan di **http://127.0.0.1:5893/** / API5892, memakai
  `--artifacts-path artifacts/dotnet-warning-tests --no-build` dan database
  `artifacts/realism/preview.db`; startup API mengonfirmasi tidak ada migrasi baru.
- Upaya restart5890/5891 gagal bind karena listener tetap hidup; tidak menghentikan
  PID yang kepemilikannya tidak dibuktikan. Preview lama bukan bukti binary terbaru.
- Standalone8080 tetap aktif. Server baru sengaja dibiarkan untuk dicoba pengguna;
  seluruh browser tes yang selesai sudah ditutup.
- **NOT RUN:** admin CRUD/schedule/settings sukses dengan kredensial berwenang,
  settlement bank/e-wallet nyata, hardware controller USB/Bluetooth, audio speaker,
  review visual manusia, FPS terkontrol dan stability5menit baru.
- Full right-stick-look browser matrix dibatalkan setelah assertion parsial;
  bukan PASS kasus/matriks. Lima kombinasi handling browser lainnya NOT RUN.
- Finish→save→retry→dashboard lewat perjalanan mengemudi penuh masih terbuka.
  Payload hasil yang diinjeksi atau unit test tidak menggantikan bukti perjalanan itu.
- Berikutnya: prioritaskan trust boundary pembayaran dan perbaikan admin login,
  kemudian temuan form/mobile; lakukan ulang e2e perjalanan penuh dengan waktu/host
  memadai dan ulangi feature QA setelah masing-masing fix.
