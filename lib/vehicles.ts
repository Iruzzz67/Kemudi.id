export type VehicleType = "MOTOR" | "MOBIL" | "TRUK";

export type VehicleConfig = {
  type: VehicleType;
  label: string;
  description: string;
  color: string;
  dimensions: { width: number; height: number; length: number };
  maxSpeed: number; // m/s
  reverseMaxSpeed: number; // m/s
  acceleration: number; // m/s^2
  braking: number; // m/s^2
  friction: number; // m/s^2, natural deceleration when idle ("Wheel Damping Rate")
  wheelbase: number; // m, distance between front/rear axle (drives turning radius)
  maxSteerAngle: number; // rad, maximum steering angle at rest
  steerRate: number; // rad/s, how fast the steering angle reaches its target
  returnRate: number; // rad/s, how fast the steering angle returns to center
  steerSmoothTime: number; // s, extra exponential smoothing applied on top of the rate limiter
  steerDeadZone: number; // 0-1, reserved for analog input devices (gamepad/wheel) — keyboard input is digital and ignores this
  speedSteerFalloff: number; // how much the effective steering angle shrinks as speed rises (stability)
  corneringDrag: number; // "Side Friction" — speed lost per second while the tires are actually slipping (grip exceeded), scaled by slip speed
  frontGrip: number; // multiplier on the bicycle model's ideal yaw rate (turn-in sharpness); 1.0 = neutral
  rearGrip: number; // higher = the rear resists lateral slip more once tireGrip is exceeded (more planted); 1.0 = neutral
  tireGrip: number; // m/s^2, max lateral (centripetal) acceleration the tires can generate before understeering — the "friction circle" ceiling
  leanAmount: number; // visual body roll/pitch gain when turning/braking
  maxLeanAngle: number; // rad, clamp on the visual roll/pitch above
  suspensionTravel: number; // m, max vertical body bob amplitude
  suspensionStiffness: number; // spring constant driving how fast the bob springs back
  suspensionDamping: number; // damper constant driving how quickly the bob settles
  centerOfMassY: number; // -1..0, more negative = lower center of mass = less body roll
  antiRollForce: number; // higher = less body roll (baseline neutral point is 5000)
  downforce: number; // 0+, higher = steering stays sharper at high speed
  angularDrag: number; // 0+, higher = smoother/slower steering response
  gearRatios: number[]; // descending, last gear is always 1.0 (matches top speed)
  // Bahan bakar: kapasitas tangki (L), konsumsi per km (L/km) dan idle per
  // detik (L/s) — dipakai Trip Computer & Eco Driving Score.
  tankCapacityL: number;
  fuelConsumptionLperKm: number;
  idleConsumptionLperSec: number;
  // Fraction of the vehicle's total height where the driver's eyes sit
  // (FPV camera / VR origin). Trucks are much lower than their total box
  // height — 0.85× would put the camera on the roof of a 2.6 m truck.
  seatEyeHeightRatio: number;
  cameraDistance: number;
  cameraHeight: number;
};

