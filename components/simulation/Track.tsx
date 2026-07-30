"use client";

import { useMemo } from "react";
import {
  START_Z,
  FINISH_Z,
  ROAD_WIDTH,
  ROAD_HALF_WIDTH,
  buildRibbonGeometry,
  getSampleNearZ,
  PEDESTRIAN_CROSSING_ZS,
  TRAFFIC_LIGHT_Z,
} from "@/lib/track";
import { CrosswalkMarkings } from "./CrosswalkMarkings";
import { Pedestrian } from "./Pedestrian";
import { TrafficLight } from "./TrafficLight";

export function Track() {
  const roadGeometry = useMemo(
    () => buildRibbonGeometry({ offset: 0, width: ROAD_WIDTH, y: 0 }),
    []
  );
  const leftEdgeGeometry = useMemo(
    () => buildRibbonGeometry({ offset: -ROAD_HALF_WIDTH, width: 0.2, y: 0.01 }),
    []
  );
  const rightEdgeGeometry = useMemo(
    () => buildRibbonGeometry({ offset: ROAD_HALF_WIDTH, width: 0.2, y: 0.01 }),
    []
  );

  const crossingSamples = useMemo(
    () => PEDESTRIAN_CROSSING_ZS.map((z) => getSampleNearZ(z)),
    []
  );
  const trafficLightSample = useMemo(() => getSampleNearZ(TRAFFIC_LIGHT_Z), []);

  return (
    <group>
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
      <mesh geometry={leftEdgeGeometry}>
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh geometry={rightEdgeGeometry}>
        <meshStandardMaterial color="#facc15" />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, (START_Z + FINISH_Z) / 2 - 10]}
      >
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#4d7c0f" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, FINISH_Z]}>
        <planeGeometry args={[ROAD_WIDTH, 1.5]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>

      {crossingSamples.map((sample, i) => (
        <group key={i}>
          <CrosswalkMarkings sample={sample} />
          <Pedestrian sample={sample} id={`crossing-${i}`} />
        </group>
      ))}

      <TrafficLight sample={trafficLightSample} />
    </group>
  );
}
