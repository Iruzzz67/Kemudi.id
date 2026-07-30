"use client";

import { CuboidCollider, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { VehicleConfig, pivotHeightOf } from "@/lib/vehicles";
import { VehicleMesh } from "./VehicleMesh";
import { useKeyboard } from "./useKeyboard";
import { useSimStore } from "@/store/simStore";
import { FINISH_Z, ROAD_HALF_WIDTH, START_Z, distanceToRoadCenterline } from "@/lib/track";
import { VehicleTransform } from "./transform";
import { vehicleAudio } from "./audio/vehicleAudio";
import { REVERSE, NEUTRAL, topSpeedInGear, accelInGear, autoGearFor } from "@/lib/transmission";
import { createSteeringState, updateSteering, createYawState, stepYaw } from "@/lib/vehicleDynamics";

const OFF_ROAD_FRICTION_MULT = 2.2;
const OFF_ROAD_MAX_SPEED_MULT = 0.4;
const OVER_REV_SHIFT_TOLERANCE = 1.08;
const STOP_THRESHOLD = 0.5; // m/s, "basically stopped" for gear-direction changes
const ANTI_ROLL_BASELINE = 5000; // reference point where antiRollForce has no extra effect
const HANDBRAKE_DAMP_RATE = 6; // 1/s, how hard the handbrake fights any speed
const HANDBRAKE_WARN_COOLDOWN_MS = 2500;

export function VehicleController({
  config,
  transform,
}: {
  config: VehicleConfig;
  transform: VehicleTransform;
}) {
  const { keys, consumeEdge } = useKeyboard();
  const rigidBody = useRef<RapierRigidBody>(null);
  const visualRoot = useRef<THREE.Group>(null);
  const visualGroup = useRef<THREE.Group>(null);
  const steerGroups = useRef<THREE.Object3D[]>([]);

  const speed = useRef(0);
  const yaw = useRef(0);
  const steering = useRef(createSteeringState());
  const yawDynamics = useRef(createYawState());
  const suspensionOffset = useRef(0);
  const suspensionVelocity = useRef(0);
  const gear = useRef(0); // manual: player-controlled; automatic: recomputed every frame
  // Automatic has no player-selected gear, but still needs a forward/reverse
  // drivetrain direction toggled by [R] — kept as a physics-authoritative ref,
  // same convention as `gear` above, and mirrored to the store only for HUD.
  const reverseGearAuto = useRef(false);
  const clutchWasHeld = useRef(false);
  const handbrakeLastWarnAt = useRef(0);
  const wasOffRoad = useRef(false);
  const hasFinished = useRef(false);

  const setSpeedKmh = useSimStore((s) => s.setSpeedKmh);
  const setIsOffRoad = useSimStore((s) => s.setIsOffRoad);
  const registerOffRoadEvent = useSimStore((s) => s.registerOffRoadEvent);
  const tickElapsed = useSimStore((s) => s.tickElapsed);
  const finish = useSimStore((s) => s.finish);
  const phase = useSimStore((s) => s.phase);
  const transmissionMode = useSimStore((s) => s.transmissionMode);
  const setGearState = useSimStore((s) => s.setGearState);
  const flashGearBlocked = useSimStore((s) => s.flashGearBlocked);
  const engineRunning = useSimStore((s) => s.engineRunning);
  const handbrakeOn = useSimStore((s) => s.handbrakeOn);
  const markClutchedOnce = useSimStore((s) => s.markClutchedOnce);
  const markGearOneEngaged = useSimStore((s) => s.markGearOneEngaged);
  const registerClutchMistake = useSimStore((s) => s.registerClutchMistake);
  const stallEngine = useSimStore((s) => s.stallEngine);
  const raiseWarning = useSimStore((s) => s.raiseWarning);

  useFrame((_, rawDelta) => {
    const body = rigidBody.current;
    if (!body || phase !== "driving") {
      vehicleAudio.silence();
      return;
    }

    // Engine off (still in ignition ACC/ON/START, or stalled): the car is a
    // stationary shell — no movement, no timer, no engine note — until the
    // player actually starts it. Matches "mesin harus menyala dulu" in spec.
    if (!engineRunning) {
      vehicleAudio.silence();
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    const k = keys.current;
    const throttle = k.forward ? 1 : 0;
    const throttleOn = throttle > 0;
    const brakePedal = k.brake;

    // Clutch bookkeeping (manual only): ticks the checklist the first time
    // it's pressed, and — on release — stalls the engine if the driver let it
    // out fully, in gear, at a standstill, with no gas ("kopling dilepas
    // terlalu cepat saat mulai berjalan").
    if (transmissionMode === "manual") {
      if (k.clutch) markClutchedOnce();
      const justReleased = clutchWasHeld.current && !k.clutch;
      clutchWasHeld.current = k.clutch;
      if (justReleased && gear.current >= 0 && Math.abs(speed.current) < STOP_THRESHOLD && !throttleOn) {
        stallEngine("Mesin mati! Kopling dilepas terlalu cepat tanpa gas.");
        vehicleAudio.stallThud();
        vehicleAudio.silence();
        return;
      }
    } else {
      clutchWasHeld.current = k.clutch;
    }

    const currentPos = transform.position;
    const offRoad = distanceToRoadCenterline(currentPos.x, currentPos.z) > ROAD_HALF_WIDTH;

    if (offRoad && !wasOffRoad.current) {
      registerOffRoadEvent();
    }
    wasOffRoad.current = offRoad;
    setIsOffRoad(offRoad);

    const maxSpeed = offRoad ? config.maxSpeed * OFF_ROAD_MAX_SPEED_MULT : config.maxSpeed;
    const friction = offRoad ? config.friction * OFF_ROAD_FRICTION_MULT : config.friction;

    let accelInput = 0;
    let rpmRatio = 0;

    // A shift attempt (Q/E, or R as a direct-to-reverse shortcut) without the
    // clutch held is refused exactly like an over-rev/direction-mismatched
    // shift already was — flashed in the HUD, but now also grinds the
    // gearbox and counts as a mistake toward a full stall.
    const rejectUngatedShift = () => {
      flashGearBlocked();
      registerClutchMistake();
      // registerClutchMistake() escalates to a stall synchronously past the
      // mistake threshold — check the fresh store state to pick the right sound.
      if (useSimStore.getState().engineRunning) vehicleAudio.gearGrind();
      else vehicleAudio.stallThud();
    };

    if (transmissionMode === "manual") {
      const wantsShiftUp = consumeEdge("shiftUp");
      const wantsShiftDown = consumeEdge("shiftDown");
      const wantsReverse = consumeEdge("reverse");

      if (wantsShiftUp || wantsShiftDown) {
        if (!k.clutch) {
          rejectUngatedShift();
        } else {
          const dir = wantsShiftUp ? 1 : -1;
          const next = THREE.MathUtils.clamp(gear.current + dir, REVERSE, config.gearRatios.length - 1);
          const directionBlocked =
            (next >= 0 && speed.current < -STOP_THRESHOLD) ||
            (next === REVERSE && speed.current > STOP_THRESHOLD);
          const overRevBlocked =
            next >= 0 &&
            Math.abs(speed.current) > topSpeedInGear(maxSpeed, config.gearRatios[next]) * OVER_REV_SHIFT_TOLERANCE;
          if (directionBlocked || overRevBlocked) {
            flashGearBlocked();
          } else {
            gear.current = next;
            if (gear.current === 0) markGearOneEngaged();
          }
        }
      } else if (wantsReverse) {
        const canRequestReverse =
          (gear.current === NEUTRAL || gear.current === 0) && Math.abs(speed.current) < STOP_THRESHOLD;
        if (canRequestReverse) {
          if (!k.clutch) rejectUngatedShift();
          else gear.current = REVERSE;
        }
      }

      if (gear.current === REVERSE) {
        if (throttleOn) {
          accelInput = -config.acceleration;
          speed.current = Math.max(-config.reverseMaxSpeed, speed.current - config.acceleration * delta);
        } else {
          speed.current = Math.min(0, speed.current + friction * delta);
        }
        rpmRatio = Math.min(1, Math.abs(speed.current) / config.reverseMaxSpeed);
      } else if (gear.current === NEUTRAL) {
        speed.current = THREE.MathUtils.damp(speed.current, 0, friction, delta);
        rpmRatio = throttleOn ? 0.55 : 0.15;
      } else {
        const ratio = config.gearRatios[gear.current];
        const gearCeiling = topSpeedInGear(maxSpeed, ratio);
        const gearAccel = accelInGear(config.acceleration, ratio);
        if (throttleOn) {
          accelInput = gearAccel;
          speed.current = Math.min(gearCeiling, speed.current + gearAccel * delta);
        } else {
          speed.current -= friction * delta;
        }
        speed.current = THREE.MathUtils.clamp(speed.current, 0, gearCeiling);
        rpmRatio = Math.min(1, speed.current / Math.max(0.01, gearCeiling));
      }
    } else {
      // Automatic: no clutch, no player gear selection. [R] just flips a
      // forward/reverse drivetrain direction (like a PRND selector) while
      // nearly stopped; gear.current is mirrored to REVERSE purely so the
      // HUD's gearLabel() can show "R" the same way it does in manual mode.
      if (consumeEdge("reverse") && Math.abs(speed.current) < STOP_THRESHOLD) {
        reverseGearAuto.current = !reverseGearAuto.current;
      }

      if (reverseGearAuto.current) {
        if (throttleOn) {
          accelInput = -config.acceleration;
          speed.current = Math.max(-config.reverseMaxSpeed, speed.current - config.acceleration * delta);
        } else {
          speed.current = Math.min(0, speed.current + friction * delta);
        }
        gear.current = REVERSE;
        rpmRatio = Math.min(1, Math.abs(speed.current) / config.reverseMaxSpeed);
      } else {
        if (throttleOn) {
          accelInput = config.acceleration;
          speed.current += config.acceleration * delta;
        } else {
          speed.current -= friction * delta;
        }
        speed.current = THREE.MathUtils.clamp(speed.current, 0, maxSpeed);
        gear.current = autoGearFor(speed.current, config.gearRatios, maxSpeed);
        const speedRatio = Math.min(1, speed.current / config.maxSpeed);
        rpmRatio = Math.min(1, speedRatio * 0.75 + (throttleOn ? 0.35 : 0.05) * (1 - speedRatio));
      }
    }

    // Brake pedal (S): a dedicated decelerator, independent of gear/mode —
    // always fights whatever direction the car is currently moving in.
    if (brakePedal && speed.current !== 0) {
      if (speed.current > 0) {
        speed.current = Math.max(0, speed.current - config.braking * delta);
      } else {
        speed.current = Math.min(0, speed.current + config.braking * delta);
      }
      accelInput = speed.current > 0 ? -config.braking : speed.current < 0 ? config.braking : 0;
    }

    // Handbrake: not a hard block, but a strong extra drag that makes the
    // car "terasa berat" (spec) rather than simply refusing to move.
    if (handbrakeOn) {
      speed.current = THREE.MathUtils.damp(speed.current, 0, HANDBRAKE_DAMP_RATE, delta);
      if (throttleOn) {
        const now = performance.now();
        if (now - handbrakeLastWarnAt.current > HANDBRAKE_WARN_COOLDOWN_MS) {
          handbrakeLastWarnAt.current = now;
          raiseWarning("Rem tangan masih aktif! Lepaskan sebelum berjalan.");
        }
      }
    }

    // Steering: rate-limited toward the input target (faster "return" rate
    // while easing back toward center), then extra-smoothed — see
    // lib/vehicleDynamics.ts. Speed already makes the available angle
    // shrink (heavier at speed); downforce keeps more of it available.
    const steerInput = (k.left ? 1 : 0) - (k.right ? 1 : 0);
    const smoothedSteerAngle = updateSteering(steering.current, steerInput, speed.current, config, delta);

    // Visually turn the handlebar/front-wheel assembly (see GltfVehicleMesh)
    // to match — reusing the already-damped angle keeps it in lockstep with
    // the car's actual turning, rather than a separate cosmetic wobble.
    for (const group of steerGroups.current) {
      group.rotation.y = smoothedSteerAngle;
    }

    // Kinematic bicycle model with a tire-grip ceiling: pure no-slip
    // geometric turning (v/wheelbase * tan(angle)) up to what the tires can
    // actually hold, understeering — not sliding — beyond that. See
    // lib/vehicleDynamics.ts for the full derivation.
    const yawStep = stepYaw(yawDynamics.current, speed.current, smoothedSteerAngle, config, delta);
    yaw.current += yawStep.yawRate * delta;

    if (yawStep.speedLoss > 0) {
      if (speed.current > 0) speed.current = Math.max(0, speed.current - yawStep.speedLoss * delta);
      else if (speed.current < 0) speed.current = Math.min(0, speed.current + yawStep.speedLoss * delta);
    }

    // Must exactly match the quaternion below (setFromAxisAngle around +Y) —
    // forward = R_y(yaw) * (0,0,-1), right = R_y(yaw) * (1,0,0). Getting this
    // out of sync with the rotation (as it previously was: forwardX used
    // +sin instead of -sin) makes the visible model's heading rotate one way
    // while the car actually travels the other way every time you turn —
    // that mismatch between where the car points and where it goes is what
    // reads as "sliding on ice" and as steering feeling reversed, regardless
    // of how correct the tire-grip math feeding yaw is.
    const forwardX = -Math.sin(yaw.current);
    const forwardZ = -Math.cos(yaw.current);
    const rightX = Math.cos(yaw.current);
    const rightZ = -Math.sin(yaw.current);

    const nextX = currentPos.x + forwardX * speed.current * delta + rightX * yawStep.lateralOffset;
    const nextZ = currentPos.z + forwardZ * speed.current * delta + rightZ * yawStep.lateralOffset;

    const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);

    body.setNextKinematicTranslation({ x: nextX, y: 0, z: nextZ });
    body.setNextKinematicRotation(quat);

    transform.position.set(nextX, 0, nextZ);
    transform.quaternion.copy(quat);

    // Drive the VISIBLE model directly from the transform we just computed,
    // instead of letting it come from RigidBody's own child-mesh sync. That
    // sync runs Rapier's fixed-timestep interpolation (lerp/slerp toward the
    // last physics step), which lags a render frame or more behind what we
    // just set as this frame's kinematic target — and behind what the
    // camera (driven straight off `transform`) shows. That mismatch is what
    // reads as the car "sliding" during a turn: the camera/collider are
    // already at the new heading while the visible body is still easing
    // toward it. Rendering the mesh from the same authoritative transform
    // the camera uses keeps them pixel-locked with zero lag.
    if (visualRoot.current) {
      visualRoot.current.position.copy(transform.position);
      visualRoot.current.quaternion.copy(transform.quaternion);
    }

    // Purely visual: bank into turns and pitch under acceleration/braking.
    // Center of Mass and Anti Roll Force both push against how far the body
    // is allowed to lean — a lower CoM or stiffer anti-roll bar means less
    // roll for the same yaw rate.
    if (visualGroup.current) {
      const comFactor = THREE.MathUtils.clamp(1 + config.centerOfMassY, 0.3, 1.3);
      const antiRollFactor = ANTI_ROLL_BASELINE / config.antiRollForce;
      const effectiveLeanAmount = config.leanAmount * antiRollFactor;
      const effectiveMaxLeanAngle = config.maxLeanAngle * comFactor;

      const targetRoll = THREE.MathUtils.clamp(
        -yawStep.yawRate * effectiveLeanAmount,
        -effectiveMaxLeanAngle,
        effectiveMaxLeanAngle
      );
      const targetPitch = THREE.MathUtils.clamp(
        -accelInput * effectiveLeanAmount * 0.05,
        -effectiveMaxLeanAngle * 0.4,
        effectiveMaxLeanAngle * 0.4
      );
      visualGroup.current.rotation.z = THREE.MathUtils.damp(
        visualGroup.current.rotation.z,
        targetRoll,
        8,
        delta
      );
      visualGroup.current.rotation.x = THREE.MathUtils.damp(
        visualGroup.current.rotation.x,
        targetPitch,
        8,
        delta
      );

      // Suspension: a small critically-ish damped spring pulling the body
      // down under acceleration and up under braking (squat/dive), riding on
      // top of the lean — wheels stay untouched, same as the roll above.
      if (config.suspensionTravel > 0) {
        const targetOffset = THREE.MathUtils.clamp(
          -accelInput * config.suspensionTravel * 0.02,
          -config.suspensionTravel,
          config.suspensionTravel
        );
        const springForce = config.suspensionStiffness * (targetOffset - suspensionOffset.current);
        const damperForce = -config.suspensionDamping * suspensionVelocity.current;
        suspensionVelocity.current += (springForce + damperForce) * delta;
        suspensionOffset.current += suspensionVelocity.current * delta;
      } else {
        suspensionOffset.current = 0;
        suspensionVelocity.current = 0;
      }
      // The lean/pitch group pivots around pivotHeightOf(config) (see
      // GltfVehicleMesh) — overwriting position.y with just the suspension
      // offset drops the whole pivot back to zero, sinking the model (wheels
      // included) into the ground by that pivot height.
      visualGroup.current.position.y = pivotHeightOf(config) + suspensionOffset.current;
    }

    setSpeedKmh(Math.abs(speed.current) * 3.6);
    tickElapsed(delta * 1000);
    setGearState(gear.current, rpmRatio);

    // Skid noise is reserved for genuinely aggressive inputs — steering pushed
    // past ~70% of full lock at speed, hard braking, or the tire-grip model
    // in stepYaw actually reporting slip — so an ordinary turn (which never
    // exceeds grip) stays silent instead of sounding like the tires are
    // constantly slipping.
    const speedRatioForSkid = Math.min(1, Math.abs(speed.current) / config.maxSpeed);
    const steerRatio = Math.abs(steering.current.angle) / config.maxSteerAngle;
    const corneringSlip =
      steerRatio > 0.7 ? Math.min(1, ((steerRatio - 0.7) / 0.3) * speedRatioForSkid) : 0;
    const brakingSlip =
      brakePedal && Math.abs(speed.current) > config.maxSpeed * 0.55 ? speedRatioForSkid * 0.6 : 0;
    const actualGripSlip = Math.min(1, Math.abs(yawDynamics.current.lateralVelocity) / 2);
    vehicleAudio.update({
      rpmRatio,
      throttleOn,
      skidIntensity: Math.max(corneringSlip, brakingSlip, actualGripSlip),
    });

    if (!hasFinished.current && nextZ <= FINISH_Z) {
      hasFinished.current = true;
      // Scene/VehicleController unmounts the instant phase flips to
      // "finished" (SimulationApp swaps to <FinishedScreen>), so this is the
      // last chance this component gets to run — silence here, synchronously,
      // before that unmount happens, or the engine note is left hanging.
      vehicleAudio.silence();
      const state = useSimStore.getState();
      const elapsedS = state.elapsedMs / 1000;
      const parTime = 45;
      const timePenalty = Math.max(0, elapsedS - parTime) * 1;
      const score = Math.max(
        0,
        Math.round(100 - state.violations * 8 - state.offRoadCount * 5 - timePenalty)
      );
      finish(score);
    }
  });

  return (
    <>
      {/* Collision-only proxy: sensors (Pedestrian, TrafficLight) look up
          rigidBodyObject.name === "vehicle" for intersection checks. Its
          pose is set every frame above but is intentionally NOT what the
          visible model renders from — see the visualRoot comment above. */}
      <RigidBody
        ref={rigidBody}
        type="kinematicPosition"
        colliders={false}
        position={[0, 0, START_Z]}
        name="vehicle"
      >
        <CuboidCollider
          args={[
            config.dimensions.width / 2,
            config.dimensions.height / 2,
            config.dimensions.length / 2,
          ]}
        />
      </RigidBody>
      <group ref={visualRoot} position={[0, 0, START_Z]}>
        <Suspense fallback={null}>
          <VehicleMesh config={config} leanRef={visualGroup} steerRef={steerGroups} />
        </Suspense>
      </group>
    </>
  );
}
