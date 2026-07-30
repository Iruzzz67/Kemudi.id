import * as THREE from "three";
import { VehicleConfig } from "./vehicles";

// Kinematic bicycle model (rear-axle reference), with a tire-grip ceiling
// layered on top so the car understeers instead of pivoting on rails when a
// turn genuinely exceeds what real tires could hold — used by
// VehicleController for all steering/yaw/position math. Extracted out of the
// controller so the vehicle-dynamics algorithm can be reasoned about (and
// unit-tested) independently of R3F/Rapier wiring.

export type SteeringState = {
  /** Rate-limited steering angle (rad) — the authoritative, fast-responding value. */
  angle: number;
  /** Extra low-pass filtered angle actually fed into the yaw model — takes the mechanical edge off. */
  smoothedAngle: number;
};

export function createSteeringState(): SteeringState {
  return { angle: 0, smoothedAngle: 0 };
}

/**
 * Advances the steering angle toward the driver's input and returns the
 * smoothed value to drive yaw with. Two-stage: a rate limiter (steerRate to
 * add lock, the faster returnRate whenever the input is easing back toward
 * center — this alone gives "steering kembali ke tengah secara perlahan")
 * plus an exponential low-pass filter on top (steerSmoothTime) so direction
 * reversals don't snap.
 *
 * Speed reduces the max angle available (speedSteerFalloff) — a real rack
 * effectively gets heavier/less eager at speed so the car can't dart into a
 * sharp turn at highway speed the way it can while parking.
 */
export function updateSteering(
  state: SteeringState,
  input: number,
  speed: number,
  config: VehicleConfig,
  delta: number
): number {
  const dragDivisor = 1 + config.angularDrag / 5;
  const steerRate = config.steerRate / dragDivisor;
  const returnRate = config.returnRate / dragDivisor;

  const falloff = config.speedSteerFalloff / (1 + config.downforce / 100);
  const maxAngle = config.maxSteerAngle / (1 + falloff * Math.abs(speed));

  const target = THREE.MathUtils.clamp(input, -1, 1) * maxAngle;
  const returning = Math.abs(target) < Math.abs(state.angle);
  const maxStep = (returning ? returnRate : steerRate) * delta;
  state.angle += THREE.MathUtils.clamp(target - state.angle, -maxStep, maxStep);

  state.smoothedAngle = THREE.MathUtils.damp(
    state.smoothedAngle,
    state.angle,
    1 / Math.max(0.001, config.steerSmoothTime),
    delta
  );

  return state.smoothedAngle;
}

export type YawState = {
  /** m/s of body slip perpendicular to heading — 0 means full grip, no drift. */
  lateralVelocity: number;
  /** rad/s, damped version of the grip-limited yaw rate ("yaw damping" — a touch of rotational inertia). */
  smoothedYawRate: number;
};

export function createYawState(): YawState {
  return { lateralVelocity: 0, smoothedYawRate: 0 };
}

export type YawStepResult = {
  /** rad/s to integrate into heading this frame. */
  yawRate: number;
  /** meters of sideways drift to add this frame, along the vehicle's local right axis. */
  lateralOffset: number;
  /** m/s^2 of forward speed to bleed off this frame — nonzero only while actually slipping. */
  speedLoss: number;
};

// Below this, the bicycle model's own math already implies near-zero yaw
// rate — this just prevents any residual numerical jitter at a dead stop
// (low-speed stabilization) rather than changing the car's behavior.
const LOW_SPEED_CUTOFF = 0.15; // m/s
const YAW_DAMP_RATE = 10; // 1/s
const LATERAL_DAMP_RATE = 6; // 1/s

/**
 * One frame of the vehicle's lateral dynamics. `speed` is the forward speed
 * along the vehicle's own heading (m/s, + = forward); `steerAngle` is the
 * (already-smoothed) front wheel angle from updateSteering.
 *
 * Ideal yaw rate comes straight from the kinematic bicycle model:
 *   yawRate = (v / wheelbase) * tan(steerAngle)
 * — the same turning circle regardless of speed, referenced at the rear
 * axle, which is what makes a no-slip car feel "on rails" rather than
 * slippery. frontGrip scales how sharply that geometry actually bites.
 *
 * That ideal yaw rate implies a lateral (centripetal) acceleration of
 * v * yawRate. Real tires can only generate so much of that before they
 * lose grip — capped here at config.tireGrip (the "friction circle"). Below
 * the cap this function is functionally identical to the pure kinematic
 * model (zero slip, glued to the road — this is the normal case for almost
 * all driving-school-speed turns). Only when a turn genuinely asks for more
 * grip than the tires have does the car understeer: yaw rate is capped to
 * what's achievable, and the rotation it couldn't deliver shows up as a
 * small, rearGrip-controlled rear slip that decays back to zero (lateral
 * velocity damping) as soon as the excess demand goes away.
 */
export function stepYaw(
  state: YawState,
  speed: number,
  steerAngle: number,
  config: VehicleConfig,
  delta: number
): YawStepResult {
  if (Math.abs(speed) < LOW_SPEED_CUTOFF) {
    state.lateralVelocity = THREE.MathUtils.damp(state.lateralVelocity, 0, LATERAL_DAMP_RATE, delta);
    state.smoothedYawRate = THREE.MathUtils.damp(state.smoothedYawRate, 0, YAW_DAMP_RATE, delta);
    return { yawRate: state.smoothedYawRate, lateralOffset: state.lateralVelocity * delta, speedLoss: 0 };
  }

  const idealYawRate = (speed / config.wheelbase) * Math.tan(steerAngle) * config.frontGrip;
  const idealLateralAccel = speed * idealYawRate;
  const gripLimit = Math.max(0.5, config.tireGrip);

  let achievedYawRate = idealYawRate;
  let missingYawRate = 0;
  if (Math.abs(idealLateralAccel) > gripLimit) {
    achievedYawRate = (gripLimit / Math.abs(speed)) * Math.sign(idealYawRate);
    missingYawRate = idealYawRate - achievedYawRate;
  }

  state.smoothedYawRate = THREE.MathUtils.damp(state.smoothedYawRate, achievedYawRate, YAW_DAMP_RATE, delta);

  // The rotation the tires couldn't deliver pushes the body toward the
  // outside of the turn — opposite sign to the direction of the turn itself.
  const targetSlip = (-missingYawRate * config.wheelbase * 0.5) / Math.max(0.2, config.rearGrip);
  state.lateralVelocity = THREE.MathUtils.damp(state.lateralVelocity, targetSlip, LATERAL_DAMP_RATE, delta);

  // A sliding tire has less grip than a rolling one, so real speed bleeds
  // off — but only while there's actual slip, never on an ordinary turn
  // that stayed within the grip limit.
  const speedLoss = Math.abs(state.lateralVelocity) * config.corneringDrag;

  return {
    yawRate: state.smoothedYawRate,
    lateralOffset: state.lateralVelocity * delta,
    speedLoss,
  };
}
