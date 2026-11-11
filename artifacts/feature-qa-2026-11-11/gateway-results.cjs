const {chromium} = require('../../tools/webgl/node_modules/playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path');
const web = 'http://127.0.0.1:5893';
(async () => {
  const report = {web, checks: [], passed: false, scope: 'Injected completed/failed results, real gateway/database/dashboard; NOT a driving journey'};
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext();
  const page = await context.newPage();
  const check = name => {report.checks.push(name); console.log('PASS ' + name);};
  try {
    await page.goto(web + '/api/session');
    const headers = async () => ({'X-CSRF-TOKEN': (await (await context.request.get(web + '/api/session')).json()).requestToken});
    assert.equal((await context.request.post(web + '/api/session/register', {
      headers: await headers(), data: {name: 'Result QA', email: `resultqa-${Date.now()}@example.test`, password: crypto.randomUUID() + 'aA!9'}
    })).status(), 200);
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
    check('Lost saved response and 503 recover via real panel retry without duplicate AttemptId');
    const failed = {...payload, attemptId: crypto.randomUUID(), vehicleType: 'MOTOR', score: 0, completed: false};
    assert.equal((await context.request.post(web + '/api/simulation/results', {headers: await headers(), data: failed})).status(), 200);
    rows = await (await context.request.get(web + '/api/simulation/results')).json();
    assert.equal(rows.length, 2);
    assert.equal(rows.find(r => r.id === failed.attemptId).completed, false);
    check('Injected completed and failed results persist');
    await page.goto(web + '/dashboard', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('tbody tr').count(), 2);
    assert.match(await page.locator('tbody').innerText(), /Gagal/);
    assert.match(await page.locator('tbody').innerText(), /Selesai/);
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('tbody tr').count(), 2);
    await page.screenshot({path: path.join(__dirname, 'dashboard-focused.png')});
    check('Dashboard shows both statuses and persists after reload');
    report.passed = true;
  } catch (error) {report.error = error.message; throw error;}
  finally {
    fs.writeFileSync(path.join(__dirname, 'gateway-results-report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
