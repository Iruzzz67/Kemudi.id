"use client";

import { useEffect, useState } from "react";
import { useSimStore, CameraMode } from "@/store/simStore";
import { VEHICLES } from "@/lib/vehicles";
import { gearLabel } from "@/lib/transmission";
import { vehicleAudio } from "./audio/vehicleAudio";
import { HandlingSettingsPanel } from "./HandlingSettingsPanel";
import { PreDriveChecklist } from "./PreDriveChecklist";

const CAMERA_LABEL: Record<CameraMode, string> = {
  tpv: "Kamera Belakang",
  fpv: "Kamera Interior",
  topdown: "Kamera Atas",
};

const ENGINE_LABEL: Record<string, string> = {
  OFF: "OFF",
  ACC: "ACC",
  ON: "ON",
  START: "START...",
};

const ACTIVE_WARNING_MS = 2600;

function Tachometer({ rpmRatio }: { rpmRatio: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, rpmRatio)) * 100);
  const inRedline = rpmRatio > 0.9;

  return (
    <div className="mt-2 w-28">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            inRedline ? "bg-red-500" : "bg-emerald-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Hud() {
  const speedKmh = useSimStore((s) => s.speedKmh);
  const violations = useSimStore((s) => s.violations);
  const offRoadCount = useSimStore((s) => s.offRoadCount);
  const isOffRoad = useSimStore((s) => s.isOffRoad);
  const elapsedMs = useSimStore((s) => s.elapsedMs);
  const vehicle = useSimStore((s) => s.vehicle);
  const cameraMode = useSimStore((s) => s.cameraMode);
  const transmissionMode = useSimStore((s) => s.transmissionMode);
  const gear = useSimStore((s) => s.gear);
  const rpmRatio = useSimStore((s) => s.rpmRatio);
  const gearBlocked = useSimStore((s) => s.gearBlocked);
  const engineState = useSimStore((s) => s.engineState);
  const engineRunning = useSimStore((s) => s.engineRunning);
  const handbrakeOn = useSimStore((s) => s.handbrakeOn);
  const seatbeltOn = useSimStore((s) => s.seatbeltOn);
  const turnSignal = useSimStore((s) => s.turnSignal);
  const activeWarning = useSimStore((s) => s.activeWarning);
  const [muted, setMuted] = useState(vehicleAudio.isMuted());
  const [showHandling, setShowHandling] = useState(false);

  useEffect(() => {
    if (!gearBlocked) return;
    const t = setTimeout(() => useSimStore.setState({ gearBlocked: false }), 900);
    return () => clearTimeout(t);
  }, [gearBlocked]);

  useEffect(() => {
    if (!activeWarning) return;
    const t = setTimeout(() => useSimStore.setState({ activeWarning: null }), ACTIVE_WARNING_MS);
    return () => clearTimeout(t);
  }, [activeWarning]);

  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <div className="absolute top-4 left-4 flex flex-col gap-3">
        <div className="rounded-lg bg-black/60 px-4 py-3 text-white backdrop-blur">
          <div className="text-xs uppercase tracking-wide text-white/60">
            {VEHICLES[vehicle].label}
          </div>
          <div className="text-3xl font-bold tabular-nums">
            {speedKmh.toFixed(0)} <span className="text-base font-normal">km/j</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-white/15 px-2 py-0.5 text-sm font-bold tabular-nums">
              {gearLabel(transmissionMode, gear)}
            </span>
            <Tachometer rpmRatio={rpmRatio} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/50">Mesin:</span>
            <span
              className={`rounded px-1.5 py-0.5 font-semibold ${
                engineRunning ? "bg-emerald-500/80 text-white" : "bg-white/15 text-white/80"
              }`}
            >
              {ENGINE_LABEL[engineState]}
            </span>
            {handbrakeOn && (
              <span className="rounded bg-amber-500/80 px-1.5 py-0.5 font-semibold text-white">
                Rem Tangan
              </span>
            )}
            <span
              className={`rounded px-1.5 py-0.5 font-semibold ${
                seatbeltOn ? "bg-emerald-500/80 text-white" : "bg-red-500/70 text-white"
              }`}
            >
              Sabuk {seatbeltOn ? "ON" : "OFF"}
            </span>
            {turnSignal !== "off" && (
              <span className="animate-pulse rounded bg-amber-400/90 px-1.5 py-0.5 font-semibold text-black">
                {turnSignal === "left" ? "◀ Sein Kiri" : "Sein Kanan ▶"}
              </span>
            )}
          </div>
        </div>

        <PreDriveChecklist />
      </div>

      <div className="absolute top-4 right-4 rounded-lg bg-black/60 px-4 py-3 text-white backdrop-blur text-right">
        <div className="text-xs uppercase tracking-wide text-white/60">Waktu</div>
        <div className="text-xl font-semibold tabular-nums">{seconds}s</div>
        <div className="mt-1 text-xs text-white/70">Pelanggaran: {violations}</div>
        <div className="text-xs text-white/70">Keluar jalur: {offRoadCount}</div>
      </div>

      {!engineRunning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded bg-amber-500/90 px-4 py-1.5 text-sm font-semibold text-white">
          {engineState === "START"
            ? "Menstarter mesin..."
            : "Tekan [I] untuk menyalakan mesin sebelum berjalan"}
        </div>
      )}

      {isOffRoad && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded bg-red-600/90 px-4 py-1.5 text-sm font-semibold text-white">
          Keluar jalur!
        </div>
      )}

      {gearBlocked && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 rounded bg-amber-500/90 px-4 py-1.5 text-sm font-semibold text-white">
          Tidak bisa oper gigi!
        </div>
      )}

      {activeWarning && (
        <div className="absolute top-52 left-1/2 -translate-x-1/2 rounded bg-red-600/90 px-4 py-1.5 text-sm font-semibold text-white">
          {activeWarning}
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={() => setShowHandling(true)}
          className="rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur hover:bg-black/80"
        >
          Handling
        </button>
        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            vehicleAudio.setMuted(next);
          }}
          className="rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur hover:bg-black/80"
        >
          {muted ? "Suara: Mati" : "Suara: Nyala"}
        </button>
      </div>

      {showHandling && (
        // pointer-events-none on the Hud root is inherited by default, and
        // the panel's own "fixed" positioning doesn't reset that — without
        // this wrapper the modal would render but silently ignore clicks.
        <div className="pointer-events-auto">
          <HandlingSettingsPanel onClose={() => setShowHandling(false)} />
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="max-w-2xl rounded-lg bg-black/60 px-4 py-2 text-center text-xs text-white/80 backdrop-blur">
          [I] kontak &middot; W gas &middot; S rem &middot; A/D belok &middot; [Space] rem tangan
          &middot; R mundur
          {transmissionMode === "manual" && " · Shift kopling · Q/E gigi"} &middot; B sabuk
          &middot; M spion &middot; [ ] kursi &middot; Z/X sein &middot; [C] kamera (
          {CAMERA_LABEL[cameraMode]})
        </div>
      </div>

      {cameraMode === "fpv" && (
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background: "linear-gradient(to top, rgba(10,10,12,0.85), rgba(10,10,12,0))",
          }}
        />
      )}
    </div>
  );
}
