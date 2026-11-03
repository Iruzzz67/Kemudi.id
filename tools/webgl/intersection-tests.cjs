const assert = require('node:assert/strict');
const fs = require('node:fs'); const vm = require('node:vm');
process.chdir(require('node:path').resolve(__dirname, '../..'));
const THREE = require('../../src/Kemudi.Web/wwwroot/simulation-3d/vendor/three.min.js');
const ctx = { THREE, window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/Kemudi.Web/wwwroot/simulation-3d/intersection.js', 'utf8'), ctx);
const { IntersectionDefinition, TrafficSignalController, IntersectionSystem } = ctx.window;
const checks=[]; function check(name, fn) { fn(); checks.push(name); console.log('PASS',name); }
check('four headings, left lanes, graph connections and geometry ordering in metres',()=>{
 const d=new IntersectionDefinition();
 for(const a of d.approaches){
  const inbound=d.point(a,-40), cross=d.center.clone().addScaledVector(a.forward,-d.crosswalkDistance);
  assert.ok(inbound.clone().sub(d.center).dot(a.forward)<0);
  assert.ok(new THREE.Vector3().crossVectors(a.forward, a.left).dot(new THREE.Vector3(0,1,0))>0);
  assert.ok(Math.abs(inbound.clone().sub(d.center).dot(a.left)-1.75)<1e-6);
  assert.ok(-d.stopDistance < -d.crosswalkDistance - 1.5);
  const connection=d.connections.find(c=>c.fromLane===a.inboundId);
  const outgoing=d.lanes.find(l=>l.id===connection.toLane);
  assert.ok(outgoing.direction.dot(a.forward)>.99);
 }
 assert.equal(d.lanes.length,8); assert.equal(d.connections.length,4);
});
check('signals face approaching traffic, single lens, stopline and stripe dimensions',()=>{
 const s=new IntersectionSystem(new THREE.Scene()); const d=s.definition;
 for(let i=0;i<4;i++){
  const a=d.approaches[i],v=s.signals[i];
  const face=new THREE.Vector3(0,0,1).applyQuaternion(v.group.quaternion);
  assert.ok(face.dot(a.forward)<-.99);
  const line=s.group.getObjectByName(a.stopLineId);
  assert.equal(line.geometry.parameters.width,3.5); assert.equal(line.geometry.parameters.height,.25);
  const stripe=s.group.getObjectByName(a.id+':zebra:0');
  assert.equal(stripe.geometry.parameters.width,.3); assert.equal(stripe.geometry.parameters.height,3);
  assert.ok(v.lenses[0].position.y>v.lenses[2].position.y);
 }
 for(let t=0;t<1200;t++){s.controller.update(.1);s.publish(); assert.equal(s.controller.current.colors.N!=='RED'&&s.controller.current.colors.E!=='RED',false);for(const head of s.signals)assert.equal(head.lenses.filter(l=>l.material.emissiveIntensity>0).length,1);}
 s.dispose();assert.equal(s.group.parent,null);
});
check('player red-light footprint detection respects inbound lane, heading and optional penalty',()=>{
 const s=new IntersectionSystem(new THREE.Scene()); const d=s.definition;
 for(const a of d.approaches){
  const vehicle={position:d.point(a,-d.stopDistance-2.1+.1),config:{dimensions:{length:4.2}},getForwardDirection:()=>a.forward};
  assert.equal(s.crossedRed(d.point(a,-d.stopDistance-2.1-.1),vehicle),true);
  vehicle.getForwardDirection=()=>a.forward.clone().negate();
  assert.equal(s.crossedRed(d.point(a,-d.stopDistance-2.1-.1),vehicle),false);
 }
 d.config.violationsEnabled=false;
 assert.equal(s.crossedRed(new THREE.Vector3(),{position:new THREE.Vector3(),config:{dimensions:{length:4.2}},getForwardDirection:()=>new THREE.Vector3(0,0,-1)}),false);
 assert.equal(s.group.getObjectByName('N:zebra:0').material.isMeshBasicMaterial,true);
 s.dispose();
});
check('phase sequence and startup all red; invalid phase rejected; negative dt ignored',()=>{
 const c=new TrafficSignalController(new IntersectionDefinition());
 assert.equal(c.current.id,'START_ALL_RED');c.update(-10);assert.equal(c.startup,1);
 c.update(1);assert.equal(c.current.id,'NS_GREEN');c.update(25);assert.equal(c.current.id,'NS_YELLOW');c.update(3);assert.equal(c.current.id,'ALL_RED_1');c.update(1);assert.equal(c.current.id,'EW_GREEN');c.update(25);assert.equal(c.current.id,'EW_YELLOW');c.update(3);assert.equal(c.current.id,'ALL_RED_2');c.update(1);assert.equal(c.current.id,'NS_GREEN');
 c.phases[0].colors.E='GREEN';assert.throws(()=>c.validate(),/Conflicting/);
});
check('AI red bumper stop, queues, no conflicting occupancy, clearing, restart over multiple cycles',()=>{
 const s=new IntersectionSystem(new THREE.Scene(),{greenNS:8,greenEW:8});const d=s.definition;const crossings=new Set();
 for(let step=0;step<60*100;step++){
  const before=s.agents.map(a=>a.front);s.update(1/60);
  const colors=s.controller.current.colors;
  for(let i=0;i<s.agents.length;i++){
   const a=s.agents[i];
   if(before[i]<=-d.stopDistance&&a.front>-d.stopDistance){assert.notEqual(colors[a.approach.id],'RED');crossings.add(a.approach.id);}
   if(!a.committed&&colors[a.approach.id]==='RED')assert.ok(a.front<=-d.stopDistance+1e-6);
  }
  for(let i=0;i<s.agents.length;i++)for(let j=i+1;j<s.agents.length;j++){
   const a=s.agents[i],b=s.agents[j];
   if(a.approach.id===b.approach.id)assert.ok(Math.abs(a.s-b.s)>=a.length+.5, JSON.stringify({step,a:a.s,b:b.s,ids:[a.id,b.id]}));
   if(a.approach.group!==b.approach.group)assert.equal(Math.abs(a.s)<5.6&&Math.abs(b.s)<5.6,false);
  }
 }
 assert.equal(crossings.size,4);s.dispose();
});
check('blocked exit holds green traffic and releases queue when exit clears',()=>{
 const s=new IntersectionSystem(new THREE.Scene());s.exitBlocked.S=true;
 for(let t=0;t<60*20;t++)s.update(1/60);
 assert.ok(s.agents.filter(a=>a.approach.id==='S').every(a=>!a.committed));
 s.exitBlocked.S=false;
 for(let t=0;t<60*70;t++)s.update(1/60);
 assert.ok(s.agents.filter(a=>a.approach.id==='S').some(a=>a.committed));s.dispose();
});
check('yellow decision uses comfortable stopping distance; committed car clears on red',()=>{
 const s=new IntersectionSystem(new THREE.Scene(),{carsPerApproach:1}); const a=s.agents.find(a=>a.approach.id==='S');
 s.controller.startup=0;s.controller.index=1;
 a.s=-30;a.speed=6;a.update(1/60,[]);assert.equal(a.yellowDecision,true);
 a.yellowDecision=null;a.s=-12;a.speed=6;a.update(1/60,[]);assert.equal(a.yellowDecision,false);
 a.s=0;a.committed=true;a.speed=3;s.controller.index=2;a.update(.1,[]);assert.ok(a.s>0);s.dispose();
});
check('asymmetric arm lengths bound lane graph and recycled vehicle footprints',()=>{
 const s=new IntersectionSystem(new THREE.Scene(),{armLengths:{S:47},greenNS:8,greenEW:8});const d=s.definition;
 for(const a of d.approaches)assert.equal(d.project(a,d.lanes.find(l=>l.id===a.inboundId).centerline[0]),-a.armLength);
 for(let t=0;t<60*130;t++){
  s.update(1/60);
  for(const a of s.agents){const exit=d.approaches.find(b=>b.forward.dot(a.approach.forward)<-.99);assert.ok(a.s-a.length/2>=-a.approach.armLength-1e-6);assert.ok(a.front<=exit.armLength+1e-6);}
 }
 s.exitBlocked.S=true;s.update(NaN);s.reset();assert.equal(s.player,null);assert.equal(s.exitBlocked.S,false);s.update(1/60);assert.ok(Number.isFinite(s.accumulator));s.dispose();
});
check('physical exit obstacles block green entry and occupied spawn waits safely',()=>{
 const s=new IntersectionSystem(new THREE.Scene(),{carsPerApproach:1});const d=s.definition;const a=s.agents.find(a=>a.approach.id==='S');
 s.controller.startup=0;
 const blocker={id:'parked-player',position:d.point(a.approach,d.stopDistance+2.1),length:4.2,width:1.7};
 for(let t=0;t<60*15;t++)a.update(1/60,[blocker]);assert.equal(a.committed,false);assert.ok(a.front<-d.stopDistance);
 for(let t=0;t<60*8;t++)a.update(1/60,[]);assert.equal(a.committed,true);
 const spawnBlock={...blocker,position:d.point(a.approach,-a.approach.armLength+a.length/2)};
 a.s=60-a.length/2;a.speed=2;a.update(1/60,[spawnBlock]);assert.equal(a.s,60-a.length/2);
 a.update(1/60,[]);assert.equal(a.s,-a.approach.armLength+a.length/2);assert.equal(a.committed,false);s.dispose();
});
check('invalid configuration fails early instead of hanging or generating NaN geometry',()=>{
 for(const options of [{reactionTime:-1},{targetSpeed:NaN},{buffer:-1},{carsPerApproach:1.5},{center:[0,NaN,0]},{armLengths:{S:0}}])assert.throws(()=>new IntersectionDefinition(options));
 const c=new TrafficSignalController(new IntersectionDefinition());c.phases[0].duration=0;assert.throws(()=>c.validate(),/Invalid signal phase/);c.phases[0].duration=25;c.phases[0].colors.N='BLUE';assert.throws(()=>c.validate(),/Invalid signal phase/);
});
check('AI brakes comfortably for red and stops with its bumper upstream',()=>{
 const s=new IntersectionSystem(new THREE.Scene(),{carsPerApproach:1});const a=s.agents.find(a=>a.approach.id==='S');a.s=-30;a.speed=6;a.sync();
 for(let t=0;t<60*20;t++){const speed=a.speed;a.update(1/60,[]);assert.ok(speed-a.speed<=s.definition.config.deceleration/60+1e-6);assert.ok(a.front<-s.definition.stopDistance);}
 assert.ok(a.speed<.01);s.dispose();
});
fs.mkdirSync('artifacts/intersection',{recursive:true});fs.writeFileSync('artifacts/intersection/unit-report.json',JSON.stringify({passed:true,checks},null,2));