export const VEHICLES: Record<VehicleType, VehicleConfig> = {
  MOTOR: {
    type: "MOTOR",
    label: "Motor",
    description: "Lincah dan cepat, tapi sempit dan rawan oleng.",
    color: "#f97316",
    dimensions: { width: 0.6, height: 1.1, length: 1.8 },
    maxSpeed: 19.44, // 70 km/j (batas maksimum semua kendaraan)
    reverseMaxSpeed: 4,
    // Akselerasi sengaja DIPERLAMBAT (permintaan tuning): 0→50 km/j kini
    // ±4,6 detik (mode otomatis), bukan ~1,7 detik — terasa seperti motor
    // bebek sungguhan, bukan motor balap. Manual: gigi 1 ×√2,7 ≈ 4,9 m/s².
    acceleration: 3.0,
    braking: 10.5,
    friction: 3,
    wheelbase: 1.2,
    maxSteerAngle: 0.55,
    steerRate: 7,
    returnRate: 9,
    steerSmoothTime: 0.04,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.14,
    corneringDrag: 0.06,
    frontGrip: 1.0,
    rearGrip: 1.0,
    tireGrip: 10.5,
    leanAmount: 0.45,
    maxLeanAngle: 0.6,
    suspensionTravel: 0.05,
    suspensionStiffness: 45,
    suspensionDamping: 9,
    centerOfMassY: -0.06,
    antiRollForce: 6000,
    downforce: 0,
    angularDrag: 0,
    gearRatios: [2.7, 1.85, 1.35, 1.0],
    tankCapacityL: 4,
    fuelConsumptionLperKm: 0.03, // ±33 km/L (bebek irit)
    idleConsumptionLperSec: 0.0005,
    seatEyeHeightRatio: 0.85,
    cameraDistance: 5,
    cameraHeight: 2.5,
  },
  MOBIL: {
    type: "MOBIL",
    label: "Mobil",
    description: "Seimbang antara kecepatan dan kendali.",
    color: "#3b82f6",
    // F1 road car rendah: tinggi collider 1.05 m (bukan 1.4 m) supaya mata
    // FPV/VR (height × seatEyeHeightRatio ≈ 0.89 m) berada di dalam kabin,
    // bukan melayang di atas atap model yang hanya ± 0.98 m.
    dimensions: { width: 1.8, height: 1.05, length: 4.2 },
    maxSpeed: 19.44, // 70 km/j (batas maksimum semua kendaraan)
    reverseMaxSpeed: 6,
    // Akselerasi DIPERLAMBAT (permintaan tuning): 0→50 km/j kini ±5,6 detik
    // (mode otomatis), bukan ~2,1 detik — tarikan sedan yang tenang dan
    // terkendali, pas untuk belajar. Manual: gigi 1 ×√3,4 ≈ 4,6 m/s².
    acceleration: 2.5,
    braking: 9.5,
    friction: 2.2,
    wheelbase: 2.6,
    maxSteerAngle: 0.5,
    steerRate: 5,
    returnRate: 6.5,
    steerSmoothTime: 0.07,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.1,
    corneringDrag: 0.07,
    frontGrip: 1.05,
    rearGrip: 1.1,
    tireGrip: 10,
    leanAmount: 0.1,
    maxLeanAngle: 0.15,
    suspensionTravel: 0.06,
    suspensionStiffness: 60,
    suspensionDamping: 10.5,
    centerOfMassY: -0.04,
    antiRollForce: 6000,
    downforce: 60,
    angularDrag: 0.6,
    gearRatios: [3.4, 2.2, 1.6, 1.25, 1.0],
    tankCapacityL: 45,
    fuelConsumptionLperKm: 0.07, // ±14 km/L (sedan efisien)
    idleConsumptionLperSec: 0.0025,
    seatEyeHeightRatio: 0.85,
    cameraDistance: 8,
    cameraHeight: 3.2,
  },
  TRUK: {
    type: "TRUK",
    label: "Truk",
    description: "Besar dan berat, radius putar lebar, jarak rem panjang.",
    color: "#16a34a",
    dimensions: { width: 2.4, height: 2.6, length: 7.5 },
    maxSpeed: 19.44, // 70 km/j (batas maksimum semua kendaraan)
    reverseMaxSpeed: 4,
    // Akselerasi DIPERLAMBAT jauh (permintaan tuning): 0→50 km/j kini ±11,6
    // detik (mode otomatis), bukan ~4,6 detik — truk box bermuatan yang
    // berat dan realistis. Manual: gigi 1 ×√4,2 ≈ 2,5 m/s².
    acceleration: 1.2,
    braking: 5.2,
    friction: 2.0,
    wheelbase: 4.5,
    maxSteerAngle: 0.36,
    steerRate: 2.2,
    returnRate: 3.2,
    steerSmoothTime: 0.12,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.3,
    corneringDrag: 0.12,
    frontGrip: 1.0,
    rearGrip: 1.15,
    tireGrip: 6.5,
    leanAmount: 0.05,
    maxLeanAngle: 0.1,
    suspensionTravel: 0.12,
    suspensionStiffness: 34,
    suspensionDamping: 8,
    centerOfMassY: -0.08,
    antiRollForce: 8000,
    downforce: 0,
    angularDrag: 2.5,
    gearRatios: [4.2, 3.0, 2.3, 1.75, 1.3, 1.0],
    tankCapacityL: 120,
    fuelConsumptionLperKm: 0.17, // ±6 km/L (truk box bermuatan)
    idleConsumptionLperSec: 0.003,
    seatEyeHeightRatio: 0.7,
    cameraDistance: 13,
    cameraHeight: 5,
  },
};

export const VEHICLE_ORDER: VehicleType[] = ["MOTOR", "MOBIL", "TRUK"];

// ══════════════════════════════════════════════════════════════════════════
//  VARIASI KENDARAAN
//  Hanya 1 varian per kendaraan (permintaan penyederhanaan): varian lain
//  (sport/matic/sedan/SUV/MPV/tangki/dll.) dihapus. Struktur tipe tetap
//  dipertahankan karena dipakai komponen rendering (defaultVariant).
// ══════════════════════════════════════════════════════════════════════════

export type VehicleVariantKey = "bebek" | "sedan" | "box";

export type VehicleVariant = {
  id: VehicleVariantKey;
  label: string;
  emoji: string;
  color: string;
  description: string;
  /** GLB khusus varian — jika ada, dipakai menggantikan model default. */
  glb?: string;
  /** Penyesuaian spec terhadap konfigurasi dasar VehicleConfig. */
  specOverrides?: Partial<VehicleConfig>;
};

