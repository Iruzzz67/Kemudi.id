import * as THREE from "three";
import { getRoadSamples, TRAFFIC_LIGHT_ZS, PEDESTRIAN_CROSSING_ZS } from "./track";
import { getLightPhase } from "@/components/simulation/TrafficLight";

// ── AI Vehicle Types ────────────────────────────────────────────────────────

export type AiVehicleType = "car" | "motorcycle" | "truck" | "bus" | "police" | "ambulance" | "van" | "pickup";

export type AiVehicleConfig = {
  type: AiVehicleType;
  label: string;
  width: number;
  height: number;
  length: number;
  color: string;
  maxSpeed: number; // m/s
  acceleration: number; // m/s^2
  braking: number; // m/s^2
};

export const AI_VEHICLE_CONFIGS: Record<AiVehicleType, AiVehicleConfig> = {
  car: {
    type: "car",
    label: "Mobil",
    width: 1.8,
    height: 1.2,
    length: 4.0,
    color: "#ef4444",
    maxSpeed: 14,
    acceleration: 4,
    braking: 8,
  },
  motorcycle: {
    type: "motorcycle",
    label: "Motor",
    width: 0.7,
    height: 1.2,
    length: 2.0,
    color: "#a855f7",
    maxSpeed: 18,
    acceleration: 7,
    braking: 10,
  },
  truck: {
    type: "truck",
    label: "Truk",
    width: 2.4,
    height: 2.8,
    length: 7.0,
    color: "#f97316",
    maxSpeed: 10,
    acceleration: 2.5,
    braking: 5,
  },
  bus: {
    type: "bus",
    label: "Bus",
    width: 2.4,
    height: 3.0,
    length: 10.0,
    color: "#06b6d4",
    maxSpeed: 12,
    acceleration: 2,
    braking: 5,
  },
  police: {
    type: "police",
    label: "Polisi",
    width: 1.9,
    height: 1.4,
    length: 4.2,
    color: "#1e3a5f",
    maxSpeed: 16,
    acceleration: 6,
    braking: 9,
  },
  ambulance: {
    type: "ambulance",
    label: "Ambulans",
    width: 2.2,
    height: 2.4,
    length: 5.5,
    color: "#ffffff",
    maxSpeed: 15,
    acceleration: 5,
    braking: 8,
  },
  van: {
    type: "van",
    label: "Van",
    width: 2.0,
    height: 2.0,
    length: 4.8,
    color: "#a3a3a3",
    maxSpeed: 13,
    acceleration: 3.5,
    braking: 7,
  },
  pickup: {
    type: "pickup",
    label: "Pickup",
    width: 2.0,
    height: 1.6,
    length: 5.0,
    color: "#ca8a04",
    maxSpeed: 13,
    acceleration: 4,
    braking: 7,
  },
};

// ── Spawn Configuration ─────────────────────────────────────────────────────
// Each AI vehicle spawns at a sample index along the road and drives forward
// (toward decreasing Z / increasing sample index). The `laneOffset` shifts it
// left (-) or right (+) of the centerline so vehicles use proper lanes.

export type AiVehicleSpawn = {
  type: AiVehicleType;
  /** Road sample index (0 = start, 1600 = finish) */
  sampleIndex: number;
  /** Lateral offset from centerline in meters (negative = left lane, positive = right lane) */
  laneOffset: number;
  /** Direction: 1 = forward (start→finish), -1 = backward (finish→start) */
  direction: 1 | -1;
  /** Random speed multiplier (0.7–1.3) to vary behavior */
  speedMult: number;
  /** Color override (optional, for variety) */
  colorOverride?: string;
};

