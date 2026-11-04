# Kemudi.Simulation — Unity Project

Proyek Unity untuk simulasi mengemudi Kemudi.id (Motor, Mobil, Truk) dengan dukungan VR OpenXR.

> **Status: Scaffold.** Folder ini berisi struktur arsitektur + script C# inti siap impor ke Unity Editor.
> Ini bukan project Unity yang bisa langsung di-build — folder `Assets/` belum memiliki `.meta`
> dan scene. Buka Unity Hub → *Add project from disk* → pilih folder ini, lalu Unity akan
> membuat `.meta` dan Anda bisa membangun scene pertama dari `Scenes/` (lihat bagian "Cara mulai").

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
2. Install paket via Package Manager:
   - `com.unity.xr.openxr` (OpenXR Plugin)
   - `com.unity.inputsystem` (Input System)
   - `com.unity.xr.interaction.toolkit` (opsional, untuk interaksi XR)
3. Buat scene kosong, tempel `SimulationManager` pada GameObject kosong.
4. Tempel `UniversalInputSystem`, lalu pasang `KeyboardInputProvider`.
5. Tempel `VehicleController` + `VehiclePhysics` pada GameObject kendaraan,
   buat `VehicleConfig` via menu *Assets → Create → Kemudi → Vehicle Config*.
6. Bangun scene mengikuti alur: Selecting → Walking → Pre-Drive Checklist → Driving → Finished/Failed.

## Build target

| Platform | Profile |
|---|---|
| Windows PC | Desktop |
| PC VR (OpenXR) | VR_PC |
| Meta Quest (standalone) | VR_Standalone (Android) |
