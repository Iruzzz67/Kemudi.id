"use client";

import { createXRStore } from "@react-three/xr";

// Single app-wide XR store. v6 drives everything (controllers, hands, session
// entry) from this object instead of the v5 <Controllers/> / <Hands/> / <VRButton/>
// components, so it has to be a module singleton shared by the Canvas and the
// DOM-side enter-VR button.
//
// ── Why these options? (Perbaikan agar VR benar-benar jalan di headset) ──
//
// 1) emulate: false
//    @pmndrs/xr ships an IWER WebXR *emulator* that is enabled by default
//    (device "metaQuest3"). On localhost it tries to inject a fake WebXR
//    runtime into navigator.xr, and its UI deps (@iwer/devui & @iwer/sem)
//    pin their OWN copy of three@0.165.0. That second three instance is what
//    triggers the "WARNING: Multiple instances of Three.js being imported"
//    in the console and can corrupt the real headset session. The emulator
//    is only useful for desktop testing without a headset, so it's off.
//
// 2) offerSession: false
//    Prevents the browser from showing an automatic "Enter VR?" system
//    prompt on page load. Entry is driven exclusively by our own
//    "Masuk VR" button (VRToggleButton), which is a deliberate user gesture
//    — required by the WebXR spec for requestSession() anyway.
//
// 3) frameRate / frameBufferScaling / foveation
//    Standalone headsets (Quest 2/3) have mobile-class GPUs but must render
//    TWO views per frame. Rendering at full native resolution + high Hz
//    will drop frames, and dropped frames are exactly what makes VR feel
//    "broken" (judder + motion sickness). Strategi performa:
//      - frameBufferScaling dikecilkan dari 'mid' (= 1.0, resolusi native
//        penuh) ke ~72% native — beban pixel ±setengahnya dengan kualitas
//        yang masih tajam. Dipilih lewat fungsi (bukan string) supaya tetap
//        menghormati batas native perangkat (maxFrameBufferScaling).
//      - frameRate diatur adaptif oleh XROptimizer: mulai dari yang paling
//        tinggi (≤ 90 Hz), lalu turun 1 tingkat (90 → 72 → 60) bila frame
//        drop berkelanjutan terdeteksi, dan naik lagi bila longgar.
//      - foveation 1 = foveated rendering maksimal (Quest only) — area
//        pinggir mata dirender resolusi rendah, penghematan fill-rate besar.
//
// Catatan: setFramebufferScaleFactor tidak bisa diubah di tengah sesi VR
// (three.js mengunci saat presenting), jadi baseline scaling dipasang di
// pembuatan sesi dan governor frame rate (runtime) yang menyesuaikan Hz.
export const xrStore = createXRStore({
  hand: true,
  controller: true,
  emulate: false,
  offerSession: false,
  // Nilai awal frame rate saat sesi dibuat — dikunci ≤ 90 Hz DI SINI supaya
  // tidak ada flash 120 Hz sebelum XROptimizer sempat menyesuaikan (governor
  // di XROptimizer yang kemudian menurunkan/menaikkan secara adaptif).
  frameRate: (rates) => {
    const list = Array.from(rates).filter((r) => r <= 90);
    // `false` = biarkan perangkat memakai default-nya (bukan -Infinity).
    return list.length > 0 ? Math.max(...list) : false;
  },
  // ~72% resolusi native per mata (naikkan ke 0.8 bila headset kuat,
  // turunkan ke 0.6 bila masih berat). 'low' bawaan = 0.5 terlalu kabur.
  frameBufferScaling: (max) => Math.min(0.72, Math.max(0.6, max)),
  foveation: 1,
});
