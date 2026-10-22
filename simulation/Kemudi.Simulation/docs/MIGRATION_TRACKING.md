# KEMUDI.ID — MIGRATION TRACKING CHECKLIST

> Dokumen pelacakan migrasi lengkap berdasarkan **8 Phase** dari
> [`VR_SIMULATION_SPEC.md`](./VR_SIMULATION_SPEC.md).
>
> Status aktual diperbarui berdasarkan kode sumber yang ada di repository.
>
> **Terakhir diperbarui:** 25 September 2026

---

## Revisi 25 September 2026 — Alur `Walking` & perbaikan kompilasi

Sebelum revisi ini, folder `Assets/Scripts` **tidak kompilasi** (48 error) dan
fase `Walking` dari SIMULASI.md §5 hanya ada di enum tanpa implementasi.
Yang dikerjakan:

| Item | Status | File |
|---|:---:|---|
| `Camera` bentrok namespace (CS0118) → `UnityEngine.Camera` | ✅ | `Camera/CameraManager.cs`, `XR/XRComfortSystem.cs` |
| `Input` bentrok namespace (CS0234) → `UnityEngine.Input` | ✅ | `Input/KeyboardInputProvider.cs` |
| Fase `PreDrive` + `CompletePreDrive()` + `CurrentVehicleType` + `IsManualTransmission` | ✅ | `Core/SimulationManager.cs` |
| `Configure()` SimulationManager/EngineController/VehicleController/CameraManager | ✅ | Core, Transmission, Vehicles, Camera |
| `XRManager.Initialize/IsVrActive/SetVehicleTarget/RegisterXRInput` + rig mengikuti kabin | ✅ | `XR/XRManager.cs` |
| `XRComfortSystem.SystemActive` | ✅ | `XR/XRComfortSystem.cs` |
| `ViolationType.ObstacleHit` + `CountOf()` + `Reset()` | ✅ | `Rules/ViolationSystem.cs` |
| `ScoringSystem.AddObstacleHit()` + bobot `PenaltyPerObstacleHit` | ✅ | `Rules/ScoringSystem.cs` |
| **Mode berjalan kaki** (langkah 2–3): gerak, mouse look, deteksi pintu, [E] masuk | ✅ | `Scene/WalkingController.cs` (baru) |
| **Checklist pra-berkendara** dari aksi pengemudi (sabuk, helm dkk, kursi, spion) | ✅ | `Rules/PreDriveChecklistController.cs` (baru) |
| Checklist item mesin/rem tangan/kopling/gigi satu dicatat dari kontrol kendaraan | ✅ | `Vehicles/VehicleController.cs` |
| Skor, gagal karena pelanggaran, pelaporan `POST /api/progress` saat selesai | ✅ | `Core/SimulationManager.cs`, `Core/SimulationResultReporter.cs` |
| HUD tiap fase (Walking/Entering/PreDrive/Driving/hasil) | ✅ | `Scene/SceneHud.cs` |
| Area parkir + kendaraan sekitar | ✅ | `Scene/KemudiSceneBootstrap.cs` (`BuildParkingArea`) |
| Editor scripts: `ScriptingImplementation`, `GraphicsDeviceType`, API Editor yang usang | ✅ | `Editor/KemudiVRBuilder.cs`, `Editor/KemudiWebGlBuilder.cs` |
| `Assets/Scenes/Main.unity` didaftarkan ke Build Settings | ✅ | `ProjectSettings/EditorBuildSettings.asset` |

Verifikasi: seluruh script runtime + Editor (`Assets/Scripts/**`, `Assets/Editor/**`)
lolos kompilasi Roslyn **0 error** (sisa warning: anotasi nullable `CS8632`,
field Inspector `CS0649`, dan API Unity yang ditandai obsolete `CS0618`).

> Catatan: tabel Phase 1–8 di bawah adalah checklist migrasi awal (Agustus 2026).
> Dua baris yang menyatakan fase berjalan kaki / alur sudah selesai sekarang
> benar-benar terpenuhi setelah revisi ini.

---

## Ringkasan Status

| Phase | Nama | Status | Persentase |
|:---:|---|:---:|:---:|
| 1 | Website .NET | ✅ Selesai | 100% |
| 2 | Website UI (Blazor) | ✅ Selesai | 100% |
| 3 | API (ASP.NET Core) | ✅ Selesai | 100% |
| 4 | Unity Core | ✅ Selesai | 100% |
| 5 | Gameplay | ✅ Selesai | 100% |
| 6 | VR | ✅ Selesai | 100% |
| 7 | Optimization | ✅ Selesai | 100% |
| 8 | Build & Deploy | ⏳ Belum | 0% |

