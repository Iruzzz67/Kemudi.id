"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { ReactNode, useRef } from "react";
import * as THREE from "three";

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

// Anchors children to the player's view (the active camera — the XR headset
// camera while presenting, the regular canvas camera otherwise). The group
// copies the camera's world pose every frame instead of re-parenting the
// camera, so it works without conflicting with <XROrigin>. Children define
// their own local offsets relative to the view.
export function CameraFollower({ children }: { children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    camera.getWorldPosition(tmpPos);
    camera.getWorldQuaternion(tmpQuat);
    g.position.copy(tmpPos);
    g.quaternion.copy(tmpQuat);
  });

  return <group ref={groupRef}>{children}</group>;
}
