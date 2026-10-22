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
  | "parked-bus";

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
  /** Authored assets already use metres and the expected local axes. */
  glbNative?: boolean;
  /** Kotak fit GLB dalam meter { length, width, height }. */
  glbBox?: { length: number; width: number; height: number };
  /** Rotasi Y tambahan untuk GLB (default π — model menghadap +Z). */
  glbRotateY?: number;
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
  { id: "house-start-1", kind: "house", z: 0, offset: 14 },
  { id: "house-start-2", kind: "house", z: -22, offset: -14 },
  { id: "house-start-3", kind: "house", z: -43, offset: 14 },
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

// Rintangan inti (POLA A–E di dokumentasi).
const OBSTACLES: SceneryItem[] = [
  // POLA A — SLALOM (cone, soft: menerobos tapi kena penalti)
  { id: "cone-slalom-1", kind: "cone", z: -202, offset: 2.3, soft: true, radius: 0.32 },
  { id: "cone-slalom-2", kind: "cone", z: -211, offset: -2.3, soft: true, radius: 0.32 },
  { id: "cone-slalom-3", kind: "cone", z: -220, offset: 2.3, soft: true, radius: 0.32 },
  { id: "cone-slalom-4", kind: "cone", z: -229, offset: -2.3, soft: true, radius: 0.32 },
  // POLA B — LAJUR TERHALANG (water barrier melintang kedua sisi, sisakan
  // celah tengah ±3 m agar semua kendaraan termasuk truk bisa lewat)
  // yaw: π/2 agar panjang barrier tampil MELINTANG jalan (sinkron dengan
  // laneYaw π/2 pada rect collision).
  { id: "barrier-b-1", kind: "water-barrier", z: -246, offset: -3.8, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.7, laneYaw: Math.PI / 2 } },
  { id: "barrier-b-2", kind: "water-barrier", z: -254, offset: 3.8, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.7, laneYaw: Math.PI / 2 } },
  // POLA C — ROAD WORK (palang proyek + celah cone; cone bersifat lunak
  // sehingga jalur cone bisa diterobos dengan penalti)
  { id: "project-barrier-1", kind: "project-barrier", z: -462, offset: -4.2, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.3, halfL: 1.3, laneYaw: Math.PI / 2 } },
  { id: "project-cone", kind: "cone", z: -465, offset: -0.5, soft: true, radius: 0.32 },
  { id: "project-barrier-2", kind: "project-barrier", z: -468, offset: 3.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.3, halfL: 1.3, laneYaw: Math.PI / 2 } },
  // Water barrier tambahan (z=-470)
  { id: "water-barrier-470", kind: "water-barrier", z: -474, offset: 3.5, yaw: Math.PI / 2, solid: true, rect: { halfW: 0.35, halfL: 1.7, laneYaw: Math.PI / 2 } },
  // Cone menuju zona lubang (z=-455)
  { id: "cone-z455-1", kind: "cone", z: -450, offset: -3.4, soft: true, radius: 0.32 },
  { id: "cone-z455-2", kind: "cone", z: -456, offset: -2.2, soft: true, radius: 0.32 },
  { id: "cone-z455-3", kind: "cone", z: -462, offset: -1.0, soft: true, radius: 0.32 },
  // Tiang pembatas (solid)
  { id: "pole-275", kind: "pole", z: -275, offset: -5.1, solid: true, radius: 0.22 },
  { id: "pole-735", kind: "pole", z: -735, offset: 5.1, solid: true, radius: 0.22 },
  // Kendaraan parkir (solid — mengurangi ruang lajur). Bentuk prosedural
  // dipakai sebagai placeholder; isi `glb` untuk memakai model mobil sendiri:
  //   glb: "/models/bmw.glb", glbBox: { length: 4.4, width: 1.85, height: 1.45 }
  { id: "parked-car-120", kind: "parked-car", z: -120, offset: 3.4, solid: true, rect: { halfW: 0.9, halfL: 2.2 } },
  { id: "parked-car-350", kind: "parked-car", z: -350, offset: -3.4, solid: true, rect: { halfW: 0.95, halfL: 2.3 } },
  { id: "parked-car-690", kind: "parked-car", z: -690, offset: 3.4, solid: true, rect: { halfW: 0.92, halfL: 2.25 } },
  // Truk berhenti (rintangan besar) — memakai model truk yang sudah ada.
  { id: "parked-truck-495", kind: "parked-truck", z: -495, offset: -3.1, glb: "/models/truckww2.glb", glbBox: { length: 7.5, width: 2.4, height: 2.6 }, solid: true, rect: { halfW: 1.2, halfL: 3.7 } },
  // Bus/angkot berhenti (prosedural; isi `glb` untuk model bus sendiri)
  { id: "parked-bus-705", kind: "parked-bus", z: -705, offset: 3.0, solid: true, rect: { halfW: 1.25, halfL: 4.5 } },
  // Lubang / area jalan rusak — BUKAN solid: zona yang memperlambat kendaraan.
  { id: "pothole-1", kind: "pothole", z: -508, offset: -3.6, radius: 0.95 },
  { id: "pothole-2", kind: "pothole", z: -512, offset: 0, radius: 0.95 },
  { id: "pothole-3", kind: "pothole", z: -516, offset: 3.6, radius: 0.95 },
  // Slalom terakhir menjelang finish (z=-805)
  { id: "cone-z805-1", kind: "cone", z: -798, offset: -2.3, soft: true, radius: 0.32 },
  { id: "cone-z805-2", kind: "cone", z: -807, offset: 2.3, soft: true, radius: 0.32 },
  { id: "cone-z805-3", kind: "cone", z: -816, offset: -2.3, soft: true, radius: 0.32 },
];

/** Semua asset lingkungan & rintangan — urutan render aman untuk diubah. */
export const SCENERY_ITEMS: SceneryItem[] = [
  ...TREES,
  ...STREET_LAMPS,
  ...CITY_PROPS,
  ...HOUSES,
  ...OBSTACLES,
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
