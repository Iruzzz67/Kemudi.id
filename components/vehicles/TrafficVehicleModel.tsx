"use client";

import { RefObject, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AiVehicleConfig } from "@/lib/aiVehicles";
import { useSimStore } from "@/store/simStore";

export function TrafficVehicleModel({ config, speed }: { config: AiVehicleConfig; speed: RefObject<number> }) {
  const type = config.type === "motorcycle" ? "motor" : config.type === "truck" ? "truk" : "mobil";
  const { scene } = useGLTF(`/models/kemudi/${type}.glb`);
  const rig = useMemo(() => {
    const model = scene.clone(true), wheels: THREE.Object3D[] = [];
    const painted = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    model.traverse(o => {
      if (o.name.startsWith("Wheel_") && !(o as THREE.Mesh).isMesh) wheels.push(o);
      if (!(o as THREE.Mesh).isMesh) return;
      const mesh = o as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      mesh.castShadow = !mesh.material.transparent; mesh.receiveShadow = true;
      if (["Ocean blue", "Amber orange", "Logistics teal"].includes(mesh.material.name)) {
        let replacement = painted.get(mesh.material);
        if (!replacement) { replacement = mesh.material.clone(); replacement.color.set(config.color); painted.set(mesh.material, replacement); }
        mesh.material = replacement;
      }
    });
    return { model, wheels, painted };
  }, [scene, config.color]);
  const current = useRef<typeof rig | null>(null);
  useEffect(() => { current.current = rig; return () => { current.current = null; rig.painted.forEach(m => m.dispose()); }; }, [rig]);
  const scale = Math.min(config.width / (type === "motor" ? .78 : type === "truk" ? 2.4 : 1.86), config.length / (type === "motor" ? 1.9 : type === "truk" ? 6.7 : 4.22));
  useFrame((_, dt) => {
    if (useSimStore.getState().paused) return;
    current.current?.wheels.forEach(w => w.rotateX(-speed.current * Math.min(dt, .05) / (w.userData.radius * scale)));
  });
  return <group>
    <primitive object={rig.model} scale={scale} dispose={null} />
    {config.type === "police" && <group position={[0, 1.5 * scale + .08, 0]}>
      <mesh><boxGeometry args={[.75,.08,.25]} /><meshStandardMaterial color="#243346" /></mesh>
      {[-1,1].map(s => <mesh key={s} position={[s * .23,.07,0]}><boxGeometry args={[.28,.10,.2]} /><meshStandardMaterial color={s < 0 ? "#387fff" : "#ed4444"} emissive={s < 0 ? "#387fff" : "#ed4444"} emissiveIntensity={.8} /></mesh>)}
    </group>}
  </group>;
}
