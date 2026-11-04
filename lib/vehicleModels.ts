import type { VehicleType } from "./vehicles";

/** Authored pivots: +Y up, -Z forward, metres; no runtime auto-fit. */
export const VEHICLE_MODELS: Record<VehicleType, string> = {
  MOTOR: "/models/kemudi/motor.glb",
  MOBIL: "/models/kemudi/mobil.glb",
  TRUK: "/models/kemudi/truk.glb",
};
