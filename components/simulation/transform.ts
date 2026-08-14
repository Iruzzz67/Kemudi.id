import * as THREE from "three";

export type VehicleTransform = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

export function createVehicleTransform(
  position: THREE.Vector3,
  quaternion: THREE.Quaternion
): VehicleTransform {
  return {
    position: position.clone(),
    quaternion: quaternion.clone(),
  };
}
