"use client";

import { useFrame } from "@react-three/fiber";
import { ReactNode, useRef } from "react";
import * as THREE from "three";
import { useSimStore } from "@/store/simStore";
import { VehicleConfig, seatHorizontalOffset } from "@/lib/vehicles";
import { VehicleTransform } from "../transform";

// ─── Jangkar kabin: UI yang DIAM di dalam kendaraan ────────────────────────
// Bedanya dengan CameraFollower: CameraFollower menempel ke KEPALA pemain,
// sehingga panel ikut bergoyang ke mana pun pemain menoleh — susah dibidik
// dengan ray controller dan bikin pusing. CabinAnchor menempel ke KENDARAAN:
// panel tetap di satu titik di dalam kabin (ikut mobil saat mobil jalan, tapi
// tidak ikut kepala), persis seperti tombol asli di dashboard. Pemain bisa
// menoleh ke panel, membidik, lalu menekan tanpa panel itu kabur.
//
// Anak-anak komponen memakai koordinat LOKAL relatif terhadap kepala pengemudi
// (0,0,0 = posisi mata di kursi; -Z = arah depan mobil; +X = kanan).
// Offset kursi dihitung dengan rumus yang sama dengan CameraRig supaya panel
// dan pandangan pemain selalu satu kerangka.

const seatOffset = new THREE.Vector3();

export function CabinAnchor({
  transform,
  config,
  children,
}: {
  transform: VehicleTransform;
  config: VehicleConfig;
  children: ReactNode;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const seatRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const root = rootRef.current;
    const seat = seatRef.current;
    if (!root || !seat) return;

    root.position.copy(transform.position);
    root.quaternion.copy(transform.quaternion);

    // Sama dengan CameraRig: posisi mata pengemudi dalam ruang kendaraan
    // (dipakai bersama via seatHorizontalOffset supaya kamera dan panel VR
    // selalu satu kerangka).
    const seatLocal = seatHorizontalOffset(config);
    // Tinggi kursi dibaca lewat getState() — dibutuhkan tiap frame dan tidak
    // boleh memicu render ulang React.
    const seatHeightOffset = useSimStore.getState().seatHeightOffset;
    seatOffset.set(seatLocal.x, config.dimensions.height * config.seatEyeHeightRatio + seatHeightOffset, seatLocal.z);
    seat.position.copy(seatOffset);
  });

  return (
    <group ref={rootRef}>
      <group ref={seatRef}>{children}</group>
    </group>
  );
}
