# VR SETUP — Kemudi.id Simulation

> Panduan setup VR untuk simulasi mengemudi Kemudi.id.
> Mendukung **Meta Quest 2/3/Pro** (standalone) dan **PC VR** (OpenXR).

---

## 1. Prasyarat

### Software
| Software | Versi | Catatan |
|---|---|---|
| Unity Editor | 6 / 2022.3 LTS | Dengan modul **Android Build Support** |
| Android SDK | API 29+ | Via Unity Hub → Add Modules |
| NDK | r23+ | Via Unity Hub → Add Modules |
| OpenJDK | 11+ | Via Unity Hub → Add Modules |
| ADB | Latest | Untuk install APK ke Quest |

### Hardware
- **Meta Quest 2/3/Pro** (untuk standalone VR)
- **PC VR headset** (SteamVR / Oculus Link) untuk PC VR
- **Kabel USB-C** untuk development (Quest ↔ PC)

---

## 2. Setup Unity Project

### 2.1 Install Packages

Buka **Window → Package Manager** dan install:

| Package | Versi | Purpose |
|---|---|---|
| `com.unity.xr.management` | 4.4.1+ | XR Plugin Management |
| `com.unity.xr.openxr` | 1.14.3+ | OpenXR support |
| `com.unity.xr.interaction.toolkit` | 2.6.4+ | XR Interaction (opsional) |
| `com.unity.inputsystem` | 1.14.0+ | New Input System |
| `com.unity.textmeshpro` | 3.0.7+ | Text untuk VR Dashboard |

### 2.2 Configure XR Plugin Management

1. Buka **Edit → Project Settings → XR Plug-in Management**
2. Tab **Android** (Quest):
   - ✅ Centang **OpenXR**
   - Klik icon gear di sebelah OpenXR
   - Di **Interaction Profiles**, tambahkan:
     - **Oculus Touch Controller Profile**
     - **Khronos Simple Controller** (opsional)
3. Tab **PC** (Desktop VR):
   - ✅ Centang **OpenXR**
   - Tambahkan interaction profile yang sama

### 2.3 Configure Input System

1. Buka **Edit → Project Settings → Player → Other Settings**
2. Set **Active Input Handling** ke:
   - **Both** (recommended) — mendukung Input Manager lama + Input System baru
3. Buka **Window → Package Manager** → pastikan `com.unity.inputsystem` terinstall

### 2.4 Import XR Input Actions

1. File `Assets/Settings/XRInputActions.inputactions` sudah tersedia di proyek.
2. Buka file tersebut di Inspector.
3. Klik **"Generate C# Class"** → set class name ke `Kemudi.XRInputActions`.
4. Apply — Unity akan generate wrapper class untuk input actions.

---

## 3. Setup Scene

### 3.1 Generate Scene

1. Menu **Kemudi → Create Main Scene** — membuat `Assets/Scenes/Main.unity`.
2. Tekan **Play** — scene akan dibangun otomatis dari kode.
3. Di VR headset, Anda akan melihat menu pilih kendaraan.

### 3.2 Wire XR Input Provider (Manual)

Jika XR Input Provider belum ter-wire otomatis:

1. Di scene, cari GameObject **"XR Manager"** (dibangun oleh `KemudiSceneBootstrap`).
2. Di Inspector, assign **Input Action References** pada `XRInputProvider`:
   - `moveAction` → XR Vehicle / Steering
   - `triggerAction` → XR Vehicle / Throttle
   - `gripAction` → XR Vehicle / Brake
   - `lookAction` → XR Vehicle / Look
   - `buttonA` → XR Vehicle / ButtonA
   - `buttonB` → XR Vehicle / ButtonB
   - `buttonX` → XR Vehicle / ButtonX
   - `buttonY` → XR Vehicle / ButtonY
   - `menuAction` → XR Vehicle / Menu

### 3.3 VR Rig (Optional)

Jika ingin menggunakan XR Origin prefab dari XR Interaction Toolkit:

1. Import **XR Origin** prefab dari package samples.
2. Tempatkan di scene (sebagai child dari `XRManager`).
3. Assign ke field `vrRig` di `XRManager` Inspector.

**Tanpa prefab**: `XRManager` akan membuat fallback rig otomatis (cukup untuk testing).

---

## 4. Build & Deploy

### 4.1 Build ke Meta Quest (Standalone)

**Via Unity Editor:**
1. Menu **Kemudi → Build VR (Quest)**
2. APK akan di-build ke `Builds/VR/KemudiSimulation.apk`
3. Install ke Quest:
   ```bash
   adb install Builds/VR/KemudiSimulation.apk
   ```
4. Buka **Unknown Sources** di Quest → jalankan **Kemudi Simulation**

**Via Command Line:**
```bash
"<Unity Editor path>/Unity.exe" -batchmode -quit \
  -projectPath simulation/Kemudi.Simulation \
  -executeMethod Kemudi.Simulation.EditorTools.KemudiVRBuilder.BuildVR \
  -logFile build-vr.log
```

### 4.2 Build ke PC VR

**Via Unity Editor:**
1. Menu **Kemudi → Build VR (PC VR)**
2. EXE akan di-build ke `Builds/VR/PCVR/KemudiSimulation.exe`
3. Jalankan EXE dengan headset VR terhubung (SteamVR / Oculus Link)

