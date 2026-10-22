"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { getRoadCurve, PEDESTRIAN_CROSSING_ZS, ROAD_HALF_WIDTH, TRAFFIC_LIGHT_ZS } from "@/lib/track";

/** Small, deterministic, locally generated surface maps. No network texture dependency. */
export function surfaceTexture(paving = false) {
  const size = 128, pixels = new Uint8Array(size * size * 4);
  let seed = 731;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const joint = paving && (y % 32 < 2 || (x + (Math.floor(y / 32) % 2) * 32) % 64 < 2);
    const value = joint ? 155 : (paving ? 218 : 210) + (seed % (paving ? 10 : 28));
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value; pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; texture.needsUpdate = true;
  return texture;
}

export function metricUV(geometry: THREE.BufferGeometry, width: number, tileSize: number) {
  const uv = geometry.getAttribute("uv");
  const length = getRoadCurve().getLength();
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / tileSize, uv.getY(i) * length / tileSize);
  return geometry;
}

export function RoadDetails() {
  const geometries = useMemo(() => {
    const curve = getRoadCurve(), length = curve.getLength();
    const sets: THREE.BufferGeometry[][] = [[], [], [], []];
    const up = new THREE.Vector3(0, 1, 0);
    const add = (batch: number, distance: number, offset: number, width: number, height: number, depth: number, y: number) => {
      const t = Math.min(distance / length, 1), point = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const geo = new THREE.BoxGeometry(width, height, depth);
      geo.rotateY(Math.atan2(-tangent.x, -tangent.z));
      geo.translate(point.x + right.x * offset, y, point.z + right.z * offset);
      sets[batch].push(geo);
    };
    for (let d = 1; d < length - 1; d += 1.6) {
      const z = curve.getPointAt(d / length).z;
      // Lowered gaps keep crossings visually open to pedestrians.
      if (PEDESTRIAN_CROSSING_ZS.some(c => Math.abs(c - z) < 3)) continue;
      for (const side of [-1, 1]) add(Math.floor(d / 1.6) % 2, d, side * (ROAD_HALF_WIDTH + .16), .25, .13, 1.57, .035);
    }
    for (let d = 6; d < length - 3; d += 9) {
      const z = curve.getPointAt(d / length).z;
      if ([...PEDESTRIAN_CROSSING_ZS, ...TRAFFIC_LIGHT_ZS].some(c => Math.abs(c - z) < 5)) continue;
      add(2, d, 0, .13, .008, 3, .012);
    }
    for (let d = 12; d < length - 1; d += 24) {
      for (const side of [-1, 1]) {
        add(3, d, side * (ROAD_HALF_WIDTH + .48), .35, .012, .64, .096);
        for (let j = 0; j < 5; j++) add(1, d - .24 + j * .12, side * (ROAD_HALF_WIDTH + .48), .32, .014, .025, .104);
      }
    }
    return sets.map(parts => {
      const merged = mergeGeometries(parts); parts.forEach(p => p.dispose()); return merged;
    });
  }, []);
  return <group name="Road_details">{geometries.map((geometry, i) => <mesh key={i} geometry={geometry} receiveShadow>
    <meshStandardMaterial color={["#c5c6bb", "#737e7d", "#eee9d6", "#293b3d"][i]} roughness={.95} />
  </mesh>)}</group>;
}
