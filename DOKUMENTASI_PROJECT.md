# 📘 Kemudi.id — Dokumentasi Lengkap Project (Simulasi & Website)

> **Simulasi Mengemudi Motor, Mobil, dan Truk — dari simulasi 3D interaktif hingga website kursus mengemudi.**
>
> **Struktur repo:** aplikasi web Next.js + simulasi 3D berada di root (`app/`, `components/`, `lib/`),
> hasil **migrasi C#/.NET** ada di [`src/`](./src/README.md) dan **proyek Unity** di
> [`simulation/`](./simulation/Kemudi.Simulation/README.md).
>
> **Dokumentasi lain:** [README.md](./README.md) (visi & fitur game) ·
> [PANDUAN_PENEMPATAN_ASSET.md](./PANDUAN_PENEMPATAN_ASSET.md) (penempatan & penggantian aset 3D)

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

Selain game simulasi, project ini memiliki **website kursus mengemudi** (Next.js App Router) dengan halaman-halaman berikut.

### Halaman & Rute

| Rute | Deskripsi |
|---|---|
| `/` | Landing page — hero, 3 jenis kendaraan, materi terbaru |
| `/kursus` | Paket kursus, jadwal, pemilihan mentor (bisa difilter per kendaraan) |
| `/kursus/mentor/[id]` | Portofolio mentor (sertifikasi, pencapaian, testimoni) |
| `/kursus/personal` | Form data diri + metode pembayaran + instruksi pembayaran |
| `/kursus/payment` | Halaman pembayaran |
| `/materi` & `/materi/[slug]` | Materi teori |
| `/simulasi` | 🎮 Peluncur simulasi 3D (dynamic import, `ssr: false`) |
| `/login` & `/register` | Autentikasi |
| `/dashboard` | Statistik & riwayat latihan (butuh login) |

### Autentikasi

- NextAuth v5 dengan strategi **JWT** dan provider **Credentials** (email + password, diverifikasi dengan bcryptjs).
- Registrasi via `POST /api/register` (validasi email unik, password ≥ 6 karakter, hash bcrypt).

### Database (Prisma + SQLite)

Skema di `prisma/schema.prisma`:

| Model | Field |
|---|---|
| `User` | `id` (cuid, PK), `name`, `email` (unique), `password` (hash), `createdAt`, relasi `attempts` |
| `SimulationAttempt` | `id`, `userId` (FK → User), `vehicleType` (MOTOR/MOBIL/TRUK), `score` (0–100), `timeTakenMs`, `violations`, `offRoadCount`, `completed`, `createdAt` |

### API Routes

| Method | Endpoint | Deskripsi |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | Handler NextAuth |
| POST | `/api/register` | Registrasi user baru |
| POST | `/api/progress` | Simpan hasil simulasi (butuh login) — skor di-clamp 0–100 di server |
| GET | `/api/progress` | Ambil riwayat latihan user (50 terbaru) |

### Kursus & Pendaftaran

- **7 paket kursus** (`COURSE_PACKAGES`): Motor Reguler/Intensif, Mobil Reguler/Intensif/Mahir (Defensive), Truk Reguler/Profesional — harga mulai Rp350.000 hingga Rp4.500.000.
- **4 mentor** (`MENTORS`): Budi Santoso, Siti Rahma, Agus Wirawan, Dewi Lestari — lengkap dengan rating, pengalaman, jumlah murid, dan portofolio.
- **5 slot jadwal** (`SCHEDULE_SLOTS`).
- **3 metode pembayaran**: Transfer Bank (BCA/BNI + tombol salin nomor rekening), E-Wallet/QRIS, Bayar di Tempat.
- **Alur pendaftaran**: pilih paket → pilih mentor → isi data diri (nama, email, telepon, NIK, alamat) → instruksi pembayaran → konfirmasi "Saya sudah bayar" → data disimpan di localStorage (`kemudi_registration`) → diarahkan ke `/dashboard`.

### Materi

| Slug | Judul | Kategori |
|---|---|---|
| `rambu-lalu-lintas` | Mengenal Rambu Lalu Lintas (Permenhub No. 13/2014) | Umum |
| `dasar-berkendara-motor` | Dasar Berkendara Sepeda Motor | Motor |
| `dasar-mengemudikan-mobil` | Dasar Mengemudikan Mobil | Mobil |
| `dasar-mengemudikan-truk` | Dasar Mengemudikan Truk | Truk |

### Dashboard

- Kartu statistik: **Total Percobaan**, **Skor Terbaik**, **Rata-rata Skor**.
- **Status pendaftaran** kursus (pending → paid) via komponen `UserRegistrationStatus`.
- **Tabel riwayat latihan**: tanggal, kendaraan, skor, waktu, pelanggaran, keluar jalur — diambil langsung dari Prisma.

---

## Dukungan VR / XR

Simulasi mendukung **WebXR** agar pengguna bisa berlatih di dalam kabin kendaraan secara imersif. Komponennya ada di `components/simulation/xr/`.

