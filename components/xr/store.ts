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
//    TWO views per frame. Rendering at full resolution + 120Hz will drop
//    frames, and dropped frames are exactly what makes VR feel "broken"
//    (judder + motion sickness). We cap the session at a stable mid refresh
//    rate, render the framebuffer slightly under native resolution, and
//    enable foveated rendering (Quest only) — a large fill-rate win.
export const xrStore = createXRStore({
  hand: true,
  controller: true,
  emulate: false,
  offerSession: false,
  frameRate: "mid",
  frameBufferScaling: "mid",
  foveation: 1,
});
