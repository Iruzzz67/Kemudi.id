# Kemudi.id

Platform edukasi dan latihan mengemudi dengan website **Blazor**, backend **ASP.NET Core**, dan simulator browser **Three.js/WebGL** untuk **motor, mobil, dan truk**.

> Simulator yang digunakan halaman `/simulasi/play` berasal dari
> `src/Kemudi.Web/wwwroot/simulation-3d/`, **bukan Unity**. Proyek Unity di
> `simulation/` terpisah dan tidak diperlukan untuk menjalankan simulator browser.
> Dokumen cakupan lama dapat menyebut arsitektur Unity/Next.js; gunakan source
> aktual dan catatan progres untuk mengetahui implementasi sekarang.

## Fitur

- Website kursus, materi, mentor, pendaftaran, pembayaran, dashboard, dan halaman admin.
- Autentikasi melalui ASP.NET Core Identity/JWT; website menggunakan cookie HttpOnly dan gateway API dengan antiforgery untuk penyimpanan hasil.
- Kendaraan MOTOR/MOBIL/TRUK dengan transmisi manual atau otomatis.
- Map terpadu: perumahan, dua simpang berlampu, jalan berkelok, dan finis.
- Kamera belakang, first-person dengan kokpit prosedural, dan kamera atas.
- Preset pagi/siang/sore/malam serta hujan off/light/heavy.
- Traffic AI, antrean, penyeberang, shared collision, belokan dan sein AI, serta LOD visual kendaraan.
- HUD/instrumen, lampu, klakson, checklist keselamatan, dan pelaporan hasil latihan.

**Status:** masih dalam pengembangan, bukan klaim siap produksi atau simulator fisika kendaraan penuh. Karakter/kokpit menggunakan fallback prosedural; pengujian finish → penyimpanan → dashboard penuh, benchmark FPS terkontrol, dan beberapa review visual/audio masih terbuka. Lihat [progres](docs/REALISM_PROGRESS.md) dan [laporan QA](docs/REALISM_QA_REPORT.md) untuk bukti serta batas pengujian terbaru.

## Teknologi dan struktur

| Bagian | Teknologi / lokasi |
| --- | --- |
| Website utama | Blazor Razor Components / Interactive Server, `src/Kemudi.Web/` |
| Backend | ASP.NET Core Web API, `src/Kemudi.Api/` |
| Data dan autentikasi | EF Core, SQLite, Identity, JWT, `src/Kemudi.Infrastructure/` |
| Domain dan DTO | `src/Kemudi.Domain/`, `src/Kemudi.Shared/` |
| Proyek web tambahan dalam solusi | `src/Kemudi.App/` |
| Simulator yang digunakan website | Three.js lokal, `src/Kemudi.Web/wwwroot/simulation-3d/` |
| Build dan tes simulator | Node.js / Playwright, `tools/webgl/` |
| Output simulator mandiri | `Builds/WebGL/` — hasil generate, bukan sumber utama |
| Proyek Unity terpisah | `simulation/Kemudi.Simulation/` |
| Bukti tes | `artifacts/` |

## Prasyarat

- **Node.js dan npm**. Paket Playwright terpasang mendeklarasikan Node.js `>=18`; lingkungan verifikasi menggunakan Node.js `24.18.0`.
- **.NET SDK yang mendukung format solusi `.slnx`**, beserta runtime ASP.NET Core/.NET 8. Proyek C# menargetkan `net8.0`; build sebelumnya diverifikasi dengan SDK `10.0.401`.
- Browser desktop dengan WebGL dan keyboard.
- Akses NuGet saat restore pertama; akses npm dan unduhan Chromium untuk memasang dependensi tes browser.

Contoh perintah berikut menggunakan **PowerShell dari root repositori**. Pada shell lain gunakan `npm` sebagai pengganti `npm.cmd` dan sesuaikan sintaks variabel lingkungan.

## Mulai cepat: simulator saja

Tidak perlu API, akun, Unity Editor, atau instalasi dependensi npm untuk build/server mandiri:

```powershell
npm.cmd --prefix tools/webgl start
```

Buka **http://localhost:8080/**. Perintah ini membangun `Builds/WebGL/` lalu menjalankan server HTTP lokal. Hentikan dengan **Ctrl+C** di terminal server.

Jangan membuka `index.html` melalui `file://`; loader aset membutuhkan HTTP. Mode mandiri tidak menyimpan hasil ke akun dan menampilkan keterangan jika backend tidak tersedia.

