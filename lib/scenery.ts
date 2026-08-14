// ══════════════════════════════════════════════════════════════════════════
//  KONFIGURASI PUSAT ASSET LINGKUNGAN & RINTANGAN (map ala Kota Bogor)
// ══════════════════════════════════════════════════════════════════════════
//
//  SEMUA prop/rintangan 3D di lintasan didefinisikan DI SINI, satu file —
//  ini adalah satu-satunya tempat yang perlu Anda ubah untuk mengganti asset
//  dengan milik Anda sendiri.
//
//  📌 CARA MENGGANTI ASSET:
//  1. Taruh file .glb / .gltf Anda di `public/models/` (mis. `cone.glb`).
//  2. Pada item yang ingin diganti, isi field `glb` dengan URL-nya, mis.:
//        { id: "cone-slalom-1", kind: "cone", z: -202, offset: 2.3, glb: "/models/cone.glb" }
//  3. (Opsional) sesuaikan `glbBox` { length, width, height } dalam meter —
//     model otomatis di-fit (skala + posisi) ke dalam kotak ini.
//     `glbRotateY` membalik arah hadap bila model Anda menghadap +Z (180° = π)
//     atau +X (90° = π/2). Default π (model menghadap +Z).
//  4. Hapus field `glb` untuk kembali ke bentuk prosedural (placeholder).
//
//  Arti kolom:
//   - `z`      : perkiraan posisi Z di sepanjang lintasan. Saat render, posisi
//                di-resolve ke titik terdekat di tengah jalan (getSampleNearZ)
//                + heading jalan, jadi asset otomatis mengikuti belokan.
//   - `offset` : geser lateral dalam meter dari tengah jalan (+ = sisi kanan
//                arah maju / -Z). Jalan selebar 10 m → offset ±5 = tepi aspal.
//   - `yaw`    : rotasi lokal tambahan (radian) untuk prop dekoratif.
//   - `scale`  : skala global untuk bentuk prosedural.
//   - `solid`  : objek solid — kendaraan berhenti saat menabrak.
//   - `soft`   : objek lunak (cone/pedagang) — kendaraan menerobos tapi hit
//                dihitung sebagai penalti obstacleHits (-3 poin / rintangan).
//   - `radius` : collision lingkaran (m). `rect` : collision kotak
//                { halfW (setengah lebar), halfL (setengah panjang),
//                  laneYaw: π/2 = melintang jalan }.
//  Panduan lengkap: PANDUAN_PENEMPATAN_ASSET.md
// ══════════════════════════════════════════════════════════════════════════

import * as THREE from "three";
import { getSampleNearZ, headingFromTangent } from "@/lib/track";
import { ObstacleKind } from "@/lib/obstacles";

export type SceneryKind =
  | "cone"
  | "water-barrier"
  | "project-barrier"
  | "pole"
  | "pothole"
  | "vendor"
  | "bus-stop"
  | "street-lamp"
  | "tree"
  | "house"
  | "shophouse"
  | "sign"
  | "parked-car"
  | "parked-truck"
  | "parked-bus"
  // Rambu lalu lintas (md: larangan, peringatan, petunjuk) + SPBU
  | "sign-prohibition"
  | "sign-warning"
  | "sign-guide"
  | "spbu";

export type SceneryItem = {
  id: string;
  kind: SceneryKind;
  /** Perkiraan Z sepanjang lintasan (di-resolve ke titik + heading jalan). */
  z: number;
  /** Offset lateral (m) dari tengah jalan; + = sisi kanan arah maju. */
  offset: number;
  /** Rotasi lokal tambahan (radian). */
  yaw?: number;
  /** Skala global untuk bentuk prosedural. */
  scale?: number;
  /** Asset GLB kustom — jika diisi, prop dirender dari GLB ini. */
  glb?: string;
  /** Kotak fit GLB dalam meter { length, width, height }. */
  glbBox?: { length: number; width: number; height: number };
  /** Rotasi Y tambahan untuk GLB (default π — model menghadap +Z). */
  glbRotateY?: number;
  /** Teks pendek untuk rambu lalu lintas (mis. "40" untuk batas kecepatan). */
  label?: string;
  // ── Collision ───────────────────────────────────────────────────────────
  solid?: boolean;
  soft?: boolean;
  radius?: number;
  rect?: { halfW: number; halfL: number; laneYaw?: number };
};

