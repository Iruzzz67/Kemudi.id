// ─── Eco Driving Score & Trip Computer ─────────────────────────────────────
// Menilai gaya berkendara hemat bahan bakar: makin halus gas (jarang meraup
// penuh), makin tinggi efisiensi km/L dan makin tinggi skornya. Pelanggaran
// lalu lintas, keluar jalur, dan tabrakan memotong skor — eco driving bukan
// cuma soal irit, tapi juga aman dan tertib.

/** Faktor beban mesin dari posisi gas (0..1). 0,35 = idle/koasting, 1,5 = full throttle. */
export function loadFactorFor(throttle: number): number {
  return 0.35 + Math.min(1, Math.max(0, throttle)) * 1.15;
}

/** Efisiensi bahan bakar nyata (km/L) dari jarak & bensin yang terpakai. */
export function economyKmPerL(distanceKm: number, fuelUsedL: number): number | null {
  if (fuelUsedL <= 0.0001) return null;
  return distanceKm / fuelUsedL;
}

export type EcoTripInput = {
  distanceKm: number;
  fuelUsedL: number;
  /** Konsumsi dasar kendaraan (L/km) — dipakai sebagai baseline efisiensi. */
  consumptionLperKm: number;
  violations: number;
  offRoadCount: number;
  obstacleHits: number;
};

/**
 * Skor eco 0–100. Baseline (beban rata-rata 1,0) ≈ 83; berkendara lembut
 * (beban < 1) bisa mencapai 100; meraup gas terus-menerus menurunkan skor.
 */
export function computeEcoScore(input: EcoTripInput): number {
  const eff = economyKmPerL(input.distanceKm, input.fuelUsedL);
  let base = 50;
  if (eff !== null && input.consumptionLperKm > 0) {
    const baselineKmPerL = 1 / input.consumptionLperKm;
    const ratio = eff / baselineKmPerL; // ≈ 1 / rata-rata beban mesin
    base = Math.round((100 * Math.min(1.2, Math.max(0, ratio))) / 1.2);
  }
  const penalties =
    input.violations * 6 + input.offRoadCount * 4 + input.obstacleHits * 2;
  return Math.max(0, Math.min(100, base - penalties));
}

export function ecoRatingLabel(score: number): string {
  if (score >= 90) return "Sangat Irit";
  if (score >= 75) return "Irit";
  if (score >= 55) return "Cukup";
  return "Boros";
}

export function ecoGrade(score: number): "A" | "B" | "C" | "D" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  return "D";
}