// Hand-crafted spawn points spread across the track. Vehicles drive in
// both directions to simulate two-way traffic.
export const AI_SPAWNS: AiVehicleSpawn[] = [
  // ── Start Area / Straight (0 → ~100) ───────────────────────────
  { type: "car", sampleIndex: 60, laneOffset: 2.5, direction: 1, speedMult: 1.0, colorOverride: "#3b82f6" },
  { type: "motorcycle", sampleIndex: 80, laneOffset: -2.0, direction: -1, speedMult: 1.1, colorOverride: "#22c55e" },

  // ── Kota 1 (100 → 250) ─────────────────────────────────────────
  { type: "car", sampleIndex: 170, laneOffset: 2.5, direction: 1, speedMult: 0.85, colorOverride: "#eab308" },
  { type: "bus", sampleIndex: 210, laneOffset: -3.0, direction: -1, speedMult: 0.8, colorOverride: "#0ea5e9" },
  { type: "police", sampleIndex: 260, laneOffset: 2.5, direction: 1, speedMult: 1.15, colorOverride: "#1e3a5f" },

  // ── S-Curve (350 → 550) ────────────────────────────────────────
  { type: "car", sampleIndex: 400, laneOffset: 2.0, direction: 1, speedMult: 0.7, colorOverride: "#f43f5e" },
  { type: "truck", sampleIndex: 480, laneOffset: 2.5, direction: -1, speedMult: 0.75, colorOverride: "#84cc16" },
  { type: "motorcycle", sampleIndex: 530, laneOffset: -2.0, direction: 1, speedMult: 1.1, colorOverride: "#f97316" },

  // ── Permukiman (550 → 700) ─────────────────────────────────────
  { type: "car", sampleIndex: 620, laneOffset: 2.5, direction: -1, speedMult: 0.9, colorOverride: "#14b8a6" },
  { type: "motorcycle", sampleIndex: 670, laneOffset: -2.0, direction: 1, speedMult: 1.2, colorOverride: "#6366f1" },

  // ── Obstacle Zone (700 → 850) — lighter traffic ─────────────────
  { type: "ambulance", sampleIndex: 800, laneOffset: 2.5, direction: 1, speedMult: 1.0, colorOverride: "#ffffff" },

  // ── Tanjakan (850 → 1050) ──────────────────────────────────────
  { type: "truck", sampleIndex: 920, laneOffset: 3.0, direction: -1, speedMult: 0.7, colorOverride: "#dc2626" },
  { type: "motorcycle", sampleIndex: 990, laneOffset: -2.0, direction: 1, speedMult: 1.0, colorOverride: "#8b5cf6" },

  // ── Kota 2 (1050 → 1250) ──────────────────────────────────────
  { type: "car", sampleIndex: 1100, laneOffset: 2.5, direction: 1, speedMult: 0.9, colorOverride: "#2563eb" },
  { type: "van", sampleIndex: 1180, laneOffset: -2.5, direction: -1, speedMult: 0.85, colorOverride: "#525252" },

  // ── Berkelok (1300 → 1450) ─────────────────────────────────────
  { type: "car", sampleIndex: 1350, laneOffset: 2.0, direction: 1, speedMult: 0.8, colorOverride: "#e11d48" },
  { type: "motorcycle", sampleIndex: 1400, laneOffset: -2.0, direction: -1, speedMult: 1.05, colorOverride: "#059669" },

  // ── Finish area (1450 → 1600) ──────────────────────────────────
  { type: "pickup", sampleIndex: 1500, laneOffset: 2.5, direction: 1, speedMult: 0.85, colorOverride: "#92400e" },
  { type: "car", sampleIndex: 1560, laneOffset: -2.5, direction: -1, speedMult: 0.9, colorOverride: "#7c3aed" },
];

// ── AI Logic Helpers ────────────────────────────────────────────────────────

// Distance threshold (in sample indices) at which an AI vehicle starts
// checking for traffic light state. ~0.57 m per sample → 40 samples ≈ 23 m.
const TRAFFIC_LIGHT_LOOKAHEAD = 40;
// How close (in sample index) before the AI decides to fully stop.
export const TRAFFIC_LIGHT_STOP_DISTANCE = 5;
// Distance threshold (in sample indices) to look ahead for obstacles.
const OBSTACLE_LOOKAHEAD = 30;

/**
 * Get the road sample index closest to a given sample index's Z position.
 * Converts sample index → world position → finds the road sample near that Z.
 */
export function getSampleAtIndex(index: number): { point: THREE.Vector3; tangent: THREE.Vector3 } | null {
  const samples = getRoadSamples();
  const clampedIdx = Math.max(0, Math.min(samples.length - 1, Math.round(index)));
  return samples[clampedIdx] ?? null;
}

/**
 * Check if there's a red/yellow traffic light ahead within lookahead range.
 * Returns the distance to stop line (in sample indices) or -1 if clear.
 */
export function trafficLightAhead(
  currentSampleIndex: number,
  direction: 1 | -1
): { distance: number; phase: string } | null {
  const samples = getRoadSamples();
  for (const tlZ of TRAFFIC_LIGHT_ZS) {
    // Find the sample index of this traffic light
    const tlSample = samples.reduce((best, s, i) => {
      const d = Math.abs(s.point.z - tlZ);
      return d < best.dist ? { dist: d, idx: i } : best;
    }, { dist: Infinity, idx: 0 });

    const distance = (tlSample.idx - currentSampleIndex) * direction;
    if (distance > 0 && distance < TRAFFIC_LIGHT_LOOKAHEAD) {
      const phase = getLightPhase(performance.now());
      if (phase === "red" || phase === "yellow") {
        return { distance, phase };
      }
    }
  }
  return null;
}

/**
 * Check if there's a pedestrian crossing ahead that is occupied.
 * Returns distance or -1 if clear.
 */
