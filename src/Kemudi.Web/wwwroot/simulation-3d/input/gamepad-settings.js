(function (root) {
  'use strict';
  const KEY = 'kemudi.gamepad.v1';
  const defaults = () => ({ version: 1, enabled: true, stickDeadzone: .12, steerExponent: 1.4,
    steerSensitivity: 1, triggerDeadzone: .03, clutchAssist: false,
    steeringWeight: 50, steeringReturn: 1,
    bindings: { ...root.GamepadMappings.bindings } });
  function validate(value) {
    if (!value || value.version !== 1) throw new Error('Versi pengaturan gamepad tidak didukung.');
    const result = defaults();
    for (const name of ['enabled', 'clutchAssist']) {
      if (typeof value[name] !== 'boolean') throw new Error('Pengaturan boolean tidak valid: ' + name);
      result[name] = value[name];
    }
    for (const [name, min, max] of [['stickDeadzone', 0, .5], ['steerExponent', .5, 4], ['steerSensitivity', .1, 2], ['triggerDeadzone', 0, .5]]) {
      if (!Number.isFinite(value[name]) || value[name] < min || value[name] > max) throw new Error('Rentang pengaturan tidak valid: ' + name);
      result[name] = value[name];
    }
    // Existing v1 saves predate handling. Fill only missing keys; reject bad values.
    for (const [name, min, max] of [['steeringWeight', 0, 100], ['steeringReturn', .5, 2]]) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
      if (!Number.isFinite(value[name]) || value[name] < min || value[name] > max) throw new Error('Rentang pengaturan tidak valid: ' + name);
      result[name] = value[name];
    }
    const used = new Set();
    for (const name of Object.keys(result.bindings)) {
      const index = value.bindings?.[name];
      if (!Number.isInteger(index) || index < 0 || index > 31 || used.has(index)) throw new Error('Mapping tombol bentrok/tidak valid: ' + name);
      used.add(index); result.bindings[name] = index;
    }
    Object.freeze(result.bindings); return Object.freeze(result);
  }
  class GamepadSettings {
    constructor(storage) {
      this.storage = null; this.storageAvailable = false;
      try { this.storage = storage === undefined ? root.localStorage : storage; this.storageAvailable = !!this.storage; } catch { /* Browser storage denied. */ }
      this.value = validate(defaults());
      try { const saved = this.storage?.getItem(KEY); if (saved) this.value = validate(JSON.parse(saved)); } catch { /* Corrupt/old schema safely uses defaults. */ }
    }
    update(patch) {
      if (!patch || typeof patch !== 'object') throw new Error('Pengaturan tidak valid.');
      this.value = validate({ ...this.value, ...patch, bindings: { ...this.value.bindings, ...patch.bindings } });
      this._save(); return this.value;
    }
    reset() { this.value = validate(defaults()); this._save(); return this.value; }
    _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.value)); } catch { this.storageAvailable = false; } }
  }
  GamepadSettings.STORAGE_KEY = KEY;
  root.GamepadSettings = GamepadSettings;
})(window);
