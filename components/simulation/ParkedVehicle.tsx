"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VehicleConfig, VehicleVariant } from "@/lib/vehicles";
import { VehicleMesh } from "./VehicleMesh";
import { getRoadSamples, headingFromTangent, START_Z } from "@/lib/track";
import { removeObstacle, setObstacle } from "@/lib/obstacles";

// Stationary render of the vehicle for the pre-drive walk-around: no
// RigidBody/physics stepping, since the only interaction needed at this
// stage is the player's proximity to the driver door (a plain distance
// check in Character.tsx), not collision.
export function ParkedVehicle({ config, variant }: { config: VehicleConfig; variant: VehicleVariant }) {
  const leanRef = useRef<THREE.Group>(null);
  const steerRef = useRef<THREE.Object3D[]>([]);

  // Align the parked vehicle with the road heading at the spawn point,
  // same convention as the driving vehicle in Scene.tsx.
  const heading = useMemo(() => {
    const samples = getRoadSamples();
    return headingFromTangent(samples[0].tangent);
  }, []);

  // The parked car is solid while the player walks up to it — register its
  // footprint so the character (a kinematic mover with no Rapier body) can't
  // walk through it. Unregistered on unmount (phase flips to driving).
  useEffect(() => {
    setObstacle("parked-vehicle", {
      shape: "rect",
      kind: "vehicle",
      x: 0,
      z: START_Z,
      yaw: heading,
      halfW: config.dimensions.width / 2,
      halfL: config.dimensions.length / 2,
    });
    return () => removeObstacle("parked-vehicle");
  }, [config, heading]);

  return (
    <group position={[0, 0, START_Z]} rotation={[0, heading, 0]}>
      <VehicleMesh config={config} variant={variant} leanRef={leanRef} steerRef={steerRef} />
    </group>
  );
}
