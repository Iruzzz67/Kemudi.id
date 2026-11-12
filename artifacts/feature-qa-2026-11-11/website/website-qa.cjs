const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require(path.resolve('tools/webgl/node_modules/playwright'));
const out = __dirname, web = 'http://127.0.0.1:5891', api = 'http://127.0.0.1:5890';
const report = { date: new Date().toISOString(), checks: [], pageErrors: [], unexpectedResponses: [], gaps: [] };
const password = `Qa!${crypto.randomBytes(12).toString('hex')}`, email = `websiteqa-${Date.now()}@example.test`;
function record(name, pass, detail) { report.checks.push({ name, result: pass ? 'PASS' : 'FAIL', detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${JSON.stringify(detail)}`); }
async function check(name, fn) { try { const detail = await fn(); record(name, true, detail); } catch (e) { record(name, false, e.message.replaceAll(password, '[redacted]')); } }
async function request(route, opts = {}) { const r = await fetch(api + route, { ...opts, signal: AbortSignal.timeout(20000), headers: { 'content-type': 'application/json', ...opts.headers } }); let data; try { data = await r.json(); } catch { data = null; } return { status: r.status, data }; }
async function go(page, route) { const r = await page.goto(web + route, { waitUntil: 'networkidle', timeout: 30000 }); assert.equal(r.status(), 200); return page.locator('body').innerText(); }
async function fill(page, sel, value) { await page.locator(sel).fill(value); await page.locator(sel).press('Tab'); }
(async () => {
 let browser;
 try {
 browser = await chromium.launch({ headless: true });
 const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
 const page = await context.newPage();
 page.on('pageerror', e => report.pageErrors.push(e.message));
 page.on('response', r => { if (r.status() >= 500) report.unexpectedResponses.push({ url: r.url(), status: r.status() }); });
 for (const route of ['/', '/kursus', '/materi', '/login', '/register', '/kursus/personal', '/kursus/payment']) await check(`public route ${route}`, async () => ({ status: 200, textLength: (await go(page, route)).length }));
 await check('guest dashboard protected', async () => { assert.match(await go(page, '/dashboard'), /Silakan.*masuk/); return 'Sign-in invitation; no history'; });
 const swagger = await request('/swagger/v1/swagger.json');
 fs.writeFileSync(path.join(out, 'swagger.json'), JSON.stringify(swagger.data, null, 2));
 const courses = await request('/api/courses'), mentors = await request('/api/mentors'), vehicles = await request('/api/vehicles');
 for (const [name, value] of [['courses', courses], ['mentors', mentors], ['vehicles', vehicles]]) await check(`public API ${name}`, async () => { assert.equal(value.status, 200); assert.ok(value.data.length); return { count: value.data.length }; });
 await go(page, '/kursus');
 for (const vehicle of vehicles.data || []) await check(`course/mentor filter ${vehicle.type}`, async () => {
   await page.getByRole('button', { name: vehicle.label, exact: true }).click();
   const expectedCourses = courses.data.filter(x => x.vehicleType === vehicle.type).length;
   const expectedMentors = mentors.data.filter(x => x.vehicleTypes.includes(vehicle.type)).length;
   await page.waitForFunction(n => document.querySelectorAll('.pricing-card').length === n, expectedCourses);
   assert.equal(await page.locator('.mentor-card').count(), expectedMentors);
   await page.getByRole('button', { name: 'Semua', exact: true }).click();
   await page.waitForFunction(n => document.querySelectorAll('.pricing-card').length === n, courses.data.length);
   return { expectedCourses, expectedMentors };
 });
 for (const mentor of mentors.data || []) await check(`mentor profile ${mentor.id}`, async () => { const text = await go(page, `/kursus/mentor/${mentor.id}`); assert.ok(text.includes(mentor.name)); return { name: mentor.name }; });
 await check('mentor query preselection', async () => { await go(page, `/kursus/personal?mentor=${mentors.data[0].id}`); assert.equal(await page.locator('select').nth(0).inputValue(), mentors.data[0].id); return 'Selected'; });
 await check('course summary has no source expression', async () => { await page.locator('select').nth(0).selectOption(mentors.data[0].id); await page.locator('select').nth(1).selectOption(courses.data[0].id); const text = await page.locator('.list-item').allTextContents(); assert.ok(!text.some(x => x.includes('??')), JSON.stringify(text)); return text; });
 await check('course fields have accessible labels', async () => { const labels = await page.locator('form .field label').evaluateAll(ls => ls.map(l => ({ text: l.textContent.trim(), associated: !!l.control }))); assert.ok(labels.every(x => x.associated), JSON.stringify(labels)); return labels; });
 await check('enrollment required validation', async () => { await go(page, '/kursus/personal'); await fill(page, 'input[type=email]', email); await page.getByRole('button', { name: 'Lanjutkan Pendaftaran', exact: true }).click(); await page.locator('.error-box').waitFor(); assert.match(await page.locator('.error-box').innerText(), /wajib diisi/); return 'Required fields rejected'; });
 await go(page, '/materi');
 const materia = await page.locator('a.card[href^="materi/"]').evaluateAll(ls => ls.map(l => ({ route: l.getAttribute('href'), title: l.querySelector('h3').textContent })));
 for (const m of materia) await check(`learning detail ${m.route}`, async () => { const text = await go(page, '/' + m.route); assert.ok(text.includes(m.title)); return { title: m.title }; });
 await check('unknown learning detail handled', async () => { const text = await go(page, '/materi/qa-no-such-topic'); assert.match(text, /tidak ditemukan/i); return 'Not-found message'; });
 await check('registration required validation', async () => { await go(page, '/register'); await page.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click(); await page.locator('.error-box').waitFor(); assert.match(await page.locator('.error-box').innerText(), /wajib diisi/); return 'Required fields rejected'; });
 await check('register -> authenticated dashboard', async () => { await fill(page, '#register-name', 'Website QA Test'); await fill(page, '#register-email', email); await fill(page, '#register-password', password); await page.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click(); await page.waitForURL('**/dashboard'); await page.getByText('Total Percobaan', { exact: true }).waitFor(); return 'Fresh account dashboard visible'; });
 await check('logout clears session', async () => { await go(page, '/logout'); await page.waitForURL(web + '/'); assert.match(await go(page, '/dashboard'), /Silakan.*masuk/); return 'Guest dashboard restored'; });
 await check('empty login validation', async () => { await go(page, '/login'); await page.getByRole('button', { name: 'Masuk', exact: true }).click(); await page.locator('.error-box').waitFor(); const message = await page.locator('.error-box').innerText(); assert.match(message, /wajib|isi.*email/i, message); return message; });
 await check('incorrect password rejected', async () => { await go(page, '/login'); await fill(page, '#login-email', email); await fill(page, '#login-password', 'WrongQaPassword!'); await page.getByRole('button', { name: 'Masuk', exact: true }).click(); await page.locator('.error-box').waitFor(); assert.match(await page.locator('.error-box').innerText(), /salah/); return 'Rejected with credential error'; });
 await check('valid login persists reload', async () => { await fill(page, '#login-password', password); await page.getByRole('button', { name: 'Masuk', exact: true }).click(); await page.waitForURL('**/dashboard'); await page.reload({ waitUntil: 'networkidle' }); await page.getByText('Total Percobaan', { exact: true }).waitFor(); return 'Dashboard survives reload'; });
 const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
 const token = login.data?.token;
 if (token) {
 await check('authenticated profile API', async () => { const r = await request('/api/auth/me', { headers: { authorization: `Bearer ${token}` } }); assert.equal(r.status, 200); assert.equal(r.data.email, email); return 'Own profile returned'; });
 await check('regular account denied admin login API', async () => { const r = await request('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); assert.equal(r.status, 403); return { status: r.status }; });
 const adminPaths = Object.keys(swagger.data?.paths || {}).filter(p => p.startsWith('/api/admin/') && swagger.data.paths[p].get && !p.includes('{'));
 for (const route of adminPaths) await check(`admin API authorization ${route}`, async () => { const guest = await request(route), user = await request(route, { headers: { authorization: `Bearer ${token}` } }); assert.equal(guest.status, 401); assert.equal(user.status, 403); return { guest: guest.status, regularUser: user.status }; });
 }
 for (const route of ['/admin/dashboard','/admin/pendaftaran','/admin/pengguna','/admin/mentor','/admin/jadwal','/admin/pembayaran','/admin/kursus','/admin/statistik','/admin/pengaturan']) await check(`regular user admin UI ${route}`, async () => { await page.goto(web + route, {waitUntil:'networkidle'}); await page.waitForURL('**/admin/login'); return 'Redirected to admin login'; });
 await check('admin form rejects regular user without circuit failure', async () => { await go(page, '/admin/login'); await fill(page, 'input[type=email]', email); await fill(page, 'input[type=password]', password); await page.getByRole('button', {name:'LOGIN ADMIN',exact:true}).click(); await page.locator('.error-box').waitFor({timeout:10000}); const text = await page.locator('.error-box').innerText(); assert.match(text,/akses|admin|tidak memiliki/i); return text; });
 // This is a local-only test registration; no provider or external transfer is called.
 for (const method of ['transfer', 'e-wallet', 'cash']) await check(`enrollment/payment UI ${method}`, async () => {
   await go(page, '/kursus/personal'); const inputs = page.locator('form input');
   await fill(page, 'form input[type=text] >> nth=0', 'Website QA Test');
   await fill(page, 'form input[type=email]', email);
   await fill(page, 'form input[type=text] >> nth=1', '0000000000000000');
   await fill(page, 'form textarea', 'Local automated QA only');
   await page.locator('select').nth(0).selectOption(mentors.data[0].id);
   await page.locator('select').nth(1).selectOption(courses.data[0].id);
   await page.locator(`input[type=radio][value="${method}"]`).check();
   await page.getByRole('button', { name: 'Lanjutkan Pendaftaran', exact:true }).click();
   await page.waitForURL('**/kursus/payment?**', {timeout:20000});
   await page.getByText('Instruksi Pembayaran', {exact:true}).waitFor();
   const registrationId = new URL(page.url()).searchParams.get('registration');
   await page.screenshot({path:path.join(out,`payment-${method}.png`),fullPage:true});
   // Current API marks these local-only confirmations paid immediately; record separately.
   await page.getByRole('button', {name:/Saya sudah bayar/}).click();
   await page.waitForURL('**/dashboard');
   const saved = await request(`/api/course-registration/${registrationId}`);
   assert.equal(saved.status,200); assert.equal(saved.data.status,'paid');
   return { method, status:saved.data.status };
 });
 await check('payment requires auth/proof and rejects duplicate confirmation', async () => {
   const body = { mentorId:mentors.data[0].id, coursePackageId:courses.data[0].id, name:'Website QA API',email,phone:'',nik:'0000000000000000',address:'Local QA',paymentMethod:'cash' };
   const reg=await request('/api/course-registration',{method:'POST',body:JSON.stringify(body)}); assert.equal(reg.status,200);
   const payload={registrationId:reg.data.id,method:'cash',reference:'local-qa-no-real-payment'};
   const first=await request('/api/payment',{method:'POST',body:JSON.stringify(payload)}), second=await request('/api/payment',{method:'POST',body:JSON.stringify(payload)});
   const detail={anonymousFirst:first.status,anonymousSecond:second.status,firstStatus:first.data?.status,distinctPaymentRecords:first.data?.id !== second.data?.id};
   assert.ok([401,403].includes(first.status),JSON.stringify(detail)); return detail;
 });
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true}); const mp=await mobile.newPage();
 for (const route of ['/','/kursus','/materi','/register','/kursus/personal']) await check(`mobile no horizontal overflow ${route}`,async()=>{await go(mp,route);const dimensions=await mp.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));assert.ok(dimensions.scroll<=dimensions.width,JSON.stringify(dimensions));return dimensions;});
 await go(mp,'/kursus');await mp.screenshot({path:path.join(out,'mobile-courses.png'),fullPage:true});await mobile.close();
 report.gaps.push('No authorized Admin credentials: admin CRUD/statistics/settings success paths NOT RUN; no privilege promotion.','No profile edit route exists; own profile read API tested.','Payment methods tested against local SQLite only; no real bank/e-wallet/provider transaction.','Interactive visual/audio/hardware/performance and simulator are outside this website lane.');
 await check('no uncaught website page errors',async()=>{assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));return 'No pageerror events';});
 } catch(e) { report.fatal = e.message.replaceAll(password,'[redacted]'); console.error(report.fatal); }
 finally { if(browser)await browser.close(); report.summary={pass:report.checks.filter(c=>c.result==='PASS').length,fail:report.checks.filter(c=>c.result==='FAIL').length};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));process.exitCode=report.fatal?2:report.summary.fail?1:0; }
})();
