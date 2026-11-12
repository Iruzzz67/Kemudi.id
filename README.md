<<<<<<< HEAD
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
=======
# 🚗 Kemudi.id - Simulasi Mengemudi Motor, Mobil, dan Truk

> **Struktur repo:** aplikasi web dibangun dengan **.NET/C#** — `src/` berisi
> ASP.NET Core API + Blazor (website & panel admin), `simulation/` berisi proyek
> Unity (simulasi 3D), `docs/` berisi dokumentasi. Jalankan semuanya dengan
> **`dotnet run`** (lihat [Cara Menjalankan](#cara-menjalankan)).
>
> **Dokumentasi:** [`src/README.md`](./src/README.md) (aplikasi .NET) ·
> [`docs/MIGRASI_DOTNET_FULL.md`](./docs/MIGRASI_DOTNET_FULL.md) (migrasi) ·
> [`DOKUMENTASI_PROJECT.md`](./DOKUMENTASI_PROJECT.md) (dokumentasi lengkap)

---

## Cara Menjalankan

```bash
# 1. Build solusi
dotnet build Kemudi.slnx

# 2. Terapkan database (SQLite, otomatis ter-seed)
cd src/Kemudi.Api
dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .

# 3. API → http://localhost:5077 (Swagger /swagger)
dotnet run --project src/Kemudi.Api

# 4. Website → http://localhost:5259
dotnet run --project src/Kemudi.Web
```

- Akun admin default: `admin@kemudi.id` / `admin1234` (ubah di `Admin:Email`/`Admin:Password` pada `src/Kemudi.Api/appsettings.json`).
- Panel admin: `http://localhost:5259/admin/login`.

---

## Deskripsi
Kemudi.id adalah game simulasi mengemudi realistis yang memungkinkan pemain belajar dan berlatih mengendarai **sepeda motor, mobil, dan truk** pada lingkungan yang menyerupai jalan raya di dunia nyata. Setiap kendaraan memiliki karakteristik berkendara yang berbeda sehingga memberikan pengalaman simulasi yang lebih realistis.

---

## Tujuan Game

- Melatih kemampuan berkendara secara aman.
- Mengenalkan peraturan lalu lintas.
- Memberikan pengalaman berkendara yang realistis.
- Menjadi media pembelajaran sebelum praktik di jalan sebenarnya.

---

## Mode Kendaraan

### 🏍️ Motor
- 1 varian: Motor Bebek (varian lain dihapus)

#### Fitur
- Manual & Automatic
- Lampu
- Klakson
- Sein
- Spion
- Speedometer
- Indikator bensin

---

### 🚗 Mobil

#### Jenis
- 1 varian: Sedan (varian lain dihapus)

#### Fitur
- Manual
- Automatic
- Lampu
- Wiper
- Sein
- Hazard
- Klakson
- AC
- Dashboard Digital

---

### 🚛 Truk

#### Jenis
- 1 varian: Truk Box (varian lain dihapus)

#### Fitur
- Manual Transmission
- Air Brake
- Lampu
- Sein
- Klakson
- Dashboard Truk
- Kamera Belakang

---

## Lingkungan Jalan

### Jalan Perkotaan

- Persimpangan
- Lampu Merah
- Zebra Cross
- Bundaran
- Flyover
- Underpass
- Jalan Satu Arah
- Jalan Dua Arah
- Gang Perumahan

---

### Jalan Raya

- Jalan Nasional
- Jalan Provinsi
- Jalan Tol
- Rest Area
- SPBU
- Terminal
- Halte
- Jembatan

---

### Pedesaan

- Jalan Sempit
- Sawah
- Perkebunan
- Sungai
- Jembatan Kayu
- Tikungan Tajam

---

### Pegunungan

- Tanjakan
- Turunan
- Tikungan Hairpin
- Jurang
- Kabut

---

## Rambu Lalu Lintas

### Rambu Larangan

- Dilarang Parkir
- Dilarang Berhenti
- Dilarang Putar Balik
- Dilarang Masuk
- Batas Kecepatan

---

### Rambu Peringatan

- Tikungan Tajam
- Jalan Licin
- Jalan Menurun
- Jalan Menanjak
- Penyempitan Jalan
- Penyeberangan Pejalan Kaki

---

### Rambu Petunjuk

- Rumah Sakit
- SPBU
- Rest Area
- Terminal
- Kota Tujuan
- Area Parkir

---

## Aturan Lalu Lintas

- Menggunakan sein saat berbelok.
- Berhenti saat lampu merah.
- Memberi jalan kepada pejalan kaki.
- Tidak melawan arus.
- Mematuhi batas kecepatan.
- Menjaga jarak aman.
- Menggunakan lampu malam.
- Tidak melewati marka utuh.

---

## AI Kendaraan

Jenis kendaraan yang muncul di jalan:

- Mobil
- Motor
- Truk
- Bus
- Ambulans
- Polisi
- Pemadam Kebakaran

#### Perilaku AI:

- Berhenti di lampu merah.
- Menggunakan sein.
- Menyalip.
- Berbelok.
- Parkir.
- Memberi jalan.

---

## AI Pejalan Kaki

- Menyeberang di Zebra Cross.
- Berjalan di trotoar.
- Menunggu lampu hijau.
- Membawa barang.
- Berlari ketika hujan.

---

## Cuaca

- Cerah
- Berawan
- Hujan Ringan
- Hujan Deras
- Kabut
- Malam Hari
- Matahari Terbenam

---

## Sistem Kendaraan

### Mesin

- Starter
- RPM
- Suhu Mesin
- Oli
- Bahan Bakar

---

### Kendali

- Gas
- Rem
- Kopling
- Persneling
- Handbrake
- Steering

---

## Kamera

- First Person
- Third Person
- Dashboard View
- Free Camera
- Drone Camera

---

## Sistem Pelanggaran

Poin pelanggaran akan bertambah apabila:

- Melanggar lampu merah.
- Menabrak kendaraan.
- Menabrak pejalan kaki.
- Tidak memakai sein.
- Melebihi batas kecepatan.
- Melawan arus.
- Parkir sembarangan.

---

## Misi

- Belajar dasar mengemudi.
- Parkir Paralel.
- Parkir Mundur.
- Putar Balik.
- Menyalip Kendaraan.
- Berkendara di Jalan Tol.
- Berkendara Saat Hujan.
- Mengantar Barang (Truk).
- Ujian SIM.

---

## Sistem Penilaian

| Kriteria | Nilai |
|----------|------:|
| Keselamatan | 40 |
| Kepatuhan Rambu | 25 |
| Kehalusan Berkendara | 20 |
| Ketepatan Waktu | 15 |

Nilai maksimal: **100**

---

## Fitur Tambahan

- Dashboard interaktif.
- GPS Navigation.
- Mini Map.
- Voice Navigation.
- Sistem Kerusakan Kendaraan.
- Sistem Bahan Bakar.
- Pengisian BBM di SPBU.
- Save Progress.
- Achievement.
- Statistik Berkendara.

---

## Kontrol

### Keyboard

| Tombol | Fungsi |
|---------|--------|
| W | Gas |
| S | Rem |
| A | Belok Kiri |
| D | Belok Kanan |
| Shift | Kopling |
| Q | Sein Kiri |
| E | Sein Kanan |
| R | Hazard |
| L | Lampu |
| H | Klakson |
| Space | Rem Tangan |
| C | Ganti Kamera |
| M | Map |
| Esc | Pause |

---

## Target Pengguna

- Pemula yang ingin belajar mengemudi.
- Siswa kursus mengemudi.
- Pelajar.
- Mahasiswa.
- Masyarakat umum.
- Pengemudi profesional.

---

## Konsep Realistis

Game dirancang menyerupai kondisi lalu lintas Indonesia dengan:

- Marka jalan sesuai standar.
- Lampu lalu lintas aktif.
- Kendaraan AI realistis.
- Cuaca dinamis.
- Siklus siang dan malam.
- Jalan perkotaan dan pedesaan.
- Sistem fisika kendaraan realistis.
- Suspensi yang responsif.
- Sistem traksi ban.
- Efek hujan terhadap daya cengkeram ban.
- Simulasi kemacetan.
- Kendaraan darurat yang memiliki prioritas jalan.

---

## Roadmap Pengembangan

### Tahap 1
- Sistem kendaraan.
- Jalan raya.
- AI kendaraan.
- Kamera.

### Tahap 2
- Cuaca.
- Pejalan kaki.
- Misi.
- GPS.

### Tahap 3
- Multiplayer.
- Leaderboard.
- Career Mode.
- Mod Support.

---

## Teknologi

- **ASP.NET Core** (Web API + Blazor Web App)
- **C#** (.NET 8)
- **Entity Framework Core** (SQLite dev / siap PostgreSQL)
- **ASP.NET Core Identity** + **JWT** (autentikasi & role)
- **Unity** (simulasi 3D, diluncurkan dari `/simulasi`)
- **CSS** (global `app.css`)

---

## Sistem Admin Terpisah

Kemudi.id memiliki panel admin yang **terpisah secara visual, struktural, dan fungsional** dari sistem pengguna — layout sendiri (sidebar, tanpa navbar user), login khusus, dan proteksi berlapis.

### Halaman admin

| Route | Fungsi |
| --- | --- |
| `/admin/login` | Login admin (desain terpisah; user biasa ditolak — 403) |
| `/admin/dashboard` | Ringkasan sistem, grafik 7 hari, aktivitas terbaru |
| `/admin/pendaftaran` | Pendaftaran kursus + konfirmasi/tolak pembayaran (hitungan orang unik per email) |
| `/admin/pengguna` | Manajemen pengguna (role admin/user, aktif/nonaktif, detail) |
| `/admin/mentor` | CRUD mentor |
| `/admin/jadwal` | CRUD jadwal kursus |
| `/admin/pembayaran` | Verifikasi pembayaran (paid/rejected/reopen) |
| `/admin/kursus` | CRUD paket kursus |
| `/admin/statistik` | Statistik pengguna, kursus, pembayaran, pendaftaran |
| `/admin/pengaturan` | Ganti password, kelola akun admin (promote), audit log |

### Keamanan (berlapis)

1. **`[Authorize(Roles = "Admin")]`** pada seluruh controller `/api/admin/*` — token tanpa role Admin mendapat **403**.
2. **`AdminLayout`** — halaman admin memeriksa role dari klaim JWT; bukan admin diarahkan ke `/admin/login`.
3. Role selalu berasal dari **Identity role** (klaim JWT), tidak pernah dari input klien.
4. Akun yang dinonaktifkan admin (`IsActive = false`) tidak bisa login. Admin tidak bisa menonaktifkan akun sendiri.
5. Aktivitas penting (login, konfirmasi/tolak pembayaran, CRUD mentor/kursus/jadwal, perubahan user) tercatat di **audit log** (`AuditLog`).
6. Password di-hash oleh ASP.NET Identity; halaman pengaturan menyediakan ganti password (memvalidasi password lama).

### Hak akses

- `USER` — hanya akses situs publik; tidak bisa membuka `/admin/*` (di-redirect) atau `/api/admin/*` (403).
- `ADMIN` — akses penuh ke seluruh panel admin.

Cara menjadikan akun admin:

1. **Akun admin default** dibuat otomatis saat API pertama kali dijalankan (`admin@kemudi.id`, lihat konfigurasi `Admin:Email`/`Admin:Password`).
2. Di panel admin, buka **Pengaturan → Akun Admin → Jadikan Admin** (isi email pengguna yang ingin dipromosikan).

Setelah login sebagai admin, link **🛡️ Admin** di navbar membuka `/admin/dashboard`.

---

## HUD VR Mengikuti Kamera FPV

Saat sesi VR aktif, HUD melayang menempel pada kamera FPV (implementasi Unity: `simulation/Kemudi.Simulation/Assets/Scripts/UI/HudController.cs`) dan ditampilkan pada jarak baca nyaman (±2,2 m di depan mata, sedikit di bawah garis pandang) sehingga tidak mepet dengan kamera.

---

## Visi

Membangun simulator mengemudi motor, mobil, dan truk yang realistis, edukatif, dan mudah diakses, sehingga pengguna dapat belajar berkendara dengan aman dalam lingkungan virtual yang menyerupai kondisi jalan raya sehari-hari.
>>>>>>> origin/build
