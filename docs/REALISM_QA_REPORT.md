# Realism QA report

## Road-seam truck fix — 2026-11-05

- Screenshot pengguna dan pure-source reproduction mengonfirmasi false boundary
  di antara housing z>=-33 dan north corridor z<=-28. Straight TRUK pada
  x=-1.75,z=-30.5 mendapat Batas area meski tidak ada collider fisik.
- CityTrack.inNorth kini mencakup central corridor sampai z33; tambahan area
  berada seluruhnya dalam original region. Full-footprint, static objects,
  AI collision dan batas luar tetap; main/input/physics/results tidak diubah.
- Regression FAIL sebelum fix (TRUK z=-30.125), PASS sesudahnya: unified7checks,
  termasuk4.932pose actual MOTOR/MOBIL/TRUK, dua lajur, dua arah/small yaw, serta
  enam probe luar/corner yang tetap ditolak. Bukti artifacts/unified/unit-report.json.
- PASS functions6, realism (collision11groups/traffic15groups dan modul lainnya),
  syntax58files, build42files/7.173.580byte. Reviewer APPROVE pada dua file fix/test.
- Command browser terarah: npm.cmd --prefix tools/webgl run test:road-seam
  (server8080 aktif). Hasil driving disimpan terpisah di
  artifacts/realism/road-seam-browser-report.json: PASS exit0,5checks. Truk
  dimuat dari spawn24m, masuk/mesin/sabuk/rem tangan melalui keyboard normal,
  mengemudi melewati z<-38 tanpa pindah lajur/tambah penalti, lalu rem hingga
  berhenti. Tidak ada mutasi vehicle/clock/position di test. Screenshot:
  artifacts/realism/road-seam-truk-automatic.png. Full browser6case/iframe/
  backend/hardware tidak diulang; bukan acceptance rilis lengkap.

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

### Latest preview continuation — 2026-11-04

- Turns/pre-turn signaling now implemented through runtime route adapters (trailing E/W AI); no replacement signal controller or bypass of collision. Focused regression fixed red-held cross-road queue starvation while retaining occupied-junction yield. Independent review APPROVE.
- Expanded traffic suite: 15 groups, 120 simulation seconds full-world; all four turning actors complete after signal/pedestrian cycles. Early60s snapshot alone was insufficient; test now asserts completed turns, not initial approach advance.
- Website iframe **PASS** on isolated Web5891/API5890: real TRUK/manual loaded, entered driving,16 active loaded AI/LOD registration; `artifacts/realism/iframe-report.json`.
- Gateway recovery **PASS**,4 checks; auth/CSRF/concurrent idempotent/isolation checks **PASS**,6. Full backend drive diagnostic **FAIL/time budget**,45m/11.5 simulation seconds in120s wall; downstream finish/save/retry/dashboard unverified, not skipped-as-pass. Test now follows real autostart and road navigation instead of obsolete selection/straight-line assumptions.
- Night/heavy-rain300s wall stability **PASS**,57 samples, tick55→3690/no overlap or pageerrors. Evidence `stability-report-2026-11-04.json`, `stability-samples.json`. This run preceded final non-RED predicate repair; no claim final-build300s rerun or hardware FPS/leak certification.
- Build latest35 files/7,133,723 bytes; syntax46 authored JS files PASS. Six-case browser matrix above is earlier evidence, not rerun on turns. Human visual/audio, controlled performance and browser wall-escape/LOD-boundary cases remain pending. **Release NOT COMPLETE; local preview ready for user testing.**

### Continuation review — 2026-11-04

- Render-only `TrafficVisualLOD` connected to entry script, AI character mount, and pre-render camera-distance update; AI physics registration is unchanged. LOD test is now part of `test:realism`; browser asserts all 16 AI registered, excluding player. Independent review approves this bounded integration, not release.
- Safety review reproduced a false-positive rotation envelope freezing safe steering away from a nearby wall. Added regression failed before repair; bounded conservative subdivision repair passes 11 collision groups and 12 traffic groups. Extremely tight cases may still stop conservatively; no endpoint-only shortcut.
- **Open functional gap:** AI commit resets both signals false and current intersection routes are straight-through. Pre-turn AI indicators and turning routes remain unimplemented; existing tests do not prove that acceptance item.
- Full browser matrix, final .NET build, website/backend and sustained stability evidence must be checked in `REALISM_SESSION_LOG.md`; earlier evidence above is dated 3 November, not automatically revalidated.

#### Fresh continuation results

- Six-case static browser matrix: **PASS**, exit 0, `artifacts/realism/browser-report-2026-11-04.json` (UTC 02:10:49–02:44:50). All 16 AI registered in render LOD, with actual group visibility checked nearby; 49 named case checks passed. Initial/paused 4×3 environment switching passed. MOBIL pages loaded before the collision refinement rebuild; later vehicle cases loaded after it. Steering-away refinement is proven by unit regression/review, not a dedicated browser wall-escape scenario.
- Fresh final JS suite: **PASS**, syntax 45 authored files, 11 collision groups, 12 traffic groups, state/environment/lights/horn/visual/LOD. Existing functions/intersection/unified pure regressions **PASS**.
- WebGL build: **PASS**, 35 files / 7,130,849 bytes. .NET alternate-output build: **PASS**, 19 warnings / 0 errors; log `artifacts/realism/dotnet-build-2026-11-04.log`. Default build encountered files locked by existing server processes; those were not killed.
- LOD final snapshots: 529–602 draw calls, all 16 physics actors active. Not an A/B benchmark, FPS measurement or long-duration leak proof.
- **Still pending:** website iframe/backend results, 5–10 minute stability, controlled FPS, human visual/audio review, browser LOD boundary/wall-escape scenarios and functional AI turns/pre-turn signaling. Release is **NOT COMPLETE**.

Character/cockpit geometry is original procedural fallback, not final GLB artwork. Main and feature modules remain owned by their implementing lanes; A8 reports bugs and does not silently patch production code. Codebase-memory coverage was checked for the five existing runtime/test paths relied upon and returned metadata_match/no_recorded_issue (best effort); source reads were used directly for actual contracts.

## Browser QA terbatas — 10 November 2026
- Website5891/API5890 dijalankan dengan database uji terisolasi; smoke MCP Playwright.
- PASS build default .NET --no-restore (exit0), syntax60, functions6, realism suite; browser halaman publik/detail materi/auth, mobile kursus, iframe mobil otomatis masuk→mesin→gas→rem→pause.
- Temuan: query mentor diabaikan, ringkasan kursus menampilkan literal null-coalescing, pesan login kosong menyesatkan, label form kursus tidak terhubung ke input.
- Tidak mengubah source aplikasi. Bukti dan batas: artifacts/browser-qa-2026-11-10/REPORT.md.
- Fullmatrix kendaraan, finish/save/dashboard, pembayaran/admin/hardware/audio/performance NOT RUN. Bukan acceptance rilis.
