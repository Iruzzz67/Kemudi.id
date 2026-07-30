"use client";

export function Wheel({
  x,
  z,
  radius,
  width,
  y,
}: {
  x: number;
  z: number;
  radius: number;
  width: number;
  y?: number;
}) {
  return (
    <group position={[x, y ?? radius, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, width, 20]} />
        <meshStandardMaterial color="#1c1c1f" roughness={0.95} />
      </mesh>
      <mesh position={[0, width / 2 + 0.005, 0]}>
        <cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.02, 16]} />
        <meshStandardMaterial color="#c4c9d1" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -(width / 2 + 0.005), 0]}>
        <cylinderGeometry args={[radius * 0.52, radius * 0.52, 0.02, 16]} />
        <meshStandardMaterial color="#c4c9d1" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export function Light({
  x,
  y,
  z,
  size = [0.14, 0.1, 0.05],
  color = "#fef9c3",
}: {
  x: number;
  y: number;
  z: number;
  size?: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        toneMapped={false}
      />
    </mesh>
  );
}

export function GlassPanel({
  position,
  rotation,
  size,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#7dd3fc"
        transparent
        opacity={0.55}
        metalness={0.2}
        roughness={0.1}
      />
    </mesh>
  );
}
