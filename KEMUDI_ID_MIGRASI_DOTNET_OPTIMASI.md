# KEMUDI.ID — FULL MIGRASI C#/.NET + OPTIMASI SIMULASI VR

> Dokumen ini adalah spesifikasi migrasi penuh project Kemudi.id dari **Next.js/React/TypeScript/TSX + Three.js/R3F** menjadi arsitektur **C#/.NET untuk website** dan **C# Unity untuk simulasi 3D/VR**.
>
> Tujuan utama: **seluruh website tidak lagi bergantung pada Next.js/TSX**, simulasi tidak lagi memakai Three.js/R3F sebagai engine utama, dan simulasi dibuat seringan mungkin agar dapat berjalan stabil pada PC maupun perangkat VR standalone.

---

## 1. Dasar Project Saat Ini

Project saat ini memiliki dua bagian besar:

1. Website Kemudi.id:
   - Landing page
   - Kursus
   - Mentor
   - Data pribadi
   - Pembayaran
   - Materi
   - Login/register
   - Dashboard
   - API
2. Simulasi:
   - Motor, mobil, truk
   - Fisika kendaraan
   - Track jalan raya
   - Rintangan
   - Traffic light
   - Pejalan kaki
   - HUD
   - Checklist pra-jalan
   - Audio
   - VR/XR
   - Keyboard dan controller

Dokumentasi sumber menyebutkan bahwa project sudah memiliki migrasi awal ke ASP.NET Core + Blazor dan scaffold Unity, tetapi bagian simulasi Unity masih berstatus scaffold. Karena target sekarang adalah **migrasi penuh**, versi TSX/React/Three.js tidak lagi menjadi runtime utama.

Sumber project menjelaskan struktur website Next.js, simulasi Three.js/R3F, dukungan WebXR, migrasi .NET, dan scaffold Unity.

---

# 2. TARGET AKHIR

## 2.1 Website

Gunakan:

- **ASP.NET Core**
- **Blazor Web App**
- **Entity Framework Core**
- **ASP.NET Core Identity**
- **SQL Server atau SQLite**
- **C#**
- **Razor Components**
- **CSS**
- **ASP.NET Core Web API**

Tidak digunakan lagi sebagai runtime website:

- Next.js
- React
- TSX
- TypeScript
- NextAuth
- Prisma
- Zustand

---

## 2.2 Simulasi

Gunakan:

- **Unity**
- **C#**
- **Unity Input System**
- **OpenXR**
- **XR Interaction Toolkit bila diperlukan**
- **Rigidbody / physics Unity**
- **URP**
- **Addressables hanya bila memang diperlukan**
- **ScriptableObject untuk konfigurasi kendaraan**

Target:

- Windows
- PC VR
- Meta Quest standalone
- Perangkat OpenXR yang kompatibel

Dokumentasi awal memang sudah mendefinisikan Unity sebagai target simulasi C# dengan OpenXR, Input System, dan arsitektur `VehicleController → VehiclePhysics`. fileciteturn0file0L572-L600

---

# 3. ARSITEKTUR BARU

```text
Kemudi.id
│
├── Website
│   ├── Kemudi.Web
│   │   └── Blazor Web App
│   │
│   ├── Kemudi.Api
│   │   └── ASP.NET Core Web API
│   │
│   ├── Kemudi.Domain
│   │   └── Entity + Enum + Business Rules
│   │
│   ├── Kemudi.Infrastructure
│   │   └── EF Core + Identity + Database
│   │
│   └── Kemudi.Shared
│       └── DTO + Contracts
│
└── Simulation
    └── Kemudi.Simulation
        ├── Core
        ├── Vehicles
        ├── Physics
        ├── Input
        ├── XR
        ├── Traffic
        ├── Environment
        ├── Rules
        ├── UI
        └── Audio
```

---

# 4. STRUKTUR REPOSITORY BARU

```text
Kemudi.id/
│
├── src/
│   ├── Kemudi.Domain/
│   │   ├── Entities/
│   │   ├── Enums/
│   │   └── Interfaces/
│   │
│   ├── Kemudi.Shared/
│   │   ├── DTOs/
│   │   ├── Contracts/
│   │   └── Constants/
│   │
│   ├── Kemudi.Infrastructure/
│   │   ├── Data/
│   │   ├── Identity/
│   │   ├── Services/
│   │   └── Migrations/
│   │
│   ├── Kemudi.Api/
│   │   ├── Controllers/
│   │   ├── Services/
│   │   └── Program.cs
│   │
│   └── Kemudi.Web/
│       ├── Components/
│       ├── Pages/
│       ├── Layout/
│       ├── Services/
│       ├── wwwroot/
│       └── Program.cs
│
├── simulation/
│   └── Kemudi.Simulation/
│       ├── Assets/
│       │   ├── Scenes/
│       │   ├── Scripts/
│       │   ├── Models/
│       │   ├── Materials/
│       │   ├── Prefabs/
│       │   ├── Audio/
│       │   └── UI/
│       │
│       └── ProjectSettings/
│
├── docs/
│   ├── MIGRASI_DOTNET_FULL.md
│   ├── OPTIMASI_SIMULASI.md
│   └── VR_INPUT_MAP.md
│
└── Kemudi.sln
```

