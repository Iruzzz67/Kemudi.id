"use client";

import { useRef } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { VehicleMesh } from "./VehicleMesh";
import { START_Z } from "@/lib/track";

// Stationary render of the vehicle for the pre-drive walk-around: no
// RigidBody/physics stepping, since the only interaction needed at this
// stage is the player's proximity to the driver door (a plain distance
// check in Character.tsx), not collision.
export function ParkedVehicle({ config }: { config: VehicleConfig }) {
  const leanRef = useRef<THREE.Group>(null);
  const steerRef = useRef<THREE.Object3D[]>([]);

  return (
    <group position={[0, 0, START_Z]}>
      <VehicleMesh config={config} leanRef={leanRef} steerRef={steerRef} />
    </group>
  );
}
