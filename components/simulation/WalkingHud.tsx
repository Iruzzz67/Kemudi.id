"use client";

import { useState } from "react";
import { useSimStore } from "@/store/simStore";

const DOOR_OPEN_MS = 550;
const DOOR_CLOSE_MS = 550;

type EntryStage = "idle" | "opening" | "closing";

export function WalkingHud() {
  const nearVehicleDoor = useSimStore((s) => s.nearVehicleDoor);
  const setEntering = useSimStore((s) => s.setEntering);
  const enterVehicle = useSimStore((s) => s.enterVehicle);
  const [stage, setStage] = useState<EntryStage>("idle");

  const handleEnter = () => {
    if (stage !== "idle") return;
    setEntering(true);
    setStage("opening");
    setTimeout(() => {
      setStage("closing");
      setTimeout(() => {
        // Scene/WalkingHud unmount as soon as phase flips to "driving", so
        // there's nothing to reset here — the next mount starts at "idle".
        enterVehicle();
      }, DOOR_CLOSE_MS);
    }, DOOR_OPEN_MS);
  };

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white/80 backdrop-blur">
        Berjalan menuju kendaraan &middot; WASD untuk berjalan &middot; dekati pintu pengemudi
      </div>

      {stage === "idle" && nearVehicleDoor && (
        <div className="pointer-events-auto absolute bottom-24 left-1/2 -translate-x-1/2">
          <button
            onClick={handleEnter}
            className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700"
          >
            Masuk Kendaraan
          </button>
        </div>
      )}

      {stage !== "idle" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-lg font-semibold text-white">
            {stage === "opening" ? "Membuka pintu kendaraan..." : "Menutup pintu..."}
          </div>
        </div>
      )}
    </div>
  );
}
