// Real renderer regression: only the browser Gamepad API is replaced, never simulation state.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../../artifacts/gamepad');
fs.mkdirSync(output,{recursive:true});
const report={started:new Date().toISOString(),passed:false,cases:[],hardware:'NOT RUN: synthetic input is not physical controller acceptance'};
const save=()=>fs.writeFileSync(path.join(output,'look-browser-report.json'),JSON.stringify(report,null,2));
const YAW_LIMIT=100*Math.PI/180,PITCH_LIMIT=55*Math.PI/180;
function installPad(){
  const h=window.__lookPad={reads:0,connected:true,axes:[0,0,0,0],buttons:Array(16).fill(0)};
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
    h.reads++;
    return h.connected?[{index:0,id:'Synthetic right-stick pad',connected:true,mapping:'standard',axes:[...h.axes],
      buttons:h.buttons.map(value=>({value,pressed:value>=.55,touched:value>0})),timestamp:performance.now()}]:[null];
  }});
}
const state=page=>page.evaluate(()=>window.kemudiSimulation.snapshot());
async function set(page,{buttons={},axes,connected}={}){
  const before=await page.evaluate(({buttons,axes,connected})=>{
    const h=window.__lookPad;
    for(const [i,value]of Object.entries(buttons))h.buttons[i]=value;
    if(axes)h.axes=axes;
    if(connected!==undefined)h.connected=connected;
    return h.reads;
  },{buttons,axes,connected});
  await page.waitForFunction(n=>window.__lookPad.reads>=n+2,before,{timeout:90000});
}
async function tap(page,index){await set(page,{buttons:{[index]:1}});await set(page,{buttons:{[index]:0}});}
async function ticks(page,count=6){
  const before=(await state(page)).clock.tick;
  await page.waitForFunction(target=>window.kemudiSimulation.snapshot().clock.tick>=target,before+count,{timeout:120000});
}
function sameLook(actual,expected,message){
  assert.ok(Math.abs(actual.yaw-expected.yaw)<1e-8&&Math.abs(actual.pitch-expected.pitch)<1e-8,message);
}
async function run(browser,type,transmission){
  const item={type,transmission,passed:false,checks:[]};report.cases.push(item);save();
  const context=await browser.newContext({viewport:{width:800,height:600}});
  await context.addInitScript(installPad);
  const page=await context.newPage();page.setDefaultTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const check=(name,fn=()=>{})=>{fn();item.checks.push(name);console.log('PASS',type,transmission,name);save();};
  try{
    const url=new URL(process.env.SIM_URL||'http://127.0.0.1:8080/');
    url.searchParams.set('vehicle',type);url.searchParams.set('transmission',transmission);url.searchParams.set('autostart','1');
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.kemudiSimulation?.snapshot().phase==='walking');
    await page.locator('#sim-canvas').focus();
    await tap(page,0);
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.selectedIndex===0);
    await set(page,{axes:[0,0,.7,-.7]});await ticks(page);
    const walking=await state(page);
    check('right stick does not enter first-person while walking',()=>{assert.equal(walking.phase,'walking');assert.equal(walking.camera,'TPV');});
    await set(page,{axes:[0,0,0,0]});await tap(page,0);
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    await set(page,{axes:[0,0,0,0]});
    // Re-arm the entering gate without driving before taking the baseline.
    // Otherwise the first look also runs the automatic gearbox's normal N->D tick.
    await tap(page,4);await tap(page,4);await ticks(page);
    const initial=await state(page);
    assert.ok(initial.cameraLook&&initial.cameraPose,'read-only look and rendered-camera diagnostics are required');
    for(const [axis,sign,label]of [[.65,1,'right'],[-.65,-1,'left']]){
      await set(page,{axes:[0,0,axis,0]});
      await page.waitForFunction(side=>{
        const s=window.kemudiSimulation.snapshot();return s.camera==='FPV'&&-s.cameraLook.yaw*side>.12;
      },sign);
      await set(page,{axes:[0,0,0,0]});
      const horizontal=await state(page);
      check(`horizontal-only right stick turns actual camera ${label} without vertical input`,()=>{
        const rightDot=horizontal.cameraPose.direction[0]*Math.cos(horizontal.rotation)-horizontal.cameraPose.direction[2]*Math.sin(horizontal.rotation);
        assert.ok(rightDot*sign>.1,'rendered camera, not only yaw state, must turn toward '+label);
        assert.equal(horizontal.cameraLook.pitch,0);
        assert.equal(horizontal.gamepad.continuous.steer,0);
        assert.deepEqual(horizontal.position,initial.position,'horizontal look cannot steer or drive');
      });
      await page.screenshot({path:path.join(output,`look-horizontal-${label}-${type.toLowerCase()}-${transmission}.png`)});
    }
    // Restore the original TPV mode before the existing combined-axis scenario.
    await tap(page,3);await tap(page,3);
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='TPV');
    await set(page,{axes:[0,0,.65,-.55]});
    await page.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.camera==='FPV'&&s.cameraLook.yaw<-.12&&s.cameraLook.pitch>.12;});
    const looked=await state(page);
    check('right stick selects FPV and turns the actual camera right and upward',()=>{
      assert.equal(looked.gamepad.source,'gamepad');assert.ok(looked.gamepad.continuous.lookX>0&&looked.gamepad.continuous.lookY<0);
      assert.equal(looked.gamepad.continuous.steer,0);
      const rightDot=looked.cameraPose.direction[0]*Math.cos(looked.rotation)-looked.cameraPose.direction[2]*Math.sin(looked.rotation);
      assert.ok(rightDot>0,'world camera direction turns toward vehicle right');
      assert.ok(looked.cameraPose.direction[1]>0,'world camera direction looks above horizon');
      assert.equal(looked.cockpit.visible,true);assert.equal(looked.exteriorVisible,false);assert.equal(looked.characters.headVisible,false);
      assert.equal(looked.gear,initial.gear);assert.equal(looked.engine,initial.engine);assert.equal(Math.abs(looked.speed),0);
      assert.deepEqual(looked.position,initial.position,'looking does not drive the vehicle');
    });
    await set(page,{axes:[0,0,0,0]});
    const released=await state(page);await ticks(page);
    const held=await state(page);
    check('release holds camera orientation without recentering',()=>{
      sameLook(held.cameraLook,released.cameraLook,'neutral right stick must stop angular movement');
      assert.deepEqual(held.cameraPose.direction,released.cameraPose.direction);
    });
    await set(page,{axes:[0,0,.02,-.02]});await ticks(page);
    const jitter=await state(page);
    check('small right-stick jitter stays in deadzone',()=>{
      assert.equal(jitter.gamepad.continuous.lookX,0);assert.equal(jitter.gamepad.continuous.lookY,0);
      sameLook(jitter.cameraLook,released.cameraLook,'deadzone must not move view');
    });
    await set(page,{axes:[-.65,0,.55,0]});
    await page.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.steerAngle>0&&s.gamepad.continuous.lookX>0;});
    check('left steering and right look are independent simultaneous inputs',()=>{});
    await set(page,{axes:[0,0,1,-1]});
    await page.waitForFunction(({yaw,pitch})=>{const l=window.kemudiSimulation.snapshot().cameraLook;return Math.abs(l.yaw+yaw)<1e-7&&Math.abs(l.pitch-pitch)<1e-7;},{yaw:YAW_LIMIT,pitch:PITCH_LIMIT},{timeout:180000});
    await ticks(page);
    const bounded=await state(page);
    check('sustained look clamps yaw and pitch to head-turn limits',()=>{
      assert.ok(Math.abs(bounded.cameraLook.yaw)<=YAW_LIMIT+1e-8);assert.ok(Math.abs(bounded.cameraLook.pitch)<=PITCH_LIMIT+1e-8);
    });
    await page.screenshot({path:path.join(output,`look-${type.toLowerCase()}-${transmission}.png`)});
    await tap(page,3);
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='TopDown');
    await ticks(page);
    const cycled=await state(page);
    check('Y cycles camera and resets look without a held-stick override',()=>{
      assert.equal(cycled.camera,'TopDown');sameLook(cycled.cameraLook,{yaw:0,pitch:0},'explicit camera switch resets look');
    });
    await set(page,{axes:[0,0,0,0]});await set(page,{axes:[0,0,-.65,.65]});
    await page.waitForFunction(()=>{const s=window.kemudiSimulation.snapshot();return s.camera==='FPV'&&s.cameraLook.yaw>.01&&s.cameraLook.pitch<-.01;});
    check('fresh opposite stick selects FPV and reverses look direction');
    await set(page,{axes:[0,0,0,0]});await page.keyboard.press('KeyC');
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='TopDown');
    check('keyboard C camera cycle remains available');
    // Cross the documented 200ms source arbitration cooldown before fresh pad activity.
    await page.waitForTimeout(220);
    await set(page,{axes:[0,0,.7,0]});
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='FPV');
    await tap(page,9);await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');
    const paused=await state(page);await set(page,{});await set(page,{});
    const stillPaused=await state(page);
    check('pause freezes camera orientation while the stick remains held',()=>sameLook(stillPaused.cameraLook,paused.cameraLook,'pause must freeze view'));
    await tap(page,9);await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
    await ticks(page);
    const resumed=await state(page);
    check('resume blocks old held-stick motion until neutral then fresh input',()=>{
      assert.equal(resumed.gamepad.neutralGate,true);assert.equal(resumed.gamepad.continuous.lookX,0);
      sameLook(resumed.cameraLook,paused.cameraLook,'old held stick must not move camera after resume');
    });
    await set(page,{axes:[0,0,0,0]});await ticks(page);
    sameLook((await state(page)).cameraLook,paused.cameraLook,'neutral alone must not move camera');
    await set(page,{axes:[0,0,-.7,0]});
    await page.waitForFunction(yaw=>{const s=window.kemudiSimulation.snapshot();return !s.gamepad.neutralGate&&s.cameraLook.yaw>yaw+.01;},paused.cameraLook.yaw);
    check('fresh right-stick action re-arms after resume');
    await tap(page,8);await page.waitForFunction(()=>window.kemudiSimulation.snapshot().gamepad.menuOpen);
    const menu=await state(page);await set(page,{});
    sameLook((await state(page)).cameraLook,menu.cameraLook,'action menu freezes view');
    // A toggles the initially focused ignition action without unpausing.
    await tap(page,0);
    const menuAction=await state(page);
    check('paused action keeps the rendered first-person look',()=>{
      sameLook(menuAction.cameraLook,menu.cameraLook,'menu action preserves look state');
      assert.deepEqual(menuAction.cameraPose.direction,menu.cameraPose.direction,'menu action must not recenter actual camera');
    });
    await tap(page,1);await page.waitForFunction(()=>!window.kemudiSimulation.snapshot().gamepad.menuOpen);
    await ticks(page);const closed=await state(page);
    check('menu close preserves neutral gate against held-stick motion',()=>{
      assert.equal(closed.gamepad.neutralGate,true);sameLook(closed.cameraLook,menu.cameraLook,'menu close must not restore held look');
    });
    await set(page,{axes:[0,0,0,0]});await set(page,{axes:[0,0,.6,0]});
    await page.waitForFunction(()=>!window.kemudiSimulation.snapshot().gamepad.neutralGate);
    await set(page,{connected:false});await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');
    const disconnected=await state(page);
    await set(page,{connected:true});await page.locator('#sim-canvas').focus();await page.keyboard.press('KeyP');
    await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');await ticks(page);
    const reconnect=await state(page);
    check('disconnect and held reconnect cannot move the camera',()=>{
      assert.equal(reconnect.gamepad.neutralGate,true);sameLook(reconnect.cameraLook,disconnected.cameraLook,'reconnect must not restore held look');
    });
    assert.deepEqual(errors,[]);item.final=await state(page);item.passed=true;
  }catch(error){
    item.error=error.stack||error.message;item.state=await state(page).catch(()=>null);item.errors=errors;
    await page.screenshot({path:path.join(output,`look-${type.toLowerCase()}-${transmission}-failure.png`)}).catch(()=>{});
    throw error;
  }finally{save();await context.close();}
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const type of ['MOBIL','MOTOR','TRUK'])for(const transmission of ['automatic','manual']){
      if(process.env.GAMEPAD_LOOK_CASE&&process.env.GAMEPAD_LOOK_CASE!==`${type}/${transmission}`)continue;
      await run(browser,type,transmission);
    }
    assert.ok(report.cases.length,'No matching GAMEPAD_LOOK_CASE was executed');report.passed=true;
  }finally{report.finished=new Date().toISOString();save();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
