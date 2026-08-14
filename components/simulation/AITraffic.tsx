"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  AI_FOLLOW_DISTANCE,
  AI_LANE_OFFSET,
  AI_OVERTAKE_LOOKAHEAD,
  AI_SPAWNS,
  AI_STOP_MARGIN,
  AI_SPECS,
  AiSpawn,
  AiVehicleKind,
  AiVehicleSpec,
  TRAFFIC_LIGHT_ZS,
} from "@/lib/aiTraffic";
import { getSampleNearZ, headingFromTangent, FINISH_Z, ROAD_START_Z } from "@/lib/track";
import { RectObstacle, removeObstacle, setObstacle, rectCollides, CollisionQuery } from "@/lib/obstacles";
import { useSimStore } from "@/store/simStore";
import { WeatherKind } from "@/lib/weather";
import { getLightPhase } from "@/lib/trafficLight";

const AI_ACCEL = 3; // m/s²
const AI_BRAKE = 4.5; // m/s²

type AiState = {
  spawn: AiSpawn;
  spec: AiVehicleSpec;
  z: number;
  lane: -1 | 0 | 1;
  speed: number;
  active: boolean;
  blockedSince: number;
  signal: "off" | "left" | "right";
  x: number;
  yaw: number;
};

function normalizeAngle(a: number): number {
  let r = a % (Math.PI * 2);
  if (r > Math.PI) r -= Math.PI * 2;
  if (r < -Math.PI) r += Math.PI * 2;
  return r;
}

/** Pengali kecepatan AI per cuaca (jalan licin/batas pandang). */
function weatherSpeedFactor(weather: WeatherKind): number {
  switch (weather) {
    case "hujan-ringan":
      return 0.85;
    case "hujan-deras":
      return 0.7;
    case "kabut":
      return 0.75;
    case "malam":
      return 0.85;
    default:
      return 1;
  }
}

function initAiState(spawn: AiSpawn): AiState {
  return {
    spawn,
    spec: AI_SPECS[spawn.kind],
    z: spawn.z,
    lane: spawn.lane,
    speed: 0,
    active: (spawn.startDelay ?? 0) <= 0,
    blockedSince: 0,
    signal: "off",
    x: 0,
    yaw: 0,
  };
}

// ──────────────────────────────────────────────────────────────────────────
//  Mesh prosedural AI per jenis kendaraan
// ──────────────────────────────────────────────────────────────────────────

function Wheel({ x, y, z, r = 0.38 }: { x: number; y: number; z: number; r?: number }) {
  return (
    <mesh castShadow position={[x, y, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[r, r, 0.24, 12]} />
      <meshStandardMaterial color="#111827" roughness={0.9} />
    </mesh>
  );
}

function EmergencyLights({ color }: { color: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) {
      const on = Math.sin(clock.elapsedTime * 12) > 0;
      mat.current.emissiveIntensity = on ? 2.2 : 0;
    }
  });
  return (
    <mesh position={[0, 0.9, -0.2]}>
      <boxGeometry args={[0.5, 0.16, 0.3]} />
      <meshStandardMaterial ref={mat} color="#111827" emissive={color} emissiveIntensity={0} />
    </mesh>
  );
}

