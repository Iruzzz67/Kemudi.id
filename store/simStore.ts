import { create } from "zustand";
import { VehicleType, VEHICLES } from "@/lib/vehicles";
import { loadFactorFor } from "@/lib/ecoDriving";
import { HandlingOverrides, HandlingParamKey } from "@/lib/handling";
import { EngineState, nextIgnitionStep } from "@/lib/engine";
import { WeatherKind } from "@/lib/weather";
import {
  loadUnlockedAchievements,
  saveUnlockedAchievements,
} from "@/lib/achievements";

export type SimPhase = "selecting" | "walking" | "driving" | "finished" | "failed";
export type CameraMode = "tpv" | "fpv" | "rear" | "topdown";
export type TransmissionMode = "manual" | "automatic";
export type TurnSignal = "off" | "left" | "right";
export type PedestrianCrossingState = { x: number; z: number; inRoad: boolean };

// Canonical input snapshot produced by the InputManager every frame by merging
// keyboard (KeyboardInput) and VR controller / gamepad (vehicleInputOverride).
// VehicleController consumes ONLY this — it never knows which device produced
// the input, and the same fields drive the physics for every control mode.
//
// `steer` is +1 = full lock to the LEFT (keyboard convention); VR sticks are
// inverted to match when merged. Discrete fields are rising-edge flags that
// the InputManager turns into store actions once per press.
export type VehicleInput = {
  steer: number; // -1..1, + = kiri
  throttle: number; // 0..1
  brake: number; // 0..1
  clutch: boolean; // held
  horn: boolean; // held
  handBrake: boolean; // edge
  leftSignal: boolean; // edge
  rightSignal: boolean; // edge
  hazard: boolean; // edge
  headlights: boolean; // edge
  highBeam: boolean; // edge
  mirror: boolean; // edge
  gearUp: boolean; // edge
  gearDown: boolean; // edge
  reverse: boolean; // edge (R key / stik kiri tahan bawah)
  neutral: boolean; // edge
  camera: boolean; // edge
  pause: boolean; // edge
  engine: boolean; // edge
};

const EMPTY_VEHICLE_INPUT: VehicleInput = {
  steer: 0,
  throttle: 0,
  brake: 0,
  clutch: false,
  horn: false,
  handBrake: false,
  leftSignal: false,
  rightSignal: false,
  hazard: false,
  headlights: false,
  highBeam: false,
  mirror: false,
  gearUp: false,
  gearDown: false,
  reverse: false,
  neutral: false,
  camera: false,
  pause: false,
  engine: false,
};

// Urutan kamera dasar. Mode "rear" (kamera belakang) hanya dipakai truk
// (cycleCameraMode menyisipkannya untuk TRUK) — mobil/motor melewatkannya.
const CAMERA_MODE_ORDER: CameraMode[] = ["tpv", "fpv", "rear", "topdown"];
const CLUTCH_MISTAKE_LIMIT = 3;
const SEAT_HEIGHT_RANGE = 0.15; // m, clamp for [ / ] seat adjustment

