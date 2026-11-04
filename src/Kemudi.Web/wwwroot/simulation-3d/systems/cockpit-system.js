/* Original vehicle-specific interiors and one shared instrument snapshot, classic Three.js r128. */
(function(root){
  'use strict';
  class CockpitSystem {
    constructor(scene,camera) {
      this.scene=scene;this.camera=camera;this.vehicle=null;this.character=null;
      this.group=null;this.mode='TPV';this.texture=null;this.lastDisplay='';
      this.originalNear=camera.near;this.originalVisibility=null;this.instrumentSnapshot=null;
      this._appliedMode=null;
      this._look=new THREE.Vector3();this._up=new THREE.Vector3(0,1,0);
    }
    attachToVehicle(vehicle,characterHandle) {
      this._detach();this.vehicle=vehicle;this.character=characterHandle||null;
      const group=this.group=new THREE.Group();group.name='Cockpit_'+vehicle.type;
      group.userData.provenance='Original Kemudi.id procedural geometry; cockpit-system.js';
      vehicle.group.add(group);
      const eye=vehicle.config.dimensions.height*vehicle.config.driverEyeRatio;
      group.position.set(vehicle.config.seatOffsetX||0,eye,vehicle.config.seatOffsetZ||0);
      const motor=vehicle.type==='MOTOR',truck=vehicle.type==='TRUK';
      const dark=new THREE.MeshLambertMaterial({color:0x19232f});
      const trim=new THREE.MeshLambertMaterial({color:truck?0x655d51:0x3a4655});
      const chrome=new THREE.MeshLambertMaterial({color:0x8b9aa8});
      const rubber=new THREE.MeshLambertMaterial({color:0x101821});
      const skin=new THREE.MeshLambertMaterial({color:0xd6a477});
      const box=(name,w,h,d,x,y,z,mat=dark)=>{
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.name=name;m.position.set(x,y,z);group.add(m);return m;
      };
      if(motor) {
        this.steering=new THREE.Group();this.steering.name='Handlebar';group.add(this.steering);
        this.steering.position.set(0,-.43,-.57);
        const bar=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.79,10),chrome);bar.rotation.z=Math.PI/2;this.steering.add(bar);
        for(const x of [-.4,.4]) {
          const grip=new THREE.Mesh(new THREE.CylinderGeometry(.042,.042,.17,8),rubber);grip.position.x=x;grip.rotation.z=Math.PI/2;this.steering.add(grip);
          const hand=new THREE.Mesh(new THREE.BoxGeometry(.12,.07,.16),skin);hand.position.set(x,.035,.015);this.steering.add(hand);
          const arm=new THREE.Mesh(new THREE.BoxGeometry(.105,.095,.37),trim);arm.position.set(x,-.035,.24);this.steering.add(arm);
        }
        box('MeterHousing',.42,.22,.12,0,-.33,-.72,rubber);
        box('FuelTank',.38,.21,.5,0,-.7,-.12,trim);
      } else {
        const width=truck?2.45:1.95;
        box('Dashboard',width,.28,.55,.18,-.57,-1.02,trim);
        box('InstrumentHood',.68,.25,.24,0,-.34,-.91,dark);
        box('CentreConsole',.28,.62,.36,.52,-.75,-.5,dark);
        box('CabinFloor',width,.07,1.5,.18,-1.1,-.4,dark);
        // Thin windshield frame leaves the forward view clear; no opaque window plane.
        for(const x of [-width/2+.18,width/2+.18]) {
          box('DoorTrim',.09,.45,1.1,x,-.68,-.25,trim);
          const pillar=box('WindshieldPillar',.065,.88,.07,x,-.03,-1.12,trim);pillar.rotation.x=-.14;
        }
        box('WindshieldTop',width,.055,.06,.18,.41,-1.18,trim);
        this.steering=new THREE.Group();this.steering.name='SteeringWheel';this.steering.position.set(0,-.39,-.58);this.steering.rotation.x=-.16;group.add(this.steering);
        const wheel=new THREE.Mesh(new THREE.TorusGeometry(truck?.245:.205,.025,8,24),rubber);this.steering.add(wheel);
        const centre=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.045),dark);this.steering.add(centre);
        for(const angle of [0,Math.PI*2/3,Math.PI*4/3]) {
          const spoke=new THREE.Mesh(new THREE.BoxGeometry(.035,.2,.028),chrome);spoke.position.set(Math.sin(angle)*.1,Math.cos(angle)*.1,0);spoke.rotation.z=-angle;this.steering.add(spoke);
        }
        for(const x of [-.18,.18]) {
          const hand=new THREE.Mesh(new THREE.SphereGeometry(.063,8,6),skin);hand.position.set(x,.05,.015);this.steering.add(hand);
          box('Sleeve',.1,.1,.28,x,-.4,-.33,trim);
        }
      }
      this.canvas=document.createElement('canvas');this.canvas.width=512;this.canvas.height=256;
      this.context=this.canvas.getContext('2d');
      this.texture=new THREE.CanvasTexture(this.canvas);this.texture.encoding=THREE.sRGBEncoding;
      this.texture.minFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(motor?.36:.6,motor?.18:.3),new THREE.MeshBasicMaterial({map:this.texture,toneMapped:false}));
      // Face the camera from the near side of the opaque instrument housing.
      panel.name='InstrumentDisplay';panel.position.set(0,motor?-.325:-.29,motor?-.652:-.775);group.add(panel);
      this.lastDisplay='';this.instrumentSnapshot=null;
      this.setMode(this.mode);return this;
    }
    setMode(mode) {
      if(this.group&&this._appliedMode===mode)return;
      const wasFPV=this.mode==='FPV'&&this.originalVisibility!==null;
      this.mode=mode;
      if(!this.vehicle||!this.group)return;
      this._appliedMode=mode;
      if(mode==='FPV') {
        if(!wasFPV) this.originalVisibility=this.vehicle.model ? this.vehicle.model.visible : true;
        if(this.vehicle.model)this.vehicle.model.visible=false;
        this.character?.setFirstPerson(true);
        this.group.visible=true;this.camera.near=.045;
      } else {
        if(wasFPV&&this.vehicle.model)this.vehicle.model.visible=this.originalVisibility;
        this.originalVisibility=null;
        this.character?.setFirstPerson(false);this.group.visible=false;this.camera.near=this.originalNear;
      }
      this.camera.updateProjectionMatrix();
    }
    update(dt,vehicle,instruments) {
      if(!this.group||vehicle!==this.vehicle)return;
      this.instrumentSnapshot=instruments||this.instrumentSnapshot;
      this.group.position.y=vehicle.config.dimensions.height*vehicle.config.driverEyeRatio+(vehicle.seatHeight||0);
      if(this.steering) {
        if(vehicle.type==='MOTOR')this.steering.rotation.y=(vehicle.steerAngle||0)*.65;
        else this.steering.rotation.z=-(vehicle.steerAngle||0)*1.5;
      }
      if(this.mode==='FPV') {
        this.camera.position.copy(vehicle.getDriverSeatPosition());
        this._look.copy(vehicle.getForwardDirection());
        if(vehicle.mirrorYaw>0)this._look.applyAxisAngle(this._up,Math.PI*.75*Math.sin(Math.PI*vehicle.mirrorYaw/1.1));
        this._look.multiplyScalar(10);this._look.y-=vehicle.type==='MOTOR'?.4:.55;
        this._look.add(this.camera.position);this.camera.lookAt(this._look);
      }
      const s=this.instrumentSnapshot;
      if(!s)return;
      const l=s.lights||{};
      const left=!!(l.left||l.hazard)&&l.blink!==false,right=!!(l.right||l.hazard)&&l.blink!==false;
      const key=[s.speedText,s.gear,s.engineOn,s.handbrakeOn,s.braking,l.lowBeam,l.highBeam,left,right].join('|');
      if(key===this.lastDisplay)return;
      this.lastDisplay=key;
      const ctx=this.context;if(!ctx)return;
      ctx.fillStyle='#07111e';ctx.fillRect(0,0,512,256);
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#e9f4ff';ctx.font='bold 98px sans-serif';ctx.fillText(s.speedText,210,108);
      ctx.font='24px sans-serif';ctx.fillStyle='#a9c5dc';ctx.fillText('km/jam',210,175);
      ctx.fillStyle='#7dd3fc';ctx.font='bold 65px sans-serif';ctx.fillText(s.gear,416,112);
      ctx.font='bold 27px sans-serif';ctx.fillStyle=left?'#55ed99':'#284337';ctx.fillText('<',40,46);
      ctx.fillStyle=right?'#55ed99':'#284337';ctx.fillText('>',472,46);
      ctx.font='bold 19px sans-serif';ctx.fillStyle=s.engineOn?'#6ee7ad':'#ef7c7c';ctx.fillText(s.engineOn?'MESIN ON':'MESIN OFF',112,225);
      ctx.fillStyle=l.highBeam?'#62b9ff':l.lowBeam?'#80eba4':'#8194aa';ctx.fillText(l.highBeam?'JAUH':l.lowBeam?'LAMPU':'LAMPU OFF',306,225);
      ctx.fillStyle=s.handbrakeOn||s.braking?'#ff8b86':'#8194aa';ctx.fillText(s.handbrakeOn?'P':s.braking?'REM':'',460,225);
      this.texture.needsUpdate=true;
    }
    snapshot() {
      return {type:this.vehicle?.type,mode:this.mode,speedText:this.instrumentSnapshot?.speedText,gear:this.instrumentSnapshot?.gear,visible:!!this.group?.visible,procedural:true};
    }
    _detach() {
      if(this.originalVisibility!==null&&this.vehicle?.model)this.vehicle.model.visible=this.originalVisibility;
      this.character?.setFirstPerson(false);this.originalVisibility=null;
      if(this.group) {
        this.group.parent?.remove(this.group);
        const geometry=new Set(),materials=new Set();
        this.group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});
        geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      }
      this.texture?.dispose();this.texture=null;this.group=null;this.vehicle=null;this.character=null;
      this._appliedMode=null;
      this.camera.near=this.originalNear;this.camera.updateProjectionMatrix();
    }
    dispose() {this._detach();}
  }
  root.CockpitSystem=CockpitSystem;
})(window);
