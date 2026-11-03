// Deterministic collision and motion contract regression tests; no renderer required.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const root = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
const context = { THREE, performance, window: {}, console };
vm.createContext(context);
for (const file of ['systems/collision-system.js', 'vehicle.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
const { CollisionWorld, Vehicle, VEHICLE_CONFIGS } = context.window;
Vehicle.prototype._loadModel = async function () {};
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS', name); }
function actor(id, type, x, z, rotation = 0) {
  return { id, type, position: new THREE.Vector3(x, .09, z), rotation, speed: 0, config: VEHICLE_CONFIGS[type] };
}
function apply(entity, resolved) { entity.position.copy(resolved.position); entity.rotation = resolved.rotation; entity.speed = resolved.speed; }
function proposed(entity, dx, dz, rotation = entity.rotation) {
  return { id: entity.id, position: entity.position.clone().add(new THREE.Vector3(dx, 0, dz)), rotation };
}
check('mixed shapes stop before stationary player at 15/30/60 FPS and frame spike', () => {
  for (const hz of [15, 30, 60, 2]) for (const type of ['MOTOR', 'MOBIL', 'TRUK']) {
    const world = new CollisionWorld(), player = actor('player', 'TRUK', 0, 0), ai = actor('ai', type, 0, 20);
    world.registerBody(player.id, player); world.registerBody(ai.id, ai);
    for (let i = 0; i < hz * 3; i++) {
      const results = world.resolve([proposed(ai, 0, -26 / hz)], 1 / hz);
      apply(ai, results.get(ai.id));
      assert.ok(ai.position.z >= (ai.config.dimensions.length + player.config.dimensions.length) / 2 - 1e-6);
    }
    assert.equal(ai.speed, 0);
  }
});
check('simultaneous head-on and swap cannot tunnel; proposal order does not matter', () => {
  for (const reverse of [false, true]) {
    const world = new CollisionWorld(), a = actor('a', 'MOBIL', 0, 12), b = actor('b', 'MOTOR', 0, -12, Math.PI);
    world.registerBody(a.id, a); world.registerBody(b.id, b);
    const proposals = [proposed(a, 0, -30), proposed(b, 0, 30)];
    const results = world.resolve(reverse ? proposals.reverse() : proposals, .5);
    const pa = results.get('a').position, pb = results.get('b').position;
    assert.ok(pa.z - pb.z >= (a.config.dimensions.length + b.config.dimensions.length) / 2 - 1e-6);
    assert.ok(results.get('a').blocked && results.get('b').blocked);
    assert.equal(a.position.z, 12, 'solver must not commit poses');
  }
});
check('reverse and crossing traffic are constrained by the same world', () => {
  const world = new CollisionWorld(), a = actor('a', 'MOBIL', 0, -10), b = actor('b', 'TRUK', 0, 0);
  world.registerBody('a', a); world.registerBody('b', b);
  const result = world.resolve([proposed(a, 0, 15)], 1).get('a');
  assert.ok(result.position.z <= -(a.config.dimensions.length + b.config.dimensions.length) / 2);
  assert.equal(result.speed, 0);
  const crossWorld = new CollisionWorld(), north = actor('north', 'MOBIL', 0, 12), east = actor('east', 'TRUK', -12, 0, -Math.PI / 2);
  crossWorld.registerBody(north.id, north); crossWorld.registerBody(east.id, east);
  const crossing = crossWorld.resolve([proposed(north, 0, -24), proposed(east, 24, 0)], .5);
  assert.ok(crossing.get('north').blocked && crossing.get('east').blocked);
  assert.ok(crossing.get('north').position.z > 0 && crossing.get('east').position.x < 0);
});
check('contact propagation stops a three-actor queue against a static barrier', () => {
  const world = new CollisionWorld(), actors = [actor('front', 'MOBIL', 0, 8), actor('middle', 'MOTOR', 0, 16), actor('rear', 'TRUK', 0, 24)];
  world.registerStaticBox('barrier', { x: -5, y: 0, z: -1 }, { x: 5, y: 4, z: 0 });
  for (const a of actors) world.registerBody(a.id, a);
  const result = world.resolve(actors.map(a => proposed(a, 0, -40)), 1);
  actors.forEach(a => { assert.equal(result.get(a.id).blocked, true); apply(a, result.get(a.id)); });
  for (let i = 1; i < actors.length; i++)
    assert.ok(actors[i].position.z - actors[i - 1].position.z >= (actors[i].config.dimensions.length + actors[i - 1].config.dimensions.length) / 2);
});
check('rotation sweeps are conservative and a clear rotation succeeds', () => {
  const world = new CollisionWorld(), a = actor('a', 'TRUK', 0, 0), b = actor('b', 'MOTOR', 2.7, 0);
  world.registerBody('a', a); world.registerBody('b', b);
  assert.ok(world.resolve([proposed(a, 0, 0, Math.PI / 2)], .1).get('a').blocked);
  world.unregisterBody('b');
  assert.equal(world.resolve([proposed(a, 0, 0, Math.PI / 2)], .1).get('a').rotation, Math.PI / 2);
});
check('static wall sweep, spawn validation, release and vertical clearance', () => {
  const world = new CollisionWorld(), a = actor('a', 'MOTOR', 0, 10);
  world.registerBody('a', a);
  world.registerStaticBox('wall', { x: -4, y: 0, z: -.05 }, { x: 4, y: 3, z: .05 });
  const result = world.resolve([proposed(a, 0, -40)], .25).get('a');
  assert.ok(result.blocked && result.contactKind === 'static' && result.position.z > 1);
  assert.equal(world.canSpawn({ position: a.position, rotation: 0 }, a.config.dimensions), false);
  assert.equal(world.canSpawn({ position: a.position, rotation: 0 }, a.config.dimensions, 'a'), true);
  assert.equal(world.canSpawn({ position: { x: 0, y: 0, z: 0 }, rotation: 0 }, a.config.dimensions), false);
  world.unregisterBody('wall');
  assert.equal(world.canSpawn({ position: { x: 0, y: 0, z: 0 }, rotation: 0 }, a.config.dimensions), true);
  world.registerStaticBox('bridge', { x: -4, y: 5, z: -1 }, { x: 4, y: 6, z: 1 });
  assert.equal(world.resolve([proposed(a, 0, -40)], .25).get('a').blocked, false);
});
check('lead obstacle uses bumper gaps, includes stopped engine-off player and ignores neighbouring lane', () => {
  const world = new CollisionWorld(), a = actor('ai', 'MOTOR', 0, 15), p = actor('player', 'MOBIL', 0, 0), other = actor('other', 'TRUK', 5, 10);
  for (const v of [a, p, other]) world.registerBody(v.id, v);
  const lead = world.getLeadObstacle('ai', 50);
  assert.equal(lead.id, 'player');
  assert.ok(Math.abs(lead.distance - (15 - (2.26 + 4.65) / 2)) < 1e-6);
  world.unregisterBody('player');
  assert.equal(world.getLeadObstacle('ai', 50), null);
});
check('a contact can reverse away; non-finite proposals never poison transforms', () => {
  const world = new CollisionWorld(), a = actor('a', 'MOTOR', 0, 5), b = actor('b', 'MOBIL', 0, 0);
  world.registerBody('a', a); world.registerBody('b', b);
  apply(a, world.resolve([proposed(a, 0, -5)], .1).get('a'));
  const away = world.resolve([proposed(a, 0, 2)], .1).get('a');
  assert.equal(away.blocked, false); assert.ok(away.position.z > a.position.z);
  const invalid = world.resolve([{ id: 'a', position: { x: NaN, y: 0, z: Infinity }, rotation: NaN }], Infinity).get('a');
  assert.ok(Number.isFinite(invalid.position.x) && Number.isFinite(invalid.position.z) && Number.isFinite(invalid.speed));
});
check('motion planning defers pose and visuals; commit uses actual travel and contact speed', () => {
  const scene = new THREE.Scene(), v = new Vehicle(scene); v.id = 'player'; v.engineOn = true; v.handbrakeOn = false;
  const start = v.position.clone(), meshStart = v.group.position.clone();
  const proposal = v.planMotion({ forward: true, lights: true }, 1 / 60, true);
  assert.deepEqual(v.position.toArray(), start.toArray());
  assert.deepEqual(v.group.position.toArray(), meshStart.toArray());
  assert.ok(proposal.position.z < start.z); assert.equal(v.lightsOn, true);
  v.commitMotion({ position: start, rotation: 0, speed: 0, blocked: true }, 1 / 60);
  assert.equal(v.speed, 0); assert.equal(v.braking, true); assert.deepEqual(v.group.position.toArray(), start.toArray());
  v.update({ forward: true }, 1 / 60); assert.ok(v.position.z < start.z, 'legacy update still moves');
});
check('deferred engine cranking counts simulation time, not paused wall time', () => {
  const v = new Vehicle(new THREE.Scene()); v.id = 'player';
  v.startEngine(); v.engineStartTime -= 5000;
  v.planMotion({}, .1);
  assert.equal(v.engineOn, false, 'wall time while paused must not finish engine crank');
  for (let i = 0; i < 11; i++) v.planMotion({}, .1);
  assert.equal(v.engineOn, true);
});
console.log(`Collision realism: ${passed} groups passed`);
