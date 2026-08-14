# OPTIMASI SIMULASI — Unity (Motor, Mobil, Truk, VR)

> Spesifikasi performa & arsitektur simulasi Unity Kemudi.id, disarikan dari
> dokumen migrasi [`KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md`](../KEMUDI_ID_MIGRASI_DOTNET_OPTIMASI.md)
> (§10–§84). Tujuan: **FPS stabil > kualitas grafis**, terutama di Quest standalone.

---

## 1. Arsitektur (jangan monolith)

```text
SimulationManager
├── VehicleManager (VehicleController → VehiclePhysics → Rigidbody)
├── InputManager (UniversalInputSystem)
├── TrafficManager (waypoint, 5–10 Hz)
├── RuleManager (TriggerZone event-driven)
├── ScoreManager (ViolationSystem → ScoringSystem)
├── CameraManager (FPV/TPV)
├── XRManager (OpenXR)
├── AudioManager (clip + crossfade)
└── UIManager (HUD 5–10 Hz)
```

Setiap sistem di folder `Assets/Scripts/<folder>` sendiri. Dilarang satu script
raksasa mengontrol semua.

## 2. Fase simulasi (§10, §35)

```text
Default:  Selecting → PreDrive → Driving → Finished/Failed
Opsional: Selecting → Walking → Entering → PreDrive → Driving → Finished/Failed
```

Walking mode **default OFF** (`SimulationManager.immersiveEntry`) karena
menambah karakter 3D, animasi, collision & kamera ekstra. Diaktifkan lewat
Settings → Immersive Entry.

## 3. Fisika (§13–§15, §79)

- Physics di **FixedUpdate** (50 Hz) — input di Update, kamera di LateUpdate.
- `VehicleController` **tidak tahu** asal input (keyboard/VR/gamepad/wheel).
- Visual (roda, setir, body lean) **tidak** mengendalikan physics utama.
- Tidak ada 8 substep collision per frame — pakai Unity Collider default.
- Tidak ada `transform.Translate` untuk kendaraan utama — wajib Rigidbody.

| Sistem | Frekuensi |
|---|---:|
| Physics | FixedUpdate (50 Hz) |
| Input | Update |
| Camera | LateUpdate |
| HUD speed | 10 Hz |
| Traffic AI | 5–10 Hz |
| Pedestrian | 5 Hz |
| Score / Warning | Event |
| Audio RPM | 20–30 Hz |

## 4. Aturan event-driven (§46, §75, §77)

Jangan cek semua aturan setiap frame. Pakai trigger:

```text
OnTriggerEnter → TrafficLightZone / CrosswalkZone / SpeedZone
OnTriggerExit  → RoadZone (off-road, §76)
FinishZone     → selesai
OnCollision    → obstacle hit
```

`ViolationSystem` (deteksi) **dipisah** dari `ScoringSystem` (skor 0–100).

## 5. Skor (§45, §77)

```text
Score = 100, dikurangi collision/off-road/lampu merah/tidak memberi jalan/
        kesalahan transmisi/checklist gagal/waktu berlebih.
```

Hasil dikirim ke API (§62) — lihat `Core/SimulationResultReporter.cs`.
Skor divalidasi server (clamp 0–100).

## 6. Collision & dekorasi (§16–§17)

- Layer: Vehicle, Road, SolidObstacle, TrafficVehicle, Pedestrian, **Trigger**.
- Collider HANYA untuk: kendaraan, barrier, cone, obstacle penting, trigger
  rambu/zebra/finish/off-road.
- Dekorasi (rumah, pohon, tiang, lampu jalan, papan) **tanpa collider & tanpa
  Rigidbody**.
- Parked vehicle & cone: jumlah dibatasi.

## 7. Track & LOD (§18–§20)

- **1 road mesh + 1 road collider + trigger zones** — bukan 1600 GameObject.
  Implementasi: `Environment/TrackBuilder.cs` (bangun mesh strip dari waypoint,
  MeshCollider statis, RoadZone + FinishZone).
- LOD: 0–30 m detail tinggi, 30–100 sedang, 100–250 rendah, >250 cull.
  Untuk standalone lebih agresif.
- Frustum culling + static batching aktif.

## 8. Vegetasi & kota (§21–§22)