function AiBody({ kind, spec }: { kind: AiVehicleKind; spec: AiVehicleSpec }) {
  const bodyColor = spec.color;
  switch (kind) {
    case "motor": {
      return (
        <group>
          <mesh castShadow position={[0, 0.5, 0]}>
            <boxGeometry args={[0.3, 0.35, 1.5]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
          <mesh castShadow position={[0, 0.85, -0.15]}>
            <boxGeometry args={[0.55, 0.3, 0.5]} />
            <meshStandardMaterial color={spec.accent} roughness={0.5} />
          </mesh>
          <Wheel x={0} y={0.34} z={0.6} r={0.28} />
          <Wheel x={0} y={0.34} z={-0.55} r={0.28} />
        </group>
      );
    }
    case "bus":
    case "pemadam": {
      return (
        <group>
          <mesh castShadow position={[0, spec.height / 2 - 0.1, 0]}>
            <boxGeometry args={[spec.width - 0.1, spec.height - 0.4, spec.length - 0.5]} />
            <meshStandardMaterial color={bodyColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, spec.height - 0.65, 0]}>
            <boxGeometry args={[spec.width - 0.45, 0.55, spec.length - 1]} />
            <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.15} />
          </mesh>
          <Wheel x={(spec.width - 0.3) / 2} y={0.42} z={spec.length * 0.28} />
          <Wheel x={-(spec.width - 0.3) / 2} y={0.42} z={spec.length * 0.28} />
          <Wheel x={(spec.width - 0.3) / 2} y={0.42} z={-spec.length * 0.28} />
          <Wheel x={-(spec.width - 0.3) / 2} y={0.42} z={-spec.length * 0.28} />
        </group>
      );
    }
    case "truk": {
      return (
        <group>
          <mesh castShadow position={[0, 1.1, 2]}>
            <boxGeometry args={[spec.width - 0.2, 1.1, 2.4]} />
            <meshStandardMaterial color={bodyColor} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 1.5, -1.6]}>
            <boxGeometry args={[spec.width - 0.2, 1.9, spec.length - 3.2]} />
            <meshStandardMaterial color={spec.accent} roughness={0.7} />
          </mesh>
          <Wheel x={(spec.width - 0.4) / 2} y={0.42} z={1.9} r={0.42} />
          <Wheel x={-(spec.width - 0.4) / 2} y={0.42} z={1.9} r={0.42} />
          <Wheel x={(spec.width - 0.4) / 2} y={0.42} z={-1.4} r={0.42} />
          <Wheel x={-(spec.width - 0.4) / 2} y={0.42} z={-1.4} r={0.42} />
          <Wheel x={(spec.width - 0.4) / 2} y={0.42} z={-2.4} r={0.42} />
          <Wheel x={-(spec.width - 0.4) / 2} y={0.42} z={-2.4} r={0.42} />
        </group>
      );
    }
    default: {
      // mobil / ambulans / polisi
      return (
        <group>
          <mesh castShadow position={[0, 0.55, 0]}>
            <boxGeometry args={[spec.width - 0.2, 0.5, spec.length - 0.5]} />
            <meshStandardMaterial color={bodyColor} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.98, -0.25]}>
            <boxGeometry args={[spec.width - 0.55, 0.4, spec.length * 0.5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.15} />
          </mesh>
          <Wheel x={(spec.width - 0.3) / 2} y={0.3} z={spec.length * 0.3} />
          <Wheel x={-(spec.width - 0.3) / 2} y={0.3} z={spec.length * 0.3} />
          <Wheel x={(spec.width - 0.3) / 2} y={0.3} z={-spec.length * 0.3} />
          <Wheel x={-(spec.width - 0.3) / 2} y={0.3} z={-spec.length * 0.3} />
          {kind === "ambulans" && (
            <>
              <mesh position={[0, 1.32, 0.4]}>
                <boxGeometry args={[0.5, 0.5, 0.06]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
              <mesh position={[0, 1.32, -0.4]}>
                <boxGeometry args={[0.5, 0.5, 0.06]} />
                <meshStandardMaterial color="#dc2626" />
              </mesh>
            </>
          )}
        </group>
      );
    }
  }
}

