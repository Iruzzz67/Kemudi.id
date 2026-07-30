"use client";

import { useEffect } from "react";
import { useSimStore } from "@/store/simStore";

export function useCameraToggle() {
  const cycleCameraMode = useSimStore((s) => s.cycleCameraMode);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyC" && !e.repeat) {
        cycleCameraMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cycleCameraMode]);
}
