"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Scene } from "./Scene";
import { Hud } from "./Hud";
import { WalkingHud } from "./WalkingHud";
import { HandlingSettingsPanel } from "./HandlingSettingsPanel";
import { useSimStore } from "@/store/simStore";
import { VEHICLE_ORDER, VEHICLES, VehicleType } from "@/lib/vehicles";
import { WEATHERS, WEATHER_ORDER } from "@/lib/weather";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { computeEcoScore, ecoRatingLabel, ecoGrade, economyKmPerL } from "@/lib/ecoDriving";
import { vehicleAudio } from "./audio/vehicleAudio";
import { VRToggleButton } from "@/components/ui/VRToggleButton";

function VehicleSelectScreen() {
  const vehicle = useSimStore((s) => s.vehicle);
  const setVehicle = useSimStore((s) => s.setVehicle);
  const weather = useSimStore((s) => s.weather);
  const setWeather = useSimStore((s) => s.setWeather);
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

  // Same audio-unlock gesture, but then the simulation runs and — once the
  // <Canvas>/<XR> has mounted — the VR session is requested. The button's
  // internal retry loop waits for that mount, so clicking here works from the
  // very first screen instead of only after "Mulai Simulasi".
  const handleEnterVR = () => {
    vehicleAudio.start();
    vehicleAudio.setMuted(muted);
    startWalking();
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 text-center">
      <VRToggleButton onEnterVR={handleEnterVR} />
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

      {/* Cuaca dinamis (md: cerah, berawan, hujan, kabut, senja, malam) */}
      <div className="max-w-xl">
        <div className="text-sm font-medium text-neutral-500">Cuaca</div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {WEATHER_ORDER.map((w) => {
            const cfg = WEATHERS[w];
            const selected = weather === w;
            return (
              <button
                key={w}
                onClick={() => setWeather(w)}
                title={
                  w.startsWith("hujan") ? "Jalan licin — grip ban berkurang" : undefined
                }
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-neutral-300 text-neutral-600 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300"
                }`}
              >
                {cfg.emoji} {cfg.label}
              </button>
            );
          })}
        </div>
        {(weather === "hujan-ringan" || weather === "hujan-deras") && (
          <p className="mt-2 text-xs text-neutral-400">
            🌧️ Saat hujan, cengkeraman ban berkurang — rem lebih pelan, belok
            lebih hati-hati.
          </p>
        )}
        {weather === "kabut" && (
          <p className="mt-2 text-xs text-neutral-400">
            🌫️ Jarak pandang terbatas — nyalakan lampu (L) dan kurangi kecepatan.
          </p>
        )}
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
            <kbd className="rounded border px-1 py-0.5 font-mono">E</kbd> (atau{" "}
            <kbd className="rounded border px-1 py-0.5 font-mono">PageUp</kbd>/
            <kbd className="rounded border px-1 py-0.5 font-mono">PageDown</kbd>), dan{" "}
            <kbd className="rounded border px-1 py-0.5 font-mono">N</kbd> untuk netral. Oper gigi
            tanpa kopling akan merusak girboks dan bisa membuat mesin mati.
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
        menyalakan mesin. Sebelum berjalan, selesaikan checklist di kiri layar: {vehicle === "MOTOR" ? (
          <>
            pakai helm (<kbd className="rounded border px-1.5 py-0.5 font-mono">H</kbd>),
            jaket (<kbd className="rounded border px-1.5 py-0.5 font-mono">J</kbd>),
            sarung tangan (<kbd className="rounded border px-1.5 py-0.5 font-mono">G</kbd>),
            dan sepatu (<kbd className="rounded border px-1.5 py-0.5 font-mono">F</kbd>)
          </>
        ) : (
          <>
            pasang sabuk (<kbd className="rounded border px-1.5 py-0.5 font-mono">B</kbd>),
            atur kursi (<kbd className="rounded border px-1.5 py-0.5 font-mono">[</kbd>/
            <kbd className="rounded border px-1.5 py-0.5 font-mono">]</kbd>) dan spion (
            <kbd className="rounded border px-1.5 py-0.5 font-mono">M</kbd>)
          </>
        )}{" "}
        serta lepas rem tangan/standar (<kbd className="rounded border px-1.5 py-0.5 font-mono">Space</kbd>).
        Tekan <kbd className="rounded border px-1.5 py-0.5 font-mono">C</kbd> untuk ganti sudut kamera,
        <kbd className="rounded border px-1.5 py-0.5 font-mono">T</kbd> klakson,{" "}
        <kbd className="rounded border px-1.5 py-0.5 font-mono">L</kbd>/
        <kbd className="rounded border px-1.5 py-0.5 font-mono">K</kbd> lampu/lampu jauh,{" "}
        <kbd className="rounded border px-1.5 py-0.5 font-mono">V</kbd> hazard, dan{" "}
        <kbd className="rounded border px-1.5 py-0.5 font-mono">P</kbd> pause.
      </p>

      {showHandling && <HandlingSettingsPanel onClose={() => setShowHandling(false)} />}
    </div>
  );
}

function FinishedScreen() {
  const score = useSimStore((s) => s.score);
  const violations = useSimStore((s) => s.violations);
  const offRoadCount = useSimStore((s) => s.offRoadCount);
  const obstacleHits = useSimStore((s) => s.obstacleHits);
  const elapsedMs = useSimStore((s) => s.elapsedMs);
  const vehicle = useSimStore((s) => s.vehicle);
  const unlocked = useSimStore((s) => s.unlockedAchievements);
  const reset = useSimStore((s) => s.reset);
  const startDriving = useSimStore((s) => s.startDriving);
  const tripDistanceKm = useSimStore((s) => s.tripDistanceKm);
  const tripFuelUsedL = useSimStore((s) => s.tripFuelUsedL);
  const tripTopSpeedKmh = useSimStore((s) => s.tripTopSpeedKmh);

  // Trip Computer & Eco Driving Score (ringkasan akhir).
  const avgSpeedKmh = elapsedMs > 1000 ? tripDistanceKm / (elapsedMs / 3600000) : 0;
  const economy = economyKmPerL(tripDistanceKm, tripFuelUsedL);
  const ecoScore =
    tripDistanceKm >= 0.1
      ? computeEcoScore({
          distanceKm: tripDistanceKm,
          fuelUsedL: tripFuelUsedL,
          consumptionLperKm: VEHICLES[vehicle].fuelConsumptionLperKm,
          violations,
          offRoadCount,
          obstacleHits,
        })
      : null;
  const ecoLabel = ecoScore !== null ? ecoRatingLabel(ecoScore) : null;
  const grade = ecoScore !== null ? ecoGrade(ecoScore) : null;

  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // VR is only meaningful while driving, but keeping the exit button around is
  // harmless — and the disabled-state tooltip explains why it can't be used.
  const handleEnterVR = () => {
    vehicleAudio.start();
    startDriving();
  };


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
      <VRToggleButton onEnterVR={handleEnterVR} />
      <h1 className="text-3xl font-bold">Simulasi Selesai</h1>
      <div className="text-6xl font-bold text-blue-600">{score}</div>
      <div className="flex flex-wrap justify-center gap-6 text-sm text-neutral-500">
        <span>Waktu: {(elapsedMs / 1000).toFixed(1)}s</span>
        <span>Pelanggaran: {violations}</span>
        <span>Keluar jalur: {offRoadCount}</span>
        <span>Rintangan: {obstacleHits}</span>
      </div>

      {/* Trip Computer & Eco Driving (md "Statistik Berkendara") */}
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white/70 p-5 text-left dark:border-neutral-800 dark:bg-neutral-900/70">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">🛣️ Statistik Perjalanan</div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${
              ecoScore === null
                ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                : ecoScore >= 75
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                  : ecoScore >= 55
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
            }`}
          >
            {grade !== null ? (
              <>
                <span>🌿 {grade}</span>
                <span>{ecoScore} · {ecoLabel}</span>
              </>
            ) : (
              <span>🌿 —</span>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Jarak</span>
            <span className="font-medium tabular-nums">{tripDistanceKm.toFixed(2)} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Rata-rata</span>
            <span className="font-medium tabular-nums">{avgSpeedKmh.toFixed(0)} km/j</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Top speed</span>
            <span className="font-medium tabular-nums">{tripTopSpeedKmh.toFixed(0)} km/j</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Bensin</span>
            <span className="font-medium tabular-nums">{tripFuelUsedL.toFixed(2)} L</span>
          </div>
          <div className="col-span-2 flex justify-between">
            <span className="text-neutral-500">Konsumsi</span>
            <span className="font-medium tabular-nums">
              {economy !== null ? `${economy.toFixed(1)} km/L` : "—"}
            </span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
          <div
            className={`h-full rounded-full ${
              ecoScore === null
                ? "bg-neutral-300 dark:bg-neutral-700"
                : ecoScore >= 75
                  ? "bg-emerald-500"
                  : ecoScore >= 55
                    ? "bg-amber-500"
                    : "bg-red-500"
            }`}
            style={{ width: `${ecoScore ?? 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Skor eco dihitung dari efisiensi bahan bakar (km/L) dikurangi pelanggaran lalu lintas.
          Gas halus = irit & aman.
        </p>
      </div>

      {/* Achievement (md "Achievement") */}
      {unlocked.length > 0 && (
        <div className="w-full max-w-md rounded-2xl border border-yellow-400/40 bg-black/40 px-5 py-4 backdrop-blur">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-yellow-400">
            🏆 Achievement ({unlocked.length}/{ACHIEVEMENTS.length})
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {ACHIEVEMENTS.filter((a) => unlocked.includes(a.id)).map((a) => (
              <span
                key={a.id}
                title={a.description}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-white"
              >
                {a.icon} {a.label}
              </span>
            ))}
          </div>
        </div>
      )}

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

  const handleEnterVR = () => {
    vehicleAudio.start();
    startDriving();
  };

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <VRToggleButton onEnterVR={handleEnterVR} />
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
      <VRToggleButton />
    </div>
  );
}