---

# 5. PEMETAAN TEKNOLOGI LAMA → BARU

| Lama | Baru |
|---|---|
| Next.js | ASP.NET Core + Blazor |
| React | Blazor Components |
| TSX | Razor `.razor` + C# |
| TypeScript | C# |
| Tailwind | CSS / CSS isolation / design system |
| NextAuth | ASP.NET Core Identity |
| Prisma | Entity Framework Core |
| SQLite | SQLite/SQL Server |
| Next API Routes | ASP.NET Core Web API |
| Zustand | Scoped/Singleton C# services + component state |
| Three.js | Unity |
| React Three Fiber | Unity Scene/GameObject |
| Rapier | Unity Physics |
| WebXR | OpenXR |
| `useFrame` | `Update` / `FixedUpdate` |
| GLB | Unity-imported FBX/GLB sesuai pipeline |
| WebAudio | Unity AudioSource/AudioMixer |
| Web DOM HUD | Unity Canvas |
| `localStorage` | Database/API atau browser storage hanya untuk data ringan |
| `lib/vehicles.ts` | `VehicleConfig.cs` ScriptableObject |
| `vehicleDynamics.ts` | `VehiclePhysics.cs` |
| `transmission.ts` | `TransmissionController.cs` |
| `engine.ts` | `EngineController.cs` |
| `simStore.ts` | `SimulationState.cs` / service |
| `KeyboardInput.ts` | Unity Input System |
| `XRInputAdapter.ts` | OpenXR + Input Actions |
| `obstacles.ts` | Unity Collider + layer/culling |
| `track.ts` | Unity Scene + optimized road meshes |
| `Hud.tsx` | Unity World/Screen Space Canvas |

---

# 6. WEBSITE .NET

## 6.1 Halaman

Semua halaman lama dipindahkan ke Blazor:

| Lama | Blazor |
|---|---|
| `/` | `/` |
| `/kursus` | `/kursus` |
| `/kursus/mentor/[id]` | `/kursus/mentor/{id}` |
| `/kursus/personal` | `/kursus/personal` |
| `/kursus/payment` | `/kursus/payment` |
| `/materi` | `/materi` |
| `/materi/[slug]` | `/materi/{slug}` |
| `/simulasi` | `/simulasi` |
| `/login` | `/login` |
| `/register` | `/register` |
| `/dashboard` | `/dashboard` |

---

# 7. AUTENTIKASI

Gunakan:

```text
ASP.NET Core Identity
        ↓
UserManager
        ↓
SignInManager
        ↓
Authentication Cookie
```

Jangan mempertahankan NextAuth.

Fitur:

- Register
- Login
- Logout
- Session
- Role
- Password hashing
- Validasi email
- Proteksi halaman dashboard
- Proteksi endpoint progress

---

# 8. DATABASE

Gunakan Entity Framework Core.

Entity utama:

```text
User
Course
CoursePackage
CourseRegistration
Mentor
Payment
SimulationAttempt
TrainingSession
Vehicle
```

Data simulasi yang perlu disimpan:

```text
SimulationAttempt
├── Id
├── UserId
├── VehicleType
├── Score
├── TimeTakenMs
├── Violations
├── OffRoadCount
├── ObstacleHits
├── Completed
└── CreatedAt
```

Skor tetap harus divalidasi server.

```text
0 <= Score <= 100
```

Klien tidak boleh menjadi sumber kebenaran untuk hasil penting.

---

# 9. API

Endpoint utama:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/courses
GET  /api/courses/{slug}

GET  /api/mentors
GET  /api/mentors/{slug}

GET  /api/vehicles

POST /api/course-registration
GET  /api/course-registration

POST /api/payment

POST /api/progress
GET  /api/progress
```

---

# 10. SIMULASI UNITY

## 10.1 Fase Simulasi

Versi awal memiliki:

```text
Selecting
   ↓
Walking
   ↓
Driving
   ↓
Finished / Failed
```

Untuk optimasi performa, **fase Walking tidak menjadi fitur wajib**.

Target default:

```text
Selecting
   ↓
