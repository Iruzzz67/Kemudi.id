"use client";

import { RefObject } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { Wheel, Light, GlassPanel } from "./parts";

export function MobilMesh({
  config,
  leanRef,
}: {
  config: VehicleConfig;
  leanRef: RefObject<THREE.Group | null>;
}) {
  const { width: w, height: h, length: l } = config.dimensions;

  const wheelRadius = h * 0.24;
  const wheelWidth = w * 0.22;
  const wheelX = w / 2 - wheelWidth * 0.35;
  const wheelZ = l / 2 - wheelRadius * 1.4;

  const chassisH = h * 0.4;
  const chassisY = wheelRadius * 0.9 + chassisH / 2;
  const cabinH = h * 0.36;
  const cabinY = chassisY + chassisH / 2 + cabinH / 2 - 0.02;
  const cabinL = l * 0.52;
  const cabinZ = -l * 0.02;
  const cabinFrontFace = cabinZ + cabinL / 2;
  const cabinRearFace = cabinZ - cabinL / 2;

  // Roll/pitch happens around the body's own mid-height, not the ground —
  // pivoting from ground level would swing the whole body sideways over the
  // (stationary) wheels instead of tilting it in place, which read as skidding.
  const pivotHeight = h * 0.45;

  return (
    <group>
      <group ref={leanRef} position={[0, pivotHeight, 0]} rotation={[0, Math.PI, 0]}>
      <group position={[0, -pivotHeight, 0]}>
      <mesh castShadow position={[0, chassisY, 0]}>
        <boxGeometry args={[w, chassisH, l * 0.94]} />
        <meshStandardMaterial color={config.color} metalness={0.35} roughness={0.45} />
      </mesh>

      <mesh castShadow position={[0, chassisY + chassisH * 0.28, l * 0.34]}>
        <boxGeometry args={[w * 0.94, chassisH * 0.5, l * 0.28]} />
        <meshStandardMaterial color={config.color} metalness={0.35} roughness={0.45} />
      </mesh>

      <mesh castShadow position={[0, chassisY + chassisH * 0.22, -l * 0.36]}>
        <boxGeometry args={[w * 0.94, chassisH * 0.4, l * 0.22]} />
        <meshStandardMaterial color={config.color} metalness={0.35} roughness={0.45} />
      </mesh>

      <mesh castShadow position={[0, cabinY, cabinZ]}>
        <boxGeometry args={[w * 0.82, cabinH, cabinL]} />
        <meshStandardMaterial color={config.color} metalness={0.35} roughness={0.4} />
      </mesh>

      <GlassPanel
        position={[0, cabinY + 0.01, cabinFrontFace + 0.02]}
        size={[w * 0.78, cabinH * 0.85, 0.05]}
      />
      <GlassPanel
        position={[0, cabinY + 0.01, cabinRearFace - 0.02]}
        size={[w * 0.78, cabinH * 0.85, 0.05]}
      />
      <GlassPanel
        position={[w * 0.415, cabinY, cabinZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[cabinL * 0.9, cabinH * 0.7, 0.03]}
      />
      <GlassPanel
        position={[-w * 0.415, cabinY, cabinZ]}
        rotation={[0, Math.PI / 2, 0]}
        size={[cabinL * 0.9, cabinH * 0.7, 0.03]}
      />

      <mesh position={[0, chassisY - chassisH * 0.25, l * 0.48]}>
        <boxGeometry args={[w * 0.98, chassisH * 0.35, l * 0.06]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} />
      </mesh>
      <mesh position={[0, chassisY - chassisH * 0.25, -l * 0.48]}>
        <boxGeometry args={[w * 0.98, chassisH * 0.35, l * 0.06]} />
        <meshStandardMaterial color="#18181b" roughness={0.6} />
      </mesh>

      <mesh position={[0, chassisY, l * 0.515]}>
        <boxGeometry args={[w * 0.5, chassisH * 0.4, 0.03]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
      </mesh>

      <Light x={w * 0.36} y={chassisY} z={l * 0.52} color="#fefce8" />
      <Light x={-w * 0.36} y={chassisY} z={l * 0.52} color="#fefce8" />
      <Light x={w * 0.38} y={chassisY} z={-l * 0.52} size={[0.14, 0.08, 0.04]} color="#ef4444" />
      <Light x={-w * 0.38} y={chassisY} z={-l * 0.52} size={[0.14, 0.08, 0.04]} color="#ef4444" />

      <mesh position={[w * 0.52, cabinY + cabinH * 0.1, cabinZ + cabinL * 0.32]}>
        <boxGeometry args={[0.08, 0.08, 0.16]} />
        <meshStandardMaterial color={config.color} />
      </mesh>
      <mesh position={[-w * 0.52, cabinY + cabinH * 0.1, cabinZ + cabinL * 0.32]}>
        <boxGeometry args={[0.08, 0.08, 0.16]} />
        <meshStandardMaterial color={config.color} />
      </mesh>
      </group>
      </group>

      <Wheel x={wheelX} z={wheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={-wheelX} z={wheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={wheelX} z={-wheelZ} radius={wheelRadius} width={wheelWidth} />
      <Wheel x={-wheelX} z={-wheelZ} radius={wheelRadius} width={wheelWidth} />
    </group>
  );
}
