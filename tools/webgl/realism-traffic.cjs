// Deterministic traffic/crossing integration, using the actual shared collision world.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const source = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
const context = { THREE, performance, console, window: {} };
vm.createContext(context);
for (const file of ['vehicle.js', 'intersection.js', 'long-road.js', 'systems/simulation-state.js',
  'systems/collision-system.js', 'systems/character-system.js', 'systems/traffic-routes.js',
  'systems/pedestrian-system.js', 'systems/traffic-system.js'])
  vm.runInContext(fs.readFileSync(path.join(source, file), 'utf8'), context, { filename: file });
const { Vehicle, IntersectionDefinition, TrafficSignalController, LongRoad, SimulationState,
  CollisionWorld, TrafficRoutes, TrafficSystem, PedestrianSystem } = context.window;
Vehicle.prototype._loadModel = async function () { this.modelLoaded = true; };
let passed = 0;
async function check(name, fn) { await fn(); passed++; console.log('PASS', name); }
function fixture() {
  const scene = new THREE.Scene();
  const intersections = [new IntersectionDefinition({ armLengths: { S: 47 } }),
    new IntersectionDefinition({ id: 'training-junction', center: [0, .09, -400] })].map(definition => ({
      definition, controller: new TrafficSignalController(definition),
      agents: [{ mesh: new THREE.Group() }],
    }));
  const track = { intersections, longRoad: new LongRoad(scene), roadHeight: .09,
    getVehicleStartPosition: () => new THREE.Vector3(-1.75, .09, 24) };
  const world = new CollisionWorld(), registry = new SimulationState();
  return { scene, track, world, registry, traffic: new TrafficSystem(scene, track, world, registry) };
}
function green(f) {
  for (const j of f.track.intersections) {
    // A deterministic signal fixture, not a second runtime controller.
    j.controller = { current: { colors: { N: 'GREEN', S: 'GREEN', E: 'GREEN', W: 'GREEN' } } };
  }
}
function isolate(f, types) {
  const actors = types.map(type => f.traffic.getVehicles().find(v => v.type === type));
  for (const actor of f.traffic.getVehicles()) { f.world.unregisterBody(actor.id); actor.active = false; }
  const route = f.traffic.routes.spineNorth;
  actors.forEach((v, i) => {
    v.active = true; v.route = route; v.routeProgress = 34 - i * 11; v.speed = 0;
    const pose = route.sample(v.routeProgress); v.position.copy(pose.position); v.rotation = pose.rotation;
    f.world.registerBody(v.id, v);
  });
  return actors;
}
function tick(f, dt = 1 / 60, environment = {}, peds = null, playerProposal = null) {
  const proposals = f.traffic.plan(dt, environment, peds);
  if (peds?.getMotionProposals) proposals.push(...peds.getMotionProposals());
  if (playerProposal) proposals.push(playerProposal);
  const result = f.world.resolve(proposals, dt);
  f.traffic.commit(result, dt);
  peds?.commit?.(result, dt);
  return result;
}
function stepPedestrians(pedestrians, f, dt, vehicles) {
  pedestrians.update(dt, vehicles);
  if (dt > 0) pedestrians.commit(f.world.resolve(pedestrians.getMotionProposals(), dt), dt);
}
function assertQueue(actors) {
  for (let i = 1; i < actors.length; i++) {
    const front = actors[i - 1], rear = actors[i];
    const gap = rear.position.z - front.position.z - (rear.config.dimensions.length + front.config.dimensions.length) / 2;
    assert.ok(gap >= -.0001, 'mixed queue must not overlap: ' + gap);
  }
}
(async () => {
  await check('turn adapters follow existing inbound/outbound lanes with smooth pre-turn intent', () => {
    const f = fixture(), routes = TrafficRoutes.build(f.track);
    for (const j of f.track.intersections) for (const a of j.definition.approaches) for (const turn of ['left', 'right']) {
      const route = routes.turns.get(j.definition.config.id + ':' + a.id + ':' + turn);
      assert.ok(route, 'missing ' + turn + ' route');
      assert.ok(route.sample(0).position.distanceTo(j.definition.point(a, -a.armLength + 4)) < .001);
      assert.ok(route.sample(0).forward.dot(a.forward) > .999);
      assert.ok(route.sample(route.length).forward.dot(turn === 'left' ? a.left : a.left.clone().negate()) > .999);
      for (let s = .5; s < route.length - .5; s += .25) {
        const delta = route.sample(s).rotation - route.sample(s - .25).rotation;
        assert.ok(Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < .3, 'no instant heading jump');
      }
    }
  });
  await check('green turn clears while perpendicular red queue remains behind its stop line', async () => {
    const f = fixture(); await f.traffic.init();
    const v = f.traffic.getVehicles().find(v => v.route.turn?.direction === 'right');
    const blocker = f.traffic.getVehicles().find(o => o.junction === v.junction && o.approach.id === 'N');
    for (const o of f.traffic.getVehicles()) { f.world.unregisterBody(o.id); o.active = false; }
    for (const o of [v, blocker]) { o.active = true; o.speed = 0; f.world.registerBody(o.id, o); }
    const d = v.junction.definition;
    blocker.routeProgress = blocker.route.project(d.point(blocker.approach, -d.stopDistance - d.config.buffer - blocker.config.dimensions.length / 2 - .2));
    let pose = blocker.route.sample(blocker.routeProgress); blocker.position.copy(pose.position); blocker.rotation = pose.rotation;
    v.routeProgress = v.route.turn.start - 18;
    pose = v.route.sample(v.routeProgress); v.position.copy(pose.position); v.rotation = pose.rotation;
    v.junction.controller = { current: { colors: { N: 'RED', S: 'RED', E: 'GREEN', W: 'GREEN' } } };
    const before = blocker.position.clone();
    for (let i = 0; i < 1000 && v.routeProgress <= v.route.turn.end + v.config.dimensions.length; i++) tick(f, 1 / 30);
    assert.ok(blocker.position.distanceTo(before) < .25, 'red queue must remain stopped');
    assert.ok(v.routeProgress > v.route.turn.end + v.config.dimensions.length / 2, 'red cross-road queue must not reserve green turn');
    f.traffic.dispose();
  });
  await check('routes use both real intersections and the continuous long-road lanes', () => {
    const f = fixture(), routes = TrafficRoutes.build(f.track);
    assert.equal(routes.routes.length, 6);
    assert.ok(routes.spineNorth.length > 475);
    assert.equal(routes.spineNorth.gates.length, 2);
    for (let s = 2; s < f.track.longRoad.length - 2; s += 3) {
      const frame = f.track.longRoad.frame(s), actual = frame.point.clone().addScaledVector(frame.left, 1.75);
      const p = routes.spineNorth.sample(routes.spineNorth.project(actual)).position;
      assert.ok(p.distanceTo(actual) < .02, 'curve lane comes from LongRoad.frame');
    }
    for (const route of routes.routes) {
      const start = route.sample(0), end = route.sample(route.length);
      assert.ok(start.position.distanceTo(end.position) > 90);
      assert.ok(Math.abs(start.forward.length() - 1) < 1e-6);
    }
  });
  await check('actual three Vehicle classes register safely, and old demo agents are removed once', async () => {
    const f = fixture(); await f.traffic.init();
    assert.equal(f.traffic.getVehicles().length, 16);
    assert.deepEqual([...new Set(f.traffic.getVehicles().map(v => v.type))].sort(), ['MOBIL', 'MOTOR', 'TRUK']);
    assert.equal(f.registry.getVehicles().length, 16);
    assert.equal(f.world.bodies.size, 16);
    assert.ok(f.track.intersections.every(j => j.agents.length === 0));
    for (const v of f.traffic.getVehicles()) assert.ok(f.world.canSpawn({ position: v.position, rotation: v.rotation }, v.config.dimensions, v.id));
    const ids = f.traffic.getVehicles().map(v => v.id), refs = f.traffic.getVehicles();
    f.traffic.reset();
    assert.deepEqual(f.traffic.getVehicles().map(v => v.id), ids);
    assert.ok(f.traffic.getVehicles().every((v, i) => v === refs[i]));
    f.traffic.dispose(); assert.equal(f.world.bodies.size, 0); assert.equal(f.registry.getVehicles().length, 0);
  });
  await check('all vehicle types indicate before/during turns, obey red, and cancel after exit', async () => {
    for (const type of ['MOTOR', 'MOBIL', 'TRUK']) for (const direction of ['left', 'right']) {
      const f = fixture(); await f.traffic.init(); const [v] = isolate(f, [type]);
      const city = JSON.parse(fs.readFileSync(path.join(source, 'models/city/colliders.json')));
      city.colliders.forEach((c, i) => {
        if (c.max[1] > .29 && c.max.every((value, axis) => value > c.min[axis]))
          f.world.registerStaticBox('turn-static:' + i, new THREE.Vector3(...c.min), new THREE.Vector3(...c.max));
      });
      const junction = f.track.intersections[0], approach = junction.definition.approaches.find(a => a.id === 'E');
      v.route = f.traffic.routes.turns.get(junction.definition.config.id + ':E:' + direction);
      v.routeProgress = v.route.turn.start - 18;
      const pose = v.route.sample(v.routeProgress); v.position.copy(pose.position); v.rotation = pose.rotation;
      junction.controller = { current: { colors: { N: 'RED', S: 'RED', E: 'RED', W: 'RED' } } };
      for (let i = 0; i < 240; i++) tick(f, 1 / 30);
      assert.equal(v.speed, 0); assert.equal(v.stopReason, 'RED_LIGHT');
      assert.equal(v.signalLeft, direction === 'left'); assert.equal(v.signalRight, direction === 'right');
      const gate = v.route.gates[0]; assert.ok(v.routeProgress + v.config.dimensions.length / 2 <= gate.s + .05);
      green(f); let seen = false;
      for (let i = 0; i < 1000 && v.routeProgress < v.route.turn.end + 6; i++) {
        const yaw = v.rotation; tick(f, 1 / 30);
        assert.ok(Math.abs(Math.atan2(Math.sin(v.rotation - yaw), Math.cos(v.rotation - yaw))) < .12, 'bounded yaw per tick');
        if (v.routeProgress > v.route.turn.start && v.routeProgress < v.route.turn.end) {
          seen = true; assert.equal(direction === 'left' ? v.signalLeft : v.signalRight, true);
        }
      }
      assert.ok(seen && v.routeProgress > v.route.turn.end + v.config.dimensions.length / 2, type + ' must clear turn');
      assert.equal(v.signalLeft, false); assert.equal(v.signalRight, false);
      f.traffic.dispose();
    }
  });
  await check('reset does not spawn over the registered player at the intersection demo', async () => {
    const f = fixture(); await f.traffic.init();
    const player = new Vehicle(f.scene, 'TRUK'); player.id = 'player'; player.position.set(-1.75, .09, -65);
    f.world.registerBody(player.id, player); f.registry.register(player);
    f.traffic.reset(player);
    assert.equal(f.traffic.getVehicles().filter(v => v.active).length, 16);
    for (const v of f.traffic.getVehicles()) assert.ok(f.world.canSpawn({ position: v.position, rotation: v.rotation }, v.config.dimensions, v.id));
  });
  await check('three mixed AI queue behind an engine-off player and resume for 20 stop-go cycles', async () => {
    const f = fixture(); await f.traffic.init(); green(f);
    const actors = isolate(f, ['MOBIL', 'MOTOR', 'TRUK']), route = actors[0].route;
    const player = new Vehicle(f.scene, 'MOBIL'); player.id = 'player'; let progress = 45;
    player.position.copy(route.sample(progress).position); player.rotation = 0; player.engineOn = false;
    f.world.registerBody(player.id, player);
    for (let cycle = 0; cycle < 20; cycle++) {
      for (let n = 0; n < 1200; n++) {
        tick(f); assertQueue([player, ...actors]);
        if (n > 30 && actors.every(v => v.speed === 0)) break;
      }
      assert.ok(actors.every(v => v.speed < .08), 'queue parks with engine-off leader ' + JSON.stringify({ cycle, actors: actors.map(v => ({ type: v.type, speed: v.speed, s: v.routeProgress, reason: v.stopReason })) }));
      const before = actors.map(v => v.routeProgress);
      for (let n = 0; n < 120; n++) {
        progress += 1 / 60; const pose = route.sample(progress);
        player.speed = 1;
        const result = tick(f, 1 / 60, {}, null, { id: player.id, position: pose.position, rotation: pose.rotation });
        player.position.copy(result.get(player.id).position); player.speed = result.get(player.id).speed;
        assertQueue([player, ...actors]);
      }
      player.speed = 0;
      assert.ok(actors.every((v, i) => v.routeProgress > before[i] + .01), 'each queued actor resumes');
    }
  });
  await check('red signal stops before front bumper line, green releases without deadlock', async () => {
    const f = fixture(); await f.traffic.init(); const [v] = isolate(f, ['TRUK']);
    const gate = v.route.gates[0]; v.routeProgress = gate.s - v.config.dimensions.length / 2 - 8;
    v.position.copy(v.route.sample(v.routeProgress).position); v.speed = 5;
    for (let i = 0; i < 480; i++) tick(f);
    assert.ok(v.routeProgress + v.config.dimensions.length / 2 <= gate.s + .001);
    assert.equal(v.speed, 0); assert.equal(v.stopReason, 'RED_LIGHT');
    const before = v.routeProgress; green(f);
    for (let i = 0; i < 180; i++) tick(f);
    assert.ok(v.routeProgress > before + 1);
  });
  await check('heavy rain lowers cruise speed and enlarges following margins', async () => {
    async function drive(environment) {
      const f = fixture(); await f.traffic.init(); green(f); const [v] = isolate(f, ['MOBIL']);
      v.routeProgress = 175; const pose = v.route.sample(v.routeProgress); v.position.copy(pose.position); v.rotation = pose.rotation;
      for (let i = 0; i < 360; i++) tick(f, 1 / 60, environment);
      return v.speed;
    }
    const dry = await drive({ roadGripFactor: 1, recommendedAIMaxSpeedFactor: 1 });
    const wet = await drive({ roadGripFactor: .84, recommendedAIMaxSpeedFactor: .65 });
    assert.ok(wet < dry * .8 && wet > 0);
  });
  await check('pedestrians request real zebra crossings, wait for occupied road and walk without teleporting', () => {
    const f = fixture(), pedestrians = new PedestrianSystem(f.scene, f.track, f.world);
    assert.equal(pedestrians.getActiveAgents().length, 6);
    const ped = pedestrians.getActiveAgents()[0]; ped.waitTimer = 100;
    const blocker = new Vehicle(f.scene, 'TRUK'); blocker.id = 'player'; blocker.position.copy(ped.crosswalk.center);
    f.world.registerBody(blocker.id, blocker);
    stepPedestrians(pedestrians, f, 1 / 60, [blocker]);
    assert.equal(ped.crossing, false);
    assert.ok(pedestrians.getCrossingConstraints().some(c => c.id === ped.crosswalk.id));
    f.world.unregisterBody(blocker.id);
    stepPedestrians(pedestrians, f, 1 / 60, []); assert.equal(ped.crossing, true);
    const start = ped.position.clone();
    for (let i = 0; i < 240; i++) {
      const before = ped.position.clone(); stepPedestrians(pedestrians, f, 1 / 60, []);
      assert.ok(ped.position.distanceTo(before) <= ped.walkSpeed / 60 + .001);
    }
    assert.ok(ped.position.distanceTo(start) > 3);
    assert.ok(ped.character.animationTime > 0);
    const positions = pedestrians.getActiveAgents().map(p => p.position.clone());
    pedestrians.update(0, []);
    pedestrians.getActiveAgents().forEach((p, i) => assert.ok(p.position.equals(positions[i])));
    pedestrians.dispose(); assert.equal(f.world.bodies.size, 0);
  });
  await check('AI yields to a requested crossing then resumes when it clears', async () => {
    const f = fixture(); await f.traffic.init(); green(f); const [v] = isolate(f, ['MOBIL']);
    const crosswalk = TrafficRoutes.crossings(f.track).find(c => c.approach.id === 'S');
    const crossingS = v.route.project(crosswalk.center);
    v.routeProgress = crossingS - 15; v.position.copy(v.route.sample(v.routeProgress).position);
    const peds = { getCrossingConstraints: () => [crosswalk] };
    for (let i = 0; i < 480; i++) tick(f, 1 / 60, {}, peds);
    assert.ok(v.routeProgress + v.config.dimensions.length / 2 < crossingS - crosswalk.halfDepth);
    assert.equal(v.speed, 0); assert.equal(v.stopReason, 'YIELD_PEDESTRIAN');
    const before = v.routeProgress;
    for (let i = 0; i < 180; i++) tick(f);
    assert.ok(v.routeProgress > before + 1);
  });
  await check('a new crossing request lets an already-entered vehicle clear before the walker enters', async () => {
    const f = fixture(); await f.traffic.init(); green(f); const [v] = isolate(f, ['TRUK']);
    const pedestrians = new PedestrianSystem(f.scene, f.track, f.world);
    const ped = pedestrians.getActiveAgents().find(p => p.crosswalk.approach.id === 'S');
    const crossingS = v.route.project(ped.crosswalk.center);
    v.routeProgress = crossingS; v.position.copy(v.route.sample(crossingS).position); v.speed = 1;
    ped.waitTimer = 100;
    pedestrians.update(1 / 60, [v]); assert.equal(ped.crossing, false);
    const before = v.routeProgress;
    tick(f, 1 / 60, {}, pedestrians);
    assert.ok(v.routeProgress > before, 'a requesting walker must not trap a car already in the zebra');
    for (let n = 0; n < 480; n++) { pedestrians.update(1 / 60, [v]); tick(f, 1 / 60, {}, pedestrians); }
    assert.ok(ped.progress > 0, 'walker eventually crosses after vehicle clears');
  });
  await check('route ends stop safely instead of recycling visibly, and pause/invalid dt do not move actors', async () => {
    const f = fixture(); await f.traffic.init(); green(f); const [v] = isolate(f, ['MOTOR']);
    v.routeProgress = v.route.length - v.config.dimensions.length / 2 - .5;
    let pose = v.route.sample(v.routeProgress); v.position.copy(pose.position); v.rotation = pose.rotation;
    for (let i = 0; i < 180; i++) tick(f);
    assert.ok(v.routeProgress <= v.route.length - v.config.dimensions.length / 2);
    assert.equal(v.speed, 0); assert.equal(v.stopReason, 'ROUTE_END');
    const before = v.position.clone(); assert.equal(f.traffic.plan(NaN).length, 0); assert.equal(f.traffic.plan(0).length, 0);
    assert.ok(v.position.equals(before));
  });
  await check('15/30/60 FPS mixed queues retain consistent stopped poses without overlap', async () => {
    const stopped = [];
    for (const hz of [15, 30, 60]) {
      const f = fixture(); await f.traffic.init(); green(f);
      const actors = isolate(f, ['MOBIL', 'MOTOR', 'TRUK']), route = actors[0].route;
      const player = new Vehicle(f.scene, 'MOBIL'); player.id = 'player';
      player.position.copy(route.sample(45).position); player.rotation = 0; player.engineOn = false;
      f.world.registerBody(player.id, player);
      for (let i = 0; i < hz * 20; i++) { tick(f, 1 / hz); assertQueue([player, ...actors]); }
      assert.ok(actors.every(v => v.speed === 0)); stopped.push(actors.map(v => v.routeProgress));
    }
    for (const row of stopped) row.forEach((s, index) => assert.ok(Math.abs(s - stopped[0][index]) < .12));
  });
  await check('bounded real static world, both signal controllers and walkers remains safe and live', async () => {
    const f = fixture();
    const city = JSON.parse(fs.readFileSync(path.join(source, 'models/city/colliders.json')));
    const colliders = city.colliders.map(c => ({ min: c.min, max: c.max }));
    f.track.longRoad.colliders.forEach(c => colliders.push({ min: c.box.min.toArray(), max: c.box.max.toArray() }));
    colliders.forEach((c, i) => {
      if (c.max[1] > .29 && c.max.every((value, axis) => value > c.min[axis]))
        f.world.registerStaticBox('static:' + i, new THREE.Vector3(...c.min), new THREE.Vector3(...c.max));
    });
    const pedestrians = new PedestrianSystem(f.scene, f.track, f.world); await f.traffic.init();
    const starts = f.traffic.getVehicles().map(v => v.routeProgress);
    let crossingTicks = 0, movingTicks = 0;
    // Two full signal cycles plus walker clearance: the first EW window can be
    // consumed by leading straight vehicles and pedestrians before trailing turns.
    const frames = Number(process.env.REALISM_TRAFFIC_STEPS) || 7200;
    for (let frame = 0; frame < frames; frame++) {
      f.track.intersections.forEach(j => j.controller.update(1 / 60));
      pedestrians.update(1 / 60, f.registry.getVehicles());
      tick(f, 1 / 60, { roadGripFactor: .84, recommendedAIMaxSpeedFactor: .65 }, pedestrians);
      if (pedestrians.getActiveAgents().some(p => p.crossing && p.speed > 0)) crossingTicks++;
      if (f.traffic.getVehicles().some(v => v.speed > .1)) movingTicks++;
      if (frame % 120 === 0) {
        for (const v of f.traffic.getVehicles()) if (v.active) {
          assert.ok(Number.isFinite(v.speed) && Number.isFinite(v.rotation));
          assert.ok(f.world.canSpawn({ position: v.position, rotation: v.rotation }, v.config.dimensions, v.id), 'full world overlap: ' + v.id);
        }
        for (const p of pedestrians.getActiveAgents())
          assert.ok(f.world.canSpawn({ position: p.position, rotation: p.rotation }, p.shape, p.id), 'walker overlap: ' + p.id);
      }
    }
    assert.ok(crossingTicks > frames / 12 && movingTicks > frames / 4, 'walkers and traffic actually move ' + JSON.stringify({ crossingTicks, movingTicks,
      actors: f.traffic.getVehicles().map((v, i) => ({ id: v.id, advance: v.routeProgress - starts[i], speed: v.speed, reason: v.stopReason })),
      walkers: pedestrians.getActiveAgents().map(p => ({ id: p.id, crossing: p.crossing, requesting: p.requesting, progress: p.progress, speed: p.speed })) }));
    assert.ok(f.traffic.getVehicles().filter((v, i) => v.routeProgress > starts[i] + 10).length >= (frames >= 3600 ? 12 : 6), 'traffic progresses through real signals');
    const completedTurns = f.traffic.getVehicles().filter(v => v.route.turn
      && v.routeProgress > v.route.turn.end + v.config.dimensions.length / 2);
    if (frames >= 7200) assert.equal(completedTurns.length, f.traffic.getVehicles().filter(v => v.route.turn).length,
      'all full-world turning traffic must actually clear a turn, not only approach: ' + JSON.stringify(
      f.traffic.getVehicles().filter(v => v.route.turn).map(v => ({ id: v.id, progress: v.routeProgress, turn: v.route.turn, reason: v.stopReason, speed: v.speed }))));
    console.log('SIMULATION', JSON.stringify({ seconds: frames / 60, crossingTicks, movingTicks,
      completedTurns: completedTurns.map(v => v.id),
      advances: f.traffic.getVehicles().map((v, i) => +(v.routeProgress - starts[i]).toFixed(2)) }));
    pedestrians.dispose(); f.traffic.dispose();
  });
  console.log(JSON.stringify({ passed: true, groups: passed }));
})().catch(error => { console.error(error); process.exitCode = 1; });
