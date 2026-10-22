"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import SimulationBg from "./SimulationBg";
import { useSimStore } from "@/store/simStore";
import { VehicleType } from "@/lib/vehicles";

const SimulationApp = dynamic(
  () => import("./SimulationApp").then((m) => m.SimulationApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center text-[var(--text-muted)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--road-light)] border-t-[var(--accent)]" />
          <p className="text-sm font-semibold uppercase tracking-wider">
            Memuat simulasi...
          </p>
        </div>
      </div>
    ),
  }
);

export function SimulationAppLoader() {
  const started = useRef(false);
  const setVehicle = useSimStore((s) => s.setVehicle);
  const startWalking = useSimStore((s) => s.startWalking);

  useEffect(() => {
    if (started.current) return;
    const params = new URLSearchParams(window.location.search);

    // ?vehicle= diterima case-insensitive (motor/mobil/truk dari link UI
    // memakai huruf kecil) dan langsung diterapkan walau tanpa autoStart,
    // supaya deep-link /simulasi?vehicle=mobil tidak diabaikan.
    const rawVehicle = params.get("vehicle");
    if (rawVehicle) {
      const normalized = rawVehicle.trim().toUpperCase();
      if (normalized === "MOTOR" || normalized === "MOBIL" || normalized === "TRUK") {
        setVehicle(normalized as VehicleType);
      }
    }

    if (params.get("autoStart") !== "1") return;

    started.current = true;
    startWalking();
  }, [setVehicle, startWalking]);

  return (
    <>
      <SimulationBg />
      <SimulationApp />
    </>
  );
}
