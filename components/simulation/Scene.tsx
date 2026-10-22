"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { XR, XROrigin, useXR } from "@react-three/xr";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Track } from "./Track";
import { VehicleController } from "./VehicleController";
import { ParkedVehicle } from "./ParkedVehicle";
import { Character } from "./Character";
import { CameraRig } from "./CameraRig";
import { CharacterCameraRig } from "./CharacterCameraRig";
import { IdealLine } from "./IdealLine";
import { EngineIgnition } from "./EngineIgnition";
import { InputManager } from "./InputManager";
import { PedestrianPriorityWatcher } from "./PedestrianPriorityWatcher";
import { AiVehicle } from "./AiVehicle";
import { AI_SPAWNS } from "@/lib/aiVehicles";
import { VEHICLES, VehicleConfig, VehicleType, driverSideX, seatHorizontalOffset } from "@/lib/vehicles";
import { mergeHandling } from "@/lib/handling";
import { createVehicleTransform } from "./transform";
import { getRoadSamples, headingFromTangent, START_Z } from "@/lib/track";
import { useSimStore } from "@/store/simStore";
import { XRDashboard } from "./xr/XRDashboard";
import { XRControlsMap } from "./xr/XRControlsMap";
import { XRComfort } from "./xr/XRComfort";
import { XROptimizer } from "./xr/XROptimizer";
import { VRControlPanel } from "./xr/VRControlPanel";
import { xrStore } from "./xr/store";

// Spawn point for the pre-drive walk-around: start near the driver-side door
// so the simulation begins from a first-person approach to the car rather than
// a third-person behind-the-vehicle view. The side follows driverSideX() —
// right-hand drive (MOBIL/MOTOR) spawns on the right, the left-hand cab truck
// spawns on the left. Positioned relative to the PARKED vehicle (START_Z),
// not the road's first sample (ROAD_START_Z is behind the car) — and since
// the asphalt starts behind the car, the spawn lands on the road, not grass.
function createCharacterSpawn(config: VehicleConfig) {
  // Base = parked vehicle (START_Z), not the road's first sample. The side
  // follows driverSideX() — spawn on the driver's side of the parked car.
  const samples = getRoadSamples();
  const firstSample = samples[0];
  const rightOffset = (config.dimensions.width * 0.5 + 1.2) * driverSideX(config);
  const offset = new THREE.Vector3().crossVectors(firstSample.tangent, new THREE.Vector3(0, 1, 0)).multiplyScalar(rightOffset);
  return new THREE.Vector3(0, 0, START_Z).add(offset).add(new THREE.Vector3(0, 0, 3.5));
}

// Directional light whose shadow map shrinks while an immersive VR session is
// active — two eyes are rendered per frame on a mobile GPU, so a 2048² shadow
// pass per eye is expensive. 1024² keeps ground contact shadows readable while
// roughly quartering the shadow fill cost.
//
// The shadow target follows the vehicle so ground shadows stay usable along
// the whole ±900 m course (a static target would leave shadows behind at the
// start area). The target must be added to the scene graph (primitive) so its
// matrix is updated by the renderer.
function Sun({ target }: { target: THREE.Vector3 }) {
  const isPresenting = useXR((s) => s.session != null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const sun = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    lightTarget.position.copy(target);
    sun.current?.position.set(target.x + 24, target.y + 42, target.z + 18);
  });
  return (
    <>
      <directionalLight
        ref={sun}
        target={lightTarget}
        position={[20, 30, 10]}
        intensity={2.1}
        color="#fff0d6"
        castShadow
        shadow-mapSize={isPresenting ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-normalBias={0.025}
        shadow-bias={-0.0002}
      />
      <primitive object={lightTarget} />
    </>
  );
}