type SimState = {
  phase: SimPhase;
  vehicle: VehicleType;
  weather: WeatherKind;
  speedKmh: number;
  violations: number;
  offRoadCount: number;
  obstacleHits: number;
  isOffRoad: boolean;
  elapsedMs: number;
  score: number;
  cameraMode: CameraMode;
  transmissionMode: TransmissionMode;
  gear: number;
  rpmRatio: number;
  gearBlocked: boolean;
  engineState: EngineState;
  engineRunning: boolean;
  entering: boolean;
  nearVehicleDoor: boolean;
  handlingOverrides: Record<VehicleType, HandlingOverrides>;
  // Cabin/realism systems
  handbrakeOn: boolean;
  seatbeltOn: boolean;
  turnSignal: TurnSignal;
  seatHeightOffset: number;
  seatAdjusted: boolean;
  mirrorAdjusted: boolean;
  mirrorGlanceAt: number;
  hasClutchedOnce: boolean;
  hasEngagedGearOne: boolean;
  turnSignalUsedOnce: boolean;
  helmetOn: boolean;
  jacketOn: boolean;
  glovesOn: boolean;
  bootsOn: boolean;
  clutchMistakes: number;
  activeWarning: string | null;
  failReason: string;
  pedestrianCrossings: Record<string, PedestrianCrossingState>;
  // Cabin/lighting features (driven by InputManager, shown in HUD/VR dashboard)
  headlightsOn: boolean;
  highBeamOn: boolean;
  hazardOn: boolean;
  paused: boolean;
  // Fitur kendaraan tambahan (md: wiper, AC, air brake, indikator bensin)
  wiperOn: boolean;
  acOn: boolean;
  airBrakeOn: boolean;
  toggleWiper: () => void;
  toggleAc: () => void;
  toggleAirBrake: () => void;
  // Sistem bahan bakar + SPBU
  fuel: number; // 0..1
  refueling: boolean;
  setRefueling: (v: boolean) => void;
  // Konsumsi bensin berbasis JARAK & gaya gas (bukan timer): makin kencang
  // meraup gas, makin banyak bensin terpakai per km. Idle (diam, mesin nyala)
  // tetap mengonsumsi sedikit.
  consumeFuel: (deltaMs: number, speedMps: number, throttle: number) => void;
  addFuel: (amount: number) => void;
  // Trip Computer & Eco Driving: statistik perjalanan yang direset setiap
  // memulai mengemudi (jarak, bensin terpakai, top speed) + toggle panel.
  tripDistanceKm: number;
  tripFuelUsedL: number;
  tripTopSpeedKmh: number;
  showTripComputer: boolean;
  recordTrip: (deltaMs: number, speedMps: number) => void;
  toggleTripComputer: () => void;
  // Sistem kerusakan kendaraan (0..100)
  damage: number;
  addDamage: (amount: number) => void;
  // Achievement
  unlockedAchievements: string[];
  lastUnlockId: string | null;
  unlockAchievement: (id: string) => void;
  // Posisi pemain (untuk minimap/GPS) — diupdate tiap frame oleh controller
  playerX: number;
  playerZ: number;
  setPlayerPos: (x: number, z: number) => void;
  // Jarak HUD VR dari kamera FPV (meter) — bisa diatur langsung dari panel
  // kontrol VR (tombol HUD Dekat/Jauh) di dalam headset.
  hudDistance: number;
  setHudDistance: (delta: number) => void;
  // Tampilkan/sembunyikan HUD melayang VR (toggle dari panel kontrol).
  showVrHud: boolean;
  toggleVrHud: () => void;
  // GPS / voice navigation + minimap
  voiceNav: boolean;
  showMinimap: boolean;
  toggleVoiceNav: () => void;
  toggleMinimap: () => void;
  // Status lampu merah / batas kecepatan saat ini (untuk HUD)
  speedLimitKmh: number;
  setSpeedLimit: (v: number) => void;
  toggleHeadlights: () => void;
  toggleHighBeam: () => void;
  toggleHazard: () => void;
  togglePause: () => void;
  // Raw VR controller / gamepad input (per-frame, rebuilt by XRControlsMap;
  // null = no controller, keyboard takes over).
  vehicleInputOverride: Partial<VehicleInput> | null;
  setVehicleInput: (input: Partial<VehicleInput> | null) => void;
  // Merged keyboard + VR snapshot published every frame by InputManager.
  // Written each frame — read it via getState() inside useFrame, never
  // subscribe to it from a React component (would re-render every frame).
  vehicleInput: VehicleInput;
  setMergedInput: (input: VehicleInput) => void;

  // Walking-phase locomotion driven by XR controllers / gamepad (null = keyboard).
  characterInputOverride: { forward: boolean; back: boolean; left: boolean; right: boolean } | null;
  setCharacterInput: (input: { forward: boolean; back: boolean; left: boolean; right: boolean } | null) => void;
  // Monotonic counter bumped when a controller asks to enter the vehicle, so
  // WalkingHud can run its door animation without a DOM click (impossible in VR).
  enterRequestId: number;
  requestEnterVehicle: () => void;
  setVehicle: (v: VehicleType) => void;
  setWeather: (w: WeatherKind) => void;
  setTransmissionMode: (m: TransmissionMode) => void;
  startWalking: () => void;
  setNearVehicleDoor: (v: boolean) => void;
  setEntering: (v: boolean) => void;
  enterVehicle: () => void;
  startDriving: () => void;
  advanceIgnition: () => void;
  finishCranking: () => void;
  setSpeedKmh: (v: number) => void;
  setIsOffRoad: (v: boolean) => void;
  registerViolation: (weight?: number) => void;
  registerOffRoadEvent: () => void;
  registerObstacleHit: () => void;
  tickElapsed: (deltaMs: number) => void;
  finish: (score: number) => void;
  failSimulation: (reason: string) => void;
  cycleCameraMode: () => void;
  setGearState: (gear: number, rpmRatio: number) => void;
  flashGearBlocked: () => void;
  setHandlingParam: (vehicle: VehicleType, key: HandlingParamKey, value: number) => void;
  resetHandling: (vehicle: VehicleType) => void;
  toggleHandbrake: () => void;
  toggleSeatbelt: () => void;
  toggleHelmet: () => void;
  toggleJacket: () => void;
  toggleGloves: () => void;
  toggleBoots: () => void;
  setTurnSignal: (dir: "left" | "right") => void;
  adjustSeatHeight: (delta: number) => void;
  triggerMirrorGlance: () => void;
  markClutchedOnce: () => void;
  markGearOneEngaged: () => void;
  registerClutchMistake: () => void;
  stallEngine: (reason?: string) => void;
  raiseWarning: (message: string) => void;
  clearWarning: () => void;
  setPedestrianCrossing: (id: string, state: PedestrianCrossingState) => void;
  clearPedestrianCrossing: (id: string) => void;
  reset: () => void;
};

