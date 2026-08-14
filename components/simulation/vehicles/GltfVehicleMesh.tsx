"use client";

import { RefObject, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useXR } from "@react-three/xr";
import { VehicleConfig, VehicleType, pivotHeightOf, VehicleVariant } from "@/lib/vehicles";
import { splitMergedFrontWheels } from "./splitWheels";

// ── Model per platform ─────────────────────────────────────────────────────
// Model default dipakai untuk varian tanpa GLB sendiri: MOBIL memakai
// f1roadcar.glb, TRUK memakai truckww2.glb. Varian dengan field `glb`
// (lib/vehicles.ts) memakai model spesifiknya — saat ini hanya sedan →
// bmw.glb dan box → truckww2.glb (varian lain sudah dihapus). Auto-fit di
// bawah menormalkan skala model ke kotak collider kendaraan (lib/vehicles.ts).
//
// Arah hadap model (diukur langsung dari binary GLB): motor.glb menghadap -Z
// (hidung di -Z) — tidak butuh putar. f1roadcar.glb: root transform R_x(+90°)
// memetakan raw -Y → world +Z — model menghadap +Z, butuh 180° agar menghadap
// -Z (maju). truckww2.glb juga menghadap +Z — butuh 180°. bmw.glb panjang di
// sumbu X (bukan Z) dengan hidung di +X — auto-fit π/2 sudah menyejajarkannya,
// jadi rotasi ekstra 0 (lihat EXTRA_ROTATION_BY_URL di bawah).
const MODEL_URLS: Record<VehicleType, { desktop: string; vr: string }> = {
  MOTOR: { desktop: "/models/motor.glb", vr: "/models/motor.glb" },
  MOBIL: { desktop: "/models/f1roadcar.glb", vr: "/models/f1roadcar.glb" },
  TRUK: { desktop: "/models/truckww2.glb", vr: "/models/truckww2.glb" },
};

// Arah hadap model diukur per-URL (GLTFLoader.parse + profil siluet — GROUND
// TRUTH). Nilai ini rotasi EKSTRA di atas auto-fit (yang sudah memutar model
// ber-poros-X agar panjangnya sejajar -Z):
//   - motor.glb: hidung di -Z — tidak butuh putar.
//   - f1roadcar.glb: hidung di +Z — perlu 180°.
//   - truckww2.glb: kabin di +Z — perlu 180°.
//   - bmw.glb: PANJANG di sumbu X, hidung di +X — auto-fit π/2 sudah
//     menyejajarkannya ke -Z, jadi rotasi ekstra 0 (memakai π yang diukur
//     untuk f1roadcar membuat hidung mengarah +Z = mobil kebalik).
const EXTRA_ROTATION_BY_URL: Record<string, number> = {
  "/models/motor.glb": 0,
  "/models/f1roadcar.glb": Math.PI,
  "/models/truckww2.glb": Math.PI,
};

// Fallback per tipe untuk model/varian yang belum diukur (fortuner, mercedes,
// dll.) — nilai yang sama dengan model default per jenisnya.
const EXTRA_ROTATION_Y: Record<VehicleType, { desktop: number; vr: number }> = {
  MOTOR: { desktop: 0, vr: 0 },
  MOBIL: { desktop: Math.PI, vr: Math.PI },
  TRUK: { desktop: Math.PI, vr: Math.PI },
};

// Some exports carry a leftover ground/backdrop plane (and sometimes a
// camera) from whatever tool produced the .glb — these aren't part of the
// vehicle and badly skew the auto-fit bounding box below if left in.
const HELPER_NAME_PATTERN = /^(plane\d*|ground[_-]?plane\d*|backdrop\d*)$/i;

function stripHelperObjects(root: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];
  root.traverse((obj) => {
    const isCamera = (obj as THREE.Camera).isCamera;
    const isHelperMesh = (obj as THREE.Mesh).isMesh && HELPER_NAME_PATTERN.test(obj.name);
    if (isCamera || isHelperMesh) toRemove.push(obj);
  });
  toRemove.forEach((obj) => obj.parent?.remove(obj));
}

