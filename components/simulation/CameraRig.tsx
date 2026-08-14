"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { VehicleConfig, seatHorizontalOffset } from "@/lib/vehicles";
import { VehicleTransform } from "./transform";
import { CameraMode, useSimStore } from "@/store/simStore";
import { useXR } from "@react-three/xr";

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
  originRef,
}: {
  transform: VehicleTransform;
  config: VehicleConfig;
  mode: CameraMode;
  originRef: React.RefObject<THREE.Group | null>;
}) {
  const { camera } = useThree();
  const isPresenting = useXR((s) => s.session != null);

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

    // Calculate driver seat offset (shared with CabinAnchor so the VR
    // dashboard/panel and the FPV camera always sit in the same place).
    const seat = seatHorizontalOffset(config);
    seatOffset.set(seat.x, config.dimensions.height * config.seatEyeHeightRatio + seatHeightOffset, seat.z);
    seatOffset.applyQuaternion(quat);

    // If active WebXR session, headset controls look direction. In @react-three/xr
    // v6 the XR camera is parented to the <XROrigin> group (the player's feet),
    // and the WebXR pose is applied on top of that group every frame — so any
    // direct camera.position write here would be instantly overwritten by the
    // headset. Moving the origin group instead teleports the player through the
    // world while keeping head-tracking intact.
    //
    // The session uses a `local-floor` reference space (three.js WebXRManager
    // default): the viewer pose is the headset's position RELATIVE TO THE FLOOR,
    // and WebXRManager adds it to the origin's world matrix. XROrigin therefore
    // represents the PLAYER'S FEET, not their eyes. Placing the origin at the
    // driver's eye height (seatOffset.y ≈ 1.19 m for a car) stacks the player's
    // real height on top (≈ 1.19 + 1.6 = 2.8 m) — through the roof. Instead the
    // origin sits on the floor at the driver's seat, and the vertical gap
    // between the player's real eye height (camera.position.y in the floor
    // reference space) and the target driver eye height is compensated on the
    // origin. Whatever the player's actual height (seated or standing), their
    // eyes always end up exactly at the driver's eye line.
    if (isPresenting) {
      if (originRef.current) {
        // camera.position.y = headset eye height above the physical floor. On the
        // first frame before any pose has arrived it is 0, which correctly falls
        // back to putting the origin at the eye height (a fresh player starts at
        // the driver eye line).
        const headHeight = camera.position.y;
        const originY = pos.y + seatOffset.y - headHeight;
        originRef.current.position.set(
          pos.x + seatOffset.x,
          originY,
          pos.z + seatOffset.z
        );
        // Only the vehicle's yaw is applied to the origin — never its roll or
        // pitch — so the player's head pose stays fully under their own control.
        originRef.current.quaternion.copy(quat);
      }
      return;
    }

    if (mode === "fpv") {
      camera.up.set(0, 1, 0);
      camera.position.set(pos.x + seatOffset.x, pos.y + seatOffset.y, pos.z + seatOffset.z);

      // Mirror check ([M]): a brief out-and-back yaw applied only to the
      // look-at direction, not the car's actual heading.
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

    if (mode === "rear") {
      // Kamera belakang (khusus truk): posisi di belakang kendaraan, melihat
      // ke belakang searah sumbu +Z lokal — seperti kamera mundur truk.
      camera.up.set(0, 1, 0);
      behind.set(0, 0, 1).applyQuaternion(quat);
      const rearDist = config.cameraDistance * 0.55 + 2;
      desiredPos.set(
        pos.x + behind.x * rearDist,
        pos.y + config.cameraHeight * 0.55,
        pos.z + behind.z * rearDist
      );
      const rearLook = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
      desiredLookAt.set(
        pos.x + rearLook.x * 12,
        pos.y + 1.2,
        pos.z + rearLook.z * 12
      );

      if (!initialized.current) {
        camera.position.copy(desiredPos);
        initialized.current = true;
      } else {
        camera.position.lerp(desiredPos, 1 - Math.pow(0.001, delta));
      }
      camera.lookAt(desiredLookAt);
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
      const t = 1 - Math.pow(0.0001, delta);
      camera.position.lerp(desiredPos, t);
    }
    camera.lookAt(desiredLookAt);
  });

  return null;
}
