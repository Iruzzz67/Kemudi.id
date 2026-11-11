"use client";

import { Text } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import { useSimStore } from "@/store/simStore";
import { VehicleConfig, dashboardOffsetY } from "@/lib/vehicles";
import { gearLabel as transmissionGearLabel } from "@/lib/transmission";
import { VehicleTransform } from "../transform";
import { CabinAnchor } from "./CabinAnchor";

// Dashboard dipasang DI KABIN (CabinAnchor), bukan menempel ke kepala: panel
// instrumen yang ikut bergoyang tiap pemain menoleh terasa tidak wajar dan
// membuat sulit membaca angka. Sekarang ia tinggal di dasbor kendaraan —
// pemain menunduk sedikit untuk melihatnya, seperti mobil sungguhan.
export function XRDashboard({
  config,
  transform,
}: {
  config: VehicleConfig;
  transform: VehicleTransform;
}) {
  const isPresenting = useXR((s) => s.session != null);
  const speed = useSimStore((s) => s.speedKmh);
  const gear = useSimStore((s) => s.gear);
  const rpmRatio = useSimStore((s) => s.rpmRatio);
  const engineRunning = useSimStore((s) => s.engineRunning);
  const handbrakeOn = useSimStore((s) => s.handbrakeOn);
  const headlightsOn = useSimStore((s) => s.headlightsOn);
  const highBeamOn = useSimStore((s) => s.highBeamOn);
  const hazardOn = useSimStore((s) => s.hazardOn);
  const turnSignal = useSimStore((s) => s.turnSignal);
  const paused = useSimStore((s) => s.paused);
  const activeWarning = useSimStore((s) => s.activeWarning);
  const transmissionMode = useSimStore((s) => s.transmissionMode);

  const rpmValue = Math.round(rpmRatio * 7000);
  const gearLabel = transmissionGearLabel(transmissionMode, gear);

  // Only the headset sees the 3D dashboard — on desktop the HTML HUD covers it.
  if (!isPresenting) return null;

  // Posisi dasbor relatif terhadap mata pengemudi. Offset vertikal dihitung
  // dinamis dari ketinggian kursi (seatEyeHeightRatio) supaya dasbor selalu
  // berada pada ketinggian fisik kabin — sejajar dengan tinggi mata apa pun,
  // bukan konstanta untuk satu tinggi kursi tertentu. Sumbu X mengikuti sisi
  // kursi: truk berkabin setir kiri (truckww2.glb) meletakkan dasbor sedikit
  // ke kanan (+X, arah tengah mobil), kendaraan setir kanan ke kiri (-X).
  const actualPos: [number, number, number] =
    config.type === "TRUK"
      ? [0.05, dashboardOffsetY(config), -0.72]
      : config.type === "MOBIL"
        ? [-0.04, dashboardOffsetY(config), -0.62]
        : [0, dashboardOffsetY(config), -0.5]; // MOTOR

  return (
    <CabinAnchor transform={transform} config={config}>
      <group position={actualPos} rotation={[-0.42, 0, 0]}>
        {/* Dashboard background panel */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[0.36, 0.18]} />
          <meshBasicMaterial color="#090d16" opacity={0.85} transparent />
        </mesh>

        {/* Speedometer */}
        <Text position={[-0.08, 0.04, 0]} fontSize={0.038} color="#38bdf8" anchorX="center">
          {`${Math.round(speed)}`}
        </Text>
        <Text position={[-0.08, 0.01, 0]} fontSize={0.015} color="#94a3b8" anchorX="center">
          KM/H
        </Text>

        {/* Gear & RPM */}
        <Text position={[0.08, 0.04, 0]} fontSize={0.038} color="#f59e0b" anchorX="center">
          {gearLabel}
        </Text>
        <Text position={[0.08, 0.01, 0]} fontSize={0.015} color="#94a3b8" anchorX="center">
          GIGI
        </Text>

        {/* RPM bar */}
        <Text position={[0, -0.025, 0]} fontSize={0.014} color="#e2e8f0" anchorX="center">
          {`${rpmValue} RPM`}
        </Text>

        {/* Indicators */}
        <group position={[0, -0.055, 0]}>
          <Text position={[-0.08, 0, 0]} fontSize={0.013} color={engineRunning ? "#22c55e" : "#ef4444"}>
            {engineRunning ? "MESIN: ON" : "MESIN: OFF"}
          </Text>
          <Text position={[0.08, 0, 0]} fontSize={0.013} color={handbrakeOn ? "#f43f5e" : "#64748b"}>
            {handbrakeOn ? "REM TANGAN" : "REM RELEASED"}
          </Text>
        </group>

        {/* Lighting indicators */}
        <group position={[0, -0.082, 0]}>
          <Text position={[-0.08, 0, 0]} fontSize={0.011} color={headlightsOn ? "#eab308" : "#64748b"}>
            {headlightsOn ? (highBeamOn ? "LAMPU JAUH" : "LAMPU") : "LAMPU OFF"}
          </Text>
          <Text position={[0.08, 0, 0]} fontSize={0.011} color={hazardOn ? "#f97316" : turnSignal !== "off" ? "#f59e0b" : "#64748b"}>
            {hazardOn ? "HAZARD" : turnSignal === "left" ? "SEIN KIRI" : turnSignal === "right" ? "SEIN KANAN" : "SEIN OFF"}
          </Text>
        </group>

        {/* Pause overlay */}
        {paused && (
          <Text position={[0, 0.1, 0]} fontSize={0.03} color="#38bdf8" anchorX="center">
            ⏸ DIJEDA
          </Text>
        )}

        {/* Active Warning */}
        {activeWarning && (
          <Text position={[0, -0.075, 0]} fontSize={0.011} color="#fbbf24" maxWidth={0.34} anchorX="center">
            {activeWarning}
          </Text>
        )}
      </group>
    </CabinAnchor>
  );
}
