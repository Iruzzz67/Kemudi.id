"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Scene } from "./Scene";
import { Hud } from "./Hud";
import { WalkingHud } from "./WalkingHud";
import { HandlingSettingsPanel } from "./HandlingSettingsPanel";
import { useSimStore } from "@/store/simStore";
import { VEHICLE_ORDER, VEHICLES, VehicleType } from "@/lib/vehicles";
import { vehicleAudio } from "./audio/vehicleAudio";

function VehicleSelectScreen() {
  const vehicle = useSimStore((s) => s.vehicle);
  const setVehicle = useSimStore((s) => s.setVehicle);
  const startWalking = useSimStore((s) => s.startWalking);
  const transmissionMode = useSimStore((s) => s.transmissionMode);
  const setTransmissionMode = useSimStore((s) => s.setTransmissionMode);
  const [muted, setMuted] = useState(false);
  const [showHandling, setShowHandling] = useState(false);

  const handleStart = () => {
    // Unlock the AudioContext now (must happen from a user gesture); the
    // engine itself stays silent until the player actually turns the key.
    vehicleAudio.start();
    vehicleAudio.setMuted(muted);
    startWalking();
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold">Pilih Kendaraan</h1>
        <p className="mt-2 text-neutral-500">
          Setiap kendaraan punya karakteristik berbeda: kecepatan, akselerasi, dan radius putar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VEHICLE_ORDER.map((type: VehicleType) => {
          const cfg = VEHICLES[type];
          const selected = vehicle === type;
          return (
            <button
              key={type}
              onClick={() => setVehicle(type)}
              className={`w-56 rounded-xl border-2 p-5 text-left transition ${
                selected
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/40"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
              }`}
            >
              <div
                className="mb-3 h-3 w-12 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <div className="text-lg font-semibold">{cfg.label}</div>
              <div className="mt-1 text-sm text-neutral-500">{cfg.description}</div>
              <div className="mt-3 text-xs text-neutral-400">
                Top speed: {Math.round(cfg.maxSpeed * 3.6)} km/j
              </div>
            </button>
          );
        })}
      </div>

      <div>
        <div className="text-sm font-medium text-neutral-500">Jenis Transmisi</div>
        <div className="mt-2 inline-flex rounded-full border border-neutral-200 p-1 dark:border-neutral-800">
          <button
            onClick={() => setTransmissionMode("automatic")}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
              transmissionMode === "automatic"
                ? "bg-blue-600 text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Automatic
          </button>
          <button
            onClick={() => setTransmissionMode("manual")}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
              transmissionMode === "manual"
                ? "bg-blue-600 text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Manual
          </button>
        </div>
        {transmissionMode === "manual" && (
          <p className="mt-2 max-w-sm text-xs text-neutral-400">
            Tahan <kbd className="rounded border px-1 py-0.5 font-mono">Shift</kbd> (kopling)
            sebelum oper gigi dengan <kbd className="rounded border px-1 py-0.5 font-mono">Q</kbd>/
            <kbd className="rounded border px-1 py-0.5 font-mono">E</kbd>. Oper gigi tanpa kopling
            akan merusak girboks dan bisa membuat mesin mati.
          </p>
        )}
      </div>

      <button
        onClick={() => setShowHandling(true)}
        className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Pengaturan Handling
      </button>

      <div className="flex items-center gap-4">
        <button
          onClick={handleStart}
          className="rounded-full bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Mulai Simulasi
        </button>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-500">
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
            className="h-4 w-4"
          />
          Bisukan suara
        </label>
      </div>

      <p className="max-w-md text-xs text-neutral-400">
        Anda akan muncul di area parkir dan berjalan kaki menuju kendaraan. Dekati pintu pengemudi
        untuk masuk, lalu tekan <kbd className="rounded border px-1.5 py-0.5 font-mono">I</kbd> untuk
        menyalakan mesin. Sebelum berjalan, selesaikan checklist di kiri layar: pasang sabuk (
        <kbd className="rounded border px-1.5 py-0.5 font-mono">B</kbd>), lepas rem tangan (
        <kbd className="rounded border px-1.5 py-0.5 font-mono">Space</kbd>), atur kursi (
        <kbd className="rounded border px-1.5 py-0.5 font-mono">[</kbd>/
        <kbd className="rounded border px-1.5 py-0.5 font-mono">]</kbd>) dan spion (
        <kbd className="rounded border px-1.5 py-0.5 font-mono">M</kbd>). Tekan{" "}
        <kbd className="rounded border px-1.5 py-0.5 font-mono">C</kbd> untuk ganti sudut kamera.
      </p>

      {showHandling && <HandlingSettingsPanel onClose={() => setShowHandling(false)} />}
    </div>
  );
}

