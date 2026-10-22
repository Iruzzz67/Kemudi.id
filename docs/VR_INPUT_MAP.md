# VR INPUT MAP — Kemudi.id Simulation

> Pemetaan input universal (keyboard, gamepad, VR controller, steering wheel,
> hand tracking) ke `VehicleInputState`, sesuai dokumen migrasi §30–§32, §65–§69.

---

## 1. Alur input (universal — §65)

```text
Keyboard ─────┐
Gamepad ──────┤
VR Controller─┤  →  UniversalInputSystem → VehicleInputState → VehicleController → VehiclePhysics
Wheel ────────┤
Hand Tracking─┘
```

`VehicleController` **tidak pernah tahu** asal input. Provider lain tinggal
`Register()` ke `UniversalInputSystem`.

## 2. VehicleInputState (§66)

```csharp
struct VehicleInputState {
    float Steering; float Throttle; float Brake; float Clutch;  // analog
    bool HandbrakePressed, GearUp, GearDown, ReverseRequested, NeutralRequested,
         CameraCycle, Pause, Ignition;                          // diskrit (edge)
    bool HeadlightToggle, HighBeamToggle, HazardToggle,
         TurnSignalLeft, TurnSignalRight, HornHeld;              // saklar
    bool ToggleSeatbelt, ToggleHelmet, ToggleJacket,
         ToggleGloves, ToggleBoots;                              // checklist
}
```

## 3. Keyboard (§67)

| Tombol | Fungsi | Tombol | Fungsi |
|---|---|---|---|
| W / ↑ | Gas | Z | Sein kiri |
| `[` | Atur kursi (checklist) | `]` | Atur spion (checklist) |
| S / ↓ | Rem | X | Sein kanan |
| A / ← | Belok kiri | V | Hazard |
| D / → | Belok kanan | T | Klakson |
| Shift | Kopling | L | Lampu |
| I | Engine (ignition) | K | High beam |
| Q / , / PgDn | Gear down | C | Ganti kamera |
| E / . / PgUp | Gear up | P | Pause |
| N | Neutral | B | Sabuk (checklist) |
| R | Reverse | H / J / G / F | Helm / Jaket / Sarung tangan / Sepatu |
| Space | Handbrake | | |

Implementasi: `Input/KeyboardInputProvider.cs` (edge detection di Update,
flags dikonsumsi sekali per tekan).

## 4. VR Controller (§31)

Mapping universal (tidak terkunci satu merek headset):

| Kontrol | Fungsi |
|---|---|
| Left Stick X | Steering |
| Left Stick Y | Opsional walking/kamera (diabaikan saat driving) |
| Right Stick | Camera (siklus TPV ↔ FPV) |
| A | Action / Enter / Confirm |
| B | Cancel / Exit |
| X | Gear Down |
| Y | Gear Up |
| Trigger | Gas / Interaction |
| Grip | Brake |
| Menu | Pause |

Implementasi: `Input/XRInputProvider.cs` (Unity Input System + OpenXR, pakai
`InputActionReference`; rising-edge dari transisi tombol).

> Mapping bisa diatur ulang lewat Unity Input System — jangan mengunci
> simulasi pada satu headset (§31).

## 5. Hand tracking (§32)

- **Default OFF** — menambah CPU/GPU dan tidak seragam di semua perangkat.
- User mengaktifkan via Settings → Hand Tracking.
- Hanya berjalan bila perangkat mendukung (`HandTrackingManager.QuerySupport`,
  butuh paket XR Hands).

## 6. VR comfort (§33)

- Fixed seating, smooth turn yang bisa diatur, snap turn opsional.
- Vignette ringan (`XRComfortSystem`) saat akselerasi/menikung tajam.
- Horizon stabil, kamera tidak berguncang berlebihan.

## 7. Kamera (§34)

- **FPV / TPV** saja untuk user.
- **Top-down hanya debug** (`Debug.isDebugBuild`).

## 8. Checklist input (§43)

| Tombol | Item |
|---|---|
| B | Sabuk (Mobil/Truk) |
| H | Helm (Motor) |
| J | Jaket (Motor) |
| G | Sarung tangan (Motor) |
| F | Sepatu (Motor) |
| `[` | Atur kursi (Mobil/Truk) — tombol tambahan di luar tabel §67 |
| `]` | Atur spion (Mobil/Truk) — tombol tambahan di luar tabel §67 |

Item lain dideteksi sistem (masuk kendaraan, mesin menyala, rem tangan
dilepas, kopling, gigi satu) oleh `VehicleController.UpdateChecklist`.
Tanpa tombol kursi/spion, checklist Mobil/Truk tidak akan pernah selesai —
ini alasan penambahan `AdjustSeat`/`AdjustMirrors` pada `VehicleInputState`.

## 9. Transmisi (§68–§69)

- **Manual**: wajib kopling sebelum oper gigi; 3 kesalahan beruntun → stall
  (`ManualTransmissionController`).
- **Otomatis**: upshift/downshift dari RPM + speed + throttle dengan
  hysteresis (`AutomaticTransmissionController`).
