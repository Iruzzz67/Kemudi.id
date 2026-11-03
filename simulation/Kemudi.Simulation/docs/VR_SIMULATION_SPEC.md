# KEMUDI.ID — SPESIFIKASI SIMULASI VR UNITY

> Dokumen ini adalah spesifikasi lengkap simulasi VR Kemudi.id menggunakan **Unity + C# + OpenXR**.
>
> Tujuan utama: simulasi mengemudi (Motor, Mobil, Truk) berjalan stabil pada **PC VR** dan **Meta Quest standalone** dengan performa optimal, input universal, dan integrasi penuh ke website Kemudi.id melalui API.

---

## 1. Dasar Project

Project simulasi Kemudi.id terdiri dari:

1. **Simulasi Unity**:
   - Motor, mobil, truk
   - Fisika kendaraan (Rigidbody-based)
   - Track jalan raya (Kota Bogor, ±916 m)
   - Rintangan (cone, barrier, kendaraan parkir, pothole)
   - Traffic light (state machine)
   - Pejalan kaki (zebra cross)
   - HUD / Dashboard
   - Checklist pra-jalan
   - Audio engine
   - VR/XR (OpenXR)
   - Keyboard, gamepad, VR controller

2. **Integrasi Website**:
   - Hasil simulasi dikirim ke API (`POST /api/progress`)
   - Token JWT dari website (Blazor) disisipkan ke Unity
   - Skor divalidasi server

3. **Target Platform**:
   - Windows PC (desktop + PC VR)
   - Meta Quest 2/3/Pro (standalone VR)
   - Perangkat OpenXR kompatibel lainnya

Dokumentasi ini mendefinisikan seluruh spesifikasi teknis, optimasi, dan workflow untuk mencapai target VR yang stabil.

---

# 2. TARGET AKHIR

## 2.1 Simulasi

Gunakan:

- **Unity 6 / 2022.3 LTS**
- **C#**
- **Unity Input System** (1.14.0+)
- **OpenXR** (1.14.3+)
- **XR Interaction Toolkit** (2.6.4+, opsional)
- **Rigidbody / physics Unity**
- **URP** (Universal Render Pipeline)
- **ScriptableObject** untuk konfigurasi kendaraan
- **TextMeshPro** untuk UI VR
- **TextMeshPro** untuk dashboard

Tidak digunakan sebagai engine simulasi:

- Three.js
- React Three Fiber (R3F)
- Rapier physics
- WebAudio procedural
- WebGL DOM HUD

## 2.2 Website (referensi)

Gunakan:

- ASP.NET Core + Blazor
- Entity Framework Core
- ASP.NET Core Identity
- SQL Server atau SQLite
- C# + Razor Components

---

# 3. ARSITEKTUR SIMULASI

```text
Kemudi.Simulation
│
├── Core
│   ├── SimulationManager.cs
│   ├── SimulationResultReporter.cs
│   ├── ObjectPool.cs
│   └── WebGlBridge.cs
│
├── Vehicles
│   ├── VehicleConfig.cs (ScriptableObject)
│   ├── VehicleController.cs
│   └── VehiclePhysics.cs
│
├── Input
│   ├── VehicleInputState.cs
│   ├── UniversalInputSystem.cs
│   ├── KeyboardInputProvider.cs
│   └── XRInputProvider.cs
│
├── XR
│   ├── XRManager.cs
│   ├── XRComfortSystem.cs
│   ├── XRDashboard.cs
│   └── HandTrackingManager.cs
│
├── Traffic
│   ├── TrafficManager.cs
│   ├── TrafficVehicle.cs
│   └── TrafficLightController.cs
│
├── Environment
│   ├── TrackBuilder.cs
│   ├── TrackObstacleBuilder.cs
│   ├── PedestrianManager.cs
│   └── Pedestrian.cs
│
├── Rules
│   ├── ChecklistManager.cs
│   ├── TriggerZones.cs
│   ├── ViolationSystem.cs
│   └── ScoringSystem.cs
│
├── Camera
│   └── CameraManager.cs
│
├── UI
│   ├── HudController.cs
│   └── VehicleTuningPanel.cs
│
├── Performance
│   └── PerformanceManager.cs
│
├── Audio
│   └── VehicleAudioSystem.cs
│
├── Debug
│   └── DebugOverlay.cs
│
└── Scene
    ├── KemudiSceneBootstrap.cs
    ├── MainMenuUI.cs
    └── SceneHud.cs
```

---

# 4. STRUKTUR REPOSITORY

```text
simulation/Kemudi.Simulation/
│
├── Assets/
│   ├── Scenes/
│   │   └── Main.unity
│   │
│   ├── Scripts/
│   │   ├── Core/
│   │   ├── Vehicles/
│   │   ├── Input/
│   │   ├── XR/
│   │   ├── Traffic/
│   │   ├── Environment/
│   │   ├── Rules/
│   │   ├── Camera/
│   │   ├── UI/
│   │   ├── Performance/
│   │   ├── Audio/
│   │   ├── Debug/
│   │   └── Scene/
│   │
│   ├── Editor/
│   │   ├── KemudiSceneGenerator.cs
│   │   ├── KemudiWebGlBuilder.cs
│   │   └── KemudiVRBuilder.cs
│   │
│   ├── Settings/
│   │   └── XRInputActions.inputactions
│   │
│   ├── WebGLTemplates/
│   │   └── Kemudi/
│   │       └── index.html
│   │
│   ├── Models/
│   ├── Materials/
│   ├── Prefabs/
│   └── Audio/
│
├── Packages/
│   └── manifest.json
│
├── ProjectSettings/
│
└── docs/
    ├── VR_SETUP.md
    ├── VR_INPUT_MAP.md
    └── VR_SIMULATION_SPEC.md
```

---

# 5. PEMETAAN TEKNOLOGI LAMA → BARU

| Lama | Baru |
|---|---|
| Three.js | Unity |
| React Three Fiber | Unity Scene/GameObject |
| Rapier | Unity Physics (Rigidbody) |
| WebXR | OpenXR |
| `useFrame` | `Update` / `FixedUpdate` / `LateUpdate` |
| GLB loader | Unity-imported FBX/GLB |
| WebAudio | Unity AudioSource/AudioMixer |
| Web DOM HUD | Unity Canvas (World/Screen Space) |
| `localStorage` | Database/API + PlayerPrefs |
| `lib/vehicles.ts` | `VehicleConfig.cs` (ScriptableObject) |
| `vehicleDynamics.ts` | `VehiclePhysics.cs` |
| `transmission.ts` | `TransmissionController.cs` |
| `engine.ts` | `EngineController.cs` |
| `simStore.ts` | `SimulationManager.cs` (Phase state) |
| `KeyboardInput.ts` | `KeyboardInputProvider.cs` |
| `XRInputAdapter.ts` | `XRInputProvider.cs` (OpenXR) |
| `obstacles.ts` | Unity Collider + layer/culling |
| `track.ts` | `TrackBuilder.cs` (mesh + collider) |
| `Hud.tsx` | Unity Canvas + TextMeshPro |
| `lib/scenery.ts` | `BuildScenery()` in `KemudiSceneBootstrap.cs` |
| `lib/track.ts` waypoints | `BuildRoute()` in `KemudiSceneBootstrap.cs` |

---