function FinishedScreen() {
  const score = useSimStore((s) => s.score);
  const violations = useSimStore((s) => s.violations);
  const offRoadCount = useSimStore((s) => s.offRoadCount);
  const elapsedMs = useSimStore((s) => s.elapsedMs);
  const vehicle = useSimStore((s) => s.vehicle);
  const reset = useSimStore((s) => s.reset);
  const startDriving = useSimStore((s) => s.startDriving);

  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Safety net: VehicleController already silences audio the instant it
  // detects the finish line, but that only helps if it got to run before
  // unmounting. This guarantees the engine/skid sound is cut the moment this
  // screen is actually on screen, no matter how we got here.
  useEffect(() => {
    vehicleAudio.silence();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleType: vehicle,
          score,
          timeTakenMs: elapsedMs,
          violations,
          offRoadCount,
          completed: true,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold">Simulasi Selesai</h1>
      <div className="text-6xl font-bold text-blue-600">{score}</div>
      <div className="flex gap-6 text-sm text-neutral-500">
        <span>Waktu: {(elapsedMs / 1000).toFixed(1)}s</span>
        <span>Pelanggaran: {violations}</span>
        <span>Keluar jalur: {offRoadCount}</span>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            vehicleAudio.start();
            startDriving();
          }}
          className="rounded-full bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          Coba Lagi
        </button>
        <button
          onClick={reset}
          className="rounded-full border border-neutral-300 px-6 py-2.5 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Ganti Kendaraan
        </button>
        {session ? (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="rounded-full bg-emerald-600 px-6 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saved ? "Skor Tersimpan" : saving ? "Menyimpan..." : "Simpan Skor"}
          </button>
        ) : (
          <a
            href="/login"
            className="rounded-full border border-neutral-300 px-6 py-2.5 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Login untuk simpan skor
          </a>
        )}
      </div>
    </div>
  );
}

function FailedScreen() {
  const failReason = useSimStore((s) => s.failReason);
  const reset = useSimStore((s) => s.reset);
  const startDriving = useSimStore((s) => s.startDriving);

  // Same safety net as FinishedScreen: guarantees the engine/skid sound is
  // cut the instant this screen is on screen, however the fail was reached.
  useEffect(() => {
    vehicleAudio.silence();
  }, []);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl font-bold text-red-600">Latihan Dihentikan</h1>
      <p className="max-w-md text-neutral-500">{failReason}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            vehicleAudio.start();
            startDriving();
          }}
          className="rounded-full bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          Coba Lagi
        </button>
        <button
          onClick={reset}
          className="rounded-full border border-neutral-300 px-6 py-2.5 font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Ganti Kendaraan
        </button>
      </div>
    </div>
  );
}

export function SimulationApp() {
  const phase = useSimStore((s) => s.phase);
  const vehicle = useSimStore((s) => s.vehicle);

  if (phase === "selecting") return <VehicleSelectScreen />;
  if (phase === "finished") return <FinishedScreen />;
  if (phase === "failed") return <FailedScreen />;

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <Scene vehicle={vehicle} />
      {phase === "walking" ? <WalkingHud /> : <Hud />}
    </div>
  );
}