/** Hash deterministik sederhana — variasi warna/ukuran tidak berubah antar load. */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const rng = (id: string) => hash(id) / 0xffffffff;

export type SceneryPose = { x: number; z: number; heading: number };

/** Resolve posisi dunia dari item: titik jalan terdekat + heading + offset lateral. */
export function resolveSceneryPose(item: SceneryItem): SceneryPose {
  const sample = getSampleNearZ(item.z);
  const heading = headingFromTangent(sample.tangent);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
  return {
    x: sample.point.x + right.x * item.offset,
    z: sample.point.z + right.z * item.offset,
    heading,
  };
}

/** Peta jenis prop → jenis collision (untuk registrasi di lib/obstacles.ts). */
export function collisionKindOf(kind: SceneryKind): ObstacleKind {
  switch (kind) {
    case "cone":
      return "cone";
    case "water-barrier":
    case "project-barrier":
      return "barrier";
    case "pole":
      return "pole";
    case "vendor":
      return "vendor";
    default:
      return "vehicle"; // parked-car / parked-truck / parked-bus
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  DATA ASSET
// ──────────────────────────────────────────────────────────────────────────

// Tiang lampu jalan — berselang-seling kiri/kanan tiap ±90 m.
const STREET_LAMPS: SceneryItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `street-lamp-${i}`,
  kind: "street-lamp" as const,
  z: -30 - i * 90,
  offset: (i % 2 === 0 ? 1 : -1) * 5.8,
  scale: 0.9 + rng(`lamp-${i}`) * 0.25,
}));

// Pohon rindang di kedua sisi — variasi ukuran & warna deterministik.
const TREES: SceneryItem[] = Array.from({ length: 28 }, (_, i) => {
  const z = 14 - i * 34;
  const side = i % 2 === 0 ? 1 : -1;
  return {
    id: `tree-${i}`,
    kind: "tree" as const,
    z,
    offset: side * (7.5 + rng(`tree-${i}`) * 5),
    scale: 0.8 + rng(`tree-${i}`) * 0.7,
  };
});

// Rumah & ruko khas perkotaan Indonesia (dekorasi pinggir jalan).
const HOUSES: SceneryItem[] = [
  // Kota 1 (pertokoan)
  { id: "house-k1-1", kind: "house", z: -70, offset: 14, yaw: 0.05 },
  { id: "house-k1-2", kind: "house", z: -90, offset: -14, yaw: -0.08 },
  { id: "house-k1-3", kind: "house", z: -110, offset: 14, yaw: 0.1 },
  { id: "house-k1-4", kind: "house", z: -130, offset: -14, yaw: -0.05 },
  { id: "house-k1-5", kind: "house", z: -145, offset: 14.5, yaw: 0.12 },
  { id: "shophouse-k1-1", kind: "shophouse", z: -85, offset: 15.5, yaw: 0.05 },
  { id: "shophouse-k1-2", kind: "shophouse", z: -105, offset: -15.5, yaw: -0.08 },
  { id: "shophouse-k1-3", kind: "shophouse", z: -125, offset: 15.5, yaw: 0.1 },
  // Permukiman
  { id: "house-p1", kind: "house", z: -310, offset: 12.5, yaw: 0.05 },
  { id: "house-p2", kind: "house", z: -330, offset: -12.5, yaw: -0.1 },
  { id: "house-p3", kind: "house", z: -355, offset: 12.5, yaw: 0.08 },
  { id: "house-p4", kind: "house", z: -375, offset: -12.5, yaw: -0.06 },
  { id: "house-p5", kind: "house", z: -405, offset: 12.5, yaw: 0.1 },
  { id: "house-p6", kind: "house", z: -425, offset: -12.5, yaw: -0.12 },
  // Kota 2
  { id: "house-k2-1", kind: "house", z: -630, offset: 14, yaw: 0.06 },
  { id: "house-k2-2", kind: "house", z: -655, offset: -14, yaw: -0.1 },
  { id: "house-k2-3", kind: "house", z: -685, offset: 14, yaw: 0.1 },
  { id: "house-k2-4", kind: "house", z: -710, offset: -14, yaw: -0.06 },
  { id: "house-k2-5", kind: "house", z: -735, offset: 14.5, yaw: 0.12 },
  { id: "shophouse-k2-1", kind: "shophouse", z: -640, offset: 16, yaw: 0.05 },
  { id: "shophouse-k2-2", kind: "shophouse", z: -665, offset: -16, yaw: -0.08 },
  { id: "shophouse-k2-3", kind: "shophouse", z: -695, offset: 16, yaw: 0.1 },
  { id: "shophouse-k2-4", kind: "shophouse", z: -720, offset: -16, yaw: -0.05 },
];

