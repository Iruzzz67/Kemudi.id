/* Original low-poly articulated people. Metres, feet on ground, facing local -Z. */
(function (root) {
  'use strict';
  const palette = [0x3269a8, 0xbc6540, 0x508664, 0x976595, 0xdda848, 0x607896];
  function createCharacter(role = 'pedestrian', variant = 0) {
    const seated = role !== 'pedestrian', rider = role === 'rider';
    const group = new THREE.Group(); group.name = 'Character_' + role;
    group.userData.provenance = 'Original Kemudi.id procedural geometry; character-system.js';
    const clothes = new THREE.MeshLambertMaterial({ color: palette[Math.abs(variant) % palette.length] });
    const skin = new THREE.MeshLambertMaterial({ color: [0xd6a477, 0xb98259, 0xe0b596][Math.abs(variant) % 3] });
    const trousers = new THREE.MeshLambertMaterial({ color: 0x26364b });
    const shoes = new THREE.MeshLambertMaterial({ color: 0x192330 });
    const detail = [];
    function mesh(parent, name, geometry, material, x, y, z) {
      const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(x,y,z);
      m.castShadow = true; parent.add(m); return m;
    }
    function box(parent, name, size, material, x,y,z) { return mesh(parent,name,new THREE.BoxGeometry(...size),material,x,y,z); }
    function pivot(parent,name,x,y,z) { const g = new THREE.Group(); g.name=name;g.position.set(x,y,z);parent.add(g);return g; }
    const pelvis = pivot(group,'Pelvis',0,.89,0);
    box(pelvis,'Hips',[.31,.2,.23],trousers,0,0,0);
    const torso = pivot(pelvis,'Torso',0,.1,0);
    box(torso,'Shirt',[.4,.5,.24],clothes,0,.25,0);
    const head = pivot(torso,'Head',0,.69,0);
    mesh(head,'Face',new THREE.SphereGeometry(.145,8,6),skin,0,0,0);
    box(head,'Hair',[.25,.07,.23],shoes,0,.105,.015);
    if (rider) {
      const helmet = mesh(head,'Helmet',new THREE.SphereGeometry(.18,10,8),new THREE.MeshLambertMaterial({color:0xdbe6ee}),0,.035,0);
      box(helmet,'Visor',[.25,.105,.035],new THREE.MeshLambertMaterial({color:0x233b4e}),0,-.015,-.155);
    }
    const hips = [], knees = [], shoulders = [], elbows = [];
    for (const [side,x] of [['Left',-.12],['Right',.12]]) {
      const hip = pivot(pelvis,side+'Hip',x,-.06,0); hips.push(hip);
      box(hip,side+'Thigh',[.14,.42,.16],trousers,0,-.21,0);
      const knee = pivot(hip,side+'Knee',0,-.42,0); knees.push(knee);
      box(knee,side+'Shin',[.12,.39,.13],trousers,0,-.195,0);
      detail.push(box(knee,side+'Shoe',[.15,.11,.27],shoes,0,-.39,-.065));
      const shoulder = pivot(torso,side+'Shoulder',x < 0 ? -.25 : .25,.46,0); shoulders.push(shoulder);
      box(shoulder,side+'UpperArm',[.13,.3,.14],clothes,0,-.15,0);
      const elbow = pivot(shoulder,side+'Elbow',0,-.3,0); elbows.push(elbow);
      box(elbow,side+'Forearm',[.11,.27,.12],skin,0,-.135,0);
      detail.push(mesh(elbow,side+'Hand',new THREE.SphereGeometry(.07,6,5),rider?shoes:skin,0,-.3,0));
    }
    if (seated) {
      hips.forEach(h=>{h.rotation.x = rider ? 1.3 : Math.PI/2;});
      knees.forEach(k=>{k.rotation.x = rider ? -.9 : -Math.PI/2;});
      shoulders.forEach(s=>{s.rotation.x = rider ? 1.25 : .85;});
      elbows.forEach(e=>{e.rotation.x=.45;});
      torso.rotation.x=rider ? -.22 : -.04;
    }
    let disposed=false, firstPerson=false, animationTime=0;
    const handle = {
      group, head,
      get animationTime() { return animationTime; },
      mountToVehicle(vehicle) {
        vehicle.group.add(group);
        // Seated root offsets keep the feet above the road; the helmet sits above the bike.
        const c=vehicle.config, eye=c.dimensions.height*c.driverEyeRatio;
        group.position.set(c.seatOffsetX || 0,eye-(rider?1.42:1.58),c.seatOffsetZ || 0);
        if (rider) group.position.z += .16;
        group.rotation.y=0; return handle;
      },
      update(dt, state = {}) {
        if (disposed || !(dt>0) || !Number.isFinite(dt)) return;
        const speed=Math.abs(Number(state.speed)||0), steering=Number(state.steering)||0;
        animationTime += Math.min(dt,.1) * (speed > .05 ? Math.min(9, 3+speed*2) : 1);
        const walking=!seated && (state.state==='walking'||state.state==='crossing') && speed>.01;
        if (!seated) {
          const swing=walking ? Math.sin(animationTime)*.52 : Math.sin(animationTime)*.025;
          hips[0].rotation.x=swing;hips[1].rotation.x=-swing;
          shoulders[0].rotation.x=-swing*.7;shoulders[1].rotation.x=swing*.7;
          knees[0].rotation.x=walking ? Math.max(0,-swing)*.8 : 0;
          knees[1].rotation.x=walking ? Math.max(0,swing)*.8 : 0;
          pelvis.position.y=.89+(walking ? Math.abs(Math.sin(animationTime))*.025 : 0);
        } else {
          torso.rotation.z = -THREE.MathUtils.clamp(steering,-.6,.6)*(rider?.15:.035);
          shoulders[0].rotation.z=steering*.13;shoulders[1].rotation.z=steering*.13;
        }
        head.rotation.y=seated?steering*.1:Math.sin(animationTime*.3)*.04;
      },
      setFirstPerson(value) { firstPerson=!!value;head.visible=!firstPerson; },
      setLOD(distance) {
        detail.forEach(o=>{o.visible=distance<55;});
        // Keep torso/head silhouette at distance; do not teleport/pop the entire person.
        group.traverse(o=>{if(o.isMesh)o.castShadow=distance<45;});
        head.visible=!firstPerson;
      },
      dispose() {
        if(disposed)return;disposed=true;
        group.parent?.remove(group);
        const geometry=new Set(),materials=new Set();
        group.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});
        geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
      },
    };
    return handle;
  }
  root.CharacterSystem = { createCharacter };
})(window);
