import * as THREE from "three";

// Splits the material-merged front wheels out of a GLB model so the existing
// name-based steering mechanism (STEER_GROUPS in GltfVehicleMesh) can pivot
// them. Sketchfab "material-merger" exports fuse every wheel's triangles into
// the same BufferGeometry as the body — but they never share vertices with
// the body, so a connected-component pass over the index buffer recovers the
// original parts exactly.
//
// Thresholds below are tuned against f1roadcar.glb (world units = meters,
// nose at +Z, front axle ≈ z = +1.32, wheel centers ≈ (±0.90, 0.35, +1.32),
// tire radius ≈ 0.25). If this ever runs against a differently-proportioned
// merged model, re-derive the constants from its wheel geometry.

// A "wheel anchor" is a component shaped like a tire: thin across the car's
// width (x), round in the y-z plane, low at the sides, in the front half
// (f1roadcar faces +Z, so its front axle sits at z > 0).
const ANCHOR_MAX_X_SIZE = 0.4;
const ANCHOR_MIN_YZ = 0.3;
const ANCHOR_MAX_YZ = 0.55;
const ANCHOR_CIRCULARITY = 0.12;
const ANCHOR_MIN_ABS_X = 0.6;
const ANCHOR_MAX_ABS_X = 1.15;
const ANCHOR_MIN_Y = 0.15;
const ANCHOR_MAX_Y = 0.5;

// Everything whose center is within this radius of a wheel center is part of
// that wheel (tire rings, rim, hub, brake disc, suspension arms) and rotates
// with it. Body parts (side skirt, nose, front wing) sit farther out.
const ASSIGN_RADIUS = 0.5;

// Size guard: never rip out a long/body-sized component even if it happens to
// start near a wheel center (belt and suspenders on top of ASSIGN_RADIUS).
const MAX_COMPONENT_X = 0.6;
const MAX_COMPONENT_Y = 0.85;
const MAX_COMPONENT_Z = 1.1;

type WheelSide = 1 | -1; // +1 = right (+X), -1 = left (-X)

type Component = {
  mesh: THREE.Mesh;
  tris: number[]; // local triangle indices within the mesh's index buffer
  min: [number, number, number];
  max: [number, number, number];
  center: THREE.Vector3;
  size: THREE.Vector3;
};

type Wheel = {
  side: WheelSide;
  name: "wheel-front-left" | "wheel-front-right";
  center: THREE.Vector3;
};

function indexArrayFor(vcount: number): Uint16ArrayConstructor | Uint32ArrayConstructor {
  return vcount > 65535 ? Uint32Array : Uint16Array;
}

// Builds a NEW geometry containing only `triList`'s triangles, with its OWN
// compacted attribute buffers (only the vertices those triangles reference).
// Sharing the source mesh's attribute arrays would leave orphan vertices in
// the buffer, and three.js computes bounding boxes from the whole attribute —
// so a "wheel" sub-mesh would report a bounding box spanning the entire car,
// which breaks Box3-based pivots (buildSteerGroups) and frustum culling.
function buildIndexedGeometry(
  srcGeo: THREE.BufferGeometry,
  srcIdx: ArrayLike<number>,
  triList: number[]
): THREE.BufferGeometry {
  const newGeo = new THREE.BufferGeometry();
  if (triList.length === 0) return newGeo;

  // Remap referenced vertices to a dense 0..n-1 range.
  const remap = new Map<number, number>();
  const newToOld: number[] = [];
  const outIdx = new Uint32Array(triList.length * 3);
  for (let i = 0; i < triList.length; i++) {
    const t = triList[i];
    for (let k = 0; k < 3; k++) {
      const old = srcIdx[t * 3 + k];
      let ni = remap.get(old);
      if (ni === undefined) {
        ni = newToOld.length;
        remap.set(old, ni);
        newToOld.push(old);
      }
      outIdx[i * 3 + k] = ni;
    }
  }
  newGeo.setIndex(new THREE.BufferAttribute(new (indexArrayFor(newToOld.length))(outIdx), 1));

  for (const name of Object.keys(srcGeo.attributes)) {
    const attr = srcGeo.attributes[name] as THREE.BufferAttribute;
    if (attr.itemSize < 1 || attr.itemSize > 4) continue; // skip exotic layouts
    // Float32 everywhere: safe for position/normal/uv/color regardless of the
    // source layout (interleaved or typed as integers). Reading via
    // getX/getY/getZ matters: they account for interleaved stride/offset AND
    // denormalize normalized integer attrs (e.g. Uint8 color) to 0..1 — so a
    // future "simplification" to raw `array[...]` reads would break both.
    const out = new Float32Array(newToOld.length * attr.itemSize);
    for (let ni = 0; ni < newToOld.length; ni++) {
      const old = newToOld[ni];
      switch (attr.itemSize) {
        case 1:
          out[ni] = attr.getX(old);
          break;
        case 2:
          out[ni * 2] = attr.getX(old);
          out[ni * 2 + 1] = attr.getY(old);
          break;
        case 3:
          out[ni * 3] = attr.getX(old);
          out[ni * 3 + 1] = attr.getY(old);
          out[ni * 3 + 2] = attr.getZ(old);
          break;
        case 4:
          out[ni * 4] = attr.getX(old);
          out[ni * 4 + 1] = attr.getY(old);
          out[ni * 4 + 2] = attr.getZ(old);
          out[ni * 4 + 3] = attr.getW(old);
          break;
      }
    }
    newGeo.setAttribute(name, new THREE.BufferAttribute(out, attr.itemSize));
  }
  return newGeo;
}