// Bar bensin memakai tangki "efektif" 1/12 dari kapasitas asli — arcade,
// supaya "Bensin habis → isi di SPBU" masih tercapai dalam sesi latihan.
// (Trip Computer tetap menghitung liter realistis; skor eco tidak terpengaruh.)
const FUEL_BAR_TANK_SCALE = 12;

const initial = {
  phase: "selecting" as SimPhase,
  vehicle: "MOBIL" as VehicleType,
  weather: "cerah" as WeatherKind,
  speedKmh: 0,
  violations: 0,
  offRoadCount: 0,
  obstacleHits: 0,
  isOffRoad: false,
  elapsedMs: 0,
  score: 0,
  gear: 0,
  rpmRatio: 0,
  gearBlocked: false,
  engineState: "OFF" as EngineState,
  engineRunning: false,
  entering: false,
  nearVehicleDoor: false,
  handbrakeOn: true,
  seatbeltOn: false,
  helmetOn: false,
  jacketOn: false,
  glovesOn: false,
  bootsOn: false,
  turnSignal: "off" as TurnSignal,
  seatHeightOffset: 0,
  seatAdjusted: false,
  mirrorAdjusted: false,
  mirrorGlanceAt: 0,
  hasClutchedOnce: false,
  hasEngagedGearOne: false,
  turnSignalUsedOnce: false,
  clutchMistakes: 0,
  activeWarning: null as string | null,
  failReason: "",
  pedestrianCrossings: {} as Record<string, PedestrianCrossingState>,
  vehicleInputOverride: null as Partial<VehicleInput> | null,
  vehicleInput: EMPTY_VEHICLE_INPUT,
  headlightsOn: false,
  highBeamOn: false,
  hazardOn: false,
  paused: false,
  wiperOn: false,
  acOn: false,
  airBrakeOn: false,
  fuel: 1,
  refueling: false,
  tripDistanceKm: 0,
  tripFuelUsedL: 0,
  tripTopSpeedKmh: 0,
  showTripComputer: true,
  damage: 0,
  unlockedAchievements: loadUnlockedAchievements(),
  lastUnlockId: null as string | null,
  playerX: 0,
  playerZ: 0,
  hudDistance: 2.2, // jarak HUD VR dari kamera (meter)
  showVrHud: true,
  voiceNav: false,
  showMinimap: true,
  speedLimitKmh: 40,
  characterInputOverride: null as { forward: boolean; back: boolean; left: boolean; right: boolean } | null,
  enterRequestId: 0,
};

