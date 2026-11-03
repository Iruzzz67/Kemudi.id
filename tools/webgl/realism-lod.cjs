const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const THREE=require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const context={THREE,window:{},console};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../src/Kemudi.Web/wwwroot/simulation-3d/systems/traffic-visual-lod.js'),'utf8'),context);
const {TrafficVisualLOD}=context.window,scene=new THREE.Scene(),lod=new TrafficVisualLOD(scene);
function actor(type,id) {
  const dimensions={MOTOR:{length:2.26,width:1.02,height:1.38},MOBIL:{length:4.65,width:2.31,height:1.516},TRUK:{length:6.47,width:2.88,height:3.27}}[type];
  const v={id,type,active:true,position:new THREE.Vector3(),group:new THREE.Group(),model:new THREE.Group(),config:{dimensions,driverEyeRatio:type==='TRUK'?.7:.85,seatOffsetX:type==='MOTOR'?0:-.25,seatOffsetZ:type==='TRUK'?-2.1:0},lightState:{lowBeam:true,brake:true,left:true,blink:true}};
  v.group.add(v.model);scene.add(v.group);return v;
}
let meshes=0;
for(const [i,type] of ['MOTOR','MOBIL','TRUK'].entries()) {
  const v=actor(type,'traffic:'+i),char={group:new THREE.Group()};v.group.add(char.group);
  const proxy=lod.registerVehicle(v,char);assert.ok(proxy);assert.equal(lod.registerVehicle(v,char),proxy);
  let count=0;proxy.traverse(o=>{if(o.isMesh)count++;});assert.ok(count<=10);meshes+=count;
  assert.ok(proxy.getObjectByName(type==='MOTOR'?'LOD_Helmet':'LOD_Driver'));
  lod.update(new THREE.Vector3(0,0,30));assert.equal(v.model.visible,true);assert.equal(proxy.visible,false);assert.equal(char.group.visible,true);
  lod.update(new THREE.Vector3(0,0,39));assert.equal(v.model.visible,true,'near remains near through hysteresis');
  lod.update(new THREE.Vector3(0,0,41));assert.equal(v.model.visible,false);assert.equal(proxy.visible,true);assert.equal(char.group.visible,false);
  lod.update(new THREE.Vector3(0,0,37));assert.equal(v.model.visible,false,'proxy remains through hysteresis');
  lod.update(new THREE.Vector3(0,0,34));assert.equal(v.model.visible,true);assert.equal(proxy.visible,false);
  lod.update(new THREE.Vector3(0,0,121));assert.equal(v.group.visible,false);
  lod.update(new THREE.Vector3(0,0,116));assert.equal(v.group.visible,false,'culled stays culled until 110m');
  lod.update(new THREE.Vector3(0,0,109));assert.equal(v.group.visible,true);assert.equal(proxy.visible,true);
  v.active=false;lod.update(new THREE.Vector3());assert.equal(v.group.visible,false,'inactive actor never revealed');
  v.active=true;lod.update(new THREE.Vector3());assert.equal(v.group.visible,true);assert.equal(v.model.visible,true);
  lod.update(new THREE.Vector3(0,0,70));lod.unregisterVehicle(v.id);
  assert.equal(v.model.visible,true);assert.equal(char.group.visible,true);assert.equal(v.group.visible,true);assert.equal(proxy.parent,null);
}
const player=actor('MOBIL','player');assert.equal(lod.registerVehicle(player),null);lod.update(new THREE.Vector3(500,0,0));assert.equal(player.model.visible,true);assert.equal(player.group.visible,true);
const hidden=actor('TRUK','traffic:hidden');hidden.model.visible=false;const hiddenChar={group:new THREE.Group()};hiddenChar.group.visible=false;
lod.registerVehicle(hidden,hiddenChar);lod.update(new THREE.Vector3(90,0,0));lod.unregisterVehicle(hidden.id);assert.equal(hidden.model.visible,false);assert.equal(hiddenChar.group.visible,false);
const disposable=actor('MOBIL','traffic:dispose');const proxy=lod.registerVehicle(disposable);
let geometryDisposals=0,materialDisposals=0;lod.geometries.forEach(g=>g.addEventListener('dispose',()=>geometryDisposals++));lod.materials.forEach(m=>m.addEventListener('dispose',()=>materialDisposals++));
const geometryCount=lod.geometries.size,materialCount=lod.materials.size;
assert.ok(geometryCount<=4);assert.ok(materialCount<=10);
for(let i=0;i<200;i++)lod.update(new THREE.Vector3(i%140,0,0));assert.equal(lod.geometries.size,geometryCount);assert.equal(lod.materials.size,materialCount);
lod.dispose();lod.dispose();assert.equal(proxy.parent,null);assert.equal(disposable.model.visible,true);assert.equal(geometryDisposals,geometryCount);assert.equal(materialDisposals,materialCount);
console.log(`PASS traffic render LOD: 3 silhouettes (${meshes} proxy drawables total), <=4 shared geometries/10 materials, hysteresis, inactivity, player exclusion, restoration and idempotent disposal`);
