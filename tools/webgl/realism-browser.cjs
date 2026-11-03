// Browser acceptance through real UI and read-only runtime diagnostics. No test-only mutators.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.SIM_URL || 'http://127.0.0.1:8080/';
const output = path.resolve(__dirname, '../../artifacts/realism');
fs.mkdirSync(output, { recursive: true });
const report = { started: new Date().toISOString(), passed: false, cases: [], checks: [], gaps: [] };
const dimensions = { MOTOR: { width: 1.02, length: 2.26 }, MOBIL: { width: 2.31, length: 4.65 }, TRUK: { width: 2.88, length: 6.47 } };
const snapshot = page => page.evaluate(() => window.kemudiSimulation.snapshot());
function check(name, fn) { fn(); report.checks.push(name); console.log('PASS', name); }
function assertSeparated(actors) {
  for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) {
    const a = actors[i], b = actors[j], da = dimensions[a.type], db = dimensions[b.type];
    const axes = yaw => [{ x: Math.cos(yaw), z: -Math.sin(yaw) }, { x: Math.sin(yaw), z: Math.cos(yaw) }];
    const radius = (d, yaw, n) => {
      const [r, f] = axes(yaw);
      return Math.abs(r.x * n.x + r.z * n.z) * d.width / 2 + Math.abs(f.x * n.x + f.z * n.z) * d.length / 2;
    };
    const gaps = [...axes(a.rotation), ...axes(b.rotation)].map(n => Math.abs((b.position[0] - a.position[0]) * n.x + (b.position[2] - a.position[2]) * n.z) - radius(da, a.rotation, n) - radius(db, b.rotation, n));
    assert.ok(Math.max(...gaps) >= -.05, `${a.id} overlaps ${b.id}: ${Math.max(...gaps)}m`);
  }
}
async function press(page, key) { await page.locator('#sim-canvas').focus(); await page.keyboard.press(key); }
async function environmentMatrix(page) {
  for (const time of ['pagi', 'siang', 'sore', 'malam']) for (const weather of ['off', 'light', 'heavy']) {
    await page.locator('#environment-time').selectOption(time);
    await page.locator('#environment-weather').selectOption(weather);
    await page.waitForFunction(({ time, weather }) => {
      const e = window.kemudiSimulation.snapshot().environment;
      return e.timeOfDay === time && e.weather === weather;
    }, { time, weather });
    const state = await snapshot(page);
    assert.ok(state.environment.visibilityFactor > 0 && state.environment.roadGripFactor > 0);
    assert.equal(state.environment.night, time === 'malam');
    if (weather !== 'off') assert.ok(state.environment.recommendedAIMaxSpeedFactor < 1);
  }
  check('all 12 independent time/weather combinations switch through labelled selects', () => {});
}
async function testCase(browser, type, transmission, matrix) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  page.setDefaultTimeout(60000);
  const errors = [], failed = [], missing = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.location().url?.endsWith('/favicon.ico')) errors.push(message.text());
  });
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) missing.push({ url: r.url(), status: r.status() }); });
  const caseReport = { type, transmission, checks: [], passed: false };
  report.cases.push(caseReport);
  const caseCheck = (name, fn) => { check(`${type}/${transmission}: ${name}`, fn); caseReport.checks.push(name); };
  try {
    const url = new URL(base); url.searchParams.set('vehicle', type); url.searchParams.set('transmission', transmission);
    if (process.env.REALISM_DEMO) url.searchParams.set('demo', process.env.REALISM_DEMO);
    console.log('CASE', type, transmission);
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.kemudiSimulation?.snapshot().ready || document.querySelector('#loading-retry')?.hidden === false, null, { timeout: 90000 });
    assert.equal((await snapshot(page)).ready, true, await page.locator('#loading-status').textContent());
    if (matrix) await environmentMatrix(page);
    await page.locator('#environment-time').selectOption('siang');
    await page.locator('#environment-weather').selectOption('off');
    await page.locator('#vs-start').click();
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
    const walking = await snapshot(page);
    caseCheck('actual three-type AI models, safe spawn and unified crossings', () => {
      assert.equal(walking.vehicle, type); assert.equal(walking.loaded, true);
      assert.equal(walking.traffic.length, 16);
      assert.ok(walking.traffic.every(v => v.active && v.loaded), 'all sixteen actors must be safely spawned actual loaded models, not NO_SAFE_SPAWN placeholders');
      const near = walking.traffic.filter(v => Math.hypot(v.position[0] - walking.position[0], v.position[2] - walking.position[2]) < 40);
      assert.ok(near.every(v => v.groupVisible), 'nearby actors remain rendered; distant rendering LOD may be culled');
      assert.deepEqual([...new Set(walking.traffic.map(v => v.type))].sort(), ['MOBIL', 'MOTOR', 'TRUK']);
      assert.equal(new Set(walking.traffic.map(v => v.id)).size, walking.traffic.length);
      assert.ok(walking.intersections.every(j => j.agents.length === 0), 'demo AI must not remain active');
      assert.ok(walking.pedestrians.length >= 2, 'unified map must have real pedestrian agents');
      assertSeparated(walking.traffic);
    });
    await press(page, 'Enter');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    await press(page, 'KeyI');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().engine);
    if (type === 'MOTOR') for (const key of ['KeyH', 'KeyJ', 'KeyG', 'KeyF']) await press(page, key);
    else await press(page, 'KeyB');
    await press(page, 'KeyL');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.headlights.every(n => n === 1));
    await press(page, 'KeyK');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.headlights.every(n => n === 3));
    await press(page, 'KeyZ');
    await page.waitForFunction(() => {
      const s = window.kemudiSimulation.snapshot();
      return s.instruments.lights.left && s.instruments.lights.blink && s.lights.indicators.filter(l => l.name.endsWith('L')).every(l => l.intensity === 2);
    });
    await press(page, 'KeyV');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.indicators.every(l => l.intensity === 2));
    await press(page, 'KeyT');
    caseCheck('legacy lights/signals/hazard/horn keys remain operable', () => {});
    await press(page, 'KeyC');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().camera === 'FPV');
    await page.waitForFunction(() => {
      const s = window.kemudiSimulation.snapshot();
      return s.cockpit.visible && s.cockpit.speedText === s.instruments.speedText && s.cockpit.gear === s.instruments.gear;
    });
    const fpv = await snapshot(page);
    caseCheck('vehicle-specific procedural cockpit shares committed HUD snapshot', () => {
      assert.equal(fpv.cockpit.type, type); assert.equal(fpv.cockpit.procedural, true);
      assert.equal(fpv.instruments.speedText, '0');
      assert.equal(fpv.exteriorVisible, false, 'exterior roof must not occlude first-person view');
      assert.equal(fpv.characters.headVisible, false, 'local avatar head must be hidden in first person');
      assert.ok(fpv.characters.mountedIds.includes('player'));
      assert.equal(fpv.characters.count, 17, 'player and sixteen traffic actors have mounted characters');
      assert.equal(fpv.audio.state, 'running', 'audio context is unlocked after actual user input');
      assert.ok(fpv.audio.activeHornVoices >= 0 && fpv.audio.activeHornVoices <= 3);
    });
    if (transmission === 'automatic') await page.screenshot({ path: path.join(output, `${type.toLowerCase()}-cockpit-day.png`) });
    await press(page, 'BracketRight'); await press(page, 'KeyM');
    await page.waitForFunction(() => {
      const s = window.kemudiSimulation.snapshot(); return s.seatAdjusted && s.mirrorChecked;
    });
    await press(page, 'KeyP');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'paused');
    const paused = await snapshot(page);
    await page.waitForTimeout(250);
    const frozen = await snapshot(page);
    caseCheck('pause freezes tick, vehicle, indicators, traffic and pedestrians', () => {
      assert.deepEqual(frozen.clock, paused.clock); assert.deepEqual(frozen.position, paused.position);
      assert.deepEqual(frozen.traffic, paused.traffic); assert.deepEqual(frozen.pedestrians, paused.pedestrians);
      assert.deepEqual(frozen.lights, paused.lights);
      assert.equal(frozen.audio.activeHornVoices, 0, 'pause silences active horn voices');
    });
    if (matrix) {
      await environmentMatrix(page);
      const afterMatrix = await snapshot(page);
      assert.deepEqual(afterMatrix.clock, paused.clock, 'changing environment while paused must not advance time');
      await page.locator('#environment-time').selectOption('malam');
      await page.locator('#environment-weather').selectOption('heavy');
    }
    await page.locator('#pause-resume').click();
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    await page.locator('#sim-canvas').focus();
    if (matrix) {
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().traffic.every(v => v.lights.lowBeam));
      await page.screenshot({ path: path.join(output, 'night-heavy-rain-cockpit.png') });
    }
    await press(page, 'KeyT');
    await press(page, 'Space');
    await page.waitForFunction(() => !window.kemudiSimulation.snapshot().handbrake);
    if (transmission === 'manual') {
      await page.keyboard.down('ShiftLeft'); await press(page, 'KeyE');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().gear === 1);
    }
    await page.keyboard.down('KeyW');
    if (transmission === 'manual') await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(z => window.kemudiSimulation.snapshot().position[2] < z - 1, fpv.position[2]);
    const moving = await snapshot(page);
    caseCheck('forward movement, wheels and one actual speed reading', () => {
      assert.ok(moving.speed > 0); assert.ok(moving.wheels.every(w => Math.abs(w.spin) > .05));
      assert.ok(Math.abs(moving.instruments.speedKmh - Math.abs(moving.speed) * 3.6) < 1e-6);
      assert.equal(moving.cockpit.speedText, moving.instruments.speedText);
      assertSeparated(moving.traffic);
    });
    await page.keyboard.up('KeyW');
    if (transmission === 'manual') await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyS');
    await page.waitForFunction(() => Math.abs(window.kemudiSimulation.snapshot().speed) < .01);
    await page.keyboard.up('KeyS');
    await press(page, 'KeyR');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().gear === -1);
    const reverseStart = (await snapshot(page)).position[2];
    await page.keyboard.down('KeyW');
    if (transmission === 'manual') await page.keyboard.up('ShiftLeft');
    await page.waitForFunction(z => window.kemudiSimulation.snapshot().position[2] > z + .2, reverseStart);
    const reversing = await snapshot(page);
    caseCheck('reverse retains positive HUD magnitude and R indicator', () => {
      assert.ok(reversing.speed < 0); assert.ok(reversing.instruments.speedKmh >= 0);
      assert.equal(reversing.instruments.gear, 'R'); assert.equal(reversing.cockpit.gear, 'R');
    });
    await page.keyboard.up('KeyW'); await page.keyboard.down('KeyS');
    await page.waitForFunction(() => Math.abs(window.kemudiSimulation.snapshot().speed) < .01);
    await page.keyboard.up('KeyS');
    for (const mode of ['TopDown', 'TPV', 'FPV']) { await press(page, 'KeyC'); await page.waitForFunction(m => window.kemudiSimulation.snapshot().camera === m, mode); }
    const final = await snapshot(page);
    caseCheck('stopped speed and camera cycling stay synchronized', () => { assert.equal(final.instruments.speedText, '0'); assert.equal(final.cockpit.speedText, '0'); });
    if (matrix) {
      await page.waitForFunction(initial => window.kemudiSimulation.snapshot().pedestrians.some(p => {
        const before = initial.find(old => old.id === p.id);
        return before && Math.hypot(p.position[0] - before.position[0], p.position[2] - before.position[2]) > .1;
      }), walking.pedestrians, { timeout: 90000 });
      caseCheck('real crossing pedestrian moves from its initial sidewalk position', () => {});
    }
    caseCheck('no runtime errors, failed requests or missing assets', () => { assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(missing, []); });
    caseReport.final = final; caseReport.passed = true;
  } catch (error) {
    caseReport.error = error.message;
    caseReport.loadingStatus = await page.locator('#loading-status').textContent().catch(() => null);
    caseReport.state = await snapshot(page).catch(() => null);
    caseReport.errors = errors; caseReport.failed = failed; caseReport.missing = missing;
    await page.screenshot({ path: path.join(output, `${type.toLowerCase()}-${transmission}-failure.png`) }).catch(() => {});
    throw error;
  } finally { await page.close(); }
}
async function iframeSmoke(browser) {
  if (!process.env.WEB_URL) { report.gaps.push('Website iframe smoke not requested: set WEB_URL to a local website'); return; }
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  try {
    await page.goto(process.env.WEB_URL + '/simulasi/play?vehicle=TRUK&transmission=manual');
    const frame = page.frameLocator('iframe[title="Simulasi mengemudi Kemudi.id"]');
    await frame.locator('#wh-enter').waitFor({ state: 'visible', timeout: 90000 });
    await frame.locator('#wh-enter').click();
    const actualFrame = page.frames().find(f => f.url().includes('/simulation-3d/index.html'));
    await actualFrame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    const state = await snapshot(actualFrame);
    check('website /simulasi/play iframe runs real TRUK/manual unified runtime', () => { assert.equal(state.vehicle, 'TRUK'); assert.equal(state.map, 'unified'); assert.equal(state.traffic.length, 16); });
    await page.screenshot({ path: path.join(output, 'website-iframe.png') });
  } finally { await page.close(); }
}
async function stability(browser, seconds) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const samples = [];
  try {
    const url = new URL(base);
    for (const [key, value] of Object.entries({ vehicle: 'MOBIL', autostart: '1', demo: 'intersection', timeOfDay: 'malam', weather: 'heavy' })) url.searchParams.set(key, value);
    await page.goto(url.href);
    await page.waitForFunction(() => window.kemudiSimulation?.snapshot().phase === 'walking', null, { timeout: 90000 });
    await press(page, 'Enter');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    const deadline = Date.now() + seconds * 1000;
    let previousTick = -1;
    while (Date.now() < deadline) {
      const sample = await page.evaluate(() => ({ wall: Date.now(), state: window.kemudiSimulation.snapshot(), heapBytes: performance.memory?.usedJSHeapSize }));
      assert.ok(sample.state.clock.tick > previousTick, 'simulation clock must continue advancing');
      assert.equal(sample.state.phase, 'driving');
      assertSeparated(sample.state.traffic);
      assert.deepEqual(errors, []);
      previousTick = sample.state.clock.tick;
      samples.push(sample);
      fs.writeFileSync(path.join(output, 'stability-samples.json'), JSON.stringify({ requestedSeconds: seconds, samples, errors }, null, 2));
      await page.waitForTimeout(Math.min(5000, Math.max(1, deadline - Date.now())));
    }
    check(`${seconds}s night/heavy-rain runtime keeps ticking without vehicle overlap or browser error`, () => {});
    report.stability = { requestedSeconds: seconds, actualSeconds: samples.length > 1 ? (samples.at(-1).wall - samples[0].wall) / 1000 : 0, samples: samples.length, first: samples[0], last: samples.at(-1) };
    report.gaps.push('Stability samples are not a hardware FPS benchmark or proof against every JavaScript heap leak; resource counts and heap observations need separate performance review.');
    await page.screenshot({ path: path.join(output, 'night-heavy-rain-stability.png') });
  } finally { await page.close(); }
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: process.env.SOFTWARE_WEBGL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  try {
    if (Number(process.env.REALISM_STABILITY_SECONDS) > 0) await stability(browser, Number(process.env.REALISM_STABILITY_SECONDS));
    else {
      let first = true;
      for (const type of ['MOBIL', 'MOTOR', 'TRUK']) for (const transmission of ['automatic', 'manual']) {
        if (process.env.REALISM_CASE && process.env.REALISM_CASE !== `${type}/${transmission}`) continue;
        await testCase(browser, type, transmission, first); first = false;
      }
      await iframeSmoke(browser);
    }
    report.passed = true;
  } finally {
    report.finished = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
