# Simulator QA — 2026-11-11

## Result
All completed existing simulator suites PASS. No runtime or test source was modified by this QA lane. This is automated regression coverage, not full release acceptance or physical-device certification.

| Command (from repository root) | Result | Evidence / scope |
|---|---|---|
| npm.cmd --prefix tools/webgl run build | PASS, exit 0 | build.log; 42 files / 7,176,563 bytes; asset validation unchanged |
| npm.cmd --prefix tools/webgl run test:syntax | PASS, exit 0 | test-syntax.log; 60 authored JS files |
| npm.cmd --prefix tools/webgl run test:functions | PASS, exit 0 | test-functions.log; 6 checks |
| npm.cmd --prefix tools/webgl run test:realism | PASS, exit 0 | test-realism.log; all modules, collision11 / traffic15; actual world120simulation seconds |
| npm.cmd --prefix tools/webgl run test:gamepad | PASS, exit 0 | test-gamepad.log; device/settings/domain/UI, safety and error fallback |
| npm.cmd --prefix tools/webgl run test:handling | PASS, exit 0 | test-handling.log; 19 groups |
| node tools/webgl/intersection-tests.cjs | PASS, exit 0 | intersection-unit.log |
| node tools/webgl/unified-tests.cjs | PASS, exit 0 | unified-unit.log; 7 checks, seam footprints and external boundary safety |
| npm.cmd --prefix tools/webgl test | PASS, exit 0 | smoke.log / smoke-report.json; MOBIL/MOTOR/TRUK automatic drive/brake/reverse/pause/lights/cameras |
| node tools/webgl/intersection-browser.cjs | PASS, exit 0 | intersection-browser.log / intersection-report.json; actual connected junction, debug/cameras/pause/drive/disposal |
| node tools/webgl/unified-browser.cjs | PASS, exit 0 | unified-browser.log / unified-report.json; both old map/demo aliases |
| node tools/webgl/road-seam-browser.cjs | PASS, exit 0 | road-seam-browser.log / road-seam-report.json; actual TRUK automatic5checks, former seam crossed without boundary penalty |
| node tools/webgl/realism-browser.cjs | PASS, exit 0 | realism-browser.log / realism-full-report.json; all6vehicle/transmission cases,49named checks; initial/paused12environment selections; runtime/asset/request errors absent |
| node tools/webgl/gamepad-browser.cjs | PASS, exit 0 | gamepad-browser.log / gamepad-full-report.json; all6standalone synthetic cases,69checks; analog inputs, guarded gears, menu/toggle edges, arbitration, pause/resume/disconnect/error fallback |
| node tools/webgl/handling-browser.cjs | PASS, exit 0 | handling-browser.log / handling-report.json; focused default MOBIL/automatic10checks; labels/presets/Dpad/settings persistence/reset and neutral gate |

## Limits / intentionally incomplete
- Full right-stick-look browser matrix was CANCELLED by this agent at the bounded-scope handoff, after partial MOBIL/automatic assertions. look-partial-report.json and gamepad-look-browser.log are **not** a passed complete case or matrix. Unit/visual/domain look regressions did pass in the completed pure suites.
- Handling browser other5combinations NOT RUN; focused MOBIL/automatic only.
- Website iframe/auth/backend-result persistence belong to the main lane, not claimed by this report.
- Physical USB/Bluetooth controllers, audible speaker output, human visual acceptance, controlled hardware FPS benchmark, sustained5minute stability rerun NOT RUN.
- Headless renderer sessions shared the host with main-lane builds/browser tests. Full realism took35m33s; full gamepad24m43s. These are execution wall times, not hardware FPS benchmarks.
- No failing app behavior was observed in these completed suites. This does not prove all untested features or every route/state is correct.

## Runtime / artifacts
- SIM_URL=http://127.0.0.1:8080/; owned standalone server session80413 intentionally remains active.
- Stopped owned browser-test queue via Ctrl+C after handling completed. Elevated read-only Win32_Process inspection confirmed no remaining node process for realism-browser/gamepad-browser/handling-browser/gamepad-look-browser.
- Existing scripts also refreshed their canonical tracked screenshots/reports under artifacts/{webgl,realism,gamepad,intersection,unified}; they were preserved, not reverted or deleted.
- PowerShell wraps npm notice stderr with NativeCommandError formatting; listed PASS decisions use the actual per-script exit0 and assertions, not that formatting. The outer first batch's final Get-NetTCPConnection probe returned1 for an absent listener before server launch; every individual test in that batch reported exit0.
- Index coverage for the four inspected existing script paths returned metadata_match/no_recorded_issue (best-effort only); source was read directly for test-contract interpretation.