export const VEHICLE_VARIANTS: Record<VehicleType, VehicleVariant[]> = {
  MOTOR: [
    {
      id: "bebek",
      label: "Bebek",
      emoji: "🛵",
      color: "#f97316",
      description: "Irit, lincah, dan nyaman untuk harian.",
    },
  ],
  MOBIL: [
    {
      id: "sedan",
      label: "Sedan",
      emoji: "🚗",
      color: "#3b82f6",
      description: "Seimbang antara kenyamanan dan handling.",
      glb: "/models/f1roadcar.glb",
    },
  ],
  TRUK: [
    {
      id: "box",
      label: "Box",
      emoji: "🚚",
      color: "#16a34a",
      description: "Kargo tertutup untuk distribusi barang.",
      glb: "/models/truckww2.glb",
    },
  ],
};

export function defaultVariant(type: VehicleType): VehicleVariant {
  return VEHICLE_VARIANTS[type][0];
}

// Fraction of the vehicle's total height where the physical dashboard sits
// (measured from the ground). The dashboard is a fixed object in the cabin,
// while the driver's eyes sit at seatEyeHeightRatio — so the VR dashboard's
// offset below the eyes is (dash height) - (eye height), computed dynamically
// to stay aligned with the current seat height instead of a magic constant.
export const DASHBOARD_HEIGHT_RATIO: Record<VehicleType, number> = {
  MOTOR: 0.62,
  MOBIL: 0.64,
  TRUK: 0.55,
};

// Vertical offset (in the driver's local frame, negative = below the eyes)
// at which a cabin dashboard / VR control panel should be placed so it sits
// at the physical dashboard height no matter what the seat height is.
export function dashboardOffsetY(config: Pick<VehicleConfig, "type" | "dimensions" | "seatEyeHeightRatio">) {
  return (
    config.dimensions.height * DASHBOARD_HEIGHT_RATIO[config.type] -
    config.dimensions.height * config.seatEyeHeightRatio
  );
}

// Sisi kursi pengemudi terhadap sumbu X kendaraan, dalam kerangka lokal
// kendaraan: +1 = setir kanan (RHD, standar Indonesia: pengemudi di +X),
// -1 = setir kiri (LHD: pengemudi di -X). truckww2.glb adalah truk militer
// dengan kabin setir kiri, jadi untuk TRUK pengemudi berada di sisi kiri.
// Dipakai bersama oleh seatHorizontalOffset, spawn karakter, posisi pintu,
// dan panel VR supaya semuanya konsisten di sisi yang sama.
export function driverSideX(config: Pick<VehicleConfig, "type">): 1 | -1 {
  return config.type === "TRUK" ? -1 : 1;
}

// FPV driver's seat position (x, z) relative to the vehicle's center, in the
// vehicle's local frame (-Z = forward). Shared by CameraRig (FPV camera),
// CabinAnchor (VR dashboard/control panel), and anything else that needs the
// driver's eye point — so the camera and the VR cockpit can never drift apart.
export function seatHorizontalOffset(config: Pick<VehicleConfig, "type" | "dimensions">) {
  let fpvX = 0;
  let fpvZ = -config.dimensions.length * 0.15;
  if (config.type === "MOBIL") {
    // f1roadcar.glb membentuk kabin yang lebih rendah dan lebih kompak daripada
    // BMW. Pengemudi duduk sedikit lebih ke tengah dan agak ke belakang agar
    // mata tetap berada di dalam kabin, tanpa menabrak dashboard atau kaca.
    // Nilai ini disesuaikan dengan proporsi f1roadcar yang panjang dan rendah.
    fpvX = -config.dimensions.width * 0.09;
    fpvZ = config.dimensions.length * 0.02;
  } else if (config.type === "TRUK") {
    // Truk (truckww2.glb): kabin di depan, pengemudi tetap di depan kabin.
    fpvX = driverSideX(config) * config.dimensions.width * 0.13;
    fpvZ = -config.dimensions.length * 0.1;
  } else if (config.type === "MOTOR") {
    // Pengendara motor duduk di tengah (fpvX 0), badan condong ke tangki.
    fpvX = 0;
    fpvZ = 0;
  }
  return { x: fpvX, z: fpvZ };
}

// The visual lean/pitch/suspension group pivots around a point roughly at the
// vehicle's mid-height, not its base — otherwise rolling into a turn would
// swing the roof sideways instead of banking around the car's own center.
// Shared between GltfVehicleMesh (which builds the pivot) and
// VehicleController (which animates it) so the two never drift apart.
export const VISUAL_PIVOT_RATIO = 0.45;

export function pivotHeightOf(config: Pick<VehicleConfig, "dimensions">) {
  return config.dimensions.height * VISUAL_PIVOT_RATIO;
}
