"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { VehicleTransform } from "./transform";

const desiredPos = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
const behind = new THREE.Vector3();

const FOLLOW_DISTANCE = 4.2;
const FOLLOW_HEIGHT = 2.0;

// Fixed third-person follow camera for the pre-drive walk-around, per spec:
// no mode switching here (that's CameraRig's job once inside the vehicle).
export function CharacterCameraRig({ transform }: { transform: VehicleTransform }) {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame((_, delta) => {
    camera.up.set(0, 1, 0);
    behind.set(0, 0, 1).applyQuaternion(transform.quaternion).multiplyScalar(FOLLOW_DISTANCE);
    desiredPos.set(
      transform.position.x + behind.x,
      transform.position.y + FOLLOW_HEIGHT,
      transform.position.z + behind.z
    );
    desiredLookAt.set(transform.position.x, transform.position.y + 1.0, transform.position.z);

    if (!initialized.current) {
      camera.position.copy(desiredPos);
      initialized.current = true;
    } else {
      camera.position.lerp(desiredPos, 1 - Math.pow(0.0001, delta));
    }
    camera.lookAt(desiredLookAt);
  });

  return null;
}
