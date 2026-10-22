"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Scene } from "./Scene";
import { Hud } from "./Hud";
import { WalkingHud } from "./WalkingHud";
import { SimulationGarage } from "./SimulationGarage";
import { VRSessionButton } from "./xr/VRSessionButton";
import { useSimStore } from "@/store/simStore";
import { vehicleAudio } from "./audio/vehicleAudio";


function FinishedScreen() {
  const score = useSimStore((s) => s.score);
  const violations = useSimStore((s) => s.violations);
  const offRoadCount = useSimStore((s) => s.offRoadCount);
  const elapsedMs = useSimStore((s) => s.elapsedMs);
  const vehicle = useSimStore((s) => s.vehicle);
  const reset = useSimStore((s) => s.reset);
  const startDriving = useSimStore((s) => s.startDriving);

  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Safety net: VehicleController already silences audio the instant it
  // detects the finish line, but that only helps if it got to run before
  // unmounting. This guarantees the engine/skid sound is cut the moment this
  // screen is actually on screen, no matter how we got here.
  useEffect(() => {
    vehicleAudio.silence();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveNote(null);
    const payload = {
      vehicleType: vehicle,
      score,
      timeTakenMs: elapsedMs,
      violations,
      offRoadCount,
      completed: true,
    };
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Server menolak penyimpanan (HTTP ${res.status})`);
      }
      setSaved(true);
    } catch (err) {
      // Backend demo/offline (mis. /api/progress 404): jangan klaim
      // "Tersimpan" palsu — fallback ke localStorage dengan status jelas.
      try {
        const localRecord = {
          ...payload,
          savedAt: new Date().toISOString(),
          offline: true,
        };
        const key = "kemudi_last_score_offline";
        const prevRaw = localStorage.getItem(key);
        const prev = prevRaw ? JSON.parse(prevRaw) : [];
        const list = Array.isArray(prev) ? prev : [prev];
        list.push(localRecord);
        localStorage.setItem(key, JSON.stringify(list));
        setSaved(true);
        setSaveNote("Tersimpan lokal (offline/demo) — server tidak tersedia.");
      } catch {
        setSaveError(
          err instanceof Error ? err.message : "Gagal menyimpan skor. Coba lagi."
        );
      }
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
        {user ? (
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

      {saveError && (
        <p className="max-w-md text-sm font-medium text-red-600">{saveError}</p>
      )}
      {saveNote && (
        <p className="max-w-md text-sm font-medium text-amber-600">{saveNote}</p>
      )}
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

  if (phase === "selecting") return <SimulationGarage />;
  if (phase === "finished") return <FinishedScreen />;
  if (phase === "failed") return <FailedScreen />;

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full">
      <Scene vehicle={vehicle} />
      {phase === "walking" ? <WalkingHud /> : <Hud />}
      <VRSessionButton />
    </div>
  );
}
