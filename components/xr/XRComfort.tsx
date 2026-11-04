"use client";

import { useXR } from "@react-three/xr";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import { CameraFollower } from "./CameraFollower";

export function XRComfort() {
  const isPresenting = useXR((s) => s.session != null);
  const speedKmh = useSimStore((s) => s.speedKmh);
  const isOffRoad = useSimStore((s) => s.isOffRoad);
  const vignetteRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!vignetteRef.current) return;
    if (!isPresenting) {
      vignetteRef.current.visible = false;
      return;
    }

    vignetteRef.current.visible = true;

    // Dynamic opacity for comfort
    const speedRatio = Math.min(1, speedKmh / 100);
    const targetOpacity = isOffRoad ? 0.45 : speedRatio * 0.25;

    const mat = vignetteRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.1);
  });

  if (!isPresenting) return null;

  return (
    <CameraFollower>
      <mesh ref={vignetteRef} position={[0, 0, -0.3]}>
        <ringGeometry args={[0.22, 0.45, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0} depthTest={false} depthWrite={false} />
      </mesh>
    </CameraFollower>
  );
}
