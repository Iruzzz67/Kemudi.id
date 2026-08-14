"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import * as THREE from "three";
import { VehicleTransform } from "./transform";

const eyeOffset = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
const forward = new THREE.Vector3();

const EYE_HEIGHT = 1.0;
const LOOK_AHEAD_DISTANCE = 5.0;

// First-person camera for the pre-drive walk-around, matching the requested
// POV from the start of the simulation until the end.
export function CharacterCameraRig({
  transform,
  originRef,
}: {
  transform: VehicleTransform;
  originRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const isPresenting = useXR((s) => s.session != null);

  useFrame(() => {
    // Same rule as CameraRig: during an XR session the headset owns the camera
    // pose, so we move the <XROrigin> group instead of writing to the camera.
    if (isPresenting) {
      if (originRef.current) {
        originRef.current.position.copy(transform.position);
        originRef.current.quaternion.copy(transform.quaternion);
      }
      return;
    }

    camera.up.set(0, 1, 0);

    // Place the camera at the character's eye level and orient along the
    // player's forward direction.
    eyeOffset.set(0, EYE_HEIGHT, 0).applyQuaternion(transform.quaternion);
    camera.position.copy(transform.position).add(eyeOffset);

    forward.set(0, 0, -1).applyQuaternion(transform.quaternion);
    desiredLookAt.copy(camera.position).add(forward.multiplyScalar(LOOK_AHEAD_DISTANCE));
    camera.lookAt(desiredLookAt);
  });

  return null;
}
