"use client";

import { useXRInputSourceState } from "@react-three/xr";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useSimStore } from "@/store/simStore";
import { vrUiHover } from "./uiHover";
import { vrActionExitVR } from "./vrActions";
import {
  hasActivity,
  readGamepadInput,
  readXRInput,
  vrInputStatus,
  type UniversalInput,
} from "./XRInputAdapter";
import { NO_GESTURES, readHandGestures, type HandGestures } from "./handGestures";

// Memetakan input universal (lihat XRInputAdapter.ts) ke `vehicleInputOverride`
// saat mengemudi atau `characterInputOverride` saat berjalan kaki. Komponen ini
// TIDAK memanggil aksi store sendiri — InputManager yang menggabungkannya
// dengan keyboard tiap frame, jadi keyboard, controller VR, dan gamepad desktop
// berbagi satu jalur kode.
//
// Physics kendaraan tidak pernah tahu input datang dari perangkat apa.
//
// ── Pemetaan universal (berlaku di semua headset ber-profil xr-standard) ──
//   Trigger kanan          → gas (analog)
//   Trigger kiri           → rem (analog)
//   Grip kanan             → rem tangan
//   Grip kiri              → kopling (tahan)
//   Stik kanan X           → setir          | tekan stik kanan → klakson
//   Stik kiri (mengemudi)  → gigi naik/turun| tekan stik kiri  → lihat spion
//   Stik kiri (jalan kaki) → jalan/belok
//   A → sein kanan / konfirmasi / masuk kendaraan
//   B → lampu jauh
//   X → sein kiri / buka pintu
//   Y → tekan: lampu utama, tahan: netral
//   Menu → tekan: ganti kamera, tahan: pause, tahan 2 detik: keluar VR
//
// ── Kombinasi ──
//   X + A → hazard                 B + Y → starter mesin
//   Grip kiri + Trigger kanan → launch control
//   Grip kanan + Trigger kiri → rem darurat
//   A + B → cruise control         X + Y → reset kendaraan
//
// ── Prioritas perangkat ──
//   controller VR → hand tracking → gamepad → keyboard (fallback InputManager)
// Gamepad desktop hanya mengambil alih saat benar-benar digerakkan supaya
// gamepad menganggur tidak mencuri kontrol dari keyboard.

const STICK_GEAR_THRESHOLD = 0.5;
const HOLD_THRESHOLD_MS = 700; // Y = lampu di bawah ini, netral di atas; menu = kamera/pause
const EXIT_VR_HOLD_MS = 2000;
const PINCH_ON = 0.6; // ambang cubit dianggap "ditekan"