// Shared by startWalking's post-entry target and the "Coba Lagi" restart:
// both drop the player into the cabin with a cold, off engine, handbrake set,
// seatbelt off, and a clean checklist — a real re-entry, not a resume.
const drivingReset = {
  phase: "driving" as SimPhase,
  speedKmh: 0,
  violations: 0,
  offRoadCount: 0,
  obstacleHits: 0,
  isOffRoad: false,
  elapsedMs: 0,
  score: 0,
  gear: 0,
  rpmRatio: 0,
  gearBlocked: false,
  engineState: "OFF" as EngineState,
  engineRunning: false,
  entering: false,
  nearVehicleDoor: false,
  cameraMode: "fpv" as CameraMode,
  handbrakeOn: true,
  seatbeltOn: false,
  helmetOn: false,
  jacketOn: false,
  glovesOn: false,
  bootsOn: false,
  turnSignal: "off" as TurnSignal,
  seatHeightOffset: 0,
  seatAdjusted: false,
  mirrorAdjusted: false,
  mirrorGlanceAt: 0,
  hasClutchedOnce: false,
  hasEngagedGearOne: false,
  turnSignalUsedOnce: false,
  clutchMistakes: 0,
  activeWarning: null as string | null,
  failReason: "",
  pedestrianCrossings: {} as Record<string, PedestrianCrossingState>,
  vehicleInputOverride: null as Partial<VehicleInput> | null,
  vehicleInput: EMPTY_VEHICLE_INPUT,
  headlightsOn: false,
  highBeamOn: false,
  hazardOn: false,
  paused: false,
  wiperOn: false,
  acOn: false,
  airBrakeOn: false,
  fuel: 1,
  refueling: false,
  tripDistanceKm: 0,
  tripFuelUsedL: 0,
  tripTopSpeedKmh: 0,
  damage: 0,
  playerX: 0,
  playerZ: 0,
  speedLimitKmh: 40,
  characterInputOverride: null as { forward: boolean; back: boolean; left: boolean; right: boolean } | null,
};

