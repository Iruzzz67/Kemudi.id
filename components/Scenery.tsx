"use client";

// Renderer untuk SEMUA asset lingkungan & rintangan di lintasan (map ala Kota
// Bogor). Setiap item di lib/scenery.ts dirender sebagai:
//   - bentuk prosedural (placeholder) bila `glb` kosong, atau
//   - model GLB milik user bila field `glb` diisi (auto-fit + rotasi).
// Objek solid/soft didaftarkan ke registry collision 2D (lib/obstacles.ts)
// sehingga kendaraan & karakter berhenti/menerobos dengan benar.

import { Component, ReactNode, Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import {
  SCENERY_ITEMS,
  SceneryItem,
  SceneryKind,
  collisionKindOf,
  resolveSceneryPose,
} from "@/lib/scenery";
import { removeObstacle, setObstacle } from "@/lib/obstacles";

// Beberapa ekspor GLB membawa plane/ground/camera sisa dari tool pembuatnya
// yang merusak bounding box saat auto-fit — buang dulu.
const HELPER_NAME_PATTERN = /^(plane\d*|ground[_-]?plane\d*|backdrop\d*)$/i;

function stripHelperObjects(root: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];
  root.traverse((obj) => {
    const isCamera = (obj as THREE.Camera).isCamera;
    const isHelperMesh = (obj as THREE.Mesh).isMesh && HELPER_NAME_PATTERN.test(obj.name);
    if (isCamera || isHelperMesh) toRemove.push(obj);
  });
  toRemove.forEach((obj) => obj.parent?.remove(obj));
}

// ──────────────────────────────────────────────────────────────────────────
//  Asset GLB (milik user) — auto-fit ke kotak glbBox + rotasi arah hadap.
// ──────────────────────────────────────────────────────────────────────────
function GltfSceneryMesh({ item }: { item: SceneryItem }) {
  const { scene } = useGLTF(item.glb!);

  const { model, scale, offset, rotationY } = useMemo(() => {
    const clone = scene.clone(true);
    if (item.glbNative) {
      clone.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return { model: clone, scale: item.scale ?? 1, offset: new THREE.Vector3(), rotationY: 0 };
    }
    stripHelperObjects(clone);
    const box3 = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box3.getSize(size);
    box3.getCenter(center);

    // Sumbu mana yang "panjang" bervariasi per ekspor — pilih yang lebih
    // panjang (kendaraan/prop selalu lebih panjang daripada lebarnya), lalu
    // tambahkan koreksi 90° bila panjangnya di sumbu X.
    const zIsLength = size.z >= size.x;
    const modelWidth = zIsLength ? size.x : size.z;
    const modelLength = zIsLength ? size.z : size.x;
    const autoRotationY = zIsLength ? 0 : Math.PI / 2;

    const fit = item.glbBox ?? { length: 4.3, width: 1.8, height: 1.4 };
    const s = Math.min(
      fit.width / Math.max(modelWidth, 1e-4),
      fit.height / Math.max(size.y, 1e-4),
      fit.length / Math.max(modelLength, 1e-4)
    );

    // Translasi diterapkan setelah rotasi dalam transform lokal Object3D —
    // putar dulu pusat (yang sudah diskalakan) lalu batalkan supaya model
    // mendarat di origin setelah rotasi.
    const totalRotationY = autoRotationY + (item.glbRotateY ?? Math.PI);
    const scaledCenter = center.clone().multiplyScalar(s);
    scaledCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), totalRotationY);

    return {
      model: clone,
      scale: s,
      offset: new THREE.Vector3(-scaledCenter.x, -box3.min.y * s, -scaledCenter.z),
      rotationY: totalRotationY,
    };
  }, [scene, item]);

  useEffect(() => {
    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <primitive
      object={model}
      dispose={null}
      scale={scale}
      position={[offset.x, offset.y, offset.z]}
      rotation={[0, rotationY, 0]}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Bentuk prosedural (placeholder) — diganti otomatis bila `glb` diisi.
// ──────────────────────────────────────────────────────────────────────────
function hashColor(id: string, palette: string[]): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

const HOUSE_BODIES = ["#e8d8b8", "#d9c7a7", "#e0d3c0", "#cbb9a0", "#cfc4b0"];
const ROOFS = ["#a0522d", "#8b4513", "#b5651d", "#7c4a2d"];
const AWNINGS = ["#dc2626", "#2563eb", "#16a34a", "#ea580c"];

function TrafficCone({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={0.95 * scale}>
      <mesh castShadow position={[0, 0.3, 0]}>
        <coneGeometry args={[0.16, 0.34, 12]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.135, 0.135, 0.07, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh castShadow position={[0, 0.045, 0]}>
        <boxGeometry args={[0.32, 0.05, 0.32]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </group>
  );
}

function WaterBarrier() {
  return (
    <group>
      <mesh castShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.55, 0.52, 1.7]} />
        <meshStandardMaterial color="#2563eb" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.58, 0.22, 1.74]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {[-1.2, 1.2].map((z) => (
        <mesh key={z} castShadow position={[0, 0.07, z]}>
          <boxGeometry args={[0.5, 0.14, 0.3]} />
          <meshStandardMaterial color="#1e3a8a" />
        </mesh>
      ))}
    </group>
  );
}

function ProjectBarrier() {
  return (
    <group>
      <mesh castShadow position={[0, 0.45, 0]}>
        <boxGeometry args={[0.5, 0.6, 1.35]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      {[0.35, 0, -0.35].map((z) => (
        <mesh key={z} position={[0, 0.45, z]}>
          <boxGeometry args={[0.52, 0.18, 0.2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} castShadow position={[0, 0.1, z]}>
          <boxGeometry args={[0.4, 0.2, 0.2]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      ))}
    </group>
  );
}

function GuardPost() {
  return (
    <mesh castShadow position={[0, 0.45, 0]}>
      <cylinderGeometry args={[0.11, 0.14, 0.9, 8]} />
      <meshStandardMaterial color="#9ca3af" roughness={0.8} />
    </mesh>
  );
}

function Pothole() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.0, 22]} />
        <meshStandardMaterial color="#27272a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.023, 0]}>
        <circleGeometry args={[0.55, 14]} />
        <meshStandardMaterial color="#18181b" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0.3]}>
        <planeGeometry args={[0.7, 0.12]} />
        <meshStandardMaterial color="#3f3f46" roughness={1} />
      </mesh>
    </group>
  );
}

