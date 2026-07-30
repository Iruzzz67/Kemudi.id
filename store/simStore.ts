import { create } from "zustand";
import { VehicleType } from "@/lib/vehicles";
import { HandlingOverrides, HandlingParamKey } from "@/lib/handling";
import { EngineState, nextIgnitionStep } from "@/lib/engine";

export type SimPhase = "selecting" | "walking" | "driving" | "finished" | "failed";
export type CameraMode = "tpv" | "fpv" | "topdown";
export type TransmissionMode = "manual" | "automatic";
export type TurnSignal = "off" | "left" | "right";
export type PedestrianCrossingState = { x: number; z: number; inRoad: boolean };

const CAMERA_MODE_ORDER: CameraMode[] = ["tpv", "fpv", "topdown"];
const CLUTCH_MISTAKE_LIMIT = 3;
const SEAT_HEIGHT_RANGE = 0.15; // m, clamp for [ / ] seat adjustment

type SimState = {
  phase: SimPhase;
  vehicle: VehicleType;
  speedKmh: number;
  violations: number;
  offRoadCount: number;
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
  clutchMistakes: number;
  activeWarning: string | null;
  failReason: string;
  pedestrianCrossings: Record<string, PedestrianCrossingState>;
  setVehicle: (v: VehicleType) => void;
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

const initial = {
  phase: "selecting" as SimPhase,
  vehicle: "MOBIL" as VehicleType,
  speedKmh: 0,
  violations: 0,
  offRoadCount: 0,
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
};

// Shared by startWalking's post-entry target and the "Coba Lagi" restart:
// both drop the player into the cabin with a cold, off engine, handbrake set,
// seatbelt off, and a clean checklist — a real re-entry, not a resume.
const drivingReset = {
  phase: "driving" as SimPhase,
  speedKmh: 0,
  violations: 0,
  offRoadCount: 0,
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
};

export const useSimStore = create<SimState>((set) => ({
  ...initial,
  cameraMode: "tpv",
  transmissionMode: "automatic",
  handlingOverrides: { MOTOR: {}, MOBIL: {}, TRUK: {} },
  setVehicle: (v) => set({ vehicle: v }),
  setTransmissionMode: (m) => set({ transmissionMode: m }),
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
  tickElapsed: (deltaMs) => set((s) => ({ elapsedMs: s.elapsedMs + deltaMs })),
  finish: (score) => set({ phase: "finished", score }),
  failSimulation: (reason) => set({ phase: "failed", failReason: reason }),
  cycleCameraMode: () =>
    set((s) => {
      const nextIndex = (CAMERA_MODE_ORDER.indexOf(s.cameraMode) + 1) % CAMERA_MODE_ORDER.length;
      return { cameraMode: CAMERA_MODE_ORDER[nextIndex] };
    }),
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
  reset: () => set({ ...initial }),
}));