// Node names (by source glTF node name, not mesh name) that make up each
// independently-steerable assembly — everything physically bolted to the
// front fork/axle, so it swivels as one rigid piece with the wheel/handlebar
// instead of the tire spinning away from a fork that stays put. Each inner
// array shares a single pivot; separate arrays get their own pivot so they
// swivel in place instead of arcing around a shared center between them.
//
// Hanya MOTOR yang punya roda depan terpisah di ekspor aslinya (ban_depan
// dkk). f1roadcar.glb adalah ekspor Sketchfab hasil material-merger — rodanya
// menyatu ke mesh body — jadi splitMergedFrontWheels() di bawah mengekstrak
// roda depannya menjadi sub-mesh bernama wheel-front-left/right sebelum grup
// kemudi dibangun. TRUK (truckww2.glb) juga hasil merger dan tidak punya roda
// kemudi visual.
const STEER_GROUPS: Partial<Record<VehicleType, string[][]>> = {
  MOTOR: [["ban_depan", "shock_depan", "spakbor_depan", "rem_depan", "handlebars", "rem_tangan", "kopling"]],
  MOBIL: [["wheel-front-left"], ["wheel-front-right"]],
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Blender exports commonly have several objects sharing one name (e.g. a
// wheel's tire/rim/hub) — GLTFLoader disambiguates collisions by appending
// "_1", "_2", ... to the name, so match the whole family, not just the bare
// name (which would only catch one of the three and leave the rest behind).
function buildNameMatcher(baseNames: string[]) {
  const pattern = new RegExp(`^(?:${baseNames.map(escapeRegExp).join("|")})(?:_\\d+)?$`);
  return (name: string) => pattern.test(name);
}

function buildSteerGroups(model: THREE.Object3D, groups: string[][] | undefined): THREE.Object3D[] {
  if (!groups || groups.length === 0) return [];
  model.updateMatrixWorld(true);

  const pivots: THREE.Object3D[] = [];
  for (const baseNames of groups) {
    const matches = buildNameMatcher(baseNames);
    const matched: THREE.Object3D[] = [];
    model.traverse((obj) => {
      if (matches(obj.name)) matched.push(obj);
    });
    if (matched.length === 0) continue;

    // Pivot at the assembly's own bounding-box center — a reasonable stand-in
    // for the real steering axis without needing per-model axle metadata.
    const box = new THREE.Box3();
    matched.forEach((obj) => box.expandByObject(obj));
    const center = box.getCenter(new THREE.Vector3());

    const pivot = new THREE.Group();
    pivot.position.copy(center);
    model.add(pivot);
    // attach() (not add()) reparents while preserving each part's current
    // world transform, so nothing jumps even though these parts may be
    // nested several levels deep in the original hierarchy.
    matched.forEach((obj) => pivot.attach(obj));
    pivots.push(pivot);
  }
  return pivots;
}

export function GltfVehicleMesh({
  config,
  variant,
  leanRef,
  steerRef,
}: {
  config: VehicleConfig;
  variant?: VehicleVariant;
  leanRef: RefObject<THREE.Group | null>;
  steerRef: RefObject<THREE.Object3D[]>;
}) {
  const isPresenting = useXR((s) => s.session != null);
  const variantUrl = variant?.glb;
  const url =
    variantUrl ??
    MODEL_URLS[config.type][isPresenting ? "vr" : "desktop"];
  // Rotasi ekstra mengikuti MODEL yang sebenarnya dipakai (varian bisa berbeda
  // arah hadap dari model default per tipe) — lihat EXTRA_ROTATION_BY_URL.
  const extraRotationY = EXTRA_ROTATION_BY_URL[url] ?? EXTRA_ROTATION_Y[config.type][isPresenting ? "vr" : "desktop"];
  const { scene } = useGLTF(url);

  // Clone so re-selecting a vehicle (unmount/remount) doesn't reuse — and
  // mutate in place — the single scene graph useGLTF caches per URL.
  const { model, steerGroups } = useMemo(() => {
    const clone = scene.clone(true);
    stripHelperObjects(clone);
    // Model mobil: split roda depan agar bisa berbelok. Motor & truk punya
    // kelompok kemudi sendiri (STEER_GROUPS) atau roda menyatu.
    if (config.type === "MOBIL") splitMergedFrontWheels(clone);
    const groups = buildSteerGroups(clone, STEER_GROUPS[config.type]);
    return { model: clone, steerGroups: groups };
  }, [scene, config.type]);

  useEffect(() => {
    steerRef.current = steerGroups;
  }, [steerGroups, steerRef]);

  useEffect(() => {
    model.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [model]);

  // Auto-fit the model into the vehicle's physics/collider bounding box
  // (lib/vehicles.ts) so the exported .blend's own scale/units don't matter.
  // Which horizontal axis is "length" varies per export (some face -Z, some
  // face -X), so pick whichever of the model's raw x/z is longer — a vehicle
  // is always longer than it is wide — rather than assuming z is length, and
  // add the matching 90° correction so it still ends up facing -Z.
  const { scale, offset, rotationY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const zIsLength = size.z >= size.x;
    const modelWidth = zIsLength ? size.x : size.z;
    const modelLength = zIsLength ? size.z : size.x;
    const autoRotationY = zIsLength ? 0 : Math.PI / 2;

    const s = Math.min(
      config.dimensions.width / Math.max(modelWidth, 1e-4),
      config.dimensions.height / Math.max(size.y, 1e-4),
      config.dimensions.length / Math.max(modelLength, 1e-4)
    );

    // Translation is applied after rotation in Object3D's local transform, so
    // to land the model centered at the origin post-rotation, rotate the
    // (scaled) center first and cancel that out — instead of the center in
    // the model's own unrotated axes, which would land wrong once rotated.
    const totalRotationY = autoRotationY + extraRotationY;
    const scaledCenter = center.clone().multiplyScalar(s);
    scaledCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), totalRotationY);

    return {
      scale: s,
      offset: new THREE.Vector3(-scaledCenter.x, -box.min.y * s, -scaledCenter.z),
      rotationY: totalRotationY,
    };
  }, [model, config.dimensions, extraRotationY]);

  const pivotHeight = pivotHeightOf(config);

  return (
    <group ref={leanRef} position={[0, pivotHeight, 0]}>
      <group position={[0, -pivotHeight, 0]}>
        <primitive
          object={model}
          scale={scale}
          position={[offset.x, offset.y, offset.z]}
          rotation={[0, rotationY, 0]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/models/motor.glb");
useGLTF.preload("/models/f1roadcar.glb");
useGLTF.preload("/models/truckww2.glb");
useGLTF.preload("/models/bmw.glb");
useGLTF.preload("/models/fortuner.glb");
useGLTF.preload("/models/mercedes.glb");
