// Exercise result-panel recovery against the real gateway without rendering 3D.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const web = process.env.WEB_URL || 'http://127.0.0.1:5290';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const checks = [];
  const payload = { attemptId: crypto.randomUUID(), vehicleType: 'MOTOR', score: 25,
    timeTakenMs: 25000, violations: 3, offRoadCount: 1, collisionCount: 1, completed: false };
  const mount = async () => {
    await page.setContent('<div id="screen"><div></div></div>');
    await page.addScriptTag({ url: web + '/simulation-3d/results.js' });
    await page.evaluate(data => attachResultSaving(document.getElementById('screen'), data), payload);
  };
  try {
    await page.goto(web + '/api/session');
    await mount();
    await page.getByRole('link', { name: 'Login', exact: true }).waitFor();
    checks.push('Anonymous result panel requests login');
    await context.addCookies([{ name: 'kemudi_token', value: 'invalid-expired-test-token', url: web, httpOnly: true }]);
    await mount();
    await page.getByRole('link', { name: 'Login', exact: true }).waitFor();
    checks.push('Invalid session rejected and login recovery offered');
    const csrf = (await (await context.request.get(web + '/api/session')).json()).requestToken;
    const register = await context.request.post(web + '/api/session/register', {
      headers: { 'X-CSRF-TOKEN': csrf },
      data: { name: 'Result Recovery Test', email: `result-recovery-${Date.now()}@example.test`, password: crypto.randomUUID() }
    });
    assert.equal(register.status(), 200);
    await page.getByRole('button', { name: 'Coba simpan lagi' }).click();
    await page.waitForFunction(() => document.querySelector('.result-save')?.dataset.attemptId);
    const rows = await (await context.request.get(web + '/api/simulation/results')).json();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, payload.attemptId);
    assert.equal(rows[0].completed, false);
    checks.push('Pending result saved after authentication restored');
    await page.route('**/api/session', route => route.fulfill({ status: 404, body: '' }));
    await mount();
    await page.getByText('Mode mandiri:', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Coba simpan lagi' }).isVisible(), false);
    checks.push('Standalone build reports backend unavailable honestly');
    const output = path.resolve(__dirname, '../../artifacts/backend-integration');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'recovery-report.json'), JSON.stringify({ passed: true, checks }, null, 2));
    checks.forEach(c => console.log('PASS ' + c));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