export function Scene({ vehicle }: { vehicle: VehicleType }) {
  const samples = useMemo(() => getRoadSamples(), []);
  const firstSample = samples[0];

  // The drive starts exactly where the vehicle was parked (START_Z) so the
  // phase flip from walking to driving never visibly teleports the car — the
  // heading still comes from the road's tangent at the first sample.
  const transform = useMemo(() => {
    const rot = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      headingFromTangent(firstSample.tangent)
    );
    return createVehicleTransform(new THREE.Vector3(0, 0, START_Z), rot);
  }, [firstSample]);

  const overrides = useSimStore((s) => s.handlingOverrides[vehicle]);
  const config = useMemo(() => mergeHandling(VEHICLES[vehicle], overrides), [vehicle, overrides]);
  const characterTransform = useMemo(
    () => ({ position: createCharacterSpawn(config), quaternion: new THREE.Quaternion() }),
    [config]
  );
  const cameraMode = useSimStore((s) => s.cameraMode);
  const phase = useSimStore((s) => s.phase);

  // The XR player origin (the headset's feet). In VR the XR camera is parented
  // to this group by @react-three/xr, so moving the group — NOT the camera — is
  // what teleports the player through the world (head-tracking pose would
  // otherwise overwrite any direct camera.position writes every frame).
  const originRef = useRef<THREE.Group>(null);

  // Driver door sits on the driver's side at rest (yaw 0) — right side
  // (+X) for right-hand-drive vehicles, left side (-X) for the left-hand cab
  // truck — a bit proud of the body so the "Masuk Kendaraan" prompt triggers
  // just outside the car rather than inside it.
  const doorPosition = useMemo(
    () =>
      new THREE.Vector3(
        driverSideX(config) * (config.dimensions.width / 2 + 0.55),
        0,
        seatHorizontalOffset(config).z
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), headingFromTangent(firstSample.tangent)).add(new THREE.Vector3(0, 0, START_Z)),
    // driverSideX(config) membaca config.type lewat fungsi, jadi rule
    // react-hooks/exhaustive-deps butuh seluruh `config` sebagai dependency.
    [config, firstSample]
  );

  const isDriving = phase === "driving";

  return (
    <Canvas shadows camera={{ fov: 60, far: 430 }}>
      <XR store={xrStore}>
        {/* Must be a sibling of the world content: it carries only the XR
            camera, so translating it moves the player through a static world. */}
        <XROrigin ref={originRef} />
        <ambientLight intensity={0.25} />
        <hemisphereLight args={["#d4e5ed", "#8a8968", 1.15]} />
        <Sun target={transform.position} />
        <XROptimizer />
        <fog attach="fog" args={["#c5dbe2", 90, 420]} />
        <color attach="background" args={["#c5dbe2"]} />

        <Physics gravity={[0, -9.81, 0]}>
          <Track />
          {isDriving ? (
            <VehicleController config={config} transform={transform} />
          ) : (
            <>
              <ParkedVehicle config={config} />
              <Character transform={characterTransform} doorPosition={doorPosition} />
            </>
          )}
          {/* AI Traffic Vehicles — only while driving */}
          {isDriving &&
            AI_SPAWNS.map((spawn, i) => (
              <AiVehicle key={`ai-${i}`} spawn={spawn} selfIndex={i} />
            ))}
        </Physics>

        {isDriving && <IdealLine />}
        {isDriving ? (
          <CameraRig
            transform={transform}
            config={config}
            mode={cameraMode}
            originRef={originRef}
          />
        ) : (
          <CharacterCameraRig transform={characterTransform} originRef={originRef} />
        )}
        {isDriving && <EngineIgnition />}
        {isDriving && <PedestrianPriorityWatcher transform={transform} />}

        {/* Single input funnel for the whole session — keyboard, VR
            controllers, and desktop gamepads all merge here. */}
        <InputManager />

        {/* WebXR v6 — controllers and hands are rendered by the XR store itself.
            XRControlsMap is mounted in BOTH the walking and driving phases so VR
            users can walk to the car with the thumbstick and enter it with a
            controller button, not just drive with one. */}
        <XRControlsMap />
        {isDriving && <XRComfort />}
        {isDriving && <XRDashboard config={config} transform={transform} />}
        {isDriving && <VRControlPanel config={config} transform={transform} />}
      </XR>
    </Canvas>
  );
}
