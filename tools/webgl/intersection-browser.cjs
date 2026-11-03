const {chromium}=require('playwright');const fs=require('node:fs');const assert=require('node:assert/strict');
process.chdir(require('node:path').resolve(__dirname,'../..'));
fs.mkdirSync('artifacts/intersection',{recursive:true});
(async()=>{const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 const url=new URL(process.env.SIM_URL || 'http://127.0.0.1:8080/');url.searchParams.set('demo','intersection');
 await p.goto(url.href);
 await p.waitForFunction(()=>window.kemudiSimulation?.snapshot().ready,null,{timeout:60000});await p.locator('#vs-start').click();
 await p.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='walking');await p.locator('#wh-enter').click();
 await p.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='driving');
 console.log('Entered connected junction demo');
 await p.locator('#sim-canvas').focus();await p.keyboard.press('KeyC');
 await p.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='FPV');
 await p.screenshot({path:'artifacts/intersection/driver.png'});
 await p.keyboard.press('KeyC');await p.waitForFunction(()=>window.kemudiSimulation.snapshot().camera==='TopDown');
 await p.screenshot({path:'artifacts/intersection/overhead.png'});
 await p.keyboard.press('F2');await p.locator('#intersection-debug').waitFor({state:'visible'});
 assert.match(await p.locator('#intersection-debug').textContent(),/cedar-junction/);
 await p.keyboard.press('KeyP');await p.waitForFunction(()=>window.kemudiSimulation.snapshot().phase==='paused');
 const pause=await p.evaluate(()=>window.kemudiSimulation.snapshot().intersection);
 await p.waitForTimeout(500);assert.deepEqual(await p.evaluate(()=>window.kemudiSimulation.snapshot().intersection),pause);
 await p.locator('#pause-resume').click();await p.locator('#sim-canvas').focus();
 await p.keyboard.press('F2');await p.keyboard.press('KeyI');await p.waitForFunction(()=>window.kemudiSimulation.snapshot().engine);
 await p.keyboard.press('KeyB');await p.keyboard.press('Space');await p.keyboard.down('KeyW');
 await p.waitForFunction(()=>window.kemudiSimulation.snapshot().position[2]<-66);await p.keyboard.up('KeyW');await p.keyboard.down('KeyS');
 await p.waitForFunction(()=>Math.abs(window.kemudiSimulation.snapshot().speed)<.1);await p.keyboard.up('KeyS');
 const state=await p.evaluate(()=>window.kemudiSimulation.snapshot());assert.ok(state.position[0]<0);
 assert.equal(state.intersection.agents.length,0,'legacy box-car demo is replaced, not run alongside shared traffic');
 assert.equal(state.traffic.length,16,'all sixteen shared-world traffic vehicles remain registered');
 assert.ok(state.traffic.every(v=>v.active&&v.loaded),'all traffic vehicles are safely spawned actual loaded models, not inactive placeholders');
 assert.ok(state.traffic.filter(v=>Math.hypot(v.position[0]-state.position[0],v.position[2]-state.position[2])<40).every(v=>v.groupVisible),'nearby traffic remains rendered while distant traffic may use LOD');
 assert.equal(new Set(state.traffic.map(v=>v.id)).size,16,'traffic IDs are unique');
 assert.deepEqual([...new Set(state.traffic.map(v=>v.type))].sort(),['MOBIL','MOTOR','TRUK']);
 assert.ok(state.traffic.every(v=>v.position.every(Number.isFinite)&&Number.isFinite(v.speed)),'traffic poses/speeds stay finite');
 assert.deepEqual(errors,[]);
 const resources=await p.evaluate(()=>{
  const renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(64,64);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,1,.1,300);camera.position.set(0,60,0);camera.lookAt(0,0,0);scene.add(new THREE.AmbientLight(0xffffff));
  const cycles=[];
  for(let i=0;i<3;i++){
   const demo=new IntersectionSystem(scene,{center:[0,.09,0]});renderer.render(scene,camera);const loaded=renderer.info.memory.geometries;
   demo.dispose();renderer.render(scene,camera);cycles.push({loaded,remaining:renderer.info.memory.geometries});
  }
  renderer.dispose();renderer.forceContextLoss();return cycles;
 });
 assert.ok(resources.every(c=>c.loaded>0&&c.remaining===0));
 fs.writeFileSync('artifacts/intersection/browser-report.json',JSON.stringify({passed:true,checks:['actual renderer loads connected road with sixteen shared-world MOTOR/MOBIL/TRUK agents and no duplicate demo','driver and overhead screenshots','F2 geometry/IDs/phase overlay','pause freezes controller and AI','player drives and brakes in left inbound lane','three create/render/dispose cycles release all GPU geometries'],errors,state,resources},null,2));console.log('Intersection browser passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
