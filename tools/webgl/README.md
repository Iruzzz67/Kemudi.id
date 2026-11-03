# Simulasi WebGL Kemudi.id

Runtime browser menggunakan Three.js lokal dan model hasil Blender dalam
`src/Kemudi.Web/wwwroot/simulation-3d/models/city/`: lingkungan perumahan,
mobil sport merah, motor sport biru, dan truk box putih. Roda berputar mengikuti
jarak tempuh dan roda depan mengikuti kemudi. Model menggunakan satuan meter.

## Jalankan langsung

Dari root proyek, dengan Node.js terpasang:

```powershell
npm.cmd --prefix tools/webgl start
```

Buka **http://localhost:8080**. Perintah tersebut membuat `Builds/WebGL/`
lalu menjalankan server lokal. Tidak perlu instalasi dependensi, Unity Editor,
API, login, atau koneksi internet untuk bermain. Tekan Ctrl+C untuk berhenti.
Jangan membuka `index.html` melalui `file://`, karena model dimuat lewat HTTP.

## Jalankan melalui website Blazor

Untuk menyimpan hasil ke akun, jalankan API dan website di dua terminal:

```powershell
# Terminal 1
dotnet run --project src/Kemudi.Api --no-launch-profile -- --urls http://127.0.0.1:5090 --environment Development
# Terminal 2
dotnet run --project src/Kemudi.Web --no-launch-profile -- --urls http://127.0.0.1:5290 --environment Development --Api:BaseUrl=http://127.0.0.1:5090
```

Buka **http://127.0.0.1:5290/register** atau `/login`, lalu `/simulasi/play`. Contoh parameter:
`/simulasi/play?vehicle=TRUK&transmission=automatic&map=unified`.
Satu map menghubungkan perumahan, simpang pertama, jalan berkelok panjang,
dan simpang kedua hingga finis sekitar 480 m dari awal. URL lama `city` dan
`training` tetap didukung dan membuka map terpadu yang sama.
Halaman `/simulasi` mengambil katalog kendaraan dari API; halaman play dan
build mandiri dapat digunakan tanpa API. Demo langsung: `/?demo=long-road`
atau `/?demo=training-intersection`. F2 menampilkan debug simpang terdekat.

Hasil sesi **selesai maupun gagal** otomatis dikirim ke backend SQLite yang
digunakan `Kemudi.Api`. Data meliputi kendaraan, skor, durasi, pelanggaran,
keluar jalur, jumlah benturan, dan status selesai. Sesi gagal mendapat skor 0.
Lihat hasil di `/dashboard`.
JWT disimpan dalam cookie HttpOnly dan hanya diteruskan ke API oleh server
website; permintaan penyimpanan menggunakan token antiforgery.

Jika sesi login berakhir, panel hasil menyediakan tautan login di tab baru.
Setelah login, kembali ke tab simulasi dan klik **Coba simpan lagi**.
Kegagalan koneksi juga menyediakan tombol coba lagi. ID percobaan tetap sama
sehingga respons yang hilang atau klik ulang tidak membuat riwayat ganda.
Hasil yang belum tersimpan hanya ada di memori halaman: jangan tutup/reload
halaman sebelum muncul konfirmasi tersimpan. Keluar sebelum finis/gagal
tidak menyimpan sesi parsial. Build statis di port 8080 tetap mode mandiri.

## Kontrol

1. Pilih kendaraan, transmisi, dan lingkungan; klik **Mulai Simulasi**.
2. Tekan **Enter** dekat kendaraan untuk masuk.
3. Tekan **I**, tunggu mesin menyala, lalu **Space** untuk melepas rem tangan.
4. **W** gas, **S** rem, **A/D** belok. **R**, lalu **W** untuk mundur.
5. **B** sabuk untuk mobil/truk; **H/J/G/F** perlengkapan motor.
6. **C** berganti kamera belakang/kabin/atas, **P/Esc** jeda.
7. Manual: tahan **Shift** (kopling), **E/Q** naik/turun gigi; lepas kopling
   sambil menekan gas. Tahan kopling saat berhenti agar mesin tidak mati.

Gunakan komputer dengan keyboard dan browser yang mendukung WebGL.
Tersedia tombol layar penuh dan ganti kendaraan. Capai garis kotak-kotak untuk
melihat hasil sesi. Hindari bangunan/pagar serta batas lingkungan.

## Build dan pengujian

Revisi aset dan hasil pemeriksaan terbaru dicatat di
[`LAPORAN_PERBAIKAN_SIMULASI.md`](../../LAPORAN_PERBAIKAN_SIMULASI.md).
Build memeriksa hash paket `models/city/manifest.json` sebelum menyalin aset.
Gunakan `npm.cmd --prefix tools/webgl run test:functions` untuk tes logika
dan `node tools/webgl/loading-checks.cjs` untuk map training serta pemulihan
pemuatan GLB (server port 8080 harus berjalan).

```powershell
npm.cmd --prefix tools/webgl run build
npm.cmd --prefix tools/webgl ci
npm.cmd --prefix tools/webgl exec -- playwright install chromium
# Jalankan server di terminal pertama, lalu di terminal kedua:
$env:SIM_URL = 'http://127.0.0.1:8080'
npm.cmd --prefix tools/webgl test
# Setelah API dan website berjalan pada port di atas:
npm.cmd --prefix tools/webgl run test:backend
```

`Builds/WebGL/` dapat disalin ke hosting statis. `build-manifest.json` berisi
ukuran dan SHA-256 setiap file. Pengujian browser menyimpan laporan dan
tangkapan layar di `artifacts/webgl/`.

Tes backend membuat akun uji baru beralamat `webgl-test-...@example.test`,
menguji register/login/logout, cookie HttpOnly, CSRF, validasi, pemisahan akun,
pengiriman bersamaan, berkendara sampai finis dalam iframe, retry setelah
respons hilang/gangguan server, dan pembacaan dashboard setelah reload.
Cabang gagal diuji dengan kontak pejalan kaki yang diinjeksi oleh tes.
Laporan dan tangkapan layar ada di `artifacts/backend-integration/`.

Ini build WebGL Three.js. Proyek Unity tetap terpisah di `simulation/`.
Fisika browser berupa model kinematik dengan pemeriksaan benturan sederhana.
Map perumahan memiliki simpang empat berlampu yang tersambung ke jalan, dengan delapan kendaraan AI demo lurus.
Tekan **Latihan dekat simpang empat** di pilihan kendaraan untuk mulai di dekat simpang; **F2** membuka debug.
Marka, controller, dan AI memakai modul `intersection.js`; rincian dan bukti tes ada di
[`IMPLEMENTASI_SIMPANG_EMPAT.md`](../../IMPLEMENTASI_SIMPANG_EMPAT.md).
Pejalan kaki otomatis pada simpang ini dinonaktifkan. Model karakter lama tidak digunakan pada
mode berjalan (kamera berjalan).
