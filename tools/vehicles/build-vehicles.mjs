/** Original Kemudi training vehicles. Metres, Y up, forward -Z.
 * Rebuild: node tools/vehicles/build-vehicles.mjs
 * No downloaded geometry, textures, paid services, or extra dependencies.
 */
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const project = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(project, 'public/models/kemudi');
const unity = path.join(project, 'simulation/Kemudi.Simulation/Assets/Resources/KemudiVehicles');
// GLTFExporter uses only this browser FileReader method for binary exports.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); }); }
};
const material = (name, color, metalness = 0, roughness = .55, opacity = 1) => {
  const m = new T.MeshStandardMaterial({ color, metalness, roughness, transparent: opacity < 1, opacity });
  m.name = name;
  if (opacity < 1) { m.depthWrite = false; m.side = T.DoubleSide; }
  return m;
};
const mats = {
  rubber: material('Rubber', '#141c29', 0, .9), trim: material('Graphite', '#243346', .15),
  alloy: material('Brushed alloy', '#b9c9da', .65, .3), seat: material('Upholstery', '#33465a', 0, .95),
  glass: material('Clear glazing', '#6fa1b4', .12, .19, .32), white: material('Pearl', '#e3eaf0', .3, .32),
  led: material('Headlights', '#edfcff', .1, .22), red: material('Tail lights', '#ef4444', .1),
  amber: material('Indicators', '#ffb34d'), screen: material('Instrument display', '#163946', .1),
};
mats.led.emissive.set('#b4eaff'); mats.led.emissiveIntensity = .5;
mats.red.emissive.set('#d52b32'); mats.red.emissiveIntensity = .25;
let serial = 0;
function group(parent, name, position = [0,0,0]) {
  const g = new T.Group(); g.name = name; g.position.set(...position); parent.add(g); return g;
}
function mesh(parent, geometry, mat, position = [0,0,0], rotation = [0,0,0], name) {
  const m = new T.Mesh(geometry, mat); m.name = name ?? `Part_${++serial}`;
  m.position.set(...position); m.rotation.set(...rotation); parent.add(m); return m;
}
function box(parent, size, position, mat, radius = .025, rotation = [0,0,0]) {
  return mesh(parent, new RoundedBoxGeometry(...size, 1, Math.min(radius, ...size.map(v => v / 3))), mat, position, rotation);
}
function bar(parent, a, b, radius, mat) {
  const av = new T.Vector3(...a), bv = new T.Vector3(...b), direction = bv.clone().sub(av);
  const m = mesh(parent, new T.CylinderGeometry(radius, radius, direction.length(), 8), mat, av.add(bv).multiplyScalar(.5).toArray());
  m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), direction.normalize()); return m;
}
function panel(parent, points, mat) {
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(points.flat(),3));
  geo.setIndex([0,1,2,0,2,3]); geo.computeVertexNormals(); return mesh(parent, geo, mat);
}
function wheel(parent, label, x, z, radius, width, front) {
  const pivot = group(parent, `${front ? 'Steer' : 'Axle'}_${label}`, [x,radius,z]);
  const roll = group(pivot, `Wheel_${label}`); roll.userData.radius = radius;
  const profile = [[.68,-.5],[.91,-.5],[1,-.32],[1,.32],[.91,.5],[.68,.5]].map(([r,y])=>new T.Vector2(r*radius,y*width));
  mesh(roll, new T.LatheGeometry(profile,20), mats.rubber,[0,0,0],[0,0,Math.PI/2]);
  for (const side of [-1,1]) {
    mesh(roll,new T.CylinderGeometry(radius*.68,radius*.68,.018,20),mats.trim,[side*(width/2+.006),0,0],[0,0,Math.PI/2]);
    mesh(roll,new T.TorusGeometry(radius*.68,.018,6,24),mats.alloy,[side*(width/2+.02),0,0],[0,Math.PI/2,0]);
    for(let i=0;i<5;i++) {
      const angle=i*Math.PI*2/5;
      box(roll,[.025,radius*.95,.035],[side*(width/2+.026),Math.cos(angle)*radius*.2,Math.sin(angle)*radius*.2],mats.alloy,.006,[angle,0,0]);
    }
    mesh(roll,new T.CylinderGeometry(radius*.17,radius*.17,.035,12),mats.alloy,[side*(width/2+.03),0,0],[0,0,Math.PI/2]);
  }
  return pivot;
}
function seat(parent,x,y,z,scale=1) {
  box(parent,[.48*scale,.13*scale,.48*scale],[x,y,z],mats.seat,.06);
  box(parent,[.46*scale,.52*scale,.12*scale],[x,y+.27*scale,z+.21*scale],mats.seat,.045,[-.1,0,0]);
  box(parent,[.28*scale,.18*scale,.12*scale],[x,y+.59*scale,z+.23*scale],mats.trim,.035);
}
function cockpit(parent,x,y,z,scale=1) {
  const pivot = group(parent,'SteeringWheel',[x,y,z]);
  mesh(pivot,new T.TorusGeometry(.18*scale,.019*scale,8,24),mats.trim);
  box(pivot,[.3*scale,.035*scale,.03],[0,0,0],mats.alloy,.008);
  box(pivot,[.055*scale,.17*scale,.03],[0,-.06*scale,0],mats.alloy,.008);
  box(pivot,[.10*scale,.075*scale,.045],[0,0,.015],mats.trim,.012);
  box(parent,[.32*scale,.13*scale,.035],[x,y+.08,z-.14],mats.screen,.015);
  for(let i=0;i<3;i++) box(parent,[.035,.045+i*.015,.007],[x-.1+i*.095,y+.08,z-.118],mats.led,.003);
}
function makeCar() {
  const root = group(new T.Group(),'Kemudi_Mobil');
  const paint=material('Ocean blue','#2876ac',.55,.28);
  const motion=group(root,'BodyMotion',[0,.675,0]), body=group(motion,'Body',[0,-.675,0]);
  // Sculpted nose and shoulders, with a lowered bonnet and a continuous waistline.
  const outline = new T.Shape();
  outline.moveTo(-2.04,.43); outline.lineTo(-2.04,.68); outline.quadraticCurveTo(-1.95,.82,-1.45,.86);
  outline.lineTo(-.92,.91); outline.lineTo(1.47,.91); outline.quadraticCurveTo(2.02,.88,2.04,.72);
  outline.lineTo(2.04,.43); outline.lineTo(1.69,.43);
  outline.absarc(1.3,.32,.405,.275,Math.PI-.275,false);
  outline.lineTo(-.91,.43); outline.absarc(-1.3,.32,.405,.275,Math.PI-.275,false);
  outline.lineTo(-2.04,.43);
  const hull = new T.ExtrudeGeometry(outline,{depth:1.64,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:10});
  hull.translate(0,0,-.82); hull.rotateY(-Math.PI/2);
  mesh(body,hull,paint);
  box(body,[1.68,.34,.72],[0,.75,1.65],paint,.08);
  mesh(body,new RoundedBoxGeometry(1.6,.11,1.62,3,.04),mats.white,[0,1.45,.20]);
  for(const side of [-1,1]) {
    box(body,[.09,.20,2.56],[side*.84,.64,.08],mats.trim,.025);
    bar(body,[side*.8,.91,-1.02],[side*.73,1.42,-.55],.037,paint);
    bar(body,[side*.8,.95,1.35],[side*.73,1.42,.99],.047,paint);
    bar(body,[side*.78,.88,.35],[side*.75,1.42,.35],.027,mats.trim);
    // Doors pivot at their forward edge, so they can open without moving the cabin.
    const door=group(body,side>0?'Door_R':'Door_L',[side*.82,.93,-1.02]);
    box(door,[.065,.30,1.33],[0,-.095,.70],paint,.025);
    box(door,[.025,.033,.17],[side*.045,.035,1.13],mats.alloy,.007);
    panel(door,[[0,.02,.04],[0,.47,.48],[0,.47,1.34],[0,.02,1.34]],mats.glass);
    bar(door,[0,.47,.48],[0,.47,1.34],.018,paint);
    bar(door,[0,.02,1.34],[0,.47,1.34],.018,mats.trim);
    box(body,[.08,.30,.97],[side*.82,.84,.86],paint,.025);
    panel(body,[[side*.78,.96,.39],[side*.75,1.4,.39],[side*.73,1.4,.97],[side*.8,.96,1.3]],mats.glass);
    bar(body,[side*.83,1.02,-.91],[side*.96,1.04,-.83],.025,mats.trim);
    box(body,[.18,.12,.22],[side*.98,1.05,-.81],paint,.04);
    box(body,[.14,.08,.012],[side*.98,1.05,-.69],mats.alloy,.015);
    seat(body,side*.46,.68,.16);
    for(const axleZ of [-1.3,1.3]) {
      mesh(body,new T.TorusGeometry(.40,.025,5,18,Math.PI),mats.trim,[side*.851,.32,axleZ],[0,side*Math.PI/2,0]);
    }
    box(body,[.024,.025,2.4],[side*.865,.94,.1],mats.alloy,.005);
    box(body,[.024,.025,.2],[side*.865,.92,.94],mats.alloy,.005);
    box(body,[.42,.075,.05],[side*.54,.88,-2.02],mats.led,.015);
    box(body,[.39,.09,.04],[side*.56,.91,2.02],mats.red,.015);
    box(body,[.11,.035,.05],[side*.76,.78,-2.02],mats.amber,.01);
  }
  panel(body,[[-.78,.95,-1.04],[.78,.95,-1.04],[.72,1.41,-.56],[-.72,1.41,-.56]],mats.glass);
  panel(body,[[-.73,1.41,1],[.73,1.41,1],[.8,.98,1.36],[-.8,.98,1.36]],mats.glass);
  box(body,[1.48,.13,.42],[0,.95,-.78],mats.trim,.03);
  box(body,[.33,.19,.04],[0,1.04,-.54],mats.screen,.025);
  box(body,[.22,.14,.78],[0,.68,.1],mats.trim,.035);
  cockpit(body,.46,1.04,-.47);
  box(body,[1.64,.16,.18],[0,.46,-2.01],mats.trim,.04);
  box(body,[1.64,.14,.15],[0,.48,2.03],mats.trim,.04);
  box(body,[.72,.16,.035],[0,.72,-2.03],mats.trim,.014);
  for(let i=0;i<5;i++) box(body,[.6,.012,.015],[0,.67+i*.025,-2.054],mats.alloy,.003);
  box(body,[.36,.095,.018],[0,.55,-2.105],mats.white,.008);
  box(body,[1.52,.055,.24],[0,1.48,1.02],paint,.025);
  for(const x of [-.38,.38]) bar(body,[x,.97,-1.045],[x+.27,1.02,-.995],.008,mats.trim);
  wheel(root,'FL',-.82,-1.3,.32,.20,true); wheel(root,'FR',.82,-1.3,.32,.20,true);
  wheel(root,'RL',-.82,1.3,.32,.20,false); wheel(root,'RR',.82,1.3,.32,.20,false);
  return root;
}
function makeTruck() {
  const root=group(new T.Group(),'Kemudi_Truk'), paint=material('Logistics teal','#168880',.35,.36);
  const motion=group(root,'BodyMotion',[0,1.305,0]), body=group(motion,'Body',[0,-1.305,0]);
  box(body,[1.95,.22,6.2],[0,.68,0],mats.trim,.04);
  box(body,[2.18,.76,1.74],[0,1.19,-2.36],paint,.08);
  box(body,[2.21,.13,1.84],[0,2.48,-2.32],paint,.05);
  box(body,[2.25,1.93,4.38],[0,1.915,.97],mats.white,.045);
  box(body,[2.27,.30,4.30],[0,1.40,.97],paint,.01);
  for(const side of [-1,1]) {
    bar(body,[side*1.04,1.58,-3.18],[side*1.01,2.43,-3.12],.048,paint);
    bar(body,[side*1.04,1.58,-1.50],[side*1.01,2.43,-1.53],.06,paint);
    const door=group(body,side>0?'Door_R':'Door_L',[side*1.08,1.65,-3.12]);
    panel(door,[[0,0,.03],[0,.72,.03],[0,.72,1.43],[0,0,1.43]],mats.glass);
    box(door,[.06,.25,1.43],[0,-.12,.72],paint,.018);
    box(door,[.025,.045,.19],[side*.04,-.08,1.18],mats.alloy,.01);
    bar(body,[side*1.08,2.12,-3.02],[side*1.22,2.12,-3.02],.025,mats.trim);
    box(body,[.10,.32,.18],[side*1.23,2.02,-3.02],mats.trim,.025);
    box(body,[.13,.15,.83],[side*1.13,.79,-2.15],mats.alloy,.018);
    box(body,[.42,.12,.035],[side*.75,1.11,-3.25],mats.led,.015);
    box(body,[.32,.09,.04],[side*.82,.84,3.23],mats.red,.01);
    seat(body,side*.55,1.38,-2.15,1.12);
    for(let i=0;i<10;i++) box(body,[.016,1.35,.025],[side*1.135,2.03,-.92+i*.42],mats.alloy,.004);
  }
  panel(body,[[-1,1.64,-3.23],[1,1.64,-3.23],[1,2.41,-3.17],[-1,2.41,-3.17]],mats.glass);
  box(body,[2.01,.20,.42],[0,1.65,-2.90],mats.trim,.03);
  cockpit(body,.55,1.87,-2.61,1.2);
  box(body,[1.2,.29,.025],[0,1.25,-3.25],mats.trim,.015);
  for(let i=0;i<4;i++) box(body,[1.13,.017,.018],[0,1.15+i*.065,-3.27],mats.alloy,.005);
  box(body,[2.2,.22,.18],[0,.82,-3.26],mats.trim,.03);
  for(const x of [-.55,.55]) box(body,[1.04,1.76,.035],[x,1.94,3.18],mats.white,.02);
  for(const x of [-.27,.27]) bar(body,[x,1.12,3.21],[x,2.74,3.21],.018,mats.alloy);
  // Aerodynamic cab visor, marker lamps and a stepped bumper.
  box(body,[2.18,.08,.26],[0,2.42,-3.19],paint,.025,[.12,0,0]);
  for(const x of [-.8,0,.8]) box(body,[.11,.045,.035],[x,2.53,-3.13],mats.amber,.006);
  for(const x of [-.55,.55]) bar(body,[x,1.68,-3.235],[x+.30,1.86,-3.22],.012,mats.trim);
  box(body,[.44,.12,.02],[0,.84,-3.355],mats.white,.006);
  for(const side of [-1,1]) {
    box(body,[.10,.11,2.24],[side*1.13,.69,-.03],mats.alloy,.01);
    for(const z of [-.9,.8,2.7]) box(body,[.025,.055,.12],[side*1.145,1.03,z],mats.amber,.004);
  }
  wheel(root,'FL',-1.03,-2.35,.43,.27,true); wheel(root,'FR',1.03,-2.35,.43,.27,true);
  wheel(root,'RL',-1.03,1.25,.43,.27,false); wheel(root,'RR',1.03,1.25,.43,.27,false);
  wheel(root,'RL2',-1.03,2.38,.43,.27,false); wheel(root,'RR2',1.03,2.38,.43,.27,false);
  return root;
}
function makeMotor() {
  const root=group(new T.Group(),'Kemudi_Motor'),paint=material('Amber orange','#ed8c32',.3,.35);
  const motion=group(root,'BodyMotion',[0,.6075,0]),body=group(motion,'Body',[0,-.6075,0]);
  const front=wheel(root,'F',0,-.65,.30,.12,true); wheel(root,'R',0,.65,.30,.15,false);
  box(body,[.35,.32,.44],[0,.49,.02],mats.trim,.06);
  for(const side of [-1,1]) {
    bar(body,[side*.12,.3,.65],[side*.15,.51,-.05],.033,mats.alloy);
    bar(body,[side*.13,.35,.3],[side*.16,.8,-.3],.025,mats.trim);
    bar(body,[side*.13,.38,.62],[side*.16,.76,.32],.027,mats.alloy);
    box(body,[.12,.10,.54],[side*.24,.36,.40],mats.alloy,.035);
    bar(body,[side*.12,.64,.34],[side*.13,.82,-.35],.025,mats.trim);
    box(body,[.06,.028,.16],[side*.23,.42,.04],mats.trim,.009);
  }
  box(body,[.42,.25,.50],[0,.84,-.22],paint,.09,[.08,0,0]);
  box(body,[.34,.11,.60],[0,.86,.32],mats.seat,.05,[-.07,0,0]);
  box(body,[.30,.17,.38],[0,.77,.60],paint,.06);
  box(body,[.19,.07,.04],[0,.82,.82],mats.red,.015);
  box(body,[.15,.12,.022],[0,.61,.88],mats.white,.01);
  for(const side of [-1,1]) {
    bar(front,[side*.10,0,0],[side*.10,.72,.1],.025,mats.alloy);
    bar(front,[0,.76,.12],[side*.32,.78,.12],.022,mats.alloy);
    bar(front,[side*.27,.78,.12],[side*.35,.78,.15],.035,mats.trim);
    bar(front,[side*.25,.78,.12],[side*.31,.98,.11],.012,mats.alloy);
    box(front,[.15,.075,.035],[side*.31,1.0,.11],mats.trim,.015);
    box(front,[.12,.055,.012],[side*.31,1.0,.134],mats.alloy,.012);
  }
  box(front,[.23,.15,.16],[0,.58,-.015],paint,.045);
  box(front,[.18,.075,.025],[0,.58,-.105],mats.led,.018);
  box(front,[.18,.045,.15],[0,.73,.11],mats.screen,.012,[-.25,0,0]);
  box(front,[.16,.055,.44],[0,.32,0],paint,.025);
  // Tank volume, engine cooling fins and a curved front mudguard.
  const tank=mesh(body,new T.SphereGeometry(1,16,10),paint,[0,.87,-.23]); tank.scale.set(.205,.16,.28);
  for(let i=0;i<4;i++) mesh(body,new T.BoxGeometry(.37,.02,.23),mats.alloy,[0,.46+i*.045,.02]);
  mesh(front,new T.TorusGeometry(.335,.04,5,18,Math.PI),paint,[0,0,0],[0,Math.PI/2,0]);
  return root;
}
// Merge only static leaf siblings; pivots remain independent for animation.
function batchStatic(root) {
  root.children.filter(c=>c.isGroup).forEach(batchStatic);
  const batches=new Map();
  root.children.filter(c=>c.isMesh).forEach(m=>{ const list=batches.get(m.material)??[]; list.push(m); batches.set(m.material,list); });
  for(const [mat,meshes] of batches) {
    const geos=meshes.map(m=>{m.updateMatrix(); const g=m.geometry.clone(); g.deleteAttribute('uv'); g.applyMatrix4(m.matrix); return g.index?g.toNonIndexed():g;});
    const geo=mergeGeometries(geos); meshes.forEach(m=>root.remove(m));
    mesh(root,geo,mat,[0,0,0],[0,0,0],`${root.name}_${mat.name.replaceAll(' ','_')}`);
  }
}
function unityRecipe(root) {
  const materials=[],geometries=[],nodes=[]; const matMap=new Map();
  function visit(object,parent) {
    const id=nodes.length;
    const n={name:object.name,parent,position:object.position.toArray(),rotation:object.quaternion.toArray(),scale:object.scale.toArray(),geometry:-1,material:-1,radius:object.userData.radius??0}; nodes.push(n);
    if(object.isMesh) {
      const g=object.geometry, m=object.material;
      if(!matMap.has(m)) {matMap.set(m,materials.length); materials.push({name:m.name,color:`#${m.color.getHexString()}`,metalness:m.metalness,roughness:m.roughness,opacity:m.opacity,emission:`#${m.emissive.getHexString()}`,emissionIntensity:m.emissiveIntensity});}
      n.material=matMap.get(m);n.geometry=geometries.length;
      geometries.push({vertices:Array.from(g.attributes.position.array),normals:Array.from(g.attributes.normal.array),indices:g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i)});
    }
    object.children.forEach(c=>visit(c,id));
  }
  visit(root,-1);return {version:1,materials,geometries,nodes};
}
export { group, mesh, box, bar, panel, material, batchStatic, unityRecipe };
export async function buildVehicles() {
await mkdir(output,{recursive:true}); await mkdir(unity,{recursive:true});
const manifest={version:1,author:'Kemudi.id project',provenance:'Original procedural geometry authored for this project; no third-party models or textures.',units:'metres',up:'+Y',forward:'-Z',assets:[]};
for(const [type,build] of [['mobil',makeCar],['motor',makeMotor],['truk',makeTruck]]) {
  const root=build(); batchStatic(root); root.updateMatrixWorld(true);
  const tracks=[]; root.traverse(o=>{ if(!o.name.startsWith('Wheel_')||!o.isGroup)return;
    const times=[0,.25,.5,.75,1],values=[]; for(const t of times)values.push(...new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI*2*t).toArray());
    tracks.push(new T.QuaternionKeyframeTrack(`${o.name}.quaternion`,times,values));
  });
  const animation=new T.AnimationClip('Wheel_Roll',1,tracks);
  const driveTracks=[new T.VectorKeyframeTrack(`${root.name}.position`,[0,4],[0,0,0,0,0,-8])];
  root.traverse(o=>{
    if(!o.name.startsWith('Wheel_')||!o.isGroup)return;
    const times=[],values=[];
    for(let frame=0;frame<=120;frame++) {
      const t=frame/30;times.push(t);
      values.push(...new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-2*t/o.userData.radius).toArray());
    }
    driveTracks.push(new T.QuaternionKeyframeTrack(`${o.name}.quaternion`,times,values));
  });
  const drive=new T.AnimationClip('Drive_Forward',4,driveTracks);
  const binary=await new GLTFExporter().parseAsync(root,{binary:true,animations:[animation,drive]});
  const bytes=Buffer.from(binary); const recipe=unityRecipe(root);
  const triangles=recipe.geometries.reduce((sum,g)=>sum+g.indices.length/3,0);
  if(triangles>25000)throw new Error(`${type}: triangle budget exceeded: ${triangles}`);
  await writeFile(path.join(output,`${type}.glb`),bytes);
  await writeFile(path.join(unity,`${type}.json`),JSON.stringify(recipe));
  const bounds=new T.Box3().setFromObject(root);
  manifest.assets.push({type,file:`${type}.glb`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),triangles,meshes:recipe.geometries.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},animations:['Wheel_Roll','Drive_Forward']});
  console.log(`${type}: ${triangles} triangles, ${recipe.geometries.length} meshes, ${(bytes.length/1024).toFixed(0)} KiB`);
}
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildVehicles();