Contoh langsung:

- Mobil: `http://localhost:8080/?vehicle=MOBIL&transmission=automatic&autostart=1`
- Motor manual: `http://localhost:8080/?vehicle=MOTOR&transmission=manual&autostart=1`
- Truk hujan malam: `http://localhost:8080/?vehicle=TRUK&autostart=1&timeOfDay=malam&weather=heavy`
- Dekat simpang: `http://localhost:8080/?demo=intersection&autostart=1`

## Jalankan website dan API

### 1. Restore dan build

```powershell
dotnet restore Kemudi.slnx
dotnet build Kemudi.slnx
```

### 2. Terminal API

Contoh ini menggunakan **database pengembangan terpisah**, bukan database utama:

```powershell
New-Item -ItemType Directory -Force artifacts/realism | Out-Null
$db = Join-Path (Get-Location) 'artifacts/realism/preview.db'
dotnet run --project src/Kemudi.Api --no-build --no-launch-profile -- --urls http://127.0.0.1:5890 --environment Development "--ConnectionStrings:KemudiDb=Data Source=$db"
```

API menerapkan migrasi EF Core otomatis saat startup. File `preview.db` dan file pendampingnya diabaikan Git. Jangan arahkan tes ke database produksi.

### 3. Terminal website

```powershell
dotnet run --project src/Kemudi.Web --no-build --no-launch-profile -- --urls http://127.0.0.1:5891 --environment Development --Api:BaseUrl=http://127.0.0.1:5890
```

| Tujuan | URL |
| --- | --- |
| Website | http://127.0.0.1:5891/ |
| Daftar / masuk | http://127.0.0.1:5891/register / http://127.0.0.1:5891/login |
| Simulator | http://127.0.0.1:5891/simulasi/play |
| Riwayat latihan | http://127.0.0.1:5891/dashboard |
| Swagger API (Development) | http://127.0.0.1:5890/swagger |

Port di atas dipilih untuk preview terisolasi. Tanpa override, profil HTTP API menggunakan `5077`, website `5259`, dan konfigurasi website mengarah ke API `http://localhost:5077`. Selalu sesuaikan `Api:BaseUrl` jika port API diubah.

Hasil latihan dikirim melalui gateway website `/api/simulation/results`. Penyimpanan membutuhkan sesi login; panel hasil menyediakan retry dengan `AttemptId` yang sama. Hasil yang belum tersimpan berada di memori halaman: jangan reload/tutup halaman sebelum konfirmasi berhasil.

## Pembayaran dan batas produksi

- Pendaftaran kursus, detail pendaftaran dan pengajuan pembayaran kini wajib
  login dan hanya dapat diakses pemiliknya. Pendaftaran anonim lama tidak
  diklaim otomatis berdasarkan email; perlu peninjauan admin.
- Tombol pelanggan hanya mengajukan **pending**, bukan menandai lunas.
  Admin harus mencocokkan penerimaan dana melalui sumber resmi dan mencatat
  referensi rekonsiliasi. Status lunas dan audit disimpan dalam satu transaksi.
- Nomor rekening/QR contoh dihapus. Transfer/e-wallet pada UI dinonaktifkan
  sampai operator mengisi `Payments__TransferInstructions` atau
  `Payments__EWalletInstructions` pada website dengan instruksi resmi.
  Konfigurasi tersebut berupa teks, bukan HTML atau integrasi provider.
- Kunci JWT development hanya ada pada konfigurasi Development. Di luar
  Development, API menolak kunci kosong, terlalu pendek atau kunci development;
  pasok `Jwt__SecretKey` acak privat melalui pengelola secret. Gunakan HTTPS.
- Tidak ada provider otomatis, refund atau sertifikasi kepatuhan pembayaran.
  Riwayat lama yang telanjur lunas/duplikat harus direkonsiliasi, bukan dihapus
  atau dianggap aman oleh perubahan kode ini.

Kontrak, konfigurasi dan bukti tes: [PAYMENT_SECURITY.md](docs/PAYMENT_SECURITY.md).

## Kontrol simulator

