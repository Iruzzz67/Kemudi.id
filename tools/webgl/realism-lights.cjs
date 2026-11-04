const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
let contextCount = 0;
class Parameter {
  constructor() { this.value = 0; }
  setTargetAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class AudioNode {
  constructor(ctx) { ctx.nodes++; this.frequency = new Parameter(); this.gain = new Parameter(); this.Q = new Parameter(); this.disconnected = false; }
  connect() {}
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop(time) { this.stopped = true; if (time === undefined && this.onended) this.onended(); }
}
class AudioContext {
  constructor() { contextCount++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 1000; this.nodes = 0; this.buffers = 0; this.destination = {}; }
  createGain() { return new AudioNode(this); }
  createOscillator() { return new AudioNode(this); }
  createBiquadFilter() { return new AudioNode(this); }
  createBufferSource() { return new AudioNode(this); }
  createBuffer(channels, count) { this.buffers++; return { getChannelData: () => new Float32Array(count) }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
const context = { THREE, window: { AudioContext }, console };
vm.createContext(context);
const root = path.join(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
for (const file of ['audio.js', 'systems/vehicle-light-system.js', 'systems/horn-system.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}
const { VehicleLightSystem, HornSystem, SimAudio } = context.window;
const scene = new THREE.Scene();
const lights = new VehicleLightSystem(scene);
function actor(type, id) {
  const size = type === 'MOTOR' ? [1.02, 2.26, 1.38] : type === 'TRUK' ? [2.88, 6.47, 3.27] : [2.31, 4.65, 1.516];
  const group = new THREE.Group();
  scene.add(group);
  const make = (name, x, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .05), new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0 }));
    mesh.name = name; mesh.position.set(x, .8, z); group.add(mesh); return mesh;
  };
  const v = { id, type, group, position: group.position, rotation: 0, config: { dimensions: { width: size[0], length: size[1], height: size[2] } },
    headlights: [make(type + '_Lights', -.4, -size[1] / 2)],
    taillights: [make(type + '_Taillight', -.4, size[1] / 2)],
    indicators: ['FL', 'FR', 'RL', 'RR'].map((suffix, i) => make('Indicator_' + suffix, i % 2 ? .4 : -.4, i < 2 ? -size[1] / 2 : size[1] / 2)),
    speed: 0, gear: 0, lightsOn: false, highBeamOn: false, signalTime: 0,
    signalLeft: false, signalRight: false, hazardOn: false, handbrakeOn: false, braking: false };
  lights.registerVehicle(v);
  return v;
}
const dry = { night: false, weather: 'off' };
for (const type of ['MOTOR', 'MOBIL', 'TRUK']) {
  const v = actor(type, 'player');
  v.lightsOn = true;
  lights.update(1 / 60, dry, [v], v.position);
  assert.equal(v.headlights[0].material.emissiveIntensity, 1);
  assert.equal(v.lightState.lowBeam, true);
  v.highBeamOn = true;
  lights.update(1 / 60, dry, [v], v.position);
  assert.equal(v.headlights[0].material.emissiveIntensity, 3);
  v.braking = true;
  lights.update(1 / 60, dry, [v], v.position);
  assert.equal(v.taillights[0].material.emissiveIntensity, 1);
  v.braking = false;
  lights.update(1 / 60, dry, [v], v.position);
  assert.equal(v.taillights[0].material.emissiveIntensity, .1);
  v.signalLeft = true; v.signalTime = .1;
  lights.update(1 / 60, dry, [v], v.position);
  assert.ok(v.indicators.filter(l => l.name.endsWith('L')).every(l => l.material.emissiveIntensity === 2));
  assert.ok(v.indicators.filter(l => l.name.endsWith('R')).every(l => l.material.emissiveIntensity === 0));
  v.signalTime = .6;
  lights.update(0, dry, [v], v.position);
  assert.ok(v.indicators.every(l => l.material.emissiveIntensity === 0));
  assert.equal(v.signalTime, .6, 'system never advances blink clock');
  v.hazardOn = true; v.signalTime = .2;
  lights.update(1 / 60, dry, [v], v.position);
  assert.ok(v.indicators.every(l => l.material.emissiveIntensity === 2));
  v.gear = -1; v.speed = -2;
  lights.update(1 / 60, dry, [v], v.position);
  assert.equal(v.lightState.reverse, true);
  const rig = v.group.getObjectByName('RealismVehicleLights:' + v.id);
  assert.equal(rig.children.filter(c => c.name.startsWith('Reverse:')).length, type === 'MOTOR' ? 0 : 2);
  lights.unregisterVehicle(v.id);
  assert.equal(v.group.getObjectByName('RealismVehicleLights:' + v.id), undefined);
  scene.remove(v.group);
  console.log('PASS player lights', type);
}
const ais = ['MOTOR', 'MOBIL', 'TRUK'].map((type, i) => actor(type, 'traffic:' + i));
lights.update(1 / 60, { night: true, weather: 'heavy' }, ais, new THREE.Vector3());
assert.ok(ais.every(v => v.lightsOn && v.lightState.lowBeam && !v.highBeamOn));
lights.update(1 / 60, dry, ais, new THREE.Vector3());
assert.ok(ais.every(v => !v.lightsOn));
lights.update(1 / 60, { night: false, weather: 'light' }, ais, new THREE.Vector3());
assert.ok(ais.every(v => v.lightsOn));
ais[0].speed = 8; lights.update(.1, dry, ais, new THREE.Vector3());
ais[0].speed = 6; lights.update(.1, dry, ais, new THREE.Vector3());
assert.equal(ais[0].lightState.brake, true, 'real deceleration lights brake');
lights.update(0, dry, ais, new THREE.Vector3());
assert.equal(ais[0].lightState.brake, true, 'pause freezes deceleration light');
assert.ok(scene.children.filter(o => o.isSpotLight).length <= 3, 'bounded real-light pool');
lights.dispose(); lights.dispose();
assert.equal(scene.children.filter(o => o.isSpotLight).length, 0);
console.log('PASS AI auto lights, braking, bounded illumination and cleanup');

const audio = new SimAudio(); audio.init(); audio.init();
assert.equal(contextCount, 1, 'one AudioContext shared across all horns');
const horn = new HornSystem(audio);
for (const [i, type] of ['MOTOR', 'MOBIL', 'TRUK'].entries()) {
  assert.equal(horn.trigger({ id: 'horn:' + i, type }, 1), true);
  assert.equal(horn.trigger({ id: 'horn:' + i, type }, 1.1), false, 'per-ID simulation cooldown');
}
assert.equal(horn.trigger({ id: 'horn:extra', type: 'MOBIL' }, 1), false, 'global voice cap');
assert.equal(audio.activeHornVoices, 3);
const tones = [...audio.voices].filter(v => v.kind === 'horn').map(v => v.sources.map(s => s.frequency.value).join('/'));
assert.equal(new Set(tones).size, 3, 'three vehicle types have distinct audible tones');
audio.silence();
assert.equal(audio.activeHornVoices, 0);
assert.equal(audio.voices.size, 0);
assert.equal(horn.trigger({ id: 'horn:0', type: 'MOTOR' }, 5), true);
audio.setMuted(true);
assert.equal(audio.activeHornVoices, 0);
assert.equal(horn.trigger({ id: 'muted', type: 'TRUK' }, 3), false);
audio.setMuted(false);
audio.ctx.state = 'suspended';
assert.equal(horn.trigger({ id: 'suspended', type: 'MOBIL' }, 3), false);
audio.resume();
assert.equal(horn.trigger({ id: 'resumed', type: 'MOBIL' }, 4), true);
assert.equal(horn.trigger({ id: 'invalid', type: 'MOBIL' }, NaN), false);
audio.silence();
const nodeCount = audio.ctx.nodes, bufferCount = audio.ctx.buffers;
for (let i = 0; i < 100; i++) audio.playTireSkid(.8);
assert.equal(audio.ctx.nodes, nodeCount, 'skid source/filter/gain pooled');
assert.equal(audio.ctx.buffers, bufferCount, 'skid noise buffer pooled');
assert.equal(audio.playHorn(), true, 'legacy default horn still works');
audio.silence();
horn.dispose();
assert.equal(horn.trigger({ id: 'disposed', type: 'TRUK' }, 10), false);
audio.dispose(); audio.dispose();
assert.equal(audio.initialized, false);
console.log('PASS bounded per-type horns, cooldown/mute/autoplay/pause, pooled skid and cleanup');
