"use client";

import { RefObject } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { Wheel, Light } from "./parts";

export function MotorMesh({
  config,
  leanRef,
}: {
  config: VehicleConfig;
  leanRef: RefObject<THREE.Group | null>;
}) {
  const { width: w, height: h, length: l } = config.dimensions;

  const wheelRadius = h * 0.34;
  const wheelWidth = w * 0.55;
  const wheelZ = l / 2 - wheelRadius * 1.1;
  const hubY = wheelRadius;

  return (
    <group ref={leanRef} rotation={[0, Math.PI, 0]}>
      <mesh castShadow position={[0, hubY * 1.15, 0]}>
        <boxGeometry args={[w * 0.55, h * 0.26, l * 0.22]} />
        <meshStandardMaterial color="#27272a" metalness={0.4} roughness={0.5} />
      </mesh>

      <mesh castShadow position={[0, h * 0.5, -l * 0.02]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[w * 0.28, h * 0.14, l * 0.62]} />
        <meshStandardMaterial color={config.color} metalness={0.4} roughness={0.4} />
      </mesh>

      <mesh castShadow position={[0, h * 0.66, l * 0.12]}>
        <boxGeometry args={[w * 0.62, h * 0.24, l * 0.24]} />
        <meshStandardMaterial color={config.color} metalness={0.5} roughness={0.3} />
      </mesh>

      <mesh castShadow position={[0, h * 0.58, -l * 0.24]}>
        <boxGeometry args={[w * 0.6, h * 0.1, l * 0.32]} />
        <meshStandardMaterial color="#18181b" roughness={0.85} />
      </mesh>

      <mesh position={[0, h * 0.42, l * 0.36]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[w * 0.16, h * 0.6, w * 0.16]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.3} />
      </mesh>

      <mesh position={[0, h * 0.78, l * 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, w * 0.9, 8]} />
        <meshStandardMaterial color="#18181b" metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[w * 0.28, hubY * 0.7, -l * 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, l * 0.4, 10]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.9} roughness={0.2} />
      </mesh>

      <Light x={0} y={h * 0.62} z={l * 0.48} size={[0.16, 0.12, 0.04]} color="#fefce8" />
      <Light x={0} y={h * 0.6} z={-l * 0.44} size={[0.12, 0.1, 0.04]} color="#ef4444" />

      <Wheel x={0} z={wheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={0} z={-wheelZ} radius={wheelRadius} width={wheelWidth} />
    </group>
  );
}