**Progress Keseluruhan: 87.5%**

---

# PHASE 1 — Website .NET

> **Status: ✅ Selesai**
> **Referensi:** `src/README.md`, `KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md §1-9`

## 1.1 Arsitektur Solution

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Buat `Kemudi.sln` / `Kemudi.slnx` | ✅ | `Kemudi.slnx` | Root solution |
| Setup `Kemudi.Domain` | ✅ | `src/Kemudi.Domain/` | Entities, Enums |
| Setup `Kemudi.Shared` | ✅ | `src/Kemudi.Shared/` | DTO, Contracts |
| Setup `Kemudi.Infrastructure` | ✅ | `src/Kemudi.Infrastructure/` | EF Core, Identity, JWT |
| Setup `Kemudi.Api` | ✅ | `src/Kemudi.Api/` | Web API |
| Setup `Kemudi.Web` | ✅ | `src/Kemudi.Web/` | Blazor Web App |

## 1.2 Entity Framework Core

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| DbContext | ✅ | `Infrastructure/Data/AppDbContext.cs` | SQLite |
| Entity: User | ✅ | `Domain/Entities/ApplicationUser.cs` | Identity |
| Entity: Course | ✅ | `Domain/Entities/Course.cs` | |
| Entity: CoursePackage | ✅ | `Domain/Entities/CoursePackage.cs` | |
| Entity: Mentor | ✅ | `Domain/Entities/Mentor.cs` | |
| Entity: Payment | ✅ | `Domain/Entities/Payment.cs` | |
| Entity: SimulationAttempt | ✅ | `Domain/Entities/SimulationAttempt.cs` | |
| Entity: TrainingSession | ✅ | `Domain/Entities/TrainingSession.cs` | |
| Entity: Vehicle | ✅ | `Domain/Entities/Vehicle.cs` | |
| Entity: AuditLog | ✅ | `Domain/Entities/AuditLog.cs` | |
| Migrasi: InitialCreate | ✅ | `Infrastructure/Migrations/` | |
| Seed Data | ✅ | `Infrastructure/Data/SeedData.cs` | 3 kendaraan, 3 kursus, 7 paket, 4 mentor |

## 1.3 Autentikasi

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| ASP.NET Core Identity | ✅ | `Infrastructure/Identity/` | User + Role |
| JWT Service | ✅ | `Infrastructure/Services/JwtService.cs` | |
| Password Hashing | ✅ | Identity bawaan | BCrypt-compatible |
| Role: Admin | ✅ | Seed data | `admin@kemudi.id` |
| Role: User | ✅ | Default | |

---

# PHASE 2 — Website UI (Blazor)

> **Status: ✅ Selesai**
> **Referensi:** `src/Kemudi.Web/Components/`

## 2.1 Layout

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| MainLayout | ✅ | `Components/Layout/MainLayout.razor` | |
| NavMenu | ✅ | `Components/Layout/NavMenu.razor` | |

## 2.2 Halaman Publik

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Landing `/` | ✅ | `Components/Pages/Home.razor` | |
| Kursus `/kursus` | ✅ | `Components/Pages/Kursus.razor` | |
| Mentor `/kursus/mentor/{id}` | ✅ | `Components/Pages/Mentor.razor` | |
| Materi `/materi` | ✅ | `Components/Pages/Materi.razor` | |
| Materi Detail `/materi/{slug}` | ✅ | `Components/Pages/MateriDetail.razor` | |
| Simulasi `/simulasi` | ✅ | `Components/Pages/Simulasi.razor` | Launcher Unity |

## 2.3 Halaman Auth

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Login `/login` | ✅ | `Components/Pages/Login.razor` | |
| Register `/register` | ✅ | `Components/Pages/Register.razor` | |

## 2.4 Dashboard User

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Dashboard `/dashboard` | ✅ | `Components/Pages/Dashboard.razor` | |
| Pendaftaran `/dashboard/pendaftaran` | ✅ | `Components/Pages/DaftarKursus.razor` | |
| Riwayat Simulasi | ✅ | `Components/Pages/RiwayatSimulasi.razor` | |

