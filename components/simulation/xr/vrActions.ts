import { useSimStore } from "@/store/simStore";
import { vehicleAudio } from "../audio/vehicleAudio";
import { xrStore } from "./store";

// ─── Fungsi-fungsi untuk tombol VR ─────────────────────────────────────────
// Satu sumber kebenaran untuk semua aksi tombol di dalam headset. Komponen UI
// (panel 3D, dashboard, dll.) hanya perlu memanggil fungsi ini — logika bisnis
// tetap tinggal di simStore, dan fungsi ini cuma jembatan yang lebih aman
// daripada memanggil getState() berulang-ulang di setiap tombol.

/** Tombol Mesin: jalan satu langkah pada saklar kontak (OFF→ACC→ON→START→ON). */
export function vrActionToggleEngine() {
  useSimStore.getState().advanceIgnition();
}

/** Tombol Rem Tangan: tarik/lepas handbrake. */
export function vrActionToggleHandbrake() {
  useSimStore.getState().toggleHandbrake();
}

/** Tombol Sein: aktifkan/matikan sein kiri atau kanan (tekan lagi = mati). */
export function vrActionSetTurnSignal(dir: "left" | "right") {
  const store = useSimStore.getState();
  // Sein satuan membatalkan hazard yang sedang berkedip.
  if (store.hazardOn) store.toggleHazard();
  store.setTurnSignal(dir);
}

/** Tombol Lampu Utama: nyalakan/matikan lampu depan. */
export function vrActionToggleHeadlights() {
  useSimStore.getState().toggleHeadlights();
}

/** Tombol Lampu Jauh: nyalakan/matikan high beam (butuh lampu utama menyala). */
export function vrActionToggleHighBeam() {
  const store = useSimStore.getState();
  if (store.highBeamOn || store.headlightsOn) store.toggleHighBeam();
}

/** Tombol Hazard: aktifkan/matikan semua sein berkedip. */
export function vrActionToggleHazard() {
  useSimStore.getState().toggleHazard();
}

/** Tombol Klakson: bunyi sekejap (momentary — panel tidak bisa menahan tombol). */
export function vrActionHonk() {
  vehicleAudio.setHorn(true);
  setTimeout(() => vehicleAudio.setHorn(false), 450);
}

/** Tombol Sabuk Pengaman (mobil/truk). */
export function vrActionToggleSeatbelt() {
  useSimStore.getState().toggleSeatbelt();
}

/** Tombol Helm (motor). */
export function vrActionToggleHelmet() {
  useSimStore.getState().toggleHelmet();
}

/** Tombol Jaket (motor). */
export function vrActionToggleJacket() {
  useSimStore.getState().toggleJacket();
}

/** Tombol Sarung Tangan (motor). */
export function vrActionToggleGloves() {
  useSimStore.getState().toggleGloves();
}

/** Tombol Sepatu (motor). */
export function vrActionToggleBoots() {
  useSimStore.getState().toggleBoots();
}

/** Tombol Kamera: siklus FPV → TPV → Top-down. */
export function vrActionCycleCamera() {
  useSimStore.getState().cycleCameraMode();
}

// Jarak preset HUD VR dari kamera FPV (meter) — ditekan tombol untuk berpindah
// Dekat → Sedang → Jauh → Dekat, dst. Bisa juga diatur halus lewat
// setHudDistance(delta) di simStore bila perlu.
export const HUD_DISTANCE_PRESETS = [1.6, 2.2, 3.2];

/** Tombol HUD: siklus jarak HUD yang mengikuti kamera FPV. */
export function vrActionCycleHudDistance() {
  const store = useSimStore.getState();
  const current = store.hudDistance;
  const next =
    HUD_DISTANCE_PRESETS.find((p) => p > current + 0.01) ?? HUD_DISTANCE_PRESETS[0];
  store.setHudDistance(next - current);
}

/** Tombol HUD On/Off: tampilkan/sembunyikan HUD melayang yang mengikuti kamera. */
export function vrActionToggleVrHud() {
  useSimStore.getState().toggleVrHud();
}

/** Tombol Keluar VR: akhiri sesi WebXR aktif (kalau ada). */
export function vrActionExitVR() {
  const session = xrStore.getState().session;
  if (session) {
    session.end().catch(() => {});
  }
}