export function pedestrianAhead(
  currentSampleIndex: number,
  direction: 1 | -1,
  pedestrianCrossings: Record<string, { x: number; z: number; inRoad: boolean }>
): number {
  const samples = getRoadSamples();
  for (const cz of PEDESTRIAN_CROSSING_ZS) {
    const crossSample = samples.reduce((best, s, i) => {
      const d = Math.abs(s.point.z - cz);
      return d < best.dist ? { dist: d, idx: i } : best;
    }, { dist: Infinity, idx: 0 });

    const distance = (crossSample.idx - currentSampleIndex) * direction;
    if (distance > 0 && distance < OBSTACLE_LOOKAHEAD) {
      // Check if any pedestrian is actually in the road
      for (const [, state] of Object.entries(pedestrianCrossings)) {
        if (state.inRoad) {
          return distance;
        }
      }
    }
  }
  return -1;
}

// ── Overtaking Helpers ──────────────────────────────────────────────────────

// How many samples ahead to check for road curvature during overtake decision.
// ~0.57 m per sample → 80 samples ≈ 46 m.
const OVERTAKE_LOOKAHEAD = 80;
// Max angular change (radians) allowed between current tangent and the one
// OVERTAKE_LOOKAHEAD samples ahead — if exceeded the road is too curvy to overtake.
const MAX_CURVATURE_FOR_OVERTAKE = 0.25;
// Minimum lateral distance to check for vehicles in the overtaking lane.
const OVERTAKE_LANE_CLEAR_DISTANCE = 25;

/**
 * Check if the road ahead is straight enough for overtaking.
 * Compares the tangent at the current sample index with the tangent
 * OVERTAKE_LOOKAHEAD samples ahead.
 */
export function isRoadStraight(sampleIndex: number, direction: 1 | -1): boolean {
  const samples = getRoadSamples();
  const idx = Math.round(sampleIndex);
  const aheadIdx = Math.min(samples.length - 1, Math.max(0, idx + OVERTAKE_LOOKAHEAD * direction));
  const currentTangent = samples[idx]?.tangent;
  const aheadTangent = samples[aheadIdx]?.tangent;
  if (!currentTangent || !aheadTangent) return false;
  // Angle between tangents
  const dot = currentTangent.x * aheadTangent.x + currentTangent.z * aheadTangent.z;
  return Math.acos(Math.min(1, Math.max(-1, dot))) < MAX_CURVATURE_FOR_OVERTAKE;
}

/**
 * Check if the adjacent lane is clear for overtaking.
 * Returns true if no vehicle (AI or otherwise) is within OVERTAKE_LANE_CLEAR_DISTANCE
 * samples ahead in the candidate lane.
 */
export function adjacentLaneClear(
  currentSampleIndex: number,
  direction: 1 | -1,
  candidateLaneOffset: number,
  allSpawns: { sampleIndex: number; laneOffset: number; direction: 1 | -1 }[],
  selfIdx: number
): boolean {
  for (let i = 0; i < allSpawns.length; i++) {
    if (i === selfIdx) continue;
    const other = allSpawns[i];
    // Check same-direction vehicles AND oncoming vehicles in the candidate lane
    const lateralDist = Math.abs(other.laneOffset - candidateLaneOffset);
    if (lateralDist > 3.0) continue; // not in the same lane
    const longitudinal = (other.sampleIndex - currentSampleIndex) * direction;
    if (longitudinal > 0 && longitudinal < OVERTAKE_LANE_CLEAR_DISTANCE) return false;
    if (longitudinal < 0 && longitudinal > -OVERTAKE_LANE_CLEAR_DISTANCE * 0.4) return false;
  }
  return true;
}

/**
 * Compute the overtaking lane offset from a base lane offset.
 * Positive offset → right lane, so overtaking goes to the left (negative offset);
 * Negative offset → left lane, so overtaking goes to the right (positive offset).
 */
export function getOvertakeLaneOffset(baseLaneOffset: number): number {
  return baseLaneOffset > 0 ? baseLaneOffset - 5.0 : baseLaneOffset + 5.0;
}

/**
 * Look ahead for other AI vehicles on the same lane (within collision range).
 * Returns the distance to the nearest vehicle ahead, or -1 if clear.
 */
export function vehicleAhead(
  currentSampleIndex: number,
  direction: 1 | -1,
  laneOffset: number,
  allSpawns: { sampleIndex: number; laneOffset: number; direction: 1 | -1 }[],
  selfIdx: number
): number {
  let minDistance = Infinity;
  for (let i = 0; i < allSpawns.length; i++) {
    if (i === selfIdx) continue;
    const other = allSpawns[i];
    if (other.direction !== direction) continue; // oncoming traffic doesn't block
    // Same-lane check: lateral distance must be within ~3m
    const lateralDist = Math.abs(other.laneOffset - laneOffset);
    if (lateralDist > 3.0) continue;
    const distance = (other.sampleIndex - currentSampleIndex) * direction;
    if (distance > 0 && distance < minDistance) {
      minDistance = distance;
    }
  }
  return minDistance === Infinity ? -1 : minDistance;
}
