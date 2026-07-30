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
    maxSpeed: 26,
    reverseMaxSpeed: 4,
    acceleration: 9,
    braking: 12,
    friction: 3.5,
    wheelbase: 1.1,
    maxSteerAngle: 0.6,
    steerRate: 6,
    returnRate: 8,
    steerSmoothTime: 0.05,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.18,
    corneringDrag: 0.05,
    frontGrip: 1.0,
    rearGrip: 1.0,
    tireGrip: 9,
    leanAmount: 0.35,
    maxLeanAngle: 0.5,
    suspensionTravel: 0.05,
    suspensionStiffness: 45,
    suspensionDamping: 9,
    centerOfMassY: 0,
    antiRollForce: 5000,
    downforce: 0,
    angularDrag: 0,
    gearRatios: [3.0, 1.9, 1.35, 1.0],
    cameraDistance: 5,
    cameraHeight: 2.5,
  },
  MOBIL: {
    type: "MOBIL",
    label: "Mobil",
    description: "Seimbang antara kecepatan dan kendali.",
    color: "#3b82f6",
    dimensions: { width: 1.8, height: 1.4, length: 4.2 },
    maxSpeed: 22,
    reverseMaxSpeed: 6,
    acceleration: 6,
    braking: 9,
    friction: 2.5,
    wheelbase: 2.6,
    maxSteerAngle: 0.55,
    steerRate: 4.5,
    returnRate: 6,
    steerSmoothTime: 0.08,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.12,
    corneringDrag: 0.08,
    frontGrip: 1.0,
    rearGrip: 1.0,
    tireGrip: 9,
    leanAmount: 0.08,
    maxLeanAngle: 0.15,
    suspensionTravel: 0.06,
    suspensionStiffness: 55,
    suspensionDamping: 10,
    centerOfMassY: 0,
    antiRollForce: 5000,
    downforce: 0,
    angularDrag: 0,
    gearRatios: [3.4, 2.2, 1.6, 1.25, 1.0],
    cameraDistance: 8,
    cameraHeight: 3.2,
  },
  TRUK: {
    type: "TRUK",
    label: "Truk",
    description: "Besar dan berat, radius putar lebar, jarak rem panjang.",
    color: "#16a34a",
    dimensions: { width: 2.4, height: 2.6, length: 7.5 },
    maxSpeed: 16,
    reverseMaxSpeed: 4,
    acceleration: 3.2,
    braking: 4.5,
    friction: 1.8,
    wheelbase: 4.5,
    maxSteerAngle: 0.4,
    steerRate: 2,
    returnRate: 3,
    steerSmoothTime: 0.12,
    steerDeadZone: 0.05,
    speedSteerFalloff: 0.25,
    corneringDrag: 0.12,
    frontGrip: 1.0,
    rearGrip: 1.0,
    tireGrip: 6,
    leanAmount: 0.04,
    maxLeanAngle: 0.1,
    suspensionTravel: 0.1,
    suspensionStiffness: 32,
    suspensionDamping: 8,
    centerOfMassY: 0,
    antiRollForce: 5000,
    downforce: 0,
    angularDrag: 0,
    gearRatios: [4.2, 3.0, 2.3, 1.75, 1.3, 1.0],
    cameraDistance: 13,
    cameraHeight: 5,
  },
};

export const VEHICLE_ORDER: VehicleType[] = ["MOTOR", "MOBIL", "TRUK"];

// The visual lean/pitch/suspension group pivots around a point roughly at the
// vehicle's mid-height, not its base — otherwise rolling into a turn would
// swing the roof sideways instead of banking around the car's own center.
// Shared between GltfVehicleMesh (which builds the pivot) and
// VehicleController (which animates it) so the two never drift apart.
export const VISUAL_PIVOT_RATIO = 0.45;

export function pivotHeightOf(config: Pick<VehicleConfig, "dimensions">) {
  return config.dimensions.height * VISUAL_PIVOT_RATIO;
}
