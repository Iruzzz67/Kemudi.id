"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { getRoadCurve } from "@/lib/track";

export function IdealLine() {
  const points = useMemo(
    () => getRoadCurve().getSpacedPoints(200).map((p) => new THREE.Vector3(p.x, 0.03, p.z)),
    []
  );

  return (
    <Line
      points={points}
      color="#22d3ee"
      lineWidth={2.5}
      dashed
      dashScale={2}
      dashSize={0.9}
      gapSize={0.5}
      transparent
      opacity={0.85}
    />
  );
}