PreDrive
   ↓
Driving
   ↓
Finished / Failed
```

Walking dapat dibuat sebagai mode opsional jika performa perangkat mencukupi.

### Alasan

Fase berjalan kaki menambah:

- karakter 3D
- animasi
- collision karakter
- kamera tambahan
- AI/pergerakan karakter
- state tambahan
- objek sekitar yang harus tetap aktif

Untuk simulasi kursus mengemudi, manfaatnya lebih kecil dibanding biaya CPU/GPU.

---

# 11. CORE SIMULATION

Struktur:

```text
SimulationManager
│
├── VehicleManager
├── InputManager
├── PhysicsManager
├── TrafficManager
├── RuleManager
├── ScoreManager
├── CameraManager
├── XRManager
├── AudioManager
└── UIManager
```

Jangan membuat satu script raksasa yang mengontrol semuanya.

---

# 12. VEHICLE SYSTEM

## 12.1 VehicleConfig

Gunakan ScriptableObject:

```text
VehicleConfig
├── VehicleType
├── Mass
├── MaxSpeed
├── Acceleration
├── BrakeForce
├── WheelBase
├── MaxSteeringAngle
├── ReverseSpeed
├── GearRatios
├── SteeringSpeed
├── SteeringReturnSpeed
└── Grip
```

Kendaraan:

```text
Motor
Mobil
Truk
```

Konfigurasi kendaraan dari dokumentasi awal tetap digunakan sebagai baseline, lalu dituning kembali di Unity. fileciteturn0file0L346-L359

---

# 13. FISIKA KENDARAAN

Gunakan:

```text
VehicleController
       ↓
VehiclePhysics
       ↓
Rigidbody
       ↓
Wheel/Vehicle Visual
```

Pisahkan:

### Physics

- Rigidbody
- velocity
- steering
- braking
- acceleration
- gravity
- friction

### Visual

- wheel rotation
- steering wheel
- body lean
- suspension animation
- dashboard

Visual tidak boleh mengendalikan physics utama.

---

# 14. FIXEDUPDATE

Gunakan:

```csharp
void FixedUpdate()
{
    ReadPhysicsInput();
    CalculateEngineForce();
    CalculateSteering();
    CalculateBrake();
    ApplyPhysics();
}
```

Gunakan:

- `FixedUpdate()` untuk physics
- `Update()` untuk input/UI non-physics
- `LateUpdate()` untuk kamera

Jangan menghitung physics utama di `Update()`.

---

# 15. OPTIMASI FISIKA

## HAPUS

Jangan mempertahankan:

- 8 substep collision per frame
- kalkulasi collision manual setiap frame jika Unity Collider sudah cukup
- perhitungan grip yang terlalu kompleks
- kalkulasi suspension visual yang tidak terlihat
- physics untuk objek dekorasi
- Rigidbody pada pohon, rumah, tiang, papan, dan dekorasi

Dokumentasi lama menyebut `VehicleController` menggunakan 8 substep collision per frame. Ini harus dipangkas untuk target VR standalone. fileciteturn0file0L361-L368

## TARGET

```text
Vehicle physics:
50 Hz

Visual:
30–90 FPS

AI:
5–10 Hz

Traffic:
5–10 Hz

Pedestrian:
5 Hz atau event-based
```

---

# 16. COLLISION LAYER

Gunakan collision matrix.

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

Dekorasi tidak perlu collider.

Collider hanya digunakan untuk:

- kendaraan
- barrier
- cone jika diperlukan
- obstacle penting
- trigger rambu
- trigger zebra cross
- finish
- area jalan

---

# 17. SISTEM RINTANGAN

Dokumentasi lama memiliki cone, water barrier, project barrier, pole, pothole, kendaraan parkir, bus, dan objek kota. fileciteturn0file0L398-L414

Untuk versi ringan:

> **Layout celah lebar (konsisten dengan web `lib/scenery.ts`):** semua rintangan
> diimplementasikan dengan celah lebar agar pemain jarang kena penalti — cone
> slalom di tepi jalan (offset ±4,2 m), water barrier melintang di tepi jalan
> (offset ±4,5 m, panjang 2,8 m → celah tengah ±6 m), kendaraan parkir di bahu
> jalan (offset ±4,2 m). Implementasi Unity: `TrackObstacleBuilder` (layout) +
> `ObstacleCollisionWatcher` (hit → `ObstacleHit`, penalti ringan −3 poin
> konsisten dengan web; `obstacleHits` = `CountOf(ObstacleHit)` di §62).

### Tetap

- Cone
- Barrier
- Kendaraan parkir penting
- Pothole trigger
- Zebra crossing
- Traffic light

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

---

# 18. TRACK

Track lama menggunakan CatmullRomCurve3 dengan 1600 sample. fileciteturn0file0L377-L396

Dalam Unity, **jangan membuat track dengan 1600 GameObject**.

Gunakan:

```text
1 road mesh
+
1 road collider
+
trigger zones
```

Target:

```text
Road segments: 50–150
```

atau satu mesh gabungan untuk track utama.

---

# 19. TRACK LOD

Gunakan tiga tingkat detail:

```text
LOD 0
0–30 m
Detail tinggi