function VendorStall({ id }: { id: string }) {
  const awning = hashColor(id, AWNINGS);
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.2, 0.8]} />
        <meshStandardMaterial color="#d4a373" />
      </mesh>
      <mesh castShadow position={[0, 1.45, -0.2]}>
        <boxGeometry args={[2.2, 0.08, 1.2]} />
        <meshStandardMaterial color={awning} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} castShadow position={[x, 0.75, 0.15]}>
          <cylinderGeometry args={[0.035, 0.035, 1.5, 6]} />
          <meshStandardMaterial color="#52525b" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function BusStop() {
  return (
    <group>
      <mesh castShadow position={[0, 0.9, 0]}>
        <boxGeometry args={[0.12, 1.8, 3.2]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0.2]}>
        <boxGeometry args={[1.7, 0.08, 3.4]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh castShadow position={[0, 0.45, 1.4]}>
        <boxGeometry args={[0.7, 0.18, 0.6]} />
        <meshStandardMaterial color="#57534e" />
      </mesh>
      {[0, 0.9, -0.9].map((x) => (
        <mesh key={x} castShadow position={[x, 0.9, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function StreetLamp({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale}>
      <mesh castShadow position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 5.2, 8]} />
        <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 5.15, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[0, 4.98, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.14, 8]} />
        <meshStandardMaterial color="#a16207" />
      </mesh>
    </group>
  );
}

function Tree({ scale = 1, id }: { scale?: number; id: string }) {
  const green = hashColor(id, ["#3f9142", "#4d9e50", "#3b7d3e", "#57a85b"]);
  return (
    <group scale={scale}>
      <mesh castShadow position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.26, 2.2, 7]} />
        <meshStandardMaterial color="#7c5a3c" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 3, 0]}>
        <sphereGeometry args={[1.3, 8, 6]} />
        <meshStandardMaterial color={green} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.75, 2.55, 0.3]}>
        <sphereGeometry args={[0.85, 8, 6]} />
        <meshStandardMaterial color={green} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[-0.6, 2.7, -0.4]}>
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshStandardMaterial color={green} roughness={0.85} />
      </mesh>
    </group>
  );
}

