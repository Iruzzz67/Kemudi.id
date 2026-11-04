/* Original procedural weather. Classic-script API, Three.js r128, metres / seconds. */
(function (root) {
  'use strict';

  const TIMES = Object.freeze({
    pagi: { hour: '07:00', sky: 0xb9cad9, sun: 0xffdfb3, ambient: .47, direct: .7, hemi: .3, exposure: 1.1, offset: [65, 28, 30], visibility: .95 },
    siang: { hour: '12:00', sky: 0xb9d2df, sun: 0xffffff, ambient: .5, direct: .8, hemi: .3, exposure: 1.15, offset: [50, 80, 30], visibility: 1 },
    sore: { hour: '17:00', sky: 0xc29483, sun: 0xffb36b, ambient: .36, direct: .62, hemi: .25, exposure: 1.08, offset: [-65, 22, 20], visibility: .88 },
    malam: { hour: '21:00', sky: 0x101d35, sun: 0xa4b9ee, ambient: .24, direct: .1, hemi: .17, exposure: .95, offset: [-35, 55, -20], visibility: .62 },
  });
  const WEATHER = Object.freeze({
    off: { count: 0, visibility: 1, grip: 1, aiSpeed: 1, wet: 0 },
    light: { count: 600, visibility: .84, grip: .94, aiSpeed: .82, wet: .45 },
    heavy: { count: 1600, visibility: .63, grip: .84, aiSpeed: .65, wet: 1 },
  });

  class EnvironmentSystem {
    constructor(scene, renderer, options = {}) {
      this.scene = scene;
      this.renderer = renderer;
      this.disposed = false;
      this.timeOfDay = 'siang';
      this.weather = 'off';
      this.cabinExclusionRadius = 3.6;
      this.original = {
        background: scene.background, fog: scene.fog, environment: scene.environment,
        exposure: renderer.toneMappingExposure,
      };
      this.ownedLights = [];
      this.lightSnapshots = [];
      this.materialBindings = [];
      this.roadMaterials = [];
      this.lampMaterials = [];
      this.ownedMaterials = new Set();
      this.streetLights = [];
      this.streetAnchors = [];
      this.sunOffset = new THREE.Vector3(50, 80, 30);
      this._seed = (options.seed === undefined ? 127 : options.seed) >>> 0;
      this._findLights();
      this._prepareMaterials();
      this._createRain();
      this._prepareStreetLights(options.track);
      scene.background = new THREE.Color();
      scene.fog = new THREE.Fog(0xb9d2df, 85, 300);
      this._applyPreset();
      if (options.timeOfDay) this.setTimeOfDay(options.timeOfDay);
      if (options.weather) this.setWeather(options.weather);
    }

    _random() {
      this._seed = (Math.imul(this._seed, 1664525) + 1013904223) >>> 0;
      return this._seed / 4294967296;
    }

    _findLights() {
      this.scene.traverse(object => {
        if (object.isAmbientLight && !this.ambient) this.ambient = object;
        if (object.isHemisphereLight && !this.hemi) this.hemi = object;
        if (object.isDirectionalLight && (!this.sun || object.name === 'DrivingSun')) this.sun = object;
      });
      for (const [key, create] of [
        ['ambient', () => new THREE.AmbientLight(0xffffff, .5)],
        ['hemi', () => new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, .3)],
        ['sun', () => new THREE.DirectionalLight(0xffffff, .8)],
      ]) {
        if (!this[key]) {
          this[key] = create();
          this.scene.add(this[key]);
          this.ownedLights.push(this[key]);
          if (key === 'sun') { this.scene.add(this[key].target); this.ownedLights.push(this[key].target); }
        }
        const light = this[key];
        this.lightSnapshots.push({ light, intensity: light.intensity, color: light.color.clone(),
          groundColor: light.groundColor?.clone(), position: light.position.clone(),
          targetPosition: light.target?.position.clone(), castShadow: light.castShadow });
      }
    }

    _prepareMaterials() {
      const roadClones = new Map(), lampClones = new Map();
      this.scene.traverse(object => {
        if (!object.isMesh || !object.material) return;
        const isRoad = /(?:^|_)asphalt$|^road:(?:center|[NSEW])$/i.test(object.name);
        const isLamp = /^(?:street-lamp|Props_Headlamp)$/.test(object.name);
        const isWindow = /^(?:house-window|window|Houses_Glass)$/.test(object.name);
        if (!isRoad && !isLamp && !isWindow) return;
        const original = object.material;
        const replace = material => {
          const road = isRoad || /(?:^|_)Asphalt$/i.test(material.name);
          const clones = road ? roadClones : lampClones;
          if (!clones.has(material)) {
            const clone = material.clone();
            clones.set(material, clone);
            this.ownedMaterials.add(clone);
            if (road) this.roadMaterials.push({ material: clone, color: material.color.clone(),
              roughness: material.roughness, metalness: material.metalness, envMapIntensity: material.envMapIntensity });
            else if (clone.emissive) this.lampMaterials.push({ material: clone,
              emissive: material.emissive.clone(), intensity: material.emissiveIntensity });
          }
          return clones.get(material);
        };
        object.material = Array.isArray(original) ? original.map(replace) : replace(original);
        this.materialBindings.push({ object, original });
      });
    }

    _createRain() {
      const positions = new Float32Array(1600 * 2 * 3);
      for (let i = 0; i < 1600; i++) {
        const x = (this._random() - .5) * 52;
        const y = this._random() * 20 - 5;
        const z = (this._random() - .5) * 52;
        const at = i * 6;
        positions[at] = x; positions[at + 1] = y; positions[at + 2] = z;
        positions[at + 3] = x - .07; positions[at + 4] = y + .65; positions[at + 5] = z;
      }
      const geometry = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(positions, 3);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', attribute);
      geometry.setDrawRange(0, 0);
      this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
        color: 0xb9d9f3, transparent: true, opacity: .42, depthWrite: false,
      }));
      this.rain.name = 'RealismRain';
      this.rain.frustumCulled = false;
      this.rain.visible = false;
      this.scene.add(this.rain);
    }

    _prepareStreetLights(track) {
      if (!track) return;
      const height = track.roadHeight || 0;
      for (const junction of track.intersections || []) {
        const center = junction.definition.center;
        for (const x of [-6, 6]) for (const z of [-15, 15]) {
          this.streetAnchors.push(new THREE.Vector3(center.x + x, height + 5.8, center.z + z));
        }
      }
      const road = track.longRoad;
      if (road) for (let s = 12; s < road.length - 12; s += 24) {
        const frame = road.frame(s);
        for (const side of [-1, 1]) this.streetAnchors.push(frame.point.clone().addScaledVector(frame.left, side * 5.4).add(new THREE.Vector3(0, 5.8, 0)));
      }
      for (let i = 0; i < Math.min(4, this.streetAnchors.length); i++) {
        const light = new THREE.PointLight(0xffdf9e, 0, 20, 2);
        light.name = 'RealismStreetLight:' + i;
        light.castShadow = false;
        this.streetLights.push(light);
        this.scene.add(light);
      }
      this._nearestAnchors = this.streetLights.map(() => ({ anchor: null, distance: Infinity }));
    }

    setTimeOfDay(mode) {
      if (this.disposed || !Object.prototype.hasOwnProperty.call(TIMES, mode)) return false;
      this.timeOfDay = mode;
      this._applyPreset();
      return true;
    }

    setWeather(mode) {
      if (this.disposed || !Object.prototype.hasOwnProperty.call(WEATHER, mode)) return false;
      this.weather = mode;
      this._applyPreset();
      return true;
    }

    _applyPreset() {
      const time = TIMES[this.timeOfDay], weather = WEATHER[this.weather];
      const night = this.timeOfDay === 'malam';
      const sky = this.scene.background;
      sky.setHex(time.sky);
      if (weather.wet) sky.lerp(new THREE.Color(night ? 0x152135 : 0x788b99), weather.wet * .45);
      this.scene.fog.color.copy(sky);
      this.scene.fog.near = 85 * weather.visibility;
      this.scene.fog.far = 300 * weather.visibility * (night ? .85 : 1);
      this.scene.environment = night ? null : this.original.environment;
      this.renderer.toneMappingExposure = time.exposure;
      this.ambient.intensity = time.ambient * (1 - weather.wet * .08);
      this.sun.color.setHex(time.sun);
      this.sun.intensity = time.direct * (1 - weather.wet * .65);
      this.sun.castShadow = !night && this.lightSnapshots.find(s => s.light === this.sun).castShadow;
      this.sunOffset.fromArray(time.offset);
      this.hemi.intensity = time.hemi;
      this.hemi.color.copy(sky);
      this.rain.visible = weather.count > 0;
      this.rain.geometry.setDrawRange(0, weather.count * 2);
      this.rain.material.opacity = this.weather === 'heavy' ? .52 : .4;
      for (const entry of this.roadMaterials) {
        entry.material.color.copy(entry.color).multiplyScalar(1 - weather.wet * .24);
        if (entry.roughness !== undefined) entry.material.roughness = entry.roughness + (.24 - entry.roughness) * weather.wet;
        if (entry.envMapIntensity !== undefined) entry.material.envMapIntensity = entry.envMapIntensity * (night ? .2 : 1);
      }
      for (const entry of this.lampMaterials) {
        if (night) { entry.material.emissive.setHex(0xffd59a); entry.material.emissiveIntensity = 1.1; }
        else { entry.material.emissive.copy(entry.emissive); entry.material.emissiveIntensity = entry.intensity; }
      }
      for (const light of this.streetLights) light.intensity = night ? 1.3 : 0;
      this.state = Object.freeze({ timeOfDay: this.timeOfDay, weather: this.weather, hour: time.hour, night,
        visibilityFactor: time.visibility * weather.visibility, roadGripFactor: weather.grip,
        recommendedAIMaxSpeedFactor: weather.aiSpeed, precipitationCount: weather.count });
    }

    getState() { return this.state; }

    update(dt, camera, options = {}) {
      if (this.disposed || !camera || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .1);
      this.sun.position.copy(camera.position).add(this.sunOffset);
      this.sun.target.position.copy(camera.position);
      this.sun.target.updateMatrixWorld();
      if (this.state.night) this._updateStreetLights(camera.position);
      if (!this.rain.visible) return;
      this.rain.position.copy(camera.position);
      const array = this.rain.geometry.attributes.position.array;
      const count = WEATHER[this.weather].count;
      const enclosed = options.cockpit && options.vehicleType !== 'MOTOR';
      const radius = this.cabinExclusionRadius;
      for (let i = 0; i < count; i++) {
        const at = i * 6;
        let x = array[at] + dt * 1.2, y = array[at + 1] - dt * (this.weather === 'heavy' ? 20 : 15), z = array[at + 2];
        if (y < -5 || x > 26) { x = (this._random() - .5) * 52; z = (this._random() - .5) * 52; y = 15; }
        if (enclosed && x * x + z * z < radius * radius) {
          const length = Math.hypot(x, z);
          if (length < .001) { x = radius + .1; z = 0; }
          else { const scale = (radius + .1) / length; x *= scale; z *= scale; }
        }
        array[at] = x; array[at + 1] = y; array[at + 2] = z;
        array[at + 3] = x - .07; array[at + 4] = y + .65; array[at + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }

    _updateStreetLights(position) {
      if (!this.streetLights.length) return;
      for (const entry of this._nearestAnchors) { entry.anchor = null; entry.distance = Infinity; }
      for (const anchor of this.streetAnchors) {
        const distance = (anchor.x - position.x) ** 2 + (anchor.z - position.z) ** 2;
        for (let i = 0; i < this._nearestAnchors.length; i++) {
          if (distance >= this._nearestAnchors[i].distance) continue;
          for (let j = this._nearestAnchors.length - 1; j > i; j--) {
            this._nearestAnchors[j].anchor = this._nearestAnchors[j - 1].anchor;
            this._nearestAnchors[j].distance = this._nearestAnchors[j - 1].distance;
          }
          this._nearestAnchors[i].anchor = anchor;
          this._nearestAnchors[i].distance = distance;
          break;
        }
      }
      for (let i = 0; i < this.streetLights.length; i++) {
        const entry = this._nearestAnchors[i], light = this.streetLights[i];
        if (entry.anchor) light.position.copy(entry.anchor);
        light.visible = entry.distance < 75 * 75;
      }
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.rain.parent?.remove(this.rain);
      this.rain.geometry.dispose(); this.rain.material.dispose();
      for (const { object, original } of this.materialBindings) object.material = original;
      for (const material of this.ownedMaterials) material.dispose();
      this.ownedMaterials.clear();
      for (const snapshot of this.lightSnapshots) {
        const light = snapshot.light;
        light.intensity = snapshot.intensity; light.color.copy(snapshot.color);
        if (snapshot.groundColor) light.groundColor.copy(snapshot.groundColor);
        light.position.copy(snapshot.position); light.castShadow = snapshot.castShadow;
        if (snapshot.targetPosition) light.target.position.copy(snapshot.targetPosition);
      }
      for (const light of [...this.ownedLights, ...this.streetLights]) light.parent?.remove(light);
      this.scene.background = this.original.background;
      this.scene.fog = this.original.fog;
      this.scene.environment = this.original.environment;
      this.renderer.toneMappingExposure = this.original.exposure;
    }
  }

  EnvironmentSystem.TIME_PRESETS = TIMES;
  EnvironmentSystem.WEATHER_PRESETS = WEATHER;
  root.EnvironmentSystem = EnvironmentSystem;
})(window);
