"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { VehicleConfig } from "@/lib/vehicles";
import { VehicleTransform } from "./transform";
import { CameraMode, useSimStore } from "@/store/simStore";

const desiredPos = new THREE.Vector3();
const desiredLookAt = new THREE.Vector3();
const behind = new THREE.Vector3();
const forward = new THREE.Vector3();
const seatOffset = new THREE.Vector3();

const GLANCE_DURATION_MS = 900;
const GLANCE_MAX_ANGLE = 0.5; // rad, ~28° — a quick look toward the mirror and back

export function CameraRig({
  transform,
  config,
  mode,
}: {
  transform: VehicleTransform;
  config: VehicleConfig;
  mode: CameraMode;
}) {
  const { camera } = useThree();
  const initialized = useRef(false);
  const lastMode = useRef<CameraMode>(mode);
  const seatHeightOffset = useSimStore((s) => s.seatHeightOffset);
  const mirrorGlanceAt = useSimStore((s) => s.mirrorGlanceAt);
  const glanceStartRef = useRef(0);

  // A hard cut (not a smooth pan) whenever the player switches modes with [C].
  useEffect(() => {
    initialized.current = false;
    lastMode.current = mode;
  }, [mode]);

  useEffect(() => {
    if (mirrorGlanceAt > 0) glanceStartRef.current = mirrorGlanceAt;
  }, [mirrorGlanceAt]);

  useFrame((_, delta) => {
    const pos = transform.position;
    const quat = transform.quaternion;

    if (mode === "fpv") {
      camera.up.set(0, 1, 0);
      seatOffset.set(
        0,
        config.dimensions.height * 0.78 + seatHeightOffset,
        config.dimensions.length * 0.1
      );
      seatOffset.applyQuaternion(quat);
      camera.position.set(pos.x + seatOffset.x, pos.y + seatOffset.y, pos.z + seatOffset.z);

      // Mirror check ([M]): a brief out-and-back yaw applied only to the
      // look-at direction, not the car's actual heading — a real glance, not
      // a fake toggle, but one that never affects the vehicle's physics.
      let glanceYaw = 0;
      if (glanceStartRef.current > 0) {
        const elapsed = performance.now() - glanceStartRef.current;
        if (elapsed < GLANCE_DURATION_MS) {
          glanceYaw = Math.sin((elapsed / GLANCE_DURATION_MS) * Math.PI) * GLANCE_MAX_ANGLE;
        } else {
          glanceStartRef.current = 0;
        }
      }

      forward.set(Math.sin(glanceYaw), 0, -Math.cos(glanceYaw)).applyQuaternion(quat);
      desiredLookAt.set(
        camera.position.x + forward.x * 10,
        camera.position.y + forward.y * 10 - 0.3,
        camera.position.z + forward.z * 10
      );
      camera.lookAt(desiredLookAt);
      return;
    }

    if (mode === "topdown") {
      camera.up.set(0, 0, -1);
      const height = config.cameraDistance * 2.2 + 8;
      desiredPos.set(pos.x, pos.y + height, pos.z);

      if (!initialized.current) {
        camera.position.copy(desiredPos);
        initialized.current = true;
      } else {
        camera.position.lerp(desiredPos, 1 - Math.pow(0.001, delta));
      }
      camera.lookAt(pos.x, pos.y, pos.z);
      return;
    }

    // Third-person chase camera (default).
    camera.up.set(0, 1, 0);
    behind.set(0, 0, 1).applyQuaternion(quat).multiplyScalar(config.cameraDistance);
    desiredPos.set(pos.x + behind.x, pos.y + config.cameraHeight, pos.z + behind.z);
    desiredLookAt.set(pos.x, pos.y + config.dimensions.height * 0.5, pos.z);

    if (!initialized.current) {
      camera.position.copy(desiredPos);
      initialized.current = true;
    } else {
      // Snappier than a typical chase-cam lerp — a laggy camera makes a clean
      // turn look like the world is swimming/sliding around the car.
      const t = 1 - Math.pow(0.0001, delta);
      camera.position.lerp(desiredPos, t);
    }
    camera.lookAt(desiredLookAt);
  });

  return null;
}