# 6. CORE SIMULATION

## 6.1 SimulationManager

```text
SimulationManager
│
├── VehicleManager (VehicleController → VehiclePhysics → Rigidbody)
├── InputManager (UniversalInputSystem)
├── TrafficManager (waypoint, 5-10 Hz)
├── RuleManager (TriggerZone event-driven)
├── ScoreManager (ViolationSystem → ScoringSystem)
├── CameraManager (FPV/TPV/VR)
├── XRManager (OpenXR, VR rig, comfort)
├── AudioManager (clip + crossfade)
└── UIManager (HUD 5-10 Hz)
```

Jangan membuat satu script raksasa yang mengontrol semuanya.

## 6.2 Fase Simulasi

```text
Default:  Selecting → PreDrive → Driving → Finished/Failed
Opsional: Selecting → Walking → Entering → PreDrive → Driving → Finished/Failed
```

Walking mode **default OFF** karena menambah karakter 3D, animasi, collision, dan kamera ekstra.

---

# 7. VEHICLE SYSTEM

## 7.1 VehicleConfig

Gunakan ScriptableObject:

```text
VehicleConfig
├── Type (Motor/Mobil/Truk)
├── Label
├── Mass
├── Length, Width, Height
├── WheelBase, TrackWidth
├── MaxSpeed (70 km/j = 19.44 m/s)
├── ReverseMaxSpeed
├── Acceleration
├── BrakeForce
├── HandbrakeForce
├── MaxSteerAngle
├── SteerRate
├── ReturnRate
├── TireGrip
├── CenterOfMassY
├── SpeedSteerFalloff
├── EngineIdleRpm
├── EngineRedlineRpm
├── GearRatios[]
├── FrontGrip
└── RearGrip
```

## 7.2 Tiga Kendaraan

```text
Motor
├── Mass: 180 kg
├── MaxSpeed: 70 km/j
├── Gears: 3
└── Checklist: Helm, Jaket, Sarung Tangan, Sepatu

Mobil
├── Mass: 1300 kg
├── MaxSpeed: 70 km/j
├── Gears: 5
└── Checklist: Kursi, Spion, Sabuk

Truk
├── Mass: 5500 kg
├── MaxSpeed: 70 km/j
├── Gears: 5
└── Checklist: Kursi, Spion, Sabuk
```

---

# 8. FISIKA KENDARAAN

## 8.1 Arsitektur

```text
VehicleController
       ↓
VehiclePhysics
       ↓
Rigidbody
       ↓
Wheel/Vehicle Visual
```

## 8.2 Prinsip

### Physics (FixedUpdate)

- Rigidbody
- velocity
- steering
- braking
- acceleration
- gravity
- friction
- drag

### Visual (LateUpdate)

- wheel rotation
- steering wheel
- body lean
- suspension animation
- dashboard

Visual **tidak boleh** mengendalikan physics utama.

## 8.3 FixedUpdate

```csharp
void FixedUpdate()
{
    ReadPhysicsInput();
    CalculateEngineForce();
    CalculateSteering();
    CalculateBrake();
    ApplyDrag();
    ApplyLateralDamping();
}
```

- `FixedUpdate()` untuk physics (50 Hz)
- `Update()` untuk input/UI non-physics
- `LateUpdate()` untuk kamera

Jangan menghitung physics utama di `Update()`.

---

# 9. OPTIMASI FISIKA

## HAPUS

Jangan mempertahankan:

- 8 substep collision per frame
- kalkulasi collision manual setiap frame jika Unity Collider sudah cukup
- perhitungan grip yang terlalu kompleks
- kalkulasi suspension visual yang tidak terlihat
- physics untuk objek dekorasi
- Rigidbody pada pohon, rumah, tiang, papan, dan dekorasi

## TARGET

```text
Vehicle physics:    50 Hz (FixedUpdate)
Visual:             30-90 FPS
AI traffic:         5-10 Hz
Pedestrian:         5 Hz atau event-based
HUD:                5-10 Hz
Audio RPM:          20-30 Hz
```

---

# 10. COLLISION LAYER

Gunakan collision matrix:

```text
Vehicle
├── Road
├── SolidObstacle
├── TrafficVehicle
└── Pedestrian

Decoration
└── Tidak collision

Trigger
└── Rule detection
```

Dekorasi **tidak perlu** collider.

Collider hanya digunakan untuk:

- kendaraan
- barrier
- cone (jika diperlukan)
- obstacle penting
- trigger rambu
- trigger zebra cross
- finish
- area jalan

---

# 11. TRACK

## 11.1 Implementasi

Track lama menggunakan CatmullRomCurve3 dengan 1600 sample.

Dalam Unity, **jangan membuat track dengan 1600 GameObject**.

Gunakan:

```text
1 road mesh (TrackBuilder.cs)
+
1 road collider (MeshCollider, static)
+
trigger zones
```

Target:

```text
Road segments: 50-150
```

Atau satu mesh gabungan untuk track utama.

## 11.2 Rute

Lintasan map ala Kota Bogor (±916 m, finish di z = -900):

```text
Start Area (z=16)
→ Kota 1 (z=-60..-180, lampu -75, zebra -150)
→ S-Curve (-180..-300)
→ Permukiman (-300..-430, zebra -390)
→ Obstacle Zone (-430..-520, truk -495, lubang -510)
→ Tanjakan (-520..-620)
→ Kota 2 (-620..-760, lampu -650, halte -675)
→ Berkelok (-760..-850)
→ Finish (lurus z=-900)
```

## 11.3 Track LOD

```text
LOD 0:  0-30 m    Detail tinggi
LOD 1:  30-100 m  Detail sedang
LOD 2:  100-250 m Detail rendah
>250 m: Cull / tidak dirender
```

Untuk VR standalone, gunakan jarak yang lebih agresif.

---

# 12. OCCLUSION CULLING

Gunakan:

- Frustum culling
- LOD Group
- Static batching

Jangan render seluruh kota secara detail sekaligus.

---

# 13. SISTEM RINTANGAN

## 13.1 Daftar Rintangan

Dokumentasi lama memiliki cone, water barrier, project barrier, pole, pothole, kendaraan parkir, bus, dan objek kota.

### Tetap

- Cone (slalom, ±4.2 m dari center)
- Water barrier (±4.5 m, celah tengah ±6 m)
- Kendaraan parkir penting (±4.2 m)
- Pothole trigger (visual, z=-508..-516)
- Zebra crossing (3 lokasi: z=-150, -390, -850)
- Traffic light (2 lokasi: z=-75, -650)

### Kurangi

- jumlah kendaraan parkir
- jumlah cone
- detail vendor
- detail rumah
- detail toko
- detail pohon
- detail tiang

### Hapus dari collision

- rumah
- pohon
- lampu jalan
- papan informasi
- dekorasi

## 13.2 Layout Celah Lebar

Semua rintangan diimplementasikan dengan celah lebar agar pemain jarang kena penalti:

```text
Cone slalom:        ±4.2 m dari center
Water barrier:      ±4.5 m, celah tengah ±6 m
Kendaraan parkir:   ±4.2 m
Tiang pembatas:     ±5.1 m
```

Implementasi: `TrackObstacleBuilder` (layout) + `ObstacleCollisionWatcher` (hit → `ObstacleHit`, penalti ringan −3 poin).