/**
 * Mutates `model` (a freshly-cloned scene graph — the shared cached geometry
 * is never touched): creates sub-meshes named `wheel-front-left` /
 * `wheel-front-right` from the merged front-wheel triangles, and trims those
 * triangles out of the original meshes. No-op when no front wheels are found.
 */
export function splitMergedFrontWheels(model: THREE.Object3D): void {
  model.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });

  // Local triangle index used per mesh (a freshly built implicit one when the
  // source geometry is non-indexed).
  const indexOf = new Map<THREE.Mesh, ArrayLike<number>>();
  const components: Component[] = [];

  for (const mesh of meshes) {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos || pos.count === 0) continue;
    const vcount = pos.count;

    // World-space vertices (matrixWorld is valid: updateMatrixWorld above).
    const e = mesh.matrixWorld.elements;
    const wx = new Float32Array(vcount);
    const wy = new Float32Array(vcount);
    const wz = new Float32Array(vcount);
    for (let v = 0; v < vcount; v++) {
      const x = pos.getX(v);
      const y = pos.getY(v);
      const z = pos.getZ(v);
      wx[v] = e[0] * x + e[4] * y + e[8] * z + e[12];
      wy[v] = e[1] * x + e[5] * y + e[9] * z + e[13];
      wz[v] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }

    let idx: ArrayLike<number>;
    if (geo.index) {
      idx = geo.index.array;
    } else {
      const arr = new Uint32Array(vcount);
      for (let i = 0; i < vcount; i++) arr[i] = i;
      idx = arr;
    }
    indexOf.set(mesh, idx);

    const triCount = Math.floor(idx.length / 3);
    if (triCount === 0) continue;

    // Disjoint-set union over triangles that share a vertex. O(n·α(n)).
    const dsu = new Int32Array(triCount).fill(-1);
    const find = (a: number): number => {
      let r = a;
      while (dsu[r] >= 0) r = dsu[r];
      while (dsu[a] >= 0) {
        const n = dsu[a];
        dsu[a] = r;
        a = n;
      }
      return r;
    };
    const union = (a: number, b: number): void => {
      a = find(a);
      b = find(b);
      if (a === b) return;
      if (dsu[a] > dsu[b]) {
        const t = a;
        a = b;
        b = t;
      }
      dsu[a] += dsu[b];
      dsu[b] = a;
    };
    const firstTri = new Map<number, number>();
    for (let t = 0; t < triCount; t++) {
      for (let k = 0; k < 3; k++) {
        const vi = idx[t * 3 + k];
        const prev = firstTri.get(vi);
        if (prev === undefined) firstTri.set(vi, t);
        else union(prev, t);
      }
    }

    const comps = new Map<number, Component>();
    for (let t = 0; t < triCount; t++) {
      const r = find(t);
      let c = comps.get(r);
      if (!c) {
        c = {
          mesh,
          tris: [],
          min: [Infinity, Infinity, Infinity],
          max: [-Infinity, -Infinity, -Infinity],
          center: new THREE.Vector3(),
          size: new THREE.Vector3(),
        };
        comps.set(r, c);
      }
      c.tris.push(t);
      for (let k = 0; k < 3; k++) {
        const vi = idx[t * 3 + k];
        const x = wx[vi];
        const y = wy[vi];
        const z = wz[vi];
        if (x < c.min[0]) c.min[0] = x;
        if (y < c.min[1]) c.min[1] = y;
        if (z < c.min[2]) c.min[2] = z;
        if (x > c.max[0]) c.max[0] = x;
        if (y > c.max[1]) c.max[1] = y;
        if (z > c.max[2]) c.max[2] = z;
      }
    }
    for (const c of comps.values()) {
      c.center.set((c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2);
      c.size.set(c.max[0] - c.min[0], c.max[1] - c.min[1], c.max[2] - c.min[2]);
      components.push(c);
    }
  }

  if (components.length === 0) return;

  // ---- 1) Find front-wheel anchors (circular tire rings) ----
  const anchors = components.filter(
    (c) =>
      c.size.x < ANCHOR_MAX_X_SIZE &&
      c.size.y > ANCHOR_MIN_YZ &&
      c.size.y < ANCHOR_MAX_YZ &&
      c.size.z > ANCHOR_MIN_YZ &&
      c.size.z < ANCHOR_MAX_YZ &&
      Math.abs(c.size.y - c.size.z) < ANCHOR_CIRCULARITY &&
      Math.abs(c.center.x) > ANCHOR_MIN_ABS_X &&
      Math.abs(c.center.x) < ANCHOR_MAX_ABS_X &&
      c.center.y > ANCHOR_MIN_Y &&
      c.center.y < ANCHOR_MAX_Y &&
      c.center.z > 0
  );
  if (anchors.length === 0) return;

  // Average the anchors per side → one wheel center per side.
  const wheelCounts = new Map<WheelSide, number>();
  const wheels: Wheel[] = [];
  for (const a of anchors) {
    const side: WheelSide = a.center.x >= 0 ? 1 : -1;
    let wheel = wheels.find((w) => w.side === side);
    if (!wheel) {
      wheel = {
        side,
        name: side === 1 ? "wheel-front-right" : "wheel-front-left",
        center: new THREE.Vector3(),
      };
      wheels.push(wheel);
    }
    wheel.center.add(a.center);
    wheelCounts.set(side, (wheelCounts.get(side) ?? 0) + 1);
  }
  for (const w of wheels) w.center.divideScalar(wheelCounts.get(w.side) ?? 1);

  // ---- 2) Assign every component near a wheel center to that wheel ----
  const r2 = ASSIGN_RADIUS * ASSIGN_RADIUS;
  const wheelParts = new Map<Wheel, Map<THREE.Mesh, number[]>>();
  for (const c of components) {
    if (c.size.x > MAX_COMPONENT_X || c.size.y > MAX_COMPONENT_Y || c.size.z > MAX_COMPONENT_Z) {
      continue;
    }
    let best: Wheel | null = null;
    let bestD2 = Infinity;
    for (const w of wheels) {
      const d2 = c.center.distanceToSquared(w.center);
      if (d2 <= r2 && d2 < bestD2) {
        best = w;
        bestD2 = d2;
      }
    }
    if (!best) continue;
    let byMesh = wheelParts.get(best);
    if (!byMesh) {
      byMesh = new Map();
      wheelParts.set(best, byMesh);
    }
    const list = byMesh.get(c.mesh);
    if (list) list.push(...c.tris);
    else byMesh.set(c.mesh, [...c.tris]);
  }
  if (wheelParts.size === 0) return;

  // ---- 3) Surgery: wheel sub-meshes + trimmed originals ----
  // One source mesh may contribute triangles to BOTH wheels (e.g. a mesh that
  // spans both sides), so collect every removed triangle per mesh first.
  const removed = new Map<THREE.Mesh, Set<number>>();

  for (const [wheel, byMesh] of wheelParts) {
    for (const [mesh, tris] of byMesh) {
      const srcIdx = indexOf.get(mesh);
      const geo = mesh.geometry as THREE.BufferGeometry;
      if (!srcIdx || tris.length === 0) continue;

      const subGeo = buildIndexedGeometry(geo, srcIdx, tris);
      // Multi-material geometry groups are not preserved here (material[0]
      // only) — fine for these material-merged Sketchfab exports, which have
      // exactly one material per mesh.
      const sub = new THREE.Mesh(subGeo, Array.isArray(mesh.material) ? mesh.material[0] : mesh.material);
      sub.name = wheel.name;
      // Sibling of the source mesh with the exact same transform, so the
      // extracted triangles land in the same world spot.
      sub.position.copy(mesh.position);
      sub.quaternion.copy(mesh.quaternion);
      sub.scale.copy(mesh.scale);
      mesh.parent?.add(sub);

      let set = removed.get(mesh);
      if (!set) {
        set = new Set();
        removed.set(mesh, set);
      }
      for (const t of tris) set.add(t);
    }
  }

  for (const [mesh, set] of removed) {
    const srcIdx = indexOf.get(mesh);
    if (!srcIdx) continue;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const triCount = Math.floor(srcIdx.length / 3);
    const kept: number[] = [];
    for (let t = 0; t < triCount; t++) {
      if (!set.has(t)) kept.push(t);
    }
    if (kept.length === 0) {
      mesh.parent?.remove(mesh);
      continue;
    }
    mesh.geometry = buildIndexedGeometry(geo, srcIdx, kept);
  }
}