export const useSimStore = create<SimState>((set) => ({
  ...initial,
  setVehicleInput: (input) => set({ vehicleInputOverride: input }),
  setWeather: (w) => set({ weather: w }),
  toggleWiper: () => set((s) => ({ wiperOn: !s.wiperOn })),
  toggleAc: () => set((s) => ({ acOn: !s.acOn })),
  toggleAirBrake: () => set((s) => ({ airBrakeOn: !s.airBrakeOn })),
  setRefueling: (v) => set({ refueling: v }),
  consumeFuel: (deltaMs, speedMps, throttle) =>
    set((s) => {
      const v = VEHICLES[s.vehicle];
      const dtSec = deltaMs / 1000;
      const km = (Math.abs(speedMps) * dtSec) / 1000;
      const fuelL =
        km * v.fuelConsumptionLperKm * loadFactorFor(throttle) +
        v.idleConsumptionLperSec * dtSec;
      return {
        // Skala tangki permainan: bar bensin memakai tangki "efektif" yang
        // jauh lebih kecil (×FUEL_BAR_TANK_SCALE) agar bensin bisa habis dan
        // SPBU benar-benar terpakai dalam sesi latihan. Trip fuel tetap
        // mencatat liter REALISTIS — skor Eco & km/L tidak terpengaruh.
        fuel: Math.max(
          0,
          s.fuel - (fuelL / v.tankCapacityL) * FUEL_BAR_TANK_SCALE
        ),
        tripFuelUsedL: s.tripFuelUsedL + fuelL,
      };
    }),
  addFuel: (amount) => set((s) => ({ fuel: Math.min(1, s.fuel + amount) })),
  recordTrip: (deltaMs, speedMps) =>
    set((s) => {
      const dtSec = deltaMs / 1000;
      const km = (Math.abs(speedMps) * dtSec) / 1000;
      const kmh = Math.abs(speedMps) * 3.6;
      return {
        tripDistanceKm: s.tripDistanceKm + km,
        tripTopSpeedKmh: Math.max(s.tripTopSpeedKmh, kmh),
      };
    }),
  toggleTripComputer: () => set((s) => ({ showTripComputer: !s.showTripComputer })),
  addDamage: (amount) => set((s) => ({ damage: Math.min(100, s.damage + amount) })),
  unlockAchievement: (id) =>
    set((s) => {
      if (s.unlockedAchievements.includes(id)) return {};
      const next = [...s.unlockedAchievements, id];
      saveUnlockedAchievements(next);
      return { unlockedAchievements: next, lastUnlockId: id };
    }),
  setPlayerPos: (x, z) => set({ playerX: x, playerZ: z }),
  // Jarak HUD VR dari kamera — dibatasi 1,2 m s/d 4,0 m agar selalu nyaman
  // dibaca dan tidak sampai menembus dasbor/kabin.
  setHudDistance: (delta) =>
    set((s) => ({
      hudDistance: Math.min(4.0, Math.max(1.2, s.hudDistance + delta)),
    })),
  toggleVrHud: () => set((s) => ({ showVrHud: !s.showVrHud })),
  toggleVoiceNav: () => set((s) => ({ voiceNav: !s.voiceNav })),
  toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
  setSpeedLimit: (v) => set({ speedLimitKmh: v }),
  setMergedInput: (input) => set({ vehicleInput: input }),
  toggleHeadlights: () => set((s) => ({ headlightsOn: !s.headlightsOn })),
  toggleHighBeam: () => set((s) => ({ highBeamOn: !s.highBeamOn })),
  toggleHazard: () => set((s) => ({ hazardOn: !s.hazardOn })),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setCharacterInput: (input) => set({ characterInputOverride: input }),
  requestEnterVehicle: () => set((s) => ({ enterRequestId: s.enterRequestId + 1 })),
  cameraMode: "fpv",
  transmissionMode: "automatic",
  handlingOverrides: { MOTOR: {}, MOBIL: {}, TRUK: {} },
  setVehicle: (v) => set({ vehicle: v }),
  setTransmissionMode: (m) => set({ transmissionMode: m }),
  // Mode "rear" (kamera belakang truk) hanya ada di urutan kamera TRUK;
  // kendaraan lain melewatinya sehingga [C] tetap menelusuri 3 mode biasa.
  cycleCameraMode: () =>
    set((s) => {
      const order: CameraMode[] =
        s.vehicle === "TRUK"
          ? CAMERA_MODE_ORDER
          : CAMERA_MODE_ORDER.filter((m) => m !== "rear");
      const nextIndex = (order.indexOf(s.cameraMode) + 1) % order.length;
      return { cameraMode: order[nextIndex] };
    }),
  startWalking: () =>
    set({ phase: "walking", entering: false, nearVehicleDoor: false }),
  setNearVehicleDoor: (v) => set({ nearVehicleDoor: v }),
  setEntering: (v) => set({ entering: v }),
  enterVehicle: () => set({ ...drivingReset }),
  startDriving: () => set({ ...drivingReset }),
  advanceIgnition: () =>
    set((s) => {
      const next = nextIgnitionStep(s.engineState, s.engineRunning);
      return next ? { engineState: next.state, engineRunning: next.running } : {};
    }),
  finishCranking: () => set({ engineState: "ON", engineRunning: true }),
  setSpeedKmh: (v) => set({ speedKmh: v }),
  setIsOffRoad: (v) => set({ isOffRoad: v }),
  registerViolation: (weight = 1) => set((s) => ({ violations: s.violations + weight })),
  registerOffRoadEvent: () => set((s) => ({ offRoadCount: s.offRoadCount + 1 })),
  registerObstacleHit: () => set((s) => ({ obstacleHits: s.obstacleHits + 1 })),
  tickElapsed: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),
  finish: (score) => set({ phase: "finished", score }),
  failSimulation: (reason) => set({ phase: "failed", failReason: reason }),
  setGearState: (gear, rpmRatio) => set({ gear, rpmRatio }),
  flashGearBlocked: () => set({ gearBlocked: true }),
  setHandlingParam: (vehicle, key, value) =>
    set((s) => ({
      handlingOverrides: {
        ...s.handlingOverrides,
        [vehicle]: { ...s.handlingOverrides[vehicle], [key]: value },
      },
    })),
  resetHandling: (vehicle) =>
    set((s) => ({
      handlingOverrides: { ...s.handlingOverrides, [vehicle]: {} },
    })),
  toggleHandbrake: () => set((s) => ({ handbrakeOn: !s.handbrakeOn })),
  toggleSeatbelt: () => set((s) => ({ seatbeltOn: !s.seatbeltOn })),
  toggleHelmet: () => set((s) => ({ helmetOn: !s.helmetOn })),
  toggleJacket: () => set((s) => ({ jacketOn: !s.jacketOn })),
  toggleGloves: () => set((s) => ({ glovesOn: !s.glovesOn })),
  toggleBoots: () => set((s) => ({ bootsOn: !s.bootsOn })),
  setTurnSignal: (dir) =>
    set((s) => ({
      turnSignal: s.turnSignal === dir ? "off" : dir,
      turnSignalUsedOnce: true,
    })),
  adjustSeatHeight: (delta) =>
    set((s) => ({
      seatHeightOffset: Math.min(
        SEAT_HEIGHT_RANGE,
        Math.max(-SEAT_HEIGHT_RANGE, s.seatHeightOffset + delta)
      ),
      seatAdjusted: true,
    })),
  triggerMirrorGlance: () => set({ mirrorGlanceAt: performance.now(), mirrorAdjusted: true }),
  markClutchedOnce: () => set((s) => (s.hasClutchedOnce ? {} : { hasClutchedOnce: true })),
  markGearOneEngaged: () => set((s) => (s.hasEngagedGearOne ? {} : { hasEngagedGearOne: true })),
  // Escalates to a stall once the driver has ground the gearbox too many
  // times in a row — mirrors how a real learner eventually kills the engine
  // by repeatedly forcing a shift without the clutch.
  registerClutchMistake: () =>
    set((s) => {
      const mistakes = s.clutchMistakes + 1;
      if (mistakes >= CLUTCH_MISTAKE_LIMIT) {
        return {
          clutchMistakes: 0,
          engineState: "OFF" as EngineState,
          engineRunning: false,
          activeWarning: "Mesin mati! Terlalu banyak kesalahan oper gigi tanpa kopling.",
        };
      }
      return { clutchMistakes: mistakes, activeWarning: "Injak kopling sebelum oper gigi!" };
    }),
  stallEngine: (reason) =>
    set({
      engineState: "OFF" as EngineState,
      engineRunning: false,
      clutchMistakes: 0,
      activeWarning: reason ?? "Mesin mati (stall)! Tekan [I] untuk menstarter ulang.",
    }),
  raiseWarning: (message) => set({ activeWarning: message }),
  clearWarning: () => set({ activeWarning: null }),
  setPedestrianCrossing: (id, state) =>
    set((s) => ({ pedestrianCrossings: { ...s.pedestrianCrossings, [id]: state } })),
  clearPedestrianCrossing: (id) =>
    set((s) => {
      if (!(id in s.pedestrianCrossings)) return {};
      const next = { ...s.pedestrianCrossings };
      delete next[id];
      return { pedestrianCrossings: next };
    }),
  // Reset ke layar pilih — mempertahankan pilihan cuaca pengguna
  // (reset() dipanggil tombol "Ganti Kendaraan").
  reset: () => set((s) => ({ ...initial, weather: s.weather })),
}));
