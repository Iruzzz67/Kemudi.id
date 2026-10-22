"use client";

import { useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { vrInputStatus } from "./XRInputAdapter";
import { useSimStore } from "@/store/simStore";
import { VehicleConfig, dashboardOffsetY, driverSideX } from "@/lib/vehicles";
import { VehicleTransform } from "../transform";
import { CabinAnchor } from "./CabinAnchor";
import { VRButton, VR_ACTIVE_COLOR } from "./VRButton";
import {
  vrActionToggleEngine,
  vrActionToggleHandbrake,
  vrActionSetTurnSignal,
  vrActionToggleHeadlights,
  vrActionToggleHighBeam,
  vrActionToggleHazard,
  vrActionHonk,
  vrActionToggleSeatbelt,
  vrActionToggleHelmet,
  vrActionToggleJacket,
  vrActionToggleGloves,
  vrActionToggleBoots,
  vrActionCycleCamera,
  vrActionExitVR,
} from "./vrActions";

// ─── Panel kontrol di dalam headset ────────────────────────────────────────
// Hanya muncul saat sesi VR aktif dan sedang mengemudi.
//
// Panel DIAM di dalam kabin (CabinAnchor), bukan menempel ke kepala. Versi
// lama memakai CameraFollower: panel ikut bergerak setiap pemain menoleh,
// sehingga ray controller selalu meleset dan tombol terasa "tidak berfungsi",
// ditambah jaraknya cuma ~0,55 m di sudut mata sehingga sulit terbaca.
// Sekarang panel dipasang di depan-kiri pengemudi pada jarak nyaman (±0,8 m,
// di bawah garis pandang ke jalan), dengan tombol lebih besar supaya gampang
// dibidik baik dengan ray controller maupun jari (hand tracking).
//
// Baris paling atas adalah tombol STARTER MESIN berukuran lebar — dulu tombol
// mesin tenggelam di antara tombol lain sehingga pemain tidak tahu cara
// menyalakan kendaraan.

const BTN_W = 0.17;
const BTN_H = 0.062;
const ROW_STEP = BTN_H + 0.014;
const FIRST_Y = -0.085;
const COL_STEP = 0.19;
const PANEL_W = 0.66;
// Tombol starter: satu baris penuh di puncak panel.
const ENGINE_H = 0.075;
const ENGINE_Y = 0;
// Posisi panel dalam ruang kabin, relatif terhadap mata pengemudi:
// sedikit ke arah tengah mobil (kiri untuk setir kanan, kanan untuk truk
// setir kiri), di bawah garis pandang, ±0,8 m. Offset vertikal dihitung
// dinamis dari ketinggian kursi (seatEyeHeightRatio) lewat dashboardOffsetY
// supaya panel selalu sejajar dengan tinggi mata.
const PANEL_XZ: Record<string, [number, number]> = {
  MOBIL: [-0.34, -0.72],
  TRUK: [0.38, -0.78],
  MOTOR: [-0.3, -0.68],
};
// Dimiringkan menghadap pengemudi. Sumbu Y (yaw) mengikuti sisi kursi:
// kendaraan setir kanan (pengemudi di +X, panel di kirinya) membelokkan
// panel ke kanan, truk setir kiri (pengemudi di -X, panel di kanannya)
// membelokkan ke kiri — dikali driverSideX() supaya normal panel tetap
// mengarah ke pengemudi.
const PANEL_ROT: [number, number, number] = [-0.28, 0.42, 0];

type ButtonSpec = {
  label: string;
  active: boolean;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
};

// Adaptive mapping: controller dengan A/B/X/Y menampilkan semua pintasan;
// controller yang hanya punya trigger/grip/stik (mis. Vive, sebagian WMR) atau
// sesi hand tracking diarahkan memakai tombol panel ini. Status dibaca dari
// objek mutable `vrInputStatus` (diperbarui tiap frame oleh XRControlsMap),
// lalu disalin ke state hanya ketika berubah supaya tidak render tiap frame.
function ShortcutHint({ y }: { y: number }) {
  const [full, setFull] = useState(vrInputStatus.hasFaceButtons);
  const [hands, setHands] = useState(vrInputStatus.source === "hand-tracking");
  useFrame(() => {
    if (vrInputStatus.hasFaceButtons !== full) setFull(vrInputStatus.hasFaceButtons);
    const isHands = vrInputStatus.source === "hand-tracking";
    if (isHands !== hands) setHands(isHands);
  });

  const text = hands
    ? "Tangan: cubit kanan=gas · cubit kiri=rem · cubit kiri tahan=rem tangan · dua tangan menggenggam=setir · fungsi lain lewat panel ini"
    : full
      ? "Stik kanan=setir · Trigger=gas/rem · Grip kiri=kopling · Grip kanan=rem tangan · X/A=sein · X+A=hazard · B+Y=starter · A+B=cruise · X+Y=reset · Stik kanan tekan=klakson · Y=lampu · B=lampu jauh · Stik kiri tekan=spion · Menu=kamera/pause"
      : "Controller ini tanpa tombol A/B/X/Y: Trigger=gas/rem · Grip kiri=kopling · Grip kanan=rem tangan · Stik kanan=setir · fungsi lain lewat panel ini";

  return (
    <Text position={[0, y, 0]} fontSize={0.01} color="#94a3b8" anchorX="center" maxWidth={PANEL_W - 0.04}>
      {text}
    </Text>
  );
}

export function VRControlPanel({
  config,
  transform,
}: {
  config: VehicleConfig;
  transform: VehicleTransform;
}) {
  const isPresenting = useXR((s) => s.session != null);
  const engineRunning = useSimStore((s) => s.engineRunning);
  const engineState = useSimStore((s) => s.engineState);
  const handbrakeOn = useSimStore((s) => s.handbrakeOn);
  const turnSignal = useSimStore((s) => s.turnSignal);
  const seatbeltOn = useSimStore((s) => s.seatbeltOn);
  const helmetOn = useSimStore((s) => s.helmetOn);
  const jacketOn = useSimStore((s) => s.jacketOn);
  const glovesOn = useSimStore((s) => s.glovesOn);
  const bootsOn = useSimStore((s) => s.bootsOn);
  const headlightsOn = useSimStore((s) => s.headlightsOn);
  const highBeamOn = useSimStore((s) => s.highBeamOn);
  const hazardOn = useSimStore((s) => s.hazardOn);
  const cameraMode = useSimStore((s) => s.cameraMode);

  if (!isPresenting) return null;

  const isMotor = config.type === "MOTOR";
  // Saklar kontak berjalan OFF → ACC → ON → START; label ikut langkahnya
  // supaya pemain tahu harus menekan berapa kali.
  const engineLabel =
    engineState === "START"
      ? "MENYALAKAN..."
      : engineRunning
        ? "MESIN HIDUP — TEKAN UNTUK MATI"
        : engineState === "OFF"
          ? "STARTER MESIN (TEKAN)"
          : `KONTAK: ${engineState} — TEKAN LAGI`;
  const cameraLabel =
    cameraMode === "fpv" ? "Kamera FPV" : cameraMode === "tpv" ? "Kamera TPV" : "Kamera Top";

  const leftCol: ButtonSpec[] = [
    { label: "Rem Tangan", active: handbrakeOn, run: vrActionToggleHandbrake },
    { label: "Sein Kiri", active: turnSignal === "left", run: () => vrActionSetTurnSignal("left") },
    { label: "Sein Kanan", active: turnSignal === "right", run: () => vrActionSetTurnSignal("right") },
    { label: cameraLabel, active: false, run: vrActionCycleCamera },
  ];

  const midCol: ButtonSpec[] = [
    { label: headlightsOn ? "Lampu ON" : "Lampu", active: headlightsOn, run: vrActionToggleHeadlights },
    {
      label: highBeamOn ? "Jauh ON" : "Lampu Jauh",
      active: highBeamOn,
      // Lampu jauh butuh lampu utama menyala — tampil redup, bukan diam-diam
      // tidak bereaksi saat ditekan.
      disabled: !headlightsOn && !highBeamOn,
      run: vrActionToggleHighBeam,
    },
    { label: hazardOn ? "Hazard ON" : "Hazard", active: hazardOn, run: vrActionToggleHazard },
    { label: "Klakson", active: false, run: vrActionHonk },
  ];

  const rightCol: ButtonSpec[] = [
    ...(isMotor
      ? [
          { label: helmetOn ? "Helm ON" : "Helm", active: helmetOn, run: vrActionToggleHelmet },
          { label: jacketOn ? "Jaket ON" : "Jaket", active: jacketOn, run: vrActionToggleJacket },
          { label: glovesOn ? "Sarung ON" : "Sarung", active: glovesOn, run: vrActionToggleGloves },
          { label: bootsOn ? "Sepatu ON" : "Sepatu", active: bootsOn, run: vrActionToggleBoots },
        ]
      : [{ label: seatbeltOn ? "Sabuk ON" : "Sabuk", active: seatbeltOn, run: vrActionToggleSeatbelt }]),
    { label: "Keluar VR", active: false, run: vrActionExitVR, danger: true },
  ];

  const rowCount = Math.max(leftCol.length, midCol.length, rightCol.length);
  // Tinggi panel dihitung dari tombol starter (paling atas) sampai baris grid
  // terakhir, plus sedikit margin.
  const top = ENGINE_Y + ENGINE_H / 2 + 0.022;
  const bottom = FIRST_Y - (rowCount - 1) * ROW_STEP - BTN_H / 2 - 0.022;
  const panelH = top - bottom;
  const panelCenterY = (top + bottom) / 2;
  const hintY = bottom - 0.025;
  const colX = [-COL_STEP, 0, COL_STEP];
  const cols = [leftCol, midCol, rightCol];

  return (
    <CabinAnchor transform={transform} config={config}>
      <group
        position={[PANEL_XZ[config.type]?.[0] ?? -0.34, dashboardOffsetY(config), PANEL_XZ[config.type]?.[1] ?? -0.72]}
        rotation={[PANEL_ROT[0], PANEL_ROT[1] * driverSideX(config), PANEL_ROT[2]]}
      >
        {/* Judul panel */}
        <Text position={[0, panelCenterY + panelH / 2 + 0.028, 0]} fontSize={0.024} color="#e2e8f0" anchorX="center">
          KONTROL
        </Text>

        {/* Latar belakang panel — lebih pekat daripada versi head-locked
            supaya tulisan tetap terbaca di atas pemandangan jalan. */}
        <mesh position={[0, panelCenterY, -0.012]}>
          <planeGeometry args={[PANEL_W, panelH]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.78} depthWrite={false} />
        </mesh>

        {/* Tombol starter: satu baris penuh di atas grid, warna aksen berbeda,
            supaya "cara menyalakan mesin" langsung kelihatan. */}
        <VRButton
          label={engineLabel}
          active={engineRunning}
          onClick={vrActionToggleEngine}
          position={[0, ENGINE_Y, 0]}
          width={PANEL_W - 0.08}
          height={ENGINE_H}
          accentColor="#f59e0b"
        />

        {Array.from({ length: rowCount }).map((_, i) => (
          <group key={i}>
            {cols.map((col, ci) => {
              const btn = col[i];
              if (!btn) return null;
              return (
                <VRButton
                  key={ci}
                  label={btn.label}
                  active={btn.active}
                  onClick={btn.run}
                  position={[colX[ci], FIRST_Y - i * ROW_STEP, 0]}
                  width={BTN_W}
                  height={BTN_H}
                  accentColor={VR_ACTIVE_COLOR}
                  danger={btn.danger}
                  disabled={btn.disabled}
                />
              );
            })}
          </group>
        ))}

        {/* Pintasan tombol fisik — menyesuaikan kemampuan controller */}
        <ShortcutHint y={hintY} />
      </group>
    </CabinAnchor>
  );
}
