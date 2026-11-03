# 🚗 Kemudi.id — Ringkasan & Cakupan Proyek

**Kemudi.id** adalah platform edukasi dan simulasi mengemudi berbasis web 3D interaktif yang dirancang untuk memberikan pengalaman belajar mengemudi kendaraan (Motor, Mobil, dan Truk) secara nyata, aman, dan komprehensif.

**Stack utama:** C# / .NET 8 (Blazor Server + ASP.NET Core API) + Unity (simulasi 3D + VR OpenXR).

---

## 📋 Fitur Utama & Cakupan Sistem

### 1. 🎮 Simulasi Mengemudi 3D Interaktif (Unity/C#)

- **Fisika Realistis (Rigidbody):** Kinematic bicycle model, akselerasi, pengereman, transmisi manual/otomatis, body lean/roll, suspensi spring-damper.
- **3 Jenis Kendaraan:**
  - **Motor:** Lincah, cepat, sudut lean visual dinamis (3 gigi).
  - **Mobil:** Seimbang, setir kanan RHD (5 gigi).
  - **Truk:** Besar, berat, radius putar lebar (6 gigi).
- **Multi-Camera Mode:** FPV (kabin pengemudi), TPV (chase cam), TopDown.
- **Transmisi Manual & Otomatis:**
  - Manual: Kopling wajib, gear grind, stall engine.
  - Automatic: Gigi berpindah otomatis dari RPM & kecepatan.
- **Audio Dinamis:** Suara mesin (RPM ratio), derit ban, klakson, sein.
- **Checklist Pra-Jalan:** Helm/jaket/sarung/sepatu (motor), sabuk/kursi/spion (mobil/truk).
- **Lintasan Kota Bogor:** ±916 m dengan S-Curve, persimpangan, zebra cross, obstacle zone.
- **AI Kendaraan & Pejalan Kaki:** Object pool, update 5-10 Hz, berhenti di lampu merah.
- **Sistem Skor (0-100):** Pelanggaran, keluar jalur, tabrakan rintangan, penalti waktu.
- **VR OpenXR:** Meta Quest standalone + PC VR, head tracking, world-space dashboard.

### 2. 🌐 Website Kursus Mengemudi (Blazor Server)

- **Landing page** — hero, 3 jenis kendaraan, materi terbaru.
- **Kursus** — paket kursus, jadwal, pemilihan mentor (filter per kendaraan).
- **Materi** — 4 modul teori (rambu, motor, mobil, truk).
- **Autentikasi** — ASP.NET Core Identity + JWT (cookie httpOnly).
- **Dashboard** — statistik latihan, riwayat skor, status pendaftaran.
- **Panel Admin** — manajemen pengguna, mentor, jadwal, pendaftaran, pembayaran, kursus, statistik, pengaturan.

### 3. 🔗 Integrasi Simulasi ↔ Website

- Blazor `/simulasi` → vehicle selection → launch Unity WebGL build.
- Query params: `?token=JWT&vehicle=TYPE` → `WebGlBridge.cs` di Unity.
- Unity `SimulationResultReporter` → POST `/api/progress` → database.
- Dashboard menampilkan riwayat latihan dari database.

---

## 🛠️ Stack Teknologi

| Kategori | Teknologi | Lokasi |
|---|---|---|
| **Backend API** | ASP.NET Core Web API + Swagger | `src/Kemudi.Api/` |
| **Frontend Web** | Blazor Server (Razor Components) | `src/Kemudi.Web/` |
| **ORM** | Entity Framework Core + SQLite | `src/Kemudi.Infrastructure/` |
| **Auth** | ASP.NET Core Identity + JWT | `src/Kemudi.Infrastructure/` |
| **Domain** | C# Entities + Enums | `src/Kemudi.Domain/` |
| **DTO** | C# Records | `src/Kemudi.Shared/` |
| **Simulasi 3D** | Unity 2022.3 LTS (C#) | `simulation/Kemudi.Simulation/` |
| **Rendering** | Universal Render Pipeline (URP) | Unity |
| **VR** | OpenXR + Unity Input System | Unity |
| **Fisika** | Unity Rigidbody Physics | Unity |

---

## 📁 Struktur Repository

```
Kemudi.id/
├── Kemudi.slnx                    # Solusi .NET
├── src/
│   ├── Kemudi.Domain/             # Entity + Enum
│   ├── Kemudi.Shared/             # DTO (Auth, Course, Progress, Vehicle, Admin)
│   ├── Kemudi.Infrastructure/     # EF Core + Identity + JWT + Migrations
│   ├── Kemudi.Api/                # Web API (/api/* + /api/admin/*)
│   └── Kemudi.Web/                # Blazor Web App (halaman + /admin/*)
├── simulation/
│   └── Kemudi.Simulation/         # 🎯 Proyek Unity (simulasi 3D + VR)
│       └── Assets/Scripts/
│           ├── Core/              # SimulationManager, ObjectPool, WebGlBridge
│           ├── Input/             # VehicleInputState, UniversalInputSystem, KeyboardInputProvider
│           ├── Vehicles/          # VehicleConfig, VehicleController, VehiclePhysics
│           ├── Transmission/      # EngineController, Manual/AutomaticTransmissionController
│           ├── Rules/             # ViolationSystem, ScoringSystem, ChecklistManager
│           ├── Camera/            # CameraManager (FPV/TPV/TopDown)
│           ├── XR/                # XRManager, XRComfortSystem, XRDashboard
│           ├── Traffic/           # TrafficManager, TrafficLightController, TrafficVehicle
│           ├── Environment/       # TrackBuilder, Pedestrian, PedestrianManager
│           ├── Audio/             # VehicleAudioSystem
│           └── Scene/             # KemudiSceneBootstrap, MainMenuUI, SceneHud
├── app/                           # Legacy Next.js (dalam proses deprecation)
├── lib/                           # Shared lib (vehicles, auth, prisma, kursus, materi)
└── README.md                      # Visi & fitur game
```

---

## 🚀 Cara Menjalankan

### API + Website (.NET)

```bash
dotnet build Kemudi.slnx
cd src/Kemudi.Api && dotnet ef database update --project ../Kemudi.Infrastructure --startup-project .
dotnet run --project src/Kemudi.Api    # http://localhost:5077 (Swagger)
dotnet run --project src/Kemudi.Web    # http://localhost:5259 (Blazor)
```

Akun admin: `admin@kemudi.id` / `admin1234`

### Simulasi (Unity)

1. Unity Hub → *Add project from disk* → `simulation/Kemudi.Simulation`
2. Install paket: `com.unity.xr.openxr`, `com.unity.inputsystem`
3. Build → WebGL (browser) atau Android (Quest)
4. Akses dari Blazor: `/simulasi` → pilih kendaraan → "Mulai Simulasi"

---

## 🎯 Target Pengguna

- Pemula yang ingin belajar mengemudi.
- Siswa kursus mengemudi.
- Pelajar / Mahasiswa.
- Masyarakat umum.
- Pengemudi profesional.
