# Original procedural character and cockpit assets

## Provenance and boundaries

These assets are original low-poly geometry generated at runtime by `systems/character-system.js` and `systems/cockpit-system.js`. No external model, texture, identifiable person, or downloaded copyrighted asset is used. The generator source is the asset: the normal WebGL build copies and hashes these JavaScript files. No additional `.glb` file exists or is advertised. Blender MCP was checked by A0 and unavailable, so polished skinned GLB animation/export remains a future asset-production task, not a completed deliverable.

## Coordinate and character specification

- One unit is one metre, +Y up, facing -Z. Standing humanoid is approximately 1.8 m tall; pelvis is at .89 m. Clothing variants use deterministic palettes, not random state.
- Roles: `driver`, `truck_driver`, `rider`, `pedestrian`. Each has torso/head, shoulder/elbow and hip/knee pivots, hands and shoes. Rider adds an opaque helmet and visor and uses a bent seated/riding pose.
- Character root mounts under `vehicle.group`, using each vehicle's `seatOffsetX`, `seatOffsetZ` and `height*driverEyeRatio`. Driver/truck root is eyeY−1.58; rider root is eyeY−1.42 and .16 m behind seat Z. These are procedural fallback anchors derived from existing config, not named seat/grip nodes proven in a GLB.
- Walking/crossing animates opposite arms/legs and knee flexion; driving/steering/riding adjusts torso and shoulder pose. Idle has small head/limb motion. `dt=0` freezes animation. No geometry/material creation per update.
- `setFirstPerson(true)` hides the local head (including helmet), not the whole person. `setLOD(distance)` removes hands/shoes detail beyond 55 m and shadows beyond 45 m while retaining the person's silhouette. No collider is attached to animated limbs; motion/collision owner registers a separate body.
- Limb endpoints are approximate articulated fallback poses, not inverse-kinematics grip constraints. Truck/car opaque exterior GLB windows may hide seated characters from some third-person views; mounted characters remain real scene objects. This needs browser visual review, not an assertion of cinematic asset quality.

## Cockpit specification

`CockpitSystem(scene,camera)` owns a local `Cockpit_<TYPE>` group under the player vehicle. All interiors are constructed around the same seat eye anchor used by the current vehicle. FPV eye follows `getDriverSeatPosition()`, includes existing seat height and mirrorYaw, and uses a slight downward look so the cluster is in the frustum without obscuring the horizon.

| Vehicle | Original visible interior |
|---|---|
| MOTOR | Chrome handlebar, rubber grips, hands/sleeves, compact instrument housing, fuel tank; handlebar yaws with steering. |
| MOBIL | 1.95 m dashboard, console/floor, door trim, thin windshield frame, three-spoke wheel, hands/sleeves; wheel rotates with steering. |
| TRUK | 2.45 m dashboard and wider cabin, truck-sized .245 m wheel (car .205 m), higher eye from truck config, larger spatial context. |

The cluster uses a 512×256 CanvasTexture, white speed digits, blue gear, labelled engine/lamp/brake status and left/right indicators. It consumes the **same InstrumentSnapshot** passed to HUD; it never derives another speed. Texture upload occurs only when rendered data changes. MeshBasicMaterial keeps digits readable at night independent of exposure. The opaque cluster housing is behind its panel, not between the panel and camera.

Entering FPV stores and hides only `vehicle.model`, avoiding opaque GLB roof/window clipping; own procedural cockpit and character hands remain. Leaving FPV or disposal restores the model's exact previous visibility and camera near plane. TPV/TopDown preserve their existing camera behavior; cockpit does not update their camera. No WebXR is enabled.

## Integration hooks for A0

```js
const person = CharacterSystem.createCharacter(vehicle.type === 'MOTOR' ? 'rider' : vehicle.type === 'TRUK' ? 'truck_driver' : 'driver', variant);
person.mountToVehicle(vehicle);
const cockpit = new CockpitSystem(scene, camera);
cockpit.attachToVehicle(vehicle, person);
cockpit.setMode('TPV');
// After motion commit and HUD snapshot creation; each simulation tick:
person.update(dt, { state: vehicle.type === 'MOTOR' ? 'riding' : 'driving', speed: vehicle.speed, steering: vehicle.steerAngle });
person.setLOD(camera.position.distanceTo(vehicle.position));
// AFTER existing updateCamera() so FPV eye/lookAt belongs to the cockpit:
cockpit.update(dt, vehicle, instruments);
// On C: cockpit.setMode(CAMERA_MODES[cameraMode]);
// Reset/quit cleanup BEFORE vehicle.dispose():
cockpit.dispose(); person.dispose();
```

Traffic/pedestrian owners can use the same character handles. Each `.dispose()` is idempotent and removes the object and its owned geometry/materials. Cockpit additionally disposes its texture and restores the camera/model state. Parent must dispose these handles before disposing the containing vehicle to avoid redundant resource disposal.

## Verification evidence

`node tools/webgl/realism-visual.cjs`: PASS, seven role/type cases. Checks original geometry and rider helmet, articulated walking, frozen animation during pause, first-person head visibility, non-popping silhouette LOD, vehicle mounting, 3 distinct type names, FPV seat transform, cluster centre inside camera frustum, shared reverse speed/gear snapshot, no texture upload when unchanged, exact exterior visibility restoration, near-plane restoration and cleanup. `node --check` passes both generator scripts.

These are deterministic CPU-side geometry/contract tests, not proof of final perceived realism, GPU resource counters, all weather/transmission combinations or browser screenshots. A0/A8 must run the integrated runtime browser matrix before claiming those acceptance items PASS.