// Halte, pedagang kaki lima, papan petunjuk.
const CITY_PROPS: SceneryItem[] = [
  { id: "bus-stop", kind: "bus-stop", z: -675, offset: -5.6, yaw: 0 },
  { id: "vendor-1", kind: "vendor", z: -330, offset: 5.6, yaw: 0, soft: true, radius: 0.9 },
  { id: "vendor-2", kind: "vendor", z: -650, offset: -5.6, yaw: 0, soft: true, radius: 0.9 },
  { id: "sign-1", kind: "sign", z: -100, offset: 6.2 },
  { id: "sign-2", kind: "sign", z: -620, offset: -6.2 },
];

// ── Rambu lalu lintas (md: larangan, peringatan, petunjuk) ───────────────
const TRAFFIC_SIGNS: SceneryItem[] = [
  // Rambu LARANGAN (lingkaran merah)
  { id: "sign-proh-stop", kind: "sign-prohibition", z: -60, offset: -6.0, label: "Dilarang Berhenti" },
  { id: "sign-proh-park", kind: "sign-prohibition", z: -150, offset: 6.2, label: "Dilarang Parkir" },
  { id: "sign-proh-speed", kind: "sign-prohibition", z: -160, offset: -6.2, label: "40" },
  { id: "sign-proh-uturn", kind: "sign-prohibition", z: -300, offset: 6.2, label: "Dilarang Putar Balik" },
  { id: "sign-proh-masuk", kind: "sign-prohibition", z: -850, offset: 6.2, label: "Dilarang Masuk" },
  // Rambu PERINGATAN (segitiga kuning)
  { id: "sign-warn-turn", kind: "sign-warning", z: -185, offset: -6.2, label: "Tikungan Tajam" },
  { id: "sign-warn-slip", kind: "sign-warning", z: -430, offset: 6.2, label: "Jalan Licin" },
  { id: "sign-warn-narrow", kind: "sign-warning", z: -245, offset: -6.4, label: "Penyempitan Jalan" },
  { id: "sign-warn-cross", kind: "sign-warning", z: -140, offset: 6.4, label: "Penyeberangan" },
  { id: "sign-warn-down", kind: "sign-warning", z: -700, offset: -6.2, label: "Jalan Menurun" },
  // Rambu PETUNJUK (kotak biru)
  { id: "sign-guide-spbu", kind: "sign-guide", z: -505, offset: -6.2, label: "SPBU" },
  { id: "sign-guide-hospital", kind: "sign-guide", z: -640, offset: 6.2, label: "Rumah Sakit" },
  { id: "sign-guide-rest", kind: "sign-guide", z: -760, offset: -6.2, label: "Rest Area" },
  { id: "sign-guide-terminal", kind: "sign-guide", z: -590, offset: 6.4, label: "Terminal" },
  { id: "sign-guide-city", kind: "sign-guide", z: -80, offset: -6.4, label: "Kota Bogor" },
];

