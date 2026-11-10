// Original procedural character/cockpit contract checks without a GPU or new dependencies.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const root = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
const paint = new Proxy({}, { get: (target, key) => target[key] || (() => {}) });
const context = { THREE, window: {}, console, document: { createElement: () => ({ width: 512, height: 256, getContext: () => paint }) } };
vm.createContext(context);
for (const name of ['character-system', 'cockpit-system', 'instrument-system'])
  vm.runInContext(fs.readFileSync(path.join(root, 'systems', name + '.js'), 'utf8'), context);
const { CharacterSystem, CockpitSystem, InstrumentSystem } = context.window;
let checks = 0;
for (const role of ['driver', 'truck_driver', 'rider', 'pedestrian']) {
  const char = CharacterSystem.createCharacter(role, 2);
  let meshCount=0;char.group.traverse(o=>{if(o.isMesh)meshCount++;});assert.ok(meshCount > 10);
  assert.ok(char.head);
  char.update(.25, { state: role === 'pedestrian' ? 'walking' : 'steering', speed: 2, steering: .3 });
  const phase = char.animationTime;
  char.update(0, { state: 'walking', speed: 2 });
  assert.equal(char.animationTime, phase, 'pause freezes animation');
  if (role === 'rider') assert.ok(char.group.getObjectByName('Helmet'));
  if (role === 'pedestrian') assert.notEqual(char.group.getObjectByName('LeftHip').rotation.x, 0);
  char.setFirstPerson(true); assert.equal(char.head.visible, false);
  char.setFirstPerson(false); assert.equal(char.head.visible, true);
  char.setLOD(80); assert.equal(char.group.visible, true);
  char.dispose(); assert.equal(char.group.parent, null);
  checks++;
}
for (const [type, eye, seatZ] of [['MOTOR', 1.173, 0], ['MOBIL', 1.2886, -.38], ['TRUK', 2.289, -2.1]]) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1.5, .1, 500);
  const vehicle = { type, group: new THREE.Group(), model: new THREE.Group(), position: new THREE.Vector3(-1.75,.09,10), rotation: .3,
    config: { dimensions: { width: type === 'TRUK' ? 2.88 : 2.31, height: eye / .85 }, driverEyeRatio:.85, seatOffsetX: type === 'MOTOR' ? 0 : -.23, seatOffsetZ: seatZ },
    speed: -5, gear: -1, engineOn: true, seatHeight: 0, steerAngle: .2, mirrorYaw: 0, signalTime: .2,
    getDriverSeatPosition() { return new THREE.Vector3(this.config.seatOffsetX, eye + this.seatHeight, seatZ).applyAxisAngle(new THREE.Vector3(0,1,0),this.rotation).add(this.position); },
    getForwardDirection() { return new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),this.rotation); } };
  scene.add(vehicle.group); vehicle.group.position.copy(vehicle.position); vehicle.group.rotation.y=vehicle.rotation;vehicle.group.add(vehicle.model);
  const character = CharacterSystem.createCharacter(type === 'MOTOR' ? 'rider' : type === 'TRUK' ? 'truck_driver' : 'driver');
  character.mountToVehicle(vehicle); assert.equal(character.group.parent, vehicle.group);
  const cockpit = new CockpitSystem(scene, camera);
  cockpit.attachToVehicle(vehicle, character);
  const instruments = InstrumentSystem.snapshotFromVehicle(vehicle, { timeOfDay: 'malam', weather: 'heavy' });
  cockpit.setMode('FPV'); cockpit.update(1/60,vehicle,instruments);
  let projectionUpdates=0;const updateProjection=camera.updateProjectionMatrix;
  camera.updateProjectionMatrix=function(){projectionUpdates++;return updateProjection.call(this);};
  cockpit.setMode('FPV');assert.equal(projectionUpdates,0,'repeated mode does not rebuild camera projection');
  assert.equal(vehicle.model.visible, false); assert.equal(character.head.visible, false);
  assert.equal(cockpit.group.visible,true); assert.equal(cockpit.snapshot().speedText,'18'); assert.equal(cockpit.snapshot().gear,'R');
  assert.ok(camera.position.distanceTo(vehicle.getDriverSeatPosition()) < .0001);
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const display= cockpit.group.getObjectByName('InstrumentDisplay').getWorldPosition(new THREE.Vector3()).project(camera);
  assert.ok(Math.abs(display.x)<1&&Math.abs(display.y)<1&&display.z>-1&&display.z<1,'cluster centre is inside FPV frustum');
  const version = cockpit.texture.version; cockpit.update(1/60,vehicle,instruments); assert.equal(cockpit.texture.version,version,'unchanged display does not upload texture');
  const forwardView=camera.getWorldDirection(new THREE.Vector3());
  for(const [yaw,side] of [[-.6,1],[.6,-1]]) {
    cockpit.update(1/60,vehicle,instruments,{yaw,pitch:0});
    const direction=camera.getWorldDirection(new THREE.Vector3());
    const local=direction.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-vehicle.rotation);
    assert.ok(local.x*side>.5,'horizontal-only look turns toward the requested side');
    assert.ok(Math.abs(direction.y-forwardView.y)<1e-8,'horizontal-only look must not move the vertical view');
    assert.ok(camera.position.distanceTo(vehicle.getDriverSeatPosition())<.0001,'horizontal look stays at driver eye');
  }
  cockpit.update(1/60,vehicle,instruments,{yaw:-.6,pitch:.3});
  const turnedView=camera.getWorldDirection(new THREE.Vector3());
  const localView=turnedView.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-vehicle.rotation);
  assert.ok(localView.x>.4&&turnedView.y>forwardView.y+.2,'right/up look reaches actual FPV camera');
  assert.ok(camera.position.distanceTo(vehicle.getDriverSeatPosition())<.0001,'look rotates at driver eye, not vehicle orbit');
  const bodyRotation=vehicle.group.rotation.y;
  vehicle.mirrorYaw=.55;cockpit.update(1/60,vehicle,instruments,{yaw:-.6,pitch:.3});
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(turnedView)>.5,'mirror look still composes with stick view');
  assert.equal(vehicle.group.rotation.y,bodyRotation,'looking never rotates the vehicle/cockpit');
  vehicle.mirrorYaw=0;cockpit.update(1/60,vehicle,instruments);
  assert.ok(camera.getWorldDirection(new THREE.Vector3()).distanceTo(forwardView)<.0001,'default camera remains backwards compatible');
  assert.equal(cockpit.group.name, 'Cockpit_' + type);
  cockpit.setMode('TopDown'); assert.equal(vehicle.model.visible,true); assert.equal(character.head.visible,true); assert.equal(cockpit.group.visible,false);
  vehicle.model.visible=false; cockpit.setMode('FPV'); cockpit.setMode('TPV'); assert.equal(vehicle.model.visible,false,'restore preexisting visibility, not unconditional true');
  vehicle.model.visible=true; cockpit.setMode('FPV'); cockpit.dispose(); assert.equal(vehicle.model.visible,true); assert.equal(camera.near,.1);
  character.dispose(); checks++;
}
console.log(`PASS procedural visual contracts: ${checks} role/type cases; pause, camera restore, shared snapshot, texture reuse, disposal`);
