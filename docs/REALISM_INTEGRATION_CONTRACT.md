# Realism integration contract v1

Frozen before feature implementation. Classic scripts attach classes to window to match this runtime; no dependencies or module-loader migration. Source root: `src/Kemudi.Web/wwwroot/simulation-3d/`.

## Units and entity facade

1 unit = 1 metre, speed m/s (signed), display abs(speed)*3.6 km/h, yaw radians; +Y up, -Z forward. Vehicle root is `group`; authoritative `position` Vector3 and `rotation` yaw. Shapes use full width/length/height from VEHICLE_CONFIGS. Player ID `player`, AI IDs stable `traffic:<n>`, pedestrians `pedestrian:<n>`. Unregister before dispose/reset.

All vehicle actors expose existing Vehicle fields: id/type/config/group/position/rotation/speed/gear/engineOn/handbrakeOn/lightsOn/highBeamOn/signalLeft/signalRight/hazardOn/signalTime/braking, and getForwardDirection(). `lightState` and `instrumentSnapshot` are committed snapshots, not independent dynamics.

## Interfaces

- `SimulationState`: stable registry register/unregister/getVehicles/getPlayerVehicle, clock {elapsed,tick,fixedDt:1/60}, environment reference. Paused clock does not advance.
- `CollisionWorld({cellSize=12})`: registerBody(id,entity,shape=entity.config.dimensions), unregisterBody(id), registerStaticBox(id,min,max), canSpawn(pose,shape,ignoreId), getLeadObstacle(id,maxDistance=80), resolve(proposals,dt) → Map(id,{position,rotation,speed,blocked,contactId,contactKind}). Proposal array entries `{id,position,rotation}`. resolve reads starting poses from registered entities; does not commit transforms. Position accepts x/y/z values. All actors, stationary player included, registered. Conservative sweep/rotation safety and shared broadphase required. Safety for pedestrians contactKind='pedestrian' is not scored as a hit.
- Vehicle adapter: `planMotion(input,dt,onRoad)` advances gearbox/toggles/dynamics but not scene transform, restores pose until resolve; returns proposal plus result string. `commitMotion(resolution,dt)` commits exactly once, actual signed speed, brake state and visual wheel motion. Existing update() remains compatible for baseline tests.
- `EnvironmentSystem(scene,renderer,options={})`: setTimeOfDay(pagi|siang|sore|malam), setWeather(off|light|heavy), getState(), update(dt,camera,options={cockpit:false,vehicleType:'MOBIL'}), dispose(). options accepts track. Reuse scene's lights; state includes timeOfDay/weather/visibilityFactor/roadGripFactor/recommendedAIMaxSpeedFactor/night. No independent raf; pooled precipitation excludes enclosed cabin.
- `VehicleLightSystem(scene)`: registerVehicle(vehicle), unregisterVehicle(id), update(dt,environment,vehicles,playerPosition), dispose(). Existing named lights retained/intensities compatible; add reverse/low-high illumination. Set vehicle.lightState from existing booleans and braking after commit, use vehicle.signalTime for blink.
- `HornSystem(audio)`: trigger(vehicle,clockSeconds), update/dispose if needed. Existing audio context only, bounded cooldown/voices and per-type tones. T remains one-shot horn; AI uses explicit situational events/cooldown.
- `InstrumentSystem.snapshotFromVehicle(vehicle,environment)` → immutable plain snapshot {speedKmh,speedText,gear,engineOn,handbrakeOn,braking,lights,timeOfDay,weather}. Speed from committed motion only. `HUD.update(vehicle,snapshot)` backward-compatible. Cockpit consumes same snapshot object, no second speed calculation.
- `CharacterSystem.createCharacter(role,variant=0)` → handle {group,head,update(dt,{state,speed,steering}),setFirstPerson(bool),setLOD(distance),dispose()}. roles driver/truck_driver/rider/pedestrian; `.mountToVehicle(vehicle)` on handle attaches seated body using config anchors. All original procedural assets, no nonexistent GLB claims.
- `CockpitSystem(scene,camera)`: attachToVehicle(vehicle,characterHandle), setMode(modeName), update(dt,vehicle,instruments), dispose(). FPV uses current camera cycle; returns/sets per-type eye anchor, hides obstructing exterior model ONLY in FPV and restores in other modes. Reuse [] seat/M mirror. Procedural interior distinct for each type; cluster reads snapshot.
- `TrafficSystem(scene,track,world,registry)`: async init(), plan(dt,environment,pedestrians) → proposals, commit(resolutions,dt), getVehicles(), reset(player), dispose(). TrafficRoutes adapters use IntersectionDefinition and LongRoad.frame; reuse signal controllers. Remove/dispose demo agents and set junction.agents=[] ONLY during successful initialization; main updates signals without old agents. Do not teleport in sight. All 3 actual GLB vehicle types. Conservative stop when routes exhausted is safer than visible teleport.
- `PedestrianSystem(scene,track,world)`: update(dt,vehicles), getActiveAgents(), getCrossingConstraints(), reset(), dispose(). Derive crossings from real intersection definitions. Do not enter occupied crossing; vehicle yield before crossing, keep physical pedestrian safety bodies. Use CharacterSystem when present, safe procedural fallback otherwise.