---

# 14. VEGETASI & KOTA

## 14.1 Vegetasi

Jangan membuat:

```text
1000 pohon = 1000 GameObject
```

Gunakan:

- GPU instancing
- terrain/detail system
- static mesh
- LOD
- tanpa collider

Target awal:

```text
20-80 visual tree instance aktif
```

## 14.2 Kota

Kota tidak perlu menjadi kota penuh.

Gunakan sistem:

```text
Road
├── Building A (box primitive + roof)
├── Building B
├── Tree Group
├── Lamp Group
└── Vehicle Group
```

Gunakan prefab yang sama berkali-kali. Jangan menggunakan banyak mesh unik.

---

# 15. MATERIAL

## 15.1 Target Material

```text
Opaque + Simple Lit (URP)
```

Hindari:

- material transparan berlebihan
- shader kompleks
- parallax
- tessellation
- realtime reflection
- shader graph berat
- efek screen-space berlebihan

## 15.2 Texture Optimization

```text
Aset utama:  1024x1024
Aset kecil:  256x256 / 512x512
```

Jangan menggunakan texture 4K kecuali benar-benar diperlukan.

## 15.3 Model 3D

Prioritas optimasi:

```text
1. Polygon count
2. Material count
3. Texture resolution
4. Mesh count
5. Bone count
6. Animation count
```

Target kendaraan:

```text
Desktop:     20k-60k triangles
Quest:       10k-30k triangles per kendaraan
```

## 15.4 Material Kendaraan

Jangan:

```text
1 material per bagian kecil
```

Gunakan material sesedikit mungkin:

```text
Vehicle body
Glass
Rubber
Interior
Lights
```

---

# 16. SHADOW

Ini salah satu bagian yang harus dipotong agresif.

## Jangan gunakan

- banyak realtime shadow caster
- shadow dari semua pohon
- shadow dari semua kendaraan
- point light realtime dalam jumlah banyak

## Gunakan

- satu directional light utama
- baked/mixed lighting bila sesuai
- shadow distance pendek
- shadow resolution sedang/rendah di standalone VR

---

# 17. LIGHTING

Target:

```text
1 Directional Light
+
Ambient Lighting
+
Light Probe terbatas
```

Lampu jalan tidak perlu benar-benar menerangi seluruh jalan.

Visual lampu dibuat sebagai:

```text
emissive material
```

tanpa lampu realtime.

---

# 18. POST PROCESSING

Untuk VR standalone:

## HAPUS DEFAULT

- motion blur
- depth of field
- chromatic aberration
- film grain
- heavy bloom
- screen-space reflection
- vignette yang tidak diperlukan

VR lebih membutuhkan frame rate stabil daripada efek sinematik.

---

# 19. VR SYSTEM

## 19.1 Arsitektur VR

```text
XRManager
├── Deteksi OpenXR device
├── Setup XR Origin rig
├── Register XRInputProvider
├── Mode switching (Desktop/VR)
├── Vehicle target follow
│
├── XRComfortSystem
│   ├── FOV dynamic (anti motion sickness)
│   ├── Vignette edge blur
│   └── Comfort modes (Normal/Comfort/Advanced)
│
├── XRDashboard
│   ├── Speed display
│   ├── Gear indicator
│   ├── RPM bar
│   ├── Lamp/turn signal indicators
│   ├── Warning text
│   └── Timer
│
└── HandTrackingManager
    └── Default OFF (opsional)
```

## 19.2 VR Rig

```text
XR Rig (XRManager)
├── Camera Offset
│   └── Main Camera (VR headset tracking)
│
└── Position: kursi pengemudi + seat offset
```

Fallback: `XRManager` membuat rig otomatis jika XR Origin prefab belum di-assign.

## 19.3 Mode Switching

```text
IsVrSupported()?
├── YES → VR Mode
│   ├── Aktifkan XR rig
│   ├── Register XRInputProvider
│   ├── Aktifkan comfort system
│   ├── Aktifkan dashboard
│   └── Head tracking bypass
│
└── NO → Desktop Mode
    ├── Aktifkan desktop camera rig
    ├── Register KeyboardInputProvider
    └── TPV/FPV camera
```

---

# 20. VR CONTROLLER MAP

## 20.1 Mapping Universal

```text
Left Stick X      = Steering
Left Stick Y      = Optional walking/camera (diabaikan saat driving)
Right Stick       = Camera (siklus TPV ↔ FPV)
A                 = Action / Enter / Confirm
B                 = Cancel / Exit
X                 = Gear Down
Y                 = Gear Up
Trigger (Right)   = Gas / Throttle
Grip (Right)      = Brake
Menu              = Pause
```

## 20.2 Quest Controller

```text
Left Stick (Kiri X)     = Steering
Right Stick (Kanan)     = Camera
Right Trigger           = Gas
Right Grip              = Rem
A Button (Kanan)        = Action/Enter
B Button (Kanan)        = Cancel/Exit
X Button (Kiri)         = Gear Down
Y Button (Kiri)         = Gear Up
Menu Button (Kiri)      = Pause
```

## 20.3 Checklist Items (VR)

```text
A (hold)        = Sabuk (Mobil/Truk)
X (hold)        = Helm (Motor)
Y (hold)        = Jaket (Motor)
B (hold)        = Sarung tangan (Motor)
Grip (hold)     = Sepatu (Motor)
```

Mapping dapat dikonfigurasi berdasarkan controller melalui Unity Input System.

**Jangan mengunci** simulasi pada satu merek headset.

---

# 21. HAND TRACKING

## DEFAULT

```text
OFF
```

## OPTIONAL

```text
User mengaktifkan Hand Tracking
        ↓
Check device support (XRHandSubsystem)
        ↓
Enable hand input
```

Alasan:

Hand tracking menambah CPU/GPU dan tidak tersedia secara seragam pada semua perangkat.

---

# 22. VR COMFORT

Tetap gunakan:

- fixed seating
- smooth turning yang dapat diatur
- snap turn opsional
- FOV dynamic saat akselerasi/menikung
- vignette ringan jika diperlukan
- horizon stabil
- camera tidak berguncang berlebihan

Jangan menggunakan efek kamera yang menyebabkan motion sickness.

## XRComfortSystem

```text
Mode: Normal / Comfort / Advanced

Normal:   FOV dynamic + vignette ringan
Comfort:  FOV dynamic + vignette kuat (default)
Advanced: Full manual control (user atur sendiri)
```

---

# 23. KAMERA

## 23.1 Mode

```text
FPV     = First-person view (in-cabin)
TPV     = Third-person view (behind vehicle)
VR      = Head tracking bypass (XR headset)
TopDown = Debug only (Development Build)
```

## 23.2 VR Camera

```text
VR Mode:
├── Posisi: kursi pengemudi + seat offset
├── Rotasi: XR headset tracking
├── Smooth follow: kendaraan
└── TPV/FPV diabaikan (head tracking mengambil alih)
```

## 23.3 Top-down

Default: **DISABLED** untuk user.

Hanya aktif sebagai debug mode (`Debug.isDebugBuild`).

---

# 24. WALKING MODE

### Default

```text
DISABLED
```

### Optional

```text
Settings → Immersive Entry → ON
```

Jika ON:

```text
Character → Walk → Enter vehicle → Driving
```

Jika OFF:

