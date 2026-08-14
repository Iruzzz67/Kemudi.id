// ══════════════════════════════════════════════════════════════════════════
//  SISTEM ACHIEVEMENT
// ══════════════════════════════════════════════════════════════════════════
//  Achievement disimpan di localStorage (bertahan antar sesi) dan dibuka
//  oleh kondisi-kondisi yang dicek di VehicleController / FinishedScreen.

export type AchievementDef = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-drive",
    label: "Perjalanan Pertama",
    description: "Selesaikan satu simulasi sampai garis finish.",
    icon: "🏁",
  },
  {
    id: "clean-run",
    label: "Pengemudi Hati-hati",
    description: "Finish tanpa menabrak rintangan dan tanpa keluar jalur.",
    icon: "🛡️",
  },
  {
    id: "no-violations",
    label: "Patuh Lalu Lintas",
    description: "Finish tanpa pelanggaran sama sekali.",
    icon: "🚦",
  },
  {
    id: "par-time",
    label: "Tepat Waktu",
    description: "Finish dalam waktu par (±120 detik).",
    icon: "⏱️",
  },
  {
    id: "all-vehicles",
    label: "Kolektor Kendaraan",
    description: "Selesaikan simulasi dengan motor, mobil, dan truk.",
    icon: "🚗",
  },
  {
    id: "night-driver",
    label: "Pengendara Malam",
    description: "Finish saat cuaca malam atau matahari terbenam.",
    icon: "🌙",
  },
  {
    id: "speed-demon",
    label: "Kebut di Jalan",
    description: "Melaju 65 km/j atau lebih (mendekati kecepatan maksimum 70 km/j).",
    icon: "💨",
  },
];

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

const STORAGE_KEY = "kemudi_achievements";

export function loadUnlockedAchievements(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveUnlockedAchievements(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota/private-mode errors
  }
}

// Kendaraan yang pernah diselesaikan (untuk achievement "Kolektor Kendaraan").
const VEHICLES_KEY = "kemudi_finished_vehicles";

export function loadFinishedVehicles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VEHICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveFinishedVehicles(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VEHICLES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}
