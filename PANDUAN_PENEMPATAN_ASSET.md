# 🗺️ Panduan Penempatan Asset — Simulasi Map ala Kota Bogor

> Dokumen ini menjelaskan **di mana setiap asset (rintangan & lingkungan) berada**
> di lintasan simulasi dan **bagaimana menggantinya dengan asset milik Anda**
> (file `.glb` / `.gltf`). Semua posisi sudah dihitung terhadap kurva jalan
> sehingga mengikuti belokan secara otomatis.

---

## 1. Di mana semua asset dikonfigurasi?

**Satu file pusat: [`lib/scenery.ts`](./lib/scenery.ts)** — seluruh asset
lingkungan & rintangan didefinisikan di sini sebagai array `SCENERY_ITEMS`.
Komponen yang merender-nya: [`components/simulation/Scenery.tsx`](./components/simulation/Scenery.tsx).

Lintasan (jalan, finish, zebra, lampu lalu lintas): [`lib/track.ts`](./lib/track.ts).
Collision 2D: [`lib/obstacles.ts`](./lib/obstacles.ts).

### Struktur satu item

```ts
{
  id: "cone-slalom-1",          // unik, dipakai juga sebagai id collision
  kind: "cone",                 // jenis asset (lihat tabel di bawah)
  z: -202,                      // posisi Z di sepanjang lintasan (meter)
  offset: 2.3,                  // geser lateral dari tengah jalan (meter)
                                //   + = sisi kanan arah maju, - = kiri
  // ── opsional ──
  yaw: 0,                       // rotasi lokal tambahan (radian)
  scale: 1,                     // skala untuk bentuk prosedural
  glb: "/models/cone.glb",      // asset GLB Anda (jika diisi, menggantikan bentuk prosedural)
  glbBox: { length: 0.6, width: 0.6, height: 0.7 },  // kotak fit GLB (meter)
  glbRotateY: Math.PI,          // rotasi arah hadap GLB (default π)
  solid: true,                  // solid → kendaraan berhenti saat menabrak
  soft: true,                   // lunak → kendaraan menerobos, tetap kena penalti
  radius: 0.32,                 // collision lingkaran (m)
  rect: { halfW: 0.35, halfL: 1.7, laneYaw: Math.PI / 2 },  // collision kotak
}
```

> **Sistem koordinat:** `z` adalah jarak sepanjang lintasan (finish di `z = -900`).
> Saat render, posisi di-resolve ke titik terdekat pada tengah jalan
> (`getSampleNearZ`) + arah jalan (`heading`), lalu digeser sejauh `offset` ke
> samping. Jadi **asset otomatis mengikuti belokan** — Anda cukup set `z` dan
> `offset`, tidak perlu menghitung koordinat dunia sendiri.

---

## 2. Tabel penempatan asset (rintangan utama)

Jalan selebar **10 m** (tengah = 0, tepi kiri ≈ -5, tepi kanan ≈ +5).
Nilai `offset` adalah geser lateral dari tengah jalan; posisi dunia di-resolve
ke titik terdekat di jalur (lihat `resolveSceneryPose` di `lib/scenery.ts`).

> **Catatan (rintangan diperlonggar):** semua celah rintangan sudah dilebarkan
> agar pemain jarang kena penalti — cone slalom & cone akhir dipindah ke tepi
> jalan (offset ±4,2), barrier proyek & kendaraan parkir digeser ke bahu jalan.

