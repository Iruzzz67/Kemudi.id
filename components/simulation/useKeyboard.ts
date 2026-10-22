"use client";

// Backward-compatible alias for Character.tsx (walking locomotion). All
// keyboard handling now lives in KeyboardInput.ts / InputManager.tsx; this
// file only keeps the old import path working.
export { useKeyboardInput as useKeyboard } from "./KeyboardInput";
export type { KeyboardInputState as KeyboardState } from "./KeyboardInput";
