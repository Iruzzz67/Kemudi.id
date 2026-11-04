# Realism baseline audit — 2026-11-03

## Gate 0: evidence, not assumptions

The requested plan was read in full. `DOKUMENTASI_WEBSITE_DAN_SIMULASI.md` is absent from the workspace; the implementation plan and actual source are the available evidence. The repository has an existing dirty migration from Next.js to .NET/Three.js. Those deletions and unrelated edits are not this change and must not be reverted.

Actual runtime: `src/Kemudi.Web/wwwroot/simulation-3d/index.html`, classic scripts using local Three.js r128, embedded by the Blazor website. No Next.js or Unity implementation is involved.

| Source | Verified behavior / gap |
|---|---|
| `main.js` | Select → walk → enter → drive → pause/results. Variable dt capped at .05; player moves before collision rollback; AI moves afterwards. Results use existing AttemptId/payload. |
| `vehicle.js` | Metres, m/s, radians, +Y up and local -Z forward. Real GLB, wheel pivots and emissive lights exist; no separate cockpit. |
| `controls.js` | Existing L/K lights, V hazard, Z/X signals, T horn; [] seat, M mirror; H/J/G/F motor equipment. Preserve all bindings. |
| `city-track.js` | Unified map, intersections at z=-80/-400 and LongRoad curve. Static collider boxes and road bounds. `pedestrianZones=[]`, so no unified pedestrians. |
| `intersection.js` | Existing authoritative signal controllers; 16 demo box cars total, fixed tick locally, no shared collision world. Preserve signals, replace demo agents once, not run two traffic systems. |
| `long-road.js` | Actual curve frame(s), length and sample data reusable for route adapters. |
| `hud.js` / `audio.js` | Existing speed, gear, indicators and procedural horn. Extend, do not replace session UI or engine/transmission audio. |
| `results.js` | Existing session lookup, retry/idempotent AttemptId, standalone-safe failures; unchanged. |
| `tools/webgl/build.cjs` | Validates city hashes and GLB wheel pivots, copies top-level scripts/vendor/city. Must include new systems directory without weakening validation. |

Dimensions (length × width × height metres): MOTOR 2.26×1.02×1.38, MOBIL 4.65×2.31×1.516, TRUK 6.47×2.88×3.27. GLB loader uses scale=1, recentres XZ and ground Y. Named lights use Car/Bike/Truck_Lights, Taillight and Indicator_; wheels use extras.wheel_radius/wheel_front. Seats derive from each config, not a universal anchor.

Collision currently checks projected AABB endpoints, then rolls back position/yaw and sets speed=0. Contact increments obstaclesHit and violations at most once per >2 simulation seconds. collisionCount remains obstaclesHit+pedestrianHits; score formula and result payload stay unchanged. New safety contacts must retain this score path, except yielding to pedestrians is prevention, not an actual pedestrian hit.

## Fresh baseline

- PASS `dotnet build Kemudi.slnx`: zero warnings/errors.
- PASS `npm.cmd --prefix tools/webgl run build`: 23 files, 7,029,645 bytes.
- PASS `npm.cmd --prefix tools/webgl run test:functions`: six checks.
- PASS pure intersection tests: eleven checks; pure unified tests: five groups.
- Browser/other baseline evidence is in `REALISM_BASELINE_TESTS.md` and `artifacts/realism-baseline/`.
- Codebase-memory MCP coverage reports metadata_match/no_recorded_issue for inspected runtime/test paths (best-effort, not completeness proof); direct source reads used too.
- Blender MCP get_addon_status: cannot connect to Blender addon. Use original procedural characters/cockpits, no fictitious GLB files or paid generation.

## Cleanup/integration plan and behavior locks

Existing functions/intersection/unified/browser tests are the regression locks. Add deterministic collision and realism tests before declaring new behavior complete. Avoid broad refactoring: add shared collision and fixed tick, preserve Vehicle.update compatibility, reuse authoritative controllers/map data, remove demo meshes only when new traffic is initialized. Keep results.js/backend/database/assets city package untouched. UI extends current visual language with labelled keyboard-operable selects, readable contrast and no gameplay keys while editing forms.

Confidence: high for source/baseline facts; visual anchor alignment, 5–10 minute performance and full end-to-end acceptance are unknown until tested. Their status must appear explicitly in the final QA report.
