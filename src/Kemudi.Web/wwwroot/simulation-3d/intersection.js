/** Reusable, metre-based straight-through Indonesian intersection. +Y up, north = -Z. */
(function (root) {
  const UP = new THREE.Vector3(0, 1, 0);
  const DEFAULT = {
    id: 'cedar-junction', center: [0, .09, -80], laneWidth: 3.5, armLength: 60,
    stripeWidth: .3, stripeGap: .45, crosswalkLength: 3, stopGap: 1, stopLineWidth: .25,
    greenNS: 25, yellowNS: 3, allRed: 1, greenEW: 25, yellowEW: 3,
    roadClass: 'non_national', violationsEnabled: true, reactionTime: .8,
    deceleration: 3, buffer: .6, targetSpeed: 6, carsPerApproach: 2,
    turnsEnabled: false, pedestrianAIEnabled: false, yellowBoxEnabled: false,
  };
  class IntersectionDefinition {
    constructor(options = {}) {
      this.config = { ...DEFAULT, ...options };
      const c = this.config;
      if (c.turnsEnabled || c.pedestrianAIEnabled || c.yellowBoxEnabled) throw Error('This slice supports straight movements without pedestrian AI or yellow box');
      for (const k of ['laneWidth', 'armLength', 'stripeWidth', 'stripeGap', 'crosswalkLength', 'stopGap', 'stopLineWidth', 'greenNS', 'yellowNS', 'allRed', 'greenEW', 'yellowEW', 'deceleration'])
        if (!(c[k] > 0) || !Number.isFinite(c[k])) throw Error('Invalid intersection parameter: ' + k);
      for (const k of ['reactionTime', 'buffer', 'targetSpeed'])
        if (!Number.isFinite(c[k]) || c[k] < 0) throw Error('Invalid intersection parameter: ' + k);
      if (!Number.isInteger(c.carsPerApproach) || c.carsPerApproach < 0 || !Array.isArray(c.center) || c.center.length !== 3 || !c.center.every(Number.isFinite)) throw Error('Invalid traffic count or center');
      this.center = new THREE.Vector3(...c.center);
      this.crosswalkDistance = c.laneWidth + 1 + c.crosswalkLength / 2;
      this.stopDistance = c.laneWidth + 1 + c.crosswalkLength + c.stopGap + c.stopLineWidth / 2;
      if (c.crosswalkLength < 2.5 || c.stopLineWidth < .2 || c.stopLineWidth > .3 || c.armLength <= this.stopDistance + 5) throw Error('Unsupported marking dimensions');
      this.approaches = Object.entries({ N: [0, 0, 1], S: [0, 0, -1], E: [-1, 0, 0], W: [1, 0, 0] }).map(([id, f]) => {
        const forward = new THREE.Vector3(...f);
        // Three.js right-handed XZ: up x forward is the driver's left.
        const left = new THREE.Vector3().crossVectors(UP, forward).normalize();
        const armLength = c.armLengths?.[id] ?? c.armLength;
        if (!Number.isFinite(armLength) || armLength <= this.stopDistance + 5 || (c.carsPerApproach > 0 && armLength < Math.max(22, this.stopDistance + 8) + (c.carsPerApproach - 1) * 12 + 2.1)) throw Error('Approach too short for markings or demo queue: ' + id);
        return { id, forward, left, armLength, group: 'NS'.includes(id) ? 'NS' : 'EW',
          inboundId: c.id + ':' + id + ':in', outboundId: c.id + ':' + id + ':out',
          stopLineId: c.id + ':' + id + ':stop', signalId: c.id + ':' + id + ':signal' };
      });
      this.lanes = this.approaches.flatMap(a => [
        { id: a.inboundId, width: c.laneWidth, direction: a.forward, allowedMovements: ['straight'], centerline: [this.point(a, -a.armLength), this.point(a, 0)] },
        { id: a.outboundId, width: c.laneWidth, direction: a.forward.clone().negate(), allowedMovements: ['straight'], centerline: [this.point(a, 0, -1), this.point(a, -a.armLength, -1)] },
      ]);
      this.connections = this.approaches.map(a => ({ id: c.id + ':' + a.id + ':straight', fromLane: a.inboundId,
        toLane: this.approaches.find(b => b.forward.dot(a.forward) < -.99).outboundId, turnType: 'straight', conflictGroup: a.group }));
      this.conflictMatrix = this.approaches.map(a => this.approaches.map(b => a.group !== b.group));
    }
    point(a, s, side = 1) { return this.center.clone().addScaledVector(a.left, this.config.laneWidth / 2 * side).addScaledVector(a.forward, s); }
    project(a, position) { return position.clone().sub(this.center).dot(a.forward); }
  }
  class TrafficSignalController {
    constructor(definition) {
      this.definition = definition; const c = definition.config;
      const phase = (id, duration, ns, ew) => ({ id, duration, colors: { N: ns, S: ns, E: ew, W: ew } });
      this.phases = [phase('NS_GREEN', c.greenNS, 'GREEN', 'RED'), phase('NS_YELLOW', c.yellowNS, 'YELLOW', 'RED'),
        phase('ALL_RED_1', c.allRed, 'RED', 'RED'), phase('EW_GREEN', c.greenEW, 'RED', 'GREEN'),
        phase('EW_YELLOW', c.yellowEW, 'RED', 'YELLOW'), phase('ALL_RED_2', c.allRed, 'RED', 'RED')];
      this.validate(); this.reset();
    }
    validate() {
      if (!this.phases.length) throw Error('Empty signal cycle');
      for (const p of this.phases) {
        if (!Number.isFinite(p.duration) || p.duration <= 0 || !this.definition.approaches.every(a => ['RED', 'YELLOW', 'GREEN'].includes(p.colors?.[a.id]))) throw Error('Invalid signal phase ' + p.id);
      }
      for (const p of this.phases) for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
        if (this.definition.conflictMatrix[i][j] && p.colors[this.definition.approaches[i].id] !== 'RED' && p.colors[this.definition.approaches[j].id] !== 'RED') throw Error('Conflicting signal phase ' + p.id);
    }
    reset() { this.index = 0; this.elapsed = 0; this.startup = this.definition.config.allRed; }
    get current() { return this.startup > 0 ? { id: 'START_ALL_RED', colors: { N: 'RED', S: 'RED', E: 'RED', W: 'RED' } } : this.phases[this.index]; }
    update(dt) {
      if (!Number.isFinite(dt)) return;
      dt = Math.max(0, dt);
      if (this.startup > 0) { const used = Math.min(this.startup, dt); this.startup -= used; dt -= used; }
      this.elapsed += dt;
      this.elapsed %= this.phases.reduce((sum, p) => sum + p.duration, 0);
      while (this.elapsed >= this.phases[this.index].duration) { this.elapsed -= this.phases[this.index].duration; this.index = (this.index + 1) % this.phases.length; }
    }
  }
  function meshBox(parent, name, dimensions, position, material) {
    if (!material.userData.linearPalette) { material.color.convertSRGBToLinear(); material.userData.linearPalette = true; }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
    mesh.name = name; mesh.position.copy(position); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  class RoadMarkingBuilder {
    constructor(def, group) { this.def = def; this.group = group; this.material = new THREE.MeshBasicMaterial({ color: 0xf3f3ed, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); }
    rect(a, s, lateral, width, length, name, material = this.material) {
      const p = this.def.center.clone().addScaledVector(a.forward, s).addScaledVector(a.left, lateral); p.y += .01;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
      m.name = name; m.rotation.set(-Math.PI / 2, 0, Math.atan2(a.forward.x, a.forward.z)); m.position.copy(p); this.group.add(m); return m;
    }
    build() {
      const d = this.def, c = d.config;
      for (const a of d.approaches) {
        this.rect(a, -d.stopDistance, c.laneWidth / 2, c.laneWidth, c.stopLineWidth, a.stopLineId);
        const count = Math.floor((2 * c.laneWidth + c.stripeGap) / (c.stripeWidth + c.stripeGap));
        const span = count * c.stripeWidth + (count - 1) * c.stripeGap;
        for (let i = 0; i < count; i++) this.rect(a, -d.crosswalkDistance, -span / 2 + c.stripeWidth / 2 + i * (c.stripeWidth + c.stripeGap), c.stripeWidth, c.crosswalkLength, a.id + ':zebra:' + i);
        const centerMat = new THREE.MeshBasicMaterial({ color: c.roadClass === 'national' ? 0xeacb41 : 0xf3f3ed });
        for (let s = d.stopDistance + 4; s < a.armLength - 1.5; s += 6) this.rect(a, -s, 0, .12, 3, a.id + ':center:' + s, centerMat);
        const arrowS = -d.stopDistance - 4;
        this.rect(a, arrowS - 1.4, c.laneWidth / 2, .13, 2, a.id + ':arrow-shaft');
        const tip = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 3), this.material);
        tip.name = a.inboundId + ':arrow'; tip.rotation.x = Math.PI / 2; tip.rotation.z = -Math.atan2(a.forward.x, a.forward.z);
        // Flat triangle in XZ, tip at forward end.
        const geometry = new THREE.BufferGeometry(); const p = d.point(a, arrowS); p.y += .011;
        const points = [p.clone().addScaledVector(a.forward, .6), p.clone().addScaledVector(a.forward, -.4).addScaledVector(a.left, .45), p.clone().addScaledVector(a.forward, -.4).addScaledVector(a.left, -.45)];
        geometry.setFromPoints(points); geometry.setIndex([0, 2, 1]); geometry.computeVertexNormals(); tip.geometry.dispose(); tip.geometry = geometry; tip.rotation.set(0, 0, 0); tip.material.side = THREE.DoubleSide; this.group.add(tip);
      }
    }
  }
  class TrafficSignalVisual {
    constructor(def, approach, parent) {
      const dark = new THREE.MeshLambertMaterial({ color: 0x20252a });
      this.group = new THREE.Group(); this.group.name = approach.signalId;
      this.group.position.copy(def.center).addScaledVector(approach.forward, -def.stopDistance).addScaledVector(approach.left, def.config.laneWidth + .65);
      // Local +Z is the front of each head, facing back along the approach.
      this.group.rotation.y = Math.atan2(-approach.forward.x, -approach.forward.z);
      parent.add(this.group);
      meshBox(this.group, 'foundation', [.35, .16, .35], new THREE.Vector3(0, .08, 0), dark);
      meshBox(this.group, 'pole', [.09, 2.8, .09], new THREE.Vector3(0, 1.4, 0), dark);
      meshBox(this.group, 'housing', [.48, 1.3, .26], new THREE.Vector3(0, 3, 0), dark);
      this.lenses = ['RED', 'YELLOW', 'GREEN'].map((color, i) => {
        const value = { RED: 0xff3030, YELLOW: 0xffbf24, GREEN: 0x20d66b }[color];
        const material = new THREE.MeshLambertMaterial({ color: value, emissive: value, emissiveIntensity: 0 });
        material.emissive.convertSRGBToLinear();
        const lens = new THREE.Mesh(new THREE.CircleGeometry(.15, 16), material); lens.position.set(0, 3.4 - i * .4, .14); this.group.add(lens);
        meshBox(this.group, 'visor:' + color, [.4, .045, .27], new THREE.Vector3(0, 3.59 - i * .4, .23), dark);
        return lens;
      });
    }
    set(color) { this.lenses.forEach((lens, i) => { const on = ['RED', 'YELLOW', 'GREEN'][i] === color; lens.material.color.setHex(on ? [0xff3030, 0xffbf24, 0x20d66b][i] : [0x451b1b, 0x453719, 0x153c26][i]).convertSRGBToLinear(); lens.material.emissiveIntensity = on ? 1.2 : 0; }); }
  }
  class VehicleTrafficAgent {
    constructor(system, approach, index) {
      this.system = system; this.approach = approach; this.id = approach.inboundId + ':agent:' + index;
      this.length = 4.2; this.width = 1.7; this.initialS = -Math.max(22, system.definition.stopDistance + 8) - index * 12;
      this.s = this.initialS; this.speed = 0; this.committed = false; this.yellowDecision = null;
      this.mesh = new THREE.Group(); this.mesh.name = this.id; system.group.add(this.mesh);
      const body = new THREE.MeshLambertMaterial({ color: [0x4d7f9e, 0xab7758, 0x8e9a7c, 0x9a899f][system.definition.approaches.indexOf(approach)] });
      meshBox(this.mesh, 'body', [this.width, .6, this.length], new THREE.Vector3(0, .55, 0), body);
      meshBox(this.mesh, 'cabin', [1.45, .6, 1.8], new THREE.Vector3(0, 1.1, -.1), new THREE.MeshLambertMaterial({ color: 0x34454d }));
      const tyre = new THREE.MeshLambertMaterial({ color: 0x202124 });
      for (const x of [-.85, .85]) for (const z of [-1.3, 1.3]) meshBox(this.mesh, 'wheel', [.18, .55, .55], new THREE.Vector3(x, .28, z), tyre);
      this.mesh.rotation.y = Math.atan2(-approach.forward.x, -approach.forward.z); this.sync();
    }
    get front() { return this.s + this.length / 2; }
    sync() { this.mesh.position.copy(this.system.definition.point(this.approach, this.s)); }
    update(dt, obstacles) {
      const d = this.system.definition, c = d.config, stop = -d.stopDistance - c.stopLineWidth / 2 - c.buffer;
      const color = this.system.controller.current.colors[this.approach.id];
      const distance = stop - this.front;
      if (color !== 'YELLOW') this.yellowDecision = null;
      if (color === 'YELLOW' && this.yellowDecision === null) this.yellowDecision = distance >= this.speed * c.reactionTime + this.speed ** 2 / (2 * c.deceleration) + c.buffer;
      let limit = Infinity;
      const exitCenter = d.stopDistance + this.length / 2 + c.buffer;
      const exitOccupied = obstacles.some(o => {
        const relative = o.position.clone().sub(d.center);
        const along = relative.dot(this.approach.forward);
        const lateral = relative.dot(this.approach.left);
        return along > 0 && Math.abs(lateral - c.laneWidth / 2) < (this.width + o.width) / 2
          && Math.abs(along - exitCenter) < (this.length + o.length) / 2 + c.buffer;
      });
      const blocked = this.system.exitBlocked[this.approach.id] || exitOccupied || this.system.occupiedByConflict(this);
      if (!this.committed && (blocked || color === 'RED' || color === 'YELLOW' && this.yellowDecision)) limit = stop - this.length / 2;
      for (const o of obstacles) {
        const rel = o.position.clone().sub(d.point(this.approach, this.s));
        if (Math.abs(rel.dot(this.approach.left)) < (this.width + o.width) / 2 + .2 && rel.dot(this.approach.forward) > 0)
          limit = Math.min(limit, this.s + rel.dot(this.approach.forward) - o.length / 2 - this.length / 2 - 1.2);
      }
      const gap = Math.max(0, limit - this.s);
      // Solve v * reactionTime + v² / (2a) <= gap, including one integration step.
      const reaction = c.reactionTime + dt;
      const target = Math.min(c.targetSpeed, Math.sqrt((c.deceleration * reaction) ** 2 + 2 * c.deceleration * gap) - c.deceleration * reaction);
      this.speed = target < this.speed ? Math.max(target, this.speed - c.deceleration * dt) : Math.min(target, this.speed + 2 * dt);
      this.s = Math.min(Math.max(this.s, limit), this.s + this.speed * dt);
      if (gap < .02) this.speed = 0;
      if (this.front > -d.stopDistance) this.committed = true;
      const outgoing = d.approaches.find(a => a.forward.dot(this.approach.forward) < -.99);
      if (this.s > outgoing.armLength - this.length / 2) {
        const spawn = d.point(this.approach, -this.approach.armLength + this.length / 2);
        const spawnClear = !obstacles.some(o => Math.abs(o.position.clone().sub(spawn).dot(this.approach.left)) < (this.width + o.width) / 2 + .2 && Math.abs(o.position.clone().sub(spawn).dot(this.approach.forward)) < (this.length + o.length) / 2 + 2);
        this.s = spawnClear ? -this.approach.armLength + this.length / 2 : outgoing.armLength - this.length / 2;
        this.speed = 0;
        if (spawnClear) this.committed = false;
      }
      this.sync();
    }
  }
  class IntersectionSystem {
    constructor(scene, options = {}) {
      this.definition = new IntersectionDefinition(options); this.controller = new TrafficSignalController(this.definition);
      this.group = new THREE.Group(); this.group.name = this.definition.config.id; scene.add(this.group);
      this.exitBlocked = { N: false, S: false, E: false, W: false }; this.agents = []; this.accumulator = 0; this.player = null;
      this.signals = this.definition.approaches.map(a => new TrafficSignalVisual(this.definition, a, this.group));
      const d = this.definition, c = d.config, asphalt = new THREE.MeshLambertMaterial({ color: 0x35434b });
      meshBox(this.group, 'road:center', [c.laneWidth * 2, .08, c.laneWidth * 2], d.center.clone().add(new THREE.Vector3(0, -.04, 0)), asphalt);
      for (const a of d.approaches) {
        const end = a.armLength;
        const road = meshBox(this.group, 'road:' + a.id, [c.laneWidth * 2, .08, end - c.laneWidth],
          d.center.clone().addScaledVector(a.forward, -(end + c.laneWidth) / 2).add(new THREE.Vector3(0, -.04, 0)), asphalt);
        road.rotation.y = Math.atan2(a.forward.x, a.forward.z);
      }
      const ground = new THREE.MeshLambertMaterial({ color: 0x63846c });
      meshBox(this.group, 'ground', [c.armLength * 2 + 12, .08, c.armLength * 2 + 12], d.center.clone().add(new THREE.Vector3(0, -.13, 0)), ground);
      new RoadMarkingBuilder(d, this.group).build();
      for (const a of d.approaches) for (let i = 0; i < c.carsPerApproach; i++) this.agents.push(new VehicleTrafficAgent(this, a, i));
      this.debugGeometry = new THREE.Group(); this.debugGeometry.name = 'Lane_Debug'; this.debugGeometry.visible = false; this.group.add(this.debugGeometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x4be7dc });
      for (const lane of d.lanes) {
        const points = lane.centerline.map(p => p.clone().add(new THREE.Vector3(0, .035, 0)));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial); line.name = lane.id; this.debugGeometry.add(line);
        const arrow = new THREE.ArrowHelper(lane.direction, points[0].clone().lerp(points[1], .5), 3, 0x4be7dc, .8, .4); this.debugGeometry.add(arrow);
      }
      this.publish();
    }
    occupiedByConflict(agent) {
      const d = this.definition;
      return this.agents.some(other => other !== agent && other.approach.group !== agent.approach.group && other.committed && Math.abs(other.s) < d.stopDistance + other.length / 2)
        || this.player && Math.abs(this.player.position.x - d.center.x) < d.config.laneWidth + this.player.config.dimensions.length / 2 && Math.abs(this.player.position.z - d.center.z) < d.config.laneWidth + this.player.config.dimensions.length / 2;
    }
    update(dt, player = null) {
      if (!Number.isFinite(dt)) return;
      this.player = player; this.accumulator += Math.min(Math.max(dt, 0), .25);
      while (this.accumulator >= 1 / 60) {
        this.controller.update(1 / 60);
        // Snapshot positions before stepping: queue decisions do not depend on render order.
        const obstacles = this.agents.map(a => ({ id: a.id, position: a.mesh.position.clone(), length: a.length, width: a.width }));
        if (player) obstacles.push({ id: 'player', position: player.position, ...player.config.dimensions });
        for (const a of this.agents) a.update(1 / 60, obstacles.filter(o => o.id !== a.id));
        this.accumulator -= 1 / 60;
      }
      this.publish();
      if (this.debugElement && !this.debugElement.hidden) this.debugElement.textContent = JSON.stringify(this.snapshot(), null, 2);
    }
    publish() { this.signals.forEach((s, i) => s.set(this.controller.current.colors[this.definition.approaches[i].id])); }
    reset() { this.controller.reset(); this.accumulator = 0; this.player = null; Object.keys(this.exitBlocked).forEach(id => { this.exitBlocked[id] = false; }); this.agents.forEach(a => { a.s = a.initialS; a.speed = 0; a.committed = false; a.yellowDecision = null; a.sync(); }); this.publish(); }
    crossedRed(before, vehicle) {
      if (!this.definition.config.violationsEnabled) return false;
      const d = this.definition;
      return d.approaches.some(a => {
        const b = d.project(a, before) + vehicle.config.dimensions.length / 2;
        const f = d.project(a, vehicle.position) + vehicle.config.dimensions.length / 2;
        const lateral = vehicle.position.clone().sub(d.center).dot(a.left);
        const heading = vehicle.getForwardDirection().dot(a.forward);
        return heading > .5 && lateral > 0 && lateral < d.config.laneWidth && b <= -d.stopDistance && f > -d.stopDistance && this.controller.current.colors[a.id] === 'RED';
      });
    }
    snapshot() { return { id: this.definition.config.id, phase: this.controller.current.id, elapsed: this.controller.elapsed,
      geometry: { center: this.definition.config.center, laneWidth: this.definition.config.laneWidth, stopDistance: this.definition.stopDistance, crosswalkDistance: this.definition.crosswalkDistance },
      colors: this.controller.current.colors, approaches: this.definition.approaches.map(a => ({ id: a.id, lane: a.inboundId, stopLine: a.stopLineId, signal: a.signalId })),
      agents: this.agents.map(a => ({ id: a.id, approach: a.approach.id, s: a.s, front: a.front, speed: a.speed, committed: a.committed })) }; }
    toggleDebug() {
      if (!this.debugElement) { this.debugElement = document.createElement('pre'); this.debugElement.id = 'intersection-debug'; this.debugElement.style.cssText = 'position:fixed;right:12px;top:48px;max-height:65vh;overflow:auto;max-width:380px;background:#17191cf5;color:#ddd;padding:12px;font-size:11px;z-index:45'; this.debugElement.hidden = true; document.body.appendChild(this.debugElement); }
      this.debugElement.hidden = !this.debugElement.hidden;
      this.debugGeometry.visible = !this.debugElement.hidden;
    }
    dispose() { this.debugElement?.remove(); const geometries = new Set(), materials = new Set(); this.group.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) materials.add(o.material); }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.group.parent?.remove(this.group); }
  }
  Object.assign(root, { IntersectionDefinition, TrafficSignalController, RoadMarkingBuilder, TrafficSignalVisual, VehicleTrafficAgent, IntersectionSystem });
})(window);

