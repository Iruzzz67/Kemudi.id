"use client";

import { useEffect } from "react";
import { useSimStore } from "@/store/simStore";
import { CRANK_DURATION_MS } from "@/lib/engine";

// Ignition switch key ([I]): OFF -> ACC -> ON -> START (crank) -> ON+running.
// Mounted only while phase === "driving" (cabin/behind-the-wheel).
export function EngineIgnition() {
  const engineState = useSimStore((s) => s.engineState);
  const advanceIgnition = useSimStore((s) => s.advanceIgnition);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyI" && !e.repeat) advanceIgnition();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advanceIgnition]);

  // Crank is a timed, spring-loaded position: it resolves back to ON
  // (engine caught) on its own after CRANK_DURATION_MS, same as a real key.
  useEffect(() => {
    if (engineState !== "START") return;
    const t = setTimeout(() => useSimStore.getState().finishCranking(), CRANK_DURATION_MS);
    return () => clearTimeout(t);
  }, [engineState]);

  return null;
}