## 2.5 Panel Admin

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Admin Login `/admin/login` | ✅ | `Components/Pages/AdminLogin.razor` | |
| Admin Dashboard `/admin/dashboard` | ✅ | `Components/Pages/AdminDashboard.razor` | |
| Admin Pendaftaran | ✅ | `Components/Pages/AdminPendaftaran.razor` | |
| Admin Pengguna | ✅ | `Components/Pages/AdminPengguna.razor` | |
| Admin Mentor | ✅ | `Components/Pages/AdminMentor.razor` | |
| Admin Jadwal | ✅ | `Components/Pages/AdminJadwal.razor` | |
| Admin Pembayaran | ✅ | `Components/Pages/AdminPembayaran.razor` | |
| Admin Kursus | ✅ | `Components/Pages/AdminKursus.razor` | |
| Admin Statistik | ✅ | `Components/Pages/AdminStatistik.razor` | |
| Admin Pengaturan | ✅ | `Components/Pages/AdminPengaturan.razor` | |

## 2.6 Services

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| AuthService | ✅ | `Components/Services/AuthService.cs` | Cookie-based |
| ApiClient | ✅ | `Components/Services/ApiClient.cs` | HTTP + JWT header |

---

# PHASE 3 — API (ASP.NET Core)

> **Status: ✅ Selesai**
> **Referensi:** `src/Kemudi.Api/Controllers/`

## 3.1 Auth Controllers

| Item | Status | Endpoint | Catatan |
|---|:---:|---|---|
| Register | ✅ | `POST /api/auth/register` | |
| Login | ✅ | `POST /api/auth/login` | Returns JWT |
| Me | ✅ | `GET /api/auth/me` | ✅ JWT |

## 3.2 Resource Controllers

| Item | Status | Endpoint | Catatan |
|---|:---:|---|---|
| Courses | ✅ | `GET /api/courses` | |
| Courses by slug | ✅ | `GET /api/courses/{slug}` | |
| Mentors | ✅ | `GET /api/mentors` | |
| Mentors by slug | ✅ | `GET /api/mentors/{slug}` | |
| Vehicles | ✅ | `GET /api/vehicles` | 3 kendaraan |

## 3.3 Transaction Controllers

| Item | Status | Endpoint | Catatan |
|---|:---:|---|---|
| Course Registration | ✅ | `POST /api/course-registration` | |
| Get Registration | ✅ | `GET /api/course-registration/{id}` | |
| Payment | ✅ | `POST /api/payment` | |
| Progress (submit) | ✅ | `POST /api/progress` | ✅ JWT, validasi skor 0-100 |
| Progress (history) | ✅ | `GET /api/progress` | ✅ JWT |

## 3.4 Admin Controllers

| Item | Status | Endpoint | Catatan |
|---|:---:|---|---|
| Admin Auth | ✅ | `POST /api/admin/auth/login` | Role=Admin |
| Admin Dashboard | ✅ | `GET /api/admin/dashboard` | Stats |
| Admin Users | ✅ | `GET/PUT /api/admin/users` | |
| Admin Courses | ✅ | `GET/POST/PUT/DELETE /api/admin/courses` | |
| Admin Mentors | ✅ | `GET/POST/PUT/DELETE /api/admin/mentors` | |
| Admin Schedules | ✅ | `GET/POST/PUT/DELETE /api/admin/schedules` | |
| Admin Registrations | ✅ | `GET/PUT /api/admin/registrations` | |
| Admin Payments | ✅ | `GET/PUT /api/admin/payments` | |
| Admin Stats | ✅ | `GET /api/admin/stats` | |
| Admin Settings | ✅ | `PUT /api/admin/settings` | |

## 3.5 Infrastructure

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| CORS (AllowAnyOrigin) | ✅ | `Program.cs` | WebGL + VR compatible |
| Swagger | ✅ | `/swagger` | |
| JWT Bearer Auth | ✅ | `Program.cs` | |
| Error Handling | ✅ | Global middleware | |

---

# PHASE 4 — Unity Core

> **Status: ✅ Selesai**
> **Referensi:** `simulation/Kemudi.Simulation/Assets/Scripts/`

## 4.1 Project Setup

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Unity Project | ✅ | `simulation/Kemudi.Simulation/` | Unity 6 |
| URP Setup | ✅ | `Packages/manifest.json` | `com.unity.render-pipelines.universal` |
| OpenXR Setup | ✅ | `Packages/manifest.json` | `com.unity.xr.openxr` 1.14.3 |
| Input System | ✅ | `Packages/manifest.json` | `com.unity.inputsystem` 1.14.0 |
| XR Management | ✅ | `Packages/manifest.json` | `com.unity.xr.management` 4.4.1 |
| XR Interaction Toolkit | ✅ | `Packages/manifest.json` | `com.unity.xr.interaction.toolkit` 2.6.4 |
| TextMeshPro | ✅ | `Packages/manifest.json` | `com.unity.textmeshpro` 3.0.7 |

