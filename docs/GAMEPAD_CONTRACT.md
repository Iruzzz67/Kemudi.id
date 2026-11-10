# Gamepad integration contract v1 — frozen before delegation

Source: `src/Kemudi.Web/wwwroot/simulation-3d/`. Classic window exports, no new
dependencies, no synthetic KeyboardEvent, no extra RAF. Preserve staged user edits.

## Ownership

- G0 root: main.js, controls.js, vehicle.js minimal analog/domain guards, entry,
  build/package, integration/browser QA, docs and journal.
- G1/G2 device lane: input/gamepad-adapter.js, gamepad-settings.js,
  gamepad-normalize.js, gamepad-mappings.js and tools/webgl/gamepad-device.cjs.
- G4 UI lane: input/gamepad-ui.js, input/gamepad-ui.css and focused UI tests only.
- G5 researcher: official-doc evidence only, no edits. G3 action arbitration and
  G6 final acceptance owned by root; an independent reviewer audits final diff.

## Adapter/settings contract

`GamepadSettings(storage?)`: safe default localStorage getter; `.value` immutable
validated schema v1 with enabled, stickDeadzone, steerExponent, steerSensitivity,
triggerDeadzone, clutchAssist(defaultfalse), bindings. `.update(patch)` validates
and saves, `.reset()` restores defaults. Bindings map semantic names to unique
integer buttons0..31; reject conflicts. Standard default: interact0,horn1,
ignition2,camera3,signalLeft4,signalRight5,brake6,throttle7,menu8,pause9,clutch10,
hazard11,lights12,handbrake13,gearDown14,gearUp15. Remap affects vehicle actions;
menu directions/confirm/back always use standard D-pad/A/B for predictability.

`GamepadAdapter({settings,getGamepads?,eventTarget?})`: `.poll(dt)` exactly once
per frame returns fresh `{status,message,device,devices,continuous,edges,
meaningful,neutral,lost}`. status disconnected/connected/unsupported/error/disabled;
device `{index,id,mapping}` or null; devices list same shape. continuous:
`{steer,throttle,brakeAmount,clutch,horn,walk}` (steer positive right; walk positive
forward from negativeaxis1). edges domain names above plus menuUp/menuDown/
menuLeft/menuRight/confirm/back. LT/RT are continuous, not edge aliases.
`.select(index|null)`, `.reset(reason)`, `.dispose()`. Identity change suppresses
held edges until neutral; invalid data/unknown mapping is neutral. Nonstandard
reported unsupported, never silently standard. Hysteresis press.55/release.40.
Disabled does not call browser reader. Storage error must never crash gameplay.

### Extension 5 November 2026: right-stick first-person look

Continuous also includes `lookX/lookY`: standard axes2/3, positive right/down,
linear normalization with existing stickDeadzone (not steering sensitivity).
Both participate in meaningful/neutral detection and the same whole-source,
pause/focus/disconnect gate; keyboard/blocked snapshots contain zeros.
In driving, fresh right-stick deflection enters FPV. Fixed ticks integrate yaw
at1.8rad/s and pitch at1.3rad/s, bounded to +/-100deg and +/-55deg. Release holds
view; no automatic recenter. Y/C cycles modes and resets look, winning over a
held stick until neutral/new deflection. Walking remains unchanged. Cockpit
applies eye position, mirror and look together, including paused menu actions.

## Root domain pipeline

### Extension 5 November 2026: player handling

Settings v1 adds optional numeric `steeringWeight`0..100/default50 and
`steeringReturn`.5..2/default1. Missing keys in older valid v1 saves get defaults
without dropping old preferences/bindings; explicit malformed values reject.
Vehicle.setHandling applies immutable per-instance state; root calls it only on
player creation and accepted settings/reset. AI retains its own defaults.
Weight scales turn response by `2**((50-weight)/50)` (light2x/normal1x/heavy.5x),
not max lock, speed-dependent steering reduction, grip or drivetrain. Neutral
return is adjustable separately and cannot overshoot into opposite steering.
Keyboard and gamepad share this player behavior. Defaults preserve old turn
response; keyboard return now clamps at zero to avoid overshoot at high return.
UI presets change weight only; number fields/Dpad work with or without device.
No physical force feedback is generated. Changes still require existing
pause/neutral/fresh-activation gate. Local validated storage/reset uses same key.

Keyboard InputManager API remains compatible. Add keyboard snapshot + domain
frame facade without fake events. Provider arbitration chooses one entire source,
last meaningful activity/cooldown200ms, keyboard global pause exception. Domain
edges buffer across zero-tick frames and consume once on first fixed tick.
Numeric analog fields only for gamepad, keyboard retains exact existing behavior.
Brake wins over simultaneous analog throttle. Manual uses existing clutch/gear
guard, auto selectDrive/Reverse requires <=.5km/h and brake; rejection shown.

Pause/blur/visibility/disconnect clear intents and edges; while paused no world
ticks. Resume explicit, neutral gate blocks held controls until released, then
requires a fresh activation. Context changes discard previous gameplay edges.
Gamepad only affects player. No changes results.js/API/database/AI/collision.

## UI contract

`GamepadUI({onOpen,onClose,onAction,onSettings,onDevice})`; `.isOpen`, `.open()`,
`.close()`, `.update(state)`, `.handle(edges)`, `.handlePage(edges,container)`,
`.dispose()`. State: status/message/source/device/devices/neutralGate/phase/
vehicleType/settings. `onAction(name)` uses existing domain property names
(seatbelt,helmet,jacket,gloves,shoes,ignition,handbrake,lights,highBeam,hazard,
camera,mirror,seatUp,seatDown,gearUp,gearDown,selectDrive,selectReverse).
Root pauses while overlay open and invokes shared handlers for commands; close
does not restore held controls. UI handles gamepad navigation A/B/Dpad, keyboard
Escape/Tab, visible focus, labels, 44px targets, scrollable dialog, no raw device
ID in HTML. Settings deadzone/sensitivity/clutchAssist/enabled and validated
remapping/device picker/reset, all gamepad-operable (Dpad adjusts controls).
Menu page navigation only clicks existing visible UI handlers; no physics writes.

## Verification

Synthetic browser gamepads provided by Playwright addInitScript navigator method
override only (no production endpoint/global mutation hook). Verify actual
runtime state for3vehicles×2transmissions and embedded iframe, pause/disconnect/
held-resume, source switching, menu equipment, analog partial/full. Physical
USB/Bluetooth tests NOT RUN unless real hardware is available. Feature may be
implemented with physical acceptance pending; never claim universal compatibility.