- GPU instancing / terrain detail, tanpa collider; 20–80 instance aktif.
- Kota pakai prefab yang sama berulang — hindari mesh unik dalam jumlah besar.

## 9. Material & tekstur (§23–§26, §28)

- Opaque + Simple Lit (URP). Hindari transparan berlebihan, parallax,
  tessellation, realtime reflection, shader berat.
- Tekstur 1024² aset utama; 256–512² aset kecil. **Tanpa 4K** kecuali wajib.
- Kendaraan: ≤ 5–6 material utama (body, glass, rubber, interior, lights).
- Lighting: **1 Directional Light + ambient + light probe terbatas**. Lampu
  jalan = emissive, bukan realtime light.

## 10. Shadow & post-processing (§27, §29)

- Shadow distance pendek, resolusi rendah di standalone; jangan shadow semua
  pohon/kendaraan.
- Post-processing VR: **hapus** motion blur, DoF, chromatic aberration, film
  grain, heavy bloom, SSR, vignette yang tidak perlu.

## 11. AI (§36–§39)

- Traffic: waypoint sederhana (MoveTowards), berhenti di lampu merah, jarak
  aman antar kendaraan. Update 5–10 Hz via `TrafficManager`.
- Budget: standalone **3–8**, desktop **8–20**; PerformanceManager menurunkan
  budget saat FPS turun.
- Pedestrian: 1 aktif per zebra, state WAIT → CROSS → FINISH (MoveTowards),
  tanpa pathfinding. 5 Hz.
- Traffic light: state machine GREEN → YELLOW → RED, visual emissive.

## 12. Pooling & particles (§47–§48)

- `Core/ObjectPool<T>` untuk traffic, pedestrian, warning, efek.
- Jangan `Instantiate/Destroy` berulang selama gameplay.
- Particle count rendah, hanya aktif saat diperlukan.

## 13. Audio (§40–§41)

- 3–4 clip (idle/low/high) + pitch/volume + crossfade — **bukan synthesizer**.
- AudioMixer memisahkan kategori; batasi jumlah AudioSource & spatial untuk
  objek jauh.

## 14. HUD & UI (§42, §52)

- Canvas: speed, gear, RPM, engine, handbrake, sein, lampu, timer, skor,
  pelanggaran, warning.
- Update 5–10 Hz; warning & skor event-driven.
- `DebugOverlay` (FPS/CPU/GPU/speed/RPM/steer/violations) **hanya**
  Development Build.

## 15. Kualitas & adaptive (§53–§56)

| Preset | Shadow | LOD | Traffic | Pedestrian | Tekstur |
|---|---|---|---|---|---|
| LOW | Off/Low | Agresif | 3 | 1 | 512/1024 |
| MEDIUM | Low | Medium | 5 | 2 | 1024 |
| HIGH | Medium | High | 8+ | 3+ | 1024/2048 |

`PerformanceManager`: FPS < target → turun 1 tingkat bertahap
(traffic → shadow → efek → LOD). Target: PC 60 FPS, PC VR 72/80/90, Quest min 72.

## 16. Fitur yang DI-CUT dulu (§49–§51, §63)

```text
❌ Cuaca dinamis (hujan/salju/kabut volumetrik) — DLC berikutnya
❌ GPS 3D (minimap 2D opsional)
❌ Ideal line (default OFF, aktif mode training)
❌ Hand tracking (default OFF)
❌ Multiplayer
❌ Post-processing berat / realtime reflection / banyak realtime light
❌ Decor collider / banyak parked vehicles / high-density particles
```

## 17. Checklist sebelum build (§80)

- [ ] Tidak ada tekstur 4K tak perlu · material duplikat · collider/Rigidbody dekorasi
- [ ] Tidak ada AI update per frame · Instantiate/Destroy berulang · physics 8 substep
- [ ] LOD + culling + static batching aktif
- [ ] Draw call & triangle count diperiksa (kendaraan: desktop 20–60k, Quest 10–30k)
- [ ] Audio source terbatas · GC allocation diperiksa · FPS VR stabil

## 18. Target FPS (§53, §81)

- PC: 1080p, minimum 60 FPS.
- PC VR / Quest standalone: minimum 72 FPS.
- Jika gagal (urutan): kurangi shadow → traffic → LOD → tekstur → particle →
  material → polygon → post-processing.
