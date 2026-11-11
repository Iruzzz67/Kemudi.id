"use client";

import { CuboidCollider, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { TrafficVehicleModel } from "./vehicles/TrafficVehicleModel";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import {
  AI_VEHICLE_CONFIGS,
  AI_SPAWNS,
  AiVehicleConfig,
  AiVehicleSpawn,
  getSampleAtIndex,
  trafficLightAhead,
  pedestrianAhead,
  vehicleAhead,
  isRoadStraight,
  adjacentLaneClear,
  getOvertakeLaneOffset,
  TRAFFIC_LIGHT_STOP_DISTANCE,
} from "@/lib/aiVehicles";
import { getRoadSamples, headingFromTangent } from "@/lib/track";
import { removeObstacle, setObstacle } from "@/lib/obstacles";

// Braking distance (in sample indices) at which the AI starts slowing down
// smoothly rather than slamming on the brakes. ~0.57 m per sample →
// 60 samples ≈ 34 m.
const BRAKE_DISTANCE = 60;
// Minimum distance (in sample indices) to maintain from obstacles.
const SAFE_DISTANCE = 8;
// How fast the AI decelerates toward a stop target (m/s²).
const AI_BRAKING = 6;
// Stop threshold — if speed drops below this, snap to zero.
const AI_STOP_THRESHOLD = 0.3;

/**
 * A colored box that represents an AI traffic vehicle on the road.
 * Uses a simple box mesh since we don't have dedicated AI vehicle models.
 */
function AiVehicleBody({ config }: { config: AiVehicleConfig }) {
  const isEmergency = config.type === "police" || config.type === "ambulance";
  const isMotorcycle = config.type === "motorcycle";
  const isTruck = config.type === "truck";
  const isBus = config.type === "bus";

  return (
    <group>
      {/* Main body */}
      <mesh castShadow position={[0, config.height / 2, 0]}>
        <boxGeometry args={[config.width, config.height, config.length]} />
        <meshStandardMaterial color={config.color} roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Windshield */}
      {!isMotorcycle && (
        <mesh position={[0, config.height * 0.75, -config.length * 0.15]}>
          <boxGeometry args={[config.width * 0.85, config.height * 0.3, config.length * 0.25]} />
          <meshStandardMaterial color="#1e293b" roughness={0.1} metalness={0.5} />
        </mesh>
      )}

      {/* Pickup bed / cargo area */}
      {config.type === "pickup" && (
        <mesh position={[0, config.height * 0.3, config.length * 0.2]}>
          <boxGeometry args={[config.width * 0.9, config.height * 0.5, config.length * 0.4]} />
          <meshStandardMaterial color="#57534e" roughness={0.8} metalness={0.2} />
        </mesh>
      )}

      {/* Truck cargo box */}
      {isTruck && (
        <mesh position={[0, config.height * 0.55, config.length * 0.05]}>
          <boxGeometry args={[config.width * 0.95, config.height * 0.6, config.length * 0.5]} />
          <meshStandardMaterial color="#44403c" roughness={0.85} metalness={0.15} />
        </mesh>
      )}

      {/* Bus roof + windows */}
      {isBus && (
        <>
          <mesh position={[0, config.height + 0.15, 0]}>
            <boxGeometry args={[config.width * 0.95, 0.3, config.length * 0.9]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} metalness={0.2} />
          </mesh>
          {/* Side windows */}
          {[-1, 1].map((side) => (
            <mesh key={`buswin-${side}`} position={[side * config.width * 0.48, config.height * 0.7, 0]}>
              <boxGeometry args={[0.05, config.height * 0.3, config.length * 0.75]} />
              <meshStandardMaterial color="#93c5fd" roughness={0.1} metalness={0.4} transparent opacity={0.7} />
            </mesh>
          ))}
        </>
      )}

      {/* Police markings */}
      {config.type === "police" && (
        <>
          {/* Light bar on roof */}
          <mesh position={[0, config.height + 0.12, 0]}>
            <boxGeometry args={[config.width * 0.5, 0.15, 0.6]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.5} />
          </mesh>
          {/* Blue/red lights */}
          <mesh position={[-0.2, config.height + 0.22, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={2} />
          </mesh>
          <mesh position={[0.2, config.height + 0.22, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
          </mesh>
          {/* "POLISI" stripe */}
          <mesh position={[0, config.height * 0.3, 0]}>
            <boxGeometry args={[config.width + 0.02, 0.25, config.length * 0.6]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
          </mesh>
        </>
      )}

      {/* Ambulance markings */}
      {config.type === "ambulance" && (
        <>
          {/* Red cross on sides */}
          {[-1, 1].map((side) => (
            <group key={`amb-${side}`}> 
              <mesh position={[side * config.width * 0.51, config.height * 0.5, 0]}>
                <boxGeometry args={[0.05, 0.5, 0.15]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
              <mesh position={[side * config.width * 0.51, config.height * 0.5, 0]}>
                <boxGeometry args={[0.05, 0.15, 0.5]} />
                <meshStandardMaterial color="#ef4444" />
              </mesh>
            </group>
          ))}
          {/* Light bar */}
          <mesh position={[0, config.height + 0.15, 0]}>
            <boxGeometry args={[config.width * 0.5, 0.12, 0.5]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} metalness={0.4} />
          </mesh>
          <mesh position={[0, config.height + 0.25, 0]}>
            <boxGeometry args={[config.width * 0.4, 0.08, 0.35]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.5} />
          </mesh>
        </>
      )}

      {/* Wheels */}
      {(() => {
        const wheelRadius = isMotorcycle ? 0.18 : 0.2;
        const wheelPositions: [number, number, number][] = [];
        if (isMotorcycle) {
          wheelPositions.push(
            [0, wheelRadius, -config.length * 0.35],
            [0, wheelRadius, config.length * 0.35]
          );
        } else {
          const hw = config.width / 2 + 0.05;
          wheelPositions.push(
            [-hw, 0.15, -config.length * 0.3],
            [hw, 0.15, -config.length * 0.3],
            [-hw, 0.15, config.length * 0.3],
            [hw, 0.15, config.length * 0.3]
          );
          // Extra wheels for trucks/buses (6 wheels)
          if (isTruck || isBus) {
            wheelPositions.push(
              [-hw, 0.15, config.length * 0.1],
              [hw, 0.15, config.length * 0.1]
            );
          }
        }
        return wheelPositions.map((pos, i) => (
          <mesh key={`w-${i}`} position={pos} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[wheelRadius, wheelRadius, 0.12, 8]} />
            <meshStandardMaterial color="#1f2937" roughness={0.9} />
          </mesh>
        ));
      })()}

      {/* Headlights */}
      {[-config.width * 0.3, config.width * 0.3].map((x, i) => (
        <mesh key={`hl-${i}`} position={[x, config.height * 0.35, -config.length / 2]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={isEmergency ? 2.0 : 1.5} />
        </mesh>
      ))}

      {/* Tail lights */}
      {!isMotorcycle && [-config.width * 0.3, config.width * 0.3].map((x, i) => (
        <mesh key={`tl-${i}`} position={[x, config.height * 0.35, config.length / 2]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function AiVehicle({ spawn, selfIndex }: { spawn: AiVehicleSpawn; selfIndex: number }) {
  const rigidBody = useRef<RapierRigidBody>(null);
  const visualRoot = useRef<THREE.Group>(null);

  const config = AI_VEHICLE_CONFIGS[spawn.type];
  const maxSpeed = config.maxSpeed * spawn.speedMult;

  // Mutable state refs (updated every frame, never trigger re-renders)
  const sampleIndex = useRef(spawn.sampleIndex);
  const speed = useRef(maxSpeed * 0.6); // start at cruising speed
  const yaw = useRef(0);
  const obstacleId = useRef(`ai-${selfIndex}`);
  const hasSpawned = useRef(false);

  // ── Overtaking state ──────────────────────────────────────────
  const currentLaneOffset = useRef(spawn.laneOffset);
  const isOvertaking = useRef(false);
  const overtakePhase = useRef<"idle" | "approach" | "passing" | "returning">("idle");
  const overtakeTimer = useRef(0);
  const overtakeCooldown = useRef(0);

  const phase = useSimStore((s) => s.phase);
  const pedestrianCrossings = useSimStore((s) => s.pedestrianCrossings);

  // Cleanup obstacle on unmount
  useEffect(() => () => removeObstacle(obstacleId.current), []);

  // Initialize position on first frame
  useFrame((_, rawDelta) => {
    const body = rigidBody.current;
    if (!body) return;
    if (phase !== "driving") return;

    const delta = Math.min(rawDelta, 0.05);
    const samples = getRoadSamples();

    // Initialize position on first frame
    if (!hasSpawned.current) {
      hasSpawned.current = true;
      const s = getSampleAtIndex(sampleIndex.current);
      if (!s) return;
      const heading = headingFromTangent(s.tangent);
      const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        heading
      );
      const initLane = currentLaneOffset.current;
      const worldX = s.point.x + rightVec.x * initLane;
      const worldZ = s.point.z + rightVec.z * initLane;

      body.setNextKinematicTranslation({ x: worldX, y: 0, z: worldZ });
      body.setNextKinematicRotation(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading)
      );
      yaw.current = heading;

      if (visualRoot.current) {
        visualRoot.current.position.set(worldX, 0, worldZ);
        visualRoot.current.quaternion.copy(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading)
        );
      }

      setObstacle(obstacleId.current, {
        shape: "rect",
        kind: "vehicle",
        x: worldX,
        z: worldZ,
        yaw: heading,
        halfW: config.width / 2,
        halfL: config.length / 2,
      });
    }

    // ── AI Decision Logic ────────────────────────────────────────
    let targetSpeed = maxSpeed;
    let shouldStop = false;

    // 1. Check traffic lights ahead
    const tlResult = trafficLightAhead(sampleIndex.current, spawn.direction);
    if (tlResult) {
      if (tlResult.distance < TRAFFIC_LIGHT_STOP_DISTANCE) {
        shouldStop = true;
        targetSpeed = 0;
      } else if (tlResult.distance < BRAKE_DISTANCE) {
        const brakeFactor = tlResult.distance / BRAKE_DISTANCE;
        targetSpeed = maxSpeed * brakeFactor * 0.3;
      }
    }

    // 2. Check pedestrians at crossings ahead
    const pedDistance = pedestrianAhead(
      sampleIndex.current,
      spawn.direction,
      pedestrianCrossings
    );
    if (pedDistance > 0) {
      if (pedDistance < SAFE_DISTANCE) {
        shouldStop = true;
        targetSpeed = 0;
      } else if (pedDistance < BRAKE_DISTANCE) {
        const brakeFactor = pedDistance / BRAKE_DISTANCE;
        targetSpeed = Math.min(targetSpeed, maxSpeed * brakeFactor * 0.4);
      }
    }

    // 3. Check other AI vehicles ahead (same lane) + Overtaking logic
    const vehDistance = vehicleAhead(
      sampleIndex.current,
      spawn.direction,
      currentLaneOffset.current,
      AI_SPAWNS,
      selfIndex
    );

    // Cooldown tick
    if (overtakeCooldown.current > 0) {
      overtakeCooldown.current = Math.max(0, overtakeCooldown.current - delta);
    }

    // Determine if we should try to overtake
    const shouldOvertake = (
      !shouldStop &&
      !isOvertaking.current &&
      overtakeCooldown.current <= 0 &&
      vehDistance > SAFE_DISTANCE &&
      vehDistance < 40 && // vehicle is close enough to bother overtaking
      speed.current < maxSpeed * 0.6 && // we're significantly faster
      tlResult === null && // no red light ahead
      pedDistance === -1 // no pedestrians ahead
    );

    if (shouldOvertake) {
      // Check conditions for overtaking
      const roadOk = isRoadStraight(sampleIndex.current, spawn.direction);
      const targetLane = getOvertakeLaneOffset(currentLaneOffset.current);
      const laneClear = adjacentLaneClear(
        sampleIndex.current,
        spawn.direction,
        targetLane,
        AI_SPAWNS,
        selfIndex
      );

      if (roadOk && laneClear) {
        isOvertaking.current = true;
        overtakePhase.current = "approach";
        overtakeTimer.current = 0;
      }
    }

    // ── Overtaking state machine ──────────────────────────────
    if (isOvertaking.current) {
      const overtakeLane = getOvertakeLaneOffset(spawn.laneOffset);
      const lateralSpeed = 3.0; // m/s lateral movement speed

      switch (overtakePhase.current) {
        case "approach": {
          // Move toward overtaking lane
          const diff = overtakeLane - currentLaneOffset.current;
          const step = Math.sign(diff) * lateralSpeed * delta;
          if (Math.abs(diff) < 0.3) {
            currentLaneOffset.current = overtakeLane;
            overtakePhase.current = "passing";
            overtakeTimer.current = 0;
          } else {
            currentLaneOffset.current += step;
          }
          // Accelerate to pass
          targetSpeed = maxSpeed * 1.15;
          break;
        }
        case "passing": {
          // We're in the overtaking lane, drive fast to get past
          targetSpeed = maxSpeed * 1.15;
          overtakeTimer.current += delta;

          // Check if original lane is now clear ahead (we've passed the slow vehicle)
          const origLaneVehDist = vehicleAhead(
            sampleIndex.current,
            spawn.direction,
            spawn.laneOffset,
            AI_SPAWNS,
            selfIndex
          );

          // After at least 1.5s and the original lane ahead is clear or far enough
          const canReturn = overtakeTimer.current > 1.5 && (
            origLaneVehDist === -1 || origLaneVehDist > 50
          );
          if (canReturn) {
            overtakePhase.current = "returning";
          }
          break;
        }
        case "returning": {
          // Move back to original lane
          const diff = spawn.laneOffset - currentLaneOffset.current;
          if (Math.abs(diff) < 0.3) {
            currentLaneOffset.current = spawn.laneOffset;
            isOvertaking.current = false;
            overtakePhase.current = "idle";
            overtakeCooldown.current = 4.0; // don't overtake again for 4 seconds
          } else {
            currentLaneOffset.current += Math.sign(diff) * lateralSpeed * delta;
          }
          targetSpeed = maxSpeed;
          break;
        }
      }
    } else if (vehDistance > 0) {
      // Normal following behavior (not overtaking)
      if (vehDistance < SAFE_DISTANCE) {
        shouldStop = true;
        targetSpeed = 0;
      } else if (vehDistance < BRAKE_DISTANCE) {
        const brakeFactor = vehDistance / BRAKE_DISTANCE;
        targetSpeed = Math.min(targetSpeed, maxSpeed * brakeFactor * 0.5);
      }
    }

    // ── Physics Update ───────────────────────────────────────────
    if (shouldStop || speed.current > targetSpeed) {
      // Brake
      speed.current = Math.max(targetSpeed, speed.current - AI_BRAKING * delta);
      if (speed.current < AI_STOP_THRESHOLD && shouldStop) {
        speed.current = 0;
      }
    } else {
      // Accelerate back to cruising speed
      speed.current = Math.min(maxSpeed, speed.current + config.acceleration * 0.5 * delta);
    }

    // Move along the road
    const step = speed.current * delta * spawn.direction;
    sampleIndex.current += step;

    // Clamp to road bounds
    const maxSample = samples.length - 1;
    if (sampleIndex.current < 0 || sampleIndex.current > maxSample) {
      sampleIndex.current = Math.max(0, Math.min(maxSample, sampleIndex.current));
      speed.current = 0;
    }

    // Get current position and heading from road samples
    const s = getSampleAtIndex(sampleIndex.current);
    if (!s) return;

    const heading = headingFromTangent(s.tangent);
    const rightVec = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      heading
    );

    const effectiveLane = currentLaneOffset.current;
    const worldX = s.point.x + rightVec.x * effectiveLane;
    const worldZ = s.point.z + rightVec.z * effectiveLane;

    yaw.current = heading;
    const quat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      heading
    );

    // AI vehicles always keep moving — no collision slowdown.
    // They register as obstacles so the player vehicle blocks against them,
    // but the AI itself ignores all collisions and drives through.
    const finalX = worldX;
    const finalZ = worldZ;

    body.setNextKinematicTranslation({ x: finalX, y: 0, z: finalZ });
    body.setNextKinematicRotation(quat);

    if (visualRoot.current) {
      visualRoot.current.position.set(finalX, 0, finalZ);
      visualRoot.current.quaternion.copy(quat);
    }

    // Update collision registry
    setObstacle(obstacleId.current, {
      shape: "rect",
      kind: "vehicle",
      x: finalX,
      z: finalZ,
      yaw: heading,
      halfW: config.width / 2,
      halfL: config.length / 2,
    });
  });

  return (
    <>
      <RigidBody
        ref={rigidBody}
        type="kinematicPosition"
        colliders={false}
        name="ai-vehicle"
        position={[0, 100, 0]} // start off-screen until first frame sets position
      >
        <CuboidCollider
          args={[config.width / 2, config.height / 2, config.length / 2]}
        />
      </RigidBody>
      <group ref={visualRoot} position={[0, 100, 0]}>
        {["car", "motorcycle", "truck", "police"].includes(config.type) ?
          <Suspense fallback={<AiVehicleBody config={config} />}><TrafficVehicleModel config={config} speed={speed} /></Suspense> :
          <AiVehicleBody config={config} />}
      </group>
    </>
  );
}
