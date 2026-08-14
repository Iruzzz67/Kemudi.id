"use client";

import { RoundedBox, Text } from "@react-three/drei";
import { useEffect, useState } from "react";
import { vrUiHover } from "./uiHover";
import { VR_FONT } from "./vrFont";

// ─── Tombol 3D interaktif untuk VR ─────────────────────────────────────────
// Dipakai di dalam scene (bukan DOM). Bisa ditekan dengan ray pointer dari
// controller maupun jari (hand tracking). @react-three/xr v6 sudah melempar
// event pointer standar R3F (onClick / onPointerOver / ...) ke objek 3D, jadi
// tombol ini cukup memakai handler R3F biasa — tidak perlu komponen Interactive
// lama yang sudah deprecated.

export const VR_ACTIVE_COLOR = "#16a34a";

const IDLE_COLOR = "#1e293b";
const HOVER_COLOR = "#3b82f6";
const DANGER_IDLE_COLOR = "#7f1d1d";
const DANGER_HOVER_COLOR = "#dc2626";
const DISABLED_COLOR = "#475569";

type VRButtonProps = {
  label: string;
  onClick: () => void;
  /** Ditampilkan hijau saat kondisi aktif (mis. rem tangan terkunci). */
  active?: boolean;
  /** Dikunci: tidak bisa ditekan dan tampil redup. */
  disabled?: boolean;
  /** Warna aksen saat aktif (default hijau). */
  accentColor?: string;
  /** Gaya tombol bahaya (mis. "Keluar VR") — merah dalam keadaan idle/hover. */
  danger?: boolean;
  position?: [number, number, number];
  width?: number;
  height?: number;
};

export function VRButton({
  label,
  onClick,
  active = false,
  disabled = false,
  accentColor = VR_ACTIVE_COLOR,
  danger = false,
  position = [0, 0, 0],
  width = 0.15,
  height = 0.05,
}: VRButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Report hover to the shared input mapper so a trigger press while pointing
  // at a panel button clicks the button instead of flooring the accelerator.
  // Also clean up on unmount in case a ray is still hovering when the panel
  // disappears (e.g. phase flips while pointing at a button).
  useEffect(() => {
    return () => {
      if (hovered) vrUiHover.leave();
    };
  }, [hovered]);

  const bodyColor = disabled
    ? DISABLED_COLOR
    : active
      ? (danger ? DANGER_HOVER_COLOR : accentColor)
      : hovered
        ? (danger ? DANGER_HOVER_COLOR : HOVER_COLOR)
        : (danger ? DANGER_IDLE_COLOR : IDLE_COLOR);

  const z = position[2] - (pressed ? 0.012 : 0);

  return (
    <group
      position={[position[0], position[1], z]}
      scale={pressed ? 0.94 : hovered ? 1.03 : 1}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!hovered) vrUiHover.enter();
        setHovered(true);
      }}
      onPointerOut={() => {
        if (hovered) vrUiHover.leave();
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (!disabled) setPressed(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPressed(false);
      }}
    >
      <RoundedBox args={[width, height, 0.028]} radius={0.011} smoothness={3}>
        <meshStandardMaterial
          color={bodyColor}
          emissive={active ? (danger ? DANGER_HOVER_COLOR : accentColor) : "#000000"}
          emissiveIntensity={active ? 0.35 : hovered ? 0.15 : 0}
          roughness={0.45}
        />
      </RoundedBox>
      <Text
        font={VR_FONT}
        position={[0, 0, 0.018]}
        fontSize={0.016}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        maxWidth={width - 0.02}
      >
        {label}
      </Text>
    </group>
  );
}
