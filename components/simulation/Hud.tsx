"use client";

import { useEffect, useState } from "react";
import { useSimStore, CameraMode } from "@/store/simStore";
import { VEHICLES } from "@/lib/vehicles";
import { WEATHERS } from "@/lib/weather";
import { gearLabel } from "@/lib/transmission";
import { achievementById } from "@/lib/achievements";
import { vehicleAudio } from "./audio/vehicleAudio";
import { HandlingSettingsPanel } from "./HandlingSettingsPanel";
import { PreDriveChecklist } from "./PreDriveChecklist";
import { Minimap } from "./Minimap";
import {
  computeEcoScore,
  ecoRatingLabel,
  economyKmPerL,
} from "@/lib/ecoDriving";

const CAMERA_LABEL: Record<CameraMode, string> = {
  tpv: "Kamera Belakang",
  fpv: "Kamera Interior",
  rear: "Kamera Mundur",
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

// Toast achievement: muncul beberapa detik saat achievement baru terbuka
// (md "Achievement"). Otomatis sembunyi setelah timeout.
function AchievementToast({ id }: { id: string }) {
  const def = achievementById(id);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      useSimStore.setState({ lastUnlockId: null });
    }, 4200);
    return () => clearTimeout(t);
  }, [id]);
  if (!def || !visible) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-xl border border-yellow-400/50 bg-black/80 px-5 py-3 text-center text-white backdrop-blur">
      <div className="text-xs uppercase tracking-wide text-yellow-400">Achievement Terbuka</div>
      <div className="mt-1 text-lg font-bold">
        {def.icon} {def.label}
      </div>
      <div className="mt-0.5 text-xs text-white/70">{def.description}</div>
    </div>
  );
}

