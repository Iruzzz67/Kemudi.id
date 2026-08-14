import * as THREE from "three";

export const ROAD_WIDTH = 10;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
// Center of the parked vehicle before the drive starts (and where the drive
// begins). The asphalt itself starts ROAD_START_Z — a few meters BEHIND the
// parked vehicle — so the whole body of the parked truck/motor/car (longest:
// truck, rear reaches z ≈ 11.75) sits on the road instead of half over the
// grass at the road's edge.
export const START_Z = 8;
export const ROAD_START_Z = START_Z + 8;
// Track diperpanjang menjadi map bergaya Kota Bogor (lihat
// DOKUMENTASI_SIMULASI_BOGOR_OBSTACLE.md): dari area start di z=+8 sampai
// finish di z=-900 (± 916 m). Sepanjang jalan ada persimpangan + lampu lalu
// lintas, kawasan pertokoan, S-Curve, permukiman, zona obstacle (cone,
// barrier, truk berhenti, lubang jalan), lalu jalur berkelok menuju finish.
export const FINISH_Z = -900;

// Waktu par untuk perhitungan penalti waktu pada skor akhir. Trek sepanjang
// ±916 m dengan obstacle — 120 detik terasa adil untuk semua kendaraan.
export const PAR_TIME_S = 120;

export type RoadWaypoint = { x: number; z: number };

// Jalan dimulai di belakang kendaraan parkir (ROAD_START_Z), melewati
// segmen-segmen berikut (sesuai tabel segmen di dokumentasi):
//   Start Area     8  → -60   jalan lurus, area parkir
//   Kota 1        -60 → -180  pertokoan, lampu lalu lintas (-75), zebra (-150)
//   S-Curve      -180 → -300  tikungan S dengan cone & barrier (-210, -250)
//   Permukiman   -300 → -430  rumah, gang, mobil parkir (-350), zebra (-390)
//   Obstacle Zone -430 → -520 palang proyek (-465), barrier (-470), truk
//                             berhenti (-495), lubang jalan (-510)
//   Tanjakan      -520 → -620  (kontur ringan; fisika tetap di y=0)
//   Kota 2        -620 → -760  persimpangan + lampu (-650), halte (-675),
//                             bus/angkot (-705), mobil parkir (-690)
//   Berkelok      -760 → -850  tikungan kanan-kiri, cone (-805), tiang (-735)
//   Finish        -850 → -900  lurus + zebra terakhir (-850) + garis finish
//
// Segmen terakhir harus lurus (x=0) karena pengecekan finish di
// VehicleController memakai threshold sumbu Z sederhana.
export const ROAD_WAYPOINTS: RoadWaypoint[] = [
  { x: 0, z: ROAD_START_Z },
  { x: 0, z: -60 },
  { x: 1.6, z: -110 },
  { x: 0, z: -160 },
  { x: 3.6, z: -210 },
  { x: -3.6, z: -260 },
  { x: 0, z: -300 },
  { x: -2.6, z: -350 },
  { x: 2.2, z: -400 },
  { x: 0, z: -440 },
  { x: 0, z: -500 },
  { x: 1.8, z: -560 },
  { x: -1.8, z: -610 },
  { x: 0, z: -660 },
  { x: 2.8, z: -720 },
  { x: -2.8, z: -775 },
  { x: 2.4, z: -820 },
  { x: 0, z: -850 },
  { x: 0, z: FINISH_Z },
];

export type RoadSample = { point: THREE.Vector3; tangent: THREE.Vector3 };

let cachedCurve: THREE.CatmullRomCurve3 | null = null;
export function getRoadCurve(): THREE.CatmullRomCurve3 {
  if (!cachedCurve) {
    cachedCurve = new THREE.CatmullRomCurve3(
      ROAD_WAYPOINTS.map((p) => new THREE.Vector3(p.x, 0, p.z)),
      false,
      "catmullrom",
      0.4
    );
  }
  return cachedCurve;
}

// Sampling dinaikkan dari 400 → 1600 titik agar tikungan panjang S-Curve dan
// jalur berkelok tetap mulus (±0,57 m antar sampel sepanjang ±916 m).
const SAMPLE_COUNT = 1600;

let cachedSamples: RoadSample[] | null = null;
export function getRoadSamples(): RoadSample[] {
  if (!cachedSamples) {
    const curve = getRoadCurve();
    const points = curve.getSpacedPoints(SAMPLE_COUNT);
    cachedSamples = points.map((point, i) => ({
      point,
      tangent: curve.getTangent(Math.min(1, i / SAMPLE_COUNT)).normalize(),
    }));
  }
  return cachedSamples;
}

// Distance from (x, z) to the nearest point on the road centerline. Used for
// curve-aware off-road detection — sample spacing is well under a meter over
// the whole track, so nearest-sample distance is an accurate stand-in for
// true point-to-curve distance at the scale of ROAD_HALF_WIDTH.
export function distanceToRoadCenterline(x: number, z: number): number {
  const samples = getRoadSamples();
  let closest = Infinity;
  for (const s of samples) {
    const dx = s.point.x - x;
    const dz = s.point.z - z;
    const d = dx * dx + dz * dz;
    if (d < closest) closest = d;
  }
  return Math.sqrt(closest);
}

// Nearest road sample to a target Z, used to place obstacles (pedestrian
// crossings, signs, obstacle assets) so they sit on the centerline and follow
// its heading.
export function getSampleNearZ(targetZ: number): RoadSample {
  const samples = getRoadSamples();
  let best = samples[0];
  let bestDist = Infinity;
  for (const s of samples) {
    const d = Math.abs(s.point.z - targetZ);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

// Heading (radians, around Y) that makes an object's local -Z axis point
// along the sample's tangent — the same convention VehicleController uses
// for the vehicle's own yaw, so obstacles rotate consistently with the road.
export function headingFromTangent(tangent: THREE.Vector3): number {
  return Math.atan2(tangent.x, -tangent.z);
}

export type RibbonOptions = { offset: number; width: number; y: number };

// Builds a flat strip of triangles following the road centerline, offset
// sideways by `offset` and `width` wide — used for the asphalt surface and
// the painted edge lines so they follow the curve instead of a straight plane.
export function buildRibbonGeometry({ offset, width, y }: RibbonOptions): THREE.BufferGeometry {
  const samples = getRoadSamples();
  const up = new THREE.Vector3(0, 1, 0);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  samples.forEach((s, i) => {
    const right = new THREE.Vector3().crossVectors(s.tangent, up).normalize();
    const innerX = s.point.x + right.x * (offset - width / 2);
    const innerZ = s.point.z + right.z * (offset - width / 2);
    const outerX = s.point.x + right.x * (offset + width / 2);
    const outerZ = s.point.z + right.z * (offset + width / 2);

    positions.push(innerX, y, innerZ, outerX, y, outerZ);
    const v = i / (samples.length - 1);
    uvs.push(0, v, 1, v);

    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Fixed obstacle placements along the road, expressed as an approximate Z —
// resolved to an exact point + heading via getSampleNearZ at render time.
// (3 zebra cross + 2 lampu lalu lintas, sesuai dokumentasi Bogor.)
export const PEDESTRIAN_CROSSING_ZS = [-150, -390, -850];
export const TRAFFIC_LIGHT_ZS = [-75, -650];
