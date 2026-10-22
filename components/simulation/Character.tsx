"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useKeyboard } from "./useKeyboard";
import { useSimStore } from "@/store/simStore";
import { VehicleTransform } from "./transform";
import { circleCollides } from "@/lib/obstacles";

const WALK_SPEED = 2.4; // m/s
const WALK_BACK_SPEED = 1.4; // m/s
const TURN_RATE = 2.4; // rad/s
const ENTER_RADIUS = 2.0; // m, how close to the driver door before "Masuk Kendaraan" appears
// Horizontal radius of the character's solid footprint.
const CHARACTER_RADIUS = 0.4;

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function CharacterFigure() {
  const [gltf, setGltf] = useState<{ scene: THREE.Object3D } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();
    const paths = ["/models/karakter.glb", "/Blend/karakter.glb"];

    const tryLoad = (i: number) => {
      if (!mounted) return;
      if (i >= paths.length) return;
      loader.load(
        paths[i],
        (data: { scene: THREE.Object3D }) => {
          if (!mounted) return;
          setGltf(data);
        },
        undefined,
        () => {
          // on error, try next
          tryLoad(i + 1);
        }
      );
    };

    tryLoad(0);
    return () => {
      mounted = false;
    };
  }, []);

  if (!gltf) {
    // Fallback simple placeholder while model loads
    return (
      <group>
        <mesh castShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[0.42, 0.7, 0.26]} />
          <meshStandardMaterial color="#404040" roughness={0.75} />
        </mesh>
        <mesh castShadow position={[0, 1.08, 0]}>
          <sphereGeometry args={[0.16, 14, 14]} />
          <meshStandardMaterial color="#e0ac82" roughness={0.8} />
        </mesh>
      </group>
    );
  }

  // When model is loaded, render it. Adjust scale/rotation if needed.
  return (
    <primitive object={gltf.scene} castShadow receiveShadow dispose={null} />
  );
}

// Tank-style controller matching the vehicle's own W/A/S/D convention: W/S
// walk forward/back along the character's own heading, A/D turn in place.
// Position/heading are driven imperatively into `transform` (shared with
// CharacterCameraRig) rather than React state, the same pattern
// VehicleController uses for the car.
export function Character({
  transform,
  doorPosition,
}: {
  transform: VehicleTransform;
  doorPosition: THREE.Vector3;
}) {
  const { keys } = useKeyboard();
  const root = useRef<THREE.Group>(null);
  const heading = useRef(0);
  const wasNear = useRef(false);

  const phase = useSimStore((s) => s.phase);
  const entering = useSimStore((s) => s.entering);
  const setNearVehicleDoor = useSimStore((s) => s.setNearVehicleDoor);

  // Belt-and-suspenders: don't leave a stale "near door" flag set if this
  // component unmounts (e.g. phase flips to "driving") mid-proximity.
  useEffect(() => () => setNearVehicleDoor(false), [setNearVehicleDoor]);

  useFrame((_, rawDelta) => {
    const group = root.current;
    if (!group) return;
    const delta = Math.min(rawDelta, 0.05);
    const canMove = phase === "walking" && !entering;

    let speed = 0;
    if (canMove) {
      // VR/gamepad input (walking with a thumbstick) takes precedence over the
      // keyboard while it is active; otherwise fall back to W/A/S/D. Read via
      // getState() inside useFrame (no subscription) so the per-frame override
      // updates never trigger a React re-render.
      const ovr = useSimStore.getState().characterInputOverride;
      const k = keys.current;
      const turn = ovr
        ? (ovr.left ? 1 : 0) - (ovr.right ? 1 : 0)
        : (k.left ? 1 : 0) - (k.right ? 1 : 0);
      heading.current += turn * TURN_RATE * delta;
      const forward = ovr ? ovr.forward : k.forward;
      const back = ovr ? ovr.back : k.brake;
      speed = forward ? WALK_SPEED : back ? -WALK_BACK_SPEED : 0;
    }

    // Written via .set() (never a direct `transform.position.x +=`) so the
    // shared transform prop is only ever replaced, not incrementally mutated
    // — matching VehicleController's convention for the same shared-transform pattern.
    const forwardX = -Math.sin(heading.current);
    const forwardZ = -Math.cos(heading.current);
    const nextX = transform.position.x + forwardX * speed * delta;
    const nextZ = transform.position.z + forwardZ * speed * delta;

    // Solid obstacles (parked car, traffic-light pole, pedestrians): don't
    // walk through them. Turning in place stays allowed, and a spawn overlap
    // (the wasInside case) lets the player walk out instead of being stuck.
    const wasInside =
      circleCollides(transform.position.x, transform.position.z, CHARACTER_RADIUS) !== null;
    const willHit = circleCollides(nextX, nextZ, CHARACTER_RADIUS) !== null;
    if (!willHit || wasInside) {
      transform.position.set(nextX, 0, nextZ);
    }
    transform.quaternion.setFromAxisAngle(UP_AXIS, heading.current);
    group.position.copy(transform.position);
    group.quaternion.copy(transform.quaternion);

    const near = transform.position.distanceTo(doorPosition) < ENTER_RADIUS;
    if (near !== wasNear.current) {
      wasNear.current = near;
      setNearVehicleDoor(near);
    }
  });

  return (
    <group ref={root} position={transform.position}>
      <CharacterFigure />
    </group>
  );
}
