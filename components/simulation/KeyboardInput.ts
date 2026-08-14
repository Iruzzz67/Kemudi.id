"use client";

import { useCallback, useEffect, useRef } from "react";

// Single keyboard state provider for the whole simulation — the InputManager
// consumes this every frame, so every keyboard control in the game funnels
// through the same path as VR controller input. Replaces the previous split
// (useKeyboard + CabinControls + useCameraToggle + EngineIgnition listeners).
//
// Two kinds of state:
//  - held: boolean while a key is physically down (analog driving, horn,
//    seat-height brackets which ride key-repeat).
//  - edge: one-shot flags set on the keydown transition and cleared by
//    consumeEdge() — everything that must fire exactly once per press
//    (toggles, gear shifts, camera, pause, ...).

export type KeyboardInputState = {
  // held
  forward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  clutch: boolean;
  horn: boolean;
  seatDown: boolean;
  seatUp: boolean;
  // edges
  shiftUp: boolean;
  shiftDown: boolean;
  reverse: boolean;
  neutral: boolean;
  handBrake: boolean;
  signalLeft: boolean;
  signalRight: boolean;
  hazard: boolean;
  headlights: boolean;
  highBeam: boolean;
  mirror: boolean;
  camera: boolean;
  pause: boolean;
  engine: boolean;
  helmet: boolean;
  jacket: boolean;
  gloves: boolean;
  boots: boolean;
  seatbelt: boolean;
  wiper: boolean;
  ac: boolean;
  airBrake: boolean;
  voiceNav: boolean;
};

export type KeyboardEdgeKey = Exclude<
  keyof KeyboardInputState,
  "forward" | "left" | "right" | "brake" | "clutch" | "horn" | "seatDown" | "seatUp"
>;

const HELD_KEYS: Record<string, "forward" | "left" | "right" | "brake" | "clutch" | "horn" | "seatDown" | "seatUp"> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyS: "brake",
  ArrowDown: "brake",
  ShiftLeft: "clutch",
  ShiftRight: "clutch",
  // T = klakson (H is the motor's helmet key). Held to honk.
  KeyT: "horn",
  BracketLeft: "seatDown",
  BracketRight: "seatUp",
};

const EDGE_KEYS: Record<string, KeyboardEdgeKey> = {
  KeyE: "shiftUp",
  Period: "shiftUp",
  PageUp: "shiftUp",
  KeyQ: "shiftDown",
  Comma: "shiftDown",
  PageDown: "shiftDown",
  KeyR: "reverse",
  KeyN: "neutral",
  Space: "handBrake",
  KeyZ: "signalLeft",
  KeyX: "signalRight",
  KeyV: "hazard",
  KeyL: "headlights",
  KeyK: "highBeam",
  KeyM: "mirror",
  KeyC: "camera",
  KeyP: "pause",
  KeyI: "engine",
  KeyH: "helmet",
  KeyJ: "jacket",
  KeyG: "gloves",
  KeyF: "boots",
  KeyB: "seatbelt",
  // Y = wiper, U = AC, O = air brake (truk), Semicolon = voice navigation
  KeyY: "wiper",
  KeyU: "ac",
  KeyO: "airBrake",
  Semicolon: "voiceNav",
};

function emptyState(): KeyboardInputState {
  return {
    forward: false,
    left: false,
    right: false,
    brake: false,
    clutch: false,
    horn: false,
    seatDown: false,
    seatUp: false,
    shiftUp: false,
    shiftDown: false,
    reverse: false,
    neutral: false,
    handBrake: false,
    signalLeft: false,
    signalRight: false,
    hazard: false,
    headlights: false,
    highBeam: false,
    mirror: false,
    camera: false,
    pause: false,
    engine: false,
    helmet: false,
    jacket: false,
    gloves: false,
    boots: false,
    seatbelt: false,
    wiper: false,
    ac: false,
    airBrake: false,
    voiceNav: false,
  };
}

export function useKeyboardInput() {
  const keys = useRef<KeyboardInputState>(emptyState());

  useEffect(() => {
    // Ignore drive input while the Handling panel (openable mid-drive) has a
    // slider or other form control focused — otherwise arrow-key nudges on a
    // slider double as steering, and the car and the slider fight over the
    // same keys.
    const isTypingTarget = (target: EventTarget | null) => {
      const tag = (target as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const held = HELD_KEYS[e.code];
      if (held) {
        keys.current[held] = true;
      }
      if (e.code === "Space") {
        e.preventDefault(); // Space otherwise scrolls the page
      }
      if (!e.repeat) {
        const edge = EDGE_KEYS[e.code];
        if (edge) keys.current[edge] = true;
      }
    };
    // Never guarded by isTypingTarget: a key held down before focus moved
    // into a slider must still be releasable, or the drive input gets stuck.
    const onKeyUp = (e: KeyboardEvent) => {
      const held = HELD_KEYS[e.code];
      if (held) keys.current[held] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Reads + clears a one-shot edge flag in one step, so callers never mutate
  // the returned ref directly (keeps the React Compiler lint happy).
  const consumeEdge = useCallback((key: KeyboardEdgeKey) => {
    if (keys.current[key]) {
      keys.current[key] = false;
      return true;
    }
    return false;
  }, []);

  return { keys, consumeEdge };
}
