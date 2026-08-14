"use client";

import { CuboidCollider, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { RectObstacle, rectCollides, removeObstacle, setObstacle } from "@/lib/obstacles";
import { VehicleConfig, pivotHeightOf, defaultVariant } from "@/lib/vehicles";
import { VehicleMesh } from "./VehicleMesh";
import { VehicleLights } from "./VehicleLights";
import { vehicleGearEdges } from "./inputEdges";
import { useSimStore } from "@/store/simStore";
import { FINISH_Z, PAR_TIME_S, ROAD_HALF_WIDTH, distanceToRoadCenterline } from "@/lib/track";
import { isInPotholeZone, isInRefuelZone } from "@/lib/scenery";
import { speedLimitAt, SPEED_TOLERANCE_KMH, WRONG_WAY_THRESHOLD_M } from "@/lib/rules";
import { WEATHERS } from "@/lib/weather";
import { loadFinishedVehicles, saveFinishedVehicles } from "@/lib/achievements";
import { VehicleTransform } from "./transform";
import { vehicleAudio } from "./audio/vehicleAudio";
import { REVERSE, NEUTRAL, topSpeedInGear, accelInGear, autoGearFor } from "@/lib/transmission";
import { createSteeringState, updateSteering, createYawState, stepYaw } from "@/lib/vehicleDynamics";

// Sistem kerusakan: damage naik saat menabrak objek solid, makin cepat makin
// parah; merusak performa dan bisa menggagalkan latihan.
const DAMAGE_SOLID_PER_HIT = 14;
const DAMAGE_FAIL_THRESHOLD = 100;
const DAMAGE_SPEED_PENALTY = 0.5; // hingga -50% top speed di damage penuh
const DAMAGE_WARN_COOLDOWN_MS = 3000;
const FUEL_EMPTY_COOLDOWN_MS = 4000;
const REFUEL_RATE = 0.25; // per detik saat berada di zona SPBU
const OFF_ROAD_FRICTION_MULT = 2.2;
const OFF_ROAD_MAX_SPEED_MULT = 0.4;
// Zona lubang/area jalan rusak: kecepatan & handling terganggu (bukan stop).
const POTHOLE_SPEED_MULT = 0.55;
const POTHOLE_FRICTION_MULT = 1.7;
const OVER_REV_SHIFT_TOLERANCE = 1.08;
const STOP_THRESHOLD = 0.5; // m/s, "basically stopped" for gear-direction changes
const ANTI_ROLL_BASELINE = 5000; // reference point where antiRollForce has no extra effect
const HANDBRAKE_DAMP_RATE = 6; // 1/s, how hard the handbrake fights any speed
const HANDBRAKE_WARN_COOLDOWN_MS = 2500;
// Solid-collision stepping: the vehicle is kinematic, so Rapier never pushes
// it back — the per-frame move is walked in substeps and the vehicle stops
// flush against the first solid obstacle (pedestrian, pole, ...). Eight
// substeps keep the maximum one-frame overshoot under ~5cm at top speed.
const COLLISION_SUBSTEPS = 8;
const SELF_OBSTACLE_ID = "player-vehicle";

function vehicleRect(config: VehicleConfig, x: number, z: number, yaw: number): RectObstacle {
  return {
    shape: "rect",
    kind: "vehicle",
    x,
    z,
    yaw,
    halfW: config.dimensions.width / 2,
    halfL: config.dimensions.length / 2,
  };
}

export function VehicleController({
  config,
  transform,
}: {
  config: VehicleConfig;
  transform: VehicleTransform;
}) {
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
  const hasHitPedestrian = useRef(false);
  // Rintangan yang sudah dihitung sebagai hit (satu kali per objek per run)
  // — cone/barrier/kendaraan parkir tidak boleh menambah skor berulang kali
  // selama kendaraan masih menempel di objek yang sama.
  const hitObstacleIds = useRef(new Set<string>());
  // Pelanggaran kecepatan: akumulasi waktu di atas batas sebelum dicatat.
  const overSpeedMs = useRef(0);
  const speedViolationCooldown = useRef(0);
  // Melawan arus: akumulasi jarak mundur (bukan posisi, tapi kecepatan +Z).
  const wrongWayAccum = useRef(0);
  const wrongWayCooldown = useRef(0);
  const damageWarnAt = useRef(0);
  const fuelWarnAt = useRef(0);

  // Unregister this vehicle's solid obstacle whenever it unmounts (phase
  // flips to finished/failed) so the registry never holds a stale rect, and
  // cut any still-honking horn so it can't linger after the drive.
  useEffect(
    () => () => {
      removeObstacle(SELF_OBSTACLE_ID);
      vehicleAudio.setHorn(false);
    },
    []
  );

  const setSpeedKmh = useSimStore((s) => s.setSpeedKmh);
  const setIsOffRoad = useSimStore((s) => s.setIsOffRoad);
  const registerOffRoadEvent = useSimStore((s) => s.registerOffRoadEvent);
  const registerObstacleHit = useSimStore((s) => s.registerObstacleHit);
  const registerViolation = useSimStore((s) => s.registerViolation);
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
  const failSimulation = useSimStore((s) => s.failSimulation);
  const addDamage = useSimStore((s) => s.addDamage);
  const setRefueling = useSimStore((s) => s.setRefueling);
  const consumeFuel = useSimStore((s) => s.consumeFuel);
  const recordTrip = useSimStore((s) => s.recordTrip);
  const addFuel = useSimStore((s) => s.addFuel);
  const setPlayerPos = useSimStore((s) => s.setPlayerPos);
  const setSpeedLimit = useSimStore((s) => s.setSpeedLimit);
  const unlockAchievement = useSimStore((s) => s.unlockAchievement);
  // Varian kendaraan — hanya 1 varian default per kendaraan.
  const vehicleType = useSimStore((s) => s.vehicle);
  const variant = defaultVariant(vehicleType);

  useFrame((_, rawDelta) => {
    // Keep the registry's copy of this vehicle's rect in sync every frame so
    // pedestrians (and any other solid object) stop against it instead of
    // walking through — the vehicle blocks them, and they block it back.
    setObstacle(SELF_OBSTACLE_ID, vehicleRect(config, transform.position.x, transform.position.z, yaw.current));

    const body = rigidBody.current;
    if (!body || phase !== "driving") {
      vehicleAudio.silence();
      vehicleAudio.setHorn(false);
      vehicleGearEdges.clear();
      return;
    }

    // The merged input snapshot published by InputManager each frame — the
    // single source of truth whether the driver is on keyboard, VR controller,
    // or a desktop gamepad.
    const state = useSimStore.getState();
    const vi = state.vehicleInput;

    // Pause freezes the whole drive loop: no movement, no timer, no warnings.
    if (state.paused) {
      vehicleAudio.silence();
      vehicleAudio.setHorn(false);
      vehicleGearEdges.clear();
      return;
    }

    // Engine off (still in ignition ACC/ON/START, or stalled): the car is a
    // stationary shell — no movement, no timer, no engine note — until the
    // player actually starts it. Matches "mesin harus menyala dulu" in spec.
    // The horn still works here (it runs off the battery, like a real car).
    if (!engineRunning) {
      vehicleAudio.silence();
      vehicleAudio.setHorn(vi.horn);
      return;
    }

    const delta = Math.min(rawDelta, 0.05);
    const throttle = vi.throttle;
    const throttleOn = throttle > 0;
    const brakePedal = vi.brake > 0.1;
    const isClutchHeld = vi.clutch;
    vehicleAudio.setHorn(vi.horn);

    // Cuaca: hujan menurunkan grip ban & membuat rem kurang efektif.
    const weather = WEATHERS[state.weather];
    const gripMultiplier = weather.gripMultiplier;
    // Air brake (truk): rem jauh lebih kuat saat diaktifkan (md "Air Brake").
    const effectiveBraking = state.airBrakeOn
      ? config.braking * 1.6
      : config.braking * (0.9 + 0.1 * gripMultiplier);

    // Clutch bookkeeping (manual only): ticks the checklist the first time
    // it's pressed, and — on release — stalls the engine if the driver let it
    // out fully, in gear, at a standstill, with no gas ("kopling dilepas
    // terlalu cepat saat mulai berjalan").
    if (transmissionMode === "manual") {
      if (isClutchHeld) markClutchedOnce();
      const justReleased = clutchWasHeld.current && !isClutchHeld;
      clutchWasHeld.current = isClutchHeld;
      if (justReleased && gear.current >= 0 && Math.abs(speed.current) < STOP_THRESHOLD && !throttleOn) {
        stallEngine("Mesin mati! Kopling dilepas terlalu cepat tanpa gas.");
        vehicleAudio.stallThud();
        vehicleAudio.silence();
        return;
      }
    } else {
      clutchWasHeld.current = isClutchHeld;
    }

    const currentPos = transform.position;
    // Posisi pemain untuk minimap/GPS (dibaca AI untuk memberi jalan).
    setPlayerPos(currentPos.x, currentPos.z);
    const offRoad = distanceToRoadCenterline(currentPos.x, currentPos.z) > ROAD_HALF_WIDTH;
    // Zona lubang/jalan rusak (visual + efek handling di lib/scenery.ts).
    const inPothole = isInPotholeZone(currentPos.x, currentPos.z);

    if (offRoad && !wasOffRoad.current) {
      registerOffRoadEvent();
    }
    wasOffRoad.current = offRoad;
    setIsOffRoad(offRoad);

    // Kerusakan mengurangi kecepatan maksimum (semakin rusak semakin lambat).
    const damageMult = 1 - (state.damage / DAMAGE_FAIL_THRESHOLD) * DAMAGE_SPEED_PENALTY;
    const maxSpeed = (offRoad
      ? config.maxSpeed * OFF_ROAD_MAX_SPEED_MULT
      : inPothole
        ? config.maxSpeed * POTHOLE_SPEED_MULT
        : config.maxSpeed) * damageMult;
    const friction = offRoad
      ? config.friction * OFF_ROAD_FRICTION_MULT
      : inPothole
        ? config.friction * POTHOLE_FRICTION_MULT
        : config.friction * weather.frictionMultiplier;

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

    // Gear edges are shared across modes — consume them once, up front.
    const wantsShiftUp = vehicleGearEdges.delete("gearUp");
    const wantsShiftDown = vehicleGearEdges.delete("gearDown");
    const wantsReverse = vehicleGearEdges.delete("reverse");
    const wantsNeutral = vehicleGearEdges.delete("neutral");

    if (transmissionMode === "manual") {
      if (wantsShiftUp || wantsShiftDown) {
        if (!isClutchHeld) {
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
          if (!isClutchHeld) rejectUngatedShift();
          else gear.current = REVERSE;
        }
      } else if (wantsNeutral) {
        // Netral (N): only while basically stopped, still clutch-gated.
        if (!isClutchHeld) {
          rejectUngatedShift();
        } else if (Math.abs(speed.current) < STOP_THRESHOLD) {
          gear.current = NEUTRAL;
        }
      }

      if (gear.current === REVERSE) {
        // Kopling ditekan = tenaga MUTUS: gas tidak diteruskan ke roda,
        // kendaraan meluncur bebas (coast) tanpa rem mesin. Gigi R hanya
        // "siap", baru mundur saat kopling dilepas + gas.
        if (throttleOn && !isClutchHeld) {
          accelInput = -config.acceleration;
          speed.current = Math.max(-config.reverseMaxSpeed, speed.current - config.acceleration * delta);
        } else if (isClutchHeld) {
          speed.current = THREE.MathUtils.damp(speed.current, 0, friction * 0.35, delta);
        } else {
          speed.current = Math.min(0, speed.current + friction * delta);
        }
        rpmRatio = isClutchHeld && throttleOn
          ? Math.min(1, 0.55 + throttle * 0.4) // mesin rev bebas (kopling masuk)
          : Math.min(1, Math.abs(speed.current) / config.reverseMaxSpeed);
      } else if (gear.current === NEUTRAL) {
        speed.current = THREE.MathUtils.damp(speed.current, 0, friction, delta);
        rpmRatio = throttleOn ? 0.55 : 0.15;
      } else {
        const ratio = config.gearRatios[gear.current];
        const gearCeiling = topSpeedInGear(maxSpeed, ratio);
        const gearAccel = accelInGear(config.acceleration, ratio);
        if (throttleOn && !isClutchHeld) {
          accelInput = gearAccel;
          speed.current = Math.min(gearCeiling, speed.current + gearAccel * delta);
        } else if (isClutchHeld) {
          // Kopling masuk: tidak ada tenaga ke roda — meluncur bebas tanpa
          // rem mesin (coast), gas hanya memutar mesin (rev).
          accelInput = 0;
          speed.current = THREE.MathUtils.damp(speed.current, 0, friction * 0.35, delta);
        } else {
          speed.current -= friction * delta;
        }
        speed.current = THREE.MathUtils.clamp(speed.current, 0, gearCeiling);
        rpmRatio = isClutchHeld && throttleOn
          ? Math.min(1, 0.55 + throttle * 0.4) // rev bebas saat kopling ditekan
          : Math.min(1, speed.current / Math.max(0.01, gearCeiling));
      }
    } else {
      // Automatic: no clutch, no player gear selection. [R] just flips a
      // forward/reverse drivetrain direction (like a PRND selector) while
      // nearly stopped; gear.current is mirrored to REVERSE purely so the
      // HUD's gearLabel() can show "R" the same way it does in manual mode.
      if (wantsReverse && Math.abs(speed.current) < STOP_THRESHOLD) {
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
        speed.current = Math.max(0, speed.current - effectiveBraking * delta);
      } else {
        speed.current = Math.min(0, speed.current + effectiveBraking * delta);
      }
      accelInput = speed.current > 0 ? -effectiveBraking : speed.current < 0 ? effectiveBraking : 0;
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
    const smoothedSteerAngle = updateSteering(steering.current, vi.steer, speed.current, config, delta);

    // Visually turn the handlebar/front-wheel assembly (see GltfVehicleMesh)
    // to match — reusing the already-damped angle keeps it in lockstep with
    // the car's actual turning, rather than a separate cosmetic wobble.
    for (const group of steerGroups.current) {
      group.rotation.y = smoothedSteerAngle;
    }

    // Kinematic bicycle model with a tire-grip ceiling: pure no-slip
    // geometric turning (v/wheelbase * tan(angle)) up to what the tires can
    // actually hold, understeering — not sliding — beyond that. Cuaca hujan
    // menurunkan ceiling (tireGrip) sehingga understeer muncul lebih cepat.
    const wetConfig = gripMultiplier < 1 ? { ...config, tireGrip: config.tireGrip * gripMultiplier } : config;
    const yawStep = stepYaw(yawDynamics.current, speed.current, smoothedSteerAngle, wetConfig, delta);
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

    // Solid collision: walk the move in substeps and keep only the portion up
    // to the first registered solid obstacle. The body is kinematic, so this
    // explicit blocking is what keeps the vehicle from tunneling through
    // poles, pedestrians, etc.
    let finalX = nextX;
    let finalZ = nextZ;
    const moveX = nextX - currentPos.x;
    const moveZ = nextZ - currentPos.z;
    if (moveX !== 0 || moveZ !== 0) {
      const rect = vehicleRect(config, 0, 0, yaw.current);
      for (let i = 1; i <= COLLISION_SUBSTEPS; i++) {
        const t = i / COLLISION_SUBSTEPS;
        rect.x = currentPos.x + moveX * t;
        rect.z = currentPos.z + moveZ * t;
        const hit = rectCollides(rect, { ignoreId: SELF_OBSTACLE_ID });
        if (hit) {
          const { id, obstacle } = hit;
          // Contacting a pedestrian is an accident — same outcome the
          // pedestrian's own sensor used to enforce, now guaranteed by the
          // blocking itself (the vehicle never ghosts through first).
          if (obstacle.kind === "pedestrian" && !hasHitPedestrian.current) {
            hasHitPedestrian.current = true;
            vehicleAudio.silence();
            failSimulation("Latihan dihentikan karena terjadi kecelakaan dengan pejalan kaki.");
          }
          // Setiap rintangan yang disentuh dihitung SATU KALI per objek per
          // run (dedupe by id) — cone/barrier/kendaraan parkir tidak boleh
          // menambah skor berulang kali selama kendaraan masih menempel.
          // Damping kecepatan juga hanya diterapkan sekali di sini: jika
          // diterapkan per substep, sebuah cone yang dilalui kendaraan
          // (bodies menimpa rintangan selama puluhan substep) akan
          // mengerem kendaraan hampir berhenti total.
          if (obstacle.kind !== "pedestrian" && !hitObstacleIds.current.has(id)) {
            hitObstacleIds.current.add(id);
            registerObstacleHit();
            if (obstacle.soft) {
              // Rintangan lunak (cone lalu lintas, kios pedagang): kendaraan
              // menerobos dengan sedikit kehilangan kecepatan — bukan tembok.
              speed.current *= 0.85;
            } else {
              // Objek solid (barrier, tiang, kendaraan parkir, AI): berhenti
              // rapat di tepinya + sistem kerusakan. Makin kencang tabrakan,
              // makin banyak damage.
              speed.current = THREE.MathUtils.damp(speed.current, 0, 8, delta);
              const impact = Math.min(1, Math.abs(speed.current) / config.maxSpeed);
              const dmg = DAMAGE_SOLID_PER_HIT * (0.5 + impact);
              addDamage(dmg);
              const fresh = useSimStore.getState();
              if (fresh.damage >= DAMAGE_FAIL_THRESHOLD) {
                vehicleAudio.silence();
                failSimulation("Kendaraan rusak parah akibat tabrakan — latihan dihentikan.");
              } else if (performance.now() - damageWarnAt.current > DAMAGE_WARN_COOLDOWN_MS) {
                damageWarnAt.current = performance.now();
                raiseWarning(`Kerusakan kendaraan: ${Math.round(fresh.damage)}%`);
              }
            }
          }
          // Rintangan lunak: terus maju (tanpa break). Rintangan solid:
          // berhenti di tepinya (finalX/finalZ tetap pada substep terakhir
          // yang bebas).
          if (!obstacle.soft) break;
        }
        finalX = rect.x;
        finalZ = rect.z;
      }
    }

    body.setNextKinematicTranslation({ x: finalX, y: 0, z: finalZ });
    body.setNextKinematicRotation(quat);

    transform.position.set(finalX, 0, finalZ);
    transform.quaternion.copy(quat);

    // Keep the registered rect glued to the pose we just committed to.
    setObstacle(SELF_OBSTACLE_ID, vehicleRect(config, finalX, finalZ, yaw.current));

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
    setSpeedLimit(speedLimitAt(finalZ));

    // ── Bahan bakar, Trip Computer & SPBU ─────────────────────────────────
    // Mesin menyala mengkonsumsi bensin; habis → mesin mati (md "Indikator
    // bensin" + "Pengisian BBM di SPBU"). Konsumsi kini berbasis JARAK dan
    // gaya gas (bukan timer): makin kencang meraup gas, makin boros — bahan
    // bakar untuk Trip Computer & Eco Driving Score.
    if (useSimStore.getState().engineRunning) {
      consumeFuel(delta * 1000, Math.abs(speed.current), throttle);
      recordTrip(delta * 1000, Math.abs(speed.current));
      if (useSimStore.getState().fuel <= 0) {
        const now = performance.now();
        if (now - fuelWarnAt.current > FUEL_EMPTY_COOLDOWN_MS) {
          fuelWarnAt.current = now;
          stallEngine("Bensin habis! Isi BBM di SPBU (tekuk ke area SPBU).");
        }
      }
    }
    const inRefuel = isInRefuelZone(currentPos.x, currentPos.z);
    setRefueling(inRefuel);
    if (inRefuel && Math.abs(speed.current) < 1) {
      addFuel(REFUEL_RATE * delta);
    }

    // ── Batas kecepatan (md "Mematuhi batas kecepatan") ──────────────────
    const limit = speedLimitAt(finalZ);
    const kmh = Math.abs(speed.current) * 3.6;
    if (kmh > limit + SPEED_TOLERANCE_KMH) {
      overSpeedMs.current += delta * 1000;
      if (overSpeedMs.current > 700 && performance.now() - speedViolationCooldown.current > 2500) {
        speedViolationCooldown.current = performance.now();
        overSpeedMs.current = 0;
        registerViolation(1);
        raiseWarning(`Melebihi batas kecepatan (${limit} km/j)!`);
      }
    } else {
      overSpeedMs.current = Math.max(0, overSpeedMs.current - delta * 1000);
    }

    // ── Melawan arus (md "Tidak melawan arus") ────────────────────────────
    // Kendaraan maju ke arah -Z. Bergerak signifikan ke +Z dengan gigi maju
    // (bukan mundur) = melawan arus.
    const movingBackward = gear.current >= 0 && speed.current > 1 && finalZ > currentPos.z;
    if (movingBackward) {
      wrongWayAccum.current += finalZ - currentPos.z;
    } else {
      wrongWayAccum.current = Math.max(0, wrongWayAccum.current - delta * 2);
    }
    if (wrongWayAccum.current > WRONG_WAY_THRESHOLD_M && performance.now() - wrongWayCooldown.current > 3000) {
      wrongWayCooldown.current = performance.now();
      wrongWayAccum.current = 0;
      registerViolation(1);
      raiseWarning("Melawan arus! Belok kembali ke jalur yang benar.");
    }

    // Achievement: melaju kencang (md "Statistik Berkendara"). Batas maksimum
    // semua kendaraan 70 km/j, jadi ambang dicapai saat mendekati kecepatan
    // maksimum.
    if (kmh >= 65) unlockAchievement("speed-demon");

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

    if (!hasFinished.current && finalZ <= FINISH_Z) {
      hasFinished.current = true;
      // Scene/VehicleController unmounts the instant phase flips to
      // "finished" (SimulationApp swaps to <FinishedScreen>), so this is the
      // last chance this component gets to run — silence here, synchronously,
      // before that unmount happens, or the engine note is left hanging.
      vehicleAudio.silence();
      vehicleAudio.setHorn(false);
      const finishState = useSimStore.getState();
      const elapsedS = finishState.elapsedMs / 1000;
      const timePenalty = Math.max(0, elapsedS - PAR_TIME_S) * 1;
      const score = Math.max(
        0,
        Math.round(
          100 -
            finishState.violations * 8 -
            finishState.offRoadCount * 5 -
            finishState.obstacleHits * 3 -
            timePenalty
        )
      );

      // ── Achievement (md "Achievement") ──────────────────────────────────
      const unlock = (id: string) => useSimStore.getState().unlockAchievement(id);
      unlock("first-drive");
      if (finishState.violations === 0) unlock("no-violations");
      if (finishState.obstacleHits === 0 && finishState.offRoadCount === 0) unlock("clean-run");
      if (elapsedS <= PAR_TIME_S) unlock("par-time");
      if (finishState.weather === "malam" || finishState.weather === "senja") unlock("night-driver");
      // Kolektor: selesaikan motor, mobil, DAN truk (disimpan di localStorage).
      const stored = loadFinishedVehicles();
      const next = Array.from(new Set([...stored, finishState.vehicle]));
      saveFinishedVehicles(next);
      if (next.length >= 3) unlock("all-vehicles");

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
        position={transform.position}
        rotation={new THREE.Euler().setFromQuaternion(transform.quaternion)}
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
      <group ref={visualRoot} position={transform.position} quaternion={transform.quaternion}>
        <Suspense fallback={null}>
          <VehicleMesh config={config} variant={variant} leanRef={visualGroup} steerRef={steerGroups} />
        </Suspense>
        {/* Headlights / high beam / signal blinkers live on the visible model
            so they follow the exact same pose the camera sees. */}
        <VehicleLights config={config} />
      </group>
    </>
  );
}
