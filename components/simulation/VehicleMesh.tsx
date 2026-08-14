"use client";

import { RefObject } from "react";
import * as THREE from "three";
import { VehicleConfig, VehicleVariant } from "@/lib/vehicles";
import { GltfVehicleMesh } from "./vehicles/GltfVehicleMesh";

export function VehicleMesh({
  config,
  variant,
  leanRef,
  steerRef,
}: {
  config: VehicleConfig;
  variant?: VehicleVariant;
  leanRef: RefObject<THREE.Group | null>;
  steerRef: RefObject<THREE.Object3D[]>;
}) {
  return (
    <GltfVehicleMesh config={config} variant={variant} leanRef={leanRef} steerRef={steerRef} />
  );
}