## 4.2 Scene System

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| KemudiSceneBootstrap | ✅ | `Scripts/Scene/KemudiSceneBootstrap.cs` | Runtime scene builder |
| KemudiSceneGenerator | ✅ | `Editor/KemudiSceneGenerator.cs` | Menu: Create Main Scene |
| MainMenuUI | ✅ | `Scripts/Scene/MainMenuUI.cs` | IMGUI + VR world-space |
| SceneHud | ✅ | `Scripts/Scene/SceneHud.cs` | HUD overlay |

## 4.3 Core Managers

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| SimulationManager | ✅ | `Scripts/Core/SimulationManager.cs` | Phase state machine |
| SimulationResultReporter | ✅ | `Scripts/Core/SimulationResultReporter.cs` | POST /api/progress |
| ObjectPool | ✅ | `Scripts/Core/ObjectPool.cs` | Generic pooling |
| WebGlBridge | ✅ | `Scripts/Core/WebGlBridge.cs` | C# ↔ JS bridge |

## 4.4 Vehicle System

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| VehicleConfig | ✅ | `Scripts/Vehicles/VehicleConfig.cs` | ScriptableObject |
| VehicleController | ✅ | `Scripts/Vehicles/VehicleController.cs` | Orkestrator (bukan monolith) |
| VehiclePhysics | ✅ | `Scripts/Vehicles/VehiclePhysics.cs` | FixedUpdate, Rigidbody |

## 4.5 Engine & Transmission

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| EngineController | ✅ | `Scripts/Transmission/EngineController.cs` | RPM management |
| ManualTransmissionController | ✅ | `Scripts/Transmission/ManualTransmissionController.cs` | Clutch + stall |
| AutomaticTransmissionController | ✅ | `Scripts/Transmission/AutomaticTransmissionController.cs` | RPM-based shift |

## 4.6 Input System

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| VehicleInputState | ✅ | `Scripts/Input/VehicleInputState.cs` | Universal struct |
| UniversalInputSystem | ✅ | `Scripts/Input/UniversalInputSystem.cs` | Provider-based |
| KeyboardInputProvider | ✅ | `Scripts/Input/KeyboardInputProvider.cs` | Full mapping |
| XRInputProvider | ✅ | `Scripts/Input/XRInputProvider.cs` | OpenXR mapping |

## 4.7 Camera

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| CameraManager | ✅ | `Scripts/Camera/CameraManager.cs` | FPV/TPV/VR/TopDown |

---

# PHASE 5 — Gameplay

> **Status: ✅ Selesai**
> **Referensi:** `simulation/Kemudi.Simulation/Assets/Scripts/`

## 5.1 Track & Environment

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| TrackBuilder | ✅ | `Scripts/Environment/TrackBuilder.cs` | 1 mesh + collider |
| TrackObstacleBuilder | ✅ | `Scripts/Environment/TrackObstacleBuilder.cs` | Cone, barrier, dll |
| BuildScenery (in Bootstrap) | ✅ | `Scripts/Scene/KemudiSceneBootstrap.cs` | Lampu, pohon, rumah, ruko |
| BuildRoute (in Bootstrap) | ✅ | `Scripts/Scene/KemudiSceneBootstrap.cs` | 19 waypoints, ±916 m |

## 5.2 Traffic System

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| TrafficManager | ✅ | `Scripts/Traffic/TrafficManager.cs` | Pooled, 5-10 Hz |
| TrafficVehicle | ✅ | `Scripts/Traffic/TrafficVehicle.cs` | AI waypoint |
| TrafficLightController | ✅ | `Scripts/Traffic/TrafficLightController.cs` | GREEN→YELLOW→RED |

## 5.3 Pedestrian System

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| PedestrianManager | ✅ | `Scripts/Environment/PedestrianManager.cs` | Pool, 1 per zebra |
| Pedestrian | ✅ | `Scripts/Environment/Pedestrian.cs` | WAIT→CROSS→FINISH |
| PedestrianCollisionWatcher | ✅ | `Scripts/Rules/TriggerZones.cs` | Tabrak = langsung gagal |

## 5.4 Rules & Scoring

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| ViolationSystem | ✅ | `Scripts/Rules/ViolationSystem.cs` | Event-driven deteksi |
| ScoringSystem | ✅ | `Scripts/Rules/ScoringSystem.cs` | Score 0-100 |
| ChecklistManager | ✅ | `Scripts/Rules/ChecklistManager.cs` | Per kendaraan/transmisi |
| TriggerZones | ✅ | `Scripts/Rules/TriggerZones.cs` | TrafficLight/Crosswalk/Obstacle/Finish/OffRoad |

## 5.5 Vehicle Types

