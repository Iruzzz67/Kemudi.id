// Deterministic behavior checks, independent of browser rendering and frame rate.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const root = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
const context = { THREE, performance, window: {}, console };
vm.createContext(context);
for (const name of ['vehicle.js', 'city-track.js', 'track.js']) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context);
const { Vehicle, CityTrack } = context.window;
Vehicle.prototype._loadModel = async function () {}; // Isolate dynamics; smoke.cjs tests real GLB loading.
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('PASS', name); }
check('Blender source matches exported package provenance', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'models/city/manifest.json'), 'utf8'));
  const hash = require('node:crypto').createHash('sha256').update(fs.readFileSync(manifest.source)).digest('hex');
  assert.equal(hash, manifest.source_sha256);
});
check('training map traffic signals: initial state, order and full cycle', () => {
  const track = new context.window.Track(new THREE.Scene());
  track.build();
  assert.equal(track.pedestrianZones.length, 2);
  for (const side of [-1, 1]) {
    const normals = track.scene.getObjectByName('Training_Sidewalk_' + side).geometry.getAttribute('normal');
    for (let i = 0; i < normals.count; i++) assert.ok(normals.getY(i) > .99, 'sidewalk faces upward');
  }
  const lights = track.trafficLights[0].lights;
  assert.ok(lights[2].position.y > lights[0].position.y);
  assert.equal(lights[0].material.emissiveIntensity, 1.5);
  track.updateTrafficLights(5.5); assert.equal(track.getTrafficLightState(), 'yellow');
  track.updateTrafficLights(1.5); assert.equal(track.getTrafficLightState(), 'red');
  track.updateTrafficLights(4); assert.equal(track.getTrafficLightState(), 'green');
  track.updateTrafficLights(18); assert.equal(track.getTrafficLightState(), 'red');
});
check('manual requires clutch, shifts, stalls and restarts', () => {
  const v = new Vehicle(new THREE.Scene(), 'MOBIL', 'manual');
  v.engineOn = true; v.handbrakeOn = false;
  assert.equal(v.update({ gearUp: true }, .016), 'gear_grind');
  assert.equal(v.gear, 0);
  v.update({ gearUp: true, clutch: true }, .016);
  assert.equal(v.gear, 1);
  assert.equal(v.update({}, .016), 'stall');
  assert.equal(v.engineOn, false);
  v.startEngine(); v.engineStartTime -= 2000;
  v.update({ clutch: true }, .016);
  assert.equal(v.engineOn, true);
  v.update({ neutral: true, clutch: true }, .016); assert.equal(v.gear, 0);
  v.update({ reverse: true, clutch: true }, .016); assert.equal(v.gear, -1);
});
check('handbrake prevents acceleration, off-road limits speed, steering returns', () => {
  const v = new Vehicle(new THREE.Scene()); v.engineOn = true;
  v.update({ forward: true }, .1); assert.equal(v.speed, 0);
  v.handbrakeOn = false;
  for (let i = 0; i < 300; i++) v.update({ forward: true }, .016, false);
  assert.ok(v.speed <= v.config.topSpeed * .4);
  v.update({ left: true }, .1); assert.ok(v.steerAngle > 0);
  for (let i = 0; i < 50; i++) v.update({}, .016);
  assert.equal(v.steerAngle, 0);
});
check('motor safety and seat limits', () => {
  const v = new Vehicle(new THREE.Scene(), 'MOTOR');
  v.update({ helmet: true, jacket: true, gloves: true, shoes: true }, .016);
  assert.ok(v.helmetOn && v.jacketOn && v.glovesOn && v.shoesOn);
  for (let i = 0; i < 40; i++) v.update({ seatUp: true }, .016);
  assert.equal(v.seatHeight, .15);
  for (let i = 0; i < 80; i++) v.update({ seatDown: true }, .016);
  assert.equal(v.seatHeight, -.15);
});
check('city colliders, road boundaries and finish direction', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'models/city/colliders.json')));
  const track = new CityTrack(new THREE.Scene());
  track.roadRectangles = data.roadRectangles;
  track.colliders = data.colliders.map(c => ({ name: c.name, box: new THREE.Box3(new THREE.Vector3(...c.min), new THREE.Vector3(...c.max)) }));
  const v = new Vehicle(new THREE.Scene());
  v.position.copy(track.getVehicleStartPosition());
  assert.equal(track.collisionAt(v), null); assert.equal(track.isOnRoad(v.position), true);
  v.position.set(100, .09, 0); assert.equal(track.collisionAt(v), 'Batas area');
  assert.equal(track.isOnRoad(v.position), false);
  const wall = track.colliders.find(c => c.box.max.y > 1);
  v.position.copy(wall.box.getCenter(new THREE.Vector3())); v.position.y = .09;
  assert.ok(track.collisionAt(v));
  v.position.set(-1.75, .09, track.finishZ - 1); v.speed = 1; assert.equal(track.hasFinished(v), true);
  v.speed = -1; assert.equal(track.hasFinished(v), false);
});
fs.mkdirSync(path.resolve(__dirname, '../../artifacts/webgl'), { recursive: true });
fs.writeFileSync(path.resolve(__dirname, '../../artifacts/webgl/functions-report.json'), JSON.stringify({ passed: true, checks }, null, 2));
