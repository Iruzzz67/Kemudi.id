// ─── XRInputAdapter — satu bentuk input untuk SEMUA perangkat ───────────────
//
//   Quest / Pico / Vive / Index / WMR / gamepad desktop
//                        │
//                        ▼
//              XRInputAdapter (file ini)
//                        │  UniversalInput
//                        ▼
//              XRControlsMap → InputManager → VehicleController → physics
//
// Aturan yang dipegang file ini:
//
//  1. TIDAK ADA cabang "if headset == Quest". Perangkat dikenali lewat
//     *profile controller* (`inputSource.profiles`), bukan nama headset, jadi
//     headset baru otomatis didukung selama memakai profil `xr-standard`.
//  2. TIDAK ADA pembacaan indeks tombol gamepad mentah untuk jalur WebXR.
//     Index `buttons[1]`/`axes[2]` berbeda-beda per perangkat; yang dipakai
//     adalah nama komponen ternormalisasi @pmndrs/xr (`xr-standard-trigger`,
//     dst.) dengan daftar fallback di bawah.
//  3. Gamepad desktop (USB/Bluetooth) ikut dinormalisasi ke bentuk yang SAMA,
//     sehingga logika pemetaan tombol hanya ditulis sekali di XRControlsMap.
//  4. Kemampuan perangkat dilaporkan lewat `caps` supaya pemetaan bisa
//     adaptif: headset tanpa tombol A/B/X/Y (Vive, sebagian WMR) memindahkan
//     fungsi tambahannya ke Panel VR, bukan gagal diam-diam.

export type GamepadComponent = {
  state: "default" | "touched" | "pressed";
  button?: number;
  xAxis?: number;
  yAxis?: number;
};

type XRGamepadState = Record<string, GamepadComponent | undefined>;

/** Bentuk minimal state controller dari `useXRInputSourceState("controller", …)`. */
export type XRControllerLike = {
  gamepad?: XRGamepadState;
  inputSource?: { profiles?: readonly string[] };
} | null | undefined;

/** Urutan prioritas profil controller (dokumen "Universal VR Compatibility"). */
export const CONTROLLER_PROFILE_PRIORITY = [
  "generic-trigger-squeeze-thumbstick", // profil inti "xr-standard"
  "oculus-touch",
  "valve-index",
  "htc-vive",
  "pico",
  "windows-mixed-reality",
  "generic-gamepad",
] as const;

// Nama komponen bisa berbeda antar profil; ambil yang pertama tersedia.
const TRIGGER_KEYS = ["xr-standard-trigger", "trigger"];
const SQUEEZE_KEYS = ["xr-standard-squeeze", "squeeze", "grasp"];
const THUMBSTICK_KEYS = ["xr-standard-thumbstick", "thumbstick"];
const TOUCHPAD_KEYS = ["xr-standard-touchpad", "touchpad"];
const MENU_KEYS = ["menu", "xr-standard-menu", "options", "system"];
// Tombol muka: A/B di tangan kanan, X/Y di tangan kiri (Index memakai a/b di
// kedua tangan, maka kiri pun ikut mencoba a-/b-button sebagai cadangan).
const PRIMARY_KEYS_RIGHT = ["a-button"];
const SECONDARY_KEYS_RIGHT = ["b-button"];
const PRIMARY_KEYS_LEFT = ["x-button", "a-button"];
const SECONDARY_KEYS_LEFT = ["y-button", "b-button"];

const DEADZONE = 0.12;

function pick(gamepad: XRGamepadState | undefined, keys: string[]): GamepadComponent | undefined {
  if (!gamepad) return undefined;
  for (const key of keys) {
    const c = gamepad[key];
    if (c) return c;
  }
  return undefined;
}

/** Nilai analog 0..1; profil tanpa sumbu analog jatuh ke status `pressed`. */
function analog(c?: GamepadComponent): number {
  if (!c) return 0;
  const v = c.button ?? 0;
  if (v > 0) return Math.min(1, v);
  return c.state === "pressed" ? 1 : 0;
}

function deadzone(v: number): number {
  return Math.abs(v) < DEADZONE ? 0 : v;
}

/** Satu tangan dalam bentuk yang tidak bergantung perangkat. */
export type UniversalHand = {
  connected: boolean;
  profile: string;
  trigger: number; // 0..1
  grip: number; // 0..1
  stickX: number; // -1..1 (kiri negatif)
  stickY: number; // -1..1 (maju negatif, sesuai konvensi WebXR)
  stickPressed: boolean;
  primary: boolean; // A (kanan) / X (kiri)
  secondary: boolean; // B (kanan) / Y (kiri)
  menu: boolean;
  caps: {
    faceButtons: boolean; // punya A/B/X/Y?
    thumbstick: boolean;
    touchpad: boolean;
    menu: boolean;
  };
};

export type UniversalInput = {
  /** Dari mana input datang — dipakai untuk aturan prioritas & UI bantuan. */
  source: "xr-controller" | "gamepad";
  left: UniversalHand;
  right: UniversalHand;
  /** Ada tombol muka lengkap di salah satu tangan → semua shortcut aktif. */
  hasFaceButtons: boolean;
};

const EMPTY_HAND: UniversalHand = {
  connected: false,
  profile: "none",
  trigger: 0,
  grip: 0,
  stickX: 0,
  stickY: 0,
  stickPressed: false,
  primary: false,
  secondary: false,
  menu: false,
  caps: { faceButtons: false, thumbstick: false, touchpad: false, menu: false },
};

/** Pilih profil paling spesifik yang dikenal; selalu ada nilai baliknya. */
export function resolveProfile(profiles?: readonly string[]): string {
  if (!profiles || profiles.length === 0) return "generic-gamepad";
  for (const wanted of CONTROLLER_PROFILE_PRIORITY) {
    const hit = profiles.find((p) => p.includes(wanted));
    if (hit) return hit;
  }
  return profiles[0];
}

