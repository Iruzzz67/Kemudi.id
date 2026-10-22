import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3 } from 'three';
const base=new URL('../../public/models/kemudi/environment/',import.meta.url);
const recipes=new URL('../../simulation/Kemudi.Simulation/Assets/Resources/KemudiEnvironment/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
for(const asset of manifest.assets) {
  const bytes=await readFile(new URL(`${asset.name}.glb`,base));
  assert.equal(bytes.length,asset.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  assert.ok(bytes.length<=1024*1024 && asset.triangles<=12000 && asset.meshes<=10);
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const bounds=new Box3().setFromObject(scene);assert.ok(Math.abs(bounds.min.y)<.001);
  let triangles=0;
  scene.traverse(o=>{if(o.isMesh){const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));}});
  assert.equal(triangles,asset.triangles);
  const recipe=JSON.parse(await readFile(new URL(`${asset.name}.json`,recipes),'utf8'));
  assert.equal(recipe.geometries.reduce((n,g)=>n+g.indices.length/3,0),triangles);
  recipe.nodes.forEach((n,i)=>assert.ok(n.parent<i && n.geometry<recipe.geometries.length));
  console.log(`PASS ${asset.name}: grounded GLB, ${triangles} triangles, ${asset.meshes} batches, matching Unity recipe.`);
}
const layout=JSON.parse(await readFile(new URL('layout.json',recipes),'utf8'));
assert.ok(layout.items.length>50);
for(const item of layout.items){assert.ok(manifest.assets.some(a=>a.name===item.asset));assert.ok(item.scale>0);assert.ok(Math.abs(item.offset)>5);}
assert.equal(new Set(layout.items.map(i=>i.name)).size,layout.items.length);
console.log(`PASS ${layout.items.length} unique scenery placements outside the carriageway.`);
