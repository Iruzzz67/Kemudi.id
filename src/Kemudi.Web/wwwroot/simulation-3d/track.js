/**
 * Track — Catmull-Rom S-curve track with road markings, traffic lights,
 * crosswalks, finish line, and scenery. Based on DOKUMENTASI_SIMULASI.md.
 *
 * Road layout: START_Z=8 → ROAD_START_Z=16 → S-curve → FINISH_Z=-170
 * ROAD_WIDTH=10m, sampled 400 points along CatmullRom curve.
 */

const TRACK_CONSTANTS = {
  START_Z: 8,
  ROAD_START_Z: 16,
  FINISH_Z: -170,
  ROAD_WIDTH: 10,
  ROAD_HALF_WIDTH: 5,
  CURVE_SAMPLES: 400,
  GRASS_SIZE: 600,
};

// Waypoints for S-curve (x, z) — center of road
const WAYPOINTS = [
  { x: 0, z: 20 },
  { x: 0, z: 0 },
  { x: 0, z: -20 },
  { x: 5, z: -50 },     // Start S-curve
  { x: 8, z: -70 },
  { x: 5, z: -90 },
  { x: 0, z: -100 },    // Mid S-curve
  { x: -5, z: -110 },
  { x: -8, z: -130 },
  { x: -5, z: -145 },
  { x: 0, z: -155 },
  { x: 0, z: -170 },    // Finish
];

