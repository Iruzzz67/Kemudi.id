/**
 * Pedestrian — Walking pedestrians that cross at zebra crossings.
 * Collision with vehicle → instant fail.
 * Based on DOKUMENTASI_SIMULASI.md.
 */

class PedestrianManager {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.pedestrians = [];
    this.objects = [];

    this._createPedestrians();
  }

  _createPedestrians() {
    // Create pedestrians at crosswalk zones
    this.track.pedestrianZones.forEach(zone => {
      for (let i = 0; i < 3; i++) {
        const ped = this._createPedestrian(zone);
        this.pedestrians.push(ped);
      }
    });
  }

  _createPedestrian(zone) {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: this._randomColor() })
    );
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5d0a9 })
    );
    head.position.y = 1.7;
    head.castShadow = true;
    group.add(head);

    // Position at crosswalk
    const offset = (Math.random() - 0.5) * 4;
    group.position.set(zone.x + offset, 0, zone.z);

    this.scene.add(group);
    this.objects.push(group);

    return {
      group,
      zone,
      startX: zone.x + offset,
      speed: 1 + Math.random() * 1.5,
      direction: Math.random() > 0.5 ? 1 : -1,
      crossing: false,
      crossTimer: Math.random() * 8,
      crossInterval: 6 + Math.random() * 6,
      walkPhase: Math.random() * Math.PI * 2,
    };
  }

  _randomColor() {
    const colors = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0xec4899];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  update(dt) {
    this.pedestrians.forEach(ped => {
      ped.crossTimer += dt;
      ped.walkPhase += dt * 4;

      // Start crossing periodically
      if (!ped.crossing && ped.crossTimer >= ped.crossInterval) {
        ped.crossing = true;
        ped.crossTimer = 0;
        ped.direction = Math.random() > 0.5 ? 1 : -1;
      }

      if (ped.crossing) {
        // Walk across the road
        const targetX = ped.startX + ped.direction * 15;
        const dx = targetX - ped.group.position.x;

        if (Math.abs(dx) > 0.5) {
          ped.group.position.x += Math.sign(dx) * ped.speed * dt;
          // Walking animation (bob up and down)
          ped.group.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.05;
        } else {
          // Reached the other side, wait
          ped.crossing = false;
          ped.crossTimer = 0;
          ped.crossInterval = 6 + Math.random() * 6;
          ped.direction *= -1;
        }
      }
    });
  }

  checkCollision(vehiclePosition, vehicleRadius = 1.5) {
    for (const ped of this.pedestrians) {
      if (!ped.crossing) continue;
      const dx = ped.group.position.x - vehiclePosition.x;
      const dz = ped.group.position.z - vehiclePosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < vehicleRadius + 0.5) {
        return true; // Collision!
      }
    }
    return false;
  }

  dispose() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      obj.traverse?.(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    });
    this.objects = [];
    this.pedestrians = [];
  }
}

window.PedestrianManager = PedestrianManager;
