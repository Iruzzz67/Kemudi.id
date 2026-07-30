import * as THREE from "three";

export const ROAD_WIDTH = 10;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
export const START_Z = 8;
export const FINISH_Z = -170;

export type RoadWaypoint = { x: number; z: number };

// The road centerline: a straight run-up, a winding S-curve section (with a
// pedestrian crossing and a traffic light along it), then a straight run-in
// to the finish line so the finish-line check can stay a simple Z threshold.
export const ROAD_WAYPOINTS: RoadWaypoint[] = [
  { x: 0, z: START_Z },
  { x: 0, z: -8 },
  { x: 3.2, z: -30 },
  { x: -3.4, z: -55 },
  { x: 0, z: -75 },
  { x: 3.6, z: -95 },
  { x: -2.8, z: -120 },
  { x: 0, z: -145 },
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

const SAMPLE_COUNT = 400;

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
// crossings, signs) so they sit on the centerline and follow its heading.
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
export const PEDESTRIAN_CROSSING_ZS = [-30, -145];
export const TRAFFIC_LIGHT_Z = -75;
