# Gamepad baseline audit — 2026-11-04

G0 audit: actual runtime is classic scripts attached to window, Three.js r128;
there is no gamepad reader in controls/main/vehicle. Unity is not in scope.
Referenced source documentation/master realism plan are currently absent; git
contains user-staged deletions. Preserve all those changes and use actual source.

- `controls.js`: InputManager keyboard getters, keydown pending edges consumed by
  update; blur clears keyboard. Inputs/forms/buttons ignore gameplay keydown.
- `main.js`: one RAF, input poll/render then fixed1/60 ticks (max5), buffered
  edges consumed once. States select/walking/entering/driving/paused/finished/failed.
  Session handlers own ignition, handbrake, horn, camera; Vehicle owns equipment,
  lamps and gear logic. Existing blur pauses driving only.
- `vehicle.js`: current throttle/braking/steering are boolean. Analog support must
  be an explicit optional numeric adapter preserving legacy boolean tests.
  Automatic R toggles at abs(speed)<.5 m/s; gamepad direction requests will use
  stricter .5km/h + brake guard and a domain request, not write mesh state.
  Manual gear changes require held clutch; motor/manual exists.
- `Simulasi.razor` (not placeholder SimulasiPlay): same-origin iframe, eager,
  allow fullscreen/autoplay, no sandbox attribute. No policy relaxation justified.
- Existing lights/horn/cockpit/HUD/traffic systems are integrated; reuse them.
- Build copies systems recursively but needs explicit new input folder copy.
- Keyboard bindings remain L/K, Z/X, V hazard, T horn; motor H/J/G/F are helm,
  jaket, sarung tangan, sepatu; B is sabuk. Do not replace these.

Baseline fresh PASS: WebGL build35files/7,133,723 bytes, functions6checks,
syntax46files. Prior realism evidence is in REALISM_QA_REPORT.md, not a claim
that the gamepad feature or physical hardware has passed.

Platform research: read MDN Gamepad API/Using Gamepad API and W3C standard mapping.
Poll current objects once/frame; handle null/throw/mapping unknown. Same-origin
policy not altered by default. Sources and hardware gaps recorded in GAMEPAD_QA.md.
