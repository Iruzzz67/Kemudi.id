export const REVERSE = -2;
export const NEUTRAL = -1;

/** Top speed (m/s) achievable in a given gear before hitting the rev limiter. */
export function topSpeedInGear(maxSpeed: number, ratio: number) {
  return maxSpeed / ratio;
}

/** Available acceleration in a given gear — lower gears (higher ratio) pull harder. */
export function accelInGear(baseAccel: number, ratio: number) {
  return baseAccel * Math.sqrt(ratio);
}

/** Picks the gear a real automatic transmission would already be sitting in. */
export function autoGearFor(speed: number, gearRatios: number[], maxSpeed: number) {
  const s = Math.abs(speed);
  for (let g = 0; g < gearRatios.length; g++) {
    const ceiling = topSpeedInGear(maxSpeed, gearRatios[g]);
    if (s <= ceiling * 0.82 || g === gearRatios.length - 1) return g;
  }
  return gearRatios.length - 1;
}

export function gearLabel(mode: "manual" | "automatic", gear: number) {
  // REVERSE takes priority in both modes — automatic mirrors it into `gear`
  // too (see VehicleController) purely so the HUD can show "R" the same way.
  if (gear === REVERSE) return "R";
  if (mode === "automatic") return "D";
  if (gear === NEUTRAL) return "N";
  return String(gear + 1);
}