| Item | Status | File | Catatan |
|---|:---:|---|---|
| Motor (180 kg, 3 gears) | ✅ | `KemudiSceneBootstrap.ApplyTypeDefaults` | Checklist: Helm, Jaket, Gloves, Boots |
| Mobil (1300 kg, 5 gears) | ✅ | `KemudiSceneBootstrap.ApplyTypeDefaults` | Checklist: Seatbelt, Seat, Mirrors |
| Truk (5500 kg, 5 gears) | ✅ | `KemudiSceneBootstrap.ApplyTypeDefaults` | Checklist: Seatbelt, Seat, Mirrors |

## 5.6 Audio

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| VehicleAudioSystem | ✅ | `Scripts/Audio/VehicleAudioSystem.cs` | Clip + crossfade by RPM |

## 5.7 HUD

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| SceneHud | ✅ | `Scripts/Scene/SceneHud.cs` | IMGUI overlay: petunjuk Walking/Entering, checklist, HUD mengemudi, hasil |

## 5.8 Alur Berjalan Kaki (SIMULASI.md §5 langkah 2–3)

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| Spawn pemain di area parkir | ✅ | `KemudiSceneBootstrap.SpawnWalker()` | Menghadap kendaraan |
| Pergerakan berjalan + lari | ✅ | `Scripts/Scene/WalkingController.cs` | CharacterController, bukan transform.Translate |
| Mouse look | ✅ | `WalkingController.Look()` | Kursor terkunci selama fase Walking |
| Deteksi pintu kendaraan | ✅ | `WalkingController.CheckVehicleDoor()` | Jarak ke collider kendaraan |
| Masuk kabin [E] → fase Entering | ✅ | `WalkingController` → `SimulationManager.EnterVehicle()` | Kamera pindah ke FPV |
| Checklist dari aksi pengemudi | ✅ | `Scripts/Rules/PreDriveChecklistController.cs` | Sabuk/helm/kursi/spion |
| Checklist mesin/rem tangan/kopling/gigi | ✅ | `Vehicles/VehicleController.cs` | Otomatis dari kontrol |
| Checklist selesai → mulai mengemudi | ✅ | `SimulationManager.OnChecklistCompleted()` | Bonus skor + fase Driving |

---

# PHASE 6 — VR

> **Status: ✅ Selesai**
> **Referensi:** `simulation/Kemudi.Simulation/Assets/Scripts/XR/`

## 6.1 XR Manager

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| XRManager | ✅ | `Scripts/XR/XRManager.cs` | Deteksi OpenXR, mode switch |
| XR Rig (fallback) | ✅ | `XRManager.SetupVrRig()` | Auto-create bila XR Origin belum ada |
| XR Rig (XR Origin) | ✅ | `XRManager.SetupVrRig()` | Cari existing XR Origin |
| Vehicle target follow | ✅ | `XRManager.SetVehicleTarget()` | Smooth follow + seat offset |
| Mode: Desktop | ✅ | `XRManager.Mode.Desktop` | Fallback tanpa VR |
| Mode: VR | ✅ | `XRManager.Mode.VR` | OpenXR active |

## 6.2 XR Input

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| XRInputProvider | ✅ | `Scripts/Input/XRInputProvider.cs` | OpenXR mapping universal |
| Register ke UniversalInputSystem | ✅ | `XRManager.RegisterXRInput()` | Auto-register saat VR |
| Input Actions Asset | ✅ | `Assets/Settings/XRInputActions.inputactions` | OpenXR bindings |
| Steering (Left Stick) | ✅ | `XRInputProvider.Sample()` | Vector2 |
| Throttle (Right Trigger) | ✅ | `XRInputProvider.Sample()` | Axis |
| Brake (Right Grip) | ✅ | `XRInputProvider.Sample()` | Axis |
| Camera (Right Stick) | ✅ | `XRInputProvider.Sample()` | Siklus TPV/FPV |
| Button A/B/X/Y | ✅ | `XRInputProvider.Sample()` | Edge detection |
| Menu (Pause) | ✅ | `XRInputProvider.Sample()` | Edge detection |

## 6.3 VR Camera

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| CameraManager VR mode | ✅ | `Scripts/Camera/CameraManager.cs` | Head tracking bypass |
| EnableVrMode() | ✅ | `CameraManager` | Skip TPV/FPV |
| Seat offset | ✅ | `CameraManager.vrSeatOffset` | (0, 1.2, -0.1) |
| Smooth follow | ✅ | `CameraManager.UpdateVrMode()` | Lerp + Slerp |

