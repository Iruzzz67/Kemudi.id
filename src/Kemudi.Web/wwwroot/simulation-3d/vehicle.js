/**
 * Vehicle — GLB-loaded 3D vehicle with bicycle kinematic physics.
 * Configs from DOKUMENTASI_SIMULASI.md.
 * Uses the Blender exports in models/city: bike.glb, car.glb, truck.glb.
 */

const VEHICLE_CONFIGS = {
  MOTOR: {
    label: 'Motor Sport Biru',
    dimensions: { length: 2.26, width: 1.02, height: 1.38 },
    topSpeed: 26,         // m/s (~94 km/h)
    reverseSpeed: 4,
    acceleration: 9,      // m/s²
    braking: 12,          // m/s²
    wheelbase: 1.45,
    gearCount: 4,
    driverEyeRatio: 0.85,
    driverSide: 0,        // center
    seatOffsetX: 0,
    seatOffsetZ: 0,
    modelUrl: 'models/city/bike.glb',
    extraRotation: 0,     // motor faces -Z natively
    color: '#1e40af',
  },
  MOBIL: {
    label: 'Mobil Sport Merah',
    dimensions: { length: 4.65, width: 2.31, height: 1.516 },
    topSpeed: 22,         // m/s (~79 km/h)
    reverseSpeed: 6,
    acceleration: 6,
    braking: 9,
    wheelbase: 2.6,
    gearCount: 5,
    driverEyeRatio: 0.85,
    driverSide: -1,       // LHD (left)
    seatOffsetX: -0.23,   // -0.13 * width
    seatOffsetZ: -0.38,   // -0.09 * length
    modelUrl: 'models/city/car.glb',
    extraRotation: 0,
    color: '#dc2626',
  },
  TRUK: {
    label: 'Truk Box Putih',
    dimensions: { length: 6.47, width: 2.88, height: 3.27 },
    topSpeed: 16,         // m/s (~58 km/h)
    reverseSpeed: 4,
    acceleration: 3.2,
    braking: 4.5,
    wheelbase: 3.8,
    gearCount: 6,
    driverEyeRatio: 0.70,
    driverSide: -1,       // LHD (left)
    seatOffsetX: -0.31,   // -0.13 * width
    seatOffsetZ: -2.1,
    modelUrl: 'models/city/truck.glb',
    extraRotation: 0,
    color: '#e2e8f0',
  },
};

// Road config from docs
const TRACK = {
  START_Z: 8,
  ROAD_START_Z: 16,
  FINISH_Z: -170,
  ROAD_WIDTH: 10,
  ROAD_HALF_WIDTH: 5,
};

class Vehicle {
  constructor(scene, type = 'MOBIL', transmission = 'automatic', onProgress = () => {}) {
    this.scene = scene;
    this.type = type;
    this.config = VEHICLE_CONFIGS[type] || VEHICLE_CONFIGS.MOBIL;
    this.transmission = transmission;
    this.onProgress = onProgress;

    // Physics state
    this.speed = 0;
    this.steerAngle = 0;
    this.yawRate = 0;
    this.position = new THREE.Vector3(0, 0, TRACK.START_Z);
    this.rotation = 0;
    this.bodyRoll = 0;
    this.suspensionPitch = 0;
    this.braking = false;
    this.roadGripFactor = 1;
    this.setHandling();

    // Transmission
    this.gear = 0;         // 0=neutral, 1-N = forward, R = reverse
    this.rpm = 800;
    this.clutchPressed = false;
    this.gearGrindCount = 0;
    this.stalled = false;

    // Engine
    this.engineOn = false;
    this.enginePhase = 'OFF'; // OFF → ACC → ON → STARTING → ON
    this.engineStartTime = 0;
    this.crankDuration = 1.1; // seconds

    // Handbrake (active at start)
    this.handbrakeOn = true;

    // Status
    this.seatbeltOn = false;
    this.lightsOn = false;
    this.highBeamOn = false;
    this.hazardOn = false;
    this.signalLeft = false;
    this.signalRight = false;

    // Motor safety
    this.helmetOn = false;
    this.jacketOn = false;
    this.glovesOn = false;
    this.shoesOn = false;

    // Seat & mirror
    this.seatHeight = 0;
    this.mirrorYaw = 0;
    this.seatAdjusted = false;
    this.mirrorChecked = false;
    this.signalTime = 0;
    this.indicators = [];

    // Score tracking
    this.violations = 0;
    this.offRoadCount = 0;
    this.timeStarted = 0;
    this.timeElapsed = 0;
    this.obstaclesHit = 0;
    this.pedestrianHits = 0;

    // 3D model
    this.group = new THREE.Group();
    this.model = null;
    this.modelLoaded = false;
    this.scene.add(this.group);

    // Load GLB
    this.wheels = [];
    this.headlights = [];
    this.taillights = [];
    this.disposed = false;
    this.ready = this._loadModel();
  }

