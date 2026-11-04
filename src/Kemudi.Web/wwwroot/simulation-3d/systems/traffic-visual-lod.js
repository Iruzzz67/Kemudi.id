/* Render-only AI LOD: original close GLB, original procedural distant silhouettes.
 * This never unregisters actors, changes poses, or bypasses motion/collision planning.
 */
(function(root){
  'use strict';
  class TrafficVisualLOD {
    constructor(scene) {
      this.scene=scene;this.records=new Map();this.disposed=false;
      this.geometries=new Set();this.materials=new Set();
      const geometry=g=>{this.geometries.add(g);return g;};
      const material=m=>{this.materials.add(m);return m;};
      this.box=geometry(new THREE.BoxGeometry(1,1,1));
      this.wheel=geometry(new THREE.CylinderGeometry(.5,.5,1,8));
      this.sphere=geometry(new THREE.SphereGeometry(.5,6,4));
      this.bodyMaterials={
        MOTOR:material(new THREE.MeshLambertMaterial({color:0x3269a8})),
        MOBIL:material(new THREE.MeshLambertMaterial({color:0xa94c42})),
        TRUK:material(new THREE.MeshLambertMaterial({color:0xc6d0d9})),
      };
      this.dark=material(new THREE.MeshLambertMaterial({color:0x182330}));
      this.glass=material(new THREE.MeshLambertMaterial({color:0x385c73,transparent:true,opacity:.58,depthWrite:false}));
      this.skin=material(new THREE.MeshLambertMaterial({color:0xc79874}));
      this.helmet=material(new THREE.MeshLambertMaterial({color:0xe3ecf1}));
      this.lampMaterial=material(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
      this.transform=new THREE.Object3D();this.color=new THREE.Color();
    }
    registerVehicle(vehicle,characterHandle) {
      if(this.disposed||!vehicle?.id||vehicle.id==='player'||!vehicle.model||!vehicle.group)return null;
      const current=this.records.get(vehicle.id);
      if(current?.vehicle===vehicle)return current.proxy;
      if(current)this.unregisterVehicle(vehicle.id);
      const proxy=new THREE.Group();proxy.name='TrafficLOD_'+vehicle.type;
      proxy.userData.provenance='Original Kemudi.id procedural distance proxy; traffic-visual-lod.js';
      const d=vehicle.config.dimensions,l=d.length,w=d.width,h=d.height;
      const add=(name,geometry,material,size,x,y,z)=>{
        const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.scale.set(...size);mesh.position.set(x,y,z);
        // Far actors do not multiply the sun's shadow-map workload.
        mesh.castShadow=false;mesh.receiveShadow=false;proxy.add(mesh);return mesh;
      };
      const box=(name,material,size,x,y,z)=>add(name,this.box,material,size,x,y,z);
      const body=this.bodyMaterials[vehicle.type]||this.bodyMaterials.MOBIL;
      if(vehicle.type==='MOTOR') {
        box('LOD_BikeFrame',body,[w*.4,h*.3,l*.72],0,h*.38,0);
        box('LOD_FuelTank',body,[w*.56,h*.19,l*.28],0,h*.58,-l*.12);
        box('LOD_Rider',this.dark,[.36,.6,.3],0,h*.73,l*.08);
        add('LOD_Helmet',this.sphere,this.helmet,[.35,.35,.35],0,h*.99,l*.05);
        box('LOD_Handlebar',this.dark,[w*.82,.07,.08],0,h*.69,-l*.27);
      } else if(vehicle.type==='TRUK') {
        box('LOD_Cargo',body,[w*.94,h*.76,l*.72],0,h*.6,l*.12);
        box('LOD_TruckCab',body,[w*.91,h*.66,l*.28],0,h*.39,-l*.36);
        box('LOD_TruckWindow',this.glass,[w*.84,h*.2,l*.282],0,h*.62,-l*.36);
        const c=vehicle.config;
        add('LOD_Driver',this.sphere,this.skin,[.24,.28,.24],c.seatOffsetX||0,h*c.driverEyeRatio-.07,c.seatOffsetZ||-l*.33);
      } else {
        box('LOD_CarBody',body,[w*.94,h*.38,l*.98],0,h*.4,0);
        box('LOD_CarCabin',this.glass,[w*.79,h*.43,l*.43],0,h*.72,l*.015);
        const c=vehicle.config;
        add('LOD_Driver',this.sphere,this.skin,[.24,.28,.24],c.seatOffsetX||0,h*c.driverEyeRatio-.07,c.seatOffsetZ||0);
      }
      const motor=vehicle.type==='MOTOR',truck=vehicle.type==='TRUK';
      const radius=motor?.29:truck?.4:.31,thickness=motor?.16:.2;
      const wheels=new THREE.InstancedMesh(this.wheel,this.dark,motor?2:4);wheels.name='LOD_Wheels';
      let wheelIndex=0;
      for(const x of motor?[0]:[-w*.42,w*.42])for(const z of [-l*.32,l*.32]) {
        this.transform.position.set(x,radius,z);this.transform.rotation.set(0,0,Math.PI/2);
        this.transform.scale.set(radius*2,thickness,radius*2);this.transform.updateMatrix();
        wheels.setMatrixAt(wheelIndex++,this.transform.matrix);
      }
      wheels.instanceMatrix.needsUpdate=true;proxy.add(wheels);
      const roles=[],lamps=new THREE.InstancedMesh(this.box,this.lampMaterial,motor?6:10);lamps.name='LOD_Lamps';
      const lamp=(role,x,y,z)=>{
        this.transform.position.set(x,y,z);this.transform.rotation.set(0,0,0);
        this.transform.scale.set(motor?.12:.16,.09,.045);this.transform.updateMatrix();
        lamps.setMatrixAt(roles.length,this.transform.matrix);roles.push(role);
      };
      const lampY=h*(truck?.34:.42),rear=l*.505,front=-l*.505;
      for(const x of motor?[0]:[-w*.3,w*.3]) {lamp('head',x,lampY,front);lamp('tail',x,lampY,rear);}
      for(const side of [-1,1]) {
        lamp(side<0?'left':'right',side*w*.4,lampY,front);
        lamp(side<0?'left':'right',side*w*.4,lampY,rear);
      }
      if(!motor)for(const side of [-1,1])lamp('reverse',side*w*.2,lampY,rear+.002);
      lamps.instanceMatrix.needsUpdate=true;proxy.add(lamps);proxy.visible=false;vehicle.group.add(proxy);
      const character=characterHandle?.group||null;
      const record={vehicle,proxy,character,lamps,roles,mode:'near',culled:false,lampKey:null,
        originalModelVisibility:vehicle.model.visible,originalCharacterVisibility:character?.visible,
        baseGroupVisible:vehicle.active===false?true:vehicle.group.visible,lastAppliedGroupVisibility:vehicle.group.visible};
      this.records.set(vehicle.id,record);this._updateLamps(record);return proxy;
    }
    _updateLamps(record) {
      const state=record.vehicle.lightState||{},blink=state.blink!==false;
      const head=!!(state.lowBeam||state.highBeam),brake=!!state.brake;
      const left=!!(state.left||state.hazard)&&blink,right=!!(state.right||state.hazard)&&blink,reverse=!!state.reverse;
      const key=[head,brake,left,right,reverse].join('|');if(key===record.lampKey)return;record.lampKey=key;
      for(let i=0;i<record.roles.length;i++) {
        const role=record.roles[i];let color=0x171f28;
        if(role==='head')color=head?0xfff2d0:0x62717a;
        if(role==='tail')color=brake?0xff3030:head?0xa42225:0x491c23;
        if(role==='left')color=left?0xffb92e:0x49341d;
        if(role==='right')color=right?0xffb92e:0x49341d;
        if(role==='reverse')color=reverse?0xeef5ff:0x39414a;
        record.lamps.setColorAt(i,this.color.setHex(color));
      }
      record.lamps.instanceColor.needsUpdate=true;
    }
    update(cameraPosition) {
      if(this.disposed||!cameraPosition)return;
      for(const record of this.records.values()) {
        const v=record.vehicle,p=v.position;
        const dx=p.x-cameraPosition.x,dy=p.y-cameraPosition.y,dz=p.z-cameraPosition.z,distanceSquared=dx*dx+dy*dy+dz*dz;
        // Only recognize externally changed activity/group visibility, not our own cull state.
        if(v.active!==false&&v.group.visible!==record.lastAppliedGroupVisibility)record.baseGroupVisible=v.group.visible;
        if(record.culled) {if(distanceSquared<110*110)record.culled=false;}
        else if(distanceSquared>120*120)record.culled=true;
        if(record.mode==='near') {if(distanceSquared>40*40)record.mode='proxy';}
        else if(distanceSquared<35*35)record.mode='near';
        const near=record.mode==='near';
        v.group.visible=v.active!==false&&record.baseGroupVisible&&!record.culled;
        record.lastAppliedGroupVisibility=v.group.visible;
        v.model.visible=near&&record.originalModelVisibility;
        if(record.character)record.character.visible=near&&record.originalCharacterVisibility;
        record.proxy.visible=!near;this._updateLamps(record);
      }
    }
    unregisterVehicle(id) {
      const record=this.records.get(id);if(!record)return;
      const v=record.vehicle;record.proxy.parent?.remove(record.proxy);
      record.proxy.traverse(o=>{if(o.isInstancedMesh)o.dispose();});
      v.model.visible=record.originalModelVisibility;
      if(record.character)record.character.visible=record.originalCharacterVisibility;
      v.group.visible=v.active!==false&&record.baseGroupVisible;
      this.records.delete(id);
    }
    snapshot() {
      let near=0,proxy=0,culled=0;
      for(const record of this.records.values()) {if(record.culled||record.vehicle.active===false)culled++;else if(record.mode==='near')near++;else proxy++;}
      return {registered:this.records.size,near,proxy,culled,sharedGeometries:this.geometries.size,sharedMaterials:this.materials.size};
    }
    dispose() {
      if(this.disposed)return;
      for(const id of [...this.records.keys()])this.unregisterVehicle(id);
      this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.disposed=true;
    }
  }
  root.TrafficVisualLOD=TrafficVisualLOD;
})(window);