## Main pipeline and ownership

Input polled once/render, edge actions consumed first fixed tick only; held keys apply every tick. Fixed 1/60 accumulator, max 5 catch-up ticks, discard excess after background/pause. Each tick: clock → signal controllers/publish (not old traffic update) → pedestrian intent → traffic plan → player plan → shared collision resolve → all commit → score contact events (same 2s cooldown) → lamps/horn/characters/instruments → camera/HUD → render. No second movement after commit. Existing rules remain; new pedestrian safety prevents contact, existing failure remains for actual hits.

A0 exclusive: main.js, controls.js, screens.js, index.html, build.cjs/package.json, state and integration docs. A5: collision-system.js/vehicle.js + collision tests. A1: environment-system.js (+ road weather). A2: light/horn-system.js/audio.js. A3: instrument-system.js/hud.js. A4: traffic/routes/pedestrian-system.js (legacy pedestrian.js only if needed), tests. A6: cockpit-system.js. A7: character-system.js/procedural provenance. A8: test-only files and QA evidence. Capacity is 3 children; lanes run in waves, A6/A7 may be combined with disjoint modules. Do not edit another owner's files; report integration requests to A0.

## Verification/release

Turn-route extension (2026-11-04): `TrafficRoutes.build().turns` maps
`junctionId:approachId:left|right` to RoutePath with `.turn = {direction,start,end}`.
Incoming stop gates stay authoritative. Trailing E/W runtime actors select right/
left respectively; straight/spine actors stay unchanged. Commit publishes indicator
intent before/during the curve, cancelling after rear clearance. Turning entry
yields to central occupancy regardless signal; near-approach priority only applies
to permitted (non-RED) approaches. Never treat an outside red-held queue as a
committed junction occupant. Full-world tests require all four turns to clear over
120 simulation seconds with existing signals, pedestrian yielding and static bodies.

2026-11-04 continuation: `TrafficVisualLOD` is loaded before main, constructed after
traffic initialization and registered when AI character visuals are mounted. Player
registration is excluded. Update runs once immediately before rendering, after
camera/character updates, and only changes visual visibility. Never unregister
collision bodies or skip planning for culled vehicles. `snapshot().trafficLOD`
exposes registered/near/proxy/culled counts. Runtime traffic reset reuses actors;
if future code replaces/disposes actors, unregister their LOD before disposal and
register the replacement after visuals are ready.

Build copies systems recursively and retains city hashes/wheel validation. Regression baseline + deterministic sweep/queue tests + browser 4×3 environment and 3 vehicle cockpit/light/horn checks. Website iframe/backend result tests separate from static. Report missing environment/benchmark/manual perceptual evidence as gaps, never PASS. No release declaration until all mandatory acceptance passes.