LOD 1
30–100 m
Detail sedang

LOD 2
100–250 m
Detail rendah

>250 m
Cull / tidak dirender
```

Untuk VR standalone, gunakan jarak yang lebih agresif.

---

# 20. OCCLUSION CULLING

Gunakan:

- Frustum culling
- Occlusion culling
- LOD Group
- Static batching

Jangan render seluruh kota secara detail sekaligus.

---

# 21. VEGETASI

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
20–80 visual tree instance aktif
```

tergantung perangkat.

---

# 22. KOTA

Kota tidak perlu menjadi kota penuh.

Gunakan sistem:

```text
Road
├── Building A
├── Building B
├── Tree Group
├── Lamp Group
└── Vehicle Group
```

Gunakan prefab yang sama berkali-kali.

Jangan menggunakan banyak mesh unik.

---

# 23. MATERIAL

Target material:

```text
Opaque
+
Simple Lit
```

Hindari:

- material transparan berlebihan
- shader kompleks
- parallax
- tessellation
- realtime reflection
- shader graph berat
- efek screen-space berlebihan

---

# 24. TEXTURE OPTIMIZATION

Gunakan:

```text
1024x1024
```

untuk aset utama bila cukup.

Untuk aset kecil:

```text
256x256
512x512
```

Jangan menggunakan texture 4K kecuali benar-benar diperlukan.

Gabungkan texture menggunakan atlas jika memungkinkan.

---

# 25. MODEL 3D

Model dari `public/models` perlu dioptimalkan sebelum digunakan di Unity.

Prioritas:

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
Desktop:
20k–60k triangles

Quest/standalone:
10k–30k triangles per kendaraan
```

Angka tersebut adalah target optimasi awal, bukan aturan mutlak.

---

# 26. MATERIAL KENDARAAN

Jangan:

```text
1 material per bagian kecil
```

Gunakan material sesedikit mungkin.

Target:

```text
Vehicle body
Glass
Rubber
Interior
Lights
```

Idealnya hanya beberapa material utama per kendaraan.

---

# 27. SHADOW

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

# 28. LIGHTING

Target:

```text
1 Directional Light
+
Ambient Lighting
+
Light Probe terbatas
```

Lampu jalan tidak perlu benar-benar menerangi seluruh jalan.

Visual lampu bisa dibuat sebagai:

```text
emissive material
```

tanpa lampu realtime.

---

# 29. POST PROCESSING

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

# 30. VR

Target:

```text
OpenXR
```

Input:

```text
Keyboard
Gamepad
VR Controller
```

Semua menuju:

```text
UniversalInputSystem
        ↓
VehicleInputState
        ↓
VehicleController
```

Prinsip ini sudah sesuai dengan arsitektur Unity yang tercatat pada dokumentasi sumber. fileciteturn0file0L595-L600

---

# 31. VR CONTROLLER MAP

Gunakan mapping universal.

```text
Left Stick
├── X = Steering
└── Y = Optional walking/camera

Right Stick
└── Camera

A
└── Action / Enter / Confirm

B
└── Cancel / Exit

X
└── Gear Down / Secondary

Y
└── Gear Up / Secondary

Trigger
└── Gas / Interaction

Grip
└── Brake / Grab

Menu
└── Pause
```

Mapping dapat dikonfigurasi berdasarkan controller melalui Unity Input System.

Jangan mengunci simulasi pada satu merek headset.

---

# 32. HAND TRACKING

Hand tracking tetap boleh tersedia, tetapi:

## DEFAULT

```text
OFF
```

## OPTIONAL

```text
User mengaktifkan Hand Tracking
        ↓
Check device support
        ↓