export function Hud() {
  const speedKmh = useSimStore((s) => s.speedKmh);
  const violations = useSimStore((s) => s.violations);
  const offRoadCount = useSimStore((s) => s.offRoadCount);
  const obstacleHits = useSimStore((s) => s.obstacleHits);
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
  const headlightsOn = useSimStore((s) => s.headlightsOn);
  const highBeamOn = useSimStore((s) => s.highBeamOn);
  const hazardOn = useSimStore((s) => s.hazardOn);
  const paused = useSimStore((s) => s.paused);
  const activeWarning = useSimStore((s) => s.activeWarning);
  const helmetOn = useSimStore((s) => s.helmetOn);
  const jacketOn = useSimStore((s) => s.jacketOn);
  const glovesOn = useSimStore((s) => s.glovesOn);
  const bootsOn = useSimStore((s) => s.bootsOn);
  const toggleHelmet = useSimStore((s) => s.toggleHelmet);
  const toggleJacket = useSimStore((s) => s.toggleJacket);
  const toggleGloves = useSimStore((s) => s.toggleGloves);
  const toggleBoots = useSimStore((s) => s.toggleBoots);
  const weather = useSimStore((s) => s.weather);
  const fuel = useSimStore((s) => s.fuel);
  const refueling = useSimStore((s) => s.refueling);
  const damage = useSimStore((s) => s.damage);
  const wiperOn = useSimStore((s) => s.wiperOn);
  const acOn = useSimStore((s) => s.acOn);
  const airBrakeOn = useSimStore((s) => s.airBrakeOn);
  const voiceNav = useSimStore((s) => s.voiceNav);
  const showMinimap = useSimStore((s) => s.showMinimap);
  const speedLimitKmh = useSimStore((s) => s.speedLimitKmh);
  const lastUnlockId = useSimStore((s) => s.lastUnlockId);
  const tripDistanceKm = useSimStore((s) => s.tripDistanceKm);
  const tripFuelUsedL = useSimStore((s) => s.tripFuelUsedL);
  const tripTopSpeedKmh = useSimStore((s) => s.tripTopSpeedKmh);
  const showTripComputer = useSimStore((s) => s.showTripComputer);
  const [muted, setMuted] = useState(vehicleAudio.isMuted());
  const [showHandling, setShowHandling] = useState(false);
  const wc = WEATHERS[weather];

  // Trip Computer & Eco Driving Score (live)
  const avgSpeedKmh =
    elapsedMs > 1000 ? tripDistanceKm / (elapsedMs / 3600000) : 0;
  const economy = economyKmPerL(tripDistanceKm, tripFuelUsedL);
  // Skor eco baru masuk akal setelah ada perjalanan nyata (≥ 0,1 km).
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
            {hazardOn && (
              <span className="animate-pulse rounded bg-orange-500/90 px-1.5 py-0.5 font-semibold text-white">
                ⚠ Hazard
              </span>
            )}
            {turnSignal !== "off" && (
              <span className="animate-pulse rounded bg-amber-400/90 px-1.5 py-0.5 font-semibold text-black">
                {turnSignal === "left" ? "◀ Sein Kiri" : "Sein Kanan ▶"}
              </span>
            )}
            {(headlightsOn || highBeamOn) && (
              <span className="rounded bg-yellow-500/80 px-1.5 py-0.5 font-semibold text-black">
                {highBeamOn ? "Lampu Jauh" : "💡 Lampu"}
              </span>
            )}
          </div>
        </div>

        <PreDriveChecklist />

        {/* Trip Computer & Eco Driving (md "Statistik Berkendara") */}
        {showTripComputer && (
          <div className="w-60 rounded-lg bg-black/60 px-4 py-3 text-white backdrop-blur">
            <div className="text-xs uppercase tracking-wide text-white/60">
              🛣️ Trip Computer
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/60">Jarak</span>
                <span className="font-medium tabular-nums">{tripDistanceKm.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Rata-rata</span>
                <span className="font-medium tabular-nums">{avgSpeedKmh.toFixed(0)} km/j</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Top speed</span>
                <span className="font-medium tabular-nums">{tripTopSpeedKmh.toFixed(0)} km/j</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Bensin</span>
                <span className="font-medium tabular-nums">{tripFuelUsedL.toFixed(2)} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Konsumsi</span>
                <span className="font-medium tabular-nums">
                  {economy !== null ? `${economy.toFixed(1)} km/L` : "—"}
                </span>
              </div>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">🌿 Eco Driving</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    ecoScore === null
                      ? "bg-white/15 text-white/60"
                      : ecoScore >= 75
                        ? "bg-emerald-500/80 text-white"
                        : ecoScore >= 55
                          ? "bg-amber-500/80 text-black"
                          : "bg-red-500/80 text-white"
                  }`}
                >
                  {ecoScore !== null ? `${ecoScore} · ${ecoLabel}` : "—"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full rounded-full ${
                    ecoScore === null
                      ? "bg-white/25"
                      : ecoScore >= 75
                        ? "bg-emerald-400"
                        : ecoScore >= 55
                          ? "bg-amber-400"
                          : "bg-red-500"
                  }`}
                  style={{ width: `${ecoScore ?? 0}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-white/50">
                Gas halus & taat rambu = irit & aman.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 rounded-lg bg-black/60 px-4 py-3 text-white backdrop-blur text-right">
        <div className="text-xs uppercase tracking-wide text-white/60">Waktu</div>
        <div className="text-xl font-semibold tabular-nums">{seconds}s</div>
        <div className="mt-1 text-xs text-white/70">Pelanggaran: {violations}</div>
        <div className="text-xs text-white/70">Keluar jalur: {offRoadCount}</div>
        <div className="text-xs text-white/70">Rintangan: {obstacleHits}</div>
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

      {/* Toast achievement — muncul singkat saat achievement baru terbuka. */}
      {lastUnlockId && <AchievementToast id={lastUnlockId} />}

      {/* Mini map / GPS (md "Mini Map") */}
      {showMinimap && (
        <div className="absolute bottom-4 left-4">
          <Minimap />
        </div>
      )}

      {paused && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="rounded-2xl bg-black/80 px-10 py-8 text-center text-white backdrop-blur">
            <div className="text-4xl font-bold">⏸ Dijeda</div>
            <p className="mt-2 text-sm text-white/70">
              Tekan <kbd className="rounded border px-1.5 py-0.5 font-mono">P</kbd> atau tombol menu
              (tahan) untuk melanjutkan
            </p>
            <button
              onClick={() => useSimStore.getState().togglePause()}
              className="mt-5 rounded-full bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => useSimStore.getState().toggleMinimap()}
            className="rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur hover:bg-black/80"
          >
            {showMinimap ? "🗺️ Map" : "🗺️ Map: Off"}
          </button>
          <button
            onClick={() => useSimStore.getState().toggleTripComputer()}
            className={`rounded-lg px-3 py-2 text-xs backdrop-blur ${
              showTripComputer
                ? "bg-emerald-600/80 text-white"
                : "bg-black/60 text-white/80 hover:bg-black/80"
            }`}
          >
            🛣️ Trip
          </button>
          <button
            onClick={() => useSimStore.getState().toggleVoiceNav()}
            className={`rounded-lg px-3 py-2 text-xs backdrop-blur ${
              voiceNav ? "bg-blue-600/80 text-white" : "bg-black/60 text-white/80 hover:bg-black/80"
            }`}
          >
            {voiceNav ? "🔊 Navigasi" : "🔇 Navigasi"}
          </button>
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

        {/* Status kendaraan: cuaca, bahan bakar, damage, fitur aktif */}
        <div className="flex flex-col gap-1 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <span>
              {wc.emoji} {wc.label}
            </span>
            <span className="rounded bg-white/15 px-1.5 py-0.5 font-semibold">
              ⛔ {speedLimitKmh} km/j
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10">⛽ Bensin</span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full ${fuel < 0.25 ? "bg-red-500" : "bg-emerald-400"}`}
                style={{ width: `${Math.round(fuel * 100)}%` }}
              />
            </div>
            <span className="tabular-nums">{Math.round(fuel * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-10">🛠️ Kerusakan</span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full ${damage > 60 ? "bg-red-500" : damage > 30 ? "bg-amber-400" : "bg-white/70"}`}
                style={{ width: `${Math.round(damage)}%` }}
              />
            </div>
            <span className="tabular-nums">{Math.round(damage)}%</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {refueling && (
              <span className="animate-pulse rounded bg-emerald-500/80 px-1.5 py-0.5 font-semibold text-white">
                ⛽ Mengisi BBM...
              </span>
            )}
            {wiperOn && <span className="rounded bg-white/15 px-1.5 py-0.5">💦 Wiper</span>}
            {acOn && <span className="rounded bg-white/15 px-1.5 py-0.5">❄️ AC</span>}
            {airBrakeOn && (
              <span className="rounded bg-white/15 px-1.5 py-0.5">🛑 Air Brake</span>
            )}
          </div>
        </div>
      </div>

      {vehicle === "MOTOR" && (
        <div className="pointer-events-auto absolute bottom-28 right-4 w-52 rounded-lg bg-black/60 px-3 py-3 text-white backdrop-blur">
          <div className="mb-2 text-xs uppercase tracking-wide text-white/60">
            Keselamatan Motor
          </div>
          <div className="grid gap-2">
            <button
              onClick={toggleHelmet}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                helmetOn
                  ? "bg-emerald-500/90 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {helmetOn ? "Helm ON" : "Helm"}
            </button>
            <button
              onClick={toggleJacket}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                jacketOn
                  ? "bg-emerald-500/90 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {jacketOn ? "Jaket ON" : "Jaket"}
            </button>
            <button
              onClick={toggleGloves}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                glovesOn
                  ? "bg-emerald-500/90 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {glovesOn ? "Sarung ON" : "Sarung"}
            </button>
            <button
              onClick={toggleBoots}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                bootsOn
                  ? "bg-emerald-500/90 text-white"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {bootsOn ? "Sepatu ON" : "Sepatu"}
            </button>
          </div>
        </div>
      )}

      {showHandling && (
        // pointer-events-none on the Hud root is inherited by default, and
        // the panel's own "fixed" positioning doesn't reset that — without
        // this wrapper the modal would render but silently ignore clicks.
        <div className="pointer-events-auto">
          <HandlingSettingsPanel onClose={() => setShowHandling(false)} />
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className="max-w-3xl rounded-lg bg-black/60 px-4 py-2 text-center text-xs text-white/80 backdrop-blur">
          [I] kontak &middot; W gas &middot; S rem &middot; A/D belok &middot; [Space] rem tangan &middot; R
          mundur
          {transmissionMode === "manual" && " · Shift kopling · Q/E gigi · N netral"} &middot; B sabuk
          &middot; M spion &middot; [ ] kursi &middot; Z/X sein &middot; T klakson &middot; L lampu &middot; K
          lampu jauh &middot; V hazard{vehicle !== "MOTOR" && " · Y wiper"}
          {vehicle === "MOBIL" && " · U AC"}
          {vehicle === "TRUK" && " · O air brake"} &middot; ; navigasi &middot; P pause &middot; [C] kamera (
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
