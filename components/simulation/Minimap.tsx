"use client";

import { useMemo } from "react";
import { useSimStore } from "@/store/simStore";
import { ROAD_WAYPOINTS, FINISH_Z, START_Z, TRAFFIC_LIGHT_ZS } from "@/lib/track";
import { REFUEL_ZONE } from "@/lib/scenery";

const W = 130;
const H = 190;
const PAD = 12;

// Map koordinat dunia (x, z) ke ruang SVG: Z dilipat vertikal (atas = start,
// bawah = finish), X melebar horizontal mengikuti bentuk jalan.
function worldToSvg(x: number, z: number): { x: number; y: number } {
  const zRange = START_Z - FINISH_Z; // ≈ 908
  const y = PAD + ((START_Z - z) / zRange) * (H - PAD * 2);
  const xRange = 12; // ±6 m dari tengah jalan
  const sx = W / 2 + (x / xRange) * (W / 2 - PAD);
  return { x: sx, y };
}

export function Minimap() {
  const playerX = useSimStore((s) => s.playerX);
  const playerZ = useSimStore((s) => s.playerZ);
  const speedLimitKmh = useSimStore((s) => s.speedLimitKmh);

  // Polyline jalan dari waypoint (dengan interpolasi x antar waypoint agar
  // bentuk tikungan terlihat).
  const roadPoints = useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const zRange = START_Z - FINISH_Z;
    const steps = 140;
    for (let i = 0; i <= steps; i++) {
      const z = START_Z - (zRange * i) / steps;
      // Interpolasi x dari waypoint terdekat.
      let x = 0;
      let closest = Infinity;
      for (const wp of ROAD_WAYPOINTS) {
        const d = Math.abs(wp.z - z);
        if (d < closest) {
          closest = d;
          x = wp.x;
        }
      }
      pts.push(worldToSvg(x, z));
    }
    return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, []);

  const lightPoints = useMemo(
    () =>
      TRAFFIC_LIGHT_ZS.map((z) => {
        const sample = worldToSvg(0, z);
        return { x: sample.x, y: sample.y };
      }),
    []
  );

  const spbu = useMemo(() => worldToSvg(REFUEL_ZONE.x, REFUEL_ZONE.z), []);
  const finish = useMemo(() => worldToSvg(0, FINISH_Z), []);
  const player = worldToSvg(playerX, playerZ);

  return (
    <div className="pointer-events-auto select-none">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="rounded-lg bg-black/60 backdrop-blur"
      >
        {/* Jalan */}
        <polyline
          points={roadPoints}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={9}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={roadPoints}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
        {/* Lampu lalu lintas */}
        {lightPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#ef4444" />
        ))}
        {/* SPBU */}
        <circle cx={spbu.x} cy={spbu.y} r={3.5} fill="#22c55e" />
        {/* Finish */}
        <circle cx={finish.x} cy={finish.y} r={3.5} fill="#facc15" />
        {/* Pemain */}
        <circle cx={player.x} cy={player.y} r={5} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} />
        <text
          x={W / 2}
          y={H - 3}
          textAnchor="middle"
          fontSize={9}
          fill="#ffffff"
          opacity={0.9}
        >
          {speedLimitKmh} km/j
        </text>
      </svg>
    </div>
  );
}