| Tombol | Fungsi |
| --- | --- |
| `W / S` | Gas / rem; berjalan saat di luar kendaraan |
| `A / D` | Belok / arah berjalan |
| `Enter` | Masuk kendaraan ketika berada dekat pintu |
| `I` | Mesin |
| `Space` | Rem tangan |
| `R` | Mode mundur, lalu `W` untuk bergerak mundur |
| `Shift` | Tahan kopling pada transmisi manual |
| `E / Q` | Naik / turun gigi manual |
| `B` | Sabuk pengaman mobil/truk |
| `H / J / G / F` | Helm / jaket / sarung tangan / sepatu motor |
| `[ / ]` | Penyesuaian kursi |
| `M` | Tengok spion dalam kamera kabin |
| `L / K` | Lampu utama / lampu jauh |
| `Z / X` | Sein kiri / kanan |
| `V / T` | Hazard / klakson |
| `C` | Siklus kamera belakang → kabin → atas |
| `P / Esc` | Jeda |
| `F2` | Debug simpang terdekat |

Urutan awal: pilih kendaraan/transmisi → masuk dengan `Enter` → nyalakan mesin `I` → lengkapi perlengkapan → lepas rem tangan `Space` → gas. Untuk manual, tahan `Shift`, pilih gigi 1 dengan `E`, kemudian lepas kopling sambil memberi gas. Pengaturan waktu/cuaca tersedia pada layar awal dan jeda.

## Build dan pengujian

### Gamepad

Controller dengan browser mapping `standard` tersedia melalui **Controller /
Aksi** di simulator. RT/LT gas/rem analog, stick kiri setir, A masuk, X mesin,
D-pad bawah rem tangan, Y kamera, Menu pause, dan View membuka menu peralatan/
settings. Manual memakai L3 kopling + D-pad gigi; otomatis memilih arah hanya
saat berhenti dengan rem. Setelah pause/disconnect, netralkan kontrol lalu beri
input baru. Keyboard tetap berfungsi tanpa mencampur input kedua sumber.

Stick kanan mengaktifkan kamera first-person saat sudah di kendaraan dan
menggerakkan pandangan kiri/kanan/atas/bawah. Lepas stick untuk menahan arah
pandang; Y/Triangle atau C mengganti mode kamera dan mereset pandangan.

**Handling:** buka **Controller / Aksi → Handling & setir / stang**. Pilih
Ringan / Normal / Berat atau nilai berat 0–100 (default 50), lalu atur kecepatan
kembali ke tengah 0,5–2× (default 1×). Berlaku untuk keyboard dan gamepad pada
motor/mobil/truk, tersimpan lokal. Berat mengubah kecepatan respons belok, bukan
batas sudut maksimum, grip ban, atau tahanan fisik/force feedback controller.

Petunjuk lengkap ada di [panduan simulator](tools/webgl/README.md),
[status gamepad](docs/GAMEPAD_PROGRESS.md) dan [QA/checklist perangkat](docs/GAMEPAD_QA.md).
**Tes sintetis tidak membuktikan kompatibilitas controller fisik; hardware masih
belum terverifikasi.** Jalankan `npm.cmd --prefix tools/webgl run test:gamepad`
untuk unit/DOM dan `run test:gamepad:browser` untuk runtime sintetis dengan server aktif.

### Logika dan validasi statis

```powershell
npm.cmd --prefix tools/webgl run build
npm.cmd --prefix tools/webgl run test:syntax
npm.cmd --prefix tools/webgl run test:functions
npm.cmd --prefix tools/webgl run test:realism
```

Build memvalidasi paket aset dan menyalin source ke `Builds/WebGL/`. Ubah **source runtime**, bukan hasil salinan build. Paket simulator tidak menyediakan script lint/typecheck khusus; `test:syntax` memeriksa parsing JavaScript, bukan pengganti pemeriksaan perilaku.

### Persiapan browser tests

```powershell
npm.cmd --prefix tools/webgl ci
npm.cmd --prefix tools/webgl exec -- playwright install chromium
```

Dengan server simulator tetap berjalan di terminal lain:

```powershell
$env:SIM_URL = 'http://127.0.0.1:8080/'
npm.cmd --prefix tools/webgl test
npm.cmd --prefix tools/webgl run test:realism:browser
```

Untuk satu kombinasi atau uji kestabilan, jalankan **terpisah**:

```powershell
$env:REALISM_CASE = 'MOBIL/automatic'
npm.cmd --prefix tools/webgl run test:realism:browser
Remove-Item Env:REALISM_CASE

$env:REALISM_STABILITY_SECONDS = '300'
npm.cmd --prefix tools/webgl run test:realism:browser
Remove-Item Env:REALISM_STABILITY_SECONDS
```

