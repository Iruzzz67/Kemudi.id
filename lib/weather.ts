// ══════════════════════════════════════════════════════════════════════════
//  SISTEM CUACA DINAMIS
// ══════════════════════════════════════════════════════════════════════════
//  Tiap cuaca punya konfigurasi visual (warna langit, kabut, intensitas
//  matahari) DAN efek handling (grip ban, friction) — hujan membuat jalan
//  licin, kabut membatasi jarak pandang, malam meredupkan pencahayaan.
//  Dipilih pemain di layar pilih kendaraan, lalu dibaca oleh Scene
//  (atmosfer), WeatherEffects (hujan), dan VehicleController (grip).

export type WeatherKind =
  | "cerah"
  | "berawan"
  | "hujan-ringan"
  | "hujan-deras"
  | "kabut"
  | "senja"
  | "malam";

export type WeatherConfig = {
  id: WeatherKind;
  label: string;
  emoji: string;
  /** Warna background scene (langit). */
  sky: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  /** 0..1 — kepadatan partikel hujan. */
  rainIntensity: number;
  /** Mode malam — lampu kendaraan jauh lebih penting. */
  night: boolean;
  /** Pengali grip ban (<1 = jalan licin). */
  gripMultiplier: number;
  /** Pengali decel natural (friction) — jalan basah lebih tahan. */
  frictionMultiplier: number;
};

export const WEATHERS: Record<WeatherKind, WeatherConfig> = {
  cerah: {
    id: "cerah",
    label: "Cerah",
    emoji: "☀️",
    sky: "#bae6fd",
    fogColor: "#bae6fd",
    fogNear: 60,
    fogFar: 480,
    sunIntensity: 1.2,
    sunColor: "#ffffff",
    ambientIntensity: 0.6,
    rainIntensity: 0,
    night: false,
    gripMultiplier: 1,
    frictionMultiplier: 1,
  },
  berawan: {
    id: "berawan",
    label: "Berawan",
    emoji: "☁️",
    sky: "#94a3b8",
    fogColor: "#a8a29e",
    fogNear: 50,
    fogFar: 400,
    sunIntensity: 0.75,
    sunColor: "#f8fafc",
    ambientIntensity: 0.55,
    rainIntensity: 0,
    night: false,
    gripMultiplier: 1,
    frictionMultiplier: 1,
  },
  "hujan-ringan": {
    id: "hujan-ringan",
    label: "Hujan Ringan",
    emoji: "🌦️",
    sky: "#64748b",
    fogColor: "#64748b",
    fogNear: 45,
    fogFar: 220,
    sunIntensity: 0.45,
    sunColor: "#cbd5e1",
    ambientIntensity: 0.5,
    rainIntensity: 0.4,
    night: false,
    gripMultiplier: 0.82,
    frictionMultiplier: 1.15,
  },
  "hujan-deras": {
    id: "hujan-deras",
    label: "Hujan Deras",
    emoji: "🌧️",
    sky: "#334155",
    fogColor: "#3b4a63",
    fogNear: 28,
    fogFar: 130,
    sunIntensity: 0.25,
    sunColor: "#cbd5e1",
    ambientIntensity: 0.4,
    rainIntensity: 0.85,
    night: false,
    gripMultiplier: 0.65,
    frictionMultiplier: 1.3,
  },
  kabut: {
    id: "kabut",
    label: "Kabut",
    emoji: "🌫️",
    sky: "#cbd5e1",
    fogColor: "#d6d3d1",
    fogNear: 16,
    fogFar: 80,
    sunIntensity: 0.5,
    sunColor: "#f1f5f9",
    ambientIntensity: 0.5,
    rainIntensity: 0,
    night: false,
    gripMultiplier: 1,
    frictionMultiplier: 1,
  },
  senja: {
    id: "senja",
    label: "Matahari Terbenam",
    emoji: "🌇",
    sky: "#fb923c",
    fogColor: "#fdba74",
    fogNear: 40,
    fogFar: 260,
    sunIntensity: 0.65,
    sunColor: "#ffd9a0",
    ambientIntensity: 0.5,
    rainIntensity: 0,
    night: false,
    gripMultiplier: 1,
    frictionMultiplier: 1,
  },
  malam: {
    id: "malam",
    label: "Malam",
    emoji: "🌙",
    sky: "#0b1026",
    fogColor: "#0b1026",
    fogNear: 30,
    fogFar: 160,
    sunIntensity: 0.06,
    sunColor: "#8fb7ff",
    ambientIntensity: 0.18,
    rainIntensity: 0,
    night: true,
    gripMultiplier: 1,
    frictionMultiplier: 1,
  },
};

export const WEATHER_ORDER: WeatherKind[] = [
  "cerah",
  "berawan",
  "hujan-ringan",
  "hujan-deras",
  "kabut",
  "senja",
  "malam",
];
