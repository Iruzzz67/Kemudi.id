# 📘 Kemudi.id — Dokumentasi Lengkap Project (Simulasi & Website)

> **Simulasi Mengemudi Motor, Mobil, dan Truk — dari simulasi 3D interaktif hingga website kursus mengemudi.**
>
> **Struktur repo:** aplikasi web dibangun dengan **.NET/C#** (ASP.NET Core + Blazor)
> di [`src/`](./src/README.md), **simulasi 3D** dengan **Unity** di
> [`simulation/`](./simulation/Kemudi.Simulation/README.md). Jalankan dengan `dotnet run`
> (lihat [Cara Menjalankan](#cara-menjalankan)).
>
> **Dokumentasi lain:** [README.md](./README.md) (visi & fitur game) ·
> [`src/README.md`](./src/README.md) (aplikasi .NET) ·
> [`docs/OPTIMASI_SIMULASI.md`](./docs/OPTIMASI_SIMULASI.md) (arsitektur simulasi Unity) ·
> [`docs/VR_INPUT_MAP.md`](./docs/VR_INPUT_MAP.md) (input VR)

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

## Website Kemudi.id

Selain game simulasi, project ini memiliki **website kursus mengemudi** yang seluruhnya dibangun dengan **.NET/C#** — Blazor Web App (ASP.NET Core), EF Core, dan ASP.NET Core Identity. Kode lama React/TypeScript/Next.js sudah dihapus dari repo; semua halaman & API kini `.razor`/`.cs`.

### Halaman & Rute (Blazor)

| Rute | Deskripsi |
|---|---|
| `/` | Landing page — hero, 3 jenis kendaraan, materi terbaru |
| `/kursus` | Paket kursus, jadwal, pemilihan mentor (bisa difilter per kendaraan) |
| `/kursus/mentor/{slug}` | Portofolio mentor (sertifikasi, pencapaian, testimoni) |
| `/kursus/personal` | Form data diri + metode pembayaran + instruksi pembayaran |
| `/kursus/payment` | Halaman pembayaran |
| `/materi` & `/materi/{slug}` | Materi teori |
| `/simulasi` | 🎮 Peluncur simulasi 3D (aplikasi Unity) |
| `/login`, `/register`, `/logout` | Autentikasi |
| `/dashboard` | Statistik & riwayat latihan (butuh login) |
| `/admin/*` | Panel admin terpisah (login, dashboard, pendaftaran, pengguna, mentor, jadwal, pembayaran, kursus, statistik, pengaturan) |

### Autentikasi

- **ASP.NET Core Identity** + **JWT** — token disimpan di cookie `kemudi_token` (httpOnly) oleh `AuthService` dan disisipkan otomatis oleh `ApiClient`.
- Registrasi via `POST /api/auth/register` (validasi email unik, password ≥ 6 karakter, hash Identity).
- Role `Admin` berasal dari Identity role → klaim JWT; endpoint `/api/admin/*` divalidasi `[Authorize(Roles = "Admin")]` (non-admin mendapat 403).

### Database (EF Core + SQLite)

Model di `src/Kemudi.Domain/Entities/` + DbContext `src/Kemudi.Infrastructure/Data/AppDbContext.cs` (migrasi EF di `src/Kemudi.Infrastructure/Migrations/`):

| Model | Field |
|---|---|
| `ApplicationUser` (Identity) | `id`, `name`, `email` (unique), `passwordHash`, `isActive`, `createdAt`, relasi `attempts` |
| `SimulationAttempt` | `id`, `userId` (FK → User), `vehicleType` (MOTOR/MOBIL/TRUK), `score` (0–100), `timeTakenMs`, `violations`, `offRoadCount`, `obstacleHits`, `completed`, `createdAt` |
| `Course`, `CoursePackage`, `Mentor`, `Schedule`, `CourseRegistration`, `Payment`, `AuditLog`, `TrainingSession`, `Vehicle` | lihat `src/Kemudi.Domain/Entities/` |

### API (ASP.NET Core Web API)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Registrasi user baru |
| POST | `/api/auth/login` | Login → JWT |
| GET | `/api/auth/me` | Profil user (JWT) |
| POST / GET | `/api/progress` | Simpan/ambil riwayat simulasi (JWT) — skor di-clamp 0–100 di server |
| GET | `/api/courses`, `/api/courses/{slug}` | Paket kursus |
| GET | `/api/mentors`, `/api/mentors/{slug}` | Mentor |
| GET | `/api/vehicles` | Kendaraan |
| POST / GET | `/api/course-registration` | Pendaftaran kursus |
| POST | `/api/payment` | Pembayaran |
| `/api/admin/*` | 10 controller | Panel admin (JWT, role Admin) |

### Kursus & Pendaftaran

- **7 paket kursus**: Motor Reguler/Intensif, Mobil Reguler/Intensif/Mahir (Defensive), Truk Reguler/Profesional — harga mulai Rp350.000 hingga Rp4.500.000 (ter-seed di EF, `SeedData.cs`).
- **4 mentor**: Budi Santoso, Siti Rahma, Agus Wirawan, Dewi Lestari — lengkap dengan rating, pengalaman, jumlah murid, dan portofolio.
- **5 slot jadwal** (`Schedule`).
- **3 metode pembayaran**: Transfer Bank (BCA/BNI), E-Wallet/QRIS, Bayar di Tempat.
- **Alur pendaftaran**: pilih paket → pilih mentor → isi data diri (nama, email, telepon, NIK, alamat) → instruksi pembayaran → konfirmasi "Saya sudah bayar" → pendaftaran tersimpan di database (status `pending`, diverifikasi admin di `/admin/pendaftaran`).

### Materi

| Slug | Judul | Kategori |
|---|---|---|
| `rambu-lalu-lintas` | Mengenal Rambu Lalu Lintas (Permenhub No. 13/2014) | Umum |
| `dasar-berkendara-motor` | Dasar Berkendara Sepeda Motor | Motor |
| `dasar-mengemudikan-mobil` | Dasar Mengemudikan Mobil | Mobil |
| `dasar-mengemudikan-truk` | Dasar Mengemudikan Truk | Truk |

> Materi statis didefinisikan di `src/Kemudi.Web/Data/MateriData.cs`.

### Dashboard

- Kartu statistik: **Total Percobaan**, **Skor Terbaik**, **Rata-rata Skor**.
- **Status pendaftaran** kursus (pending → paid) diambil dari API.
- **Tabel riwayat latihan**: tanggal, kendaraan, skor, waktu, pelanggaran, keluar jalur — dari database via `POST/GET /api/progress`.

---

## Dukungan VR / XR

Simulasi mendukung **VR (OpenXR)** agar pengguna bisa berlatih di dalam kabin kendaraan secara imersif. Implementasinya ada di proyek **Unity** `simulation/Kemudi.Simulation/Assets/Scripts/XR/` (bukan WebXR/Three.js):

| Komponen (C#) | Fungsi |
|---|---|
| `XRManager.cs` | Inisialisasi OpenXR & rig |
| `XRInputProvider.cs` | Provider input VR → `UniversalInputSystem` → `VehicleInputState` |
| `XRComfortSystem.cs` | Vignette anti motion sickness |
| `XRDashboard.cs` | Dashboard speedometer/gear world-space |
| `HandTrackingManager.cs` | Hand tracking (default OFF) |
| `HudController.cs` | HUD melayang mengikuti kamera FPV (±2,2 m di depan mata) |

> Pemetaan input lengkap: [`docs/VR_INPUT_MAP.md`](./docs/VR_INPUT_MAP.md). Build target: PC VR (OpenXR) & Meta Quest standalone (Android).

---

## Aplikasi .NET / C# (`src/`)

Aplikasi web utama (pengganti Next.js yang sudah dihapus) — detail lengkap di [`src/README.md`](./src/README.md).

| Proyek | Teknologi | Isi |
|---|---|---|
| `Kemudi.Domain` | Class Library | Entities (Course, CoursePackage, CourseRegistration, Mentor, Payment, Schedule, AuditLog, SimulationAttempt, TrainingSession, Vehicle) + Enums |
| `Kemudi.Shared` | Class Library | DTO (Auth, Course, Progress, UserProfile, Vehicle, Admin) |
| `Kemudi.Infrastructure` | Class Library | EF Core DbContext, Identity, JWT, SeedData (3 kendaraan, 3 kursus, 7 paket, 4 mentor) |
| `Kemudi.Api` | Web API | Controllers (Auth, Courses, Mentors, Vehicles, Progress, CourseRegistration, Payments) + **admin `/api/admin/*`** + Swagger + CORS |
| `Kemudi.Web` | Blazor Web App | Home, Kursus, Materi, MentorDetail, Personal, Payment, Login, Register, Logout, Dashboard, Simulasi + **panel admin `/admin/*`** |

**Endpoint API:**

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | — |
| GET | `/api/auth/me` | ✅ JWT |
| POST / GET | `/api/progress` | ✅ JWT |
| GET | `/api/courses`, `/api/courses/{slug}` | — |
| GET | `/api/mentors`, `/api/mentors/{slug}` | — |
| GET | `/api/vehicles` | — |
| POST / GET | `/api/course-registration` | opsional |
| POST | `/api/payment` | — |

> **Catatan:** skor **tidak dipercaya mentah dari klien** — `POST /api/progress` me-clamp skor 0–100 dan memvalidasi semua field. Token JWT di Blazor disimpan di cookie `kemudi_token` (httpOnly) dan disisipkan otomatis oleh `ApiClient`.

---

## Proyek Unity (`simulation/`)

Scaffold proyek Unity untuk simulasi (status: **scaffold + script inti**, belum siap build) — detail di [`simulation/Kemudi.Simulation/README.md`](./simulation/Kemudi.Simulation/README.md).

```
Assets/
├── Scenes/           (dibuat di Unity Editor)
├── Scripts/
│   ├── Core/         SimulationManager.cs  — orkestrator fase simulasi
│   ├── Input/        VehicleInputState, UniversalInputSystem, KeyboardInputProvider
│   ├── Vehicles/     VehicleConfig (ScriptableObject), VehicleController, VehiclePhysics
│   ├── Transmission/ EngineController, Manual/AutomaticTransmissionController, TransmissionController
│   ├── Rules/        ViolationSystem (deteksi) terpisah dari ScoringSystem (skor 0-100)
│   ├── Camera/       CameraManager (FPV/TPV/TopDown)
│   ├── XR/           XRManager, XRComfortSystem (vignette), XRDashboard (world-space)
│   └── Audio/        VehicleAudioSystem (suara mesin mengikuti RPM)
├── Prefabs/          (dibuat di Editor)
├── Models/           GLB hasil migrasi dari public/models
└── Materials/ Audio/
```

**Prinsip arsitektur** (paralel dengan versi web):

- Semua input → `UniversalInputSystem` → `VehicleInputState` → `VehicleController` → `VehiclePhysics`.
- `VehicleController` **tidak pernah tahu** asal input (keyboard/gamepad/VR/wheel/hand-tracking).
- Fisika di `FixedUpdate`, input disampling terpisah, animasi roda/visual terpisah.
- `ViolationSystem` (deteksi) dipisah dari `ScoringSystem` (pencatatan).
- Wajib Rigidbody — tidak ada `transform.Translate` untuk kendaraan utama.

**Build target:** Windows PC (Desktop), PC VR (OpenXR), Meta Quest standalone (Android).

---

## Struktur Repository

```
Kemudi.id/
├── Kemudi.slnx           Solusi .NET
├── src/
│   ├── Kemudi.Domain/          # Entity + Enum (C#)
│   ├── Kemudi.Shared/          # DTO
│   ├── Kemudi.Infrastructure/  # EF Core + Identity + JWT + Migrations
│   ├── Kemudi.Api/             # ASP.NET Core Web API (termasuk /api/admin/*)
│   └── Kemudi.Web/             # Blazor Web App (halaman publik + panel admin /admin/*)
├── simulation/
│   └── Kemudi.Simulation/      # 🎯 Proyek Unity (simulasi 3D)
├── tools/
│   └── MigratePrismaData/      # Tool migrasi data dari database lama
├── docs/                       # Dokumentasi migrasi
└── README.md                   # Visi & fitur game
```

---

## Cara Menjalankan

### API + Website (.NET/C#)

```bash
dotnet build Kemudi.slnx
cd src/Kemudi.Api && dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .
dotnet run --project src/Kemudi.Api    # http://localhost:5077 (Swagger /swagger)
dotnet run --project src/Kemudi.Web    # http://localhost:5259 (panel admin di /admin/login)
```

Akun admin default: `admin@kemudi.id` / `admin1234` (bisa diubah di `src/Kemudi.Api/appsettings.json`).

### Unity

1. Unity Hub → *Add project from disk* → pilih `simulation/Kemudi.Simulation` (Unity 6 / 2022.3+, modul Android Build Support untuk Quest).
2. Install paket: `com.unity.xr.openxr`, `com.unity.inputsystem`, `com.unity.xr.interaction.toolkit` (opsional).
3. Buat scene, tempel `SimulationManager` + `UniversalInputSystem` + `VehicleController`/`VehiclePhysics`, buat `VehicleConfig`.

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
- **ASP.NET Core Identity** + **JWT**
- **Unity** (simulasi 3D & VR)
- **CSS** (global `app.css`)

> **Versi terpasang:** .NET SDK 8+ (solusi `Kemudi.slnx`, target `net8.0`), EF Core 8, Identity,
> Swashbuckle (Swagger), Unity 6 / 2022.3+ untuk `simulation/`. Tidak ada lagi dependency npm/Node.

---

## Visi

Membangun simulator mengemudi motor, mobil, dan truk yang realistis, edukatif, dan mudah diakses, sehingga pengguna dapat belajar berkendara dengan aman dalam lingkungan virtual yang menyerupai kondisi jalan raya sehari-hari.
