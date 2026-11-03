const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.SIM_URL || 'http://127.0.0.1:8080/';
const output = path.resolve(__dirname, '../../artifacts/webgl');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true,
    args: process.env.SOFTWARE_WEBGL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [] });
  const results = [];
  let currentPage;
  try {
    for (const type of ['MOBIL', 'MOTOR', 'TRUK']) {
      console.log(type + ': loading');
      const page = currentPage = await browser.newPage({ viewport: { width: 960, height: 640 } });
      page.setDefaultTimeout(45000);
      const errors = [], external = [], failed = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => failed.push(request.url()));
      page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) external.push(request.url()); });
      await page.goto(`${base}?vehicle=${type}&transmission=automatic`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.kemudiSimulation?.snapshot().ready, null, { timeout: 60000 });
      assert.equal(await page.locator(`.vs-card[data-type="${type}"]`).getAttribute('aria-pressed'), 'true');
      await page.locator('#vs-start').click();
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
      const before = await page.evaluate(() => window.kemudiSimulation.snapshot());
      assert.equal(before.vehicle, type);
      assert.equal(before.loaded, true);
      assert.equal(before.wheels.length, type === 'MOTOR' ? 2 : 4);
      await page.screenshot({ path: path.join(output, `${type.toLowerCase()}-walking.png`) });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
      await page.keyboard.press('KeyI');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().engine);
      await page.keyboard.press('KeyB');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => !window.kemudiSimulation.snapshot().handbrake);
      await page.keyboard.press('KeyL');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.headlights.every(v => v === 1));
      await page.keyboard.press('KeyK');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.headlights.every(v => v === 3));
      await page.keyboard.down('KeyS');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.brakes.every(v => v === 1));
      await page.keyboard.up('KeyS');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.brakes.every(v => v === .1));
      assert.equal((await page.evaluate(() => window.kemudiSimulation.snapshot())).lights.indicators.length, 4);
      await page.keyboard.press('KeyZ');
      await page.waitForFunction(() => {
        const lamps = window.kemudiSimulation.snapshot().lights.indicators;
        return lamps.filter(l => l.name.endsWith('L')).every(l => l.intensity === 2)
          && lamps.filter(l => l.name.endsWith('R')).every(l => l.intensity === 0);
      });
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.indicators.every(l => l.intensity === 0));
      await page.keyboard.press('KeyV');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().lights.indicators.every(l => l.intensity === 2));
      assert.equal(await page.locator('#hud-signal-r').isVisible(), true);
      await page.keyboard.press('KeyV');
      await page.keyboard.press('KeyZ');
      await page.keyboard.press('BracketRight');
      await page.keyboard.press('KeyM');
      await page.waitForFunction(() => {
        const s = window.kemudiSimulation.snapshot(); return s.seatAdjusted && s.mirrorChecked;
      });
      await page.keyboard.down('KeyW');
      await page.waitForFunction(z => window.kemudiSimulation.snapshot().position[2] < z - 2, before.position[2]);
      await page.keyboard.up('KeyW');
      const moving = await page.evaluate(() => window.kemudiSimulation.snapshot());
      console.log(type + ': driving');
      assert.ok(moving.wheels.every(w => Math.abs(w.spin) > .1));
      await page.screenshot({ path: path.join(output, `${type.toLowerCase()}-driving.png`) });
      await page.keyboard.press('KeyP');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'paused');
      const paused = await page.evaluate(() => window.kemudiSimulation.snapshot());
      await page.waitForTimeout(400);
      assert.equal((await page.evaluate(() => window.kemudiSimulation.snapshot())).elapsed, paused.elapsed);
      await page.locator('#pause-resume').click();
      await page.locator('#sim-canvas').focus();
      await page.keyboard.down('KeyS');
      await page.waitForFunction(() => Math.abs(window.kemudiSimulation.snapshot().speed) < .1);
      await page.keyboard.up('KeyS');
      console.log(type + ': stopped');
      await page.keyboard.press('KeyR');
      await page.waitForFunction(() => window.kemudiSimulation.snapshot().gear === -1);
      const reverseStart = await page.evaluate(() => window.kemudiSimulation.snapshot().position[2]);
      await page.keyboard.down('KeyW');
      await page.waitForFunction(z => window.kemudiSimulation.snapshot().position[2] > z + .4, reverseStart);
      await page.keyboard.up('KeyW');
      console.log(type + ': reversing');
      await page.keyboard.down('KeyS');
      await page.waitForFunction(() => Math.abs(window.kemudiSimulation.snapshot().speed) < .1);
      await page.keyboard.up('KeyS');
      for (const camera of ['FPV', 'TopDown', 'TPV']) {
        await page.keyboard.press('KeyC');
        await page.waitForFunction(c => window.kemudiSimulation.snapshot().camera === c, camera);
        if (camera === 'FPV') await page.screenshot({ path: path.join(output, `${type.toLowerCase()}-fpv.png`) });
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(external, []);
      results.push({ type, before, moving, errors, failed, external, checks: ['GLB loaded', 'named wheels', 'drive forward', 'synchronized wheel motion', 'pause freezes time', 'brake', 'reverse', 'three cameras', 'local assets only', 'headlights and high beam', 'S brake lights', 'left indicators blink independently', 'hazard lights and HUD', 'seat and mirror checklist'] });
      console.log(type + ' passed');
      await page.close();
    }
  } catch (error) {
    console.error('Failed state:', await currentPage?.evaluate(() => window.kemudiSimulation?.snapshot()).catch(() => null));
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
