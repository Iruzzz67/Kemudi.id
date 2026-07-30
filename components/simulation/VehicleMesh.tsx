"use client";

import { RefObject } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { GltfVehicleMesh } from "./vehicles/GltfVehicleMesh";

export function VehicleMesh({
  config,
  leanRef,
  steerRef,
}: {
  config: VehicleConfig;
  leanRef: RefObject<THREE.Group | null>;
  steerRef: RefObject<THREE.Object3D[]>;
}) {
  return <GltfVehicleMesh config={config} leanRef={leanRef} steerRef={steerRef} />;
}
