/** Continuous metre-based S road joining the two signal-controlled junctions. */
class LongRoad {
  constructor(scene, height = .09) {
    this.group = new THREE.Group(); this.group.name = 'Jalan_Latihan_Terpadu'; scene.add(this.group);
    this.height = height; this.colliders = []; this.samples = []; this.batches = new Map();
    this.curve = new THREE.CatmullRomCurve3([
      [0,-140],[0,-155],[8,-185],[16,-210],[8,-235],[-8,-260],[-16,-285],[-8,-310],[0,-325],[0,-340],
    ].map(([x,z]) => new THREE.Vector3(x,height,z)), false, 'catmullrom', .5);
    this.length = this.curve.getLength();
    for (let s=0;s<this.length;s+=.5) this.samples.push(this.frame(s));
    this.samples.push(this.frame(this.length));
    this.ribbon('asphalt',-3.5,3.5,0,0x35434b);
    for (const side of [-1,1]) {
      this.ribbon('edge',side*3.28-.06,side*3.28+.06,.01,0xf3f3ed,true);
      this.ribbon('sidewalk',Math.min(side*3.65,side*5.65),Math.max(side*3.65,side*5.65),.14,0xb2b5ad);
      this.ribbon('tactile',side*4.65-.16,side*4.65+.16,.151,0xd7b25c,true);
    }
    for(let s=1.5;s<this.length-1.5;s+=6) this.ribbon('center',-.06,.06,.012,0xf3f3ed,true,s-1.5,s+1.5);
    // Deterministic streetscape; shared instanced geometry keeps draw calls bounded.
    for(let s=4;s<this.length-4;s+=2) for(const side of [-1,1]) {
      const f=this.frame(s),p=f.point.clone().addScaledVector(f.left,side*3.57);
      this.box('curb'+(Math.floor(s/2)%2),[.18,.18,1.95],p.clone().add(new THREE.Vector3(0,.09,0)),f.angle,Math.floor(s/2)%2?0xe0e1dc:0x333c40);
    }
    for(let s=12;s<this.length-12;s+=24) for(const side of [-1,1]) {
      const f=this.frame(s),p=f.point.clone().addScaledVector(f.left,side*8);
      this.tree(p);
      this.lamp(f.point.clone().addScaledVector(f.left,side*5.4));
      this.house(f.point.clone().addScaledVector(f.left,side*15),f.angle+(side<0?Math.PI:0),Math.floor(s/24)%3);
    }
    // Homes and shade trees also frame both intersections without occupying approaches.
    for(const centerZ of [-80,-400]) {
      for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]) {
        const forward=new THREE.Vector3(dx,0,dz),left=new THREE.Vector3(dz,0,-dx);
        const end=centerZ===-80 && dz===1 ? 47 : 60;
        const angle=Math.atan2(dx,dz);
        for(const side of [-1,1]) {
          const p=new THREE.Vector3(0,height,centerZ).addScaledVector(forward,(end+5.65)/2).addScaledVector(left,side*4.65);
          this.box('junction-pavement',[2,.14,end-5.65],p.clone().add(new THREE.Vector3(0,.07,0)),angle,0xb2b5ad);
          this.box('junction-tactile',[.32,.012,end-5.65],p.clone().add(new THREE.Vector3(0,.146,0)),angle,0xd7b25c);
          for(let s=9;s<end-1;s+=2) {
            const curb=new THREE.Vector3(0,height+.09,centerZ).addScaledVector(forward,s).addScaledVector(left,side*3.57);
            this.box('curb'+(Math.floor(s/2)%2),[.18,.18,1.95],curb,angle,Math.floor(s/2)%2?0xe0e1dc:0x333c40);
          }
        }
      }
      for(const x of [-4.65,4.65])for(const z of [-4.65,4.65])this.box('junction-corner',[2,.14,2],new THREE.Vector3(x,height+.07,centerZ+z),0,0xb2b5ad);
    }
    for(const z of [-80,-400]) for(const xSide of [-1,1]) for(const zSide of [-1,1]) {
      this.house(new THREE.Vector3(xSide*16,height,z+zSide*19),xSide<0?Math.PI:0,1);
      this.tree(new THREE.Vector3(xSide*9,height,z+zSide*13));
      this.lamp(new THREE.Vector3(xSide*6,height,z+zSide*15));
    }
    for(const [key,b] of this.batches) {
      const material=new THREE.MeshLambertMaterial({color:b.color});material.color.convertSRGBToLinear();
      const mesh=new THREE.InstancedMesh(b.geometry,material,b.transforms.length);mesh.name=key;
      b.transforms.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);
    }
  }
  frame(s) {
    const u=THREE.MathUtils.clamp(s/this.length,0,1),point=this.curve.getPointAt(u),forward=this.curve.getTangentAt(u).normalize();
    return {point,forward,left:new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),forward),angle:Math.atan2(forward.x,forward.z)};
  }
  ribbon(name,left,right,offset,color,basic=false,start=0,end=this.length) {
    const positions=[],indices=[];
    const count=Math.max(1,Math.ceil((end-start)/.5));
    for(let i=0;i<=count;i++) {
      const f=this.frame(start+(end-start)*i/count);
      for(const side of [left,right]) {const p=f.point.clone().addScaledVector(f.left,side);positions.push(p.x,p.y+offset,p.z);}
      if(i<count){const n=i*2;indices.push(n,n+2,n+1,n+1,n+2,n+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=basic?new THREE.MeshBasicMaterial({color,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}):new THREE.MeshLambertMaterial({color});material.color.convertSRGBToLinear();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;this.group.add(mesh);
  }
  instance(key,geometry,color,position,scale,angle=0) {
    if(!this.batches.has(key)) this.batches.set(key,{geometry:geometry(),color,transforms:[]});
    this.batches.get(key).transforms.push(new THREE.Matrix4().compose(position,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(...scale)));
  }
  box(key,size,p,angle,color) { this.instance(key,()=>new THREE.BoxGeometry(1,1,1),color,p,size,angle); }
  tree(p) {
    this.box('tree-trunk',[.35,3,.35],p.clone().add(new THREE.Vector3(0,1.5,0)),0,0x705039);
    this.instance('tree-canopy',()=>new THREE.IcosahedronGeometry(1,1),0x52774a,p.clone().add(new THREE.Vector3(0,4,0)),[2.1,2.7,2.1]);
  }
  lamp(p) {
    this.box('street-pole',[.12,6,.12],p.clone().add(new THREE.Vector3(0,3,0)),0,0x505c60);
    this.box('street-lamp',[.8,.16,.4],p.clone().add(new THREE.Vector3(0,6,0)),0,0xe7e2cb);
  }
  house(p,angle,variant) {
    this.box('house-'+variant,[7,4.5,8],p.clone().add(new THREE.Vector3(0,2.25,0)),angle,[0xd5c4a2,0xbcc9c4,0xd2b6a1][variant]);
    this.instance('tile-roof',()=>new THREE.ConeGeometry(1,1,4),0x994e37,p.clone().add(new THREE.Vector3(0,5.2,0)),[6.1,2,6.1],angle+Math.PI/4);
    for(const z of [-2,2]) {
      const offset=new THREE.Vector3(-3.51,2.4,z).applyAxisAngle(new THREE.Vector3(0,1,0),angle);
      this.box('window',[.04,1.4,1.7],p.clone().add(offset),angle,0x3e5962);
    }
    const radius=5.4;
    this.colliders.push({name:'Bangunan tepi jalan',box:new THREE.Box3(p.clone().add(new THREE.Vector3(-radius,0,-radius)),p.clone().add(new THREE.Vector3(radius,6.2,radius)))});
  }
  distance(position) {
    let best=Infinity;
    for(let i=1;i<this.samples.length;i++) {
      const a=this.samples[i-1].point,b=this.samples[i].point,ab=b.clone().sub(a);
      const t=THREE.MathUtils.clamp(position.clone().sub(a).dot(ab)/ab.lengthSq(),0,1);
      const p=a.clone().addScaledVector(ab,t);best=Math.min(best,Math.hypot(p.x-position.x,p.z-position.z));
    }
    return best;
  }
  dispose() {
    const geometries=new Set(),materials=new Set();this.group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.group.parent?.remove(this.group);
  }
}
window.LongRoad=LongRoad;
