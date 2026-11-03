/** Blender neighborhood, in meters. Static mesh batches and separate collision bounds. */
class CityTrack {
  constructor(scene) {
    this.scene = scene;
    this.pedestrianZones = [];
    this.roadHeight = .09;
    this.finishZ = -450;
    this.colliders = [];
    this.roadRectangles = [];
    this.name = 'Jalan latihan terpadu';
    this.intersections = [];
  }

  async build(onProgress = () => {}) {
    const loader = new THREE.GLTFLoader();
    const [gltf, data] = await Promise.all([
      new Promise((resolve, reject) => loader.load('models/city/neighborhood.glb', resolve,
        event => { if (event.total) onProgress(event.loaded / event.total); }, reject)),
      fetch('models/city/colliders.json').then(response => {
        if (!response.ok) throw new Error('Data lingkungan gagal dimuat.');
        return response.json();
      }),
    ]);
    this.model = gltf.scene;
    this.model.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = !obj.name.startsWith('Roads_') && !obj.name.startsWith('Environment_');
      obj.receiveShadow = true;
    });
    this.scene.add(this.model);
    this.roadHeight = data.roadHeight;
    this.roadRectangles = data.roadRectangles;
    this.colliders = data.colliders.map(c => ({ name: c.name,
      box: new THREE.Box3(new THREE.Vector3(...c.min), new THREE.Vector3(...c.max)) }));
    this.intersection = new IntersectionSystem(this.scene, { armLengths: { S: 47 } });
    this.intersections = [this.intersection, new IntersectionSystem(this.scene, { id: 'training-junction', center: [0,this.roadHeight,-400] })];
    this.longRoad = new LongRoad(this.scene, this.roadHeight);
    this.colliders.push(...this.longRoad.colliders);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(240,360),new THREE.MeshLambertMaterial({color:0x63846c}));
    ground.material.color.convertSRGBToLinear();ground.rotation.x=-Math.PI/2;ground.position.set(0,-.08,-280);ground.receiveShadow=true;this.scene.add(ground);
    this.intersections.flatMap(j => j.signals).forEach(signal => {
      const p = signal.group.position;
      this.colliders.push({ name: signal.group.name, box: new THREE.Box3(
        new THREE.Vector3(p.x - .25, p.y, p.z - .25), new THREE.Vector3(p.x + .25, p.y + 3.7, p.z + .25)) });
    });
    this.roadRectangles.push([-3.5, 3.5, -140, -33], [-60, 60, -83.5, -76.5]);
    this.roadRectangles.push([-3.5,3.5,-460,-340],[-60,60,-403.5,-396.5]);
    this._buildFinish();
  }

  _buildFinish() {
    const group = new THREE.Group();
    group.name = 'Driving_Finish';
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 16; i++) {
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(.45, .35),
          new THREE.MeshBasicMaterial({ color: (i + row) % 2 ? 0x172c35 : 0xf5f5ed }));
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(-3.375 + i * .45, .103, this.finishZ + row * .35);
        group.add(tile);
      }
    }
    this.scene.add(group);
  }

  getVehicleStartPosition() { return new THREE.Vector3(-1.75, this.roadHeight, 24); }
  getTrafficLightState() { return this.intersection?.controller.current.colors.S.toLowerCase() || 'red'; }
  updateTrafficLights(dt, player) { this.intersections.forEach(j => j.update(dt, player)); }
  resetTraffic() { this.intersections.forEach(j => j.reset()); }
  crossedRed(before, vehicle) { return this.intersections.some(j => j.crossedRed(before,vehicle)); }
  nearestIntersection(position) { return this.intersections.reduce((best,j)=>!best||j.definition.center.distanceToSquared(position)<best.definition.center.distanceToSquared(position)?j:best,null); }
  toggleDebug(position) {
    const nearest=this.nearestIntersection(position);
    this.intersections.forEach(j=>{if(j!==nearest && j.debugElement) {j.debugElement.remove();j.debugElement=null;j.debugGeometry.visible=false;}});
    nearest?.toggleDebug();
  }
  isOnRoad(position) {
    return this.roadRectangles.some(([minX, maxX, minZ, maxZ]) =>
      position.x >= minX && position.x <= maxX && position.z >= minZ && position.z <= maxZ) || !!this.longRoad && this.longRoad.distance(position)<=3.5;
  }
  hasFinished(vehicle) {
    return vehicle.position.z <= this.finishZ && Math.abs(vehicle.position.x) < 3.5 && vehicle.speed > 0;
  }
  collisionAt(vehicle) {
    const { width, length, height } = vehicle.config.dimensions;
    const cos = Math.abs(Math.cos(vehicle.rotation)), sin = Math.abs(Math.sin(vehicle.rotation));
    const halfX = (width * cos + length * sin) * .46;
    const halfZ = (length * cos + width * sin) * .46;
    const p = vehicle.position;
    const inOriginal = p.x - halfX >= -25 && p.x + halfX <= 17 && p.z - halfZ >= -33 && p.z + halfZ <= 33;
    const inNorth = p.x - halfX >= -8 && p.x + halfX <= 8 && p.z - halfZ >= -144 && p.z + halfZ <= -28;
    const inCross = p.x - halfX >= -64 && p.x + halfX <= 64 && p.z - halfZ >= -88 && p.z + halfZ <= -72;
    const inLongRoad = this.longRoad && this.longRoad.distance(p) + Math.max(halfX,halfZ) < 8;
    const inSecond = p.x-halfX>=-8 && p.x+halfX<=8 && p.z-halfZ>=-464 && p.z+halfZ<=-335;
    const inSecondCross = p.x-halfX>=-64 && p.x+halfX<=64 && p.z-halfZ>=-408 && p.z+halfZ<=-392;
    if (!inOriginal && !inNorth && !inCross && !inLongRoad && !inSecond && !inSecondCross) return 'Batas area';
    const box = new THREE.Box3(new THREE.Vector3(p.x - halfX, p.y + .25, p.z - halfZ),
      new THREE.Vector3(p.x + halfX, p.y + height, p.z + halfZ));
    const staticHit = this.colliders.find(c => c.box.intersectsBox(box))?.name;
    if (staticHit) return staticHit;
    for (const a of this.intersections.flatMap(j=>j.agents)) {
      const q = a.mesh.position, ns = a.approach.group === 'NS';
      const aiBox = new THREE.Box3(new THREE.Vector3(q.x - (ns ? a.width : a.length) / 2, q.y, q.z - (ns ? a.length : a.width) / 2),
        new THREE.Vector3(q.x + (ns ? a.width : a.length) / 2, q.y + 1.5, q.z + (ns ? a.length : a.width) / 2));
      if (aiBox.intersectsBox(box)) return a.id;
    }
    return null;
  }
}
window.CityTrack = CityTrack;
