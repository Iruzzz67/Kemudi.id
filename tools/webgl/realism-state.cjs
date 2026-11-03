const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = path.resolve(__dirname, '../../src/Kemudi.Web/wwwroot/simulation-3d');
const listeners = {};
const context = { window: { addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener: name => { delete listeners[name]; } } };
vm.createContext(context);
for (const file of ['systems/simulation-state.js', 'systems/instrument-system.js', 'controls.js']) {
  vm.runInContext(fs.readFileSync(path.join(source, file), 'utf8'), context, { filename: file });
}
const { SimulationState, InstrumentSystem, InputManager } = context.window;
const registry = new SimulationState();
const player = { id: 'player', speed: -5, gear: -1, engineOn: false, handbrakeOn: false, signalTime: .5, signalLeft: true };
registry.register(player);
assert.equal(registry.getPlayerVehicle(), player);
assert.throws(() => registry.register(player), /Duplicate/);
for (let i = 0; i < 60; i++) registry.step();
assert.equal(registry.clock.elapsed, 1);
registry.resetClock(); assert.equal(registry.clock.tick, 0);
registry.register({ id: 'traffic:1' }); registry.unregister('traffic:1');
assert.equal(registry.getVehicles().length, 1);
for (const speed of [0, 1, -5, NaN, Infinity]) {
  player.speed = speed;
  const snapshot = InstrumentSystem.snapshotFromVehicle(player, { timeOfDay: 'malam', weather: 'heavy' });
  assert.equal(snapshot.speedKmh, Number.isFinite(speed) ? Math.abs(speed) * 3.6 : 0);
  assert.equal(snapshot.gear, 'R');
  assert.equal(snapshot.timeOfDay, 'malam');
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.lights));
}
player.speed = 0; player.gear = 0;
assert.equal(InstrumentSystem.snapshotFromVehicle(player).speedText, '0');
assert.equal(InstrumentSystem.snapshotFromVehicle(player).gear, 'N');
const input = new InputManager();
function down(code, tagName = 'CANVAS', repeat = false, isContentEditable = false) {
  listeners.keydown({ code, repeat, target: { tagName, isContentEditable }, preventDefault() {} });
}
down('KeyL'); input.update(); assert.equal(input.lights, true);
down('KeyL', 'CANVAS', true); input.update(); assert.equal(input.lights, false);
listeners.keyup({ code: 'KeyL' });
for (const tag of ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']) { down('KeyL', tag); input.update(); assert.equal(input.lights, false); }
down('KeyW', 'DIV', false, true); assert.equal(input.forward, false);
down('KeyW'); assert.equal(input.forward, true);
listeners.blur(); assert.equal(input.forward, false);
input.destroy(); assert.equal(Object.keys(listeners).length, 0);
console.log('PASS shared registry/clock, committed instruments, reverse/zero/nonfinite, input repeat/form/blur/cleanup');
