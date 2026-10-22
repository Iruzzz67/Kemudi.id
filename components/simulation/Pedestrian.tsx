"use client";

import { CuboidCollider, RigidBody, RapierRigidBody } from "@react-three/rapier";
import { ActiveCollisionTypes } from "@dimforge/rapier3d-compat";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import { ROAD_HALF_WIDTH, RoadSample, headingFromTangent } from "@/lib/track";
import { circleCollides, removeObstacle, setObstacle } from "@/lib/obstacles";
import { vehicleAudio } from "./audio/vehicleAudio";

const WALK_SPEED = 1.3; // m/s
const PAUSE_S = 1.2; // dwell time at each curb before turning back
const SHOULDER_MARGIN = 1.4; // how far onto the shoulder the walk extends past the road edge
// Horizontal radius of the pedestrian's solid footprint. Bigger than the
// visual body so the car stops a small, forgiving distance away.
const PED_RADIUS = 0.3;

function PedestrianFigure() {
  return (
    <group>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[0.36, 0.62, 0.22]} />
        <meshStandardMaterial color="#2563eb" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#e0ac82" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[-0.1, 0.14, 0]}>
        <boxGeometry args={[0.14, 0.34, 0.16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.1, 0.14, 0]}>
        <boxGeometry args={[0.14, 0.34, 0.16]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Pedestrian({ sample, id }: { sample: RoadSample; id: string }) {
  const rigidBody = useRef<RapierRigidBody>(null);
  const facingRef = useRef<THREE.Group>(null);
  const hasHit = useRef(false);
  // Random per-instance phase offset so multiple crossings don't walk in lockstep —
  // computed once via useState's lazy initializer, which is the pattern React's
  // purity rule allows for one-time impure calls during render.
  const [phaseSeed] = useState(() => (Math.random() * 4 * (ROAD_HALF_WIDTH + SHOULDER_MARGIN)) / WALK_SPEED);
  const walkClock = useRef(phaseSeed);
  const failSimulation = useSimStore((s) => s.failSimulation);
  const setPedestrianCrossing = useSimStore((s) => s.setPedestrianCrossing);
  const clearPedestrianCrossing = useSimStore((s) => s.clearPedestrianCrossing);
  const simPhase = useSimStore((s) => s.phase);

  // Publisher side of the "must yield" check: PedestrianPriorityWatcher reads
  // this map to know which pedestrians are currently out on the asphalt
  // (not just standing on the shoulder) versus in transit.
  useEffect(() => () => clearPedestrianCrossing(id), [id, clearPedestrianCrossing]);

  // Register as a solid obstacle so the vehicle is physically blocked by the
  // pedestrian instead of driving through it.
  useEffect(() => {
    setObstacle(id, {
      shape: "circle",
      kind: "pedestrian",
      x: sample.point.x,
      z: sample.point.z,
      radius: PED_RADIUS,
    });
    return () => removeObstacle(id);
  }, [id, sample.point.x, sample.point.z]);

  const heading = useMemo(() => headingFromTangent(sample.tangent), [sample]);
  const quat = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading),
    [heading]
  );
  const rightVec = useMemo(() => new THREE.Vector3(1, 0, 0).applyQuaternion(quat), [quat]);

  const halfSpan = ROAD_HALF_WIDTH + SHOULDER_MARGIN;
  const legLength = (2 * halfSpan) / WALK_SPEED;
  const cycle = legLength + PAUSE_S;

  useFrame((_, rawDelta) => {
    const body = rigidBody.current;
    if (!body) return;
    if (simPhase !== "driving") return;

    const delta = Math.min(rawDelta, 0.05);
    walkClock.current += delta;
    const t = walkClock.current % (cycle * 2);

    // Walk from -halfSpan to +halfSpan, dwell, walk back, dwell.
    let walkX: number;
    let dirSign = 1;
    if (t < legLength) {
      walkX = -halfSpan + WALK_SPEED * t;
      dirSign = 1;
    } else if (t < cycle) {
      walkX = halfSpan;
      dirSign = 1;
    } else if (t < cycle + legLength) {
      walkX = halfSpan - WALK_SPEED * (t - cycle);
      dirSign = -1;
    } else {
      walkX = -halfSpan;
      dirSign = -1;
    }

    const worldX = sample.point.x + rightVec.x * walkX;
    const worldZ = sample.point.z + rightVec.z * walkX;

    // Solid against the vehicle: a stopped car is an obstacle, not a ghost —
    // stop at its edge instead of walking through it (and freeze the crossing
    // clock while waiting so the pedestrian resumes seamlessly once the way
    // clears). If already overlapping, allow movement so a spawn overlap can
    // escape instead of trapping the pedestrian.
    const current = body.translation();
    const wasInsideVehicle =
      circleCollides(current.x, current.z, PED_RADIUS, { shapes: ["rect"] }) !== null;
    const blocked =
      !wasInsideVehicle &&
      circleCollides(worldX, worldZ, PED_RADIUS, { shapes: ["rect"] }) !== null;

    const finalX = blocked ? current.x : worldX;
    const finalZ = blocked ? current.z : worldZ;
    if (blocked) walkClock.current -= delta;

    body.setNextKinematicTranslation({ x: finalX, y: 0, z: finalZ });
    setObstacle(id, {
      shape: "circle",
      kind: "pedestrian",
      x: finalX,
      z: finalZ,
      radius: PED_RADIUS,
    });
    if (facingRef.current) {
      facingRef.current.rotation.y = heading + (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2);
    }

    // "In road" means actually out on the asphalt (within the painted lane),
    // not just standing on the curb/shoulder — that's the distinction between
    // "must yield to this pedestrian" and "pedestrian is just waiting".
    setPedestrianCrossing(id, { x: finalX, z: finalZ, inRoad: Math.abs(walkX) <= ROAD_HALF_WIDTH });
  });

  return (
    <RigidBody
      ref={rigidBody}
      type="kinematicPosition"
      colliders={false}
      position={[sample.point.x, 0, sample.point.z]}
      name="pedestrian"
    >
      <CuboidCollider
        args={[0.22, 0.5, 0.18]}
        position={[0, 0.5, 0]}
        sensor
        activeCollisionTypes={ActiveCollisionTypes.ALL}
        onIntersectionEnter={(payload) => {
          if (hasHit.current) return;
          if (payload.other.rigidBodyObject?.name === "vehicle") {
            hasHit.current = true;
            vehicleAudio.silence();
            failSimulation("Latihan dihentikan karena terjadi kecelakaan dengan pejalan kaki.");
          }
        }}
      />
      <group ref={facingRef}>
        <PedestrianFigure />
      </group>
    </RigidBody>
  );
}
