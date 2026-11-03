# Realism Gate 0 — baseline verification

Date: 2026-11-03 (Asia/Jakarta). Lane: A8/verifier. This records the pre-realism baseline, not acceptance of the proposed features.

## Fresh command evidence

| Command | Result | Evidence |
| --- | --- | --- |
| `dotnet build Kemudi.slnx` | PASS; 0 warnings, 0 errors | `artifacts/realism-baseline/dotnet-build.log` |
| `npm.cmd --prefix tools/webgl run build` | PASS; 23 files, 7,029,645 bytes | `artifacts/realism-baseline/webgl-build.log` |
| `npm.cmd --prefix tools/webgl run test:functions` | PASS; all 6 named checks | `artifacts/realism-baseline/functions.log` |
| `node tools/webgl/intersection-tests.cjs` | PASS; all 11 named checks | `artifacts/realism-baseline/intersection-tests.log` |
| `node tools/webgl/unified-tests.cjs` | PASS; all 5 reported groups | `artifacts/realism-baseline/unified-tests.log` |
| `npm.cmd --prefix tools/webgl test` | PASS; MOBIL, MOTOR, TRUK; exit 0 | `artifacts/realism-baseline/browser-smoke.log`, `artifacts/webgl/browser-report.json` |
| `npm.cmd --prefix tools/webgl run test:backend` | NOT RUN in Gate 0; requires live website/API and writes test accounts/results | Existing `tools/webgl/backend-smoke.cjs`, `result-errors.cjs` |

PowerShell formats npm's stderr `npm notice run ...` messages as `NativeCommandError`; the actual npm exit codes for build/functions were both 0. Those notices are not test failures.

## Existing verification surface

- `tools/webgl/package.json` scripts: `build`, `start`, `test`, `test:functions`, `test:intersection`, `test:unified`, `test:backend`. There are no npm lint/typecheck scripts in this plain-JavaScript simulator package.
- Playwright 1.61.1 is installed locally; Chromium executable exists at `C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe`.
- `test:intersection` and `test:unified` chain pure tests with browser tests. The pure halves were run separately above so their result is not confused with unexecuted browser halves.
- `test` uses `smoke.cjs`; default `SIM_URL=http://127.0.0.1:8080/`. It loads all three actual vehicle GLBs, checks wheels/lights/input, drives forward, brakes, reverses, changes cameras, and checks pause, requests and browser errors. Screenshots/reports: `artifacts/webgl/`.
- `intersection-browser.cjs` checks the junction demo, debug overlay, pause, drive/brake and renderer geometry disposal. `unified-browser.cjs` checks both legacy map aliases and two junctions.
- `loading-checks.cjs` checks legacy-map loading, toolbar overlap and GLB failure/retry. `integrated-ui.cjs` is a separate website UI test (default `WEB_URL=http://127.0.0.1:5260`).
- Backend scripts default to `WEB_URL=http://127.0.0.1:5290`, `API_URL=http://127.0.0.1:5090`. They test HttpOnly cookie/auth/CSRF, account isolation, result validation, concurrent idempotent submissions, actual iframe drive, lost-response retries, failed-session payload and dashboard persistence. Running them creates disposable accounts/results in the configured backend, not an isolated mock by default.

## Compatibility facts that tests lock

- Diagnostics are read-only: `window.kemudiSimulation.snapshot()`. Fields include `ready`, `phase`, `map`, `vehicle`, `loaded`, `position`, `speed`, `gear`, `engine`, `handbrake`, `lights`, `wheels`, `camera`, `elapsed`, `intersection` and `intersections`.
- Existing controls are **L** headlights, **K** high beam, **Z/X** indicators, **V** hazard, **T** horn; `[/]` seat height. The plan's sample bindings must not replace these without an explicit compatible migration.
- Existing camera cycle checked by smoke is `TPV -> FPV -> TopDown -> TPV`.
- Smoke checks headlight emissive values `1` low / `3` high, brake values `1` pressed / `.1` released, four indicator meshes and their independent blink states. Adapt/extend those tests deliberately if representation changes; do not silently delete coverage.
- Current unified pure tests explicitly assert zero pedestrian zones. Adding real crossings requires updating this baseline expectation with safety/animation tests; a green old assertion does not prove the requested pedestrians work.
- Asset provenance currently declares metres, Y-up, vehicle forward -Z, wheel axle X. The build validates city manifest byte lengths/SHA-256 and GLB headers/wheel pivots. Function tests additionally hash the declared Blender source file.
- `build.cjs` copies top-level HTML/JS/CSS, `vendor/` and `models/city/` only. New `systems/`, `models/characters/` or `models/cockpits/` need explicit build inclusion without weakening the old integrity checks.

## Confidence / limits

Facts above come from directly read test/build/config source and fresh command output. Codebase-memory MCP `check_index_coverage` reported `no_recorded_issue` / `metadata_match` for all 16 relied-on test/build/control/manifest/runtime paths; this is best-effort metadata, not independent completeness proof. No graph-derived behavior was assumed.

Baseline PASS does not establish 4x3 weather, solid cross-type collisions, all-agent queueing, procedural characters, first-person interiors, result regression after integration, or a 5–10 minute performance target. Those require new post-integration evidence.

The baseline browser smoke completed for all three vehicle types with no page errors, failed requests or external requests according to its strict assertions. It used headless Chromium's default graphics settings (not `SOFTWARE_WEBGL=1`) at 960x640. This is functional evidence, not a performance benchmark.

## Ownership

Only this new document and baseline command logs were authored by the verifier. Existing source/tests were not modified. Build and existing test commands naturally regenerate their normal output manifests and reports. Port 8080 was already in use at browser-test startup and was reused; no external server was stopped.
