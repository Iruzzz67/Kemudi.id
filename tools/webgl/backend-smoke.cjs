const { chromium, request } = require('playwright');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const web = process.env.WEB_URL || 'http://127.0.0.1:5290';
const api = process.env.API_URL || 'http://127.0.0.1:5090';
const output = path.resolve(__dirname, '../../artifacts/backend-integration');
fs.mkdirSync(output, { recursive: true });

(async () => {
  const report = { checks: [], attempts: [], passed: false };
  const check = name => { report.checks.push(name); console.log('PASS ' + name); };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 960, height: 720 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const email = `webgl-test-${Date.now()}@example.test`;
  const password = crypto.randomUUID() + 'aA!9';
  const session = async () => {
    const response = await context.request.get(web + '/api/session');
    assert.equal(response.status(), 200);
    return { 'X-CSRF-TOKEN': (await response.json()).requestToken };
  };
  const post = async payload => context.request.post(web + '/api/simulation/results', {
    data: payload, headers: await session()
  });
  const history = async () => {
    const response = await context.request.get(web + '/api/simulation/results');
    assert.equal(response.status(), 200);
    return response.json();
  };
  const sample = { attemptId: crypto.randomUUID(), vehicleType: 'TRUK', score: 82,
    timeTakenMs: 56321, violations: 1, offRoadCount: 2, collisionCount: 1, completed: true };
  try {
    assert.equal((await post(sample)).status(), 401);
    check('Anonymous save rejected');

    await page.goto(web + '/register', { waitUntil: 'networkidle' });
    // Prove Blazor is interactive before entering values into prerendered inputs.
    await page.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click();
    await page.getByText('Nama, email valid, dan password minimal 6 karakter wajib diisi.', { exact: true }).waitFor();
    await page.getByLabel('Nama Lengkap').fill('WebGL Integration Test');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click();
    await page.waitForURL('**/dashboard');
    const cookie = (await context.cookies()).find(c => c.name === 'kemudi_token');
    assert.equal(cookie?.httpOnly, true);
    assert.ok(!(await page.evaluate(() => document.cookie)).includes('kemudi_token'));
    check('Register UI and HttpOnly session');

    await page.goto(web + '/logout');
    await page.waitForURL(web + '/');
    assert.equal((await context.request.get(web + '/api/simulation/results')).status(), 401);
    await page.goto(web + '/login', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.locator('.error-box').waitFor();
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await page.waitForURL('**/dashboard');
    check('Logout and login UI');

    assert.equal((await context.request.post(web + '/api/simulation/results', { data: sample })).status(), 400);
    assert.equal((await post({ ...sample, vehicleType: 'INVALID' })).status(), 400);
    assert.equal((await post({ ...sample, violations: -1 })).status(), 400);
    assert.equal((await post({ ...sample, attemptId: '00000000-0000-0000-0000-000000000000' })).status(), 400);
    check('CSRF and invalid result rejection');

    const replies = await Promise.all([post(sample), post(sample)]);
    for (const response of replies) {
      assert.equal(response.status(), 200);
      assert.equal((await response.json()).id, sample.attemptId);
    }
    let rows = await history();
    assert.equal(rows.filter(row => row.id === sample.attemptId).length, 1);
    for (const key of ['vehicleType', 'score', 'timeTakenMs', 'violations', 'offRoadCount', 'collisionCount', 'completed'])
      assert.equal(rows[0][key], sample[key]);
    report.attempts.push(rows[0]);
    check('Concurrent retries save one row with all fields');

    const other = await request.newContext();
    try {
      const registered = await other.post(api + '/api/auth/register', {
        data: { name: 'WebGL Isolation Test', email: `other-${email}`, password }
      });
      assert.equal(registered.status(), 200);
      const token = (await registered.json()).token;
      const headers = { Authorization: 'Bearer ' + token };
      assert.deepEqual(await (await other.get(api + '/api/progress', { headers })).json(), []);
      assert.equal((await other.post(api + '/api/progress', { headers, data: sample })).status(), 409);
      check('User isolation and foreign attempt ownership');
    } finally { await other.dispose(); }

    // Exercise a real drive in the embedded WebGL simulator, including finish detection.
    console.log('Driving to the finish line...');
    await page.goto(web + '/simulasi/play?vehicle=MOBIL', { waitUntil: 'networkidle' });
    // Blazor can replace the prerendered iframe while its circuit hydrates.
    // FrameLocator reacquires the live frame instead of holding a detached one.
    const liveFrame = page.frameLocator('iframe');
    // The website supplies autostart=1; wait for its real walking UI, not the
    // intentionally hidden standalone vehicle selector.
    await liveFrame.locator('#wh-enter').waitFor({ state: 'visible', timeout: 90000 });
    const frame = page.frames().find(f => f.url().includes('/simulation-3d/index.html'));
    assert.ok(frame, 'Embedded simulation frame');
    await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
    await frame.locator('#sim-canvas').focus();
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    await page.keyboard.press('KeyI');
    await frame.waitForFunction(() => window.kemudiSimulation.snapshot().engine);
    await page.keyboard.press('KeyB');
    await page.keyboard.press('Space');
    await frame.waitForFunction(() => !window.kemudiSimulation.snapshot().handbrake);
    let submissions = 0, captured;
    await page.route('**/api/simulation/results', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      captured = route.request().postDataJSON();
      submissions++;
      if (submissions === 1) {
        const response = await route.fetch(); // Saved on server, but response lost.
        assert.equal(response.status(), 200);
        await route.abort('failed');
      } else if (submissions === 2) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      } else await route.continue();
    });
    // Follow the actual unified lane through keyboard input only. Holding W on
    // the obsolete straight test map cannot navigate the connected curved road.
    const held = new Set();
    const setKey = async (key, down) => {
      if (down === held.has(key)) return;
      if (down) { await page.keyboard.down(key); held.add(key); }
      else { await page.keyboard.up(key); held.delete(key); }
    };
    const deadline = Date.now() + (Number(process.env.BACKEND_DRIVE_TIMEOUT_MS) || 900000);
    let driving;
    try {
      while (Date.now() < deadline) {
        driving = await frame.evaluate(() => window.kemudiSimulation.snapshot());
        report.lastDrivingState = driving;
        if (driving.phase === 'finished') break;
        assert.equal(driving.phase, 'driving', 'real drive must not pause or fail');
        assert.ok(driving.navigationTarget, 'runtime must expose the actual route lookahead');
        const dx = driving.navigationTarget[0] - driving.position[0];
        const dz = driving.navigationTarget[2] - driving.position[2];
        const desiredYaw = Math.atan2(-dx, -dz);
        const error = Math.atan2(Math.sin(desiredYaw - driving.rotation), Math.cos(desiredYaw - driving.rotation));
        const desiredSteer = Math.max(-.45, Math.min(.45, Math.atan(2 * 2.7 * Math.sin(error) / Math.max(1, Math.hypot(dx, dz)))));
        await setKey('KeyA', desiredSteer > driving.steerAngle + .015);
        await setKey('KeyD', desiredSteer < driving.steerAngle - .015);
        await setKey('KeyW', driving.speed < 5.5);
        await setKey('KeyS', driving.speed > 6.5);
        await frame.waitForFunction(tick => window.kemudiSimulation.snapshot().clock.tick > tick
          || window.kemudiSimulation.snapshot().phase !== 'driving', driving.clock.tick, { timeout: 30000 });
      }
      assert.equal(driving?.phase, 'finished', 'real route did not finish within bounded wall time; last snapshot is in report');
    } finally {
      for (const key of held) await page.keyboard.up(key);
    }
    const retry = frame.getByRole('button', { name: 'Coba simpan lagi', exact: true });
    await retry.waitFor({ state: 'visible' });
    assert.equal((await history()).filter(r => r.id === captured.attemptId).length, 1);
    await retry.click();
    await retry.waitFor({ state: 'visible' });
    await retry.click();
    await frame.waitForFunction(() => document.querySelector('#finished-screen .result-save')?.dataset.attemptId);
    rows = await history();
    const driven = rows.filter(r => r.id === captured.attemptId);
    assert.equal(driven.length, 1);
    assert.equal(driven[0].vehicleType, 'MOBIL');
    assert.equal(driven[0].completed, true);
    assert.ok(driven[0].timeTakenMs > 0);
    report.attempts.push(driven[0]);
    check('Real embedded drive, automatic save, lost response, outage retry without duplicates');
    await page.screenshot({ path: path.join(output, 'result-saved.png') });
    await page.unroute('**/api/simulation/results');

    await frame.locator('#finished-screen [data-action="change"]').click();
    await frame.locator('.vs-card[data-type="MOTOR"]').click();
    await frame.locator('#vs-start').click();
    await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'walking');
    await frame.locator('#sim-canvas').focus();
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => window.kemudiSimulation.snapshot().phase === 'driving');
    // Inject a pedestrian contact to deterministically cover the failure event handler.
    await frame.evaluate(() => { PedestrianSystem.prototype.checkCollision = () => true; });
    await frame.waitForFunction(() => document.querySelector('#failed-screen .result-save')?.dataset.attemptId);
    rows = await history();
    const failed = rows.find(r => r.vehicleType === 'MOTOR');
    assert.equal(failed?.completed, false);
    assert.equal(failed?.score, 0);
    assert.equal(failed?.collisionCount, 1);
    report.attempts.push(failed);
    check('Failed run saved with collision count (injected pedestrian contact)');

    await page.goto(web + '/dashboard', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('tbody tr').count(), 3);
    assert.match(await page.locator('tbody').innerText(), /Gagal/);
    assert.match(await page.locator('tbody').innerText(), /Selesai/);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('tbody tr').count(), 3);
    await page.screenshot({ path: path.join(output, 'dashboard-persisted.png') });
    check('Dashboard shows persisted results after reload');
    assert.deepEqual(errors, []);
    check('No browser JavaScript errors');
    report.passed = true;
  } catch (error) {
    report.error = error.message;
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
