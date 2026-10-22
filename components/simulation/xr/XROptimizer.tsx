"use client";

import { useThree } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useEffect } from "react";

// ─── Penyesuai kualitas render saat VR aktif ────────────────────────────────
// Headset standalone (Meta Quest) memakai GPU kelas mobile dan harus merender
// DUA layar (satu per mata) tiap frame — beban fill-rate 2x lipat mode
// desktop. Komponen ini menurunkan pixel ratio renderer ke 1:1 selama sesi
// immersive aktif (resolusi efektif sudah diatur oleh frameBufferScaling di
// store), dan mengembalikan kualitas desktop saat keluar VR. Dipasang DI
// DALAM <XR> supaya bisa membaca status session.
export function XROptimizer() {
  const gl = useThree((s) => s.gl);
  const session = useXR((s) => s.session);
  const isPresenting = session != null;

  // Refresh rate ditentukan dari kemampuan yang DILAPORKAN perangkat
  // (`supportedFrameRates`), bukan dari nama headset. Standalone kelas mobile
  // biasanya menawarkan 72/90, PC-VR menawarkan 90/120; kita ambil yang
  // tertinggi sampai batas 90 supaya frame stabil (frame drop = mual) tanpa
  // pernah menulis `if headset == ...`.
  useEffect(() => {
    if (!session) return;
    const rates = session.supportedFrameRates;
    if (!rates || rates.length === 0 || !session.updateTargetFrameRate) return;
    const target = [...rates].filter((r) => r <= 90).sort((a, b) => b - a)[0];
    if (target) session.updateTargetFrameRate(target).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (isPresenting) {
      // 1:1 sudah cukup — di headset justru pixel ratio tinggi yang bikin
      // frame drop dan mual. frameBufferScaling di store yang menentukan
      // resolusi render sebenarnya.
      gl.setPixelRatio(1);
    } else {
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
  }, [gl, isPresenting]);

  return null;
}
