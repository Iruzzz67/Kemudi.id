"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { WEATHERS, WeatherKind } from "@/lib/weather";

const RAIN_BOX = { x: 60, y: 40, z: 60 };
const RAIN_FALL_SPEED = 22; // m/s — deras terasa cepat
const MAX_RAIN_DROPS = 2000;

// Hujan dirender sebagai satu buffer titik yang mengikuti kamera (selalu
// berada di sekitar pemain) dan jatuh ke bawah tiap frame lalu di-loop ke
// atas. Kepadatan & kecepatan mengikuti konfigurasi cuaca.
function createRainGeometry(drops: number, velocities: Float32Array): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(drops * 3);
  for (let i = 0; i < drops; i++) {
    positions[i * 3] = (Math.random() - 0.5) * RAIN_BOX.x;
    positions[i * 3 + 1] = Math.random() * RAIN_BOX.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_BOX.z;
    velocities[i] = RAIN_FALL_SPEED * (0.8 + Math.random() * 0.4);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

function Rain({ drops }: { drops: number }) {
  const points = useRef<THREE.Points>(null);
  const { camera } = useThree();
  // Data sekali-buat lewat useState lazy initializer. Mutasi tiap frame
  // dilakukan lewat ref (bukan state) agar aman bagi React Compiler.
  const [velocities] = useState(() => new Float32Array(drops));
  const [geometry] = useState(() => createRainGeometry(drops, velocities));
  const geoRef = useRef(geometry);

  useFrame((_, delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < drops; i++) {
      arr[i * 3 + 1] -= velocities[i] * delta;
      // Wrap ke atas begitu melewati dasar kotak (relatif ke kamera).
      if (arr[i * 3 + 1] < -RAIN_BOX.y / 2) {
        arr[i * 3 + 1] = RAIN_BOX.y / 2;
        arr[i * 3] = (Math.random() - 0.5) * RAIN_BOX.x;
        arr[i * 3 + 2] = (Math.random() - 0.5) * RAIN_BOX.z;
      }
    }
    pos.needsUpdate = true;
    // Kotak hujan selalu berpusat di kamera.
    if (points.current) points.current.position.set(camera.position.x, camera.position.y, camera.position.z);
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        color="#9db8d0"
        size={0.14}
        transparent
        opacity={0.7}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// Bintang sederhana — hanya tampil saat malam (dan senja redup). Diposisikan
// di langit mengikuti kamera secara kasar.
function makeStars(): THREE.BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i < 300; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 380;
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      Math.abs(r * Math.cos(phi)) + 20,
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
}

function Stars() {
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const [starGeometry] = useState(makeStars);

  useFrame(() => {
    if (group.current) group.current.position.copy(camera.position);
  });

  return (
    <group ref={group}>
      <points geometry={starGeometry}>
        <pointsMaterial color="#fef9c3" size={0.6} sizeAttenuation={false} transparent opacity={0.9} />
      </points>
    </group>
  );
}

export function WeatherEffects({ weather }: { weather: WeatherKind }) {
  const cfg = WEATHERS[weather];
  const rainDrops = useMemo(
    () => Math.round(cfg.rainIntensity * MAX_RAIN_DROPS),
    [cfg.rainIntensity]
  );

  return (
    <group>
      {rainDrops > 0 && <Rain drops={rainDrops} />}
      {cfg.night && <Stars />}
    </group>
  );
}
