/* Lamp snapshots and a bounded pool of real headlights. Named GLB lamps remain authoritative. */
(function (root) {
  'use strict';
  class VehicleLightSystem {
    constructor(scene) {
      this.scene = scene;
      this.rigs = new Map();
      this.disposed = false;
      this.beams = [];
      this.scratch = new THREE.Vector3();
      for (let i = 0; i < 3; i++) {
        const light = new THREE.SpotLight(0xfff1d0, 0, 35, Math.PI / 6, .6, 2);
        light.name = 'RealismHeadlight:' + i;
        light.castShadow = false;
        light.visible = false;
        scene.add(light, light.target);
        this.beams.push({ light, owner: null });
      }
    }

    registerVehicle(vehicle) {
      if (this.disposed || !vehicle?.id || !vehicle.group) return false;
      const existing = this.rigs.get(vehicle.id);
      if (existing?.vehicle === vehicle) return true;
      if (existing) this.unregisterVehicle(vehicle.id);
      vehicle.group.updateWorldMatrix(true, true);
      const dimensions = vehicle.config.dimensions;
      const localAnchor = (lamps, fallback) => {
        if (!lamps?.length) return new THREE.Vector3(...fallback);
        const result = new THREE.Vector3();
        for (const lamp of lamps) {
          lamp.getWorldPosition(this.scratch);
          vehicle.group.worldToLocal(this.scratch);
          result.add(this.scratch);
        }
        return result.multiplyScalar(1 / lamps.length);
      };
      const front = localAnchor(vehicle.headlights, [0, dimensions.height * .45, -dimensions.length / 2]);
      const rear = localAnchor(vehicle.taillights, [0, dimensions.height * .35, dimensions.length / 2]);
      const group = new THREE.Group();
      group.name = 'RealismVehicleLights:' + vehicle.id;
      vehicle.group.add(group);
      const reverse = [];
      if (vehicle.type !== 'MOTOR') {
        const geometry = new THREE.BoxGeometry(.15, .09, .035);
        const material = new THREE.MeshStandardMaterial({ color: 0x5a6370, emissive: 0xffffff, emissiveIntensity: 0, roughness: .3 });
        for (const side of [-1, 1]) {
          const lamp = new THREE.Mesh(geometry, material);
          lamp.name = 'Reverse:' + (side < 0 ? 'L' : 'R');
          lamp.position.set(side * dimensions.width * .3, rear.y, Math.max(rear.z, dimensions.length / 2) + .035);
          reverse.push(lamp); group.add(lamp);
        }
      }
      const originals = new Map();
      for (const lamp of [...vehicle.headlights || [], ...vehicle.taillights || [], ...vehicle.indicators || []]) {
        for (const material of Array.isArray(lamp.material) ? lamp.material : [lamp.material]) {
          if (material && !originals.has(material)) originals.set(material, material.emissiveIntensity);
        }
      }
      this.rigs.set(vehicle.id, { vehicle, group, front, reverse, originals, previousSpeed: Math.abs(vehicle.speed || 0), decelerating: false, distance: Infinity });
      return true;
    }

    unregisterVehicle(id) {
      const rig = this.rigs.get(id);
      if (!rig) return;
      rig.group.parent?.remove(rig.group);
      const geometries = new Set(), materials = new Set();
      rig.group.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      rig.originals.forEach((intensity, material) => { material.emissiveIntensity = intensity; });
      for (const beam of this.beams) if (beam.owner === id) { beam.owner = null; beam.light.visible = false; beam.light.intensity = 0; }
      this.rigs.delete(id);
      delete rig.vehicle.lightState;
    }

    _emissive(lamps, intensity) {
      for (const lamp of lamps || []) for (const material of Array.isArray(lamp.material) ? lamp.material : [lamp.material]) {
        if (material?.emissiveIntensity !== undefined) material.emissiveIntensity = intensity;
      }
    }

    update(dt, environment = {}, vehicles, playerPosition) {
      if (this.disposed) return;
      if (vehicles) {
        const active = new Set();
        for (const vehicle of vehicles) { active.add(vehicle.id); this.registerVehicle(vehicle); }
        for (const id of this.rigs.keys()) if (!active.has(id)) this.unregisterVehicle(id);
      }
      const candidates = [];
      for (const rig of this.rigs.values()) {
        const vehicle = rig.vehicle;
        if (vehicle.id !== 'player') {
          vehicle.lightsOn = !!environment.night || !!environment.weather && environment.weather !== 'off';
          vehicle.highBeamOn = false;
        }
        const speed = Math.abs(Number.isFinite(vehicle.speed) ? vehicle.speed : 0);
        if (dt > 0) rig.decelerating = rig.previousSpeed - speed > Math.max(.015, dt * .35);
        const state = Object.freeze({
          lowBeam: !!vehicle.lightsOn, highBeam: !!vehicle.highBeamOn,
          left: !!vehicle.signalLeft, right: !!vehicle.signalRight, hazard: !!vehicle.hazardOn,
          blink: (vehicle.signalTime || 0) % .8 < .4,
          brake: !!vehicle.braking || !!vehicle.handbrakeOn || rig.decelerating,
          reverse: vehicle.gear === -1,
        });
        vehicle.lightState = state;
        if (dt > 0) rig.previousSpeed = speed;
        this._emissive(vehicle.headlights, (state.lowBeam ? 1 : 0) + (state.highBeam ? 2 : 0));
        this._emissive(vehicle.taillights, state.brake ? 1 : .1);
        for (const lamp of vehicle.indicators || []) {
          const active = state.hazard || (lamp.name.endsWith('L') ? state.left : state.right);
          this._emissive([lamp], active && state.blink ? 2 : 0);
        }
        this._emissive(rig.reverse, state.reverse ? 1.5 : 0);
        if (state.lowBeam || state.highBeam) {
          rig.distance = playerPosition ? vehicle.position.distanceToSquared(playerPosition) : 0;
          if (vehicle.id === 'player') rig.distance = -1;
          if (rig.distance < 65 * 65) candidates.push(rig);
        }
      }
      candidates.sort((a, b) => a.distance - b.distance);
      for (let i = 0; i < this.beams.length; i++) {
        const beam = this.beams[i], rig = candidates[i], light = beam.light;
        if (!rig) { beam.owner = null; light.visible = false; light.intensity = 0; continue; }
        const vehicle = rig.vehicle, high = vehicle.lightState.highBeam;
        vehicle.group.updateWorldMatrix(true, false);
        beam.owner = vehicle.id; light.visible = true;
        this.scratch.copy(rig.front); this.scratch.z -= .08;
        light.position.copy(vehicle.group.localToWorld(this.scratch));
        this.scratch.copy(rig.front); this.scratch.z -= high ? 55 : 25; this.scratch.y -= high ? .7 : 1.5;
        light.target.position.copy(vehicle.group.localToWorld(this.scratch));
        light.target.updateMatrixWorld();
        light.distance = high ? 65 : 34;
        light.angle = high ? Math.PI / 9 : Math.PI / 6;
        light.intensity = high ? 5 : 3;
      }
    }

    dispose() {
      if (this.disposed) return;
      for (const id of [...this.rigs.keys()]) this.unregisterVehicle(id);
      for (const { light } of this.beams) {
        light.parent?.remove(light); light.target.parent?.remove(light.target);
        light.dispose?.();
      }
      this.disposed = true;
    }
  }
  root.VehicleLightSystem = VehicleLightSystem;
})(window);
