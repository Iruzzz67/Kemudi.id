"use client";

import { useEffect } from "react";
import { useSimStore } from "@/store/simStore";
import { CRANK_DURATION_MS } from "@/lib/engine";

// The ignition switch itself ([I] on desktop, VR control-panel button) is
// dispatched by InputManager / vrActions — this component only owns the
// timed cranking behavior: START is a spring-loaded position that resolves
// back to ON (engine caught) on its own after CRANK_DURATION_MS.
// Mounted only while phase === "driving" (cabin/behind-the-wheel).
export function EngineIgnition() {
  const engineState = useSimStore((s) => s.engineState);

  useEffect(() => {
    if (engineState !== "START") return;
    const t = setTimeout(() => useSimStore.getState().finishCranking(), CRANK_DURATION_MS);
    return () => clearTimeout(t);
  }, [engineState]);

  return null;
}
