/* Shared-world traffic: real Vehicle prefabs, snapshot following, authoritative signals. */
(function (root) {
  'use strict';
  const TYPES = ['MOTOR', 'MOBIL', 'TRUK'];
  const BASE_GAP = { MOTOR: 1.8, MOBIL: 2.8, TRUK: 4.5 };
  const HEADWAY = { MOTOR: 1.2, MOBIL: 1.5, TRUK: 1.9 };
  const CRUISE = { MOTOR: 6, MOBIL: 6, TRUK: 4.8 };
  function positive(value, fallback) { return Number.isFinite(value) && value > 0 ? value : fallback; }
  class TrafficSystem {
    constructor(scene, track, world, registry) {
      this.scene = scene; this.track = track; this.world = world; this.registry = registry;
      this.routes = root.TrafficRoutes.build(track); this.vehicles = []; this.pending = new Map();
      this.initialized = false; this.disposed = false;
    }
    async init() {
      if (this.initialized) return;
      let index = 0;
      for (const junction of this.track.intersections) for (const approach of junction.definition.approaches)
        for (let laneIndex = 0; laneIndex < 2; laneIndex++) {
          const vehicle = new root.Vehicle(this.scene, TYPES[index % TYPES.length], 'automatic');
          vehicle.id = 'traffic:' + index++; vehicle.group.visible = false; vehicle.active = false;
          vehicle.junction = junction; vehicle.approach = approach;
          vehicle.route = this.routes.byApproach.get(junction.definition.config.id + ':' + approach.id);
          vehicle.spawnProgress = vehicle.route.project(junction.definition.point(approach, -22 - laneIndex * 14));
          vehicle.routeProgress = vehicle.spawnProgress; vehicle.yellowDecisions = new Map();
          vehicle.blockedTimer = 0; vehicle.hornCooldown = 0;
          this.vehicles.push(vehicle);
        }
      try {
        await Promise.all(this.vehicles.map(v => v.ready));
        this.reset();
        for (const vehicle of this.vehicles) this.registry.register(vehicle);
      } catch (error) {
        for (const vehicle of this.vehicles) {
          this.world.unregisterBody(vehicle.id); this.registry.unregister(vehicle.id); vehicle.dispose();
        }
        this.vehicles = []; throw error;
      }
      // All replacements loaded and validated before removing the legacy demo.
      const geometries = new Set(), materials = new Set();
      for (const junction of this.track.intersections) {
        for (const agent of junction.agents) {
          agent.mesh.parent?.remove(agent.mesh);
          agent.mesh.traverse(object => {
            if (object.geometry) geometries.add(object.geometry);
            if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m));
          });
        }
        junction.agents = [];
        junction.trafficAgents = this.vehicles.filter(v => v.junction === junction);
      }
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      this.initialized = true;
    }
    getVehicles() { return this.vehicles; }
    reset() {
      this.pending.clear();
      for (const vehicle of this.vehicles) this.world.unregisterBody(vehicle.id);
      for (const vehicle of this.vehicles) {
        vehicle.speed = 0; vehicle.engineOn = true; vehicle.enginePhase = 'ON'; vehicle.handbrakeOn = false;
        vehicle.gear = 1; vehicle.signalTime = 0; vehicle.signalLeft = false; vehicle.signalRight = false;
        vehicle.hazardOn = false; vehicle.steerAngle = 0; vehicle.braking = false;
        vehicle.blockedTimer = 0; vehicle.hornCooldown = 0; vehicle.hornRequested = false;
        vehicle.stopReason = 'CRUISE'; vehicle.yellowDecisions.clear();
        vehicle.active = false; vehicle.group.visible = false;
        const max = vehicle.route.length - vehicle.config.dimensions.length / 2 - .2;
        // Reuse instances/IDs. Search free lane positions, never displace the player.
        const candidates = [vehicle.spawnProgress];
        for (let step = 1; step <= Math.ceil(vehicle.route.length / 10); step++) {
          candidates.push(vehicle.spawnProgress - step * 10, vehicle.spawnProgress + step * 10);
        }
        for (const progress of candidates) {
          if (progress < vehicle.config.dimensions.length / 2 || progress > max) continue;
          const pose = vehicle.route.sample(progress);
          if (!this.world.canSpawn(pose, vehicle.config.dimensions)) continue;
          vehicle.position.copy(pose.position); vehicle.rotation = pose.rotation; vehicle.routeProgress = progress;
          vehicle.active = true; vehicle.group.visible = true;
          this.world.registerBody(vehicle.id, vehicle); vehicle._updateMeshPosition(); break;
        }
        // A saturated map has no safe spawn: keep this actor hidden/unregistered, not overlapping.
        if (!vehicle.active) vehicle.stopReason = 'NO_SAFE_SPAWN';
      }
    }
    _signalLimit(vehicle, dt, brake, lead) {
      const front = vehicle.routeProgress + vehicle.config.dimensions.length / 2;
      let limit = Infinity, reason = null;
      for (const gate of vehicle.route.gates) {
        if (front > gate.s + .05 || gate.s - front > 100) continue;
        const color = gate.junction.controller.current.colors[gate.approach.id];
        const key = gate.junction.definition.config.id + ':' + gate.approach.id;
        if (color !== 'YELLOW') vehicle.yellowDecisions.delete(key);
        if (color === 'YELLOW' && !vehicle.yellowDecisions.has(key))
          vehicle.yellowDecisions.set(key, gate.s - front >= vehicle.speed * (.8 + dt) + vehicle.speed ** 2 / (2 * brake));
        const d = gate.junction.definition;
        const conflict = this.registry.getVehicles().some(other => {
          if (other === vehicle || other.active === false) return false;
          const rel = other.position.clone().sub(d.center);
          const direction = other.getForwardDirection();
          return Math.abs(direction.dot(gate.approach.forward)) < .6
            && Math.abs(rel.x) < d.config.laneWidth + other.config.dimensions.length / 2
            && Math.abs(rel.z) < d.config.laneWidth + other.config.dimensions.length / 2;
        });
        const exitBlocked = gate.junction.exitBlocked?.[gate.approach.id]
          || lead && lead.speed < .3 && lead.distance < gate.s - front + 2 * d.stopDistance + BASE_GAP[vehicle.type]
            && lead.entity && lead.entity.position.clone().sub(d.center).dot(gate.approach.forward) > -d.stopDistance;
        if (color === 'RED' || color === 'YELLOW' && vehicle.yellowDecisions.get(key) || conflict || exitBlocked) {
          const stop = gate.s - vehicle.config.dimensions.length / 2;
          if (stop < limit) { limit = stop; reason = color === 'RED' ? 'RED_LIGHT' : conflict || exitBlocked ? 'BLOCKED_EXIT' : 'YELLOW_LIGHT'; }
        }
      }
      return { limit, reason };
    }
    _crossingLimit(vehicle, constraints) {
      let limit = Infinity;
      const half = vehicle.config.dimensions.length / 2;
      const forward = vehicle.getForwardDirection(), side = new THREE.Vector3(-forward.z, 0, forward.x);
      for (const c of constraints) {
        const rel = c.center.clone().sub(vehicle.position), along = rel.dot(forward);
        const projectedHalf = Math.abs(c.forward.dot(forward)) * c.halfDepth + Math.abs(c.left.dot(forward)) * c.halfWidth;
        const across = Math.abs(c.forward.dot(side)) * c.halfDepth + Math.abs(c.left.dot(side)) * c.halfWidth;
        if (along <= -half - projectedHalf || along > 70 || Math.abs(rel.dot(side)) > across + vehicle.config.dimensions.width / 2) continue;
        // A requesting walker waits on the sidewalk. Let a vehicle already inside
        // the zebra clear it; stopping that vehicle there deadlocks both actors.
        if (c.occupied === false && along - projectedHalf - half <= 0) continue;
        // An occupied crossing remains a hard yield, without moving cars backwards.
        limit = Math.min(limit, vehicle.routeProgress + Math.max(0, along - projectedHalf - half - 1));
      }
      return limit;
    }
    plan(dt, environment = {}, pedestrians = null) {
      this.pending.clear();
      if (this.disposed || !this.initialized || !Number.isFinite(dt) || dt <= 0) return [];
      dt = Math.min(dt, .25);
      const proposals = [], grip = Math.min(1, positive(environment.roadGripFactor, 1));
      const weatherSpeed = Math.min(1, positive(environment.recommendedAIMaxSpeedFactor, 1));
      const constraints = pedestrians?.getCrossingConstraints() || [];
      for (const vehicle of this.vehicles) {
        if (!vehicle.active) continue;
        const length = vehicle.config.dimensions.length, oldSpeed = Math.max(0, vehicle.speed);
        const braking = Math.max(2, Math.min(4.5, vehicle.config.braking * .5)) * grip;
        const acceleration = vehicle.type === 'TRUK' ? 1.1 : vehicle.type === 'MOTOR' ? 2 : 1.7;
        let target = CRUISE[vehicle.type] * weatherSpeed, reason = 'CRUISE';
        const baseGap = BASE_GAP[vehicle.type] * (1 + (1 - grip));
        const headway = HEADWAY[vehicle.type] * (1 + 2 * (1 - grip));
        const lead = this.world.getLeadObstacle(vehicle.id, Math.max(50, oldSpeed * headway + 30));
        if (lead) {
          const available = Math.max(0, lead.distance - baseGap);
          const leaderSpeed = Math.max(0, lead.speed);
          const follow = Math.max(0, Math.min(leaderSpeed + available / headway,
            Math.sqrt(leaderSpeed * leaderSpeed + 2 * braking * available)));
          const safe = available < .1 && leaderSpeed < .05 ? 0 : follow;
          if (safe < target) { target = safe; reason = lead.kind === 'pedestrian' ? 'YIELD_PEDESTRIAN' : 'FOLLOW'; }
        }
        const signal = this._signalLimit(vehicle, dt, braking, lead);
        let limit = vehicle.route.length - length / 2 - .2, limitReason = 'ROUTE_END';
        if (signal.limit < limit) { limit = signal.limit; limitReason = signal.reason; }
        const crossing = this._crossingLimit(vehicle, constraints);
        if (crossing < limit) { limit = crossing; limitReason = 'YIELD_PEDESTRIAN'; }
        const remaining = Math.max(0, limit - vehicle.routeProgress);
        const reaction = dt + .25;
        const stoppingSpeed = remaining < .035 ? 0
          : Math.sqrt((braking * reaction) ** 2 + 2 * braking * remaining) - braking * reaction;
        if (stoppingSpeed < target) { target = stoppingSpeed; reason = limitReason; }
        if (target < .035) target = 0;
        let nextSpeed = target < oldSpeed ? Math.max(target, oldSpeed - braking * dt) : Math.min(target, oldSpeed + acceleration * dt);
        const travel = Math.min(remaining, nextSpeed * dt, lead ? Math.max(0, lead.distance - .15) : Infinity);
        if (travel < .00001) nextSpeed = 0;
        const nextS = vehicle.routeProgress + travel;
        const pose = travel > .00001 ? vehicle.route.sample(nextS) : { position: vehicle.position.clone(), rotation: vehicle.rotation };
        const turn = Math.atan2(Math.sin(pose.rotation - vehicle.rotation), Math.cos(pose.rotation - vehicle.rotation));
        const steerAngle = THREE.MathUtils.clamp(turn * vehicle.config.wheelbase / Math.max(.05, travel), -.6, .6);
        this.pending.set(vehicle.id, { nextS, target, nextSpeed, oldSpeed, reason, steerAngle,
          braking: nextSpeed < oldSpeed - .001 || target === 0 });
        proposals.push({ id: vehicle.id, position: pose.position, rotation: pose.rotation });
      }
      return proposals;
    }
    commit(resolutions, dt) {
      if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
      for (const vehicle of this.vehicles) {
        const decision = this.pending.get(vehicle.id), result = resolutions.get(vehicle.id);
        if (!decision || !result) continue;
        vehicle.position.copy(result.position); vehicle.rotation = result.rotation;
        vehicle.routeProgress = Math.min(decision.nextS, vehicle.routeProgress + result.distance);
        vehicle.speed = Math.max(0, result.speed); vehicle.steerAngle = decision.steerAngle;
        vehicle.stopReason = result.blocked ? result.contactKind === 'pedestrian' ? 'YIELD_PEDESTRIAN' : 'BLOCKED' : decision.reason;
        vehicle.braking = decision.braking || result.blocked || vehicle.speed < decision.oldSpeed - .02;
        vehicle.hornCooldown = Math.max(0, vehicle.hornCooldown - dt);
        vehicle.blockedTimer = result.blocked && result.contactId === 'player' ? vehicle.blockedTimer + dt : 0;
        if (vehicle.blockedTimer > 6 && vehicle.hornCooldown === 0) {
          vehicle.hornRequested = true; vehicle.hornCooldown = 20; vehicle.blockedTimer = 0;
        }
        vehicle.signalTime += dt; vehicle.signalLeft = false; vehicle.signalRight = false;
        vehicle._updateAutomaticTransmission(); vehicle._updateRPM({ forward: decision.target > 0 });
        const speed = vehicle.speed;
        vehicle.speed = Math.max(0, result.travelSpeed); vehicle._updateMeshPosition(dt); vehicle.speed = speed;
      }
      this.pending.clear();
    }
    dispose() {
      if (this.disposed) return; this.disposed = true;
      for (const vehicle of this.vehicles) {
        this.world.unregisterBody(vehicle.id); this.registry.unregister(vehicle.id); vehicle.dispose();
      }
      this.track.intersections.forEach(j => { j.trafficAgents = []; });
      this.vehicles = []; this.pending.clear();
    }
  }
  root.TrafficSystem = TrafficSystem;
})(window);