  async _loadModel() {
    const loader = new THREE.GLTFLoader();
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(this.config.modelUrl, resolve, event => {
          if (event.total) this.onProgress(event.loaded / event.total);
        }, reject);
      });

      const clone = gltf.scene;
      if (this.disposed) {
        clone.traverse(obj => {
          obj.geometry?.dispose();
          if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
        });
        return;
      }

      // Strip helper objects (ground planes, cameras from export)
      const toRemove = [];
      clone.traverse(obj => {
        if (obj.isCamera) toRemove.push(obj);
        if (obj.isMesh && /^(plane\d*|ground[_-]?plane\d*|backdrop\d*)$/i.test(obj.name)) {
          toRemove.push(obj);
        }
      });
      toRemove.forEach(obj => obj.parent?.remove(obj));

      // Assets are exported in meters, +Y up, -Z forward. Keep their proportions.
      const box = new THREE.Box3().setFromObject(clone);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const zIsLength = size.z >= size.x;
      const autoRotationY = zIsLength ? 0 : Math.PI / 2;

      const s = 1;

      const totalRotationY = autoRotationY + this.config.extraRotation;
      const scaledCenter = center.clone().multiplyScalar(s);
      scaledCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), totalRotationY);

      clone.scale.setScalar(s);
      clone.position.set(-scaledCenter.x, -box.min.y * s, -scaledCenter.z);
      clone.rotation.y = totalRotationY;

      // Enable shadows
      clone.traverse(obj => {
        if (obj.userData.source_name) obj.name = obj.userData.source_name;
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (/^(Car|Bike|Truck)_Lights/.test(obj.name)) this.headlights.push(obj);
          if (/Taillight/.test(obj.name)) this.taillights.push(obj);
          if (/Indicator_/.test(obj.name)) this.indicators.push(obj);
          if (/Lights|Taillight|Indicator_/.test(obj.name)) {
            obj.material = obj.material.clone();
            obj.material.emissive.copy(obj.material.color);
            obj.material.emissiveIntensity = 0;
          }
        }
      });

      // Separate steering yaw from the rolling rotation around each axle.
      const wheelNodes = [];
      clone.traverse(obj => { if (obj.userData.wheel_radius) wheelNodes.push(obj); });
      wheelNodes.forEach(wheel => {
        const pivot = new THREE.Group();
        pivot.name = wheel.name + '_Steering';
        pivot.position.copy(wheel.position);
        wheel.parent.add(pivot);
        pivot.add(wheel);
        wheel.position.set(0, 0, 0);
        this.wheels.push({ mesh: wheel, pivot, radius: wheel.userData.wheel_radius, front: wheel.userData.wheel_front });
      });

      this.model = clone;
      this.group.add(clone);
      this.modelLoaded = true;
      this._updateMeshPosition();
    } catch (e) {
      throw new Error('Model ' + this.config.label + ' gagal dimuat. Silakan coba lagi.', { cause: e });
    }
  }

  _buildFallbackMesh() {
    const { length: l, width: w, height: h } = this.config.dimensions;
    const color = new THREE.Color(this.config.color);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h * 0.5, l * 0.94),
      new THREE.MeshLambertMaterial({ color })
    );
    body.position.y = h * 0.25;
    body.castShadow = true;
    this.group.add(body);

    // Cabin
    if (this.type !== 'MOTOR') {
      const cabW = this.type === 'TRUK' ? w * 0.96 : w * 0.82;
      const cabH = h * (this.type === 'TRUK' ? 0.5 : 0.36);
      const cabL = l * (this.type === 'TRUK' ? 0.26 : 0.52);
      const cabZ = this.type === 'TRUK' ? l * 0.34 : -l * 0.02;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(cabW, cabH, cabL),
        new THREE.MeshLambertMaterial({ color })
      );
      cabin.position.y = h * 0.25 + h * 0.25 + cabH / 2;
      cabin.position.z = cabZ;
      cabin.castShadow = true;
      this.group.add(cabin);

      // Windshield
      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(cabW * 0.9, cabH * 0.7, 0.05),
        new THREE.MeshLambertMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })
      );
      glass.position.y = cabin.position.y;
      glass.position.z = cabZ + cabL / 2 + 0.03;
      this.group.add(glass);
    }

    // Wheels
    this.wheels = [];
    const wheelR = h * 0.2;
    const wheelW = w * 0.18;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1f });

    const positions = this.type === 'MOTOR'
      ? [[0, wheelR, l * 0.35], [0, wheelR, -l * 0.35]]
      : [
          [w / 2 - 0.15, wheelR, l * 0.3],
          [-w / 2 + 0.15, wheelR, l * 0.3],
          [w / 2 - 0.15, wheelR, -l * 0.3],
          [-w / 2 + 0.15, wheelR, -l * 0.3],
        ];

    positions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.group.add(wheel);
      this.wheels.push(wheel);
    });

    // Headlights
    this.headlights = [];
    const lightGeo = new THREE.BoxGeometry(0.2, 0.12, 0.05);
    const lightMat = new THREE.MeshLambertMaterial({ color: 0xfefce8, emissive: 0xfefce8, emissiveIntensity: 0 });
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(side * w * 0.35, h * 0.3, l / 2);
      this.group.add(light);
      this.headlights.push(light);
    }

    // Taillights
    this.taillights = [];
    const tailMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.1 });
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(lightGeo, tailMat);
      tail.position.set(side * w * 0.35, h * 0.3, -l / 2);
      this.group.add(tail);
      this.taillights.push(tail);
    }

    this.modelLoaded = true;
  }

  update(input, dt, onRoad = true) {
    let result;

    // Engine crank
    if (this.enginePhase === 'STARTING') {
      const elapsed = this._planningMotion
        ? (this._engineCrankElapsed = (this._engineCrankElapsed || 0) + dt)
        : (performance.now() - this.engineStartTime) / 1000;
      if (elapsed >= this.crankDuration) {
        this.enginePhase = 'ON';
        this.engineOn = true;
      }
    }

    // Handbrake
    if (this.handbrakeOn && input.forward && this.engineOn) {
      // Can't move with handbrake
    }

    // Clutch
    this.clutchPressed = input.clutch;

    // Acceleration / braking
    const amount = value => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
    const brakeAmount = input.analog ? amount(input.brakeAmount) : (input.brake || input.backward ? 1 : 0);
    const throttle = input.analog ? (brakeAmount > 0 ? 0 : amount(input.throttle)) : (input.forward ? 1 : 0);
    let accel = 0;
    if (this.transmission === 'automatic') {
      if (input.reverse && Math.abs(this.speed) < .5) this.gear = this.gear === -1 ? 1 : -1;
      if (this.gear !== -1) this._updateAutomaticTransmission();
    } else result = this._updateManualTransmission(input);
    if (this.engineOn && !this.handbrakeOn && !input.clutch && this.gear !== 0 && throttle > 0) {
      accel = this.config.acceleration * (this.gear === -1 ? -.6 : 1) * throttle;
    }

    // Braking (Space)
    if (brakeAmount > 0) {
      if (this.speed > 0) {
        this.speed -= this.config.braking * this.roadGripFactor * brakeAmount * dt;
        if (this.speed < 0) this.speed = 0;
      } else if (this.speed < 0) {
        this.speed += this.config.braking * this.roadGripFactor * brakeAmount * dt;
        if (this.speed > 0) this.speed = 0;
      }
    }

    // Handbrake drag
    if (this.handbrakeOn && Math.abs(this.speed) > 0.1) {
      this.speed *= (1 - 3 * dt);
    }

    // Apply acceleration
    this.speed += accel * dt;

    if (!input.forward) this.speed *= Math.max(0, 1 - .35 * dt);

    // Speed limits
    const maxSpeed = this.gear === -1 ? this.config.reverseSpeed : this.config.topSpeed;
    this.speed = THREE.MathUtils.clamp(this.speed, -this.config.reverseSpeed, maxSpeed);

    // Off-road friction
    if (!onRoad) {
      this.speed *= (1 - 2.2 * dt);
      if (Math.abs(this.speed) > maxSpeed * 0.4) {
        this.speed = Math.sign(this.speed) * maxSpeed * 0.4;
      }
    }

    // Steering (bicycle kinematic)
    this._updateSteering(input, dt);

    // RPM
    this._updateRPM(input);

    this.applyActions(input);
    this.mirrorYaw = Math.max(0, this.mirrorYaw - dt);
    this.signalTime += dt;

    // Time tracking
    if (this.timeStarted > 0) this.timeElapsed += dt;

    // Update lights
    this.braking = this.handbrakeOn || !!(input.brake || input.backward);
    if (!this._planningMotion) this._updateLights(input);

    // Suspension lean
    this.bodyRoll = THREE.MathUtils.lerp(this.bodyRoll, -this.steerAngle * this.speed * 0.02, 5 * dt);
    this.suspensionPitch = THREE.MathUtils.lerp(this.suspensionPitch,
      (input.forward ? -0.02 : 0) + (input.brake ? 0.03 : 0), 3 * dt);

    if (!this._planningMotion) this._updateMeshPosition(dt);
    return result;
  }

  // Shared by paused action-menu and normal driving; never advances motion/time.
  applyActions(input) {
    for (const name of ['seatbelt','lights','highBeam','hazard'])
      if (input[name]) this[name + 'On'] = !this[name + 'On'];
    if (input.signalLeft) { this.signalLeft = !this.signalLeft; this.signalRight = false; }
    if (input.signalRight) { this.signalRight = !this.signalRight; this.signalLeft = false; }
    if (this.type === 'MOTOR') for (const name of ['helmet','jacket','gloves','shoes'])
      if (input[name]) this[name + 'On'] = !this[name + 'On'];
    if (input.seatUp) this.seatHeight = Math.min(this.seatHeight + .015, .15);
    if (input.seatDown) this.seatHeight = Math.max(this.seatHeight - .015, -.15);
    if (input.seatUp || input.seatDown) this.seatAdjusted = true;
    if (input.mirror) { this.mirrorChecked = true; this.mirrorYaw = 1.1; }
  }

  requestDriveDirection(direction, brakeAmount) {
    if (this.transmission !== 'automatic' || ![-1,1].includes(direction)) return {accepted:false,reason:'Pilih gigi manual dengan kopling.'};
    if (Math.abs(this.speed) > .5 / 3.6 || !(brakeAmount > .1))
      return {accepted:false,reason:'Berhenti dan tahan rem sebelum memilih maju/mundur.'};
    // The held brake removes residual sub-threshold roll before changing direction;
    // otherwise the automatic gearbox would infer reverse again from negative speed.
    this.speed = 0;
    this.gear = direction;
    return {accepted:true};
  }

  requestGearShift(direction, clutch) {
    if (this.transmission !== 'manual' || !clutch) return {accepted:false,reason:'Tahan kopling L3 untuk berpindah gigi manual.'};
    const previous = this.clutchPressed;
    this.clutchPressed = true;
    this._updateManualTransmission({gearUp:direction > 0,gearDown:direction < 0});
    this.clutchPressed = previous;
    return {accepted:true};
  }

  /** Advance controls/dynamics, but leave authoritative pose and visual root untouched. */
  planMotion(input, dt, onRoad = true) {
    const start = this.position.clone(), yaw = this.rotation, speed = this.speed;
    this._plannedInput = input;
    this._planningMotion = true;
    let proposal;
    try {
      const result = this.update(input, dt, onRoad);
      proposal = { id: this.id, position: this.position.clone(), rotation: this.rotation, result,
        desiredSpeed: this.speed, previousSpeed: speed };
    } finally {
      this.position.copy(start); this.rotation = yaw; this._planningMotion = false;
    }
    this._motionProposal = proposal;
    return proposal;
  }

  /** Commit once after shared-world resolution. Endpoint speed is zero at contact. */
  commitMotion(resolution, dt) {
    if (!resolution) return;
    const start = this.position.clone(), oldSpeed = this._motionProposal?.previousSpeed ?? this.speed;
    this.position.copy(resolution.position);
    this.rotation = resolution.rotation;
    const distance = this.position.distanceTo(start);
    const forward = this.getForwardDirection();
    const signedTravel = Math.sign(this.position.clone().sub(start).dot(forward)) * distance / Math.max(dt, 1e-9);
    this.speed = Number.isFinite(resolution.speed) ? resolution.speed : signedTravel;
    this.braking = this.braking || !!resolution.blocked || Math.abs(this.speed) < Math.abs(oldSpeed) - .02;
    this._updateRPM(this._plannedInput);
    this._updateLights(this._plannedInput);
    // Wheels follow actual travel, not attempted motion through an obstacle.
    const speed = this.speed;
    this.speed = Number.isFinite(signedTravel) ? signedTravel : 0;
    this._updateMeshPosition(dt);
    this.speed = speed;
    this._motionProposal = null;
    this._plannedInput = null;
  }

  _updateAutomaticTransmission() {
    const speedRatio = Math.abs(this.speed) / this.config.topSpeed;
    if (this.speed < 0) {
      this.gear = -1;
    } else if (speedRatio < 0.12) {
      this.gear = 1;
    } else if (speedRatio < 0.25) {
      this.gear = 2;
    } else if (speedRatio < 0.42) {
      this.gear = 3;
    } else if (speedRatio < 0.65) {
      this.gear = 4;
    } else if (this.config.gearCount >= 5) {
      this.gear = 5;
    }
    if (this.config.gearCount >= 6 && speedRatio > 0.8) {
      this.gear = 6;
    }
  }

  _updateManualTransmission(input) {
    // Gear shift requires clutch
    if (input.gearUp && this.gear < this.config.gearCount) {
      if (this.clutchPressed) {
        this.gear++;
        this.gearGrindCount = 0;
      } else {
        this.gearGrindCount++;
        if (this.gearGrindCount >= 3) {
          this.stalled = true;
          this.engineOn = false;
          this.enginePhase = 'OFF';
        }
        return 'gear_grind';
      }
    }
    if (input.gearDown && this.gear > -1) {
      if (this.clutchPressed) {
        this.gear--;
        this.gearGrindCount = 0;
      } else {
        this.gearGrindCount++;
        if (this.gearGrindCount >= 3) {
          this.stalled = true;
          this.engineOn = false;
          this.enginePhase = 'OFF';
        }
        return 'gear_grind';
      }
    }
    if (input.neutral) this.gear = 0;
    if (input.reverse) this.gear = -1;

    // Stall: stopped, in gear, no clutch, no gas
    if (this.engineOn && this.gear > 0 && !this.clutchPressed &&
        Math.abs(this.speed) < 0.5 && !input.forward) {
      this.stalled = true;
      this.engineOn = false;
      this.enginePhase = 'OFF';
      return 'stall';
    }
  }

  setHandling({ steeringWeight = 50, steeringReturn = 1 } = {}) {
    if (!Number.isFinite(steeringWeight) || steeringWeight < 0 || steeringWeight > 100
      || !Number.isFinite(steeringReturn) || steeringReturn < .5 || steeringReturn > 2)
      throw new Error('Pengaturan handling tidak valid.');
    this.handling = Object.freeze({ steeringWeight, steeringReturn });
    return this.handling;
  }

  _updateSteering(input, dt) {
    // Weight changes response speed, never full-lock range or vehicle grip.
    const response = 2 ** ((50 - this.handling.steeringWeight) / 50);
    const steerRate = 2.5 * response;
    const returnRate = 4.0 * this.handling.steeringReturn;

    if (input.analog) {
      const steer = Number.isFinite(input.steer) ? THREE.MathUtils.clamp(input.steer, -1, 1) : 0;
      const centering = steer === 0 ? this.handling.steeringReturn : 1;
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, -steer, Math.min(1, dt * response * centering / .09));
    } else if (input.left) {
      this.steerAngle += steerRate * dt;
    } else if (input.right) {
      this.steerAngle -= steerRate * dt;
    } else {
      // Return to center
      if (Math.abs(this.steerAngle) < 0.05) this.steerAngle = 0;
      else this.steerAngle -= Math.sign(this.steerAngle) * Math.min(Math.abs(this.steerAngle), returnRate * dt);
    }

    // Speed-dependent steering reduction
    const speedFactor = Math.max(0.3, 1 - Math.abs(this.speed) / this.config.topSpeed * 0.6);
    this.steerAngle = THREE.MathUtils.clamp(this.steerAngle, -speedFactor, speedFactor);

    // Bicycle kinematic yaw rate: yawRate = (v / wheelbase) * tan(steer)
    if (Math.abs(this.speed) > 0.3) {
      this.yawRate = (this.speed / this.config.wheelbase) * Math.tan(this.steerAngle);
      this.rotation += this.yawRate * dt;
    }

    // Move forward/backward
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), this.rotation
    );
    this.position.addScaledVector(forward, this.speed * dt);
  }

  _updateRPM(input) {
    if (!this.engineOn) {
      this.rpm = 0;
      return;
    }
    if (this.gear > 0) {
      this.rpm = 800 + (Math.abs(this.speed) / this.config.topSpeed) * 5200;
    } else if (this.gear === -1) {
      this.rpm = 800 + (Math.abs(this.speed) / this.config.reverseSpeed) * 3000;
    } else {
      this.rpm = input?.forward ? 1500 : 800;
    }
    this.rpm = THREE.MathUtils.clamp(this.rpm, 0, 7000);
  }

  _updateLights(input) {
    const intensity = this.lightsOn ? 1 : 0;
    const highIntensity = this.highBeamOn ? 2 : 0;
    if (this.headlights) {
      this.headlights.forEach(l => {
        if (l.material.emissiveIntensity !== undefined) {
          l.material.emissiveIntensity = intensity + highIntensity;
        }
      });
    }
    const braking = this.braking || this.handbrakeOn || (input && (input.brake || input.backward));
    if (this.taillights) {
      this.taillights.forEach(l => {
        if (l.material.emissiveIntensity !== undefined) {
          l.material.emissiveIntensity = braking ? 1 : 0.1;
        }
      });
    }
    const blink = this.signalTime % .8 < .4;
    this.indicators.forEach(l => {
      const active = this.hazardOn || (l.name.endsWith('L') ? this.signalLeft : this.signalRight);
      l.material.emissiveIntensity = active && blink ? 2 : 0;
    });
  }

  _updateMeshPosition(dt = 0) {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotation;

    // Body roll and pitch
    if (this.model) {
      this.model.rotation.z = this.bodyRoll;
      this.model.rotation.x = this.suspensionPitch;
    } else {
      this.group.rotation.z = this.bodyRoll;
      this.group.rotation.x = this.suspensionPitch;
    }

    // Spin wheels
    if (this.wheels) {
      this.wheels.forEach(w => {
        w.mesh.rotation.x -= this.speed * dt / w.radius;
        if (w.front) w.pivot.rotation.y = this.steerAngle;
      });
    }
  }

  startEngine() {
    if (this.engineOn) {
      // Turn off
      this.engineOn = false;
      this.enginePhase = 'OFF';
      return;
    }
    this.enginePhase = 'STARTING';
    this.engineStartTime = performance.now();
    this._engineCrankElapsed = 0;
    this.stalled = false;
  }

  releaseHandbrake() {
    this.handbrakeOn = false;
  }

  getSpeedKmh() {
    return Math.abs(this.speed) * 3.6;
  }

  isOffRoad(trackCenterX = 0) {
    return Math.abs(this.position.x - trackCenterX) > TRACK.ROAD_HALF_WIDTH;
  }

  getDriverSeatPosition() {
    const eyeY = this.config.dimensions.height * this.config.driverEyeRatio + this.seatHeight;
    const seatX = this.config.seatOffsetX;
    const seatZ = this.config.seatOffsetZ;
    const offset = new THREE.Vector3(seatX, eyeY, seatZ);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
    return this.position.clone().add(offset);
  }

  getForwardDirection() {
    return new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), this.rotation
    );
  }

  dispose() {
    this.disposed = true;
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }
}

window.VEHICLE_CONFIGS = VEHICLE_CONFIGS;
window.TRACK_CONFIG = TRACK;
window.Vehicle = Vehicle;
