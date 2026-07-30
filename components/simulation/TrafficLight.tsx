"use client";

import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ActiveCollisionTypes } from "@dimforge/rapier3d-compat";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import { ROAD_WIDTH, RoadSample, headingFromTangent } from "@/lib/track";

const CYCLE_MS = 11000;
const GREEN_MS = 5500;
const YELLOW_MS = 1500;

export type LightPhase = "green" | "yellow" | "red";

export function getLightPhase(t: number): LightPhase {
  const m = t % CYCLE_MS;
  if (m < GREEN_MS) return "green";
  if (m < GREEN_MS + YELLOW_MS) return "yellow";
  return "red";
}

const COLORS: Record<LightPhase, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};
const DIM = "#3f3f46";

export function TrafficLight({ sample }: { sample: RoadSample }) {
  const heading = useMemo(() => headingFromTangent(sample.tangent), [sample]);
  const registerViolation = useSimStore((s) => s.registerViolation);

  const redRef = useRef<THREE.Mesh>(null);
  const yellowRef = useRef<THREE.Mesh>(null);
  const greenRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const phase = getLightPhase(performance.now());
    if (redRef.current) {
      const m = redRef.current.material as THREE.MeshStandardMaterial;
      const on = phase === "red";
      m.color.set(on ? COLORS.red : DIM);
      m.emissive.set(on ? COLORS.red : "#000000");
      m.emissiveIntensity = on ? 1.4 : 0;
    }
    if (yellowRef.current) {
      const m = yellowRef.current.material as THREE.MeshStandardMaterial;
      const on = phase === "yellow";
      m.color.set(on ? COLORS.yellow : DIM);
      m.emissive.set(on ? COLORS.yellow : "#000000");
      m.emissiveIntensity = on ? 1.4 : 0;
    }
    if (greenRef.current) {
      const m = greenRef.current.material as THREE.MeshStandardMaterial;
      const on = phase === "green";
      m.color.set(on ? COLORS.green : DIM);
      m.emissive.set(on ? COLORS.green : "#000000");
      m.emissiveIntensity = on ? 1.4 : 0;
    }
  });

  return (
    <>
      <group position={[sample.point.x, 0, sample.point.z]} rotation={[0, heading, 0]}>
        {/* Stop line painted across the road. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <planeGeometry args={[ROAD_WIDTH * 0.86, 0.4]} />
          <meshStandardMaterial color="#f5f5f5" />
        </mesh>

        {/* Pole + housing on the road shoulder. */}
        <group position={[ROAD_WIDTH / 2 + 0.6, 0, -0.6]}>
          <mesh castShadow position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.8, 10]} />
            <meshStandardMaterial color="#3f3f46" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0, 2.9, 0]}>
            <boxGeometry args={[0.34, 0.9, 0.3]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} />
          </mesh>
          <mesh ref={redRef} position={[0, 3.18, 0.16]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color={DIM} toneMapped={false} />
          </mesh>
          <mesh ref={yellowRef} position={[0, 2.9, 0.16]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color={DIM} toneMapped={false} />
          </mesh>
          <mesh ref={greenRef} position={[0, 2.62, 0.16]}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial color={DIM} toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* Sensor kept as a sibling (not nested in the visual group above) so its
          world transform is set directly, the same convention VehicleController
          and Pedestrian use, rather than relying on inherited group transforms. */}
      <RigidBody
        type="fixed"
        colliders={false}
        position={[sample.point.x, 0, sample.point.z]}
        rotation={[0, heading, 0]}
      >
        <CuboidCollider
          args={[ROAD_WIDTH * 0.43, 0.6, 0.25]}
          position={[0, 0.6, 0]}
          sensor
          activeCollisionTypes={ActiveCollisionTypes.ALL}
          onIntersectionEnter={(payload) => {
            if (payload.other.rigidBodyObject?.name !== "vehicle") return;
            if (getLightPhase(performance.now()) === "red") {
              registerViolation(1);
            }
          }}
        />
      </RigidBody>
    </>
  );
}