```text
Vehicle Select → PreDrive → Driving
```

Ini mengurangi beban simulasi pada perangkat rendah.

---

# 25. TRAFFIC AI

## 25.1 Implementasi

Jangan membuat AI kendaraan kompleks.

Gunakan waypoint sederhana:

```text
TrafficVehicle → MoveTowards(nextWaypoint)
```

Update AI:

```text
5-10 kali/detik (bukan setiap frame)
```

## 25.2 Jumlah Traffic

```text
VR standalone:  3-8 kendaraan aktif
Desktop:        8-20 kendaraan
```

Jika FPS turun: kurangi jumlah traffic.

## 25.3 Traffic Light

Gunakan state machine:

```text
GREEN → YELLOW → RED
```

Tidak perlu animasi kompleks.

Satu controller dapat mengontrol seluruh lampu persimpangan.

---

# 26. PEDESTRIAN

Dokumentasi lama memiliki pedestrian di tiga zebra cross.

Untuk versi ringan:

```text
1 pedestrian aktif per crossing
```

Tidak perlu sistem AI pedestrian penuh.

State:

```text
WAIT → CROSS → FINISH
```

Movement:

```text
Vector3.MoveTowards
```

bukan pathfinding kompleks.

---

# 27. AUDIO

## 27.1 Struktur Audio

```text
VehicleAudioSystem
├── Idle clip
├── Low RPM clip
├── High RPM clip
├── Brake sound
├── Horn
└── Indicator tick
```

## 27.2 Engine Audio

Jangan membuat synthesizer CPU-heavy.

Gunakan:

```text
3-4 audio clips
+
pitch (mengikuti RPM)
+
volume
+
crossfade
```

## 27.3 Audio Mixer

Gunakan AudioMixer untuk kategori:

```text
Engine
Environment
UI
```

## 27.4 Kurangi

- banyak audio source
- spatial audio untuk objek jauh
- loop audio lingkungan yang tidak diperlukan

---

# 28. HUD

## 28.1 Desktop HUD

```text
Canvas (Screen Space)
├── Speed
├── Gear
├── RPM
├── Engine status
├── Handbrake
├── Turn Signal
├── Headlight
├── Timer
├── Score
├── Violations
└── Warning
```

## 28.2 VR Dashboard

```text
Canvas (World Space, 0.45m x 0.25m)
├── Speed (digit besar)
├── Gear (P/R/N/1/2/3/4/5)
├── RPM bar (Image fillAmount)
├── Indicators (headlight, high beam, hazard, turn L/R, handbrake)
├── Warning text
└── Timer
```

## 28.3 Update Interval

Jangan update seluruh UI setiap frame.

Gunakan:

```text
HUD:        5-10 Hz
Dashboard:  5-10 Hz
Warning:    Event-driven
Score:      Event-driven
```

---

# 29. CHECKLIST

## 29.1 Semua Kendaraan

- Masuk kendaraan
- Tutup pintu
- Nyalakan mesin
- Lepaskan rem tangan

## 29.2 Motor

- Helm (tombol H)
- Jaket (tombol J)
- Sarung tangan (tombol G)
- Sepatu (tombol F)

## 29.3 Mobil/Truk

- Kursi (tombol `[`)
- Spion (tombol `]`)
- Sabuk (tombol B)

## 29.4 Manual

- Kopling (tombol Shift)
- Gigi satu (otomatis terdeteksi)

---

# 30. HANDLING SETTINGS

## Release Mode

Tampilkan hanya:

```text
Steering
Brake
Acceleration
Grip
```

## Debug Mode

Baru tampilkan:

```text
Steering Angle
Steering Speed
Return Speed
Grip
Rear Grip
Suspension
Center of Mass
Downforce
Angular Drag
```

Jangan membuka 15+ parameter kepada user biasa.

---

# 31. SCORING

Pertahankan:

```text
Score = 100
```

Kurangi karena:

| Pelanggaran | Penalti |
|---|---|
| Traffic violation (lampu merah, zebra) | −8 poin |
| Off-road | −5 poin per kali |
| Collision (tabrakan) | −12 poin |
| Obstacle hit | −3 poin |
| Waktu berlebih (par 120 detik) | −1 poin per detik |

Gunakan sistem:

```text
ViolationSystem (deteksi)
        ↓
ScoringSystem (pencatatan)
        ↓
SimulationResult
```

---

# 32. EVENT-DRIVEN RULE SYSTEM

Jangan melakukan semua pengecekan setiap frame.

Buruk:

```text
Every frame:
    Check every pedestrian
    Check every traffic light
    Check every obstacle
    Check every rule
```

Gunakan trigger:

```text
OnEnterCrosswalk
OnEnterTrafficLightZone
OnCollisionObstacle
OnEnterFinish
OnVehicleStopped
OnPedestrianCollision → langsung gagal
```

Ini jauh lebih ringan.

---

# 33. OBJECT POOLING

Gunakan pooling untuk:

- traffic vehicle
- pedestrian
- temporary warning
- particles
- effects

Jangan:

```text
Instantiate() → Destroy() → Instantiate() → Destroy()
```

berulang selama gameplay.

---

# 34. PARTICLES

Potong:

- smoke berlebihan
- sparks berlebihan
- dust besar
- rain particle dalam jumlah tinggi

Target:

```text
particle count rendah
```

dan hanya aktif ketika diperlukan.

---

# 35. FITUR YANG HARUS DI-CUT

Untuk release ringan, hapus atau nonaktifkan:

```text
❌ Walking mode sebagai default
❌ Hand tracking sebagai default
❌ Full pedestrian AI
❌ Complex traffic AI
❌ 8 physics substeps
❌ 1600 track sample objects
❌ Top-down camera untuk user
❌ Dynamic weather (hujan, salju, kabut)
❌ Heavy post-processing
❌ Realtime reflection
❌ Banyak realtime lights
❌ Decoration collision
❌ Banyak parked vehicles
❌ High-density particles
❌ 4K texture
❌ Banyak material unik
❌ Procedural engine synthesizer kompleks
❌ GPS 3D kompleks
❌ Multiplayer
❌ Cuaca dinamis
❌ Ideal line (default OFF)
```

---

# 36. FITUR YANG WAJIB DIPERTAHANKAN

```text
✅ Motor
✅ Mobil
✅ Truk
✅ Automatic
✅ Manual
✅ Steering
✅ Gas
✅ Brake
✅ Clutch
✅ Gear
✅ Handbrake
✅ Engine
✅ Traffic light
✅ Zebra crossing
✅ Basic pedestrian rule
✅ Basic obstacles
✅ Off-road detection
✅ Collision
✅ Score
✅ Timer
✅ Checklist
✅ FPV
✅ TPV
✅ VR controller
✅ Keyboard
✅ Gamepad
✅ OpenXR
✅ VR Dashboard
✅ Audio dasar
✅ Scenery lingkungan
✅ Rintangan lintasan
✅ 3 zebra cross + pedestrian
✅ 2 traffic light
✅ Traffic AI (3-8 kendaraan)
```

---

# 37. INPUT UNIVERSAL

Input harus selalu melewati:

```text
Keyboard ─────┐
Gamepad ──────┤
VR Controller─┤  →  UniversalInputSystem → VehicleInputState → VehicleController → VehiclePhysics
Wheel ────────┤
Hand Tracking─┘
```