function House({ id }: { id: string }) {
  const body = hashColor(id, HOUSE_BODIES);
  const roof = hashColor(id, ROOFS);
  return (
    <group>
      <mesh castShadow position={[0, 1.4, 0]}>
        <boxGeometry args={[5, 2.8, 4]} />
        <meshStandardMaterial color={body} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 3.3, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.9, 1.7, 4]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 2.02]}>
        <boxGeometry args={[0.85, 1.5, 0.06]} />
        <meshStandardMaterial color="#7c4a2d" roughness={0.8} />
      </mesh>
      <mesh position={[1.35, 1.45, 2.02]}>
        <boxGeometry args={[0.7, 0.65, 0.06]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.4} />
      </mesh>
      <mesh position={[-1.35, 1.45, 2.02]}>
        <boxGeometry args={[0.7, 0.65, 0.06]} />
        <meshStandardMaterial color="#bae6fd" roughness={0.4} />
      </mesh>
    </group>
  );
}

function ShopHouse({ id }: { id: string }) {
  const body = hashColor(id, HOUSE_BODIES);
  const awning = hashColor(id, AWNINGS);
  return (
    <group>
      <mesh castShadow position={[0, 2, 0]}>
        <boxGeometry args={[5.6, 4, 7]} />
        <meshStandardMaterial color={body} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 4.02, 0]}>
        <boxGeometry args={[5.8, 0.25, 7.2]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[5.75, 0.7, 7.15]} />
        <meshStandardMaterial color={awning} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.9, 3.55]}>
        <boxGeometry args={[4.6, 0.9, 0.08]} />
        <meshStandardMaterial color="#334155" metalness={0.3} roughness={0.3} />
      </mesh>
    </group>
  );
}

