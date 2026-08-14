"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useXR } from "@react-three/xr";
import { useEffect, useRef } from "react";

// ─── Penyesuai kualitas render saat VR aktif ────────────────────────────────
// Headset standalone (Meta Quest) memakai GPU kelas mobile dan harus merender
// DUA layar (satu per mata) tiap frame — beban fill-rate 2x lipat mode
// desktop. Komponen ini:
//
// 1) Menurunkan pixel ratio renderer ke 1:1 selama sesi immersive aktif
//    (resolusi efektif sudah diatur oleh frameBufferScaling di store), dan
//    mengembalikan kualitas desktop saat keluar VR.
//
// 2) GOVERNOR FRAME RATE ADAPTIF — jantung perbaikan performa:
//    framebuffer scaling tidak bisa diubah di tengah sesi (three.js
//    menguncinya saat presenting), tapi session.updateTargetFrameRate()
//    BISA dipanggil kapan saja. Jadi kita pantau durasi frame (delta antar
//    render); kalau rata-rata frame time terus-menerus melebihi anggaran
//    frame rate saat ini, turunkan 1 tingkat (90 → 72 → 60 Hz). Sebaliknya,
//    kalau headset punya banyak ruang kosong, naikkan kembali. Hasilnya:
//    headset lemah otomatis dipertahankan di frame rate yang stabil (frame
//    drop = judder = mual), headset kuat memanfaatkan Hz tertinggi.
//
// Dipasang DI DALAM <XR> supaya bisa membaca status session.

// Kap maksimal refresh rate (Hz) — PC-VR 120+ tidak dibutuhkan sim ini.
const MAX_RATE = 90;
// Kalau rata-rata frame time > anggaran × ini selama cooldown, turunkan Hz.
const DROP_RATIO = 1.2;
// Cooldown antar penurunan (ms) — mencegah turun beruntun karena satu lonjakan.
const DROP_COOLDOWN_MS = 2500;
// Kalau rata-rata frame time < anggaran × ini dalam waktu lama, naikkan Hz.
const RISE_RATIO = 0.75;
const RISE_COOLDOWN_MS = 8000;
// Jumlah sampel frame time terakhir yang dirata-ratakan.
const SAMPLE_COUNT = 60;
// Abaikan delta raksasa (mis. jeda saat baru masuk VR) — bukan frame drop asli.
const MAX_SANE_DELTA_MS = 100;

export function XROptimizer() {
  const gl = useThree((s) => s.gl);
  const session = useXR((s) => s.session);
  const isPresenting = session != null;

  // Daftar refresh rate yang didukung perangkat, urut naik.
  const ratesRef = useRef<number[]>([]);
  const targetRef = useRef(0);
  const samplesRef = useRef<number[]>([]);
  const lastDropAtRef = useRef(0);
  const lastRiseAtRef = useRef(0);

  // Inisialisasi sesi: ambil daftar rate yang didukung, mulai dari yang
  // tertinggi ≤ MAX_RATE (90 Hz). Governor selanjutnya menyesuaikan dari sini.
  useEffect(() => {
    if (!session) return;
    const rates = Array.from(session.supportedFrameRates || [])
      .sort((a, b) => a - b);
    if (rates.length === 0) return;
    ratesRef.current = rates;
    const start =
      rates.filter((r) => r <= MAX_RATE).pop() ?? rates[rates.length - 1];
    targetRef.current = start;
    samplesRef.current = [];
    lastDropAtRef.current = 0;
    lastRiseAtRef.current = 0;
    session.updateTargetFrameRate(start).catch(() => {});
  }, [session]);

  useEffect(() => {
    if (isPresenting) {
      // 1:1 sudah cukup — di headset justru pixel ratio tinggi yang bikin
      // frame drop dan mual. frameBufferScaling di store yang menentukan
      // resolusi render sebenarnya.
      gl.setPixelRatio(1);
    } else {
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
  }, [gl, isPresenting]);

  // Pantau durasi frame dan sesuaikan frame rate saat dibutuhkan.
  useFrame((_, delta) => {
    if (!session) return;
    const rates = ratesRef.current;
    if (rates.length < 2) return;

    const dtMs = delta * 1000;
    if (dtMs > MAX_SANE_DELTA_MS) return; // lonjakan sesaat, bukan frame drop

    const samples = samplesRef.current;
    samples.push(dtMs);
    if (samples.length > SAMPLE_COUNT) samples.shift();
    if (samples.length < 30) return; // tunggu data cukup dulu

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const target = targetRef.current;
    const budget = 1000 / target;
    const now = performance.now();

    // Terlalu lambat → turun 1 tingkat.
    if (avg > budget * DROP_RATIO && now - lastDropAtRef.current > DROP_COOLDOWN_MS) {
      const next = [...rates].reverse().find((r) => r < target);
      if (next) {
        targetRef.current = next;
        session.updateTargetFrameRate(next).catch(() => {});
        lastDropAtRef.current = now;
        // Kosongkan sampel: tingkat baru dinilai dari data segar, bukan sisa
        // frame time lama yang bisa memicu turun-naik (ping-pong).
        samples.length = 0;
        // Visibilitas untuk debugging jarak jauh (browser remote headset).
        console.info(`[XR] frame drop terdeteksi (${avg.toFixed(1)}ms/frame) → frame rate ${next} Hz`);
      }
      return;
    }

    // Sangat longgar → naikkan lagi (sampai MAX_RATE).
    if (
      avg < budget * RISE_RATIO &&
      target < MAX_RATE &&
      now - lastRiseAtRef.current > RISE_COOLDOWN_MS
    ) {
      const next = rates.find((r) => r > target && r <= MAX_RATE);
      if (next) {
        targetRef.current = next;
        session.updateTargetFrameRate(next).catch(() => {});
        lastRiseAtRef.current = now;
        // Data segar untuk tingkat baru (hindari turun balik seketika).
        samples.length = 0;
        console.info(`[XR] performa longgar → frame rate ${next} Hz`);
      }
    }
  });

  return null;
}
