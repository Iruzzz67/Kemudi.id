"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import { VehicleTransform } from "./transform";

const LOOKAHEAD_DISTANCE = 10; // m, how far ahead a crossing pedestrian still counts as "in my path"
const PATH_HALF_WIDTH = 2; // m, lateral tolerance either side of the vehicle's forward line
const MIN_SPEED_KMH = 8; // below this the driver is already essentially stopped/yielding
const WARNING_COOLDOWN_MS = 3000;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const toPedestrian = new THREE.Vector3();

// Distinct from the hard-collision fail in Pedestrian.tsx: this watches for
// the "Anda tidak memberikan prioritas..." case — a pedestrian actually out
// on the crosswalk, ahead of the car, while the car is still moving through
// at speed instead of yielding. Reads `transform` directly (the same shared
// pose object Scene already threads to CameraRig) rather than round-tripping
// the vehicle's position through the store.
export function PedestrianPriorityWatcher({ transform }: { transform: VehicleTransform }) {
  const lastWarnAt = useRef(0);

  useFrame(() => {
    const state = useSimStore.getState();
    if (state.phase !== "driving" || state.speedKmh < MIN_SPEED_KMH) return;

    let mustYield = false;
    for (const key in state.pedestrianCrossings) {
      const crossing = state.pedestrianCrossings[key];
      if (!crossing.inRoad) continue;

      toPedestrian.set(crossing.x - transform.position.x, 0, crossing.z - transform.position.z);
      forward.set(0, 0, -1).applyQuaternion(transform.quaternion);
      const forwardDist = toPedestrian.dot(forward);
      if (forwardDist <= 0 || forwardDist > LOOKAHEAD_DISTANCE) continue;

      right.set(1, 0, 0).applyQuaternion(transform.quaternion);
      const lateralDist = Math.abs(toPedestrian.dot(right));
      if (lateralDist > PATH_HALF_WIDTH) continue;

      mustYield = true;
      break;
    }

    if (!mustYield) return;
    const now = performance.now();
    if (now - lastWarnAt.current < WARNING_COOLDOWN_MS) return;
    lastWarnAt.current = now;
    state.registerViolation(1);
    state.raiseWarning("Anda tidak memberikan prioritas kepada pejalan kaki.");
  });

  return null;
}
