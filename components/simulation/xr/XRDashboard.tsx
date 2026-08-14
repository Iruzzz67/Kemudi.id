"use client";

import { Text } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import { useSimStore } from "@/store/simStore";
import { VehicleConfig, dashboardOffsetY } from "@/lib/vehicles";
import { gearLabel as transmissionGearLabel } from "@/lib/transmission";
import { VehicleTransform } from "../transform";
import { CabinAnchor } from "./CabinAnchor";
import { VR_FONT } from "./vrFont";

// ─── Dashboard / speedometer kendaraan (HUD di dashboard) ──────────────────
// Dipasang DI KABIN (CabinAnchor): panel instrumen yang tinggal diam di
// dasbor kendaraan — pemain menunduk sedikit untuk membacanya, seperti mobil
// sungguhan. Inilah "HUD" untuk info berkendara: kecepatan, gigi, RPM, BBM,
// dan lampu indikator — TIDAK melayang di depan mata (HUD melayang dihapus).
//
// Gate showVrHud: tombol "HUD ON/OFF" di panel kontrol VR menyembunyikan /
// menampilkan dashboard ini.
export function XRDashboard({
  config,
  transform,
}: {
  config: VehicleConfig;
  transform: VehicleTransform;
}) {
  const isPresenting = useXR((s) => s.session != null);
  const showVrHud = useSimStore((s) => s.showVrHud);
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
  const fuel = useSimStore((s) => s.fuel);
  const seatbeltOn = useSimStore((s) => s.seatbeltOn);
  const helmetOn = useSimStore((s) => s.helmetOn);

  const rpmValue = Math.round(rpmRatio * 7000);
  const gearLabel = transmissionGearLabel(transmissionMode, gear);

  // Only the headset sees the 3D dashboard — on desktop the HTML HUD covers it.
  if (!isPresenting || !showVrHud) return null;

  // Posisi dasbor relatif terhadap mata pengemudi. Offset vertikal dihitung
  // dinamis dari ketinggian kursi (seatEyeHeightRatio) supaya dasbor selalu
  // berada pada ketinggian fisik kabin — sejajar dengan tinggi mata apa pun.
  // Sumbu X mengikuti sisi kursi: truk berkabin setir kiri (truckww2.glb)
  // meletakkan dasbor sedikit ke kanan (+X), kendaraan setir kanan ke kiri.
  const actualPos: [number, number, number] =
    config.type === "TRUK"
      ? [0.05, dashboardOffsetY(config), -0.72]
      : config.type === "MOBIL"
        ? [-0.04, dashboardOffsetY(config), -0.62]
        : [0, dashboardOffsetY(config), -0.5]; // MOTOR

  const isMotor = config.type === "MOTOR";

  return (
    <CabinAnchor transform={transform} config={config}>
      <group position={actualPos} rotation={[-0.42, 0, 0]}>
        {/* Dashboard background panel — cukup tinggi untuk 3 baris indikator
            + BBM, dengan ruang napas di atas untuk banner pause/warning. */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[0.36, 0.22]} />
          <meshBasicMaterial color="#090d16" opacity={0.85} transparent />
        </mesh>

        {/* Speedometer */}
        <Text font={VR_FONT} position={[-0.08, 0.045, 0]} fontSize={0.04} color="#38bdf8" anchorX="center">
          {`${Math.round(speed)}`}
        </Text>
        <Text font={VR_FONT} position={[-0.08, 0.015, 0]} fontSize={0.014} color="#94a3b8" anchorX="center">
          KM/H
        </Text>

        {/* Gear & RPM */}
        <Text font={VR_FONT} position={[0.08, 0.045, 0]} fontSize={0.04} color="#f59e0b" anchorX="center">
          {gearLabel}
        </Text>
        <Text font={VR_FONT} position={[0.08, 0.015, 0]} fontSize={0.014} color="#94a3b8" anchorX="center">
          GIGI
        </Text>

        {/* RPM */}
        <Text font={VR_FONT} position={[0, -0.02, 0]} fontSize={0.014} color="#e2e8f0" anchorX="center">
          {`${rpmValue} RPM`}
        </Text>

        {/* Indicators: mesin + rem tangan */}
        <group position={[0, -0.05, 0]}>
          <Text font={VR_FONT} position={[-0.08, 0, 0]} fontSize={0.012} color={engineRunning ? "#22c55e" : "#ef4444"}>
            {engineRunning ? "MESIN: ON" : "MESIN: OFF"}
          </Text>
          <Text font={VR_FONT} position={[0.08, 0, 0]} fontSize={0.012} color={handbrakeOn ? "#f43f5e" : "#64748b"}>
            {handbrakeOn ? "REM TANGAN" : "REM RELEASED"}
          </Text>
        </group>

        {/* Lighting indicators */}
        <group position={[0, -0.07, 0]}>
          <Text font={VR_FONT} position={[-0.08, 0, 0]} fontSize={0.011} color={headlightsOn ? "#eab308" : "#64748b"}>
            {headlightsOn ? (highBeamOn ? "LAMPU JAUH" : "LAMPU") : "LAMPU OFF"}
          </Text>
          <Text font={VR_FONT} position={[0.08, 0, 0]} fontSize={0.011} color={hazardOn ? "#f97316" : turnSignal !== "off" ? "#f59e0b" : "#64748b"}>
            {hazardOn ? "HAZARD" : turnSignal === "left" ? "SEIN KIRI" : turnSignal === "right" ? "SEIN KANAN" : "SEIN OFF"}
          </Text>
        </group>

        {/* BBM + safety gear (sabuk untuk mobil/truk, helm untuk motor) */}
        <group position={[0, -0.09, 0]}>
          <Text font={VR_FONT} position={[-0.08, 0, 0]} fontSize={0.011} color={fuel < 0.25 ? "#ef4444" : "#22c55e"}>
            {`BBM ${Math.round(fuel * 100)}%`}
          </Text>
          <Text font={VR_FONT} position={[0.08, 0, 0]} fontSize={0.011} color={isMotor ? (helmetOn ? "#22c55e" : "#f87171") : seatbeltOn ? "#22c55e" : "#f87171"}>
            {isMotor ? (helmetOn ? "HELM ON" : "HELM") : seatbeltOn ? "SABUK ON" : "SABUK"}
          </Text>
        </group>

        {/* Pause overlay (prioritas) */}
        {paused && (
          <Text font={VR_FONT} position={[0, 0.095, 0]} fontSize={0.028} color="#38bdf8" anchorX="center">
            DIJEDA
          </Text>
        )}

        {/* Active Warning — hanya saat tidak pause supaya tidak bertumpuk. */}
        {activeWarning && !paused && (
          <Text font={VR_FONT} position={[0, 0.085, 0]} fontSize={0.011} color="#fbbf24" maxWidth={0.34} anchorX="center">
            {activeWarning}
          </Text>
        )}
      </group>
    </CabinAnchor>
  );
}
