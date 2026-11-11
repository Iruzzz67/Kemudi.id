const {chromium} = require('../../tools/webgl/node_modules/playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path');
const web = 'http://127.0.0.1:5893';
(async () => {
  const report = {web, checks: [], errors: [], passed: false,
    scope: 'Real iframe UI probe and injected result payloads through real gateway; NOT a completed driving journey'};
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({viewport: {width: 960, height: 720}});
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const check = name => {report.checks.push(name); console.log('PASS ' + name);};
  try {
    await page.goto(web + '/simulasi/play?vehicle=TRUK&transmission=manual');
    const locator = page.frameLocator('iframe');
    for (let attempt = 0; attempt < 3; attempt++) {
    try {
    await locator.locator('#wh-enter').waitFor({state: 'visible', timeout: 120000});
    let frame = page.frames().find(f => f.url().includes('/simulation-3d/index.html'));
    report.iframeBefore = await frame.evaluate(() => window.kemudiSimulation.snapshot());
    await locator.locator('#sim-canvas').click();
    await page.keyboard.press('Enter');
    try {
      await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving', null, {timeout: 15000});
      check('Iframe TRUK/manual keyboard entry with an explicit canvas click');
    } catch (error) {
      report.keyboardEntryError = error.message;
      frame = page.frames().find(f => f.url().includes('/simulation-3d/index.html'));
      report.iframeAfterKeyboard = await frame.evaluate(() => window.kemudiSimulation.snapshot());
      await locator.locator('#wh-enter').click();
      await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
      check('Iframe TRUK/manual entry via actual Enter UI button (keyboard probe did not pass)');
    }
    report.iframeDriving = await frame.evaluate(() => window.kemudiSimulation.snapshot());
    assert.equal(report.iframeDriving.vehicle, 'TRUK');
    assert.equal(report.iframeDriving.traffic.length, 16);
    assert.ok(report.iframeDriving.traffic.every(v => v.active && v.loaded));
    await page.screenshot({path: path.join(__dirname, 'iframe-focused.png')});
    break;
    } catch (error) {
      if (!/detached/i.test(error.message) || attempt === 2) throw error;
      report.initialHydrationRetries = (report.initialHydrationRetries || 0) + 1;
    }
    }
    await page.goto(web + '/api/session');
    const headers = async () => ({'X-CSRF-TOKEN': (await (await context.request.get(web + '/api/session')).json()).requestToken});
    const response = await context.request.post(web + '/api/session/register', {
      headers: await headers(), data: {name: 'Focused Result QA', email: `focused-${Date.now()}@example.test`, password: crypto.randomUUID() + 'aA!9'}
    });
    assert.equal(response.status(), 200);
    const payload = {attemptId: crypto.randomUUID(), vehicleType: 'TRUK', score: 82, timeTakenMs: 56321,
      violations: 1, offRoadCount: 2, collisionCount: 1, completed: true};
    let submissions = 0;
    await page.route('**/api/simulation/results', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      submissions++;
      if (submissions === 1) {
        assert.equal((await route.fetch()).status(), 200);
        return route.abort('failed');
      }
      if (submissions === 2) return route.fulfill({status: 503, body: '{}', contentType: 'application/json'});
      return route.continue();
    });
    await page.setContent('<div id="screen"><div></div></div>');
    await page.addScriptTag({url: web + '/simulation-3d/results.js'});
    await page.evaluate(data => attachResultSaving(document.getElementById('screen'), data), payload);
    const retry = page.getByRole('button', {name: 'Coba simpan lagi', exact: true});
    await retry.waitFor({state: 'visible'});
    await retry.click();
    await retry.waitFor({state: 'visible'});
    await retry.click();
    await page.waitForFunction(() => document.querySelector('.result-save')?.dataset.attemptId);
    assert.equal(submissions, 3);
    await page.unroute('**/api/simulation/results');
    let rows = await (await context.request.get(web + '/api/simulation/results')).json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, payload.attemptId);
    check('Result panel survives lost saved response and 503, retries one AttemptId without duplicate');
    const failed = {...payload, attemptId: crypto.randomUUID(), vehicleType: 'MOTOR', score: 0, completed: false};
    assert.equal((await context.request.post(web + '/api/simulation/results', {headers: await headers(), data: failed})).status(), 200);
    rows = await (await context.request.get(web + '/api/simulation/results')).json();
    assert.equal(rows.length, 2);
    assert.equal(rows.find(r => r.id === failed.attemptId).completed, false);
    check('Completed and failed injected results persist in real test database');
    await page.goto(web + '/dashboard', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('tbody tr').count(), 2);
    assert.match(await page.locator('tbody').innerText(), /Gagal/);
    assert.match(await page.locator('tbody').innerText(), /Selesai/);
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('tbody tr').count(), 2);
    await page.screenshot({path: path.join(__dirname, 'dashboard-focused.png')});
    check('Dashboard displays both statuses and persisted rows after reload');
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.error = error.message;
    await page.screenshot({path: path.join(__dirname, 'focused-integration-failure.png')}).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(__dirname, 'focused-integration-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
