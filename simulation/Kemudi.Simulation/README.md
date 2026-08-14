# Kemudi.Simulation — Unity Project

Proyek Unity untuk simulasi mengemudi Kemudi.id (Motor, Mobil, Truk) dengan dukungan VR OpenXR.

> **Status: Scaffold.** Folder ini berisi struktur arsitektur + script C# inti siap impor ke Unity Editor.
>
> Panduan performa & arsitektur lengkap: [`docs/OPTIMASI_SIMULASI.md`](../../docs/OPTIMASI_SIMULASI.md)
> dan pemetaan input [`docs/VR_INPUT_MAP.md`](../../docs/VR_INPUT_MAP.md).
> Ini bukan project Unity yang bisa langsung di-build — folder `Assets/` belum memiliki `.meta`
> dan scene. Buka Unity Hub → *Add project from disk* → pilih folder ini, lalu Unity akan
> membuat `.meta` dan Anda bisa membangun scene pertama dari `Scenes/` (lihat bagian "Cara mulai").

## Struktur

```
Assets/
├── Scenes/                  # Main.unity (dibuat otomatis via menu Kemudi)
├── Scripts/
│   ├── Scene/
│   │   ├── KemudiSceneBootstrap.cs   # 🎬 Bangun scene #1 penuh saat runtime
│   │   ├── MainMenuUI.cs             # Layar pilih kendaraan + transmisi
│   │   └── SceneHud.cs               # HUD checklist/speed/gear + layar hasil
│   ├── Core/
│   │   ├── SimulationManager.cs       # Orkestrator fase (PreDrive default, walking opsional)
│   │   ├── SimulationResultReporter.cs # Kirim hasil ke Kemudi.Api (§61-62)
│   │   └── ObjectPool.cs              # Pooling generik (traffic, pedestrian, efek)
│   ├── Input/
│   │   ├── VehicleInputState.cs       # Struktur input universal (satu sumber kebenaran)
│   │   ├── UniversalInputSystem.cs    # Abstraction layer semua sumber input
│   │   ├── KeyboardInputProvider.cs   # Provider keyboard (mapping §67 + checklist B/H/J/G/F)
│   │   └── XRInputProvider.cs         # Provider VR controller (mapping universal §31)
│   ├── Vehicles/
│   │   ├── VehicleConfig.cs           # Data-driven konfigurasi kendaraan (scriptable object)
│   │   ├── VehicleController.cs       # Orkestrator kendaraan (bukan monolith!)
│   │   └── VehiclePhysics.cs          # Fisika Rigidbody (FixedUpdate)
│   ├── Transmission/
│   │   ├── EngineController.cs
│   │   ├── ManualTransmissionController.cs
│   │   └── AutomaticTransmissionController.cs
│   ├── Traffic/
│   │   ├── TrafficManager.cs          # Pooled traffic, budget kualitas, update 5-10 Hz
│   │   ├── TrafficVehicle.cs          # AI waypoint sederhana (berhenti lampu merah)
│   │   └── TrafficLightController.cs  # State machine GREEN/YELLOW/RED
│   ├── Environment/
│   │   ├── TrackBuilder.cs            # 1 road mesh + 1 collider + trigger zone (§18, §74)
│   │   ├── PedestrianManager.cs       # 1 pejalan kaki/zebra, pooling, 5 Hz
│   │   └── Pedestrian.cs              # State WAIT/CROSS/FINISH (MoveTowards)
│   ├── Rules/
│   │   ├── ChecklistManager.cs        # Checklist pra-jalan per kendaraan/transmisi
│   │   ├── TriggerZones.cs            # Deteksi aturan berbasis trigger (event-driven)
│   │   ├── ViolationSystem.cs         # Deteksi & pencatatan pelanggaran (terpisah)
│   │   └── ScoringSystem.cs           # Skor 0-100 dengan konfigurasi bobot
│   ├── Camera/
│   │   └── CameraManager.cs           # FPV / TPV (top-down hanya debug)
│   ├── UI/
│   │   ├── HudController.cs           # Canvas HUD, update 5-10 Hz, warning event
│   │   └── VehicleTuningPanel.cs      # Panel handling §44 (4 slider release, debug = lengkap)
│   ├── Performance/
│   │   └── PerformanceManager.cs      # Preset LOW/MEDIUM/HIGH + adaptive FPS
│   ├── Debug/
│   │   └── DebugOverlay.cs            # Overlay FPS/stats, hanya Development Build
│   ├── XR/
│   │   ├── XRManager.cs               # Inisialisasi OpenXR & rig
│   │   ├── XRComfortSystem.cs         # Vignette anti motion sickness
│   │   ├── XRDashboard.cs             # Dashboard world-space
│   │   └── HandTrackingManager.cs     # Hand tracking default OFF (§32)
│   └── Audio/
│       └── VehicleAudioSystem.cs      # Clip + crossfade mengikuti RPM (§41)
├── Editor/
│   └── KemudiSceneGenerator.cs       # Menu: Kemudi → Create Main Scene
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

## Cara mulai — Scene #1 (PHASE 4-5)

1. Unity Hub → *Add project from disk* → pilih `simulation/Kemudi.Simulation`.
   (Gunakan Unity 6 / 2022.3+ dengan modul **Android Build Support** untuk Quest.)
2. Install paket via Package Manager: `com.unity.xr.openxr`,
   `com.unity.inputsystem`, `com.unity.xr.interaction.toolkit` (opsional).
3. Menu **Kemudi → Create Main Scene** — otomatis membuat `Assets/Scenes/Main.unity`
   berisi `KemudiSceneBootstrap`.
4. Tekan **Play**. Scene #1 langsung jalan: layar pilih kendaraan
   (Motor/Mobil/Truk + Manual/Automatic) → checklist pra-jalan → mengemudi →
   finish. Semua dibangun dari kode: manager, input, track (1 mesh + collider),
   kendaraan, kamera, lampu, ground.

   Scene #1 sudah dilengkapi lalu lintas (§36-39):
   - **Traffic light** di jalan lurus pertama (stop line z=36) — menerobos
     lampu merah = pelanggaran (`TrafficLightZone`).
   - **Kendaraan AI** (`TrafficManager`, 3 unit, pool, update 5-10 Hz) yang
     berhenti di lampu merah — menabraknya = tabrakan fisik biasa.
   - **Zebra cross + pejalan kaki** di jalan lurus terakhir (x=160) — tidak
     memberi jalan saat menyeberang = pelanggaran (`CrosswalkZone`), dan
     menabrak pejalan kaki = langsung gagal (`PedestrianCollisionWatcher`).
   - **Rintangan lintasan** (cone slalom, water barrier, kendaraan parkir) —
     layout CELAH LEBAR agar konsisten dengan web yang sudah diperlonggar
     (`TrackObstacleBuilder`): cone di tepi jalan (±4,2 m), barrier melintang
     di tepi (±4,5 m, panjang 2,8 m → celah tengah ±6 m), kendaraan parkir di
     bahu (±4,2 m). Menabrak rintangan = 1 hit `ObstacleHit` per objek per
     percobaan, penalti skor ringan **-3 poin** (konsisten dengan web;
     `ObstacleCollisionWatcher` → obstacleHits di laporan §62).

   > **Keterbatasan scaffold:** kendaraan AI bersifat kinematic sehingga
   > "menembus" pejalan kaki (tanpa tabrakan fisik). Deteksi tabrakan hanya
   > berlaku untuk kendaraan pemain.
5. Alternatif: buat scene kosong sendiri lalu tempel `KemudiSceneBootstrap`.

Setelah Play: mesin [I], rem tangan [Space], sabuk [B], kursi `[`, spion `]`,
W/A/S/D gas/setir/rem, [C] kamera, [P] pause, [R] ulang dari layar hasil.

## Build target

| Platform | Profile |
|---|---|
| Windows PC | Desktop |
| PC VR (OpenXR) | VR_PC |
| Meta Quest (standalone) | VR_Standalone (Android) |
