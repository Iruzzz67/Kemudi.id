"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { VEHICLE_MODELS } from "@/lib/vehicleModels";
import type { VehicleType } from "@/lib/vehicles";

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="garage-preview-message" role="status">Pratinjau 3D tidak tersedia di perangkat ini. Pilihan kendaraan tetap dapat digunakan.</div> : this.props.children;
  }
}

function Model({ vehicle, playing, onReady }: { vehicle: VehicleType; playing: boolean; onReady: () => void }) {
  const { scene } = useGLTF(VEHICLE_MODELS[vehicle]);
  const elapsed = useRef(0);
  const rig = useMemo(() => {
    const model = scene.clone(true);
    const wheels: THREE.Object3D[] = [], steer: THREE.Object3D[] = [];
    model.traverse((o) => {
      if (o.name.startsWith("Wheel_") && !(o as THREE.Mesh).isMesh) wheels.push(o);
      if (o.name.startsWith("Steer_") && !(o as THREE.Mesh).isMesh) steer.push(o);
      o.castShadow = (o as THREE.Mesh).isMesh && !(o as THREE.Mesh<THREE.BufferGeometry, THREE.Material>).material.transparent;
    });
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    return { model, wheels, steer, scale: 4.5 / size.z, body: model.getObjectByName("BodyMotion"), wheel: model.getObjectByName("SteeringWheel") };
  }, [scene]);
  const rigRef = useRef<typeof rig | null>(null);
  useEffect(() => { rigRef.current = rig; onReady(); return () => { rigRef.current = null; }; }, [rig, onReady]);
  useFrame((_, delta) => {
    const rig = rigRef.current;
    if (!rig) return;
    if (!playing) return;
    const dt = Math.min(delta, .05);
    elapsed.current += dt;
    for (const wheel of rig.wheels) wheel.rotateX(-dt * 1.8 / Number(wheel.userData.radius));
    const angle = Math.sin(elapsed.current * .65) * .22;
    for (const pivot of rig.steer) pivot.rotation.set(0, angle, 0);
    if (rig.wheel) rig.wheel.rotation.set(0, 0, -angle * 4.5);
    if (rig.body) rig.body.rotation.set(0, 0, Math.sin(elapsed.current * .65) * .012);
  });
  return <primitive object={rig.model} scale={rig.scale} dispose={null} />;
}

export default function VehiclePreview({ vehicle, playing }: { vehicle: VehicleType; playing: boolean }) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <PreviewBoundary key={vehicle}>
      <div className="h-full w-full" aria-label={`Pratinjau 3D ${vehicle.toLowerCase()}`} aria-busy={!ready} data-vehicle-preview={vehicle}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [6, 3.4, -6], fov: 38 }} frameloop={playing ? "always" : "demand"} fallback={<div className="garage-preview-message">WebGL tidak tersedia. Gunakan browser yang mendukung grafis 3D.</div>}>
        <color attach="background" args={["#eaf0f3"]} />
        <ambientLight intensity={1.4} />
        <hemisphereLight args={["#d8efff", "#a2adbb", 2]} />
        <directionalLight position={[4, 7, -5]} intensity={3.5} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-normalBias={.03} />
        <directionalLight position={[-4, 3, 4]} intensity={2} color="#e1f3ff" />
        <Suspense fallback={<Html center><span className="garage-loading" role="status">Memuat kendaraan…</span></Html>}>
          <Model key={vehicle} vehicle={vehicle} playing={playing} onReady={onReady} />
        </Suspense>
        <mesh rotation={[-Math.PI/2,0,0]} receiveShadow position={[0,-.018,0]}>
          <circleGeometry args={[5,64]} /><meshStandardMaterial color="#e0e7eb" roughness={1} />
        </mesh>
        <gridHelper args={[14,28,"#cbd6de","#dce4e9"]} position={[0,-.025,0]} />
        <OrbitControls makeDefault target={[0,.85,0]} enablePan={false} minDistance={4} maxDistance={12} minPolarAngle={.25} maxPolarAngle={Math.PI/2-.025} />
      </Canvas>
      </div>
    </PreviewBoundary>
  );
}
