// Synthetic Gamepad API only: production vehicle/clock/state are never mutated.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../../artifacts/gamepad');fs.mkdirSync(output,{recursive:true});
const report={started:new Date().toISOString(),passed:false,cases:[],hardware:'NOT RUN: synthetic Chromium input does not prove USB/Bluetooth compatibility'};
const save=()=>fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));
function installPad(){
  const h={reads:0,connected:true,axes:[0,0,0,0],buttons:Array(16).fill(0)};
  h.nativeAvailable=typeof navigator.getGamepads==='function';
  h.secureContext=window.isSecureContext;
  try { navigator.getGamepads?.();h.nativeError=null; } catch(error) { h.nativeError=error.name; }
  window.__padHarness=h;
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
    h.reads++;
    if(h.error)throw new DOMException('Synthetic policy denial',h.error);
    return h.connected?[{index:0,id:'Synthetic standard pad',connected:true,mapping:'standard',axes:[...h.axes],
      buttons:h.buttons.map(value=>({value,pressed:value>=.55,touched:value>0})),timestamp:performance.now()}]:[null];
  }});
}
const state=frame=>frame.evaluate(()=>window.kemudiSimulation.snapshot());
async function set(frame,buttons={},axes=null,connected=true){
  const before=await frame.evaluate(({buttons,axes,connected})=>{
    const h=window.__padHarness;h.connected=connected;
    for(const [i,value]of Object.entries(buttons))h.buttons[i]=value;
    if(axes)h.axes=axes;return h.reads;
  },{buttons,axes,connected});
  await frame.waitForFunction(n=>window.__padHarness.reads>=n+2,before,{timeout:60000});
}
async function tap(frame,index){await set(frame,{[index]:1});await set(frame,{[index]:0});}
async function run(browser,type,transmission,embedded=false){
  const item={type,transmission,embedded,passed:false,checks:[]};report.cases.push(item);save();
  const context=await browser.newContext({viewport:{width:800,height:600}});await context.addInitScript(installPad);
  const page=await context.newPage();page.setDefaultTimeout(90000);const errors=[];
  page.on('pageerror',e=>errors.push(e.message));let frame=page;
  const check=(name,fn=()=>{})=>{fn();item.checks.push(name);console.log('PASS',type,transmission,embedded?'iframe':'standalone',name);save();};
  try{
    const url=embedded?`${process.env.WEB_URL}/simulasi/play?vehicle=${type}&transmission=${transmission}`:
      `${process.env.SIM_URL||'http://127.0.0.1:8080/'}?vehicle=${type}&transmission=${transmission}&autostart=1`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    for(let attempt=0;attempt<3;attempt++) {
      if(embedded){await page.frameLocator('iframe').locator('#wh-enter').waitFor({state:'visible',timeout:120000});frame=page.frames().find(f=>f.url().includes('/simulation-3d/index.html'));}
      try {
        await frame.waitForFunction(()=>window.kemudiSimulation?.snapshot().phase==='walking',null,{timeout:120000});
        await frame.locator('#sim-canvas').focus();
        item.platform=await frame.evaluate(()=>({nativeAvailable:window.__padHarness.nativeAvailable,
          nativeError:window.__padHarness.nativeError,secureContext:window.__padHarness.secureContext,origin:location.origin}));
        await tap(frame,0); // Discovery requires a release before gameplay.
        await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.selectedIndex===0);
        await tap(frame,0);
        await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
        await set(frame,{});await tap(frame,2);
        await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().engine,null,{timeout:120000});
        break;
      } catch(error) {
        if(!embedded || !/detached/i.test(error.message) || attempt===2) throw error;
        // Blazor replaces the prerendered iframe during initial hydration only.
        item.initialHydrationRetries=(item.initialHydrationRetries||0)+1;
      }
    }
    check('standard synthetic pad discovers, enters and starts actual vehicle');
    await set(frame,{8:1,9:1});
    await frame.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.phase==='paused'&&!s.gamepad.menuOpen;});
    await set(frame,{8:0,9:0});
    check('simultaneous View and Start stays paused without a same-frame resume');
    await tap(frame,9);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    await tap(frame,8);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.menuOpen);
    const menuState=await state(frame);
    check('View opens paused action menu',()=>assert.equal(menuState.phase,'paused'));
    await page.screenshot({path:path.join(output,`${type.toLowerCase()}-${transmission}${embedded?'-iframe':''}-menu.png`)});
    // Six common commands precede the first role-specific equipment item.
    for(let i=0;i<6;i++)await tap(frame,13);
    await tap(frame,0);
    if(type==='MOTOR')for(let i=0;i<3;i++){await tap(frame,13);await tap(frame,0);}
    await tap(frame,1);
    await frame.waitForFunction(()=>!window.kemudiSimulation.snapshot().gamepad.menuOpen);
    const equipped=await state(frame);
    check('gamepad-only role equipment mutates real vehicle',()=>{
      assert.ok(equipped.equipment,'equipment diagnostics required');
      if(type==='MOTOR')for(const key of ['helmet','jacket','gloves','shoes'])assert.equal(equipped.equipment[key],true,key);
      else assert.equal(equipped.equipment.seatbelt,true);
    });
    if(embedded){check('same-origin iframe native API is secure/unblocked and synthetic input usable',()=>{
      assert.equal(new URL(frame.url()).origin,new URL(process.env.WEB_URL).origin);
      assert.equal(item.platform.secureContext,true);assert.equal(item.platform.nativeAvailable,true);assert.equal(item.platform.nativeError,null);
    });item.final=await state(frame);item.passed=true;return;}
    await tap(frame,13);await frame.waitForFunction(()=>!window.kemudiSimulation.snapshot().handbrake);
    if(transmission==='manual'){
      await set(frame,{10:1,7:.5});await tap(frame,15);
      await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gear===1);
      await set(frame,{10:0});
    }else await set(frame,{7:.5});
    await frame.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.gamepad.continuous.throttle>.4&&s.gamepad.continuous.throttle<.6&&s.speed>.05;});
    const partial=await state(frame);
    check('fractional RT reaches actual dynamics',()=>assert.ok(partial.gamepad.continuous.throttle>.4&&partial.gamepad.continuous.throttle<.6&&partial.speed>.05));
    await set(frame,{7:1});await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.continuous.throttle===1);
    await set(frame,{7:0,6:.5},[-.6,0,0,0]);
    await frame.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.gamepad.continuous.brakeAmount>.4&&s.steerAngle>0;});
    check('LT remains fractional and left stick steers left');
    await set(frame,{6:1,10:transmission==='manual'?1:0},[0,0,0,0]);
    await frame.waitForFunction(()=>Math.abs(window.kemudiSimulation.snapshot().speed)<.01);
    if(transmission==='automatic'){
      await tap(frame,14);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gear===-1);check('stopped plus brake permits reverse');
      await tap(frame,15);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gear>=1);
    }
    const camera=(await state(frame)).camera;await set(frame,{3:1});
    await frame.waitForFunction(before=>window.kemudiSimulation.snapshot().camera!==before,camera);
    const once=(await state(frame)).camera;await set(frame,{});assert.equal((await state(frame)).camera,once);await set(frame,{3:0});
    check('held camera button changes mode once');
    await set(frame,{6:0});
    await frame.locator('#sim-canvas').focus();await page.keyboard.down('KeyW');
    await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.source==='keyboard');
    const keyboard=await state(frame);
    check('keyboard claims entire source without blending pad brake',()=>{assert.equal(keyboard.gamepad.continuous.throttle,1);assert.equal(keyboard.gamepad.continuous.brakeAmount,0);});
    await page.keyboard.up('KeyW');
    // Intentionally cross the documented 200ms source-switch cooldown.
    await frame.waitForTimeout(220);
    await set(frame,{6:0,7:1});await tap(frame,9);
    await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');
    await tap(frame,9);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    const resumed=await state(frame);
    check('held RT stays gated after explicit resume',()=>assert.equal(resumed.gamepad.continuous.throttle,0));
    await set(frame,{7:0});
    if(transmission==='manual') {
      assert.equal((await state(frame)).gamepad.neutralGate,true,'held clutch must still block neutral rearm');
      await set(frame,{10:0});
    }
    await set(frame,{7:1});await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.continuous.throttle===1);
    await set(frame,{},null,false);await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');
    check('disconnect while RT held pauses safely');
    await frame.evaluate(()=>{window.__padHarness.error='SecurityError';});
    await set(frame,{7:0,10:0});
    await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.status==='error');
    await frame.locator('#sim-canvas').focus();await page.keyboard.press('KeyP');
    await frame.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    await page.keyboard.down('KeyW');
    await frame.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.gamepad.source==='keyboard'&&s.gamepad.continuous.throttle===1&&s.phase==='driving';});
    await page.keyboard.up('KeyW');
    check('SecurityError remains neutral and deliberate keyboard fallback stays usable');
    assert.deepEqual(errors,[]);item.final=await state(frame);item.passed=true;
    await page.screenshot({path:path.join(output,`${type.toLowerCase()}-${transmission}.png`)});
  }catch(error){item.error=error.message;item.state=await state(frame).catch(()=>null);item.errors=errors;await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}
  finally{save();await context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const type of ['MOBIL','MOTOR','TRUK'])for(const transmission of ['automatic','manual']){
      if(process.env.GAMEPAD_CASE&&process.env.GAMEPAD_CASE!==`${type}/${transmission}`)continue;
      await run(browser,type,transmission);
    }
    if(process.env.WEB_URL)await run(browser,'TRUK','manual',true);
    assert.ok(report.cases.length,'No matching GAMEPAD_CASE was executed');
    report.passed=true;
  }finally{report.finished=new Date().toISOString();save();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