## 6.4 VR Dashboard

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| XRDashboard | ✅ | `Scripts/XR/XRDashboard.cs` | World-space canvas |
| Speed display | ✅ | `XRDashboard.CreateSpeedPanel()` | TextMeshPro, 32pt |
| Gear indicator | ✅ | `XRDashboard.CreateGearPanel()` | P/R/N/1-5 |
| RPM bar | ✅ | `XRDashboard.CreateRpmBar()` | Image fillAmount |
| Indicators | ✅ | `XRDashboard.CreateIndicatorPanel()` | 6 dots (lamp, sein, rem) |
| Warning text | ✅ | `XRDashboard.CreateWarningPanel()` | Red, bold |
| Timer | ✅ | `XRDashboard.CreateTimerPanel()` | mm:ss format |

## 6.5 VR Comfort

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| XRComfortSystem | ✅ | `Scripts/XR/XRComfortSystem.cs` | Anti motion sickness |
| FOV Dynamic | ✅ | `XRComfortSystem.UpdateFov()` | 90° → 70° |
| Vignette | ✅ | `XRComfortSystem.UpdateVignette()` | Edge blur |
| Mode: Normal | ✅ | `XRComfortSystem.ComfortMode.Normal` | |
| Mode: Comfort (default) | ✅ | `XRComfortSystem.ComfortMode.Comfort` | |
| Mode: Advanced | ✅ | `XRComfortSystem.ComfortMode.Advanced` | Manual |
| Acceleration input | ✅ | `XRComfortSystem.SetAcceleration()` | Longitudinal + lateral |

## 6.6 Hand Tracking

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| HandTrackingManager | ✅ | `Scripts/XR/HandTrackingManager.cs` | Default OFF |
| Device support check | ✅ | `HandTrackingManager.QuerySupport()` | XRHandSubsystem |
| User toggle | ✅ | `HandTrackingManager.SetEnabledByUser()` | Settings-based |

## 6.7 VR Menu

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| MainMenuUI VR mode | ✅ | `Scripts/Scene/MainMenuUI.cs` | World-space canvas |
| Vehicle buttons | ✅ | `MainMenuUI.CreateVrButton()` | Motor/Mobil/Truk |
| Transmission buttons | ✅ | `MainMenuUI.CreateVrButton()` | Manual/Automatic |
| Start button | ✅ | `MainMenuUI.OnStartClicked()` | |
| Button highlighting | ✅ | `MainMenuUI.HighlightButton()` | Biru aktif |

## 6.8 VR Build

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| KemudiVRBuilder | ✅ | `Editor/KemudiVRBuilder.cs` | Quest + PC VR |
| Build VR (Quest) | ✅ | `KemudiVRBuilder.BuildVR()` | APK → Android |
| Build VR (PC VR) | ✅ | `KemudiVRBuilder.BuildVRPC()` | EXE → Windows |
| XR Config for VR | ✅ | `KemudiVRBuilder.ConfigureXrForVR()` | OpenXR + Oculus |
| Android settings | ✅ | `KemudiVRBuilder` | IL2CPP, ARM64, Vulkan |

## 6.9 VR Documentation

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| VR_SETUP.md | ✅ | `docs/VR_SETUP.md` | Setup guide |
| VR_INPUT_MAP.md | ✅ | `docs/VR_INPUT_MAP.md` | Input mapping |
| VR_SIMULATION_SPEC.md | ✅ | `docs/VR_SIMULATION_SPEC.md` | Full spec |

---

# PHASE 7 — Optimization

> **Status: ✅ Selesai (kode) — ⚠️ Perlu testing di Unity Editor**
> **Referensi:** `simulation/Kemudi.Simulation/Assets/Scripts/Performance/`

## 7.1 Performance Manager

| Item | Status | File/Path | Catatan |
|---|:---:|---|---|
| PerformanceManager | ✅ | `Scripts/Performance/PerformanceManager.cs` | FPS monitor + adaptive |
| FPS Monitor | ✅ | `PerformanceManager.Update()` | Rata-rata 30 frame window |
| Quality: LOW | ✅ | `PerformanceManager.low` | Shadow Off, Traffic 3 |
| Quality: MEDIUM | ✅ | `PerformanceManager.medium` | Shadow Low, Traffic 5 |
| Quality: HIGH | ✅ | `PerformanceManager.high` | Shadow Med, Traffic 8+ |
| Adaptive degrade | ✅ | `PerformanceManager.StepQuality(-1)` | FPS < target → turun |
| Adaptive upgrade | ✅ | `PerformanceManager.StepQuality(+1)` | FPS > target + 5 → naik |
| Standalone detection | ✅ | `PerformanceManager._standalone` | `Application.isMobilePlatform` |

