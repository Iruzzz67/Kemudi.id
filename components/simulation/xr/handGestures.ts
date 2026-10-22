// ─── Hand tracking → gestur universal ───────────────────────────────────────
// Dipakai HANYA sebagai cadangan saat tidak ada controller (prioritas input:
// controller VR → hand tracking → gamepad → keyboard → layar sentuh).
//
// Sama seperti XRInputAdapter, file ini tidak mengenal merek headset: yang
// dibaca adalah sendi tangan standar WebXR (`XRHand`), yang bentuknya sama di
// Quest, Pico, maupun perangkat lain yang mengaktifkan hand tracking.
//
// Gestur yang dikenali:
//   👆 Cubit (pinch)          → nilai analog 0..1 (gas kanan / rem kiri, klik UI)
//   ✊ Genggam (fist)         → pegang setir; sudut dua pergelangan = setir
//   🤏 Cubit ditahan (kiri)   → tarik rem tangan
//
// Semua ambang batas dalam meter (ruang dunia WebXR).

const PINCH_OPEN = 0.05; // jarak jempol–telunjuk saat tangan terbuka
const PINCH_CLOSED = 0.02; // dianggap mencubit penuh
const FIST_THRESHOLD = 0.07; // rata-rata jarak ujung jari ke pergelangan

type HandLike = {
  inputSource?: { hand?: XRHand | null };
} | null | undefined;

type Vec3 = { x: number; y: number; z: number };

export type HandGestures = {
  active: boolean;
  /** Kekuatan cubit 0..1 per tangan. */
  pinchLeft: number;
  pinchRight: number;
  fistLeft: boolean;
  fistRight: boolean;
  /** Setir -1..1 dari kemiringan dua pergelangan (hanya saat dua tangan menggenggam). */
  steer: number;
  steerActive: boolean;
};

export const NO_GESTURES: HandGestures = {
  active: false,
  pinchLeft: 0,
  pinchRight: 0,
  fistLeft: false,
  fistRight: false,
  steer: 0,
  steerActive: false,
};

function jointPos(
  frame: XRFrame,
  space: XRReferenceSpace,
  hand: XRHand,
  name: XRHandJoint
): Vec3 | null {
  const joint = hand.get(name);
  if (!joint) return null;
  const pose = frame.getJointPose?.(joint, space);
  if (!pose) return null;
  const p = pose.transform.position;
  return { x: p.x, y: p.y, z: p.z };
}

function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** 1 saat jari rapat, 0 saat terbuka. */
function pinchStrength(d: number): number {
  const t = (PINCH_OPEN - d) / (PINCH_OPEN - PINCH_CLOSED);
  return Math.max(0, Math.min(1, t));
}

type HandRead = { pinch: number; fist: boolean; wrist: Vec3 | null };

function readHand(frame: XRFrame, space: XRReferenceSpace, hand: HandLike): HandRead {
  const xrHand = hand?.inputSource?.hand;
  if (!xrHand) return { pinch: 0, fist: false, wrist: null };

  const thumb = jointPos(frame, space, xrHand, "thumb-tip");
  const index = jointPos(frame, space, xrHand, "index-finger-tip");
  const middle = jointPos(frame, space, xrHand, "middle-finger-tip");
  const ring = jointPos(frame, space, xrHand, "ring-finger-tip");
  const wrist = jointPos(frame, space, xrHand, "wrist");

  const pinch = thumb && index ? pinchStrength(dist(thumb, index)) : 0;

  // Genggam: ketiga ujung jari menekuk mendekati pergelangan.
  let fist = false;
  if (wrist && index && middle && ring) {
    const avg = (dist(wrist, index) + dist(wrist, middle) + dist(wrist, ring)) / 3;
    fist = avg < FIST_THRESHOLD;
  }

  return { pinch, fist, wrist };
}

/**
 * Baca gestur dari kedua tangan. `frame`/`space` diambil dari
 * `gl.xr.getFrame()` / `gl.xr.getReferenceSpace()` di dalam useFrame.
 */
export function readHandGestures(
  frame: XRFrame | null | undefined,
  space: XRReferenceSpace | null | undefined,
  left: HandLike,
  right: HandLike
): HandGestures {
  if (!frame || !space) return NO_GESTURES;
  const l = readHand(frame, space, left);
  const r = readHand(frame, space, right);
  const active = Boolean(left?.inputSource?.hand || right?.inputSource?.hand);
  if (!active) return NO_GESTURES;

  // Setir: dua tangan menggenggam seolah memegang lingkar kemudi — beda tinggi
  // antar pergelangan dipetakan ke sudut setir (tangan kiri naik = belok kiri).
  let steer = 0;
  let steerActive = false;
  if (l.fist && r.fist && l.wrist && r.wrist) {
    const dy = l.wrist.y - r.wrist.y;
    const dx = Math.max(0.12, Math.abs(l.wrist.x - r.wrist.x)); // jaga pembagi
    steer = Math.max(-1, Math.min(1, (dy / dx) * 1.6));
    steerActive = true;
  }

  return {
    active,
    pinchLeft: l.pinch,
    pinchRight: r.pinch,
    fistLeft: l.fist,
    fistRight: r.fist,
    steer,
    steerActive,
  };
}