// Satu kendaraan AI — posisi di-update tiap frame dari state bersama.
function AiVehicleView({ state }: { state: AiState }) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (group.current) {
      group.current.position.set(state.x, 0, state.z);
      group.current.rotation.y = state.yaw;
    }
  });

  return (
    <group ref={group} position={[state.x, 0, state.z]} rotation={[0, state.yaw, 0]}>
      <AiBody kind={state.spawn.kind} spec={state.spec} />
      {state.spec.emergency && <EmergencyLights color="#ef4444" />}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Simulasi lalu lintas
// ──────────────────────────────────────────────────────────────────────────

// State AI hidup di array MODULE-LEVEL, bukan React state — komponen cukup
// me-render dari spawn config, sementara useFrame memutasi objek-objek di
// dalam array ini langsung. Ini pola umum untuk data simulasi dunia di R3F
// dan menghindari re-render React tiap frame.
const AI_STATES: AiState[] = AI_SPAWNS.map(initAiState);

export function AITraffic() {

  const idList = useMemo(() => AI_SPAWNS.map((s) => `ai-${s.id}`), []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const now = performance.now();
    const store = useSimStore.getState();
    const weatherFactor = weatherSpeedFactor(store.weather);
    const arr = AI_STATES;
    const others = arr.filter((s) => s !== undefined);

    for (const state of arr) {
      // Start delay: kendaraan "parkir" dulu sebelum bergerak. Kendaraan yang
      // masih parkir TETAP terdaftar sebagai rintangan solid di posisi
      // spawn-nya — pemain tidak boleh menembusnya.
      if (!state.active) {
        const sampleP = getSampleNearZ(state.z);
        const headingP = headingFromTangent(sampleP.tangent);
        const rightP = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), headingP);
        state.x = sampleP.point.x + rightP.x * state.lane * AI_LANE_OFFSET;
        state.yaw = headingP;
        setObstacle(`ai-${state.spawn.id}`, {
          shape: "rect",
          kind: "vehicle",
          x: state.x,
          z: state.z,
          yaw: headingP,
          halfW: state.spec.width / 2,
          halfL: state.spec.length / 2,
        });
        if (now >= (state.spawn.startDelay ?? 0) * 1000) state.active = true;
        else continue;
      }

      let targetSpeed = state.spec.speed * (state.spawn.speedFactor ?? 1) * weatherFactor;

      // 1) Lampu merah: berhenti di belakang garis stop.
      for (const lightZ of TRAFFIC_LIGHT_ZS) {
        if (state.z > lightZ && state.z - lightZ < 60) {
          const phase = getLightPhase(now);
          if (phase !== "green") {
            const stopZ = lightZ + AI_STOP_MARGIN;
            const distToStop = state.z - stopZ;
            if (distToStop > 0) {
              targetSpeed = Math.min(targetSpeed, Math.sqrt(2 * AI_BRAKE * Math.max(0, distToStop)));
            }
          }
        }
      }

      // 2) Pejalan kaki menyeberang di depan → berhenti.
      for (const key of Object.keys(store.pedestrianCrossings)) {
        const p = store.pedestrianCrossings[key];
        if (!p.inRoad) continue;
        const dz = state.z - p.z;
        if (dz > 0 && dz < 30) {
          targetSpeed = Math.min(targetSpeed, Math.sqrt(2 * AI_BRAKE * Math.max(0, dz - 3)));
        }
      }

      // 3) Kendaraan di depan di jalur sama (termasuk pemain) → antre.
      // Kendaraan bergerak ke arah -Z, jadi "di depan" = z lebih kecil.
      let frontGap = Infinity;
      for (const o of others) {
        if (o === state) continue;
        if (o.lane !== state.lane) continue;
        const gap = state.z - o.z; // positif jika o di depan
        if (gap > 0 && gap < frontGap) frontGap = gap;
      }
      // Pemain juga bagian dari lalu lintas (berhenti di belakangnya).
      const playerZ = store.playerZ;
      const playerGap = state.z - playerZ;
      if (playerGap > 0 && playerGap < frontGap) frontGap = playerGap;
      if (frontGap < AI_FOLLOW_DISTANCE) {
        targetSpeed = Math.min(targetSpeed, Math.sqrt(2 * AI_BRAKE * Math.max(0, frontGap - 3)));
      }

      // 4) Rintangan solid statis di depan (barrier, kendaraan parkir, tiang)
      //    → berhenti. Dipakai rect lookahead agar tidak menembus.
      const lookahead = AI_OVERTAKE_LOOKAHEAD;
      const aheadZ = state.z - lookahead;
      const sampleAhead = getSampleNearZ(aheadZ);
      const rightAhead = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        headingFromTangent(sampleAhead.tangent)
      );
      const probe: RectObstacle = {
        shape: "rect",
        kind: "vehicle",
        x: sampleAhead.point.x + rightAhead.x * state.lane * AI_LANE_OFFSET,
        z: sampleAhead.point.z + rightAhead.z * state.lane * AI_LANE_OFFSET,
        yaw: headingFromTangent(sampleAhead.tangent),
        halfW: 1.2,
        halfL: 1.5,
      };
      const query: CollisionQuery = { excludeIds: idList, solidOnly: true };
      const blocked = rectCollides(probe, query) !== null;
      if (blocked) {
        targetSpeed = 0;
        state.blockedSince = state.blockedSince === 0 ? now : state.blockedSince;
      } else {
        state.blockedSince = 0;
      }

      // 5) Menyalip: jika terhalang > 1,5 detik, coba jalur tengah (0) lalu
      //    jalur lawan — zona rintangan menyisakan celah tengah ±3 m.
      if (state.blockedSince > 0 && now - state.blockedSince > 1500) {
        const candidates: (-1 | 0 | 1)[] = state.lane === 0 ? [-1, 1] : [0, state.lane === 1 ? -1 : 1];
        for (const cand of candidates) {
          const probeOther: RectObstacle = {
            ...probe,
            x: sampleAhead.point.x + rightAhead.x * cand * AI_LANE_OFFSET,
            z: sampleAhead.point.z + rightAhead.z * cand * AI_LANE_OFFSET,
          };
          const otherBlocked = rectCollides(probeOther, query) !== null;
          if (!otherBlocked) {
            state.lane = cand as -1 | 0 | 1;
            state.blockedSince = 0;
            break;
          }
        }
      }

      // 6) Akselerasi/rem menuju target speed.
      if (state.speed < targetSpeed) {
        state.speed = Math.min(targetSpeed, state.speed + AI_ACCEL * delta);
      } else {
        state.speed = Math.max(targetSpeed, state.speed - AI_BRAKE * delta);
      }

      state.z -= state.speed * delta;

      // Respawn di awal trek setelah melewati finish (lalu lintas melingkar).
      if (state.z < FINISH_Z - 50) {
        state.z = ROAD_START_Z - Math.random() * 90;
        state.lane = (Math.random() < 0.5 ? -1 : 1) as -1 | 1;
        state.speed = 0;
        state.blockedSince = 0;
      }

      // 7) Hitung posisi dunia + heading + sinyal belok dari kurva.
      const sample = getSampleNearZ(state.z);
      const heading = headingFromTangent(sample.tangent);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
      state.x = sample.point.x + right.x * state.lane * AI_LANE_OFFSET;
      state.yaw = heading;

      const ahead = getSampleNearZ(state.z - 22);
      const headingAhead = headingFromTangent(ahead.tangent);
      const deltaHeading = normalizeAngle(headingAhead - heading);
      if (Math.abs(deltaHeading) > 0.08) {
        state.signal = deltaHeading > 0 ? "right" : "left";
      } else {
        state.signal = "off";
      }

      // 8) Daftarkan sebagai obstacle solid agar pemain menabraknya secara nyata.
      setObstacle(`ai-${state.spawn.id}`, {
        shape: "rect",
        kind: "vehicle",
        x: state.x,
        z: state.z,
        yaw: heading,
        halfW: state.spec.width / 2,
        halfL: state.spec.length / 2,
      });
    }
  });

  // Setiap kali komponen di-mount ulang (percobaan baru, "Coba Lagi", atau
  // "Ganti Kendaraan"), state AI dikembalikan ke posisi spawn awal — tanpa
  // ini, kendaraan meneruskan posisi dari run sebelumnya (muncul di tengah
  // trek). Idempoten untuk StrictMode double-mount di dev.
  useEffect(() => {
    for (let i = 0; i < AI_STATES.length; i++) {
      const fresh = initAiState(AI_SPAWNS[i]);
      AI_STATES[i].z = fresh.z;
      AI_STATES[i].lane = fresh.lane;
      AI_STATES[i].speed = fresh.speed;
      AI_STATES[i].active = fresh.active;
      AI_STATES[i].blockedSince = fresh.blockedSince;
      AI_STATES[i].signal = fresh.signal;
    }
  }, []);

  // Bersihkan obstacle saat komponen dilepas (fase berakhir) dan saat fase
  // berpindah dari driving ke layar hasil (AITraffic tetap ter-mount sebentar).
  const prevPhase = useRef<string>("");
  useEffect(() => () => {
    for (const id of idList) removeObstacle(id);
  }, [idList]);
  useFrame(() => {
    const phase = useSimStore.getState().phase;
    if (phase !== "driving" && prevPhase.current === "driving") {
      for (const id of idList) removeObstacle(id);
    }
    prevPhase.current = phase;
  });

  return (
    <group>
      {AI_SPAWNS.map((spawn) => (
        <AiVehicleView key={spawn.id} state={AI_STATES.find((s) => s.spawn.id === spawn.id)!} />
      ))}
    </group>
  );
}
