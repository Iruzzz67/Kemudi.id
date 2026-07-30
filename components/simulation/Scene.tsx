"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { Track } from "./Track";
import { VehicleController } from "./VehicleController";
import { ParkedVehicle } from "./ParkedVehicle";
import { Character } from "./Character";
import { CameraRig } from "./CameraRig";
import { CharacterCameraRig } from "./CharacterCameraRig";
import { IdealLine } from "./IdealLine";
import { EngineIgnition } from "./EngineIgnition";
import { CabinControls } from "./CabinControls";
import { PedestrianPriorityWatcher } from "./PedestrianPriorityWatcher";
import { useCameraToggle } from "./useCameraToggle";
import { VEHICLES, VehicleType } from "@/lib/vehicles";
import { mergeHandling } from "@/lib/handling";
import { createVehicleTransform } from "./transform";
import { START_Z } from "@/lib/track";
import { useSimStore } from "@/store/simStore";

// Spawn point for the pre-drive walk-around: a few meters behind the parked
// vehicle, off-center so the player naturally has to walk up to the
// (right-hand, Indonesian-market) driver door rather than starting on it.
const CHARACTER_SPAWN = new THREE.Vector3(-2, 0, START_Z + 5);

export function Scene({ vehicle }: { vehicle: VehicleType }) {
  const transform = useMemo(() => createVehicleTransform(START_Z), []);
  const characterTransform = useMemo(
    () => ({ position: CHARACTER_SPAWN.clone(), quaternion: new THREE.Quaternion() }),
    []
  );
  const cameraMode = useSimStore((s) => s.cameraMode);
  const phase = useSimStore((s) => s.phase);
  const overrides = useSimStore((s) => s.handlingOverrides[vehicle]);
  const config = useMemo(() => mergeHandling(VEHICLES[vehicle], overrides), [vehicle, overrides]);

  // Driver door sits on the vehicle's right side at rest (yaw 0, right = +X)
  // — Indonesia is right-hand-drive — a bit proud of the body so the "Masuk
  // Kendaraan" prompt triggers just outside the car rather than inside it.
  const doorPosition = useMemo(
    () => new THREE.Vector3(config.dimensions.width / 2 + 0.55, 0, START_Z),
    [config.dimensions.width]
  );

  useCameraToggle();

  const isDriving = phase === "driving";

  return (
    <Canvas shadows camera={{ fov: 60 }}>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <fog attach="fog" args={["#bae6fd", 60, 220]} />
      <color attach="background" args={["#bae6fd"]} />

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
      </Physics>

      {isDriving && <IdealLine />}
      {isDriving ? (
        <CameraRig transform={transform} config={config} mode={cameraMode} />
      ) : (
        <CharacterCameraRig transform={characterTransform} />
      )}
      {isDriving && <EngineIgnition />}
      {isDriving && <CabinControls />}
      {isDriving && <PedestrianPriorityWatcher transform={transform} />}
    </Canvas>
  );
}
