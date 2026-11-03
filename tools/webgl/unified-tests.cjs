const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'src/Kemudi.Web/wwwroot/simulation-3d');
const THREE=require(path.join(source,'vendor/three.min.js'));
const data=JSON.parse(fs.readFileSync(path.join(source,'models/city/colliders.json')));
THREE.GLTFLoader=class {load(url,success){success({scene:new THREE.Group()});}};
const ctx={THREE,window:{},fetch:async()=>({ok:true,json:async()=>structuredClone(data)})};vm.createContext(ctx);
for(const file of ['intersection.js','long-road.js','city-track.js']){vm.runInContext(fs.readFileSync(path.join(source,file),'utf8'),ctx);Object.assign(ctx,ctx.window);}
(async()=>{
 const track=new ctx.window.CityTrack(new THREE.Scene());await track.build();const checks=[];
 assert.equal(track.intersections.length,2);assert.equal(track.pedestrianZones.length,0);
 assert.equal(track.intersections[1].controller.current.id,'START_ALL_RED');checks.push('two safe junctions in one world; pedestrian crossings disabled');
 const road=track.longRoad;
 assert.ok(road.samples[0].point.distanceTo(new THREE.Vector3(0,.09,-140))<1e-6);
 assert.ok(road.samples.at(-1).point.distanceTo(new THREE.Vector3(0,.09,-340))<1e-6);
 assert.ok(road.frame(0).forward.dot(new THREE.Vector3(0,0,-1))>.999);
 assert.ok(road.frame(road.length).forward.dot(new THREE.Vector3(0,0,-1))>.999);
 const vehicle={position:new THREE.Vector3(),rotation:0,config:{dimensions:{width:2.3,length:7.8,height:3.5}},speed:1};
 for(let s=0;s<=road.length;s+=1){const f=road.frame(s);for(const side of [-1,1]){vehicle.position.copy(f.point).addScaledVector(f.left,side*1.75);vehicle.rotation=Math.atan2(-f.forward.x,-f.forward.z);assert.ok(track.isOnRoad(vehicle.position));assert.equal(track.collisionAt(vehicle),null,'truck clearance at '+s);}}
 for(const z of [-139.99,-140,-140.01,-339.99,-340,-340.01])assert.ok(track.isOnRoad(new THREE.Vector3(-1.75,.09,z)));
 checks.push('continuous aligned seams, left/right lanes and truck clearance across full curved road');
 road.group.traverse(o=>{if(o.name==='asphalt'||o.name==='sidewalk'){const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>.99);}});
 checks.push('road and pavement face upward');
 vehicle.position.set(-1.75,.09,-133);assert.equal(track.hasFinished(vehicle),false);vehicle.position.z=-451;assert.equal(track.hasFinished(vehicle),true);vehicle.speed=-1;assert.equal(track.hasFinished(vehicle),false);checks.push('finish moved beyond second junction');
 track.updateTrafficLights(.25);assert.ok(track.intersections.every(j=>j.controller.startup<1));track.resetTraffic();assert.ok(track.intersections.every(j=>j.controller.startup===1));
 for(const j of track.intersections){const d=j.definition,a=d.approaches.find(a=>a.id==='S');const v={position:d.point(a,-d.stopDistance-2+.1),config:{dimensions:{length:4}},getForwardDirection:()=>a.forward};assert.equal(track.crossedRed(d.point(a,-d.stopDistance-2-.1),v),true);}
 checks.push('both controllers update/reset and both junctions report red crossing');
 const output=path.join(root,'artifacts/unified');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'unit-report.json'),JSON.stringify({passed:true,checks,lengthMeters:road.length},null,2));console.log(checks.join('\n'));
})().catch(e=>{console.error(e);process.exitCode=1;});
