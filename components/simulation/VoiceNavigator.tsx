"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useSimStore } from "@/store/simStore";
import { ROAD_WAYPOINTS, getSampleNearZ, headingFromTangent } from "@/lib/track";
import { VehicleTransform } from "./transform";

// Voice navigation (md "Voice Navigation" + "GPS Navigation"): memakai
// SpeechSynthesis API browser untuk mengumumkan belokan/landmark menjelang
// tiba. Pengumuman hanya dilakukan SEKALI per waypoint per sesi (di-tracking
// via Set). Dinonaktifkan otomatis bila store.voiceNav false (toggle ;).

function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

// Waypoint dengan arah belok yang dihitung dari kurva jalan.
type NavPoint = {
  z: number;
  label: string;
  direction: "left" | "right" | "straight";
};

function buildNavPoints(): NavPoint[] {
  const points: NavPoint[] = [];
  const samples = ROAD_WAYPOINTS.map((wp) => {
    const sample = getSampleNearZ(wp.z);
    return { z: wp.z, heading: headingFromTangent(sample.tangent) };
  });
  for (let i = 1; i < samples.length - 1; i++) {
    const cur = samples[i];
    const next = samples[i + 1];
    const delta = normalizeAngle(next.heading - cur.heading);
    const direction: NavPoint["direction"] =
      delta > 0.12 ? "left" : delta < -0.12 ? "right" : "straight";
    if (direction === "straight") continue;
    points.push({ z: cur.z, label: direction === "left" ? "Belok kiri" : "Belok kanan", direction });
  }
  return points;
}

const NAV_POINTS = buildNavPoints();
// Landmark tambahan (SPBU, persimpangan, garis finish).
const LANDMARKS = [
  { z: -535, label: "SPBU di sisi kanan jalan" },
  { z: -900, label: "Garis finish di depan" },
];

const ANNOUNCE_LEAD = 55; // meter sebelum tiba

export function VoiceNavigator({ transform }: { transform: VehicleTransform }) {
  const announced = useRef<Set<string>>(new Set());
  const enabled = useRef(false);
  const lastZ = useRef(0);

  // Batalkan narasi yang masih berjalan saat komponen dilepas (keluar dari
  // fase driving) — tanpa ini, SpeechSynthesis terus berbicara sebentar.
  useEffect(() => {
    return () => {
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // SpeechSynthesis tidak tersedia — abaikan.
      }
    };
  }, []);

  const speak = (text: string) => {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    } catch {
      // SpeechSynthesis tidak tersedia / diblokir browser — abaikan.
    }
  };

  useFrame(() => {
    const store = useSimStore.getState();
    if (store.phase !== "driving") return;
    const z = transform.position.z;
    const speed = store.speedKmh;

    // Nyalakan/matikan sintesis hanya saat toggle berubah (hindari cancel
    // terus-menerus).
    if (store.voiceNav && !enabled.current) {
      enabled.current = true;
      speak("Navigasi suara aktif");
    } else if (!store.voiceNav && enabled.current) {
      enabled.current = false;
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (!store.voiceNav) return;

    // Catat posisi terakhir untuk deteksi arah maju (kendaraan menuju -Z).
    lastZ.current = z;

    // Pengumuman satu kali per titik saat pemain mendekat (z mengecil).
    for (const p of NAV_POINTS) {
      const key = `nav-${p.z}`;
      if (announced.current.has(key)) continue;
      if (z > p.z && z - p.z < ANNOUNCE_LEAD) {
        announced.current.add(key);
        speak(`${p.label} ${Math.abs(Math.round(z - p.z))} meter lagi`);
      }
    }
    for (const l of LANDMARKS) {
      const key = `land-${l.z}`;
      if (announced.current.has(key)) continue;
      if (z > l.z && z - l.z < ANNOUNCE_LEAD) {
        announced.current.add(key);
        speak(l.label);
      }
    }

    // Peringatan kecepatan bila melaju di atas batas zona (opsional, hemat).
    if (speed > store.speedLimitKmh + 15) {
      const key = `speed-${Math.round(store.speedLimitKmh)}`;
      if (!announced.current.has(key)) {
        announced.current.add(key);
        speak(`Kurangi kecepatan, batas ${store.speedLimitKmh} kilometer per jam`);
      }
    }
  });

  return null;
}
