const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require(path.resolve('tools/webgl/node_modules/playwright'));
const web='http://127.0.0.1:5891',api='http://127.0.0.1:5890';
(async()=>{const b=await chromium.launch({headless:true});const results={};try{
 const mobile=await b.newContext({viewport:{width:390,height:844},isMobile:true});const mp=await mobile.newPage();await mp.goto(web,{waitUntil:'networkidle'});
 results.mobileHome=await mp.evaluate(()=>({configuredViewport:390,innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflowElements:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,class:e.className,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(e=>e.right>391&&e.left>=0).slice(0,12)}));await mp.screenshot({path:path.join(__dirname,'mobile-home.png'),fullPage:true});
 const bogus=await b.newContext();await bogus.addCookies([{name:'kemudi_token',value:'qa-invalid-token-not-a-jwt',url:web}]);const bp=await bogus.newPage();await bp.goto(web+'/dashboard',{waitUntil:'networkidle'});results.invalidCookieDashboard={showsAuthenticatedDashboard:await bp.getByText('Total Percobaan',{exact:true}).count()>0,showsGuestInvitation:(await bp.locator('body').innerText()).includes('Silakan masuk')};await bp.screenshot({path:path.join(__dirname,'invalid-cookie-dashboard.png'),fullPage:true});
 const email=`websiteqa-adminprobe-${Date.now()}@example.test`,password=`Qa!${crypto.randomBytes(12).toString('hex')}`;
 const reg=await fetch(api+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'QA Admin Denial Probe',email,password})});assert.equal(reg.status,200);
 const c=await b.newContext();const p=await c.newPage();const consoleErrors=[];p.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().replaceAll(password,'[redacted]'));});
 await p.goto(web+'/admin/login',{waitUntil:'networkidle'});await p.locator('input[type=email]').fill(email);await p.locator('input[type=email]').press('Tab');await p.locator('input[type=password]').fill(password);await p.locator('input[type=password]').press('Tab');await p.getByRole('button',{name:'LOGIN ADMIN',exact:true}).click();
 try{await p.locator('.error-box, #blazor-error-ui:visible').first().waitFor({timeout:15000});}catch{}
 results.adminRegularLogin={url:p.url(),errorBox:await p.locator('.error-box').allTextContents(),blazorErrorVisible:await p.locator('#blazor-error-ui').isVisible(),consoleErrors};
 // Remove credential values from DOM before capturing the failure UI.
 await p.locator('input').evaluateAll(xs=>xs.forEach(x=>x.value=''));await p.screenshot({path:path.join(__dirname,'admin-regular-login-error.png'),fullPage:true});
 }finally{await b.close();fs.writeFileSync(path.join(__dirname,'focused-probes.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}})().catch(e=>{console.error(e.message);process.exitCode=1;});