// ── SPBU (Pengisian BBM) — di bahu jalan kawasan tanjakan ────────────────
export const SPBU_ITEM: SceneryItem = {
  id: "spbu-1",
  kind: "spbu",
  z: -535,
  offset: 8.2,
  yaw: 0,
};

export type RefuelZone = { x: number; z: number; radius: number };

/** Zona pengisian BBM — pemain berhenti di sini untuk mengisi bensin. */
export const REFUEL_ZONE: RefuelZone = (() => {
  const pose = resolveSceneryPose(SPBU_ITEM);
  return { x: pose.x, z: pose.z, radius: 4.2 };
})();

export function isInRefuelZone(x: number, z: number): boolean {
  const dx = x - REFUEL_ZONE.x;
  const dz = z - REFUEL_ZONE.z;
  return dx * dx + dz * dz <= REFUEL_ZONE.radius * REFUEL_ZONE.radius;
}

// Rintangan inti (POLA A–E di dokumentasi).
//
// ⚠️ SEMUA pola sengaja DILEBARKAN agar lebih mudah: cone digeser mendekati
// tepi jalan (±4.2 m dari tengah) sehingga koridor tengah ±8 m bebas, celah
// barrier & kendaraan parkir diperlebar, dan cone di jalur tengah dipindah ke
// bahu jalan. Pemain bisa lewat lurus tanpa harus slalom rapat / menembus
// celah sempit → lebih sedikit obstacleHits & penalti skor.
const OBSTACLES: SceneryItem[] = [
  // POLA A — SLALOM (cone, soft: menerobos tapi kena penalti). Cone di tepi
  // jalan (offset ±4.2) → jalur tengah ±8 m bebas, bisa lewat lurus.
  { id: "cone-slalom-1", kind: "cone", z: -202, offset: 4.2, soft: true, radius: 0.32 },
  { id: "cone-slalom-2", kind: "cone", z: -211, offset: -4.2, soft: true, radius: 0.32 },
  { id: "cone-slalom-3", kind: "cone", z: -220, offset: 4.2, soft: true, radius: 0.32 },
  { id: "cone-slalom-4", kind: "cone", z: -229, offset: -4.2, soft: true, radius: 0.32 },
  // POLA B — LAJUR TERHALANG (water barrier melintang kedua sisi; celah tengah
  // dilebarkan ke ±6 m dengan menggeser barrier ke tepi & memperpendeknya)
  // yaw: π/2 agar panjang barrier tampil MELINTANG jalan (sinkron dengan
  // laneYaw π/2 pada rect collision).
  { id: "barrier-b-1", kind: "water-barrier", z: -246, offset: -4.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.4, laneYaw: Math.PI / 2 } },
  { id: "barrier-b-2", kind: "water-barrier", z: -254, offset: 4.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.4, laneYaw: Math.PI / 2 } },
  // POLA C — ROAD WORK (palang proyek + cone; semua didekatkan ke bahu jalan
  // sehingga celah tengah ±6 m bebas — cone tidak lagi menghalangi lajur)
  { id: "project-barrier-1", kind: "project-barrier", z: -462, offset: -4.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.3, halfL: 1.3, laneYaw: Math.PI / 2 } },
  { id: "project-cone", kind: "cone", z: -465, offset: -3.6, soft: true, radius: 0.32 },
  { id: "project-barrier-2", kind: "project-barrier", z: -468, offset: 4.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.3, halfL: 1.3, laneYaw: Math.PI / 2 } },
  // Water barrier tambahan (z=-470)
  { id: "water-barrier-470", kind: "water-barrier", z: -474, offset: 4.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.4, laneYaw: Math.PI / 2 } },
  // Cone penunjuk menuju sisi bebas lubang (z=-455) — dipindah merapat ke
  // bahu kiri agar tidak menghalangi lajur tengah.
  { id: "cone-z455-1", kind: "cone", z: -450, offset: -4.3, soft: true, radius: 0.32 },
  { id: "cone-z455-2", kind: "cone", z: -456, offset: -4.4, soft: true, radius: 0.32 },
  { id: "cone-z455-3", kind: "cone", z: -462, offset: -4.5, soft: true, radius: 0.32 },
  // Tiang pembatas (solid)
  { id: "pole-275", kind: "pole", z: -275, offset: -5.1, solid: true, radius: 0.22 },
  { id: "pole-735", kind: "pole", z: -735, offset: 5.1, solid: true, radius: 0.22 },
  // Kendaraan parkir (solid — mengurangi ruang lajur). Digeser mendekati tepi
  // jalan agar sisa lajur mengemudi lebih lebar. Bentuk prosedural dipakai
  // sebagai placeholder; isi `glb` untuk memakai model mobil sendiri:
  //   glb: "/models/bmw.glb", glbBox: { length: 4.4, width: 1.85, height: 1.45 }
  { id: "parked-car-120", kind: "parked-car", z: -120, offset: 4.2, solid: true, rect: { halfW: 0.9, halfL: 2.2 } },
  { id: "parked-car-350", kind: "parked-car", z: -350, offset: -4.2, solid: true, rect: { halfW: 0.95, halfL: 2.3 } },
  { id: "parked-car-690", kind: "parked-car", z: -690, offset: 4.2, solid: true, rect: { halfW: 0.92, halfL: 2.25 } },
  // Truk berhenti (rintangan besar) — memakai model truk yang sudah ada.
  { id: "parked-truck-495", kind: "parked-truck", z: -495, offset: -3.8, glb: "/models/truckww2.glb", glbBox: { length: 7.5, width: 2.4, height: 2.6 }, solid: true, rect: { halfW: 1.2, halfL: 3.7 } },
  // Bus/angkot berhenti (prosedural; isi `glb` untuk model bus sendiri)
  { id: "parked-bus-705", kind: "parked-bus", z: -705, offset: 3.9, solid: true, rect: { halfW: 1.25, halfL: 4.5 } },
  // Lubang / area jalan rusak — BUKAN solid: zona yang memperlambat kendaraan.
  { id: "pothole-1", kind: "pothole", z: -508, offset: -3.6, radius: 0.95 },
  { id: "pothole-2", kind: "pothole", z: -512, offset: 0, radius: 0.95 },
  { id: "pothole-3", kind: "pothole", z: -516, offset: 3.6, radius: 0.95 },
  // Slalom terakhir menjelang finish (z=-805) — cone di tepi jalan (offset
  // ±4.2) sehingga jalur tengah bebas.
  { id: "cone-z805-1", kind: "cone", z: -798, offset: -4.2, soft: true, radius: 0.32 },
  { id: "cone-z805-2", kind: "cone", z: -807, offset: 4.2, soft: true, radius: 0.32 },
  { id: "cone-z805-3", kind: "cone", z: -816, offset: -4.2, soft: true, radius: 0.32 },
];

/** Semua asset lingkungan & rintangan — urutan render aman untuk diubah. */
export const SCENERY_ITEMS: SceneryItem[] = [
  ...TREES,
  ...STREET_LAMPS,
  ...CITY_PROPS,
  ...TRAFFIC_SIGNS,
  ...HOUSES,
  ...OBSTACLES,
  SPBU_ITEM,
];

// ──────────────────────────────────────────────────────────────────────────
//  ZONA LUBANG JALAN (perlambat kendaraan — bukan collision solid)
// ──────────────────────────────────────────────────────────────────────────

export type PotholeZone = { x: number; z: number; radius: number };

export const POTHOLE_ZONES: PotholeZone[] = SCENERY_ITEMS.filter(
  (i) => i.kind === "pothole"
).map((i) => {
  const pose = resolveSceneryPose(i);
  return { x: pose.x, z: pose.z, radius: i.radius ?? 1 };
});

/** Apakah titik (x, z) berada di dalam salah satu zona jalan rusak? */
export function isInPotholeZone(x: number, z: number): boolean {
  for (const zone of POTHOLE_ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (dx * dx + dz * dz <= zone.radius * zone.radius) return true;
  }
  return false;
}