function RoadSign() {
  return (
    <group>
      <mesh castShadow position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.3, 6]} />
        <meshStandardMaterial color="#52525b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 2.35, 0]}>
        <boxGeometry args={[1.15, 0.75, 0.08]} />
        <meshStandardMaterial color="#15803d" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.5, 0.05]}>
        <boxGeometry args={[0.5, 0.22, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function ParkedCar({ id }: { id: string }) {
  const body = hashColor(id, ["#cbd5e1", "#94a3b8", "#d6d3d1", "#b45309", "#1d4ed8", "#be123c"]);
  return (
    <group>
      <mesh castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.75, 0.55, 4.3]} />
        <meshStandardMaterial color={body} roughness={0.6} />
      </mesh>
      {/* Kabin / kaca */}
      <mesh position={[0, 0.95, -0.35]}>
        <boxGeometry args={[1.65, 0.42, 2.3]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.15} />
      </mesh>
      {/* Lampu depan/belakang (posisi -Z = depan, searah kendaraan pemain) */}
      <mesh position={[0, 0.55, -2.14]}>
        <boxGeometry args={[1.6, 0.16, 0.06]} />
        <meshStandardMaterial color="#fef9c3" emissive="#fef9c3" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.55, 2.14]}>
        <boxGeometry args={[1.6, 0.16, 0.06]} />
        <meshStandardMaterial color="#7f1d1d" />
      </mesh>
      {[-1.5, 1.5].map((z) => (
        <mesh key={z} castShadow position={[0, 0.3, z]}>
          <cylinderGeometry args={[0.34, 0.34, 0.26, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ParkedBus() {
  return (
    <group>
      <mesh castShadow position={[0, 1.5, 0]}>
        <boxGeometry args={[2.5, 3, 9]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <boxGeometry args={[2.62, 0.85, 8.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[2.52, 0.4, 8.6]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {[-3.6, 3.6].map((z) => (
        <mesh key={z} castShadow position={[0, 0.5, z]}>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 12]} />
          <meshStandardMaterial color="#111827" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Boundary kecil: jika asset GLB milik user gagal dimuat (file rusak / salah
// nama), jangan sampai meruntuhkan seluruh canvas — cukup jatuh ke bentuk
// prosedural agar tidak ada "tembok tak terlihat".
class GltfBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { onError: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function ProceduralProp({ kind, id, scale }: { kind: SceneryKind; id: string; scale?: number }) {
  switch (kind) {
    case "cone":
      return <TrafficCone scale={scale} />;
    case "water-barrier":
      return <WaterBarrier />;
    case "project-barrier":
      return <ProjectBarrier />;
    case "pole":
      return <GuardPost />;
    case "pothole":
      return <Pothole />;
    case "vendor":
      return <VendorStall id={id} />;
    case "bus-stop":
      return <BusStop />;
    case "street-lamp":
      return <StreetLamp scale={scale} />;
    case "tree":
      return <Tree id={id} scale={scale} />;
    case "house":
      return <House id={id} />;
    case "shophouse":
      return <ShopHouse id={id} />;
    case "sign":
      return <RoadSign />;
    case "parked-car":
      return <ParkedCar id={id} />;
    case "parked-bus":
      return <ParkedBus />;
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Satu item: pose dunia + render + registrasi collision
// ──────────────────────────────────────────────────────────────────────────
function SceneryItemView({ item }: { item: SceneryItem }) {
  const pose = useMemo(() => resolveSceneryPose(item), [item]);
  // Jika GLB milik user gagal dimuat, render bentuk prosedural sebagai gantinya.
  const [glbFailed, setGlbFailed] = useState(false);
  const authoredItem = useMemo(() => {
    if (item.glb) return item;
    let asset: string | undefined;
    if (item.kind === "house") {
      const variants = ["house-sage", "house-sand", "house-rose"];
      let hash = 0; for (const c of item.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
      asset = `/models/kemudi/environment/${variants[hash % 3]}.glb`;
    } else if (["shophouse", "tree", "street-lamp"].includes(item.kind)) asset = `/models/kemudi/environment/${item.kind}.glb`;
    else if (item.kind === "parked-car") asset = "/models/kemudi/mobil.glb";
    return asset ? { ...item, glb: asset, glbNative: true } : item;
  }, [item]);
  const facingRoad = ["house", "shophouse", "street-lamp"].includes(item.kind) && authoredItem.glbNative;

  // Daftarkan ke registry collision 2D. Pothole TIDAK solid (zona perlambat
  // ditangani VehicleController via lib/scenery.ts).
  useEffect(() => {
    if (!item.solid && !item.soft) return;
    const id = `scenery-${item.id}`;
    if (item.radius) {
      setObstacle(id, {
        shape: "circle",
        kind: collisionKindOf(item.kind),
        x: pose.x,
        z: pose.z,
        radius: item.radius,
        soft: item.soft,
      });
    } else if (item.rect) {
      setObstacle(id, {
        shape: "rect",
        kind: collisionKindOf(item.kind),
        x: pose.x,
        z: pose.z,
        yaw: pose.heading + (item.rect.laneYaw ?? 0),
        halfW: item.rect.halfW,
        halfL: item.rect.halfL,
        soft: item.soft,
      });
    }
    return () => removeObstacle(id);
  }, [item, pose.x, pose.z, pose.heading]);

  return (
    <group position={[pose.x, 0, pose.z]} rotation={[0, pose.heading + (item.yaw ?? 0) + (facingRoad ? (item.offset > 0 ? -Math.PI / 2 : Math.PI / 2) : 0), 0]}>
      {authoredItem.glb && !glbFailed ? (
        <GltfBoundary onError={() => setGlbFailed(true)}>
          <Suspense fallback={<ProceduralProp kind={item.kind} id={item.id} scale={item.scale} />}>
            <GltfSceneryMesh item={authoredItem} />
          </Suspense>
        </GltfBoundary>
      ) : (
        <ProceduralProp kind={item.kind} id={item.id} scale={item.scale} />
      )}
    </group>
  );
}

export function Scenery() {
  return (
    <group>
      {SCENERY_ITEMS.map((item) => (
        <SceneryItemView key={item.id} item={item} />
      ))}
    </group>
  );
}

// Preload model yang dipakai sebagai asset statis (truk berhenti).
useGLTF.preload("/models/truckww2.glb");
