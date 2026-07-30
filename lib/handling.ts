import { VehicleConfig } from "@/lib/vehicles";

export type HandlingOverrides = Partial<
  Pick<
    VehicleConfig,
    | "maxSteerAngle"
    | "steerRate"
    | "returnRate"
    | "steerSmoothTime"
    | "steerDeadZone"
    | "frontGrip"
    | "rearGrip"
    | "tireGrip"
    | "corneringDrag"
    | "friction"
    | "suspensionTravel"
    | "suspensionStiffness"
    | "suspensionDamping"
    | "maxSpeed"
    | "acceleration"
    | "braking"
    | "reverseMaxSpeed"
    | "centerOfMassY"
    | "antiRollForce"
    | "downforce"
    | "angularDrag"
  >
>;

export type HandlingParamKey = keyof HandlingOverrides;

export type HandlingParam = {
  key: HandlingParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Convert the stored (radians/m-s) value to the display unit, e.g. rad -> deg. */
  toDisplay?: (v: number) => number;
  fromDisplay?: (v: number) => number;
  note?: string;
};

export type HandlingGroup = {
  title: string;
  params: HandlingParam[];
};

const RAD_TO_DEG = 180 / Math.PI;

export const HANDLING_GROUPS: HandlingGroup[] = [
  {
    title: "Steering",
    params: [
      {
        key: "maxSteerAngle",
        label: "Max Steering Angle",
        unit: "°",
        min: 10,
        max: 50,
        step: 1,
        toDisplay: (v) => Math.round(v * RAD_TO_DEG),
        fromDisplay: (v) => v / RAD_TO_DEG,
      },
      { key: "steerRate", label: "Steering Speed", min: 1, max: 12, step: 0.1 },
      { key: "returnRate", label: "Return Speed", min: 1, max: 14, step: 0.1 },
      {
        key: "steerSmoothTime",
        label: "Steering Smooth Time",
        unit: "s",
        min: 0,
        max: 0.3,
        step: 0.01,
      },
      {
        key: "steerDeadZone",
        label: "Steering Dead Zone",
        min: 0,
        max: 0.2,
        step: 0.01,
        note: "Hanya berlaku untuk input analog (gamepad/setir) — kontrol keyboard tidak terpengaruh.",
      },
    ],
  },
  {
    title: "Ban",
    params: [
      {
        key: "frontGrip",
        label: "Front Grip",
        min: 0.5,
        max: 3,
        step: 0.05,
        note: "Mengalikan ketajaman belok (yaw rate) — makin tinggi, mobil makin cepat 'menggigit' saat setir dibelokkan.",
      },
      {
        key: "tireGrip",
        label: "Tire Grip (Traksi)",
        unit: "m/s²",
        min: 3,
        max: 20,
        step: 0.5,
        note: "Batas gaya tikung maksimum ban sebelum understeer. Di bawah batas ini mobil menikung tanpa selip sama sekali — makin tinggi, makin bisa menikung tajam di kecepatan tinggi tanpa kehilangan grip.",
      },
      {
        key: "rearGrip",
        label: "Rear Grip",
        min: 0.5,
        max: 3,
        step: 0.05,
        note: "Hanya berlaku saat Tire Grip terlampaui — makin tinggi, makin sedikit selip buritan yang terjadi (buritan lebih stabil).",
      },
      {
        key: "corneringDrag",
        label: "Side Friction",
        min: 0,
        max: 1,
        step: 0.01,
        note: "Kecepatan yang hilang akibat ban benar-benar selip (hanya aktif saat Tire Grip terlampaui) — tidak lagi berkurang pada tikungan normal.",
      },
      { key: "friction", label: "Wheel Damping Rate", min: 0.5, max: 6, step: 0.1 },
    ],
  },
  {
    title: "Suspensi",
    params: [
      {
        key: "suspensionTravel",
        label: "Suspension Distance",
        unit: "m",
        min: 0,
        max: 0.3,
        step: 0.01,
      },
      { key: "suspensionStiffness", label: "Spring", min: 5, max: 100, step: 1 },
      { key: "suspensionDamping", label: "Damper", min: 1, max: 20, step: 0.5 },
    ],
  },
  {
    title: "Mesin",
    params: [
      {
        key: "maxSpeed",
        label: "Max Speed",
        unit: "km/jam",
        min: 20,
        max: 220,
        step: 1,
        toDisplay: (v) => Math.round(v * 3.6),
        fromDisplay: (v) => v / 3.6,
      },
      { key: "acceleration", label: "Acceleration", min: 1, max: 15, step: 0.1 },
      { key: "braking", label: "Brake Force", min: 1, max: 20, step: 0.1 },
      {
        key: "reverseMaxSpeed",
        label: "Reverse Speed",
        unit: "km/jam",
        min: 5,
        max: 40,
        step: 1,
        toDisplay: (v) => Math.round(v * 3.6),
        fromDisplay: (v) => v / 3.6,
      },
    ],
  },
  {
    title: "Stabilitas",
    params: [
      { key: "centerOfMassY", label: "Center of Mass (Y)", min: -1, max: 0.3, step: 0.01 },
      { key: "antiRollForce", label: "Anti Roll Force", min: 1000, max: 12000, step: 100 },
      { key: "downforce", label: "Downforce", min: 0, max: 300, step: 5 },
      { key: "angularDrag", label: "Angular Drag", min: 0, max: 8, step: 0.1 },
    ],
  },
];

export function mergeHandling(base: VehicleConfig, overrides: HandlingOverrides): VehicleConfig {
  return { ...base, ...overrides };
}
