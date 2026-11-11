const {chromium}=require('../../tools/webgl/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
(async()=>{
 const env=JSON.parse(fs.readFileSync(path.join(__dirname,'test-environment.json')));
 const db=path.resolve(env.db);assert.equal(path.dirname(db).toLowerCase(),__dirname.toLowerCase());assert.match(path.basename(db),/^test-[a-f0-9]{32}\.db$/);
 const body={name:'Diagnostic fixture',email:`payment-diagnostic-${crypto.randomUUID()}@example.test`,password:crypto.randomUUID()+'aA!9'};
 const req=async(route,method='GET',data,token)=>{const r=await fetch(env.api+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});assert.equal(r.status,200,route);return r.json();};
 const account=await req('/api/auth/register','POST',body);
 execFileSync('python',['-c',`import sqlite3,sys,uuid
c=sqlite3.connect(sys.argv[1]);u=c.execute('SELECT Email FROM AspNetUsers WHERE Id=?',(sys.argv[2],)).fetchone();assert u and u[0]==sys.argv[3] and u[0].endswith('@example.test')
r=c.execute("SELECT Id FROM AspNetRoles WHERE NormalizedName='ADMIN'").fetchone();assert r
c.execute('INSERT INTO AspNetUserRoles (UserId,RoleId) VALUES (?,?)',(sys.argv[2],r[0]));c.commit()`,db,account.userId,body.email]);
 const courses=await req('/api/courses'),mentors=await req('/api/mentors'),name='Diagnostic Cash '+crypto.randomUUID().slice(0,6);
 const reg=await req('/api/course-registration','POST',{mentorId:mentors[0].id,coursePackageId:courses[0].id,name,email:body.email,nik:'0000000000000000',address:'Fixture only',phone:'',paymentMethod:'cash'},account.token);
 await req('/api/payment','POST',{registrationId:reg.id,method:'cash'},account.token);
 const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1400,height:1000}}),page=await context.newPage();
 const report={events:[],snapshots:[]};page.on('pageerror',e=>report.events.push(e.message));page.on('console',m=>{if(m.type()==='error')report.events.push(m.text());});
 try{
 const csrf=(await(await context.request.get(env.web+'/api/session')).json()).requestToken;
 assert.equal((await context.request.post(env.web+'/api/session/admin-login',{headers:{'X-CSRF-TOKEN':csrf},data:{email:body.email,password:body.password}})).status(),200);
 await page.goto(env.web+'/admin/pembayaran',{waitUntil:'networkidle'});
 await page.evaluate(()=>{window.__clickTrace=[];for(const type of ['pointerdown','pointerup','click','change'])document.addEventListener(type,e=>{const b=e.target.closest?.('button'),confirm=[...document.querySelectorAll('button')].find(b=>b.textContent==='Konfirmasi penerimaan dana');window.__clickTrace.push({type,target:e.target.tagName,text:e.target.textContent?.slice(0,80),button:b?.textContent,disabled:b?.disabled,checked:e.target.checked,x:e.clientX,y:e.clientY,confirm:confirm?.getBoundingClientRect().toJSON(),scroll:[scrollX,scrollY],time:performance.now()});},true);});
 const row=page.locator('tbody tr').filter({hasText:name});await row.getByRole('button',{name:'Verifikasi',exact:true}).click();
 const input=row.getByLabel('Referensi penerimaan dana / kuitansi',{exact:true});await input.fill('diagnostic-cash-receipt');await input.press('Tab');
 await row.getByRole('checkbox').check();const confirm=row.getByRole('button',{name:'Konfirmasi penerimaan dana',exact:true});
 await confirm.waitFor();
 const snapshot=async(stage)=>report.snapshots.push({stage,buttonCount:await confirm.count(),disabled:await confirm.isDisabled().catch(()=>null),error:await page.locator('.error-box').allTextContents(),row:await row.innerText(),payment:((({status,paidAt})=>({status,paidAt}))(await req('/api/payment/'+reg.id,'GET',null,account.token))),blazorError:await page.locator('#blazor-error-ui').isVisible()});
 await snapshot('before-click');await confirm.click();await page.waitForTimeout(1500);await snapshot('after-first-click');
 if(await confirm.count()){await confirm.click();await page.waitForTimeout(1500);await snapshot('after-second-click');}
 report.clickTrace=await page.evaluate(()=>window.__clickTrace);await page.screenshot({path:path.join(__dirname,'admin-diagnostic.png')});
 }finally{fs.writeFileSync(path.join(__dirname,'admin-ui-diagnostic.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
