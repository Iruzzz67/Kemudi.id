// Isolated DOM validation; does not require WebGL, a running server or hardware.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:640}});
 await page.setContent('<button id="before">Before</button><canvas id="sim-canvas" tabindex="0"></canvas>');
 await page.addStyleTag({path:path.resolve(__dirname,'../../src/Kemudi.Web/wwwroot/simulation-3d/input/gamepad-ui.css')});
 await page.addScriptTag({path:path.resolve(__dirname,'../../src/Kemudi.Web/wwwroot/simulation-3d/input/gamepad-ui.js')});
 const result=await page.evaluate(()=>{
  const calls=[];let settings={enabled:true,stickDeadzone:.12,steerSensitivity:1,steerExponent:1.4,triggerDeadzone:.03,clutchAssist:false,steeringWeight:50,steeringReturn:1.3,bindings:{interact:0,horn:1,ignition:2}};
  const ui=new GamepadUI({onOpen:()=>calls.push('open'),onClose:()=>calls.push('close'),onAction:n=>calls.push(n),onSettings:p=>{calls.push(p);settings={...settings,...p};ui.update({...ui.state,settings});},onDevice:n=>calls.push(n)});
  ui.update({phase:'driving',vehicleType:'MOTOR',status:'connected',settings,device:{index:2},devices:[{index:2,id:'<img src=x onerror=alert(1)>',mapping:'standard'}]});
  document.getElementById('before').focus();ui.open();
  const motor=[...ui.actions.querySelectorAll('button')].map(b=>b.dataset.action);
  const noInjection=!ui.dialog.querySelector('img');
  ui.actions.querySelector('[data-action=helmet]').focus();ui.handle({confirm:true});
  const remap=ui.dialog.querySelector('[data-binding=interact]');remap.focus();ui.handle({menuRight:true});
  const remapped=settings.bindings.interact;
  ui.handle({back:true});const restored=document.activeElement.id;
  ui.open();const deviceOptions=ui.deviceSelect.options.length;
  ui.close();ui.update({...ui.state,vehicleType:'MOBIL',phase:'driving',transmission:'manual'});ui.open();
  const car=[...ui.actions.querySelectorAll('button')].map(b=>b.dataset.action);
  ui.close();ui.update({...ui.state,status:'disconnected',source:'keyboard',device:null,devices:[]});ui.open();
  const weight=ui.dialog.querySelector('[data-setting=steeringWeight]'),returnSpeed=ui.dialog.querySelector('[data-setting=steeringReturn]');
  if(!weight||!returnSpeed)throw Error('Handling fields must be available without a controller');
  const handlingLabels=weight.closest('label').textContent.includes('Berat setir / stang')&&returnSpeed.closest('label').textContent.includes('Kembali ke tengah');
  const presets=[...ui.dialog.querySelectorAll('[data-handling-preset]')];
  const normalPressed=presets.find(b=>b.dataset.handlingPreset==='50')?.getAttribute('aria-pressed');
  const selected=[];
  for(const value of [0,100,50]){
    const button=presets.find(b=>b.dataset.handlingPreset===String(value));if(!button)throw Error('Missing handling preset '+value);
    button.focus();ui.handle({confirm:true});selected.push([settings.steeringWeight,button.getAttribute('aria-pressed'),settings.steeringReturn]);
  }
  weight.focus();ui.handle({menuRight:true});const weightByDpad=settings.steeringWeight;
  const customPressed=presets.filter(b=>b.getAttribute('aria-pressed')==='true').length;
  returnSpeed.focus();ui.handle({menuLeft:true});const returnByDpad=settings.steeringReturn;
  weight.value='25';weight.dispatchEvent(new Event('change',{bubbles:true}));const manualWeight=settings.steeringWeight;
  const handlingHelp=ui.settings.textContent.includes('keyboard')&&ui.settings.textContent.includes('force feedback');
  ui.close();ui.open();const reopenedWeight=Number(ui.dialog.querySelector('[data-setting=steeringWeight]').value);
  ui.dispose();return {calls,motor,car,noInjection,remapped,restored,deviceOptions,handlingLabels,normalPressed,selected,weightByDpad,customPressed,returnByDpad,manualWeight,handlingHelp,reopenedWeight,removed:!document.getElementById('gamepad-status')};
 });
 assert.ok(result.motor.includes('helmet')&&result.motor.includes('shoes'));assert.ok(!result.motor.includes('seatbelt'));
 assert.ok(result.car.includes('seatbelt')&&!result.car.includes('helmet'));assert.ok(result.calls.includes('helmet'));
 assert.ok(result.motor.includes('selectReverse')&&!result.motor.includes('gearUp'));
 assert.ok(result.car.includes('gearUp')&&!result.car.includes('selectReverse'));
 assert.equal(result.remapped,3,'Dpad skips conflicting button indices');assert.equal(result.restored,'before');assert.equal(result.deviceOptions,2);
 assert.ok(result.noInjection&&result.removed);
 assert.ok(result.handlingLabels&&result.handlingHelp);assert.equal(result.normalPressed,'true');
 assert.deepEqual(result.selected,[[0,'true',1.3],[100,'true',1.3],[50,'true',1.3]],'presets change weight only and expose selected state');
 assert.equal(result.weightByDpad,55);assert.equal(result.customPressed,0);assert.ok(Math.abs(result.returnByDpad-1.2)<1e-9);
 assert.equal(result.manualWeight,25);assert.equal(result.reopenedWeight,25);
 console.log('PASS handling UI: no-device controls, labels, light/normal/heavy presets, aria state, independent return, Dpad adjustment and reopen');
 console.log('PASS gamepad UI: role actions, A/B navigation, conflict-free Dpad remap, safe device text, reopen options, focus restoration and disposal');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
