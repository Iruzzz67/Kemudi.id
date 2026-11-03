"use client";

import { RefObject } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { Wheel, Light, GlassPanel } from "./parts";

export function TrukMesh({
  config,
  leanRef,
}: {
  config: VehicleConfig;
  leanRef: RefObject<THREE.Group | null>;
}) {
  const { width: w, height: h, length: l } = config.dimensions;

  const wheelRadius = h * 0.16;
  const wheelWidth = w * 0.2;
  const wheelX = w / 2 - wheelWidth * 0.3;

  const cabL = l * 0.26;
  const cabH = h * 0.5;
  const cabY = wheelRadius * 1.8 + cabH / 2;
  const cabZ = l * 0.34;

  const cargoL = l * 0.62;
  const cargoH = h * 0.78;
  const cargoY = wheelRadius * 1.8 + cargoH / 2;
  const cargoZ = -l * 0.15;

  const frontWheelZ = cabZ - 0.1;
  const rearWheelZ1 = cargoZ + cargoL * 0.28;
  const rearWheelZ2 = cargoZ - cargoL * 0.28;

  // Roll/pitch happens around the body's own mid-height, not the ground —
  // pivoting from ground level would swing the whole body sideways over the
  // (stationary) wheels instead of tilting it in place, which read as skidding.
  const pivotHeight = h * 0.45;

  return (
    <group>
      <group ref={leanRef} position={[0, pivotHeight, 0]} rotation={[0, Math.PI, 0]}>
      <group position={[0, -pivotHeight, 0]}>
      <mesh castShadow position={[0, cargoY, cargoZ]}>
        <boxGeometry args={[w, cargoH, cargoL]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.1} roughness={0.7} />
      </mesh>
      <mesh position={[0, cargoY, cargoZ]}>
        <boxGeometry args={[w * 1.002, cargoH * 0.15, cargoL * 1.002]} />
        <meshStandardMaterial color={config.color} />
      </mesh>

      <mesh castShadow position={[0, cabY, cabZ]}>
        <boxGeometry args={[w * 0.96, cabH, cabL]} />
        <meshStandardMaterial color={config.color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, cabY + cabH * 0.42, cabZ + cabL * 0.1]}>
        <boxGeometry args={[w, cabH * 0.12, cabL * 0.5]} />
        <meshStandardMaterial color={config.color} metalness={0.3} roughness={0.5} />
      </mesh>

      <GlassPanel
        position={[0, cabY + cabH * 0.15, cabZ + cabL / 2 + 0.02]}
        size={[w * 0.82, cabH * 0.55, 0.05]}
      />
      <GlassPanel
        position={[w * 0.485, cabY, cabZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[cabL * 0.7, cabH * 0.45, 0.03]}
      />
      <GlassPanel
        position={[-w * 0.485, cabY, cabZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[cabL * 0.7, cabH * 0.45, 0.03]}
      />

      <mesh position={[0, cabY - cabH * 0.38, cabZ + cabL / 2 + 0.04]}>
        <boxGeometry args={[w, cabH * 0.25, 0.08]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} />
      </mesh>
      <mesh position={[0, cabY, cabZ + cabL / 2 + 0.02]}>
        <boxGeometry args={[w * 0.7, cabH * 0.4, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.7} />
      </mesh>

      <Light x={w * 0.4} y={cabY} z={cabZ + cabL / 2 + 0.02} color="#fefce8" />
      <Light x={-w * 0.4} y={cabY} z={cabZ + cabL / 2 + 0.02} color="#fefce8" />
      <Light
        x={w * 0.42}
        y={cargoY - cargoH * 0.3}
        z={cargoZ - cargoL / 2}
        size={[0.16, 0.14, 0.04]}
        color="#ef4444"
      />
      <Light
        x={-w * 0.42}
        y={cargoY - cargoH * 0.3}
        z={cargoZ - cargoL / 2}
        size={[0.16, 0.14, 0.04]}
        color="#ef4444"
      />

      <mesh position={[w * 0.56, cabY + cabH * 0.15, cabZ + cabL * 0.4]}>
        <boxGeometry args={[0.1, 0.22, 0.06]} />
        <meshStandardMaterial color="#18181b" />
      </mesh>
      <mesh position={[-w * 0.56, cabY + cabH * 0.15, cabZ + cabL * 0.4]}>
        <boxGeometry args={[0.1, 0.22, 0.06]} />
        <meshStandardMaterial color="#18181b" />
      </mesh>

      <mesh position={[w * 0.44, cabY + cabH * 0.5, cabZ - cabL * 0.3]}>
        <cylinderGeometry args={[0.06, 0.06, h * 0.6, 10]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} />
      </mesh>
      </group>
      </group>

      <Wheel x={wheelX} z={frontWheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={-wheelX} z={frontWheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={wheelX} z={rearWheelZ1} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={-wheelX} z={rearWheelZ1} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={wheelX} z={rearWheelZ2} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={-wheelX} z={rearWheelZ2} radius={wheelRadius} width={wheelWidth} />
    </group>
  );
}