Enable hand input
```

Alasan:

Hand tracking menambah CPU/GPU dan tidak tersedia secara seragam pada semua perangkat.

Dokumentasi awal memang mencatat hand tracking dan gesture detection, tetapi target baru memprioritaskan controller sebagai input utama. fileciteturn0file0L513-L531

---

# 33. VR COMFORT

Tetap gunakan:

- fixed seating
- smooth turning yang dapat diatur
- snap turn opsional
- vignette ringan jika diperlukan
- horizon stabil
- camera tidak berguncang berlebihan

Jangan menggunakan efek kamera yang menyebabkan motion sickness.

---

# 34. KAMERA

Mode:

```text
FPV
TPV
```

## HAPUS DEFAULT

```text
Top-down
```

jika tidak diperlukan untuk gameplay.

Top-down hanya diaktifkan sebagai debug mode.

---

# 35. WALKING MODE

### Default

```text
DISABLED
```

### Optional

```text
Settings
→ Immersive Entry
→ ON
```

Jika ON:

```text
Character
→ Walk
→ Enter vehicle
→ Driving
```

Jika OFF:

```text
Vehicle Select
→ PreDrive
→ Driving
```

Ini mengurangi beban simulasi pada perangkat rendah.

---

# 36. TRAFFIC AI

Jangan membuat AI kendaraan kompleks.

Gunakan waypoint sederhana:

```text
TrafficVehicle
↓
Waypoint A
↓
Waypoint B
↓
Waypoint C
```

Update AI:

```text
5–10 kali/detik
```

bukan setiap frame.

---

# 37. JUMLAH TRAFFIC

Target awal VR standalone:

```text
3–8 kendaraan aktif
```

Desktop:

```text
8–20 kendaraan
```

Jika FPS turun:

```text
kurangi jumlah traffic
```

---

# 38. PEDESTRIAN

Dokumentasi lama memiliki pedestrian di tiga zebra cross dan watcher prioritas pejalan kaki. fileciteturn0file0L482-L486

Untuk versi ringan:

```text
1 pedestrian aktif per crossing
```

Tidak perlu sistem AI pedestrian penuh.

Gunakan:

```text
State:
WAIT
CROSS
FINISH
```

Movement:

```text
Vector3.MoveTowards
```

bukan pathfinding kompleks.

---

# 39. TRAFFIC LIGHT

Gunakan state machine:

```text
GREEN
YELLOW
RED
```

Tidak perlu animasi kompleks.

Satu controller dapat mengontrol seluruh lampu persimpangan.

---

# 40. AUDIO

Audio lama menggunakan WebAudio procedural engine mengikuti RPM. fileciteturn0file0L459-L464

Dalam Unity:

```text
EngineAudio
├── Idle
├── LowRPM
├── HighRPM
├── Brake
├── Horn
└── Indicator
```

Gunakan AudioMixer.

## Kurangi

- banyak audio source
- spatial audio untuk objek jauh
- loop audio lingkungan yang tidak diperlukan

---

# 41. ENGINE AUDIO

Jangan membuat synthesizer CPU-heavy.

Gunakan:

```text
3–4 audio clips
+
pitch
+
volume
+
crossfade
```

RPM menentukan pitch.

---

# 42. HUD

HUD Unity:

```text
Canvas
├── Speed
├── Gear
├── RPM
├── Engine
├── Handbrake
├── Turn Signal
├── Headlight
├── Timer
├── Score
├── Violations
└── Warning
```

Jangan update seluruh UI setiap frame.

Gunakan update interval:

```text
5–10 Hz
```

untuk informasi yang tidak membutuhkan real-time.

---

# 43. CHECKLIST

Tetap pertahankan checklist inti:

### Semua

- Masuk kendaraan
- Tutup pintu
- Nyalakan mesin
- Lepaskan rem tangan

### Motor

- Helm
- Jaket
- Sarung tangan
- Sepatu

### Mobil/Truk

- Kursi
- Spion
- Sabuk

### Manual

- Kopling
- Gigi satu

Checklist lama mendefinisikan item kendaraan tersebut dan dapat dipertahankan dalam versi Unity. fileciteturn0file0L437-L446

---

# 44. HANDLING SETTINGS

Panel handling lama memiliki banyak parameter real-time. fileciteturn0file0L497-L509

Untuk release:

## Tampilkan hanya

```text
Steering
Brake
Acceleration
Grip
```

## Debug mode

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

# 45. SCORING

Pertahankan:

```text
Score = 100
```

Kurangi karena:

- collision
- off-road
- melanggar lampu
- tidak memberi jalan
- kesalahan transmisi
- tidak menjalankan checklist
- waktu terlalu lama

Gunakan sistem:

```text
ViolationSystem
        ↓
ScoreSystem
        ↓
SimulationResult
```

---

# 46. EVENT-DRIVEN RULE SYSTEM

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
```

Ini jauh lebih ringan.

---

# 47. OBJECT POOLING

Gunakan pooling untuk:

