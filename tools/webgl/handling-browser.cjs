// Actual-runtime settings integration. Only the browser Gamepad API is synthetic.
// Vehicle state, transforms and simulation clock are never mutated by this test.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../../artifacts/gamepad');
const selected=(process.env.HANDLING_CASE||'MOBIL/automatic').split('/');
const [type,transmission]=selected;
assert.ok(selected.length===2&&['MOTOR','MOBIL','TRUK'].includes(type)&&['automatic','manual'].includes(transmission),'Invalid HANDLING_CASE');
fs.mkdirSync(output,{recursive:true});
const report={started:new Date().toISOString(),passed:false,case:`${type}/${transmission}`,checks:[],errors:[],hardware:'NOT RUN: synthetic input does not establish physical steering resistance or controller acceptance'};
const save=()=>fs.writeFileSync(path.join(output,'handling-browser-report.json'),JSON.stringify(report,null,2));
function installPad(){
  const h=window.__handlingPad={reads:0,axes:[0,0,0,0],buttons:Array(16).fill(0)};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
    h.reads++;
    return [{index:0,id:'Synthetic handling pad',connected:true,mapping:'standard',axes:[...h.axes],
      buttons:h.buttons.map(value=>({value,pressed:value>=.55,touched:value>0})),timestamp:performance.now()}];
  }});
}
const state=page=>page.evaluate(()=>window.kemudiSimulation.snapshot());
const settings=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kemudi.gamepad.v1')));
async function set(page,{buttons={},axes}={}){
  const reads=await page.evaluate(({buttons,axes})=>{
    const h=window.__handlingPad;
    for(const [index,value]of Object.entries(buttons))h.buttons[index]=value;
    if(axes)h.axes=axes;
    return h.reads;
  },{buttons,axes});
  await page.waitForFunction(before=>window.__handlingPad.reads>=before+2,reads,{timeout:90000});
}
async function tap(page,index){await set(page,{buttons:{[index]:1}});await set(page,{buttons:{[index]:0}});}
async function ticks(page,count=5){
  const before=(await state(page)).clock.tick;
  await page.waitForFunction(target=>window.kemudiSimulation.snapshot().clock.tick>=target,before+count,{timeout:120000});
}
async function expectHandling(page,weight,returnSpeed){
  await page.waitForFunction(({weight,returnSpeed})=>{
    const h=window.kemudiSimulation.snapshot().handling;
    return h?.steeringWeight===weight&&Math.abs(h.steeringReturn-returnSpeed)<1e-8;
  },{weight,returnSpeed});
}
async function fillSetting(page,name,value){
  const field=page.locator(`[data-setting="${name}"]`);
  await field.fill(String(value));await field.press('Tab');
}
function check(name,fn=()=>{}){fn();report.checks.push(name);console.log('PASS',type,transmission,name);save();}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:800,height:600}});
  await context.addInitScript(installPad);
  const page=await context.newPage();page.setDefaultTimeout(120000);
  page.on('pageerror',error=>report.errors.push(error.message));save();
  try{
    const url=new URL(process.env.SIM_URL||'http://127.0.0.1:8080/');
    url.searchParams.set('vehicle',type);url.searchParams.set('transmission',transmission);url.searchParams.set('autostart','1');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.kemudiSimulation?.snapshot().phase==='walking');
    await page.locator('#sim-canvas').focus();await tap(page,0);await tap(page,0);
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    await set(page,{});await tap(page,4);await tap(page,4);await ticks(page);
    await expectHandling(page,50,1);
    const initial=await state(page);
    check('new player starts with default handling while engine and handbrake remain unchanged',()=>{
      assert.equal(initial.vehicle,type);assert.equal(initial.engine,false);assert.equal(initial.handbrake,true);
      assert.equal(Math.abs(initial.speed),0);
    });
    await page.locator('#gamepad-open').click();
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.menuOpen);
    assert.equal((await state(page)).phase,'paused');
    await page.getByRole('button',{name:'Ringan',exact:true}).click();await expectHandling(page,0,1);
    check('light preset updates actual player handling without leaving the paused menu');
    await fillSetting(page,'steeringReturn',1.7);await expectHandling(page,0,1.7);
    await page.getByRole('button',{name:'Berat',exact:true}).click();await expectHandling(page,100,1.7);
    check('heavy preset preserves the separately configured centering response',()=>{});
    await page.getByRole('button',{name:'Normal',exact:true}).click();await expectHandling(page,50,1.7);
    check('normal preset restores baseline weight without discarding custom centering',()=>{});
    const weight=page.locator('[data-setting="steeringWeight"]');await weight.focus();
    await tap(page,15);await expectHandling(page,55,1.7);
    check('D-pad adjusts the focused steering-weight field through the same settings path');
    await fillSetting(page,'steeringWeight',75);await expectHandling(page,75,1.7);
    const stored=await settings(page);
    check('custom weight and centering persist in validated local settings',()=>{
      assert.equal(stored.steeringWeight,75);assert.equal(stored.steeringReturn,1.7);
    });
    await page.screenshot({path:path.join(output,`handling-${type.toLowerCase()}-${transmission}-settings.png`)});
    // Held input exists only in the synthetic browser provider, never in vehicle state.
    await set(page,{axes:[.75,0,0,0],buttons:{7:.7}});
    await page.getByRole('button',{name:'Kembali ke simulasi',exact:true}).click();
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');await ticks(page);
    const held=await state(page);
    check('closing changed settings blocks previously held steering and throttle until neutral',()=>{
      assert.equal(held.gamepad.neutralGate,true);assert.equal(held.gamepad.continuous.steer,0);
      assert.equal(held.gamepad.continuous.throttle,0);assert.equal(held.steerAngle,initial.steerAngle);
      assert.deepEqual(held.position,initial.position);assert.equal(Math.abs(held.speed),0);
    });
    await set(page,{axes:[0,0,0,0],buttons:{7:0}});await ticks(page);
    assert.equal((await state(page)).gamepad.neutralGate,true,'neutral alone must not re-arm controls');
    await set(page,{axes:[.6,0,0,0]});
    await page.waitForFunction(()=>{
      const s=window.kemudiSimulation.snapshot();return !s.gamepad.neutralGate&&s.steerAngle<-.01;
    });
    const rearmed=await state(page);
    check('fresh stick input steers the actual player with custom handling and no unintended motion',()=>{
      assert.equal(rearmed.handling.steeringWeight,75);assert.equal(rearmed.handling.steeringReturn,1.7);
      assert.deepEqual(rearmed.position,initial.position);assert.equal(rearmed.engine,false);assert.equal(rearmed.handbrake,true);
    });
    await set(page,{axes:[0,0,0,0]});
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.kemudiSimulation?.snapshot().phase==='walking');
    await expectHandling(page,75,1.7);
    check('reloading creates a new vehicle with persisted custom handling');
    await page.locator('#gamepad-open').click();
    await page.getByRole('button',{name:'Reset ke default',exact:true}).click();await expectHandling(page,50,1);
    const reset=await settings(page);
    check('reset restores live player and saved handling defaults together',()=>{
      assert.equal(reset.steeringWeight,50);assert.equal(reset.steeringReturn,1);
      assert.deepEqual(report.errors,[]);
    });
    report.final=await state(page);report.passed=true;
  }catch(error){
    report.error=error.stack||error.message;report.state=await state(page).catch(()=>null);
    await page.screenshot({path:path.join(output,`handling-${type.toLowerCase()}-${transmission}-failure.png`)}).catch(()=>{});
    throw error;
  }finally{report.finished=new Date().toISOString();save();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
