// Focused real-website iframe check, independent of the long driving matrix.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../../artifacts/realism');
const web = process.env.WEB_URL || 'http://127.0.0.1:5891';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const report = { started: new Date().toISOString(), web, passed: false, errors: [] };
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    await page.goto(web + '/simulasi/play?vehicle=TRUK&transmission=manual');
    const frame = page.frameLocator('iframe[title="Simulasi mengemudi Kemudi.id"]');
    await frame.locator('#wh-enter').waitFor({ state: 'visible', timeout: 120000 });
    await frame.locator('#sim-canvas').focus();
    await page.keyboard.press('Enter');
    const runtime = page.frames().find(f => f.url().includes('/simulation-3d/index.html'));
    await runtime.waitForFunction(() => window.kemudiSimulation?.snapshot().phase === 'driving');
    report.state = await runtime.evaluate(() => window.kemudiSimulation.snapshot());
    assert.equal(report.state.vehicle, 'TRUK');
    assert.equal(report.state.loaded, true);
    assert.equal(report.state.map, 'unified');
    assert.equal(report.state.traffic.length, 16);
    assert.ok(report.state.traffic.every(v => v.active && v.loaded));
    assert.equal(report.state.trafficLOD.registered, 16);
    assert.deepEqual(report.errors, []);
    await page.screenshot({ path: path.join(output, 'iframe-preview.png') });
    report.passed = true;
    console.log('PASS actual website iframe loads TRUK/manual and enters driving with 16 real AI');
  } catch (error) {
    report.error = error.message;
    throw error;
  } finally {
    report.finished = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'iframe-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
