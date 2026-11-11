// Local isolated payment regression only. Never point this at a real account database.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/payment-security');
const api = process.env.API_URL || 'http://127.0.0.1:5902';
const web = process.env.WEB_URL || 'http://127.0.0.1:5903';
const configuredWeb = process.env.PAYMENT_CONFIGURED_WEB_URL;
const db = path.resolve(process.env.PAYMENT_QA_DB || '');
const secrets = [];
const report = { started: new Date().toISOString(), passed: false, checks: [], notRun: [], scope: 'Loopback HTTP/browser and own fixtures in an explicitly fresh QA SQLite database; no provider/real payments' };
function localUrl(value) {
  const url = new URL(value);
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only loopback HTTP(S) test servers are allowed');
  assert.ok(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash, 'A bare local origin is required');
}
function databaseGuard() {
  assert.ok(process.env.PAYMENT_QA_DB, 'PAYMENT_QA_DB is required');
  assert.equal(path.dirname(db).toLowerCase(), output.toLowerCase(), 'QA database must be directly under artifacts/payment-security');
  assert.match(path.basename(db), /^test-[a-f0-9]{32}\.db$/i, 'QA database must use the fresh test-{32hex}.db naming contract');
  assert.ok(fs.existsSync(db) && !fs.lstatSync(db).isSymbolicLink(), 'QA database must already exist and not be a symlink');
  assert.equal(fs.realpathSync(db).toLowerCase(), db.toLowerCase(), 'QA database path must not redirect outside its explicit location');
}
function redact(value) {
  let text = String(value);
  for (const secret of secrets) if (secret) text = text.replaceAll(secret, '[redacted]');
  return text.replace(/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]');
}
async function check(name, action) {
  try { await action(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, result: 'FAIL', error: redact(error.message) }); throw error; }
}
function fixture(action, args = {}) {
  databaseGuard();
  // SQL parameters and exact own-user checks confine every fixture mutation to this fresh QA DB.
  const script = String.raw`
import sys,json,sqlite3,uuid,datetime,pathlib
db,action,args=sys.argv[1],sys.argv[2],json.loads(sys.argv[3])
c=sqlite3.connect(pathlib.Path(db).as_uri()+'?mode=rw',uri=True,timeout=30)
c.row_factory=sqlite3.Row
def user():
 r=c.execute('SELECT Id,Email FROM AspNetUsers WHERE Id=?',(args['userId'],)).fetchone()
 assert r and r['Email']==args['email'] and args['email'].endswith('@example.test'),'Own fixture identity mismatch'
 return r
def registration():
 user()
 r=c.execute('SELECT * FROM CourseRegistrations WHERE lower(Id)=?',(args['registrationId'].lower(),)).fetchone()
 assert r and r['UserId']==args['userId'],'Own fixture registration mismatch'
 return r
result={}
if action=='fresh':
 assert c.execute('SELECT count(*) FROM AspNetUsers').fetchone()[0]==0,'QA database must have no users before this test starts'
 result={'fresh':True}
elif action=='grant-admin':
 user()
 role=c.execute("SELECT Id FROM AspNetRoles WHERE NormalizedName='ADMIN'").fetchone()
 roleId=role[0] if role else str(uuid.uuid4())
 if not role:c.execute('INSERT INTO AspNetRoles (Id,Name,NormalizedName,ConcurrencyStamp) VALUES (?,?,?,?)',(roleId,'Admin','ADMIN',str(uuid.uuid4())))
 c.execute('INSERT OR IGNORE INTO AspNetUserRoles (UserId,RoleId) VALUES (?,?)',(args['userId'],roleId))
 c.commit();result={'granted':True}
elif action=='registration':
 r=registration();result={'userId':r['UserId'],'status':r['Status']}
elif action=='payment':
 registration()
 rows=c.execute('SELECT Status,PaidAt FROM Payments WHERE lower(RegistrationId)=?',(args['registrationId'].lower(),)).fetchall()
 result={'count':len(rows),'statuses':[r['Status'] for r in rows],'paidAt':[r['PaidAt'] for r in rows]}
elif action=='audit':
 registration()
 result={'count':c.execute("SELECT count(*) FROM AuditLogs WHERE Action='payment.confirm' AND lower(TargetId)=?",(args['paymentId'].lower(),)).fetchone()[0]}
elif action=='duplicate':
 r=registration()
 amount=c.execute('SELECT Price FROM CoursePackages WHERE Id=?',(r['CoursePackageId'],)).fetchone()[0]
 c.execute('INSERT INTO Payments (Id,RegistrationId,Method,Status,Amount,Reference,PaidAt,CreatedAt) VALUES (?,?,?,?,?,?,?,?)',(str(uuid.uuid4()).upper(),r['Id'],r['PaymentMethod'],'Pending',amount,'legacy-fixture-duplicate',None,datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f')))
 c.commit();result={'inserted':True}
elif action=='disable':
 user();c.execute('UPDATE AspNetUsers SET IsActive=0 WHERE Id=?',(args['userId'],));c.commit();result={'disabled':True}
elif action=='revoke-admin':
 user();c.execute("DELETE FROM AspNetUserRoles WHERE UserId=? AND RoleId IN (SELECT Id FROM AspNetRoles WHERE NormalizedName='ADMIN')",(args['userId'],));c.commit();result={'revoked':True}
else:raise AssertionError('Unsupported fixture action')
print(json.dumps(result));c.close()
`;
  try { return JSON.parse(execFileSync('python', ['-c', script, db, action, JSON.stringify(args)], { encoding: 'utf8', windowsHide: true })); }
  catch (error) { throw new Error('Guarded SQLite fixture action failed: ' + action + ': ' + redact(String(error.stderr || error.message).trim().split('\n').at(-1))); }
}
async function request(route, { method = 'GET', token, body } = {}) {
  const response = await fetch(api + route, { method, signal: AbortSignal.timeout(30000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  let data = null;
  try { data = await response.json(); } catch { /* Empty rejection responses are valid. */ }
  return { status: response.status, data };
}
function expectStatus(response, expected) { assert.equal(response.status, expected, 'Unexpected HTTP status'); return response.data; }
async function fill(locator, value) { await locator.fill(value); await locator.press('Tab'); }
async function login(page, origin, account, admin = false, expected = 200) {
  await page.goto(origin + (admin ? '/admin/login' : '/login'), { waitUntil: 'networkidle' });
  const button = page.getByRole('button', { name: admin ? 'LOGIN ADMIN' : 'Masuk', exact: true });
  await button.click();
  await page.locator('.error-box').waitFor(); // An observable response proves Blazor is interactive.
  await fill(page.locator(admin ? '#admin-login-email' : '#login-email'), account.email);
  await fill(page.locator(admin ? '#admin-login-password' : '#login-password'), account.password);
  const response = page.waitForResponse(r => r.url() === origin + '/api/session/' + (admin ? 'admin-login' : 'login') && r.request().method() === 'POST');
  await button.click();
  assert.equal((await response).status(), expected, 'Login gateway status');
  if (expected === 200) await page.waitForURL(admin ? '**/admin/dashboard' : '**/dashboard');
  else await page.getByText('Akun ini tidak memiliki akses admin.', { exact: true }).waitFor();
}
(async () => {
  let browser;
  try {
    await check('explicit local origins and empty fresh QA database guards', async () => {
      localUrl(api); localUrl(web); if (configuredWeb) localUrl(configuredWeb);
      databaseGuard(); fixture('fresh');
    });
    const accounts = {};
    await check('register own owner, outsider and admin-fixture accounts through real API', async () => {
      for (const name of ['owner', 'outsider', 'admin']) {
        const account = { name: 'Payment QA ' + name, email: `paymentqa-${name}-${crypto.randomUUID()}@example.test`, password: crypto.randomUUID() + 'aA!9' };
        secrets.push(account.password);
        const auth = expectStatus(await request('/api/auth/register', { method: 'POST', body: account }), 200);
        assert.ok(auth.userId && auth.token, 'Real account identity and JWT required');
        secrets.push(auth.token); accounts[name] = { ...account, id: auth.userId, token: auth.token };
      }
    });
    const owner = accounts.owner, outsider = accounts.outsider, admin = accounts.admin;
    const courses = expectStatus(await request('/api/courses'), 200);
    const mentors = expectStatus(await request('/api/mentors'), 200);
    const course = courses.find(c => c.price > 0), mentor = mentors[0];
    assert.ok(course && mentor, 'Seeded positive-price package and mentor required');
    const body = (method = 'transfer', name = 'Payment QA HTTP') => ({ mentorId: mentor.id, coursePackageId: course.id,
      name, email: owner.email, phone: '', nik: '0000000000000000', address: 'Isolated local QA fixture', paymentMethod: method });
    const create = async (method, name) => expectStatus(await request('/api/course-registration', { method: 'POST', token: owner.token, body: body(method, name) }), 200);
    const payment = (registration, reference = 'qa-transfer-001') => ({ registrationId: registration.id, method: registration.paymentMethod, reference });
    const ownFixture = registration => ({ userId: owner.id, email: owner.email, registrationId: registration.id });
    const randomId = crypto.randomUUID();
    await check('anonymous registration/payment/read and invalid JWT are rejected', async () => {
      for (const [route, method, payload] of [['/api/course-registration', 'POST', body()], ['/api/payment', 'POST', { registrationId: randomId, method: 'cash' }], ['/api/course-registration/' + randomId, 'GET'], ['/api/payment/' + randomId, 'GET']])
        expectStatus(await request(route, { method, body: payload }), 401);
      expectStatus(await request('/api/course-registration', { method: 'POST', token: 'invalid-jwt', body: body() }), 401);
    });
    let registration;
    await check('registration ownership comes from JWT, not a submitted userId', async () => {
      registration = expectStatus(await request('/api/course-registration', { method: 'POST', token: owner.token, body: { ...body(), userId: outsider.id } }), 200);
      assert.equal(fixture('registration', ownFixture(registration)).userId, owner.id);
    });
    await check('cross-user registration/payment reads and writes return404', async () => {
      for (const route of ['/api/course-registration/' + registration.id, '/api/payment/' + registration.id]) expectStatus(await request(route, { token: outsider.token }), 404);
      expectStatus(await request('/api/payment', { method: 'POST', token: outsider.token, body: payment(registration) }), 404);
    });
    await check('invalid methods/references fail and registered method cannot be overridden', async () => {
      expectStatus(await request('/api/course-registration', { method: 'POST', token: owner.token, body: body('invalid') }), 400);
      for (const invalid of [{ method: 'invalid' }, { method: null }, { reference: null }, { reference: '' }, { reference: 'ab' }, { reference: 'x'.repeat(129) }])
        expectStatus(await request('/api/payment', { method: 'POST', token: owner.token, body: { ...payment(registration), ...invalid } }), 400);
      expectStatus(await request('/api/payment', { method: 'POST', token: owner.token, body: { ...payment(registration), method: 'cash' } }), 409);
    });
    let paymentId;
    await check('ten concurrent customer requests create one pending payment at the trusted amount', async () => {
      const results = await Promise.all(Array.from({ length: 10 }, () => request('/api/payment', { method: 'POST', token: owner.token,
        body: { ...payment(registration), amount: 1, status: 'paid', paidAt: new Date().toISOString() } })));
      const values = results.map(r => expectStatus(r, 200));
      paymentId = values[0].id;
      assert.ok(values.every(v => v.id === paymentId && v.status === 'pending' && v.paidAt === null && v.amount === course.price), 'Every concurrent reply remains pending with one ID and server price');
      const rows = fixture('payment', ownFixture(registration));
      assert.equal(rows.count, 1); assert.deepEqual(rows.statuses, ['Pending']); assert.deepEqual(rows.paidAt, [null]);
      assert.equal(fixture('registration', ownFixture(registration)).status, 'Pending');
    });
    await check('altered retry is rejected without overwriting an existing submission', async () => {
      expectStatus(await request('/api/payment', { method: 'POST', token: owner.token, body: payment(registration, 'different-reference') }), 409);
    });
    await check('an existing payment remains hidden from another authenticated account', async () => {
      expectStatus(await request('/api/payment/' + registration.id, { token: outsider.token }), 404);
    });
    await check('ordinary users cannot call admin verification endpoints', async () => {
      expectStatus(await request('/api/admin/payments', { token: owner.token }), 403);
      expectStatus(await request('/api/admin/payments/' + paymentId, { method: 'PATCH', token: owner.token, body: { status: 'paid', verificationReference: 'qa-receipt' } }), 403);
      expectStatus(await request('/api/admin/auth/login', { method: 'POST', body: { email: owner.email, password: owner.password } }), 403);
    });
    await check('own isolated fixture gains Admin role and receives a genuine role JWT', async () => {
      assert.ok(fixture('grant-admin', { userId: admin.id, email: admin.email }).granted);
      const auth = expectStatus(await request('/api/admin/auth/login', { method: 'POST', body: { email: admin.email, password: admin.password } }), 200);
      assert.ok(auth.roles.includes('Admin'), 'Dedicated login must issue verified Admin role');
      admin.token = auth.token; secrets.push(admin.token);
    });
    await check('admin settlement without reconciliation reference is rejected', async () => {
      expectStatus(await request('/api/admin/payments/' + paymentId, { method: 'PATCH', token: admin.token, body: { status: 'paid' } }), 400);
      assert.deepEqual(fixture('payment', ownFixture(registration)).statuses, ['Pending']);
    });
    await check('concurrent identical admin confirmations settle once with one audit and stable PaidAt', async () => {
      const update = () => request('/api/admin/payments/' + paymentId, { method: 'PATCH', token: admin.token, body: { status: 'paid', verificationReference: 'qa-bank-receipt' } });
      (await Promise.all(Array.from({ length: 5 }, update))).forEach(r => expectStatus(r, 200));
      const first = expectStatus(await request('/api/payment/' + registration.id, { token: owner.token }), 200);
      assert.equal(first.status, 'paid'); assert.ok(first.paidAt);
      expectStatus(await update(), 200);
      assert.equal(expectStatus(await request('/api/payment/' + registration.id, { token: owner.token }), 200).paidAt, first.paidAt);
      assert.equal(fixture('audit', { ...ownFixture(registration), paymentId }).count, 1);
      assert.equal(fixture('registration', ownFixture(registration)).status, 'Paid');
    });
    await check('paid is terminal and registration endpoint cannot bypass settlement', async () => {
      for (const status of ['pending', 'cancelled']) expectStatus(await request('/api/admin/payments/' + paymentId, { method: 'PATCH', token: admin.token, body: { status } }), 409);
      const unpaid = await create('cash', 'Payment QA bypass');
      expectStatus(await request('/api/admin/registrations/' + unpaid.id, { method: 'PATCH', token: admin.token, body: { status: 'paid' } }), 409);
      assert.equal(fixture('payment', ownFixture(unpaid)).count, 0);
    });
    await check('legacy duplicate history blocks read, resubmission and automatic reconciliation', async () => {
      const legacy = await create('transfer', 'Payment QA legacy');
      const submitted = expectStatus(await request('/api/payment', { method: 'POST', token: owner.token, body: payment(legacy) }), 200);
      fixture('duplicate', ownFixture(legacy));
      expectStatus(await request('/api/payment/' + legacy.id, { token: owner.token }), 409);
      expectStatus(await request('/api/payment', { method: 'POST', token: owner.token, body: payment(legacy) }), 409);
      expectStatus(await request('/api/admin/payments/' + submitted.id, { method: 'PATCH', token: admin.token, body: { status: 'paid', verificationReference: 'qa-legacy-receipt' } }), 409);
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(redact(error.message)));
    await check('guest course enrollment requires login', async () => {
      await page.goto(web + '/kursus/personal', { waitUntil: 'networkidle' });
      await page.getByText(/sebelum mendaftar kursus agar/).waitFor();
      assert.equal(await page.locator('form').count(), 0);
    });
    await check('admin-login gateway rejects missing and invalid CSRF tokens', async () => {
      const data = { email: admin.email, password: admin.password };
      assert.equal((await context.request.post(web + '/api/session/admin-login', { data })).status(), 400);
      assert.equal((await context.request.post(web + '/api/session/admin-login', { data, headers: { 'X-CSRF-TOKEN': 'invalid-token' } })).status(), 400);
    });
    await check('regular-user admin login rejects cleanly without a Blazor circuit failure', async () => {
      await login(page, web, owner, true, 403);
      assert.equal(await page.locator('#blazor-error-ui').isVisible(), false);
      assert.equal(pageErrors.length, 0);
    });
    await check('customer login produces an HttpOnly session', async () => {
      await login(page, web, owner);
      const cookie = (await context.cookies()).find(c => c.name === 'kemudi_token');
      assert.ok(cookie && cookie.httpOnly); secrets.push(cookie.value);
      assert.ok(!(await page.evaluate(() => document.cookie)).includes('kemudi_token'));
    });
    const cashName = 'Payment QA Cash UI';
    const cash = await create('cash', cashName);
    await check('cash UI ignores method query override and submits pending rather than Paid', async () => {
      await page.goto(web + '/kursus/payment?registration=' + cash.id + '&method=transfer', { waitUntil: 'networkidle' });
      assert.match(await page.locator('body').innerText(), /Bayar di Tempat/);
      assert.equal(await page.locator('#payment-reference').count(), 0);
      await page.getByRole('button', { name: 'Ajukan verifikasi pembayaran', exact: true }).click();
      await page.getByText(/Pengajuan diterima\. Menunggu verifikasi/).waitFor();
      const state = expectStatus(await request('/api/payment/' + cash.id, { token: owner.token }), 200);
      assert.equal(state.method, 'cash'); assert.equal(state.status, 'pending'); assert.equal(state.paidAt, null);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByText(/Pengajuan diterima\. Menunggu verifikasi/).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Ajukan verifikasi pembayaran', exact: true }).count(), 0);
    });
    await check('unconfigured digital methods show no fake bank/QR data and cannot submit', async () => {
      for (const method of ['transfer', 'e-wallet']) {
        const unconfigured = await create(method, 'Payment QA unavailable');
        await page.goto(web + '/kursus/payment?registration=' + unconfigured.id, { waitUntil: 'networkidle' });
        await page.getByText(/Metode pembayaran ini belum dikonfigurasi/).waitFor();
        assert.ok(await page.getByRole('button', { name: 'Ajukan verifikasi pembayaran', exact: true }).isDisabled());
        assert.doesNotMatch(await page.locator('body').innerText(), /1234-5678-901|9876-5432-100|0812-3456-7890/);
        assert.equal(await page.locator('.qris').count(), 0);
      }
    });
    const adminContext = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    const adminPage = await adminContext.newPage();
    adminPage.on('pageerror', error => pageErrors.push(redact(error.message)));
    await check('genuine admin UI login creates HttpOnly cookie and opens verification panel', async () => {
      await login(adminPage, web, admin, true);
      const cookie = (await adminContext.cookies()).find(c => c.name === 'kemudi_token');
      assert.ok(cookie && cookie.httpOnly); secrets.push(cookie.value);
      assert.ok(!(await adminPage.evaluate(() => document.cookie)).includes('kemudi_token'));
      await adminPage.goto(web + '/admin/pembayaran', { waitUntil: 'networkidle' });
      await adminPage.getByRole('heading', { name: 'Verifikasi Pembayaran', exact: true }).waitFor();
    });
    await check('admin UI requires reference plus reconciliation checkbox before cash settlement', async () => {
      const row = adminPage.locator('tbody tr').filter({ hasText: cashName });
      await row.getByRole('button', { name: 'Verifikasi', exact: true }).click();
      const confirm = row.getByRole('button', { name: 'Konfirmasi penerimaan dana', exact: true });
      assert.ok(await confirm.isDisabled());
      await fill(row.getByLabel('Referensi penerimaan dana / kuitansi', { exact: true }), 'qa-cash-receipt');
      assert.ok(await confirm.isDisabled(), 'Reference alone must not imply reconciliation');
      await row.getByRole('checkbox').check();
      await confirm.click();
      await row.getByText('Dikonfirmasi', { exact: true }).waitFor();
      const state = expectStatus(await request('/api/payment/' + cash.id, { token: owner.token }), 200);
      assert.equal(state.status, 'paid'); assert.ok(state.paidAt);
      assert.equal(fixture('audit', { ...ownFixture(cash), paymentId: state.id }).count, 1);
      await adminPage.reload({ waitUntil: 'networkidle' });
      await adminPage.locator('tbody tr').filter({ hasText: cashName }).getByText('Dikonfirmasi', { exact: true }).waitFor();
    });
    if (configuredWeb) await check('configured official instructions remain plain text and digital submission stays pending', async () => {
      const configuredContext = await browser.newContext();
      const configuredPage = await configuredContext.newPage();
      await login(configuredPage, configuredWeb, owner);
      const digital = await create('transfer', 'Payment QA Configured');
      await configuredPage.goto(configuredWeb + '/kursus/payment?registration=' + digital.id, { waitUntil: 'networkidle' });
      const instructions = configuredPage.locator('.payment-box');
      assert.ok((await instructions.innerText()).trim());
      assert.equal(await instructions.locator('b,script,img,a').count(), 0, 'Configured instruction markup must not be interpreted as HTML');
      await fill(configuredPage.getByLabel('Referensi transfer / transaksi', { exact: true }), 'qa-configured-transfer');
      await configuredPage.getByRole('button', { name: 'Ajukan verifikasi pembayaran', exact: true }).click();
      await configuredPage.getByText(/Pengajuan diterima\. Menunggu verifikasi/).waitFor();
      assert.equal(expectStatus(await request('/api/payment/' + digital.id, { token: owner.token }), 200).status, 'pending');
      await configuredContext.close();
    });
    else report.notRun.push('Configured digital-instruction browser flow: PAYMENT_CONFIGURED_WEB_URL not provided');
    await check('disabled customer JWT and revoked Admin JWT stop authorizing immediately', async () => {
      fixture('disable', { userId: owner.id, email: owner.email });
      expectStatus(await request('/api/course-registration/' + registration.id, { token: owner.token }), 401);
      fixture('revoke-admin', { userId: admin.id, email: admin.email });
      expectStatus(await request('/api/admin/payments', { token: admin.token }), 401);
    });
    await check('browser flows produce no unhandled JavaScript/circuit errors', async () => {
      assert.equal(pageErrors.length, 0, 'No unhandled browser errors');
      assert.equal(await adminPage.locator('#blazor-error-ui').isVisible(), false);
    });
    report.passed = true;
  } catch (error) {
    report.error = redact(error.message);
    report.notRun.push('Checks after the failed prerequisite were not executed; this is not a complete passing suite');
    console.error('FAIL ' + report.error); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    report.finished = new Date().toISOString();
    report.summary = { pass: report.checks.filter(c => c.result === 'PASS').length, fail: report.checks.filter(c => c.result === 'FAIL').length };
    report.notRun.push('Real payment provider/bank settlement, uploads/refunds and production deployment were not tested');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'http-browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, ...report.summary }));
  }
})();
