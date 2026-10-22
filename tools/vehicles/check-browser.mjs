// Browser smoke check using Chrome's local debugging protocol; no extra npm dependency.
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const tab = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', {method:'PUT'})).json();
const socket = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open',resolve,{once:true}));
let serial=0; const pending=new Map(), errors=[];
socket.addEventListener('message',({data})=>{
  const msg=JSON.parse(data);
  if(msg.id){ const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(msg.error):p.resolve(msg.result); }
  if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description??msg.params.exceptionDetails.text);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const wait=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,500));}throw new Error('Timed out: '+expression);};
const click=async label=>{const found=await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(label)}));button?.click();return !!button})()`);assert.ok(found,`Button ${label}`);};
await mkdir('.artifacts/vehicles',{recursive:true});
try {
  await send('Runtime.enable');await send('Page.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  // Existing local demo-auth flow; fixture is confined to this disposable browser profile.
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('kemudi_auth_user', JSON.stringify({id:'vehicle-ui-check',name:'Penguji Lokal',email:'vehicle-check@example.test'}));`});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:3000/simulasi?vehicle=mobil'});
  await wait(`document.querySelector('[data-vehicle-preview="MOBIL"][aria-busy="false"] canvas') !== null`);
  await evaluate(`new Promise(r=>setTimeout(r,2500))`);
  assert.equal(await evaluate(`document.querySelector('.garage-vehicle.is-selected strong').textContent.includes('Mobil')`),true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await evaluate(`localStorage.setItem('theme','light');document.documentElement.classList.remove('dark')`);
  let shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.artifacts/vehicles/garage-desktop.png',Buffer.from(shot.data,'base64'));
  await click('Lihat animasi');await evaluate(`new Promise(r=>setTimeout(r,700))`);await click('Jeda animasi');
  await click('Panduan kontrol');assert.ok(await evaluate(`Boolean(document.querySelector('#garage-help'))`));
  await click('Truk');await wait(`document.querySelector('[data-vehicle-preview="TRUK"][aria-busy="false"] canvas') !== null`);
  await evaluate(`new Promise(r=>setTimeout(r,1200))`);shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.artifacts/vehicles/garage-truck.png',Buffer.from(shot.data,'base64'));
  await click('Motor');await wait(`document.querySelector('[data-vehicle-preview="MOTOR"][aria-busy="false"] canvas') !== null`);
  await evaluate(`new Promise(r=>setTimeout(r,1200))`);shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.artifacts/vehicles/garage-motor.png',Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await evaluate(`document.documentElement.classList.add('dark')`);
  await evaluate(`new Promise(r=>setTimeout(r,1500))`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:390,height:await evaluate('document.documentElement.scrollHeight'),scale:1}});await writeFile('.artifacts/vehicles/garage-mobile.png',Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
  await click('Mobil');await click('Mulai latihan mobil');
  await wait(`document.body.innerText.includes('Berjalan menuju kendaraan')`);
  await evaluate(`new Promise(r=>setTimeout(r,3000))`);
  shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.artifacts/vehicles/walking.png',Buffer.from(shot.data,'base64'));
  assert.ok(await evaluate(`document.body.innerText.includes('Masuk VR')`));
  const key = async (code, value, duration=300) => {
    await send('Input.dispatchKeyEvent',{type:'keyDown',code,key:value});
    await evaluate(`new Promise(r=>setTimeout(r,${duration}))`);
    await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    await send('Input.dispatchKeyEvent',{type:'keyUp',code,key:value});
    await evaluate(`new Promise(r=>setTimeout(r,150))`);
  };
  for(let step=0;step<24;step++) {
    if(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Masuk Kendaraan'))`))break;
    await key('KeyW','w',500);
  }
  await wait(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('Masuk Kendaraan'))`);
  await click('Masuk Kendaraan');
  await wait(`document.body.innerText.includes('Mesin:')`);
  await key('KeyI','i');await key('KeyI','i');await key('KeyI','i');
  await evaluate(`new Promise(r=>setTimeout(r,1500))`);
  await key('KeyB','b');await key('Space',' ');await key('BracketRight',']');await key('KeyM','m');await key('KeyZ','z');
  for(let attempt=0;attempt<12;attempt++) {
    await key('KeyW','w',500);
    if(await evaluate(`Number(document.querySelector('.text-3xl.tabular-nums')?.textContent.match(/\\d+/)?.[0]) > 0`))break;
  }
  assert.ok(await evaluate(`Number(document.querySelector('.text-3xl.tabular-nums')?.textContent.match(/\\d+/)?.[0]) > 0`),'Vehicle accelerates after ignition and preparation');
  shot=await send('Page.captureScreenshot',{format:'png'});await writeFile('.artifacts/vehicles/driving.png',Buffer.from(shot.data,'base64'));
  assert.deepEqual(errors,[]);
  console.log('PASS: 3 loaded vehicle previews, animation toggle, guide, responsive/dark layout, walking, entering cabin, ignition, acceleration, WebXR availability UI; no uncaught exceptions.');
} catch(error) {
  const shot=await send('Page.captureScreenshot',{format:'png'});
  await writeFile('.artifacts/vehicles/browser-failure.png',Buffer.from(shot.data,'base64'));
  await writeFile('.artifacts/vehicles/browser-failure.json',JSON.stringify({error:String(error),runtimeErrors:errors,text:await evaluate('document.body.innerText')},null,2));
  throw error;
} finally {socket.close();await fetch(`http://127.0.0.1:9222/json/close/${tab.id}`);}