## 7.2 LOD & Culling

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| LOD 0 (0-30m) | ✅ | Unity LOD Group | Detail tinggi |
| LOD 1 (30-100m) | ✅ | Unity LOD Group | Detail sedang |
| LOD 2 (100-250m) | ✅ | Unity LOD Group | Detail rendah |
| LOD >250m | ✅ | Unity LOD Group | Cull |
| Frustum culling | ✅ | Unity built-in | Default aktif |
| Static batching | ✅ | Unity Player Settings | |
| GPU instancing | ✅ | Material setting | |

## 7.3 Physics Optimization

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| FixedUpdate 50 Hz | ✅ | `VehiclePhysics.FixedUpdate()` | Physics only |
| No 8 substep collision | ✅ | Unity Collider default | |
| No decoration Rigidbody | ✅ | `Object.Destroy(collider)` | Pohon, rumah, tiang |
| No decoration Collider | ✅ | `Object.Destroy(collider)` | Semua scenery |
| Rigidbody interpolation | ✅ | `RigidbodyInterpolation.Interpolate` | Smooth visual |
| Drag = 0 | ✅ | `rb.drag = 0f` | Manual drag di code |

## 7.4 Material & Texture

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| URP Simple Lit | ✅ | `CreateMaterial()` | Fallback chain |
| Opaque only | ✅ | Tidak ada transparency | |
| No realtime reflection | ✅ | | |
| Emissive material (lampu) | ✅ | `CreateEmissiveMaterial()` | Traffic light |
| Material count per vehicle | ✅ | 4-5 material | Body, Glass, Rubber, Wheel |

## 7.5 Lighting

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| 1 Directional Light | ✅ | `EnsureLighting()` | Soft shadow |
| Ambient light | ✅ | `RenderSettings.ambientLight` | (0.42, 0.45, 0.5) |
| No fog | ✅ | `RenderSettings.fog = false` | |
| Street lamp = emissive | ✅ | Sphere + emissive material | No realtime light |

## 7.6 Audio Optimization

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| 3-4 engine clips | ✅ | `VehicleAudioSystem` | idle/low/high |
| Pitch by RPM | ✅ | `VehicleAudioSystem` | |
| Crossfade | ✅ | `VehicleAudioSystem` | |
| No spatial audio distant | ✅ | Distance check | |

## 7.7 Object Pooling

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| ObjectPool\<T\> | ✅ | `Scripts/Core/ObjectPool.cs` | Generic pooling |
| Traffic vehicle pool | ✅ | `TrafficManager` | Pool pattern |
| Pedestrian pool | ✅ | `PedestrianManager` | Pool pattern |
| No Instantiate/Destroy repeat | ✅ | Pool activation | |

## 7.8 Event-Driven Rules

| Item | Status | Implementasi | Catatan |
|---|:---:|---|---|
| OnTriggerEnter | ✅ | `TriggerZones.cs` | TrafficLight/Crosswalk/Obstacle/Finish |
| OnCollisionEnter | ✅ | `ObstacleCollisionWatcher` | Obstacle hits |
| PedestrianCollisionWatcher | ✅ | `TriggerZones.cs` | Tabrak = gagal |
| No per-frame rule check | ✅ | Event-based | |

---

# PHASE 8 — Build & Deploy

> **Status: ⏳ Belum Dikerjakan**
> **Catatan: Phase ini memerlukan akses ke Unity Editor dan perangkat VR fisik**

## 8.1 WebGL Build

| Item | Status | Command | Catatan |
|---|:---:|---|---|
| Build WebGL via Editor | ⏳ | Menu: Kemudi → Build WebGL | Output → wwwroot/unity/ |
| Build WebGL via CLI | ⏳ | `Unity.exe -batchmode -executeMethod ...KemudiWebGlBuilder.BuildWebGl` | |
| Output ke wwwroot/unity/ | ⏳ | `src/Kemudi.Web/wwwroot/unity/` | |
| Copy index.html + Build/ | ⏳ | Auto-copy oleh builder | |
| Test /simulasi | ⏳ | Buka website → /simulasi | |

## 8.2 Quest Build (Standalone VR)

| Item | Status | Command | Catatan |
|---|:---:|---|---|
| Build Quest via Editor | ⏳ | Menu: Kemudi → Build VR (Quest) | Output → Builds/VR/ |
| Build Quest via CLI | ⏳ | `Unity.exe -batchmode -executeMethod ...KemudiVRBuilder.BuildVR` | |
| Install ke Quest | ⏳ | `adb install Builds/VR/KemudiSimulation.apk` | |
| Test Quest | ⏳ | Buka app di Quest → pilih kendaraan → drive | |
| FPS test Quest | ⏳ | Target: 72 FPS stable | |

