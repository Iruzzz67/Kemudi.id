// Drive the real truck across the housing/north-road join using keyboard input only.
// Diagnostics are read-only; no vehicle, position or simulation-clock mutation hooks.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve(__dirname, '../../artifacts/realism');
const timeout = Number(process.env.ROAD_SEAM_TIMEOUT_MS || 180000);
const report = { started: new Date().toISOString(), passed: false, checks: [], errors: [] };
fs.mkdirSync(output, { recursive: true });
const save = () => fs.writeFileSync(path.join(output, 'road-seam-browser-report.json'), JSON.stringify(report, null, 2));
const state = page => page.evaluate(() => window.kemudiSimulation.snapshot());
function check(name, fn) { fn(); report.checks.push(name); console.log('PASS', name); save(); }
async function press(page, key) { await page.locator('#sim-canvas').focus(); await page.keyboard.press(key); }
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => report.errors.push(error.message));
  save();
  try {
    const url = new URL(process.env.SIM_URL || 'http://127.0.0.1:8080/');
    url.searchParams.set('vehicle', 'TRUK');
    url.searchParams.set('transmission', 'automatic');
    url.searchParams.set('autostart', '1');
    await page.goto(url.href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.kemudiSimulation?.snapshot().phase === 'walking');
    const walking = await state(page);
    check('actual TRUK model loads at the normal housing spawn', () => {
      assert.equal(walking.vehicle, 'TRUK'); assert.equal(walking.loaded, true);
      assert.equal(walking.map, 'unified'); assert.equal(walking.position[2], 24);
    });
    await press(page, 'Enter');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    // Allow the entering context's neutral gate to observe real released input.
    const enteringTick = (await state(page)).clock.tick;
    await page.waitForFunction(tick => window.kemudiSimulation.snapshot().clock.tick > tick + 2, enteringTick);
    await press(page, 'KeyI');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().engine);
    await press(page, 'KeyB');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().equipment.seatbelt);
    await press(page, 'KeyC');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().camera === 'FPV');
    await press(page, 'KeyC');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().camera === 'TopDown');
    await press(page, 'Space');
    await page.waitForFunction(() => !window.kemudiSimulation.snapshot().handbrake);
    report.before = await state(page);
    report.violationsBefore = Number(await page.locator('#hud-violations').textContent());
    check('normal UI starts the engine, equips seatbelt and releases handbrake', () => {
      assert.equal(report.before.phase, 'driving'); assert.equal(report.before.engine, true);
      assert.equal(report.before.equipment.seatbelt, true); assert.equal(report.before.handbrake, false);
      assert.equal(report.before.gamepad.source, 'keyboard');
    });
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => {
      const s = window.kemudiSimulation.snapshot();
      if (s.phase !== 'driving') throw new Error('Driving interrupted before road join: ' + s.phase);
      return s.position[2] < -38;
    }, null, { timeout });
    await page.keyboard.up('KeyW');
    report.crossed = await state(page);
    report.violationsAfter = Number(await page.locator('#hud-violations').textContent());
    check('truck drives completely across the former invisible seam at z=-33', () => {
      assert.ok(report.crossed.position[2] < -38, 'rear of the truck must clear the road join');
      assert.ok(report.crossed.speed > 0, 'crossing uses actual forward motion');
      assert.equal(report.crossed.engine, true);
    });
    check('crossing stays in its original lane without a boundary penalty', () => {
      assert.ok(Math.abs(report.crossed.position[0] - report.before.position[0]) < .01);
      assert.equal(report.violationsAfter, report.violationsBefore, 'road join must not count as an obstacle');
      assert.deepEqual(report.errors, []);
    });
    await page.keyboard.down('KeyS');
    await page.waitForFunction(() => Math.abs(window.kemudiSimulation.snapshot().speed) < .01);
    await page.keyboard.up('KeyS');
    await press(page, 'Space');
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().handbrake);
    report.final = await state(page);
    check('ordinary brake input stops the truck after crossing', () => {
      assert.ok(Math.abs(report.final.speed) < .01); assert.equal(report.final.handbrake, true);
    });
    await page.screenshot({ path: path.join(output, 'road-seam-truk-automatic.png') });
    report.passed = true;
  } catch (error) {
    report.error = error.stack || error.message;
    report.state = await state(page).catch(() => null);
    report.warning = await page.locator('#hud-warning').textContent().catch(() => null);
    await page.screenshot({ path: path.join(output, 'road-seam-truk-automatic-failure.png') }).catch(() => {});
    throw error;
  } finally {
    await page.keyboard.up('KeyW').catch(() => {});
    await page.keyboard.up('KeyS').catch(() => {});
    report.finished = new Date().toISOString(); save();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