`REALISM_CASE` hanya membuktikan kasus yang dipilih. Uji kestabilan memakai durasi wall-clock; pada host lambat, waktu simulasi yang maju bisa jauh lebih sedikit. Hasil headless bukan benchmark FPS perangkat pengguna.

### Integrasi website/backend lokal

Jalankan website/API dengan database uji terlebih dahulu:

```powershell
$env:WEB_URL = 'http://127.0.0.1:5891'
$env:API_URL = 'http://127.0.0.1:5890'
npm.cmd --prefix tools/webgl run test:realism:iframe
npm.cmd --prefix tools/webgl run test:backend
```

Tes backend membuat akun dan hasil latihan pada database yang dituju. Perjalanan penuh di WebGL dapat lambat; batas waktu dapat diatur lewat `BACKEND_DRIVE_TIMEOUT_MS`. Kelulusan sebagian pemeriksaan API tidak berarti seluruh perjalanan/penyimpanan/dashboard sudah lulus. Status terakhir tercatat di [QA report](docs/REALISM_QA_REPORT.md).

Laporan/tangkapan layar tersedia di `artifacts/realism/`, `artifacts/webgl/`, dan `artifacts/backend-integration/`. Bukti enam kombinasi browser sebelumnya disimpan terpisah dari laporan stabilitas; baca tanggal dan cakupan setiap laporan.

## Konfigurasi dan keamanan

- API: `src/Kemudi.Api/appsettings.json`; website: `src/Kemudi.Web/appsettings.json`.
- Override konfigurasi lokal melalui argumen CLI, environment variables, atau user secrets; jangan commit kredensial.
- Secret JWT bawaan adalah konfigurasi development. Ganti dengan secret privat sebelum deployment, atur HTTPS dan kebijakan CORS sesuai lingkungan.
- Jangan membagikan database akun, token, atau cookie sesi. Lisensi/provenance aset harus diperiksa pada manifest paket aset; keberadaan file di repo bukan izin untuk mendistribusikan ulang sembarang aset.

## Troubleshooting

- **Port sudah digunakan:** pilih port lain dan perbarui `Api:BaseUrl`, `WEB_URL`, `API_URL`, atau `SIM_URL`. Jangan menghentikan proses lain tanpa mengetahui pemiliknya.
- **Build .NET gagal karena DLL terkunci:** hentikan instance milik Anda sebelum rebuild, atau lakukan validasi dengan `dotnet build Kemudi.slnx --artifacts-path artifacts/dotnet-realism`. Output alternatif tersebut tidak mengganti binary default yang dipakai `dotnet run --no-build`.
- **Model kosong/404:** jalankan lewat HTTP, ulangi build, lalu periksa console browser dan validasi manifest. Jangan menonaktifkan validasi hash agar build terlihat berhasil.
- **Klakson belum terdengar:** lakukan interaksi keyboard/pointer dan pastikan audio tidak dimute; browser membatasi autoplay.
- **Tes browser lambat:** tutup proses tes/browser berat yang Anda jalankan sendiri dan cek dukungan WebGL/GPU. Jangan menafsirkan timeout sebagai PASS.
- **Hasil tidak tersimpan:** pastikan login, koneksi API, dan `Api:BaseUrl` benar; gunakan retry pada panel hasil sebelum menutup halaman.

## Dokumentasi dan kelanjutan pekerjaan

- [Progres dan pekerjaan terbuka](docs/REALISM_PROGRESS.md)
- [Jurnal sesi / titik lanjut](docs/REALISM_SESSION_LOG.md)
- [Laporan QA dan keterbatasan](docs/REALISM_QA_REPORT.md)
- [Audit baseline](docs/REALISM_BASELINE_AUDIT.md)
- [Kontrak integrasi simulator](docs/REALISM_INTEGRATION_CONTRACT.md)
- [Aset prosedural](docs/REALISM_PROCEDURAL_ASSETS.md)

Sebelum melanjutkan pengembangan, baca progres, jurnal, dan QA; periksa source/git status. Setelah sesi selesai, perbarui status dan tambahkan entri jurnal berisi perubahan, tes yang benar-benar dijalankan, gap, serta langkah berikutnya. Checklist rencana tidak otomatis membuktikan fitur selesai.
