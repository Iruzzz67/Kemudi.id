const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const output=path.resolve(__dirname,'../../artifacts/unified');fs.mkdirSync(output,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});const reports=[];
try {for(const [map,demo] of [['training','long-road'],['city','training-intersection']]){
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=new URL(process.env.SIM_URL||'http://127.0.0.1:8080/');url.searchParams.set('map',map);url.searchParams.set('demo',demo);
 await page.goto(url.href);await page.waitForFunction(()=>window.kemudiSimulation?.snapshot().ready,null,{timeout:60000});
 assert.equal(await page.locator('#vs-map').count(),0);await page.locator('#vs-start').click();await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='walking');await page.locator('#wh-enter').click();await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
 await page.locator('#sim-canvas').focus();await page.keyboard.press('KeyI');await page.waitForFunction(()=>window.kemudiSimulation.snapshot().engine);await page.keyboard.press('KeyB');
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='FPV');await page.screenshot({path:path.join(output,demo+'-driver.png')});
 await page.keyboard.press('KeyC');await page.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='TopDown');await page.screenshot({path:path.join(output,demo+'-overhead.png')});
 if(demo==='training-intersection'){await page.keyboard.press('F2');assert.match(await page.locator('#intersection-debug').textContent(),/training-junction/);await page.keyboard.press('F2');}
 const before=await page.evaluate(()=>window.kemudiSimulation.snapshot());assert.equal(before.map,'unified');assert.equal(before.intersections.length,2);
 await page.keyboard.press('Space');await page.keyboard.down('KeyW');await page.waitForFunction(z=>window.kemudiSimulation.snapshot().position[2]<z-2,before.position[2]);await page.keyboard.up('KeyW');await page.keyboard.down('KeyS');await page.waitForFunction(()=>Math.abs(window.kemudiSimulation.snapshot().speed)<.1);await page.keyboard.up('KeyS');
 await page.keyboard.press('KeyP');await page.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');const paused=await page.evaluate(()=>window.kemudiSimulation.snapshot().intersections);await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>window.kemudiSimulation.snapshot().intersections),paused);assert.deepEqual(errors,[]);
 reports.push({map,demo,passed:true,errors,state:before});console.log(demo+' passed');await page.close();
}}finally{fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(reports,null,2));await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
