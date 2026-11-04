"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useSimStore, VehicleInput } from "@/store/simStore";
import { useKeyboardInput } from "./KeyboardInput";
import { vehicleGearEdges } from "./inputEdges";

const SEAT_STEP = 0.012;
const SEAT_REPEAT_MS = 40; // between seat-height nudges while a bracket is held

// Single funnel between every input device and the simulation. Mounted once
// inside the Canvas (Scene.tsx) for the whole walking + driving experience:
//
//   Keyboard ──► KeyboardInput (key state ref)
//                              │  merge per frame
//   VR controllers / gamepad ──┘  (store.vehicleInputOverride, written by
//                                 XRControlsMap)
//                              ▼
//                    store.vehicleInput   ← VehicleController reads ONLY this
//                              │
//                              ▼
//              discrete actions → store (sein, hazard, lampu, rem tangan,
//                                 kamera, pause, mesin, gigi, ...)
//
// VehicleController never sees where an input came from — keyboard, VR
// controller, or a desktop gamepad all land in the same snapshot.
export function InputManager() {
  const { keys, consumeEdge } = useKeyboardInput();
  const setMergedInput = useSimStore((s) => s.setMergedInput);
  const lastSeatAdjust = useRef(0);
  // Rising-edge latch untuk boolean override VR/gamepad: ovr.* ditulis
  // per-frame oleh XRControlsMap sehingga boolean "true" yang level (tombol
  // masih ditahan) tidak boleh memicu aksi berulang — hanya transisi
  // false→true yang dihitung, sama seperti consumeEdge keyboard.
  const prevOvr = useRef<Partial<Record<keyof VehicleInput, boolean>>>({});

  useFrame(() => {
    const store = useSimStore.getState();
    const k = keys.current;
    const ovr = store.vehicleInputOverride;
    const phase = store.phase;

    // Edge satu-frame untuk satu kunci override; dipanggil tepat sekali per
    // kunci per frame agar latch prev selalu segar.
    const ovrEdge = (key: keyof VehicleInput): boolean => {
      const cur = ovr?.[key] === true;
      const was = prevOvr.current[key] ?? false;
      prevOvr.current[key] = cur;
      return cur && !was;
    };

    // ── Merged analog snapshot → VehicleController ──
    // Merge (bukan replace total): field override yang undefined jatuh kembali
    // ke keyboard, sehingga keyboard tetap berfungsi untuk tombol yang tidak
    // di-override saat controller VR/gamepad aktif.
    const merged: VehicleInput = {
      steer: ovr?.steer !== undefined ? -ovr.steer : (k.left ? 1 : 0) - (k.right ? 1 : 0),
      throttle: ovr?.throttle ?? (k.forward ? 1 : 0),
      brake: ovr?.brake ?? (k.brake ? 1 : 0),
      clutch: ovr?.clutch ?? k.clutch,
      horn: ovr?.horn ?? k.horn,
      // Edge fields are handled below (discrete actions); the snapshot only
      // carries them so the type is uniform.
      handBrake: false,
      leftSignal: false,
      rightSignal: false,
      hazard: false,
      headlights: false,
      highBeam: false,
      mirror: false,
      gearUp: false,
      gearDown: false,
      reverse: false,
      neutral: false,
      camera: false,
      pause: false,
      engine: false,
    };
    setMergedInput(merged);

    // ── Gear shifts → shared set consumed by VehicleController ──
    // These can't be dispatched here: clutch-gating / over-rev / stall logic
    // lives in the physics loop, so edges are handed over for it to consume.
    // Collected ONLY while driving — a stray Q/E/R/N/PageUp press during the
    // walking phase must not queue a shift for the first driving frame
    // (VehicleController is not mounted then, so it can't clear stale edges).
    if (phase === "driving") {
      if (consumeEdge("shiftUp") || ovrEdge("gearUp")) vehicleGearEdges.add("gearUp");
      if (consumeEdge("shiftDown") || ovrEdge("gearDown")) vehicleGearEdges.add("gearDown");
      if (consumeEdge("reverse") || ovrEdge("reverse")) vehicleGearEdges.add("reverse");
      if (consumeEdge("neutral") || ovrEdge("neutral")) vehicleGearEdges.add("neutral");
    } else {
      consumeEdge("shiftUp");
      consumeEdge("shiftDown");
      consumeEdge("reverse");
      consumeEdge("neutral");
      // Majukan latch VR agar tekanan basi di luar driving tidak antre.
      ovrEdge("gearUp");
      ovrEdge("gearDown");
      ovrEdge("reverse");
      ovrEdge("neutral");
    }

    // ── Discrete cabin actions (only meaningful behind the wheel) ──
    if (phase === "driving") {
      // Seat height rides held brackets with a fixed repeat interval (the
      // browser's own key-repeat drove the old [ / ] handler).
      const now = performance.now();
      if (store.vehicle !== "MOTOR" && now - lastSeatAdjust.current >= SEAT_REPEAT_MS) {
        if (k.seatDown) {
          lastSeatAdjust.current = now;
          store.adjustSeatHeight(-SEAT_STEP);
        } else if (k.seatUp) {
          lastSeatAdjust.current = now;
          store.adjustSeatHeight(SEAT_STEP);
        }
      }

      if (consumeEdge("handBrake") || ovrEdge("handBrake")) store.toggleHandbrake();

      // A single direction press while hazards are flashing cancels them and
      // switches to that direction instead (like a real stalk).
      if (consumeEdge("signalLeft") || ovrEdge("leftSignal")) {
        if (store.hazardOn) store.toggleHazard();
        store.setTurnSignal("left");
      }
      if (consumeEdge("signalRight") || ovrEdge("rightSignal")) {
        if (store.hazardOn) store.toggleHazard();
        store.setTurnSignal("right");
      }
      if (consumeEdge("hazard") || ovrEdge("hazard")) store.toggleHazard();
      if (consumeEdge("headlights") || ovrEdge("headlights")) store.toggleHeadlights();
      if (consumeEdge("highBeam") || ovrEdge("highBeam")) store.toggleHighBeam();
      if (consumeEdge("mirror") || ovrEdge("mirror")) store.triggerMirrorGlance();
      if (consumeEdge("pause") || ovrEdge("pause")) store.togglePause();
      if (consumeEdge("engine") || ovrEdge("engine")) store.advanceIgnition();

      // Safety gear keys are vehicle-specific; the edge is always consumed so
      // it can't queue up, but the action only fires for the matching vehicle.
      if (consumeEdge("helmet")) {
        if (store.vehicle === "MOTOR") store.toggleHelmet();
      }
      if (consumeEdge("jacket")) {
        if (store.vehicle === "MOTOR") store.toggleJacket();
      }
      if (consumeEdge("gloves")) {
        if (store.vehicle === "MOTOR") store.toggleGloves();
      }
      if (consumeEdge("boots")) {
        if (store.vehicle === "MOTOR") store.toggleBoots();
      }
      if (consumeEdge("seatbelt")) {
        if (store.vehicle !== "MOTOR") store.toggleSeatbelt();
      }
    } else {
      // Discard edges pressed outside driving so nothing queues up.
      consumeEdge("handBrake");
      consumeEdge("signalLeft");
      consumeEdge("signalRight");
      consumeEdge("hazard");
      consumeEdge("headlights");
      consumeEdge("highBeam");
      consumeEdge("mirror");
      consumeEdge("pause");
      consumeEdge("engine");
      consumeEdge("helmet");
      consumeEdge("jacket");
      consumeEdge("gloves");
      consumeEdge("boots");
      consumeEdge("seatbelt");
      // Majukan latch VR agar tidak ada edge basi yang antre ke fase driving.
      ovrEdge("handBrake");
      ovrEdge("leftSignal");
      ovrEdge("rightSignal");
      ovrEdge("hazard");
      ovrEdge("headlights");
      ovrEdge("highBeam");
      ovrEdge("mirror");
      ovrEdge("pause");
      ovrEdge("engine");
    }

    // Camera works in both walking and driving (previously useCameraToggle).
    if (consumeEdge("camera") || ovrEdge("camera")) store.cycleCameraMode();
  });

  return null;
}