/** Normalisasi satu controller WebXR menjadi UniversalHand. */
export function readXRHand(controller: XRControllerLike, handedness: "left" | "right"): UniversalHand {
  if (!controller?.gamepad) return EMPTY_HAND;
  const gp = controller.gamepad;

  const trigger = pick(gp, TRIGGER_KEYS);
  const squeeze = pick(gp, SQUEEZE_KEYS);
  const thumbstick = pick(gp, THUMBSTICK_KEYS);
  const touchpad = pick(gp, TOUCHPAD_KEYS);
  // Vive & sebagian WMR tidak punya thumbstick — touchpad mengambil perannya
  // supaya setir/gigi tetap bisa dipakai tanpa kode khusus perangkat.
  const stick = thumbstick ?? touchpad;

  const primary = pick(gp, handedness === "right" ? PRIMARY_KEYS_RIGHT : PRIMARY_KEYS_LEFT);
  const secondary = pick(gp, handedness === "right" ? SECONDARY_KEYS_RIGHT : SECONDARY_KEYS_LEFT);
  const menu = pick(gp, MENU_KEYS);

  return {
    connected: true,
    profile: resolveProfile(controller.inputSource?.profiles),
    trigger: analog(trigger),
    grip: analog(squeeze),
    stickX: deadzone(stick?.xAxis ?? 0),
    stickY: deadzone(stick?.yAxis ?? 0),
    stickPressed: stick?.state === "pressed",
    primary: primary?.state === "pressed",
    secondary: secondary?.state === "pressed",
    menu: menu?.state === "pressed",
    caps: {
      faceButtons: Boolean(primary && secondary),
      thumbstick: Boolean(thumbstick),
      touchpad: Boolean(touchpad),
      menu: Boolean(menu),
    },
  };
}

/**
 * Normalisasi pasangan controller WebXR. `null` bila tidak ada satu pun
 * controller dengan data gamepad (mis. sesi hand-tracking murni).
 */
export function readXRInput(right: XRControllerLike, left: XRControllerLike): UniversalInput | null {
  const r = readXRHand(right, "right");
  const l = readXRHand(left, "left");
  if (!r.connected && !l.connected) return null;
  return {
    source: "xr-controller",
    left: l,
    right: r,
    hasFaceButtons: r.caps.faceButtons || l.caps.faceButtons,
  };
}

// Pemetaan gamepad desktop memakai layout "standard" milik Gamepad API — satu-
// satunya tempat indeks tombol boleh muncul, karena spesifikasi Gamepad API
// memang menetapkan indeksnya (berbeda dengan WebXR).
const STD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  LSTICK: 10,
  RSTICK: 11,
} as const;

function buttonValue(gp: Gamepad, index: number): number {
  const b = gp.buttons[index];
  if (!b) return 0;
  return b.value > 0 ? b.value : b.pressed ? 1 : 0;
}

/** Normalisasi gamepad desktop ke bentuk yang sama persis dengan controller VR. */
export function readGamepadInput(): UniversalInput | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  const gp = Array.from(pads).find((p): p is Gamepad => Boolean(p && p.connected));
  if (!gp) return null;

  const caps = { faceButtons: true, thumbstick: true, touchpad: false, menu: true };
  const right: UniversalHand = {
    connected: true,
    profile: "generic-gamepad",
    trigger: buttonValue(gp, STD.RT),
    grip: buttonValue(gp, STD.RB),
    stickX: deadzone(gp.axes[2] ?? 0),
    stickY: deadzone(gp.axes[3] ?? 0),
    stickPressed: gp.buttons[STD.RSTICK]?.pressed ?? false,
    primary: gp.buttons[STD.A]?.pressed ?? false,
    secondary: gp.buttons[STD.B]?.pressed ?? false,
    menu: gp.buttons[STD.BACK]?.pressed ?? false,
    caps,
  };
  const left: UniversalHand = {
    connected: true,
    profile: "generic-gamepad",
    trigger: buttonValue(gp, STD.LT),
    grip: buttonValue(gp, STD.LB),
    stickX: deadzone(gp.axes[0] ?? 0),
    stickY: deadzone(gp.axes[1] ?? 0),
    stickPressed: gp.buttons[STD.LSTICK]?.pressed ?? false,
    primary: gp.buttons[STD.X]?.pressed ?? false,
    secondary: gp.buttons[STD.Y]?.pressed ?? false,
    menu: gp.buttons[STD.START]?.pressed ?? false,
    caps,
  };

  return { source: "gamepad", left, right, hasFaceButtons: true };
}

// Status perangkat aktif, dibaca UI (Panel VR / peta kontrol) supaya bisa
// adaptif: kalau controller tidak punya A/B/X/Y, fungsi tambahan harus
// ditawarkan lewat panel. Objek mutable — pola yang sama dengan uiHover.ts,
// agar update tiap frame tidak memicu render ulang React.
export const vrInputStatus = {
  source: "none" as "none" | "xr-controller" | "hand-tracking" | "gamepad",
  profile: "none",
  /** false → pindahkan shortcut ke Panel VR. */
  hasFaceButtons: false,
};

/** Apakah pemain benar-benar sedang menyentuh perangkat ini? */
export function hasActivity(input: UniversalInput): boolean {
  const hands = [input.left, input.right];
  return hands.some(
    (h) =>
      h.trigger > 0.05 ||
      h.grip > 0.05 ||
      h.stickX !== 0 ||
      h.stickY !== 0 ||
      h.stickPressed ||
      h.primary ||
      h.secondary ||
      h.menu
  );
}
