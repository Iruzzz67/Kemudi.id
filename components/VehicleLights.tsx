"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { useSimStore } from "@/store/simStore";

const BLINK_MS = 450;

// Emissive headlight bulbs on the front — dim by default, bright when the
// headlights (L) are on, blinding when the high beam (K) is added.
function HeadlightGlow({ config }: { config: VehicleConfig }) {
  const headlightsOn = useSimStore((s) => s.headlightsOn);
  const highBeamOn = useSimStore((s) => s.highBeamOn);
  const { width, height, length } = config.dimensions;
  const intensity = headlightsOn ? (highBeamOn ? 3 : 1.8) : 0.12;
  const y = config.type === "MOTOR" ? height * 0.62 : height * 0.5;
  const z = -length * 0.5 - 0.02;
  const xOffsets = config.type === "MOTOR" ? [0] : [-width * 0.36, width * 0.36];

  return (
    <>
      {xOffsets.map((x) => (
        <mesh key={x} position={[x, y, z]}>
          <boxGeometry args={[0.18, 0.1, 0.05]} />
          <meshStandardMaterial
            color="#fefce8"
            emissive="#fefce8"
            emissiveIntensity={intensity}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

// One light unit: a real point light (illuminates the road) plus a soft
// transparent cone that makes the beam itself visible from the outside.
function HeadlightBeam({ x, y, z }: { x: number; y: number; z: number }) {
  const headlightsOn = useSimStore((s) => s.headlightsOn);
  const highBeamOn = useSimStore((s) => s.highBeamOn);
  if (!headlightsOn) return null;

  const beamLength = highBeamOn ? 16 : 9;
  const beamRadius = highBeamOn ? 3.4 : 2.4;

  return (
    <group position={[x, y, z]}>
      <pointLight
        intensity={highBeamOn ? 60 : 18}
        distance={highBeamOn ? 70 : 34}
        decay={1.8}
        color="#fff7d6"
      />
      {/* cone's +Y apex rotated -90° about X points forward (-Z) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -beamLength / 2]}>
        <coneGeometry args={[beamRadius, beamLength, 20, 1, true]} />
        <meshBasicMaterial
          color="#fff9dc"
          transparent
          opacity={highBeamOn ? 0.14 : 0.09}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// Turn-signal blinkers (front + rear). Material intensity is driven
// imperatively in useFrame so the 2 Hz blink never re-renders React.
function SignalLights({ config }: { config: VehicleConfig }) {
  const hazardOn = useSimStore((s) => s.hazardOn);
  const turnSignal = useSimStore((s) => s.turnSignal);
  const leftFront = useRef<THREE.MeshStandardMaterial>(null);
  const rightFront = useRef<THREE.MeshStandardMaterial>(null);
  const leftRear = useRef<THREE.MeshStandardMaterial>(null);
  const rightRear = useRef<THREE.MeshStandardMaterial>(null);

  const { width, height, length } = config.dimensions;
  const y = config.type === "MOTOR" ? height * 0.6 : height * 0.55;
  const zFront = -length * 0.5 - 0.02;
  const zRear = length * 0.5 + 0.02;
  const xOffsets = config.type === "MOTOR" ? [0] : [-width * 0.38, width * 0.38];

  useFrame(() => {
    const blink = Math.floor(performance.now() / BLINK_MS) % 2 === 0;
    const leftOn = (hazardOn || turnSignal === "left") && blink;
    const rightOn = (hazardOn || turnSignal === "right") && blink;
    const set = (m: THREE.MeshStandardMaterial | null, on: boolean) => {
      if (m) m.emissiveIntensity = on ? 2.8 : 0.12;
    };
    if (xOffsets.length === 1) {
      // Motor: single centered blinker — both sides drive the same pair of
      // bulbs (the centered mesh attaches to the "right" refs).
      set(leftFront.current, leftOn || rightOn);
      set(rightFront.current, leftOn || rightOn);
      set(leftRear.current, leftOn || rightOn);
      set(rightRear.current, leftOn || rightOn);
    } else {
      set(leftFront.current, leftOn);
      set(rightFront.current, rightOn);
      set(leftRear.current, leftOn);
      set(rightRear.current, rightOn);
    }
  });

  return (
    <>
      {xOffsets.map((x) => (
        <group key={x}>
          {/* Front blinkers only on cars/trucks — the motor's headlight
              already occupies that spot on the nose. */}
          {config.type !== "MOTOR" && (
            <mesh position={[x, y, zFront]}>
              <boxGeometry args={[0.16, 0.09, 0.04]} />
              <meshStandardMaterial
                ref={x < 0 ? leftFront : rightFront}
                color="#ff9d00"
                emissive="#ff9d00"
                emissiveIntensity={0.12}
                toneMapped={false}
              />
            </mesh>
          )}
          <mesh position={[x, y, zRear]}>
            <boxGeometry args={[0.16, 0.09, 0.04]} />
            <meshStandardMaterial
              ref={x < 0 ? leftRear : rightRear}
              color="#ff9d00"
              emissive="#ff9d00"
              emissiveIntensity={0.12}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

export function VehicleLights({ config }: { config: VehicleConfig }) {
  const { height, length } = config.dimensions;
  return (
    <group>
      <HeadlightGlow config={config} />
      {config.type === "MOTOR" ? (
        <HeadlightBeam x={0} y={height * 0.62} z={-length * 0.5} />
      ) : (
        <>
          <HeadlightBeam x={-config.dimensions.width * 0.36} y={height * 0.5} z={-length * 0.5} />
          <HeadlightBeam x={config.dimensions.width * 0.36} y={height * 0.5} z={-length * 0.5} />
        </>
      )}
      <SignalLights config={config} />
    </group>
  );
}
