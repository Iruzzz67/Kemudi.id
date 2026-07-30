"use client";

import { useEffect } from "react";
import { useSimStore } from "@/store/simStore";

const SEAT_STEP = 0.012;

function isTypingTarget(target: EventTarget | null) {
  const tag = (target as HTMLElement | null)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

// Discrete cabin toggles — same bare keydown-listener shape as
// EngineIgnition.tsx, just covering the rest of the cabin (handbrake,
// seatbelt, mirror check, turn signal, seat height) instead of the ignition
// switch. Mounted only while phase === "driving".
export function CabinControls() {
  const toggleHandbrake = useSimStore((s) => s.toggleHandbrake);
  const toggleSeatbelt = useSimStore((s) => s.toggleSeatbelt);
  const triggerMirrorGlance = useSimStore((s) => s.triggerMirrorGlance);
  const setTurnSignal = useSimStore((s) => s.setTurnSignal);
  const adjustSeatHeight = useSimStore((s) => s.adjustSeatHeight);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      // Seat height rides the browser's own key-repeat instead of a per-frame
      // loop — [ / ] are held-to-adjust, everything else below is a one-shot
      // toggle on the initial press only.
      if (e.code === "BracketLeft") {
        adjustSeatHeight(-SEAT_STEP);
        return;
      }
      if (e.code === "BracketRight") {
        adjustSeatHeight(SEAT_STEP);
        return;
      }

      if (e.repeat) return;
      if (e.code === "Space") {
        e.preventDefault(); // Space otherwise scrolls the page
        toggleHandbrake();
      } else if (e.code === "KeyB") {
        toggleSeatbelt();
      } else if (e.code === "KeyM") {
        triggerMirrorGlance();
      } else if (e.code === "KeyZ") {
        setTurnSignal("left");
      } else if (e.code === "KeyX") {
        setTurnSignal("right");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleHandbrake, toggleSeatbelt, triggerMirrorGlance, setTurnSignal, adjustSeatHeight]);

  return null;
}
