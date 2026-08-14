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

  useFrame(() => {
    const store = useSimStore.getState();
    const k = keys.current;
    const ovr = store.vehicleInputOverride;
    const active = ovr !== null;
    const phase = store.phase;

    // ── Merged analog snapshot → VehicleController ──
    // VR takes over whenever an override is present (exactly the old
    // "controller selalu mengambil alih" rule); otherwise keyboard rules.
    const merged: VehicleInput = {
      steer: active && ovr?.steer !== undefined ? -ovr.steer : (k.left ? 1 : 0) - (k.right ? 1 : 0),
      throttle: active ? (ovr?.throttle ?? 0) : k.forward ? 1 : 0,
      brake: active ? (ovr?.brake ?? 0) : k.brake ? 1 : 0,
      clutch: active ? (ovr?.clutch ?? false) : k.clutch,
      horn: active ? (ovr?.horn ?? false) : k.horn,
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
      if (consumeEdge("shiftUp") || ovr?.gearUp) vehicleGearEdges.add("gearUp");
      if (consumeEdge("shiftDown") || ovr?.gearDown) vehicleGearEdges.add("gearDown");
      if (consumeEdge("reverse") || ovr?.reverse) vehicleGearEdges.add("reverse");
      if (consumeEdge("neutral") || ovr?.neutral) vehicleGearEdges.add("neutral");
    } else {
      consumeEdge("shiftUp");
      consumeEdge("shiftDown");
      consumeEdge("reverse");
      consumeEdge("neutral");
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

      if (consumeEdge("handBrake") || ovr?.handBrake) store.toggleHandbrake();

      // A single direction press while hazards are flashing cancels them and
      // switches to that direction instead (like a real stalk).
      if (consumeEdge("signalLeft") || ovr?.leftSignal) {
        if (store.hazardOn) store.toggleHazard();
        store.setTurnSignal("left");
      }
      if (consumeEdge("signalRight") || ovr?.rightSignal) {
        if (store.hazardOn) store.toggleHazard();
        store.setTurnSignal("right");
      }
      if (consumeEdge("hazard") || ovr?.hazard) store.toggleHazard();
      if (consumeEdge("headlights") || ovr?.headlights) store.toggleHeadlights();
      if (consumeEdge("highBeam") || ovr?.highBeam) store.toggleHighBeam();
      if (consumeEdge("mirror") || ovr?.mirror) store.triggerMirrorGlance();
      if (consumeEdge("pause") || ovr?.pause) store.togglePause();
      if (consumeEdge("engine") || ovr?.engine) store.advanceIgnition();

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

      // Fitur kendaraan (md): wiper & AC untuk mobil, air brake untuk truk.
      if (consumeEdge("wiper")) {
        if (store.vehicle !== "MOTOR") store.toggleWiper();
      }
      if (consumeEdge("ac")) {
        if (store.vehicle === "MOBIL") store.toggleAc();
      }
      if (consumeEdge("airBrake")) {
        if (store.vehicle === "TRUK") store.toggleAirBrake();
      }
      if (consumeEdge("voiceNav")) store.toggleVoiceNav();
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
      consumeEdge("wiper");
      consumeEdge("ac");
      consumeEdge("airBrake");
      consumeEdge("voiceNav");
    }

    // Camera works in both walking and driving (previously useCameraToggle).
    if (consumeEdge("camera") || ovr?.camera) store.cycleCameraMode();
  });

  return null;
}
