import * as THREE from "three";

export type VehicleTransform = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

export function createVehicleTransform(startZ: number): VehicleTransform {
  return {
    position: new THREE.Vector3(0, 0, startZ),
    quaternion: new THREE.Quaternion(),
  };
}
