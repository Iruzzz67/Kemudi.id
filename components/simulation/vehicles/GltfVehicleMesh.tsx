"use client";

import { RefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { VEHICLE_MODELS } from "@/lib/vehicleModels";
import { useSimStore } from "@/store/simStore";

export function GltfVehicleMesh({ config, leanRef, steerRef, speedRef }: {
  config: VehicleConfig;
  leanRef: RefObject<THREE.Group | null>;
  steerRef: RefObject<THREE.Object3D[]>;
  speedRef?: RefObject<number>;
}) {
  const { scene } = useGLTF(VEHICLE_MODELS[config.type]);
  const rig = useMemo(() => {
    const model = scene.clone(true);
    const wheels: THREE.Object3D[] = [];
    const steering: THREE.Object3D[] = [];
    model.traverse((object) => {
      if (object.name.startsWith("Wheel_") && !(object as THREE.Mesh).isMesh) wheels.push(object);
      if (object.name.startsWith("Steer_") && !(object as THREE.Mesh).isMesh) steering.push(object);
      if ((object as THREE.Mesh).isMesh) {
        object.castShadow = !(object as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material.transparent;
        object.receiveShadow = true;
      }
    });
    return { model, wheels, steering, wheel: model.getObjectByName("SteeringWheel"), door: model.getObjectByName("Door_R") };
  }, [scene]);

  const rigRef = useRef<typeof rig | null>(null);
  useEffect(() => {
    rigRef.current = rig;
    leanRef.current = rig.model.getObjectByName("BodyMotion") as THREE.Group;
    steerRef.current = rig.steering;
    return () => { rigRef.current = null; leanRef.current = null; steerRef.current = []; };
  }, [rig, leanRef, steerRef]);

  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    const state = useSimStore.getState();
    if (state.paused) return;
    const dt = Math.min(delta, .05);
    const speed = speedRef?.current ?? 0;
    for (const wheel of rig.wheels) {
      wheel.rotateX(-speed * dt / Number(wheel.userData.radius));
    }
    if (rig.wheel) rig.wheel.rotation.set(0, 0, -(rig.steering[0]?.rotation.y ?? 0) * 4.5);
    if (rig.door) rig.door.rotation.set(0, THREE.MathUtils.damp(rig.door.rotation.y, state.entering ? 1.1 : 0, 7, dt), 0);
  });

  // Cached GLTF geometry/materials are shared; this instance owns transforms only.
  return <primitive object={rig.model} dispose={null} />;
}
