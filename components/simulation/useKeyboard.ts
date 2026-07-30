"use client";

import { useCallback, useEffect, useRef } from "react";

export type KeyboardState = {
  forward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  clutch: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
  reverse: boolean;
};

type EdgeKey = "shiftUp" | "shiftDown" | "reverse";

const FORWARD_KEYS = new Set(["KeyW", "ArrowUp"]);
const LEFT_KEYS = new Set(["KeyA", "ArrowLeft"]);
const RIGHT_KEYS = new Set(["KeyD", "ArrowRight"]);
// S is the brake pedal (spec: W=gas, S=rem) — there is no dedicated "backward"
// input anymore; reversing is a gear/mode selection via R, not a held direction.
const BRAKE_KEYS = new Set(["KeyS", "ArrowDown"]);
const CLUTCH_KEYS = new Set(["ShiftLeft", "ShiftRight"]);
const SHIFT_UP_KEYS = new Set(["KeyE", "Period"]);
const SHIFT_DOWN_KEYS = new Set(["KeyQ", "Comma"]);
const REVERSE_KEYS = new Set(["KeyR"]);

export function useKeyboard() {
  const keys = useRef<KeyboardState>({
    forward: false,
    left: false,
    right: false,
    brake: false,
    clutch: false,
    shiftUp: false,
    shiftDown: false,
    reverse: false,
  });

  useEffect(() => {
    const setKey = (code: string, value: boolean) => {
      if (FORWARD_KEYS.has(code)) keys.current.forward = value;
      if (LEFT_KEYS.has(code)) keys.current.left = value;
      if (RIGHT_KEYS.has(code)) keys.current.right = value;
      if (BRAKE_KEYS.has(code)) keys.current.brake = value;
      if (CLUTCH_KEYS.has(code)) keys.current.clutch = value;
    };

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
      setKey(e.code, true);
      if (!e.repeat) {
        if (SHIFT_UP_KEYS.has(e.code)) keys.current.shiftUp = true;
        if (SHIFT_DOWN_KEYS.has(e.code)) keys.current.shiftDown = true;
        if (REVERSE_KEYS.has(e.code)) keys.current.reverse = true;
      }
    };
    // Never guarded by isTypingTarget: a key held down before focus moved
    // into a slider must still be releasable, or the drive input gets stuck.
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Reads + clears a one-shot edge flag in one step, so callers never mutate
  // the returned ref directly (keeps the React Compiler lint happy).
  const consumeEdge = useCallback((key: EdgeKey) => {
    if (keys.current[key]) {
      keys.current[key] = false;
      return true;
    }
    return false;
  }, []);

  return { keys, consumeEdge };
}