export function XRControlsMap() {
  const rightController = useXRInputSourceState("controller", "right");
  const leftController = useXRInputSourceState("controller", "left");
  const rightHand = useXRInputSourceState("hand", "right");
  const leftHand = useXRInputSourceState("hand", "left");
  const setInput = useSimStore((s) => s.setVehicleInput);
  const setCharacterInput = useSimStore((s) => s.setCharacterInput);

  // Rising-edge: tekan sekali = aksi sekali. Direset saat fase berganti supaya
  // tombol yang masih ditekan ketika masuk kendaraan tidak langsung memicu
  // aksi di fase baru.
  const prevButtons = useRef<Record<string, boolean>>({});
  const lastPhase = useRef<string | null>(null);
  // Tombol "tekan vs tahan".
  const holdStart = useRef<Record<string, number>>({});
  const holdFired = useRef<Record<string, boolean>>({});
  const pendingShort = useRef<Record<string, boolean>>({});
  const pendingHold = useRef<Record<string, boolean>>({});
  // Cruise control: nilai gas yang dikunci (0 = mati).
  const cruise = useRef(0);

  const resetEdges = () => {
    prevButtons.current = {};
    holdStart.current = {};
    holdFired.current = {};
    pendingShort.current = {};
    pendingHold.current = {};
    cruise.current = 0;
  };

  const edge = (key: string, pressed: boolean): boolean => {
    const was = prevButtons.current[key] ?? false;
    prevButtons.current[key] = pressed;
    return pressed && !was;
  };

  /**
   * Lacak tombol tekan-vs-tahan. Menyimpan hasilnya sebagai edge tertunda;
   * `takeShort`/`takeHold` mengambilnya sekali pakai.
   */
  const track = (key: string, pressed: boolean, holdMs: number, now: number) => {
    if (pressed && !holdStart.current[key]) holdStart.current[key] = now;
    if (!pressed && holdStart.current[key]) {
      // Lepas sebelum ambang tahan = tekan singkat.
      if (now - holdStart.current[key] < holdMs && !holdFired.current[key]) {
        pendingShort.current[key] = true;
      }
      holdStart.current[key] = 0;
      holdFired.current[key] = false;
    }
    if (pressed && holdStart.current[key] && now - holdStart.current[key] >= holdMs && !holdFired.current[key]) {
      holdFired.current[key] = true;
      pendingHold.current[key] = true;
    }
  };

  const take = (bag: { current: Record<string, boolean> }, key: string): boolean => {
    const v = bag.current[key] ?? false;
    bag.current[key] = false;
    return v;
  };
  const takeShort = (key: string) => take(pendingShort, key);
  const takeHold = (key: string) => take(pendingHold, key);

  // ─── Fase berjalan kaki ───────────────────────────────────────────────────
  function applyWalking(input: UniversalInput | null, gestures: HandGestures) {
    const store = useSimStore.getState();

    if (input) {
      // Stik kiri untuk jalan; jatuh ke stik kanan bila controller kiri absen.
      const hand = input.left.connected ? input.left : input.right;
      const x = hand.stickX;
      const y = hand.stickY;
      if (x !== 0 || y !== 0) {
        setCharacterInput({ forward: y < 0, back: y > 0, left: x < 0, right: x > 0 });
      } else if (store.characterInputOverride) {
        setCharacterInput(null);
      }

      // A (konfirmasi / masuk kendaraan) atau X (buka pintu) sama-sama masuk.
      const enter = input.right.primary || input.left.primary;
      if (edge("enter", enter) && store.nearVehicleDoor && !store.entering) {
        store.requestEnterVehicle();
      }
    } else if (gestures.active) {
      // Hand tracking: cubit kanan = konfirmasi/masuk kendaraan. Berjalan tetap
      // memakai keyboard/teleport — gestur tidak dipakai untuk lokomosi karena
      // rawan salah baca.
      if (edge("gesture-enter", gestures.pinchRight > PINCH_ON) && store.nearVehicleDoor && !store.entering) {
        store.requestEnterVehicle();
      }
      if (store.characterInputOverride) setCharacterInput(null);
    }

    // Buang override mengemudi yang basi agar fase berikutnya mulai bersih.
    if (store.vehicleInputOverride) setInput(null);
  }

  // ─── Fase mengemudi ───────────────────────────────────────────────────────
  function applyDriving(input: UniversalInput | null, gestures: HandGestures, now: number) {
    // Hand tracking: hanya kendali inti (gas, rem, setir, rem tangan).
    if (!input) {
      const emergency = gestures.pinchLeft > PINCH_ON;
      track("gesture-handbrake", emergency, HOLD_THRESHOLD_MS, now);
      setInput({
        steer: gestures.steerActive ? -gestures.steer : 0,
        throttle: vrUiHover.active ? 0 : gestures.pinchRight,
        brake: gestures.pinchLeft,
        clutch: gestures.fistLeft && !gestures.steerActive,
        horn: false,
        handBrake: takeHold("gesture-handbrake"),
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
      });
      return;
    }

    const { left, right } = input;

    // ── Kombinasi tombol dihitung lebih dulu; tombol satuan diblokir supaya
    //    kombinasi tidak ikut memicu aksi tunggalnya. ──
    const comboHazard = left.primary && right.primary; // X + A
    const comboEngine = right.secondary && left.secondary; // B + Y
    const comboCruise = right.primary && right.secondary; // A + B
    const comboReset = left.primary && left.secondary; // X + Y
    const comboLaunch = left.grip > 0.5 && right.trigger > 0.5; // grip kiri + trigger kanan
    const comboEmergency = right.grip > 0.5 && left.trigger > 0.5; // grip kanan + trigger kiri

    const xAlone = left.primary && !comboHazard && !comboReset;
    const aAlone = right.primary && !comboHazard && !comboCruise;
    const bAlone = right.secondary && !comboEngine && !comboCruise;
    const yPressed = left.secondary && !comboEngine && !comboReset;

    if (edge("reset", comboReset)) {
      // Reset kendaraan: kembali ke kabin dengan mesin mati & rem tangan aktif.
      useSimStore.getState().startDriving();
      resetEdges();
      return;
    }

    // ── Analog ──
    // Saat ray controller menyorot tombol panel, trigger "habis" untuk klik —
    // jangan sampai sekaligus menginjak gas.
    let throttle = vrUiHover.active ? 0 : right.trigger;
    let brake = left.trigger;
    let clutch = left.grip > 0.3;
    let handBrakeEdge = edge("handbrake", right.grip > 0.5 && !comboEmergency);

    // Cruise control (A + B): kunci gas saat ini, batal saat ditekan lagi atau
    // saat rem/kopling disentuh.
    if (edge("cruise", comboCruise)) {
      cruise.current = cruise.current > 0 ? 0 : Math.max(throttle, 0.35);
    }
    if (cruise.current > 0) {
      if (brake > 0.05 || clutch) cruise.current = 0;
      else throttle = Math.max(throttle, cruise.current);
    }

    // Launch control: tahan kopling + gas penuh; lepas grip = melesat.
    if (comboLaunch) {
      clutch = true;
      throttle = 1;
      cruise.current = 0;
    }

    // Rem darurat: rem penuh + tarik rem tangan sekali di awal.
    if (comboEmergency) {
      brake = 1;
      throttle = 0;
      cruise.current = 0;
      if (edge("emergency", true)) handBrakeEdge = true;
    } else {
      edge("emergency", false);
    }

    // ── Tekan vs tahan ──
    track("y", yPressed, HOLD_THRESHOLD_MS, now); // tekan: lampu utama, tahan: netral
    track("menu", left.menu || right.menu, HOLD_THRESHOLD_MS, now);
    const menuHeld = left.menu || right.menu;
    // Menu ditahan 2 detik = keluar VR (dilacak terpisah dari pause).
    track("exitvr", menuHeld, EXIT_VR_HOLD_MS, now);
    if (takeHold("exitvr")) {
      vrActionExitVR();
      resetEdges();
      return;
    }

    const stickY = left.stickY;
    // Stik kiri bawah: tekan = turun gigi, tahan = mundur (R).
    track("lstickDown", stickY > STICK_GEAR_THRESHOLD, HOLD_THRESHOLD_MS, now);

    setInput({
      // Nilai mentah stik: InputManager yang membalik tandanya ke konvensi sim
      // (setir positif = kiri).
      steer: right.stickX,
      throttle,
      brake,
      clutch,
      horn: right.stickPressed,
      handBrake: handBrakeEdge,
      leftSignal: edge("signalL", xAlone),
      rightSignal: edge("signalR", aAlone),
      hazard: edge("hazard", comboHazard),
      headlights: takeShort("y"),
      highBeam: edge("highBeam", bAlone),
      mirror: edge("mirror", left.stickPressed),
      gearUp: edge("gearUp", stickY < -STICK_GEAR_THRESHOLD),
      gearDown: edge("gearDown", stickY > STICK_GEAR_THRESHOLD),
      reverse: takeHold("lstickDown"),
      neutral: takeHold("y"),
      camera: takeShort("menu"),
      pause: takeHold("menu"),
      engine: edge("engine", comboEngine),
    });
  }

  useFrame((state) => {
    const store = useSimStore.getState();
    const phase = store.phase;
    if (phase !== lastPhase.current) {
      resetEdges();
      lastPhase.current = phase;
    }

    // ── Pilih perangkat aktif menurut urutan prioritas ──
    let input = readXRInput(rightController, leftController);
    let gestures: HandGestures = NO_GESTURES;

    if (!input) {
      // Tidak ada controller: coba hand tracking sebelum turun ke gamepad.
      const xr = state.gl.xr;
      gestures = readHandGestures(xr.getFrame?.(), xr.getReferenceSpace?.(), leftHand, rightHand);
      if (!gestures.active) {
        const pad = readGamepadInput();
        // Gamepad menganggur tidak boleh memblokir keyboard.
        if (pad && hasActivity(pad)) input = pad;
      }
    }

    if (!input && !gestures.active) {
      vrInputStatus.source = "none";
      vrInputStatus.profile = "none";
      vrInputStatus.hasFaceButtons = false;
      // Bersihkan override basi supaya keyboard mengambil alih lagi.
      if (store.vehicleInputOverride) setInput(null);
      if (store.characterInputOverride) setCharacterInput(null);
      return;
    }

    if (input) {
      vrInputStatus.source = input.source;
      vrInputStatus.profile = input.right.connected ? input.right.profile : input.left.profile;
      vrInputStatus.hasFaceButtons = input.hasFaceButtons;
    } else {
      vrInputStatus.source = "hand-tracking";
      vrInputStatus.profile = "hand";
      vrInputStatus.hasFaceButtons = false;
    }

    if (phase === "walking") {
      applyWalking(input, gestures);
      return;
    }
    applyDriving(input, gestures, performance.now());
  });

  return null;
}
