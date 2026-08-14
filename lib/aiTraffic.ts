// ══════════════════════════════════════════════════════════════════════════
//  AI KENDARAAN (lalu lintas bergerak)
// ══════════════════════════════════════════════════════════════════════════
//  Kendaraan AI melaju searah pemain (dari z=+8 menuju z=-900) mengikuti
//  tengah jalan, di jalur kiri/kanan (offset ±2 m). Perilaku:
//   - berhenti di lampu merah (fase lampu dibaca dari lib/trafficLight.ts)
//   - menyalip ketika terhalang kendaraan lambat di jalurnya
//   - memberi jalan ke pemain & pejalan kaki yang sedang menyeberang
//   - kendaraan darurat (ambulans/polisi/pemadam) punya prioritas + lampu
//     berkedip; beberapa spawn dengan startDelay (parkir dulu, lalu bergerak)
//  Semua posisi disimpan sebagai progres Z sepanjang lintasan — sama seperti
//  pemain — sehingga mudah mengikuti tikungan via getSampleNearZ.

import { TRAFFIC_LIGHT_ZS } from "./track";

export type AiVehicleKind =
  | "mobil"
  | "motor"
  | "truk"
  | "bus"
  | "ambulans"
  | "polisi"
  | "pemadam";

export type AiVehicleSpec = {
  kind: AiVehicleKind;
  label: string;
  color: string;
  accent: string;
  width: number;
  height: number;
  length: number;
  /** Kecepatan jelajah (m/s) di jalan lurus. */
  speed: number;
  emergency?: boolean;
};

export const AI_SPECS: Record<AiVehicleKind, AiVehicleSpec> = {
  mobil: {
    kind: "mobil",
    label: "Mobil",
    color: "#cbd5e1",
    accent: "#475569",
    width: 1.8,
    height: 1.4,
    length: 4.3,
    speed: 9,
  },
  motor: {
    kind: "motor",
    label: "Motor",
    color: "#f97316",
    accent: "#1e293b",
    width: 0.7,
    height: 1.2,
    length: 1.9,
    speed: 11.5,
  },
  truk: {
    kind: "truk",
    label: "Truk",
    color: "#16a34a",
    accent: "#14532d",
    width: 2.4,
    height: 2.6,
    length: 7.5,
    speed: 7,
  },
  bus: {
    kind: "bus",
    label: "Bus",
    color: "#f59e0b",
    accent: "#78350f",
    width: 2.5,
    height: 3.0,
    length: 9,
    speed: 8,
  },
  ambulans: {
    kind: "ambulans",
    label: "Ambulans",
    color: "#f8fafc",
    accent: "#dc2626",
    width: 2.0,
    height: 2.2,
    length: 5.2,
    speed: 13,
    emergency: true,
  },
  polisi: {
    kind: "polisi",
    label: "Polisi",
    color: "#1e293b",
    accent: "#f8fafc",
    width: 1.9,
    height: 1.6,
    length: 4.6,
    speed: 12,
    emergency: true,
  },
  pemadam: {
    kind: "pemadam",
    label: "Pemadam Kebakaran",
    color: "#dc2626",
    accent: "#fef3c7",
    width: 2.4,
    height: 2.8,
    length: 8,
    speed: 10,
    emergency: true,
  },
};

export type AiSpawn = {
  id: string;
  kind: AiVehicleKind;
  /** Progres Z awal (bergerak menuju -∞). */
  z: number;
  /** -1 = jalur kiri, +1 = jalur kanan (offset lateral ±2 m). */
  lane: -1 | 1;
  /** Detik sebelum kendaraan mulai bergerak (parkir dulu). */
  startDelay?: number;
  speedFactor?: number;
};

/** Posisi Z lampu lalu lintas — AI berhenti di sini saat merah/kuning. */
export { TRAFFIC_LIGHT_ZS };

// Spawn tersebar di seluruh lintasan, berselang-seling jalur. Kendaraan
// darurat memulai dengan startDelay (parkir → lalu bergerak, sesuai perilaku
// "parkir" pada AI), sisanya langsung melaju.
export const AI_SPAWNS: AiSpawn[] = [
  { id: "ai-1", kind: "mobil", z: -45, lane: 1 },
  { id: "ai-2", kind: "motor", z: -95, lane: -1, speedFactor: 1.15 },
  { id: "ai-3", kind: "bus", z: -145, lane: 1 },
  { id: "ai-4", kind: "mobil", z: -265, lane: -1 },
  { id: "ai-5", kind: "truk", z: -330, lane: 1 },
  { id: "ai-6", kind: "ambulans", z: -415, lane: 1, startDelay: 6, speedFactor: 1.3 },
  { id: "ai-7", kind: "mobil", z: -470, lane: -1 },
  { id: "ai-8", kind: "polisi", z: -555, lane: 1, startDelay: 3, speedFactor: 1.2 },
  { id: "ai-9", kind: "motor", z: -610, lane: -1 },
  { id: "ai-10", kind: "pemadam", z: -700, lane: -1, startDelay: 8, speedFactor: 1.15 },
  { id: "ai-11", kind: "mobil", z: -770, lane: 1 },
  { id: "ai-12", kind: "truk", z: -835, lane: -1 },
];

/** Offset lateral (m) dari tengah jalan untuk tiap jalur. */
export const AI_LANE_OFFSET = 2.0;

/** Jarak aman antar kendaraan AI (m). */
export const AI_FOLLOW_DISTANCE = 14;
/** Jarak pandang untuk menyalip (m). */
export const AI_OVERTAKE_LOOKAHEAD = 22;
/** Jarak berhenti sebelum lampu merah (m). */
export const AI_STOP_MARGIN = 2.5;
