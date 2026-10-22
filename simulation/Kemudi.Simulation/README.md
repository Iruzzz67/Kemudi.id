# Kemudi.Simulation — Unity Project

Proyek Unity untuk simulasi mengemudi Kemudi.id (Motor, Mobil, Truk) dengan dukungan VR OpenXR.

> **Status: berjalan di Unity Editor.** Scene runtime sudah tersedia
> (`Assets/Scenes/Main.unity`, terdaftar di Build Settings) dan seluruh alur
> SIMULASI.md §5 sudah diimplementasikan: pilih kendaraan → **berjalan kaki** →
> masuk kabin → checklist pra-berkendara → berkendara → skor/hasil.
>
> Seluruh script runtime + Editor lolos kompilasi Roslyn (0 error). Sisa
> peringatan hanya anotasi nullable (`CS8632`) dan field Inspector (`CS0649`)
> yang memang diisi dari scene.
>
> Belum dikerjakan: **Build & Deploy** (WebGL/Quest/PC VR) — perlu Unity Editor
> dan perangkat VR fisik (lihat `docs/MIGRATION_TRACKING.md` Phase 8).

## Struktur

```
Assets/
├── Scenes/                  # Scene utama (dibuat di Unity Editor)
├── Scripts/
│   ├── Core/
│   │   └── SimulationManager.cs       # Orkestrator fase simulasi
│   ├── Input/
│   │   ├── VehicleInputState.cs       # Struktur input universal (satu sumber kebenaran)
│   │   ├── UniversalInputSystem.cs    # Abstraction layer semua sumber input
│   │   └── KeyboardInputProvider.cs   # Provider keyboard
│   ├── Vehicles/
│   │   ├── VehicleConfig.cs           # Data-driven konfigurasi kendaraan (scriptable object)
│   │   ├── VehicleController.cs       # Orkestrator kendaraan (bukan monolith!)
│   │   └── VehiclePhysics.cs          # Fisika Rigidbody (FixedUpdate)
│   ├── Transmission/
│   │   ├── EngineController.cs
│   │   ├── ManualTransmissionController.cs
│   │   └── AutomaticTransmissionController.cs
│   ├── Rules/
│   │   ├── ViolationSystem.cs         # Deteksi & pencatatan pelanggaran (terpisah)
│   │   └── ScoringSystem.cs           # Skor 0-100 dengan konfigurasi bobot
│   ├── Camera/
│   │   └── CameraManager.cs           # FPV / TPV / TopDown
│   ├── XR/
│   │   ├── XRManager.cs               # Inisialisasi OpenXR & rig
│   │   ├── XRComfortSystem.cs         # Vignette anti motion sickness
│   │   └── XRDashboard.cs             # Dashboard world-space
│   └── Audio/
│       └── VehicleAudioSystem.cs      # Suara mesin mengikuti RPM
├── Prefabs/                # Prefab kendaraan & environment (dibuat di Editor)
├── Models/                 # GLB hasil migrasi dari public/models
├── Materials/
└── Audio/
```

## Prinsip arsitektur (dari dokumen migrasi)

```
Keyboard ─────┐
Gamepad ──────┤
VR ───────────┤  →  UniversalInputSystem → VehicleInputState → VehicleController → VehiclePhysics
Wheel ────────┤
Hand Tracking ┘
```

- `VehicleController` **tidak pernah tahu** asal input.
- Fisika di `FixedUpdate`, input disampling terpisah, animasi roda/visual terpisah.
- `ViolationSystem` (deteksi) dipisah dari `ScoringSystem` (pencatatan).
- Tidak ada `transform.Translate` untuk pergerakan kendaraan utama — wajib Rigidbody.

## Cara mulai

1. Unity Hub → *Add project from disk* → pilih `simulation/Kemudi.Simulation`.
   (Gunakan Unity 6 / 2022.3+ dengan modul **Android Build Support** untuk Quest.)
2. Pastikan paket di Package Manager sudah terpasang (`manifest.json` sudah
   mencantumkannya): `com.unity.xr.openxr`, `com.unity.inputsystem`,
   `com.unity.xr.management`, `com.unity.xr.interaction.toolkit`.
3. Buka `Assets/Scenes/Main.unity` (sudah berisi GameObject `KemudiSceneBootstrap`)
   lalu tekan **Play**. Scene boleh dibuat ulang lewat menu *Kemudi → Create Main Scene*
   (`Editor/KemudiSceneGenerator.cs`) — seluruh hierarki simulasi dibangun saat runtime.
4. Tidak perlu menempel komponen manual: `KemudiSceneBootstrap.Awake()` membuat
   SimulationManager, input, lintasan, kendaraan, walker, HUD, traffic, dan sistem XR.

## Alur simulasi (SIMULASI.md §5)

| # | Fase | Isi |
|---|---|---|
| 1 | `Selecting` | Pilih Motor/Mobil/Truk + Manual/Automatic (IMGUI desktop, world-space canvas di VR) |
| 2 | `Walking` | Pemain muncul di area parkir, berjalan kaki (`WalkingController`) dengan mouse look |
| 3 | `Entering` | Dekati kendaraan → tekan **[E]** → kamera pindah ke kabin (FPV) |
| 4 | `PreDrive` | Checklist pra-berkendara (`ChecklistManager` + `PreDriveChecklistController`) |
| 5 | `Driving` | Mesin menyala, lintasan ±916 m: lampu lalu lintas, zebra, obstacle, kendaraan AI |
| 6 | `Finished` / `Failed` | Skor 0–100, waktu, jumlah pelanggaran; hasil dikirim ke `POST /api/progress` |

## Kontrol keyboard

| Tombol | Aksi |
|---|---|
| W A S D / panah | Berjalan (fase Walking) / gas & setir (berkendara) |
| Shift | Lari (Walking) · kopling (Manual) |
| Mouse (klik kanan bila kursor bebas) / mouse terkunci | Lihat sekitar saat berjalan |
| E | Masuk kendaraan · gigi naik |
| Q | Gigi turun |
| I | Kontak/starter mesin (OFF → ACC → ON → START) |
| Space | Rem tangan |
| B · H J G F | Sabuk · helm/jaket/sarung/sepatu |
| `[` · `]` / M | Atur kursi · atur spion |
| C | Siklus kamera TPV → FPV → Top-Down |
| R | Ulangi setelah selesai/gagal · P pause |

## Komponen alur (fase `Walking`)

| File | Peran |
|---|---|
| `Scripts/Scene/WalkingController.cs` | Pergerakan pemain (CharacterController), mouse look, deteksi pintu, tombol [E] |
| `Scripts/Rules/PreDriveChecklistController.cs` | Mencentang item checklist dari aksi pengemudi (sabuk, helm, kursi, spion) |
| `Scripts/Core/SimulationManager.cs` | State machine Selecting → Walking → Entering → PreDrive → Driving → Finished/Failed |

## Build target

| Platform | Profile |
|---|---|
| Windows PC | Desktop |
| PC VR (OpenXR) | VR_PC |
| Meta Quest (standalone) | VR_Standalone (Android) |
