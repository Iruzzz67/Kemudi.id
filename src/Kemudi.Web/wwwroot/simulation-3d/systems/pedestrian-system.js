/* Original crossing walkers using the map's zebra geometry and shared safety bodies. */
(function (root) {
  'use strict';
  class PedestrianSystem {
    constructor(scene, track, world) {
      this.scene = scene; this.track = track; this.world = world; this.disposed = false;
      this.agents = []; this.proposals = [];
      // Three walkers per junction, at three distinct actual zebra crossings.
      const crossings = root.TrafficRoutes.crossings(track).filter(c => c.approach.id !== 'W');
      crossings.forEach((crosswalk, index) => {
        const character = root.CharacterSystem.createCharacter('pedestrian', index);
        const position = crosswalk.center.clone().addScaledVector(crosswalk.left, crosswalk.sidewalk);
        const actor = { id: 'pedestrian:' + index, group: character.group, character, crosswalk,
          position, rotation: 0, speed: 0, walkSpeed: 1.15 + (index % 3) * .08,
          crossing: false, requesting: false, side: 1, progress: 0,
          waitTimer: 0, waitDuration: 4 + index * 1.8,
          shape: { width: .5, length: .5, height: 1.75, kind: 'pedestrian' } };
        character.group.name = actor.id;
        character.group.position.copy(position); scene.add(character.group);
        this._placeOnSidewalk(actor);
        world.registerBody(actor.id, actor, actor.shape);
        this.agents.push(actor);
      });
    }
    getActiveAgents() { return this.agents; }
    getMotionProposals() { return this.proposals; }
    getCrossingConstraints() {
      return this.agents.filter(p => p.crossing || p.requesting).map(p => ({
        ...p.crosswalk, occupied: p.crossing, requesting: p.requesting, pedestrianId: p.id,
      }));
    }
    _placeOnSidewalk(ped) {
      for (const side of [1, -1]) {
        const position = ped.crosswalk.center.clone().addScaledVector(ped.crosswalk.left, side * ped.crosswalk.sidewalk);
        if (!this.world.canSpawn({ position, rotation: 0 }, ped.shape, ped.id)) continue;
        ped.side = side; ped.position.copy(position); ped.group.position.copy(position); return;
      }
      throw new Error('No safe sidewalk spawn for ' + ped.id);
    }
    _safeToEnter(pedestrian, vehicles) {
      const c = pedestrian.crosswalk;
      const crossingSeconds = c.sidewalk * 2 / pedestrian.walkSpeed;
      for (const vehicle of vehicles) {
        if (vehicle.active === false) continue;
        const delta = vehicle.position.clone().sub(c.center);
        const yaw = vehicle.rotation || 0, forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const side = new THREE.Vector3(-forward.z, 0, forward.x);
        const d = vehicle.config.dimensions;
        const projectedHalf = axis => Math.abs(forward.dot(axis)) * d.length / 2 + Math.abs(side.dot(axis)) * d.width / 2;
        const along = delta.dot(c.forward), lateral = delta.dot(c.left);
        if (Math.abs(along) < c.halfDepth + projectedHalf(c.forward) + .45
          && Math.abs(lateral) < c.halfWidth + projectedHalf(c.left) + .5) return false;
        const actualDirection = forward.clone().multiplyScalar(vehicle.speed < 0 ? -1 : 1);
        const ahead = -delta.dot(actualDirection) - d.length / 2;
        const laneDistance = Math.abs(delta.dot(side));
        // Wait for vehicles that cannot reasonably yield before the walker clears.
        if (ahead >= 0 && laneDistance < c.sidewalk + d.width / 2 && Math.abs(vehicle.speed) > .1
          && ahead / Math.abs(vehicle.speed) < crossingSeconds + 1) return false;
      }
      return true;
    }
    update(dt, vehicles = []) {
      this.proposals = [];
      if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .1);
      for (const ped of this.agents) {
        ped.waitTimer += dt;
        if (!ped.crossing && ped.waitTimer >= ped.waitDuration) ped.requesting = true;
        if (!ped.crossing && ped.requesting && this._safeToEnter(ped, vehicles)) {
          ped.crossing = true; ped.requesting = false; ped.progress = 0;
        }
        if (ped.crossing) {
          const c = ped.crosswalk, direction = c.left.clone().multiplyScalar(-ped.side);
          const distance = Math.min(ped.walkSpeed * dt, c.sidewalk * 2 - ped.progress);
          const target = ped.position.clone().addScaledVector(direction, distance);
          const rotation = Math.atan2(-direction.x, -direction.z);
          this.proposals.push({ id: ped.id, position: target, rotation });
        }
      }
    }
    commit(resolutions, dt) {
      if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
      const moving = new Set(this.proposals.map(p => p.id));
      for (const ped of this.agents) {
        const result = moving.has(ped.id) ? resolutions.get(ped.id) : null;
        if (result) {
          ped.position.copy(result.position); ped.rotation = result.rotation;
          ped.progress += result.distance; ped.speed = Math.max(0, result.speed);
          if (ped.progress >= ped.crosswalk.sidewalk * 2 - .001) {
            ped.crossing = false; ped.side *= -1; ped.waitTimer = 0; ped.waitDuration = 8 + Number(ped.id.split(':')[1]) * .5;
            ped.speed = 0;
          }
        } else ped.speed = 0;
        ped.group.position.copy(ped.position); ped.group.rotation.y = ped.rotation;
        ped.character.update(dt, { state: ped.crossing ? 'crossing' : 'waiting', speed: ped.speed });
      }
      this.proposals = [];
    }
    reset() {
      this.proposals = [];
      for (const ped of this.agents) this.world.unregisterBody(ped.id);
      for (const [index, ped] of this.agents.entries()) {
        ped.side = 1; ped.crossing = false; ped.requesting = false; ped.progress = 0; ped.speed = 0;
        ped.waitTimer = 0; ped.waitDuration = 4 + index * 1.8;
        this._placeOnSidewalk(ped); this.world.registerBody(ped.id, ped, ped.shape);
      }
    }
    dispose() {
      if (this.disposed) return; this.disposed = true;
      this.agents.forEach(p => { this.world.unregisterBody(p.id); p.character.dispose(); });
      this.agents = []; this.proposals = [];
    }
  }
  root.PedestrianSystem = PedestrianSystem;
})(window);