- traffic vehicle
- pedestrian
- temporary warning
- particles
- effects

Jangan:

```text
Instantiate()
Destroy()
Instantiate()
Destroy()
```

berulang selama gameplay.

---

# 48. PARTICLES

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

# 49. CUACA

Roadmap lama menyebut cuaca dinamis sebagai future work. fileciteturn0file0L639-L647

Untuk versi optimized:

## JANGAN IMPLEMENTASI DULU

- hujan realtime
- wet road reflection
- kabut volumetric
- badai
- salju

Cuaca dapat ditambahkan sebagai DLC/phase berikutnya setelah baseline FPS stabil.

---

# 50. GPS

GPS bukan bagian wajib simulasi.

## Default

Hapus dari runtime.

Jika nanti diperlukan:

```text
2D minimap sederhana
```

Jangan menggunakan navigasi 3D kompleks.

---

# 51. IDEAL LINE

Dokumentasi lama memiliki `IdealLine` sebagai panduan visual. fileciteturn0file0L484-L488

Untuk release:

```text
OFF
```

Untuk training:

```text
ON
```

Gunakan satu mesh line sederhana.

---

# 52. DEBUG SYSTEM

Buat:

```text
Debug Mode
```

yang dapat menampilkan:

```text
FPS
CPU
GPU
Vehicle speed
RPM
Gear
Steering
Collision
Current zone
Physics state
```

Debug UI hanya aktif jika:

```text
Development Build
```

---

# 53. TARGET FPS

## PC

```text
Target: 60 FPS
VR PC: 72/80/90 FPS sesuai headset
```

## Quest / standalone VR

```text
Target minimum: 72 FPS
Target ideal: 80/90 FPS jika perangkat mampu
```

Prioritas:

```text
Stable FPS > Graphics Quality
```

---

# 54. QUALITY PRESETS

Buat tiga preset:

## LOW

```text
Shadow: Off/Low
LOD: Aggressive
Traffic: 3
Pedestrian: 1
Texture: 512/1024
Effects: Low
```

## MEDIUM

```text
Shadow: Low
LOD: Medium
Traffic: 5
Pedestrian: 2
Texture: 1024
Effects: Medium
```

## HIGH

```text
Shadow: Medium
LOD: High
Traffic: 8+
Pedestrian: 3+
Texture: 1024/2048
Effects: Medium
```

VR standalone default:

```text
LOW atau MEDIUM
```

---

# 55. ADAPTIVE PERFORMANCE

Buat sistem sederhana:

```text
FPS < target
    ↓
Reduce traffic
    ↓
Reduce shadows
    ↓
Reduce effects
    ↓
Increase LOD culling
```

Jangan langsung mengubah semua setting.

Gunakan beberapa level.

---

# 56. QUALITY MANAGER

```text
PerformanceManager
│
├── FPS Monitor
├── QualityLevel
├── Traffic Limit
├── Shadow Distance
├── LOD Distance
├── Particle Limit
└── Dynamic Resolution
```

Dynamic resolution hanya digunakan jika benar-benar diperlukan dan diuji pada target headset.

---

# 57. ASSET CLEANUP

Dari asset lama:

## Pertahankan

```text
mobil
motor
truck
karakter
```

## Variasi kendaraan

Jangan load semuanya sekaligus.

Dokumentasi lama memiliki beberapa model tambahan seperti BMW, F1 road car, Fortuner, Mercedes, dan truckww2. fileciteturn0file0L467-L479

Gunakan sistem:

```text
Selected Vehicle
↓
Load only selected model
```

Model lain tidak perlu aktif di memory.

---

# 58. SCENE LOADING

Jangan membuat seluruh kota aktif sejak awal.

Gunakan:

```text
Scene
├── Start
├── City01
├── Curve
├── Residential
├── Obstacle
├── City02
└── Finish
```

Bila diperlukan, gunakan additive loading.

Untuk perangkat standalone, targetkan memory usage rendah dan jangan memuat asset yang tidak digunakan.

---

# 59. ADDRESSABLES

Gunakan Addressables hanya untuk:

- model kendaraan alternatif
- map alternatif
- asset besar
- audio besar

Jangan menjadikan seluruh asset kecil sebagai Addressable tanpa alasan.

---

# 60. MEMORY

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

# 61. WEBSITE DAN SIMULASI BERKOMUNIKASI

Jangan menjalankan simulasi Unity di dalam Blazor.

Arsitektur:

```text
Kemudi.Web
    ↓
Launch Simulation
    ↓
Unity Application
    ↓
Simulation Result
    ↓
Kemudi.Api
    ↓
Database
```

Untuk PC:

```text
Blazor Website
+
Unity Simulation
```

