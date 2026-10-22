import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AnimationMixer,Box3,Vector3,Quaternion} from 'three';

const base=new URL('../../public/models/kemudi/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
for(const asset of manifest.assets) {
  const bytes=await readFile(new URL(asset.file,base));
  assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);
  assert.ok(asset.triangles<=25000); assert.ok(asset.bytes<2*1024*1024);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const root=gltf.scene; const box=new Box3().setFromObject(root);
  assert.ok(Math.abs(box.min.y)<.001,'Vehicle rests on ground');
  assert.ok(root.getObjectByName('BodyMotion'));
  let wheels=0,steer=0;
  root.traverse(o=>{
    if(o.name.startsWith('Wheel_')&&!o.isMesh){wheels++;assert.ok(o.userData.radius>0);}
    if(o.name.startsWith('Steer_')&&!o.isMesh)steer++;
    if(o.isMesh)for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
  });
  assert.equal(wheels,asset.type==='motor'?2:asset.type==='mobil'?4:6);
  assert.equal(steer,asset.type==='motor'?1:2);
  if(asset.type!=='motor'){assert.ok(root.getObjectByName('Door_R'));assert.ok(root.getObjectByName('SteeringWheel'));}
  const clip=gltf.animations.find(c=>c.name==='Drive_Forward'); assert.ok(clip);
  const mixer=new AnimationMixer(root);mixer.clipAction(clip).play();mixer.update(2);
  const animated=root.getObjectByName(`Kemudi_${asset.type[0].toUpperCase()+asset.type.slice(1)}`);
  assert.ok(Math.abs(animated.position.z+4)<.001,'Forward clip covers 4 metres in 2 seconds');
  const wheel=root.getObjectByName(asset.type==='motor'?'Wheel_F':'Wheel_FL');
  const expected=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-4/wheel.userData.radius);
  assert.ok(Math.abs(wheel.quaternion.dot(expected))>.9999,'Wheel roll matches signed travel divided by radius');
  mixer.stopAllAction();
  const recipe=JSON.parse(await readFile(new URL(`../../simulation/Kemudi.Simulation/Assets/Resources/KemudiVehicles/${asset.type}.json`,import.meta.url),'utf8'));
  assert.equal(recipe.version,1);
  assert.equal(recipe.geometries.reduce((n,g)=>n+g.indices.length/3,0),asset.triangles);
  recipe.nodes.forEach((n,i)=>{assert.ok(n.parent<i);assert.ok(n.position.every(Number.isFinite));});
  console.log(`PASS ${asset.type}: ${wheels} wheels, ${steer} steering pivots, ${asset.triangles} triangles, ${(bytes.length/1024).toFixed(0)} KiB; forward animation and Unity geometry verified.`);
}