`VehicleController` tidak boleh mengetahui apakah input berasal dari keyboard atau VR.

---

# 38. CONTOH INPUT STATE

```csharp
public struct VehicleInputState
{
    // Analog
    public float Steering;
    public float Throttle;
    public float Brake;
    public float Clutch;

    // Diskrit (edge)
    public bool HandbrakePressed;
    public bool GearUp;
    public bool GearDown;
    public bool ReverseRequested;
    public bool NeutralRequested;
    public bool CameraCycle;
    public bool Pause;
    public bool Ignition;

    // Saklar
    public bool HeadlightToggle;
    public bool HighBeamToggle;
    public bool HazardToggle;
    public bool TurnSignalLeft;
    public bool TurnSignalRight;
    public bool HornHeld;

    // Checklist
    public bool ToggleSeatbelt;
    public bool ToggleHelmet;
    public bool ToggleJacket;
    public bool ToggleGloves;
    public bool ToggleBoots;
    public bool AdjustSeat;
    public bool AdjustMirrors;
}
```

---

# 39. KONTROL KEYBOARD

Pertahankan mapping utama:

```text
W / ↑       Gas
S / ↓       Rem
A / ←       Belok kiri
D / →       Belok kanan
Shift       Kopling
I           Engine
Q / ,       Gear Down
E / .       Gear Up
N           Neutral
R           Reverse
Space       Handbrake
Z           Sein kiri
X           Sein kanan
V           Hazard
T           Horn
L           Lampu
K           High Beam
C           Camera
P           Pause
B           Seatbelt
H           Helmet
J           Jacket
G           Gloves
F           Boots
[           Atur kursi
]           Atur spion
```

---

# 40. MANUAL TRANSMISSION

```text
Clutch → Gear Change → RPM / Gear Ratio → Engine Force
```

Stall tetap dipertahankan:

```text
if clutchMistakeCount >= 3
    StallEngine();
```

---

# 41. AUTOMATIC TRANSMISSION

Gunakan:

```text
RPM + Speed + Throttle
```

untuk menentukan perpindahan gigi.

Tidak perlu simulasi gearbox kompleks.

---

# 42. MOTOR

Motor menggunakan:

- lean sederhana
- steering
- throttle
- brake
- gear
- clutch

Jangan mensimulasikan:

- deformasi ban
- suspension detail
- chain physics
- engine internal mechanics

---

# 43. MOBIL

Gunakan:

- steering
- throttle
- brake
- gear
- clutch
- handbrake
- basic suspension

Tidak perlu simulasi setiap komponen mekanik.

---

# 44. TRUK

Gunakan:

- acceleration rendah
- brake lebih berat
- steering lambat
- turning radius besar
- reverse

Jangan membuat physics trailer kompleks pada versi pertama.

---

# 45. TRAILER

Trailer tidak wajib.

Jika ditambahkan:

```text
Optional Module
```

dan hanya aktif pada training truck tertentu.

---

# 46. ROAD COLLIDER

Gunakan satu collider utama.

Jangan:

```text
Collider per potongan jalan kecil
```

Jika mesh collider digunakan, jadikan statis dan optimalkan.

---

# 47. TRIGGER ZONE

Gunakan trigger sederhana:

```text
TrafficLightZone
CrosswalkZone
ObstacleZone
FinishZone
OffRoadZone
```

Trigger lebih murah dibanding sistem pencarian objek terus-menerus.

---

# 48. OFF-ROAD

Gunakan:

```text
Road Trigger
```

atau road boundary.

Jangan mencari centerline dari ribuan titik setiap frame.

Sistem baru:

```text
Vehicle → IsInsideRoadTrigger? → No → OffRoad
```

---

# 49. SCORING EVENT

Contoh:

```text
OnRedLightViolation
OnPedestrianViolation
OnCollision
OnOffRoad
OnGearMistake
OnChecklistFailure
OnFinish
```

ScoreManager menerima event tersebut.

---

# 50. PERFORMANCE RULE

Aturan utama:

> Jika suatu sistem tidak terlihat oleh user, tidak memengaruhi simulasi, dan tidak diperlukan untuk penilaian, sistem tersebut tidak boleh berjalan setiap frame.

---

# 51. UPDATE FREQUENCY

| Sistem | Frekuensi |
|---|---:|
| Physics | FixedUpdate (50 Hz) |
| Input | Update |
| Camera | LateUpdate |
| HUD speed | 10 Hz |
| Traffic AI | 5-10 Hz |
| Pedestrian | 5 Hz |
| Score UI | Event |
| Warning | Event |
| Audio RPM | 20-30 Hz |
| Environment | Event/LOD |

---

# 52. TARGET FPS

## PC

```text
Target: 60 FPS
VR PC: 72/80/90 FPS sesuai headset
```

## Quest / Standalone VR

```text
Target minimum: 72 FPS
Target ideal: 80/90 FPS jika perangkat mampu
```

Prioritas:

```text
Stable FPS > Graphics Quality
```

---

# 53. QUALITY PRESETS

## LOW

```text
Shadow:     Off/Low
LOD:        Agresif
Traffic:    3
Pedestrian: 1
Texture:    512/1024
Effects:    Low
```

## MEDIUM

```text
Shadow:     Low
LOD:        Medium
Traffic:    5
Pedestrian: 2
Texture:    1024
Effects:    Medium
```

## HIGH

```text
Shadow:     Medium
LOD:        High
Traffic:    8+
Pedestrian: 3+
Texture:    1024/2048
Effects:    Medium
```

VR standalone default:

```text
LOW atau MEDIUM
```

---

# 54. ADAPTIVE PERFORMANCE

Buat sistem sederhana:

```text
FPS < target
    ↓
Reduce traffic (step 1)
    ↓
Reduce shadows (step 2)
    ↓
Reduce effects (step 3)
    ↓
Increase LOD culling (step 4)
```

Jangan langsung mengubah semua setting.

Gunakan beberapa level bertahap.

---

# 55. QUALITY MANAGER

```text
PerformanceManager
│
├── FPS Monitor (rata-rata 30 frame window)
├── QualityLevel (Low/Medium/High)
├── Traffic Budget
├── Shadow Distance
├── LOD Bias
├── Particle Limit
└── Adaptive Degrade/Upgrade
```

Adaptive logic:

```text
FPS < 72 → degrade setelah 3 detik
FPS > 77 → upgrade setelah 15 detik
```

---

# 56. VR BUILD TARGET

| Platform | Profile | Output |
|---|---|---|
| Windows PC | Desktop | EXE |
| PC VR (OpenXR) | VR_PC | EXE |
| Meta Quest (standalone) | VR_Standalone | APK |
| WebGL (browser) | WebGL | index.html + Build/ |

---

# 57. BUILD VR (QUEST)

## Via Unity Editor

1. Menu **Kemudi → Build VR (Quest)**
2. Auto: switch target Android, set OpenXR, build APK
3. Output: `Builds/VR/KemudiSimulation.apk`

## Via Command Line

```bash
"<Unity Editor>/Unity.exe" -batchmode -quit \
  -projectPath simulation/Kemudi.Simulation \
  -executeMethod Kemudi.Simulation.EditorTools.KemudiVRBuilder.BuildVR \
  -logFile build-vr.log
```

