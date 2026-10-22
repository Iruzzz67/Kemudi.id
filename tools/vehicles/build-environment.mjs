/** Original tropical streetscape. Metres, Y-up, facades face +Z.
 * Rebuild with node tools/vehicles/build-environment.mjs. No external assets.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import { group, mesh, bar, material, batchStatic, unityRecipe } from './build-vehicles.mjs';

const out = new URL('../../public/models/kemudi/environment/', import.meta.url);
const unity = new URL('../../simulation/Kemudi.Simulation/Assets/Resources/KemudiEnvironment/', import.meta.url);
const m = {
  plaster: material('Limestone trim','#efe7d5',0,.88), roof: material('Terracotta','#a5523d',0,.85),
  tile: material('Tile ridges','#c27350',0,.88), wood: material('Teak','#83563b',0,.8),
  frame: material('Charcoal frames','#2e4145',.15,.45), glass: material('Blue glazing','#547d88',.25,.25),
  stone: material('Paving','#b9b7a4',0,.95), green: material('Garden foliage','#4c7040',0,1),
};
const cube=(p,s,pos,mat,rot=[0,0,0])=>mesh(p,new T.BoxGeometry(...s),mat,pos,rot);
function window(p,x,y,z,w=1.35,h=1.25) {
  cube(p,[w+.16,h+.16,.13],[x,y,z],m.plaster);
  cube(p,[w,h,.15],[x,y,z+.025],m.frame);
  cube(p,[w-.12,h-.12,.02],[x,y,z+.11],m.glass);
  cube(p,[.055,h,.025],[x,y,z+.13],m.plaster);
  cube(p,[w,.045,.025],[x,y+.08,z+.13],m.plaster);
  cube(p,[w+.28,.10,.30],[x,y-h/2-.08,z+.08],m.plaster);
}
function roof(p,w,d,eave,rise) {
  const v=[[-w/2,eave,-d/2],[w/2,eave,-d/2],[w/2,eave,d/2],[-w/2,eave,d/2],[-w*.25,eave+rise,0],[w*.25,eave+rise,0]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v.flat(),3));
  g.setIndex([0,4,5,0,5,1,1,5,2,2,5,4,2,4,3,3,4,0]);g.computeVertexNormals();
  mesh(p,g.toNonIndexed(),m.roof);
  for(const s of [-1,1]) {
    for(let i=1;i<10;i++) {
      const t=i/10,z=s*d/2*(1-t),y=eave+rise*t+.018,len=w*(1-t*.5);
      bar(p,[-len/2,y,z],[len/2,y,z],.022,m.tile);
    }
    bar(p,[s*w/2,eave,-d/2],[s*w*.25,eave+rise,0],.045,m.tile);
    bar(p,[s*w/2,eave,d/2],[s*w*.25,eave+rise,0],.045,m.tile);
  }
  bar(p,[-w*.25,eave+rise,0],[w*.25,eave+rise,0],.065,m.tile);
  cube(p,[w,.13,d],[0,eave-.06,0],m.wood);
}
function plant(p,x,z) {
  mesh(p,new T.CylinderGeometry(.24,.17,.36,10),m.roof,[x,.18,z]);
  const foliage=mesh(p,new T.IcosahedronGeometry(.44,1),m.green,[x,.58,z]);foliage.scale.set(.8,1.2,.8);
}
function house(color) {
  const p=group(new T.Group(),'Tropical_house');
  const wall=material('Mineral plaster',color,0,.92);
  cube(p,[7.5,.08,8.4],[0,.04,.7],m.green);
  cube(p,[6.1,.28,4.9],[0,.14,-.4],m.stone);
  cube(p,[5.8,2.9,4.6],[0,1.72,-.4],wall);
  cube(p,[5.88,.23,4.68],[0,.39,-.4],m.plaster);
  const r=group(p,'Hipped_roof',[0,0,-.4]);roof(r,6.5,5.3,3.25,1.25);
  cube(p,[5.5,.20,1.65],[0,.22,2.55],m.stone);
  cube(p,[2.3,.12,.4],[0,.10,3.55],m.stone);
  cube(p,[1.5,.06,2.0],[0,.055,4.65],m.stone);
  cube(p,[5.65,.13,1.9],[0,2.88,2.62],m.roof,[.13,0,0]);
  for(const x of [-2.5,2.5]) {
    cube(p,[.17,2.56,.17],[x,1.62,3.23],m.plaster);
    cube(p,[.28,.40,.28],[x,.51,3.23],m.stone);
  }
  cube(p,[1.1,2.25,.14],[0,1.43,1.96],m.frame);
  cube(p,[.94,2.1,.16],[0,1.43,2],m.wood);
  for(let i=0;i<5;i++) cube(p,[.72,.025,.02],[0,.65+i*.32,2.09],m.tile);
  bar(p,[.33,1.25,2.12],[.33,1.52,2.12],.022,m.plaster);
  window(p,-1.8,1.82,1.96,1.18,1.25);window(p,1.8,1.82,1.96,1.18,1.25);
  for(const side of [-1,1]) {
    const wing=group(p,'Side_windows',[side*2.96,0,-.4]);wing.rotation.y=side*Math.PI/2;
    window(wing,0,1.85,0,1.6,1.2);
    cube(p,[.15,.65,7.2],[side*3.58,.4,.7],m.plaster);
    for(const z of [-2.8,.6,4]) cube(p,[.25,.9,.25],[side*3.58,.5,z],m.stone);
    plant(p,side*2.75,3.95);
  }
  return p;
}
function shop() {
  const p=group(new T.Group(),'Neighbourhood_shop');
  cube(p,[6.3,.22,7.2],[0,.11,0],m.stone);
  cube(p,[5.8,5.6,6.4],[0,2.98,-.2],material('Shop sage','#aebbb0',0,.9));
  for(const y of [.45,3.15,5.8])cube(p,[6.0,.17,6.65],[0,y,-.2],m.plaster);
  for(const x of [-1.45,1.45]) {window(p,x,1.65,3.04,2.35,2.15);window(p,x,4.38,3.04,1.7,1.65);}
  cube(p,[5.9,.12,1.2],[0,3.05,3.5],m.roof,[.16,0,0]);
  cube(p,[3.2,.58,.12],[0,2.72,3.08],m.frame);
  for(let i=0;i<6;i++)cube(p,[.22,.07,.025],[-1.05+i*.42,2.72,3.15],m.plaster);
  cube(p,[6.12,.23,6.8],[0,5.98,-.2],m.frame);
  for(const x of [-2.6,2.6])plant(p,x,3.7);
  return p;
}
function tree() {
  const p=group(new T.Group(),'Rain_tree');
  bar(p,[0,0,0],[.12,3.1,0],.20,m.wood);
  for(const [x,y,z,s] of [[0,4,0,1.65],[-1,3.35,.25,1.22],[1,3.6,.4,1.35],[.3,3.4,-1,1.15]]) {
    bar(p,[.1,1.7,0],[x,y-.3,z],.08,m.wood);
    const crown=mesh(p,new T.IcosahedronGeometry(s,1),m.green,[x,y,z]);crown.scale.y=.82;
  }
  return p;
}
function lamp() {
  const p=group(new T.Group(),'Street_lamp');
  cube(p,[.38,.18,.38],[0,.09,0],m.stone);
  bar(p,[0,.1,0],[0,5.5,0],.055,m.frame);
  bar(p,[0,5.48,0],[0,5.7,1.35],.055,m.frame);
  cube(p,[.32,.10,.66],[0,5.68,1.45],m.frame);
  const led=material('Warm LED','#fff0c9',0,.45);led.emissive.set('#ffe4ac');led.emissiveIntensity=.65;
  cube(p,[.25,.022,.54],[0,5.62,1.45],led);
  return p;
}
await mkdir(out,{recursive:true});await mkdir(unity,{recursive:true});
const manifest={version:1,provenance:'Original code-authored geometry, no external assets or textures.',units:'metres',facade:'+Z',assets:[]};
for(const [name,build] of [['house-sage',()=>house('#b5c6b4')],['house-sand',()=>house('#dcc7a5')],['house-rose',()=>house('#cfae9c')],['shophouse',shop],['tree',tree],['street-lamp',lamp]]) {
  const root=build();root.updateMatrixWorld(true);
  const groundY=new T.Box3().setFromObject(root).min.y;
  for(const child of root.children)child.position.y-=groundY;
  root.updateMatrixWorld(true);
  const leaves=[];root.traverse(o=>{if(o.isMesh)leaves.push(o);});
  for(const leaf of leaves)root.attach(leaf);
  root.children.filter(c=>c.isGroup).forEach(c=>root.remove(c));
  batchStatic(root);root.updateMatrixWorld(true);
  const recipe=unityRecipe(root),triangles=recipe.geometries.reduce((a,g)=>a+g.indices.length/3,0);
  const bytes=Buffer.from(await new GLTFExporter().parseAsync(root,{binary:true}));
  if(triangles>12000 || bytes.length>1024*1024)throw new Error(`${name}: asset budget exceeded`);
  await writeFile(new URL(`${name}.glb`,out),bytes);await writeFile(new URL(`${name}.json`,unity),JSON.stringify(recipe));
  const bounds=new T.Box3().setFromObject(root);
  manifest.assets.push({name,triangles,meshes:recipe.geometries.length,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
  console.log(`${name}: ${triangles} triangles, ${recipe.geometries.length} material batches, ${Math.round(bytes.length/1024)} KiB`);
}
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
// Reuse the browser layout as data; Unity resolves placements against its own road.
const moduleURL = code => 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const transpile = text => ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const trackCode = transpile(await readFile(new URL('../../lib/track.ts',import.meta.url),'utf8')).replace('"three"',JSON.stringify(import.meta.resolve('three')));
const sceneryCode = transpile(await readFile(new URL('../../lib/scenery.ts',import.meta.url),'utf8')).replace('"three"',JSON.stringify(import.meta.resolve('three'))).replace('"@/lib/track"',JSON.stringify(moduleURL(trackCode)));
const {SCENERY_ITEMS} = await import(moduleURL(sceneryCode));
const items=SCENERY_ITEMS.filter(i=>['house','shophouse','tree','street-lamp'].includes(i.kind)).map(i=>{
  let hash=0;for(const c of i.id)hash=(hash*31+c.charCodeAt(0))>>>0;
  return {name:i.id,asset:i.kind==='house'?['house-sage','house-sand','house-rose'][hash%3]:i.kind,z:i.z,offset:i.offset,yaw:i.yaw??0,scale:i.scale??1,faceRoad:i.kind!=='tree'};
});
await writeFile(new URL('layout.json',unity),JSON.stringify({items}));
