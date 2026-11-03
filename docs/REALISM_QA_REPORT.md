# Realism QA report

Date: 2026-11-03. A8 test-engineer lane. **Status: focused integration PASS; full matrix and release gates pending.**

## Evidence policy

Only executed checks can be PASS. Module unit tests, actual-runtime browser behavior, visual perception, audio perception, backend persistence and hardware performance are separate claims. A screenshot or passing state snapshot does not prove realistic visual alignment or audible output. Baseline evidence is in `REALISM_BASELINE_TESTS.md` and is not acceptance of new features.

## Authored browser coverage

`tools/webgl/realism-browser.cjs` drives the real UI and consumes read-only `kemudiSimulation.snapshot()` diagnostics. It does not mutate closure state or inject a test-only actor into the running simulation.

- Three vehicle types × automatic/manual: real GLB loaded, 16 AI of all three types, no legacy demo agents, unique actor IDs and OBB overlap tolerance 0.05m.
- Real unified pedestrians exist; keyboard/controls and engine lifecycle remain usable.
- Four times × three weather settings via labelled selectors, both initial screen and pause; pause keeps simulation tick, positions, lamps, pedestrians and traffic frozen.
- Existing L/K, Z/X, V and T control paths; actual emissive light states and HUD/cockpit shared speed/gear.
- Forward drive, wheel rotation, braking, reverse R with positive speed magnitude, camera cycling, seat/mirror controls.
- Actual renderer screenshots per vehicle and night/heavy rain; missing assets, request failures and page errors fail.
- Optional `WEB_URL=http://127.0.0.1:5290` verifies `/simulasi/play` embeds and runs the unified TRUK/manual simulator.
- Optional `REALISM_STABILITY_SECONDS=300` records a five-minute night/heavy-rain stability session under `artifacts/realism/stability-samples.json`, checking clock progress, no vehicle overlap and no page errors. Resource/heap values are observations, not a hardware FPS benchmark or definitive heap-leak verdict.

Commands (not yet results):

```powershell
$env:REALISM_CASE='MOBIL/automatic'; node tools/webgl/realism-browser.cjs
Remove-Item Env:REALISM_CASE
$env:WEB_URL='http://127.0.0.1:5290'; npm.cmd --prefix tools/webgl run test:realism:browser
$env:REALISM_STABILITY_SECONDS='300'; node tools/webgl/realism-browser.cjs
```

Reports are written even on failure to `artifacts/realism/browser-report.json`; screenshots include an explicit failure frame when possible. `REALISM_CASE` is a focused diagnostic run, not proof that the full six-case matrix passed.

## Current verification

| Scope | Result | Evidence |
|---|---|---|
| New browser test syntax | PASS | `node --check tools/webgl/realism-browser.cjs` |
| Focused MOBIL/automatic actual-runtime flow | PASS | `$env:REALISM_CASE='MOBIL/automatic'; node tools/webgl/realism-browser.cjs`, exit 0; `artifacts/realism/focused-mobil-automatic-report.json` |
| Initial and paused 12-combination environment matrix | PASS in focused run | Both selector matrices passed without advancing the paused clock |
| Sixteen safely spawned real traffic vehicles / procedural avatars / moving crossing pedestrian | PASS in focused run | Active, loaded, visible, all three types, unique IDs, OBB nonoverlap; 17 mounted vehicle characters; pedestrian displacement observed |
| Post-integration six-case browser matrix | PENDING | Focused run covers only MOBIL/automatic, not all six combinations |
| Website iframe | PENDING | Local test website/API startup owned by A0 |
| Existing regressions / backend results | PENDING | A0 owns final execution and evidence integration |
| Five-minute stability session | PENDING | Optional command above; do not infer from shorter tests |
| Interactive perceptual cockpit/character/lighting review | NOT RUN | Root/visual QA responsibility, not replaced by state assertions |
| Audible horn correctness in real speakers | NOT RUN | Key path and mocked audio tests do not establish actual audible sound |
| Hardware FPS benchmark | NOT RUN | Out of test-engineer lane; requires browser/hardware identification and representative sustained scenario |

## Integration incidents and observed resource risk

1. The first focused browser run failed initialization because an exported planar static collider had zero width/depth. Actual loading error: `Static collision box needs finite ordered bounds`. A0 repaired the static adapter with a small explicit thickness. The subsequent actual-browser focused flow passed. Pre-fix evidence: `artifacts/realism/startup-pre-fix-report.json` and the original failure screenshot.
2. Tests now detect the caught loading-error UI and capture `console.error`, not only uncaught `pageerror`; this avoids waiting 90 seconds for an initialization that has already failed.
3. Manual test input waits for observable gear 1 while the clutch is held before releasing it; this removes an input/physics-tick race instead of adding a blind sleep.
4. The focused run's final runtime snapshot reported **2,134 draw calls**, **322,498 triangles**, **2,269 geometries**, 3 textures. The wall session lasted about 506 seconds while simulation clock reached 16.25 seconds. These are observations on the loaded headless host, **not a hardware FPS benchmark**; they indicate a material rendering/performance risk and do not meet or establish the plan's 30/60 FPS targets. Root was notified before further renderer-heavy runs. Distance culling/LOD is compatible with active collision bodies, but inactive NO_SAFE_SPAWN placeholders must not be counted as rendered traffic coverage.

## Known boundaries

Character/cockpit geometry is original procedural fallback, not final GLB artwork. Main and feature modules remain owned by their implementing lanes; A8 reports bugs and does not silently patch production code. Codebase-memory coverage was checked for the five existing runtime/test paths relied upon and returned metadata_match/no_recorded_issue (best effort); source reads were used directly for actual contracts.