Untuk standalone VR:

```text
Unity App
+
API HTTPS
```

---

# 62. HASIL SIMULASI

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
Authenticate
→ Validate
→ Sanitize
→ Save
```

Jangan percaya score mentah dari client.

---

# 63. FITUR YANG HARUS DI-CUT

Untuk release ringan, hapus atau nonaktifkan:

```text
❌ Walking mode sebagai default
❌ Hand tracking sebagai default
❌ Full pedestrian AI
❌ Complex traffic AI
❌ 8 physics substeps
❌ 1600 track sample objects
❌ Top-down camera untuk user
❌ Dynamic weather
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
```

---

# 64. FITUR YANG WAJIB DIPERTAHANKAN

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
✅ Dashboard
✅ Audio dasar
```

---

# 65. INPUT UNIVERSAL

Input harus selalu melewati:

```text
Keyboard
Gamepad
VR Controller
Steering Wheel
      ↓
Input Action
      ↓
VehicleInputState
      ↓
VehicleController
```

`VehicleController` tidak boleh mengetahui apakah input berasal dari keyboard atau VR.

---

# 66. CONTOH INPUT STATE

```csharp
public struct VehicleInputState
{
    public float Steering;
    public float Throttle;
    public float Brake;

    public bool Clutch;
    public bool Handbrake;

    public bool GearUp;
    public bool GearDown;

    public bool EngineToggle;

    public bool LeftSignal;
    public bool RightSignal;
    public bool Hazard;

    public bool Horn;

    public bool CameraToggle;
    public bool Pause;
}
```

---

# 67. KONTROL KEYBOARD

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
```

Mapping tersebut mengikuti kontrol yang sudah terdokumentasi pada project. fileciteturn0file0L319-L344

---

# 68. MANUAL TRANSMISSION

```text
Clutch
   ↓
Gear Change
   ↓
RPM / Gear Ratio
   ↓
Engine Force
```

Stall tetap dipertahankan, tetapi gunakan sistem sederhana.

```text
if clutchMistakeCount >= 3
    StallEngine();
