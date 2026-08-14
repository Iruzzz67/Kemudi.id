// Logika siklus lampu lalu lintas dipisah dari komponen 3D agar AI kendaraan,
// sensor pelanggaran, dan visual lampu membaca FASE YANG SAMA dari satu
// sumber — tidak mungkin AI berhenti di lampu hijau sementara pemain
// dianggap melanggar di lampu merah.

export const TRAFFIC_LIGHT_CYCLE_MS = 11000;
export const TRAFFIC_LIGHT_GREEN_MS = 5500;
export const TRAFFIC_LIGHT_YELLOW_MS = 1500;

export type LightPhase = "green" | "yellow" | "red";

export function getLightPhase(t: number): LightPhase {
  const m = t % TRAFFIC_LIGHT_CYCLE_MS;
  if (m < TRAFFIC_LIGHT_GREEN_MS) return "green";
  if (m < TRAFFIC_LIGHT_GREEN_MS + TRAFFIC_LIGHT_YELLOW_MS) return "yellow";
  return "red";
}

/** Apakah kendaraan yang mendekat (dari arah -Z menuju -∞) harus berhenti. */
export function mustStopAtLight(z: number, lightZ: number, now: number): boolean {
  // Kendaraan belum melewati lampu jika z masih > lightZ (bergerak ke -Z).
  if (z <= lightZ) return false;
  const phase = getLightPhase(now);
  return phase !== "green";
}