## Install ke Quest

```bash
adb install Builds/VR/KemudiSimulation.apk
```

---

# 58. BUILD VR (PC VR)

## Via Unity Editor

1. Menu **Kemudi → Build VR (PC VR)**
2. Output: `Builds/VR/PCVR/KemudiSimulation.exe`
3. Jalankan dengan headset VR terhubung

## Via Command Line

```bash
"<Unity Editor>/Unity.exe" -batchmode -quit \
  -projectPath simulation/Kemudi.Simulation \
  -executeMethod Kemudi.Simulation.EditorTools.KemudiVRBuilder.BuildVRPc \
  -logFile build-vr-pc.log
```

---

# 59. BUILD WEBGL

## Via Unity Editor

1. Menu **Kemudi → Build WebGL**
2. Output: `src/Kemudi.Web/wwwroot/unity/`

## Via Command Line

```bash
"<Unity Editor>/Unity.exe" -batchmode -quit \
  -projectPath simulation/Kemudi.Simulation \
  -executeMethod Kemudi.Simulation.EditorTools.KemudiWebGlBuilder.BuildWebGl \
  -logFile build-webgl.log
```

---

# 60. WEBSITE DAN SIMULASI BERKOMUNIKASI

Jangan menjalankan simulasi Unity di dalam Blazor.

Arsitektur:

```text
Kemudi.Web (Blazor)
    ↓
Launch Simulation (iframe / Unity App)
    ↓
Unity Application
    ↓
Simulation Result (POST /api/progress)
    ↓
Kemudi.Api
    ↓
Database (EF Core)
```

Untuk PC:

```text
Blazor Website + Unity Simulation (iframe)
```

Untuk standalone VR:

```text
Unity App + API HTTPS langsung
```

---

# 61. HASIL SIMULASI

Unity mengirim:

```json
{
  "vehicleType": "MOBIL",
  "score": 87,
  "timeTakenMs": 92000,
  "violations": 2,
  "offRoadCount": 1,
  "obstacleHits": 0,
  "completed": true
}
```

API melakukan:

```text
Authenticate → Validate → Sanitize → Save
```

Skor tetap harus divalidasi server:

```text
0 <= Score <= 100
```

Jangan percaya score mentah dari client.

---

# 62. ASSET CLEANUP

## Pertahankan

```text
mobil
motor
truck
```

## Variasi kendaraan

Jangan load semuanya sekaligus.

Gunakan sistem:

```text
Selected Vehicle → Load only selected model
```

Model lain tidak perlu aktif di memory.

---

# 63. SCENE LOADING

Jangan membuat seluruh kota aktif sejak awal.

Untuk perangkat standalone, targetkan memory usage rendah dan jangan memuat asset yang tidak digunakan.

---

# 64. ADDRESSABLES

Gunakan Addressables hanya untuk:

- model kendaraan alternatif
- map alternatif
- asset besar
- audio besar

Jangan menjadikan seluruh asset kecil sebagai Addressable tanpa alasan.

---

# 65. MEMORY

Prioritas:

```text
Kurangi texture
↓
Kurangi duplicate mesh
↓
Kurangi material
↓
Unload scene/asset
↓
Pooling
```

Hindari duplikasi asset yang sama.

---

# 66. QUALITY CHECKLIST

Sebelum build:

```text
[ ] Tidak ada 4K texture yang tidak diperlukan
[ ] Tidak ada material duplikat
[ ] Tidak ada collider dekorasi
[ ] Tidak ada Rigidbody dekorasi
[ ] Tidak ada AI update setiap frame
[ ] Tidak ada Instantiate/Destroy berulang
[ ] Tidak ada physics 8 substep
[ ] Tidak ada post-processing berat
[ ] Tidak ada realtime light berlebihan
[ ] LOD aktif
[ ] Occlusion culling aktif jika sesuai scene
[ ] Static batching aktif bila cocok
[ ] GPU instancing aktif bila cocok
[ ] Audio source terbatas
[ ] Draw call diperiksa
[ ] Triangle count diperiksa
[ ] GC allocation diperiksa
[ ] FPS VR stabil
```

---

# 67. TEST TARGET

## PC

```text
1080p
60 FPS minimum
```

## PC VR

```text
72 FPS minimum
```

## Quest standalone

```text
72 FPS minimum
```

Jika target tidak tercapai:

```text
1. Kurangi shadow
2. Kurangi traffic
3. Kurangi LOD distance
4. Kurangi texture
5. Kurangi particle
6. Kurangi material
7. Kurangi polygon
8. Kurangi post processing
```

---

# 68. VR SETUP CHECKLIST

Sebelum testing VR:

```text
[ ] Unity 6 / 2022.3+ terinstall
[ ] Android Build Support terpasang (Quest)
[ ] com.unity.xr.management terinstall
[ ] com.unity.xr.openxr terinstall
[ ] com.unity.inputsystem terinstall
[ ] com.unity.textmeshpro terinstall
[ ] OpenXR enabled di XR Plugin Management
[ ] Oculus Touch Controller Profile ditambahkan
[ ] XRInputActions.inputactions di-import
[ ] XRInputProvider ter-wire ke UniversalInputSystem
[ ] Scene Main.unity sudah ada
[ ] Player Settings: Active Input Handling = Both
[ ] Player Settings: Scripting Backend = IL2CPP (Android)
[ ] Player Settings: Graphics API = Vulkan (Android)
```

---

# 69. VR INPUT ACTIONS

File: `Assets/Settings/XRInputActions.inputactions`

```text
Map: XR Vehicle
├── Steering     (Left Stick → Vector2)
├── Throttle     (Right Trigger → Axis)
├── Brake        (Right Grip → Axis)
├── Look         (Right Stick → Vector2)
├── ButtonA      (A → Button)
├── ButtonB      (B → Button)
├── ButtonX      (X → Button)
├── ButtonY      (Y → Button)
└── Menu         (Menu → Button)

Map: XR UI
├── Point        (Right Stick → Vector2)
├── Click        (Right Trigger → Button)
└── Scroll       (Right Stick → Vector2)

Control Scheme: XR Controller
Device: <XRController>
```

---

# 70. XR MANAGER STATES

```text
XRManager
├── CurrentMode: Desktop | VR
├── IsVrActive: bool
├── VrRig: GameObject?
├── XrInput: XRInputProvider?
├── Comfort: XRComfortSystem?
└── Dashboard: XRDashboard?

Methods:
├── Initialize(input, desktopRig)
├── SetVehicleTarget(vehicle)
├── NotifyControllersActive(active)
└── DetectAndConfigure()
```

---

# 71. URUTAN MIGRASI

## PHASE 1 — Website

```text
[✓] Buat Kemudi.sln
[✓] Setup Kemudi.Domain
[✓] Setup Kemudi.Shared
[✓] Setup Kemudi.Infrastructure
[✓] Setup Kemudi.Api
[✓] Setup Kemudi.Web
[✓] Setup EF Core
[✓] Migrasi database
[✓] Migrasi Identity
```

## PHASE 2 — Website UI

```text
[✓] Landing
[✓] Navbar
[✓] Kursus
[✓] Mentor
[✓] Personal
[✓] Payment
[✓] Materi
[✓] Login
[✓] Register
[✓] Dashboard
```

## PHASE 3 — API