| Komponen | Fungsi |
|---|---|
| `store.ts` | Store XR global (`createXRStore`) — hand + controller aktif, **emulator off**, `frameRate` & `frameBufferScaling` "mid", `foveation: 1` (optimal Quest 2/3) |
| `VRToggleButton.tsx` | Tombol **"Masuk VR"** di DOM — deteksi dukungan WebXR (butuh HTTPS/localhost), retry loop ≤3,5 dtk saat Canvas belum mount |
| `VRButton.tsx` | Tombol VR 3D (warna idle/hover/active/danger/disabled) |
| `XRInputAdapter.ts` | Adaptor input XR → `VehicleInput` |
| `XRControlsMap.tsx` | Pemetaan stik/tombol controller (setir, gigi, lampu, kamera, pause) |
| `VRControlPanel.tsx` | Panel kontrol world-space di kabin (mesin, rem tangan, sein, lampu, hazard, klakson, sabuk, helm, kamera, keluar VR) |
| `XRDashboard.tsx` | Dashboard speedometer/gear world-space |
| `CabinAnchor.tsx` | Jangkar kabin — dashboard & panel VR mengikuti posisi kursi pengemudi |
| `CameraFollower.tsx` | Kamera mengikuti rig XR |
| `XRComfort.tsx` | Vignette anti motion sickness |
| `XROptimizer.tsx` | Optimasi performa VR |
| `handGestures.ts` | Deteksi gesture tangan (pinch, fist) via joint tracking |
| `vrActions.ts` | Aksi VR (toggle engine, handbrake, sein, lampu, dll.) |
| `uiHover.ts` | Hover state untuk UI VR |

> Emulator `@pmndrs/xr` (IWER) **sengaja dimatikan** (`emulate: false`) karena menyuntikkan instance Three.js kedua yang bisa merusak sesi headset asli.

---

## Migrasi .NET / C# (`src/`)

Hasil migrasi dari Next.js/TS ke .NET (PHASE 1–4) — detail lengkap di [`src/README.md`](./src/README.md).

| Proyek | Teknologi | Isi |
|---|---|---|
| `Kemudi.Domain` | Class Library | Entities (Course, CoursePackage, CourseRegistration, Mentor, Payment, SimulationAttempt, TrainingSession, Vehicle) + Enums |
| `Kemudi.Shared` | Class Library | DTO (Auth, Course, Progress, UserProfile, Vehicle) |
| `Kemudi.Infrastructure` | Class Library | EF Core DbContext, Identity, JWT, SeedData (3 kendaraan, 3 kursus, 7 paket, 4 mentor) |
| `Kemudi.Api` | Web API | Controllers (Auth, Courses, Mentors, Vehicles, Progress, CourseRegistration, Payments) + Swagger + CORS |
| `Kemudi.Web` | Blazor Web App | Home, Kursus, Materi, MentorDetail, Personal, Payment, Login, Register, Logout, Dashboard, Simulasi |

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
├── app/                  🌐 Website Next.js (App Router)
│   ├── api/              #   NextAuth, progress, register
│   ├── dashboard/        #   Dashboard progres latihan
│   ├── kursus/           #   Kursus, mentor, personal, payment
│   ├── login/ register/  #   Autentikasi
│   ├── materi/           #   Materi teori
│   ├── simulasi/         #   🎮 Entry point simulasi 3D
│   └── page.tsx          #   Landing page
├── components/
│   ├── simulation/       #   🎮 Komponen simulasi 3D (Scene, Track, VehicleController, HUD, dll.)
│   ├── simulation/xr/    #   🥽 Komponen VR/XR
│   ├── simulation/vehicles/  # Mesh kendaraan (prosedural + GLB)
│   ├── kursus/           #   MentorSelector
│   └── ui/               #   VRToggleButton
├── lib/                  🧠 Logika inti (fisika, track, rintangan, data kursus/materi, auth)
├── store/simStore.ts     State global simulasi (Zustand)
├── prisma/               Skema database SQLite
├── public/models/        Model GLB kendaraan
├── src/                  ⚙️ Migrasi .NET/C# (API + Blazor)
├── simulation/           🎯 Proyek Unity
└── README.md             Visi & fitur game
```

---

## Cara Menjalankan

### Website + Simulasi (Next.js)

```bash
npm install
npx prisma migrate dev   # buat database + tabel
npm run dev              # http://localhost:3000
npm run build && npm start   # production
```

> Untuk VR dari headset (Quest) lewat LAN: butuh HTTPS atau `localhost` — gunakan `npm run dev:https` atau `adb reverse tcp:3000 tcp:3000`.

### API + Website .NET

```bash
dotnet build Kemudi.slnx
cd src/Kemudi.Api && dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .
dotnet run --project src/Kemudi.Api    # http://localhost:5077 (Swagger /swagger)
dotnet run --project src/Kemudi.Web    # http://localhost:5259
```

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

- Next.js
- React
- TypeScript
- Three.js
- React Three Fiber
- Rapier Physics
- Tailwind CSS
- Zustand
- Framer Motion

> **Versi terpasang di project** (`package.json`): Next.js 16.2.11 · React 19.2.4 · TypeScript 5 ·
> Three.js 0.185.1 · @react-three/fiber 9.6.1 · @react-three/drei 10.7.7 · @react-three/rapier 2.2.0 ·
> @pmndrs/xr 6.6.30 · Tailwind CSS 4 · Zustand 5.0.14 · NextAuth 5.0.0-beta.32 · Prisma 6.19.3 ·
> bcryptjs 3.0.3. Stack .NET: ASP.NET Core Web API + EF Core + Identity + JWT + Blazor Web App.

---

## Visi

Membangun simulator mengemudi motor, mobil, dan truk yang realistis, edukatif, dan mudah diakses, sehingga pengguna dapat belajar berkendara dengan aman dalam lingkungan virtual yang menyerupai kondisi jalan raya sehari-hari.
