"use client";

import dynamic from "next/dynamic";

const SimulationApp = dynamic(
  () => import("./SimulationApp").then((m) => m.SimulationApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center text-neutral-400">
        Memuat simulasi...
      </div>
    ),
  }
);

export function SimulationAppLoader() {
  return <SimulationApp />;
}