```text
[✓] Auth
[✓] Courses
[✓] Mentors
[✓] Vehicles
[✓] Registration
[✓] Payment
[✓] Progress
```

## PHASE 4 — Unity Core

```text
[✓] Buat Unity project
[✓] Setup URP
[✓] Setup OpenXR
[✓] Setup Input System
[✓] Setup scene (KemudiSceneBootstrap)
[✓] Import kendaraan
[✓] VehicleController
[✓] VehiclePhysics
[✓] Transmission (Manual + Automatic)
[✓] Engine
```

## PHASE 5 — Gameplay

```text
[✓] Track (TrackBuilder)
[✓] Collision
[✓] Traffic light
[✓] Crosswalk
[✓] Obstacles (TrackObstacleBuilder)
[✓] Score (ScoringSystem)
[✓] Checklist
[✓] HUD (SceneHud)
[✓] Scenery (BuildScenery)
[✓] Traffic AI (TrafficManager)
[✓] Pedestrian (PedestrianManager)
```

## PHASE 6 — VR

```text
[✓] VR camera (CameraManager VR mode)
[✓] Controller (XRInputProvider)
[✓] Input mapping (XRInputActions)
[✓] Dashboard VR (XRDashboard)
[✓] Comfort (XRComfortSystem)
[✓] XR Manager (XRManager)
[✓] Hand tracking (HandTrackingManager, default OFF)
[✓] VR Builder (KemudiVRBuilder)
[✓] VR Menu (MainMenuUI VR mode)
[✓] VR Setup docs (VR_SETUP.md)
```

## PHASE 7 — Optimization

```text
[✓] LOD
[✓] Culling
[✓] Texture compression
[✓] Mesh optimization
[✓] Material reduction
[✓] Lighting optimization
[✓] Physics optimization
[✓] AI optimization
[✓] Audio optimization
[✓] Performance presets (LOW/MEDIUM/HIGH)
[✓] Adaptive performance
```

## PHASE 8 — Build & Deploy

```text
[ ] Build WebGL → website /simulasi
[ ] Build VR Quest → APK install
[ ] Build PC VR → EXE run
[ ] Integration test: hasil → API → database
[ ] Performance test: Quest 72 FPS stable
[ ] User acceptance test
```

---

# 72. PRIORITAS PENGERJAAN

## CRITICAL

```text
1. Vehicle physics stabil
2. Universal input (keyboard + VR)
3. OpenXR integration
4. Stable FPS (72+ VR)
5. Track + collision
6. Scoring + checklist
7. Traffic light + zebra cross
8. API integration (simulation result)
```

## HIGH

```text
1. Three vehicle types (Motor/Mobil/Truk)
2. Manual/Automatic transmission
3. VR Dashboard
4. VR Comfort system
5. Build pipeline (Quest + PC VR + WebGL)
6. Performance presets
7. Scenery lingkungan
8. Traffic AI (3-8 kendaraan)
```

## MEDIUM

```text
1. Walking mode (opsional)
2. Hand tracking (opsional)
3. Advanced traffic AI
4. More vehicle variants
5. Advanced audio
6. Vehicle tuning panel
```

## LOW

```text
1. Weather
2. GPS
3. Multiplayer
4. Advanced AI
5. High-end graphics
6. Dynamic environment
7. Trailer
8. Ideal line
```

---

# 73. DEFINITION OF DONE

## SIMULASI

```text
[✓] Tidak menggunakan Three.js sebagai engine
[✓] Tidak menggunakan R3F
[✓] Unity C# / MonoBehaviour
[✓] Motor berjalan (fisika + input)
[✓] Mobil berjalan (fisika + input)
[✓] Truk berjalan (fisika + input)
[✓] Manual berjalan (kopling + stall)
[✓] Automatic berjalan (RPM-based shift)
[✓] Keyboard berjalan
[✓] Gamepad berjalan
[✓] VR controller berjalan
[✓] OpenXR berjalan
[✓] FPV berjalan
[✓] TPV berjalan
[✓] VR head tracking berjalan
[✓] Collision berjalan
[✓] Score berjalan (0-100)
[✓] Checklist berjalan
[✓] Traffic light berjalan
[✓] Crosswalk berjalan
[✓] Obstacles berjalan
[✓] Off-road detection berjalan
[✓] Scenery lingkungan berjalan
[✓] Audio engine berjalan
[✓] VR Dashboard berjalan
[✓] VR Comfort berjalan
```

## PERFORMA

```text
[✓] LOD aktif
[✓] Culling aktif
[✓] Texture terkompresi
[✓] Material dibatasi
[✓] Physics sederhana (FixedUpdate 50 Hz)
[✓] AI tidak berjalan setiap frame
[✓] Tidak ada collider dekorasi
[✓] Tidak ada 8 substep collision
[✓] VR FPS stabil (72+ Hz)
[✓] Adaptive performance aktif
[✓] Object pooling aktif
[✓] GC allocation minimal
```

## BUILD

```text
[✓] WebGL build → website /simulasi
[✓] VR Quest build → APK
[✓] VR PC build → EXE
[✓] API integration → POST /api/progress
[✓] Token JWT disisipkan ke Unity
```

---

# 74. ARSITEKTUR INPUT VR

```text
Keyboard Input ──────────────────┐
Gamepad Input ───────────────────┤
VR Controller Input ─────────────┤
Wheel Input ─────────────────────┤
Hand Tracking Input ─────────────┘
             │
             ▼
    UniversalInputSystem
    ├── KeyboardInputProvider
    ├── XRInputProvider
    └── (GamepadProvider, WheelProvider)
             │
             ▼
       VehicleInputState
       ├── Steering (float)
       ├── Throttle (float)
       ├── Brake (float)
       ├── Clutch (float)
       ├── GearUp (bool, edge)
       ├── GearDown (bool, edge)
       ├── HandbrakePressed (bool, edge)
       └── ... (flags lainnya)
             │
             ▼
    VehicleController
    ├── Update() → sampling input
    ├── SteeringInput (rate-limited)
    ├── HandbrakeActive
    └── UpdateChecklist()
             │
             ▼
    VehiclePhysics
    └── FixedUpdate() → apply forces
```

---

# 75. ARSITEKTUR XR

```text
XRManager
├── Awake() → DetectAndConfigure()
│   ├── IsVrSupported()?
│   │   ├── YES → Mode.VR
│   │   │   ├── SetupVrRig()
│   │   │   ├── RegisterXRInput()
│   │   │   ├── SetupComfort()
│   │   │   └── SetupDashboard()
│   │   └── NO → Mode.Desktop
│   │       └── ApplyMode() → desktop rig
│   │
├── LateUpdate() → VR rig follow vehicle
│   └── Vector3.Lerp(position, seatPos, smooth)
│
├── SetVehicleTarget(vehicle)
│   └── Reset VR rig ke kursi kendaraan
│
└── OnDestroy() → Unregister XRInputProvider

XRComfortSystem
├── LateUpdate()
│   ├── UpdateFov() → dynamic FOV
│   └── UpdateVignette() → edge blur
├── SetAcceleration(longitudinal, lateral)
└── Reset()

XRDashboard
├── Initialize() → CreateVrMenu()
│   ├── Canvas (World Space)
│   ├── Speed text (TextMeshPro)
│   ├── Gear text
│   ├── RPM bar (Image fillAmount)
│   ├── Indicators (dots)
│   ├── Warning text
│   └── Timer
└── UpdateDashboard(speed, gear, rpm, warning, time)
```

