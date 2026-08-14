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
  TRAFFIC_LIGHT_ZS,
} from "@/lib/track";
import { CrosswalkMarkings } from "./CrosswalkMarkings";
import { Pedestrian } from "./Pedestrian";
import { TrafficLight } from "./TrafficLight";
import { Scenery } from "./Scenery";

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
  // Trotoar / bahu jalan di kedua sisi — memberi kesan jalan perkotaan.
  const leftSidewalkGeometry = useMemo(
    () => buildRibbonGeometry({ offset: -(ROAD_HALF_WIDTH + 1.0), width: 2.0, y: 0.02 }),
    []
  );
  const rightSidewalkGeometry = useMemo(
    () => buildRibbonGeometry({ offset: ROAD_HALF_WIDTH + 1.0, width: 2.0, y: 0.02 }),
    []
  );

  const crossingSamples = useMemo(
    () => PEDESTRIAN_CROSSING_ZS.map((z) => getSampleNearZ(z)),
    []
  );
  const trafficLightSamples = useMemo(
    () => TRAFFIC_LIGHT_ZS.map((z) => getSampleNearZ(z)),
    []
  );

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
      <mesh geometry={leftSidewalkGeometry}>
        <meshStandardMaterial color="#9ca3af" />
      </mesh>
      <mesh geometry={rightSidewalkGeometry}>
        <meshStandardMaterial color="#9ca3af" />
      </mesh>

      {/* Rumput memanjang menutupi seluruh trek (±916 m) + area start. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, (START_Z + FINISH_Z) / 2]}
      >
        <planeGeometry args={[2200, 980]} />
        <meshStandardMaterial color="#4d7c0f" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, FINISH_Z]}>
        <planeGeometry args={[ROAD_WIDTH, 1.5]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>

      {/* Aset lingkungan & rintangan (cone, barrier, kendaraan parkir, pohon,
          rumah, halte, lampu jalan, ...) — konfigurasi di lib/scenery.ts. */}
      <Scenery />

      {crossingSamples.map((sample, i) => (
        <group key={i}>
          <CrosswalkMarkings sample={sample} />
          <Pedestrian sample={sample} id={`crossing-${i}`} />
        </group>
      ))}

      {trafficLightSamples.map((sample, i) => (
        <TrafficLight key={i} sample={sample} id={`traffic-light-${i}`} />
      ))}
    </group>
  );
}
