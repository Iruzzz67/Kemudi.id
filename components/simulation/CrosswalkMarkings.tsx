"use client";

import { useMemo } from "react";
import { ROAD_WIDTH, RoadSample, headingFromTangent } from "@/lib/track";

const STRIPE_COUNT = 6;
const STRIPE_DEPTH = 0.5;
const STRIPE_GAP = 0.45;

export function CrosswalkMarkings({ sample }: { sample: RoadSample }) {
  const heading = useMemo(() => headingFromTangent(sample.tangent), [sample]);
  const bandDepth = STRIPE_COUNT * STRIPE_DEPTH + (STRIPE_COUNT - 1) * STRIPE_GAP;

  return (
    <group position={[sample.point.x, 0, sample.point.z]} rotation={[0, heading, 0]}>
      {Array.from({ length: STRIPE_COUNT }).map((_, i) => {
        const z = -bandDepth / 2 + i * (STRIPE_DEPTH + STRIPE_GAP) + STRIPE_DEPTH / 2;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, z]}>
            <planeGeometry args={[ROAD_WIDTH * 0.8, STRIPE_DEPTH]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
        );
      })}
    </group>
  );
}