---

# 76. ARSITEKTUR SCENE

```text
KemudiSceneBootstrap
├── Awake()
│   ├── EnsureCamera()
│   ├── EnsureLighting()
│   ├── BuildGround()
│   ├── BuildManagers()
│   │   ├── SimulationManager
│   │   ├── ViolationSystem
│   │   ├── ScoringSystem
│   │   ├── ChecklistManager
│   │   ├── UniversalInputSystem
│   │   └── KeyboardInputProvider
│   ├── BuildTrack() → TrackBuilder + waypoints
│   ├── BuildObstacles() → TrackObstacleBuilder
│   ├── BuildScenery() → lampu, pohon, rumah, ruko
│   ├── BuildTrafficSystem() → traffic light, zebra, AI
│   ├── BuildCameraRig() → CameraManager
│   └── BuildXrSystem()
│       ├── XRManager
│       ├── XRComfortSystem
│       ├── XRDashboard
│       └── HandTrackingManager
│
├── PrepareRun(type, manual)
│   ├── BuildVehicle(type, manual)
│   ├── CameraRig.Configure()
│   ├── XrManager.SetVehicleTarget()
│   └── Simulation.StartSimulation()
│
└── Restart()
    ├── Destroy vehicle
    └── Return to selecting
```

---

# 77. SCORING DETAIL

```text
Score = 100

Pelanggaran (lalu lintas):     -8 poin per pelanggaran
Off-road:                       -5 poin per kali
Collision (tabrakan):           -12 poin per tabrakan
Obstacle hit:                   -3 poin per objek per percobaan
Waktu berlebih (par 120 detik): -1 poin per detik

Fail conditions:
- Pelanggaran >= 3x → langsung gagal
- Tabrak pejalan kaki → langsung gagal
```

---

# 78. CHECKLIST DETAIL

```text
SEMUA KENDARAAN:
[✓] EnteredVehicle (otomatis saat masuk kabin)
[✓] DoorClosed (otomatis)
[✓] EngineOn (otomatis dari EngineController.IsRunning)
[✓] HandbrakeReleased (tombol Space, edge)

MOTOR:
[✓] Helmet (tombol H)
[✓] Jacket (tombol J)
[✓] Gloves (tombol G)
[✓] Boots (tombol F)

MOBIL/TRUK:
[✓] Seatbelt (tombol B)
[✓] SeatAdjusted (tombol [)
[✓] MirrorsAdjusted (tombol ])

MANUAL (opsional):
[✓] ClutchEngaged (otomatis dari input.Clutch > 0.1)
[✓] FirstGearEngaged (otomatis dari transmission.CurrentGear == 0)
```

---

# 79. TRAFFIC LIGHT DETAIL

```text
State Machine:
GREEN (45 detik)
    ↓
YELLOW (5 detik)
    ↓
RED (40 detik)
    ↓
GREEN (ulang)

Lokasi:
- Kota 1 (z = -75)
- Kota 2 (z = -650)

Zona trigger: 7m sebelum stop line
Pelanggaran: menerobos saat merah → TrafficLightViolation
```

---

# 80. PEDESTRIAN DETAIL

```text
Lokasi zebra cross:
- z = -150 (Kota 1)
- z = -390 (Permukiman)
- z = -850 (mendekati finish)

State:
WAIT → CROSS (MoveTowards) → FINISH

1 pedestrian per crossing
Update: 5 Hz
Tabrak pedestrian → langsung gagal (PedestrianCollisionWatcher)
```

---

# 81. OBSTACLE DETAIL

```text
Cone slalom:        z = -202..-254, offset ±4.2 m
Water barrier:      z = -450..-495, offset ±4.5 m
Kendaraan parkir:   z = -500..-510, offset ±4.2 m
Truk berhenti:      z = -495, bahu jalan
Bus:                z = -705, bahu jalan
Pothole:            z = -508..-516 (visual only)

Hit detection: ObstacleCollisionWatcher (OnCollisionEnter)
Penalti: -3 poin per objek per percobaan
```

---

# 82. AUDIO DETAIL

```text
Engine clips:
├── idle (1100 RPM untuk mobil)
├── low (2000-4000 RPM)
├── high (5000+ RPM)
└── crossfade antar clip berdasarkan RPM

Pitch: mengikuti RPM ratio
Volume: mengikuti throttle input
Spatial: hanya untuk kendaraan dekat (distance check)
AudioMixer: Engine / Environment / UI categories
```

---

# 83. VR COMFORT DETAIL

```text
FOV Dynamic:
- baseFov: 90°
- maxNarrowFov: 70°
- threshold: 3 m/s²
- max: 15 m/s²
- smooth: 8

Vignette:
- intensity: 0.3
- radius: 0.7
- smooth: 6

Mode Normal: FOV + vignette ringan
Mode Comfort: FOV + vignette kuat (default)
Mode Advanced: manual
```

---

# 84. VR DASHBOARD DETAIL

```text
Panel size: 0.45m x 0.25m (world-space)
Position: 0.35m above seat, 0.5m forward
Rotation: 15° tilt down

Elements:
├── Speed: TMP, 32pt, bold, white
├── Unit: TMP, 14pt, gray
├── Gear: TMP, 36pt, bold, cyan
├── RPM bar: Image fillAmount, green→yellow→red
├── Indicators: 6 dots (headlight, high beam, hazard, turn L/R, handbrake)
├── Warning: TMP, 16pt, bold, red
└── Timer: TMP, 14pt, gray

Update: 5-10 Hz (bukan setiap frame)
```

---

# 85. KESIMPULAN

Arsitektur final simulasi VR Kemudi.id:

```text
                    KEMUDI.ID
                       │
          ┌────────────┴────────────┐
          │                         │
       WEBSITE                  SIMULATION
     (ASP.NET CORE)            (UNITY C#)
          │                         │
       BLAZOR                    OPENXR
          │                         │
       EF CORE                INPUT SYSTEM
          │                         │
      SQL SERVER/SQLite       VEHICLE PHYSICS
          │                         │
       REST API            VR / PC / QUEST
          │                         │
          └────────────┬────────────┘
                       │
                 SIMULATION RESULT
                       │
                    API / DB
```

Prinsip final:

> **Website menangani akun, kursus, materi, pembayaran, dashboard, dan data. Unity menangani seluruh simulasi 3D, fisika, kendaraan, dan VR.**

> **Performa adalah prioritas utama. Detail visual, AI, efek, dan fitur tambahan hanya boleh ditambahkan setelah target FPS VR tercapai.**

> **Input universal: keyboard, gamepad, VR controller, steering wheel — semua melewati UniversalInputSystem. VehicleController tidak pernah tahu asal input.**

> **VR: OpenXR sebagai standar. Dashboard world-space di kabin. Comfort system anti motion sickness. Hand tracking default OFF. Build pipeline: Quest APK + PC VR EXE + WebGL.**

Dengan struktur ini, simulasi berjalan stabil di PC maupun VR standalone tanpa ketergantungan pada Three.js/R3F. C# menjadi satu-satunya bahasa untuk simulasi, dan integrasi dengan website melalui REST API.