### 4.3 Testing di Editor (Simulasi VR)

Untuk testing tanpa headset:

1. **Edit → Project Settings → XR Plug-in Management → Desktop**
2. Centang **Mock HMD** (atau install **XR Device Simulator**)
3. Tekan **Play** — gunakan keyboard/mouse untuk simulasi controller
4. **Window → Analysis → XR Plugin Management** → lihat status XR

---

## 5. VR Input Mapping (§31)

### Quest Controller Mapping

| Kontrol | Quest Button | Fungsi |
|---|---|---|
| Left Stick X | Thumbstick Kiri X | **Steering** (belok kiri/kanan) |
| Right Stick | Thumbstick Kanan | **Camera** (siklus TPV ↔ FPV) |
| Right Trigger | Index Trigger Kanan | **Gas** (throttle) |
| Right Grip | Grip Kanan | **Rem** (brake) |
| A (Kanan) | A Button | **Action / Enter / Confirm** |
| B (Kanan) | B Button | **Cancel / Exit** |
| X (Kiri) | X Button | **Gear Down** |
| Y (Kiri) | Y Button | **Gear Up** |
| Menu (Kiri) | Menu Button | **Pause** |

### Checklist Items (VR)

| Kontrol | Item Checklist |
|---|---|
| A (hold) | Sabuk (Mobil/Truk) |
| X (hold) | Helm (Motor) |
| Y (hold) | Jaket (Motor) |
| B (hold) | Sarung tangan (Motor) |
| Grip (hold) | Sepatu (Motor) |

### Universal Mapping

Mapping ini **tidak terkunci** pada satu merek headset (§31).
Bisa diatur ulang lewat **Unity Input System** → `XRInputActions.inputactions`.

---

## 6. VR Comfort Features (§33)

### XRComfortSystem

- **FOV Dynamic**: FOV dipersempit saat akselerasi tinggi / menikung tajam.
- **Vignette**: Edge blur ringan saat guncangan (anti motion sickness).
- **Mode**: Normal / Comfort / Advanced (atur di Inspector).

### Performa

- **Target FPS**: 72 Hz (Quest 2), 90 Hz (Quest 3/Pro).
- **Rendering**: Single-pass instanced (XR).
- **Shadow**: Low / Off untuk Quest.
- **LOD**: Agresif (0-20m detail, >100m cull).

---

## 7. VR Dashboard

Dashboard world-space di dalam kabin:

- **Speed**: Digit besar (km/j)
- **Gear**: P/R/N/1/2/3/4/5
- **RPM Bar**: Visual analog (hijau → kuning → merah)
- **Indikator**: Lampu, sein, rem tangan
- **Warning**: Pelanggaran, escenario
- **Timer**: Elapsed time

Posisi: di depan kursi pengemudi, menghadap pengemudi.
Skala: otomatis menyesuaikan resolusi headset.

---

## 8. Troubleshooting

### VR Tidak Aktif

1. Cek **Project Settings → XR Plugin Management** → OpenXR centang?
2. Cek **Player Settings → Other Settings → Active Input Handling** = Both?
3. Cek **Edit → Preferences → External Tools** → Android SDK/NDK/JDK path?
4. Cek Console: `[Kemudi.XR] Desktop mode` = VR tidak terdeteksi.

### APK Tidak Muncul di Quest

1. Pastikan Quest dalam **Developer Mode**.
2. Cek **USB debugging** aktif: `adb devices`.
3. Install ulang: `adb install -r Builds/VR/KemudiSimulation.apk`.

### Performance Buruk di Quest

1. Turunkan quality: **LOW preset** (PerformanceManager).
2. Kurangi traffic: 3 unit (sudah default).
3. Nonaktifkan shadow: Quality Settings → Shadow = Off.
4. Cek FPS via **DebugOverlay** (Development Build).

---

## 9. File Structure VR

```
Assets/Scripts/XR/
├── XRManager.cs              # Deteksi VR, setup rig, mode switching
├── XRComfortSystem.cs        # Anti motion sickness (FOV + vignette)
├── XRDashboard.cs            # Dashboard world-space di kabin
└── HandTrackingManager.cs    # Hand tracking (default OFF)

Assets/Scripts/Input/
├── XRInputProvider.cs        # Provider input VR controller
├── UniversalInputSystem.cs   # Corong input universal
├── KeyboardInputProvider.cs  # Provider keyboard (desktop)
└── VehicleInputState.cs      # Struktur input universal

Assets/Settings/
└── XRInputActions.inputactions  # OpenXR input actions

Assets/Editor/
├── KemudiVRBuilder.cs        # Build Quest APK
└── KemudiWebGlBuilder.cs     # Build WebGL (website)
```

---

## 10. Referensi

- Dokumen migrasi §30–§34 (VR setup, input, comfort, kamera)
- `docs/VR_INPUT_MAP.md` — pemetaan input lengkap
- `docs/OPTIMASI_SIMULASI.md` — optimasi performa VR
- [Unity XR Documentation](https://docs.unity3d.com/Packages/com.unity.xr.management@4.4/)
- [OpenXR Plugin](https://docs.unity3d.com/Packages/com.unity.xr.openxr@1.14/)