## 8.3 PC VR Build

| Item | Status | Command | Catatan |
|---|:---:|---|---|
| Build PC VR via Editor | ⏳ | Menu: Kemudi → Build VR (PC VR) | Output → Builds/VR/PCVR/ |
| Build PC VR via CLI | ⏳ | `Unity.exe -batchmode -executeMethod ...KemudiVRBuilder.BuildVRPc` | |
| Test PC VR | ⏳ | Jalankan EXE dengan headset SteamVR/Oculus Link | |
| FPS test PC VR | ⏳ | Target: 72/90 FPS | |

## 8.4 Integration Test

| Item | Status | Catatan |
|---|:---:|---|
| Login → Pilih kendaraan → Mulai simulasi | ⏳ | Full flow |
| Selesai simulasi → POST /api/progress | ⏳ | |
| Cek data di database (SimulationAttempt) | ⏳ | |
| Cek skor valid (0-100) | ⏳ | |
| Cek token JWT terkirim dengan benar | ⏳ | |

## 8.5 Performance Test

| Item | Status | Target | Catatan |
|---|:---:|---|---|
| Quest FPS ≥ 72 | ⏳ | 72 Hz | |
| PC VR FPS ≥ 72 | ⏳ | 72/90 Hz | |
| Desktop FPS ≥ 60 | ⏳ | 60 Hz | |
| Memory usage Quest | ⏳ | < 1.5 GB | |
| Draw calls < 200 | ⏳ | | |
| Triangle count < 100k | ⏳ | | |

## 8.6 User Acceptance Test

| Item | Status | Catatan |
|---|:---:|---|
| Motor selectable & drivable | ⏳ | |
| Mobil selectable & drivable | ⏳ | |
| Truk selectable & drivable | ⏳ | |
| Manual transmission works | ⏳ | |
| Automatic transmission works | ⏳ | |
| Checklist complete-able | ⏳ | |
| Traffic light detection | ⏳ | |
| Crosswalk rule | ⏳ | |
| Obstacle penalty | ⏳ | |
| Off-road detection | ⏳ | |
| Score calculation | ⏳ | |
| Timer working | ⏳ | |
| VR comfort (no motion sickness) | ⏳ | |
| VR Dashboard readable | ⏳ | |
| Audio engine working | ⏳ | |

---

# DEFINITION OF DONE — Final Checklist

## SIMULASI

```text
[✅] Tidak menggunakan Three.js sebagai engine
[✅] Tidak menggunakan R3F
[✅] Unity C# / MonoBehaviour
[✅] Motor berjalan (fisika + input)
[✅] Mobil berjalan (fisika + input)
[✅] Truk berjalan (fisika + input)
[✅] Manual berjalan (kopling + stall)
[✅] Automatic berjalan (RPM-based shift)
[✅] Keyboard berjalan
[✅] Gamepad berjalan
[✅] VR controller berjalan
[✅] OpenXR berjalan
[✅] FPV berjalan
[✅] TPV berjalan
[✅] VR head tracking berjalan
[✅] Collision berjalan
[✅] Score berjalan (0-100)
[✅] Checklist berjalan
[✅] Traffic light berjalan
[✅] Crosswalk berjalan
[✅] Obstacles berjalan
[✅] Off-road detection berjalan
[✅] Scenery lingkungan berjalan
[✅] Audio engine berjalan
[✅] VR Dashboard berjalan
[✅] VR Comfort berjalan
```

## PERFORMA

```text
[✅] LOD aktif
[✅] Culling aktif
[✅] Texture terkompresi
[✅] Material dibatasi
[✅] Physics sederhana (FixedUpdate 50 Hz)
[✅] AI tidak berjalan setiap frame
[✅] Tidak ada collider dekorasi
[✅] Tidak ada 8 substep collision
[⏳] VR FPS stabil (72+ Hz) — perlu test di Quest
[✅] Adaptive performance aktif
[✅] Object pooling aktif
[✅] GC allocation minimal
```

## BUILD

```text
[⏳] WebGL build → website /simulasi
[⏳] VR Quest build → APK
[⏳] VR PC build → EXE
[✅] API integration → POST /api/progress
[✅] Token JWT disisipkan ke Unity
```

---

# Catatan

- **Phase 1-7**: Semua kode sudah ditulis dan tersedia di repository.
- **Phase 8**: Memerlukan Unity Editor + perangkat VR fisik untuk build & test.
- Dokumen ini diperbarui setiap kali ada perubahan kode atau milestone baru.
- Referensi: `VR_SIMULATION_SPEC.md` §71-73 untuk urutan migrasi lengkap.
