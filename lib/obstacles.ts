// Lightweight 2D collision for the sim's hand-rolled kinematic physics.
//
// The vehicle (and the walking character) are moved imperatively every frame
// as kinematic bodies, which Rapier's solver never pushes back — so nothing
// physically stops them from ghosting through poles, pedestrians, or the
// parked car. Every solid object registers here (as a circle or an oriented
// rectangle), and the movers query the registry each frame to block
// themselves. This keeps blocking deterministic and independent of the
// physics step timing.
//
// Selain objek solid klasik (kendaraan, pejalan kaki, tiang), registry juga
// dipakai untuk rintangan lintasan (cone, barrier, pedagang). Objek dengan
// `soft: true` (cone lalu lintas, kios pedagang) TIDAK menghentikan kendaraan
// — kendaraan menerobos dengan sedikit hambatan, tapi menabraknya tetap
// dihitung sebagai penalti (obstacleHits).

export type ObstacleKind =
  | "vehicle"
  | "pedestrian"
  | "pole"
  | "cone"
  | "barrier"
  | "vendor";

export type CircleObstacle = {
  shape: "circle";
  kind: ObstacleKind;
  x: number;
  z: number;
  radius: number;
  /** Soft = passable (kendaraan menerobos) tetapi tetap dihitung sebagai hit. */
  soft?: boolean;
};

// Oriented rectangle: center (x, z), yaw around +Y. The LONG axis (halfL)
// runs along the vehicle's forward direction (-Z at yaw 0) and the short
// axis (halfW) along its right — the same convention VehicleController uses,
// so the parked car and the moving car block identically.
export type RectObstacle = {
  shape: "rect";
  kind: ObstacleKind;
  x: number;
  z: number;
  yaw: number;
  halfW: number;
  halfL: number;
  soft?: boolean;
};

export type SolidObstacle = CircleObstacle | RectObstacle;

export type CollisionQuery = {
  /** Skip the obstacle registered under this id (e.g. a body querying itself). */
  ignoreId?: string;
  /** Only test obstacles of these shapes. */
  shapes?: ("circle" | "rect")[];
  /** Skip all obstacles whose id is in this list (dipakai AI untuk probe jalur). */
  excludeIds?: string[];
  /** Hanya hitung obstacle solid (soft:true dilewati) — dipakai AI. */
  solidOnly?: boolean;
};

// Hasil pengecekan membawa id registrasi objek yang tertabrak — dipakai
// VehicleController untuk menghitung obstacleHits satu kali per objek (bukan
// per-frame) tanpa perlu tahu posisi/geometri objek.
export type CollisionResult = { id: string; obstacle: SolidObstacle } | null;

const obstacles = new Map<string, SolidObstacle>();

export function setObstacle(id: string, obstacle: SolidObstacle): void {
  obstacles.set(id, obstacle);
}

/** Baca obstacle yang terdaftar (mis. untuk AI memberi jalan ke pemain). */
export function getObstacle(id: string): SolidObstacle | undefined {
  return obstacles.get(id);
}

export function removeObstacle(id: string): void {
  obstacles.delete(id);
}

function queryAllows(obs: SolidObstacle, id: string, query?: CollisionQuery): boolean {
  if (query?.ignoreId && id === query.ignoreId) return false;
  if (query?.excludeIds && query.excludeIds.includes(id)) return false;
  if (query?.shapes && !query.shapes.includes(obs.shape)) return false;
  if (query?.solidOnly && obs.soft) return false;
  return true;
}

// Does the circle centered at (cx, cz) overlap `rect`? Point-in-rotated-rect
// closest-point test: the rect's local frame is forward = (-sin, -cos) and
// right = (cos, -sin) in (x, z), matching the vehicle's own heading math.
export function circleHitsRect(
  cx: number,
  cz: number,
  radius: number,
  rect: RectObstacle
): boolean {
  const dx = cx - rect.x;
  const dz = cz - rect.z;
  const f = dx * -Math.sin(rect.yaw) + dz * -Math.cos(rect.yaw);
  const r = dx * Math.cos(rect.yaw) + dz * -Math.sin(rect.yaw);
  const cf = Math.max(-rect.halfL, Math.min(rect.halfL, f));
  const cr = Math.max(-rect.halfW, Math.min(rect.halfW, r));
  const df = f - cf;
  const dr = r - cr;
  return df * df + dr * dr <= radius * radius;
}

export function circleHitsCircle(
  ax: number,
  az: number,
  ar: number,
  bx: number,
  bz: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  const rr = ar + br;
  return dx * dx + dz * dz <= rr * rr;
}

// Separating-axis test for two oriented rectangles (2D). Only ever exercised
// defensively — the parked car and the moving car never coexist (different
// phases) — but kept correct so the registry's contract holds.
export function rectHitsRect(a: RectObstacle, b: RectObstacle): boolean {
  const axes = [
    { x: -Math.sin(a.yaw), z: -Math.cos(a.yaw) },
    { x: Math.cos(a.yaw), z: -Math.sin(a.yaw) },
    { x: -Math.sin(b.yaw), z: -Math.cos(b.yaw) },
    { x: Math.cos(b.yaw), z: -Math.sin(b.yaw) },
  ];
  for (const axis of axes) {
    const project = (rect: RectObstacle) => {
      const forward = -Math.sin(rect.yaw) * axis.x + -Math.cos(rect.yaw) * axis.z;
      const right = Math.cos(rect.yaw) * axis.x + -Math.sin(rect.yaw) * axis.z;
      const half = rect.halfL * Math.abs(forward) + rect.halfW * Math.abs(right);
      const center = rect.x * axis.x + rect.z * axis.z;
      return { min: center - half, max: center + half };
    };
    const pa = project(a);
    const pb = project(b);
    if (pa.max < pb.min || pb.max < pa.min) return false;
  }
  return true;
}

// First registered obstacle the given circle overlaps (or null).
export function circleCollides(
  cx: number,
  cz: number,
  radius: number,
  query?: CollisionQuery
): CollisionResult {
  for (const [id, obs] of obstacles) {
    if (!queryAllows(obs, id, query)) continue;
    if (obs.shape === "circle") {
      if (circleHitsCircle(cx, cz, radius, obs.x, obs.z, obs.radius)) return { id, obstacle: obs };
    } else if (circleHitsRect(cx, cz, radius, obs)) {
      return { id, obstacle: obs };
    }
  }
  return null;
}

// First registered obstacle the given oriented rect overlaps (or null).
export function rectCollides(rect: RectObstacle, query?: CollisionQuery): CollisionResult {
  for (const [id, obs] of obstacles) {
    if (!queryAllows(obs, id, query)) continue;
    if (obs.shape === "circle") {
      if (circleHitsRect(obs.x, obs.z, obs.radius, rect)) return { id, obstacle: obs };
    } else if (rectHitsRect(rect, obs)) {
      return { id, obstacle: obs };
    }
  }
  return null;
}
