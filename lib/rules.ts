// ══════════════════════════════════════════════════════════════════════════
//  ATURAN LALU LINTAS (zona batas kecepatan + deteksi melawan arus)
// ══════════════════════════════════════════════════════════════════════════
//  Trek mengalir dari z=+8 (start) menuju z=-900 (finish). Zona batas
//  kecepatan mengikuti segmen jalan (kota, permukiman, tikungan, ...) agar
//  pemain harus menyesuaikan kecepatan di tiap kawasan — melanggar = penalti.

export type SpeedLimitZone = { fromZ: number; toZ: number; limitKmh: number };

export const SPEED_LIMIT_ZONES: SpeedLimitZone[] = [
  // Start + Kota 1 (pertokoan, lampu lalu lintas, zebra)
  { fromZ: 8, toZ: -160, limitKmh: 40 },
  // S-Curve (slalom cone & barrier)
  { fromZ: -160, toZ: -300, limitKmh: 30 },
  // Permukiman (rumah, gang, zebra)
  { fromZ: -300, toZ: -430, limitKmh: 30 },
  // Zona obstacle (palang proyek, truk berhenti, lubang jalan)
  { fromZ: -430, toZ: -520, limitKmh: 30 },
  // Tanjakan
  { fromZ: -520, toZ: -620, limitKmh: 50 },
  // Kota 2 (persimpangan, halte, bus)
  { fromZ: -620, toZ: -760, limitKmh: 40 },
  // Berkelok menjelang finish
  { fromZ: -760, toZ: -850, limitKmh: 30 },
  // Lurus akhir menuju finish
  { fromZ: -850, toZ: -900, limitKmh: 50 },
];

/** Toleransi kecepatan sebelum dianggap pelanggaran (km/j). */
export const SPEED_TOLERANCE_KMH = 5;

/** Jarak tempuh mundur (meter) sebelum dianggap melawan arus. */
export const WRONG_WAY_THRESHOLD_M = 8;

/** Batas kecepatan (km/j) yang berlaku pada posisi Z tertentu. */
export function speedLimitAt(z: number): number {
  for (const zone of SPEED_LIMIT_ZONES) {
    if (z <= zone.fromZ && z >= zone.toZ) return zone.limitKmh;
  }
  return 40;
}

/** Nama kawasan untuk ditampilkan di HUD (opsional). */
export function zoneNameAt(z: number): string {
  if (z > -60) return "Area Start";
  if (z >= -160) return "Kota 1";
  if (z >= -300) return "S-Curve";
  if (z >= -430) return "Permukiman";
  if (z >= -520) return "Zona Rintangan";
  if (z >= -620) return "Tanjakan";
  if (z >= -760) return "Kota 2";
  if (z >= -850) return "Berkelok";
  return "Finishing Straight";
}
