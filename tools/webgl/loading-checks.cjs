const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const checks = [];
  const base = process.env.SIM_URL || 'http://127.0.0.1:8080/';
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '?map=training');
    await page.waitForFunction(() => window.kemudiSimulation?.snapshot().ready, null, { timeout: 60000 });
    assert.equal(await page.locator('#map-label').textContent(), 'Jalan latihan terpadu');
    assert.equal(await page.evaluate(()=>window.kemudiSimulation.snapshot().map), 'unified');
    await page.locator('#vs-start').click();
    await page.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
    await page.locator('#wh-enter').waitFor({ state: 'visible' });
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('#walking-hud button').getBoundingClientRect();
      const b = document.querySelector('#sim-toolbar').getBoundingClientRect();
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    });
    assert.equal(overlap, false, 'enter button must not overlap toolbar');
    await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/webgl/training-walking.png') });
    assert.deepEqual(errors, []); checks.push('training map loads and enters walking without JavaScript errors');
    await page.close();
    const failure = await browser.newPage();
    await failure.route('**/models/city/car.glb', route => route.abort());
    await failure.goto(base);
    await failure.waitForFunction(() => window.kemudiSimulation?.snapshot().ready, null, { timeout: 60000 });
    await failure.locator('#vs-start').click();
    await failure.locator('#loading-retry').waitFor({ state: 'visible' });
    assert.match(await failure.locator('#loading-status').textContent(), /gagal dimuat/);
    await failure.unroute('**/models/city/car.glb');
    await failure.locator('#loading-retry').click();
    await failure.waitForFunction(() => window.kemudiSimulation?.snapshot().ready, null, { timeout: 60000 });
    await failure.locator('#vs-start').click();
    await failure.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
    checks.push('missing GLB displays error and retry recovers after asset restored');
    fs.writeFileSync(path.resolve(__dirname, '../../artifacts/webgl/loading-report.json'), JSON.stringify({ passed: true, checks }, null, 2));
    console.log(checks);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