```

---

# 69. AUTOMATIC TRANSMISSION

Gunakan:

```text
RPM
+
Speed
+
Throttle
```

untuk menentukan perpindahan gigi.

Tidak perlu simulasi gearbox kompleks.

---

# 70. MOTOR

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

Semua cukup sebagai model gameplay/edukasi.

---

# 71. MOBIL

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

# 72. TRUK

Gunakan:

- acceleration rendah
- brake lebih berat
- steering lambat
- turning radius besar
- reverse

Jangan membuat physics trailer kompleks pada versi pertama.

---

# 73. TRAILER

Trailer tidak wajib.

Jika ditambahkan:

```text
Optional Module
```

dan hanya aktif pada training truck tertentu.

---

# 74. ROAD COLLIDER

Gunakan satu collider utama.

Jangan:

```text
Collider per potongan jalan kecil
```

Jika mesh collider digunakan, jadikan statis dan optimalkan.

---

# 75. TRIGGER ZONE

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

# 76. OFF-ROAD

Gunakan:

```text
Road Trigger
```

atau road boundary.

Jangan mencari centerline dari ribuan titik setiap frame.

Sistem baru:

```text
Vehicle
↓
IsInsideRoadTrigger?
↓
No → OffRoad
```

---

# 77. SCORING EVENT

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

# 78. PERFORMANCE RULE

Aturan utama:

> Jika suatu sistem tidak terlihat oleh user, tidak memengaruhi simulasi, dan tidak diperlukan untuk penilaian, sistem tersebut tidak boleh berjalan setiap frame.

---

# 79. UPDATE FREQUENCY

| Sistem | Frekuensi |
|---|---:|
| Physics | FixedUpdate |
| Input | Update |
| Camera | LateUpdate |
| HUD speed | 10 Hz |
| Traffic AI | 5–10 Hz |
| Pedestrian | 5 Hz |
| Score UI | Event |
| Warning | Event |
| Audio RPM | 20–30 Hz |
| Environment | Event/LOD |

---

# 80. QUALITY CHECKLIST

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

# 81. TEST TARGET

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

# 82. URUTAN MIGRASI

## PHASE 1 — Website

```text
[ ] Buat Kemudi.sln
[ ] Setup Kemudi.Domain
[ ] Setup Kemudi.Shared
[ ] Setup Kemudi.Infrastructure
[ ] Setup Kemudi.Api
[ ] Setup Kemudi.Web
[ ] Setup EF Core
[ ] Migrasi database
[ ] Migrasi Identity
```

## PHASE 2 — Website UI

```text
[ ] Landing
[ ] Navbar
[ ] Kursus
[ ] Mentor
[ ] Personal
[ ] Payment
[ ] Materi
[ ] Login
[ ] Register
[ ] Dashboard
```

## PHASE 3 — API

```text
[ ] Auth
[ ] Courses
[ ] Mentors
[ ] Vehicles
[ ] Registration
[ ] Payment
[ ] Progress
```

## PHASE 4 — Unity

```text
[ ] Buat Unity project
[ ] Setup URP
[ ] Setup OpenXR
[ ] Setup Input System
[ ] Setup scene
[ ] Import kendaraan
[ ] VehicleController
[ ] VehiclePhysics
[ ] Transmission
[ ] Engine
```

## PHASE 5 — Gameplay

```text
[ ] Track
[ ] Collision
[ ] Traffic light
[ ] Crosswalk
[ ] Obstacles
[ ] Score
[ ] Checklist
[ ] HUD
```

## PHASE 6 — VR

```text
[ ] VR camera
[ ] Controller
[ ] Input mapping
[ ] Dashboard VR
[ ] Interaction
[ ] Comfort
[ ] Performance
```

## PHASE 7 — Optimization

```text
[ ] LOD
[ ] Culling
[ ] Texture compression
[ ] Mesh optimization
[ ] Material reduction
[ ] Lighting optimization
[ ] Physics optimization
[ ] AI optimization
[ ] Audio optimization
```

---

# 83. PRIORITAS PENGERJAAN

## CRITICAL

```text
1. Migrasi website ke Blazor
2. Migrasi API ke ASP.NET Core
3. Migrasi database ke EF Core
4. Buat Unity simulation
5. VehicleController
6. OpenXR
7. Universal Input
8. Stable FPS
```

## HIGH

```text
1. Three vehicle types
2. Manual/Automatic
3. Collision
4. Traffic light
5. Crosswalk
6. Score
7. HUD
8. VR dashboard
```

## MEDIUM

```text
1. Walking mode
2. Hand tracking
3. Advanced traffic
4. More vehicle variants
5. Advanced audio
```

## LOW

```text
1. Weather
2. GPS
3. Multiplayer
4. Advanced AI
5. High-end graphics
6. Dynamic environment
```

---

# 84. DEFINITION OF DONE

Migrasi dianggap selesai jika:

```text
WEBSITE
[✓] Tidak menggunakan Next.js
[✓] Tidak menggunakan React
[✓] Tidak menggunakan TSX
[✓] Tidak menggunakan Prisma
[✓] Tidak menggunakan NextAuth
[✓] Blazor berjalan
[✓] ASP.NET Core API berjalan
[✓] EF Core berjalan
[✓] Login/register berjalan
[✓] Kursus berjalan
[✓] Payment flow berjalan
[✓] Dashboard berjalan
[✓] Progress tersimpan

SIMULATION
[✓] Tidak menggunakan Three.js sebagai engine
[✓] Tidak menggunakan R3F
[✓] Unity C#
[✓] Motor berjalan
[✓] Mobil berjalan
[✓] Truk berjalan
[✓] Manual berjalan
[✓] Automatic berjalan
[✓] Keyboard berjalan
[✓] Gamepad berjalan
[✓] VR controller berjalan
[✓] OpenXR berjalan
[✓] FPV berjalan
[✓] TPV berjalan
[✓] Collision berjalan
[✓] Score berjalan
[✓] Checklist berjalan
[✓] Traffic light berjalan
[✓] Crosswalk berjalan

PERFORMANCE
[✓] LOD aktif
[✓] Culling aktif
[✓] Texture terkompresi
[✓] Material dibatasi
[✓] Physics sederhana
[✓] AI tidak berjalan setiap frame
[✓] Tidak ada collider dekorasi
[✓] Tidak ada 8 substep collision
[✓] VR FPS stabil
```

---

# 85. KESIMPULAN

Arsitektur final Kemudi.id:

```text
                    KEMUDI.ID
                       │
          ┌────────────┴────────────┐
          │                         │
       WEBSITE                  SIMULATION
          │                         │
     ASP.NET CORE                UNITY C#
          │                         │
       BLAZOR                    OPENXR
          │                         │
       EF CORE                INPUT SYSTEM
          │                         │
      SQL SERVER/SQLite       VEHICLE PHYSICS
          │                         │
       REST API                VR / PC / Quest
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

Dengan struktur ini, project tidak lagi mempunyai ketergantungan runtime pada TSX/React/Three.js untuk simulasi. C# menjadi bahasa utama untuk website backend/frontend Blazor dan seluruh simulasi Unity.