| Asset | id | z | offset | Perilaku |
| --- | --- | ---: | ---: | --- |
| Cone slalom (×4) | `cone-slalom-1..4` | -202 s/d -229 | ±4,2 | **Lunak** — bisa diterobos, penalti hit |
| Water barrier kiri | `barrier-b-1` | -246 | -4,5 | **Solid** — blokir |
| Water barrier kanan | `barrier-b-2` | -254 | +4,5 | **Solid** — blokir |
| Palang proyek kiri | `project-barrier-1` | -462 | -4,5 | **Solid** |
| Cone proyek | `project-cone` | -465 | -3,6 | **Lunak** |
| Palang proyek kanan | `project-barrier-2` | -468 | +4,5 | **Solid** |
| Water barrier | `water-barrier-470` | -474 | +4,5 | **Solid** |
| Cone penunjuk lubang (×3) | `cone-z455-1..3` | -450 s/d -462 | -4,3 / -4,4 / -4,5 | **Lunak** |
| Tiang pembatas | `pole-275` | -275 | -5,1 | **Solid** |
| Tiang pembatas | `pole-735` | -735 | +5,1 | **Solid** |
| **Mobil parkir** | `parked-car-120` | -120 | +4,2 | **Solid** — mengurangi lajur |
| **Mobil parkir** | `parked-car-350` | -350 | -4,2 | **Solid** |
| **Mobil parkir** | `parked-car-690` | -690 | +4,2 | **Solid** |
| **Truk berhenti** | `parked-truck-495` | -495 | -3,8 | **Solid** — rintangan besar |
| **Bus/angkot berhenti** | `parked-bus-705` | -705 | +3,9 | **Solid** |
| Lubang jalan (×3, zona) | `pothole-1..3` | -508 s/d -516 | -3,6 / 0 / +3,6 | **Zona perlambat** (bukan solid) |
| Cone akhir (×3) | `cone-z805-1..3` | -798 s/d -816 | -4,2 / +4,2 / -4,2 | **Lunak** |

> **Perilaku saat ditabrak:**
> - Cone & kios pedagang (`soft`) → kendaraan menerobos + **obstacleHits +1** (-3 poin).
> - Barrier/tiang/kendaraan parkir (`solid`) → kendaraan **berhenti** + obstacleHits +1.
> - Lubang jalan → **kecepatan & handling turun** selama di dalam zona (tidak ada penalti).
> - Pejalan kaki → langsung **gagal** (sudah ada sejak awal).
>
> Skor akhir: `100 − pelanggaran×8 − keluarJalur×5 − rintangan×3 − penaltiWaktu`.
> Waktu par = **120 detik** (`PAR_TIME_S` di `lib/track.ts`).

---

## 3. Tabel penempatan asset (lingkungan)

| Asset | id | Jumlah | Posisi | Keterangan |
| --- | --- | ---: | --- | --- |
| Pohon | `tree-0..27` | 28 | `z = 14 → -880` tiap ±34 m, berselang-seling kiri/kanan `offset ≈ ±(7,5–12,5)` | Dihasilkan loop di `lib/scenery.ts` |
| Lampu jalan | `street-lamp-0..9` | 10 | `z = -30 → -840` tiap ±90 m, `offset = ±5,8` | Berselang-seling sisi |
| Rumah | `house-k1-*`, `house-p*`, `house-k2-*` | 14 | Kota 1 (`z ≈ -70..-145`, offset ±14), Permukiman (`z ≈ -310..-425`, offset ±12,5), Kota 2 (`z ≈ -630..-735`, offset ±14) | |
| Ruko | `shophouse-k1-*`, `shophouse-k2-*` | 7 | `offset ±15,5..16` di Kota 1 & Kota 2 | |
| Halte | `bus-stop` | 1 | `z = -675`, offset -5,6 → (-4,7;-675) | Dekorasi |
| Kios pedagang | `vendor-1` | 1 | `z = -330`, offset +5,6 → (3,8;-330) | **Lunak** (r = 0,9) |
| Kios pedagang | `vendor-2` | 1 | `z = -650`, offset -5,6 → (-6,1;-650) | **Lunak** (r = 0,9) |
| Papan petunjuk | `sign-1`, `sign-2` | 2 | `z = -100` (offset +6,2), `z = -620` (offset -6,2) | Dekorasi |
| Zebra cross + pejalan kaki | — | 3 | `z = -150`, `-390`, `-850` | Dikonfigurasi di `lib/track.ts` |
| Lampu lalu lintas | — | 2 | `z = -75`, `-650` | Dikonfigurasi di `lib/track.ts` |

---

## 4. Cara mengganti dengan asset milik Anda

### Langkah 1 — taruh file model
Salin file `.glb` (atau `.gltf` + `.bin` + tekstur) Anda ke folder:

```
public/models/
```

### Langkah 2 — isi field `glb` pada item di `lib/scenery.ts`

Contoh — mengganti cone slalom dengan model cone Anda:

```ts
{ id: "cone-slalom-1", kind: "cone", z: -202, offset: 2.3,
  glb: "/models/cone-saya.glb",             // ← file Anda
  glbBox: { length: 0.6, width: 0.6, height: 0.7 },  // ukuran target (meter)
  glbRotateY: Math.PI,                      // rotasi hadap (lihat bawah)
  soft: true, radius: 0.32 },
```

Contoh — mobil parkir dengan model Anda:

```ts
{ id: "parked-car-120", kind: "parked-car", z: -120, offset: 3.4,
  glb: "/models/mobil-parkir.glb",
  glbBox: { length: 4.4, width: 1.85, height: 1.45 },
  solid: true, rect: { halfW: 0.9, halfL: 2.2 } },
```

### Cara kerja auto-fit (tidak perlu ubah skala manual)
1. Model GLB di-clone & dibuang objek helper (plane/ground/camera sisa ekspor).
2. **Bounding box model diukur**, lalu diskalakan agar pas ke dalam `glbBox`
   (`length` = panjang searah jalan, `width` = lebar, `height` = tinggi).
3. Pusat model digeser ke origin sehingga tidak melayang/tenggelam.
4. **Arah hadap** = sumbu panjang model otomatis disejajarkan ke arah jalan,
   lalu `glbRotateY` memutar tambahan:
   - model menghadap **+Z** (umum di Blender/asset store) → `glbRotateY: Math.PI` (default)
   - model menghadap **-Z** → `glbRotateY: 0`
   - model menghadap **+X** → `glbRotateY: Math.PI / 2`
   - model menghadap **-X** → `glbRotateY: -Math.PI / 2`
   - tidak yakin? jalankan simulasinya; jika asset tampak menghadap ke
     belakang, cukup ubah `glbRotateY` + π (mis. π → 0).
5. Hapus field `glb` → kembali ke bentuk prosedural (placeholder).

> 💡 Jika file GLB Anda gagal dimuat (salah nama/rusak), sistem **otomatis
> menampilkan bentuk prosedural** sebagai gantinya — simulasi tidak crash dan
> tidak ada "tembok tak terlihat". Cek konsol browser untuk pesan error-nya.

> 💡 **Tips performa:** model `.glb` sebaiknya ≤ 3–5 MB, tanpa tekstur raksasa,
> karena ikut dimuat bersama model kendaraan pemain.

---

## 5. Menambah asset baru

Tambahkan item baru di array `SCENERY_ITEMS` di `lib/scenery.ts`:

```ts
{ id: "ban-truk-1", kind: "cone", z: -560, offset: 1.5, soft: true, radius: 0.35 }
```

- Jenis render mengikuti `kind` (prosedural) atau `glb` (model Anda).
- Jenis collision mengikuti `solid`/`soft` + `radius`/`rect`.
- Untuk jenis baru, tambahkan `kind` ke `SceneryKind`, buat komponen prosedural
  di `Scenery.tsx` (`ProceduralProp`), dan peta collision di `collisionKindOf()`.

---

## 6. Ringkasan file yang berubah

| File | Peran |
| --- | --- |
| `lib/track.ts` | Trek ±916 m (FINISH_Z = -900), waypoint, 3 zebra, 2 lampu lalu lintas, par time 120 dtk |
| `lib/scenery.ts` | **Konfigurasi pusat semua asset** + zona lubang jalan |
| `components/simulation/Scenery.tsx` | Render asset (prosedural/GLB) + daftar collision |
| `components/simulation/Track.tsx` | Trotoar, rumput luas, 2 lampu lalu lintas, pasang Scenery |
| `components/simulation/TrafficLight.tsx` | Prop `id` (2 lampu tidak bentrok) |
| `components/simulation/VehicleController.tsx` | Collision lunak/solid, obstacleHits, zona lubang, skor baru |
| `store/simStore.ts` | Counter `obstacleHits` |
| `components/simulation/Scene.tsx` | Fog lebih jauh, bayangan mengikuti kendaraan |
| `components/simulation/Hud.tsx`, `SimulationApp.tsx` | Tampilan "Rintangan" |

Jalankan `npm run dev` lalu buka `http://localhost:3000/simulasi`.