class Track {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.roadPoints = []; // sampled center points
    this.roadTangents = [];
    this.trafficLights = [];
    this.pedestrianZones = [];
  }

  build() {
    this._buildCurve();
    this._buildGrass();
    this._buildRoadSurface();
    this._buildLaneMarkings();
    this._buildIdealLine();
    this._buildEdgeLines();
    this._buildSidewalks();
    this._buildCrosswalks();
    this._buildTrafficLights();
    this._buildFinishLine();
    this._buildStartLine();
    this._buildTrafficSigns();
    this._buildTrees();
    this._buildStreetLights();
    this._buildParkingArea();
  }

  _buildCurve() {
    // Create CatmullRom curve from waypoints
    const pts3d = WAYPOINTS.map(w => new THREE.Vector3(w.x, 0, w.z));
    this.curve = new THREE.CatmullRomCurve3(pts3d, false, 'catmullrom', 0.5);

    // Sample points along the curve
    for (let i = 0; i <= TRACK_CONSTANTS.CURVE_SAMPLES; i++) {
      const t = i / TRACK_CONSTANTS.CURVE_SAMPLES;
      const point = this.curve.getPoint(t);
      const tangent = this.curve.getTangent(t);
      this.roadPoints.push(point);
      this.roadTangents.push(tangent);
    }
  }

  _buildGrass() {
    const groundGeo = new THREE.PlaneGeometry(TRACK_CONSTANTS.GRASS_SIZE, TRACK_CONSTANTS.GRASS_SIZE);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a7d44 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);
  }

  _buildRoadSurface() {
    // Build road as ribbon geometry following the curve
    const roadWidth = TRACK_CONSTANTS.ROAD_WIDTH;
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i < this.roadPoints.length; i++) {
      const p = this.roadPoints[i];
      const t = this.roadTangents[i].normalize();
      // Perpendicular (right vector)
      const right = new THREE.Vector3(-t.z, 0, t.x).normalize();

      const left = p.clone().addScaledVector(right, -roadWidth / 2);
      const rgt = p.clone().addScaledVector(right, roadWidth / 2);

      positions.push(left.x, 0.01, left.z);
      positions.push(rgt.x, 0.01, rgt.z);

      const u = i / this.roadPoints.length;
      uvs.push(0, u * 20);
      uvs.push(1, u * 20);

      if (i < this.roadPoints.length - 1) {
        const vi = i * 2;
        indices.push(vi, vi + 1, vi + 2);
        indices.push(vi + 1, vi + 3, vi + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(geo, mat);
    road.receiveShadow = true;
    this.scene.add(road);
    this.objects.push(road);
  }

  _buildLaneMarkings() {
    // Center dashed line (white)
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dashLen = 3;
    const gap = 3;

    for (let i = 0; i < this.roadPoints.length - 1; i += Math.ceil((dashLen + gap) / 0.5)) {
      const p = this.roadPoints[i];
      const t = this.roadTangents[i];
      const angle = Math.atan2(t.x, t.z);

      const dashGeo = new THREE.PlaneGeometry(0.15, dashLen);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      dash.position.set(p.x, 0.02, p.z);
      this.scene.add(dash);
      this.objects.push(dash);
    }
  }

  _buildEdgeLines() {
    // Yellow edge lines along the road
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const roadWidth = TRACK_CONSTANTS.ROAD_WIDTH;

    for (const side of [-1, 1]) {
      const positions = [];
      const indices = [];

      for (let i = 0; i < this.roadPoints.length; i++) {
        const p = this.roadPoints[i];
        const t = this.roadTangents[i].normalize();
        const right = new THREE.Vector3(-t.z, 0, t.x).normalize();
        const edge = p.clone().addScaledVector(right, side * (roadWidth / 2 - 0.1));

        positions.push(edge.x - 0.06, 0.025, edge.z);
        positions.push(edge.x + 0.06, 0.025, edge.z);

        if (i < this.roadPoints.length - 1) {
          const vi = i * 2;
          indices.push(vi, vi + 1, vi + 2);
          indices.push(vi + 1, vi + 3, vi + 2);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      const line = new THREE.Mesh(geo, yellowMat);
      this.scene.add(line);
      this.objects.push(line);
    }
  }

  _buildIdealLine() {
    // Cyan dashed ideal line through center of road
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.4 });
    const dashLen = 2;
    const gap = 4;

    for (let i = 0; i < this.roadPoints.length - 1; i += Math.ceil((dashLen + gap) / 0.5)) {
      const p = this.roadPoints[i];
      const t = this.roadTangents[i];
      const angle = Math.atan2(t.x, t.z);

      const dashGeo = new THREE.PlaneGeometry(0.1, dashLen);
      const dash = new THREE.Mesh(dashGeo, cyanMat);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = -angle;
      dash.position.set(p.x, 0.03, p.z);
      this.scene.add(dash);
      this.objects.push(dash);
    }
  }

  _buildSidewalks() {
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const roadWidth = TRACK_CONSTANTS.ROAD_WIDTH;

    // Build sidewalks following the curve
    for (const side of [-1, 1]) {
      const positions = [];
      const indices = [];

      for (let i = 0; i < this.roadPoints.length; i++) {
        const p = this.roadPoints[i];
        const t = this.roadTangents[i].normalize();
        const right = new THREE.Vector3(-t.z, 0, t.x).normalize();
        const inner = p.clone().addScaledVector(right, side * roadWidth / 2);
        const outer = p.clone().addScaledVector(right, side * (roadWidth / 2 + 1.5));

        positions.push(inner.x, 0.075, inner.z);
        positions.push(outer.x, 0.075, outer.z);

        if (i < this.roadPoints.length - 1) {
          const vi = i * 2;
          indices.push(vi, vi + 1, vi + 2);
          indices.push(vi + 1, vi + 3, vi + 2);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      // Mirror the winding for the opposite side; both surfaces face upward.
      if (side < 0) {
        for (let j = 0; j < indices.length; j += 3) [indices[j + 1], indices[j + 2]] = [indices[j + 2], indices[j + 1]];
        geo.setIndex(indices);
      }
      geo.computeVertexNormals();
      const sidewalk = new THREE.Mesh(geo, sidewalkMat);
      sidewalk.name = 'Training_Sidewalk_' + side;
      sidewalk.receiveShadow = true;
      this.scene.add(sidewalk);
      this.objects.push(sidewalk);
    }
  }

  _buildCrosswalks() {
    // Zebra cross at z=-30 and z=-145 (from docs)
    const crosswalkPositions = [-30, -145];
    const crosswalkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    crosswalkPositions.forEach(z => {
      // Find nearest point on curve
      const nearestIdx = this._findNearestPoint(z);
      const p = this.roadPoints[nearestIdx];
      const t = this.roadTangents[nearestIdx];
      const angle = Math.atan2(t.x, t.z);

      for (let i = -4; i <= 4; i += 1.5) {
        const stripeGeo = new THREE.PlaneGeometry(0.4, 2.5);
        const stripe = new THREE.Mesh(stripeGeo, crosswalkMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(p.x + Math.cos(angle + Math.PI/2) * i, 0.03, p.z + Math.sin(angle + Math.PI/2) * i);
        this.scene.add(stripe);
        this.objects.push(stripe);
      }

      this.pedestrianZones.push({ x: p.x, z: p.z, angle });
    });
  }

  _buildTrafficLights() {
    // Traffic light at z=-75 (from docs): 11s cycle (green 5.5s, yellow 1.5s, red 4s)
    const tlPositions = [
      { x: 6, z: -75 },
      { x: -6, z: -75 },
    ];

    tlPositions.forEach(pos => {
      const tl = this._createTrafficLight(pos.x, pos.z);
      this.trafficLights.push(tl);
    });
  }

  _createTrafficLight(x, z) {
    const group = new THREE.Group();

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    // Housing
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.4, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    housing.position.y = 4.2;
    group.add(housing);

    // Lights
    const colors = [0x22c55e, 0xeab308, 0xef4444]; // green, yellow, red
    const lights = [];
    colors.forEach((color, i) => {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 12, 12),
        new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: i === 0 ? 1.5 : 0 })
      );
      light.position.y = 3.8 + i * 0.4;
      group.add(light);
      lights.push(light);
    });

    group.position.set(x, 0, z);
    this.scene.add(group);
    this.objects.push(group);

    return {
      group,
      lights,
      state: 'green',
      timer: 0,
      cycle: [ // [state, duration]
        ['green', 5.5],
        ['yellow', 1.5],
        ['red', 4],
      ],
      cycleIndex: 0,
    };
  }

  updateTrafficLights(dt) {
    this.trafficLights.forEach(tl => {
      tl.timer += dt;
      while (tl.timer >= tl.cycle[tl.cycleIndex][1]) {
        tl.timer -= tl.cycle[tl.cycleIndex][1];
        tl.cycleIndex = (tl.cycleIndex + 1) % tl.cycle.length;
        const [state] = tl.cycle[tl.cycleIndex];
        tl.state = state;

        // Update light visuals
        tl.lights.forEach((l, i) => {
          const stateIndex = { green: 0, yellow: 1, red: 2 }[state];
          l.material.emissiveIntensity = (i === stateIndex) ? 1.5 : 0;
        });
      }
    });
  }

  getTrafficLightState() {
    return this.trafficLights.length > 0 ? this.trafficLights[0].state : 'green';
  }

  _buildFinishLine() {
    const p = this._findNearestPoint(TRACK_CONSTANTS.FINISH_Z);
    const point = this.roadPoints[p];
    const tangent = this.roadTangents[p];
    const angle = Math.atan2(tangent.x, tangent.z);

    // White stripe across the road
    const finishGeo = new THREE.PlaneGeometry(TRACK_CONSTANTS.ROAD_WIDTH, 0.5);
    const finishMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const finish = new THREE.Mesh(finishGeo, finishMat);
    finish.rotation.x = -Math.PI / 2;
    finish.rotation.z = -angle;
    finish.position.set(point.x, 0.04, point.z);
    this.scene.add(finish);
    this.objects.push(finish);

    // "FINISH" text placeholder
    const finishSign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    finishSign.position.set(point.x, 2, point.z);
    finishSign.rotation.y = angle;
    this.scene.add(finishSign);
    this.objects.push(finishSign);
  }

  _buildStartLine() {
    const p = this._findNearestPoint(TRACK_CONSTANTS.ROAD_START_Z);
    const point = this.roadPoints[p];
    const tangent = this.roadTangents[p];
    const angle = Math.atan2(tangent.x, tangent.z);

    const startGeo = new THREE.PlaneGeometry(TRACK_CONSTANTS.ROAD_WIDTH, 0.3);
    const startMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const start = new THREE.Mesh(startGeo, startMat);
    start.rotation.x = -Math.PI / 2;
    start.rotation.z = -angle;
    start.position.set(point.x, 0.04, point.z);
    this.scene.add(start);
    this.objects.push(start);
  }

  _buildTrafficSigns() {
    const signs = [
      { x: 7, z: 50, color: 0xffffff, label: '60' },
      { x: -7, z: -50, color: 0xfbbf24, label: '!' },
      { x: 7, z: -100, color: 0xdc2626, label: 'STOP' },
      { x: -7, z: -120, color: 0x2563eb, label: '🚶' },
    ];

    signs.forEach(s => {
      // Pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 3, 8),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      pole.position.set(s.x, 1.5, s.z);
      pole.castShadow = true;
      this.scene.add(pole);
      this.objects.push(pole);

      // Sign board
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.05),
        new THREE.MeshLambertMaterial({ color: s.color })
      );
      sign.position.set(s.x, 3, s.z);
      sign.castShadow = true;
      this.scene.add(sign);
      this.objects.push(sign);
    });
  }

  _buildTrees() {
    for (let i = 0; i < 50; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (10 + Math.random() * 40);
      const z = -200 + Math.random() * 400;
      this._createTree(x, 0, z);
    }
  }

  _createTree(x, y, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.25, 3, 8),
      new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    trunk.position.set(x, y + 1.5, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    this.objects.push(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x228B22 })
    );
    foliage.position.set(x, y + 4, z);
    foliage.castShadow = true;
    this.scene.add(foliage);
    this.objects.push(foliage);
  }

  _buildStreetLights() {
    for (let i = 0; i < this.roadPoints.length; i += 40) {
      const p = this.roadPoints[i];
      const t = this.roadTangents[i].normalize();
      const right = new THREE.Vector3(-t.z, 0, t.x).normalize();

      for (const side of [-1, 1]) {
        const pos = p.clone().addScaledVector(right, side * 7);

        // Pole
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, 6, 8),
          new THREE.MeshLambertMaterial({ color: 0x555555 })
        );
        pole.position.set(pos.x, 3, pos.z);
        pole.castShadow = true;
        this.scene.add(pole);
        this.objects.push(pole);

        // Lamp head
        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.15, 0.3),
          new THREE.MeshLambertMaterial({ color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.3 })
        );
        lamp.position.set(pos.x - side * 0.4, 6, pos.z);
        this.scene.add(lamp);
        this.objects.push(lamp);
      }
    }
  }

  _buildParkingArea() {
    // Parking area near start
    const parking = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 25),
      new THREE.MeshLambertMaterial({ color: 0x444444 })
    );
    parking.rotation.x = -Math.PI / 2;
    parking.position.set(-12, 0.015, 10);
    parking.receiveShadow = true;
    this.scene.add(parking);
    this.objects.push(parking);

    // Parking lines
    for (let i = -8; i <= 8; i += 4) {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(0.1, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(-12 + i, 0.025, 5);
      this.scene.add(line);
      this.objects.push(line);
    }
  }

  _findNearestPoint(targetZ) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < this.roadPoints.length; i++) {
      const d = Math.abs(this.roadPoints[i].z - targetZ);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  getSpawnPosition() {
    return new THREE.Vector3(-12, 0, 10);
  }

  getVehicleStartPosition() {
    const idx = this._findNearestPoint(TRACK_CONSTANTS.START_Z);
    const p = this.roadPoints[idx];
    return new THREE.Vector3(p.x, 0, p.z);
  }

  getIdealLinePoint(z) {
    const idx = this._findNearestPoint(z);
    return this.roadPoints[idx].clone();
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.traverse?.(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      });
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.objects = [];
  }
}

window.Track = Track;
window.TRACK_CONSTANTS = TRACK_CONSTANTS;
