(function (root) {
  'use strict';
  const N = root.GamepadNormalize;
  const empty = () => ({ steer: 0, throttle: 0, brakeAmount: 0, clutch: 0, horn: false, walk: 0, lookX: 0, lookY: 0 });
  const descriptor = p => ({ index: p.index, id: String(p.id || 'Controller'), mapping: String(p.mapping || '') });
  class GamepadAdapter {
    constructor({ settings, getGamepads, eventTarget } = {}) {
      this.settings = settings || new root.GamepadSettings();
      this.reader = getGamepads || (() => {
        if (typeof root.navigator?.getGamepads !== 'function') return undefined;
        return root.navigator.getGamepads();
      });
      this.target = eventTarget || root; this.selected = null; this.identity = null;
      this.previous = []; this.gated = true; this.disposed = false; this.pendingLost = false;
      this.lastSettings = this.settings.value;
      this.onDisconnect = e => {
        if (e.gamepad?.index === this.selected) { this.pendingLost = true; this.selected = null; this.reset('disconnect'); }
      };
      this.onConnect = () => {}; // Polling remains authoritative for discovery and state.
      this.target.addEventListener?.('gamepaddisconnected', this.onDisconnect);
      this.target.addEventListener?.('gamepadconnected', this.onConnect);
    }
    reset() { this.previous = []; this.gated = true; this.identity = null; }
    select(index) {
      if (index !== null && (!Number.isInteger(index) || index < 0)) throw new Error('Index controller tidak valid.');
      if (index !== this.selected) this.pendingLost = this.selected !== null;
      this.selected = index; this.reset('select');
    }
    poll() {
      const frame = { status: 'disconnected', message: 'Tekan tombol pada gamepad untuk menghubungkan.',
        device: null, devices: [], continuous: empty(), edges: {}, meaningful: false, neutral: true, lost: this.pendingLost };
      this.pendingLost = false;
      if (this.disposed || !this.settings.value.enabled) {
        frame.status = 'disabled'; frame.lost ||= this.selected !== null; this.selected = null; this.reset(); return frame;
      }
      if (this.lastSettings !== this.settings.value) { this.reset('settings'); this.lastSettings = this.settings.value; }
      let pads;
      try { pads = this.reader(); }
      catch (error) {
        frame.status = 'error'; frame.message = error?.name === 'SecurityError'
          ? 'Gamepad diblokir browser/policy. Gunakan HTTPS/localhost dan fokuskan simulator; keyboard tetap tersedia.'
          : 'Gamepad tidak dapat dibaca; keyboard tetap tersedia.';
        frame.lost ||= this.selected !== null; this.selected = null; this.reset(); return frame;
      }
      if (pads === undefined) {
        frame.status = 'unsupported'; frame.message = 'Gamepad tidak didukung browser; gunakan keyboard.';
        frame.lost ||= this.selected !== null; this.selected = null; this.reset(); return frame;
      }
      if (!pads || typeof pads.length !== 'number') pads = [];
      const devices = Array.from(pads).filter(p => p && p.connected !== false && Number.isInteger(p.index) && p.index >= 0);
      frame.devices = devices.map(descriptor);
      const meaningful = p => Array.from(p.axes || []).some(v => Number.isFinite(v) && Math.abs(v) > .18)
        || Array.from(p.buttons || []).some(b => N.normalizeTrigger(b, 0) >= .55);
      if (this.selected === null) {
        const candidate = devices.find(p => p.mapping === 'standard' && meaningful(p));
        if (candidate) this.selected = candidate.index;
      }
      const pad = devices.find(p => p.index === this.selected);
      if (!pad) {
        if (this.selected !== null) { frame.lost = true; this.selected = null; this.reset(); }
        frame.status = devices.length ? devices.some(p => p.mapping === 'standard') ? 'connected' : 'unsupported' : 'disconnected';
        if (frame.status === 'unsupported') frame.message = 'Mapping controller belum didukung. Gunakan perangkat standard atau keyboard.';
        return frame;
      }
      frame.device = descriptor(pad); frame.status = 'connected';
      if (pad.mapping !== 'standard') {
        frame.status = 'unsupported'; frame.message = 'Mapping controller belum didukung.';
        frame.lost ||= this.identity !== null; this.reset(); return frame;
      }
      if (!Array.isArray(pad.axes) || !Array.isArray(pad.buttons)
        || pad.axes.some(v => !Number.isFinite(v))) {
        frame.status = 'error'; frame.message = 'Data controller tidak valid.';
        frame.lost ||= this.identity !== null; this.reset(); return frame;
      }
      const identity = pad.index + ':' + pad.id + ':' + pad.mapping;
      if (identity !== this.identity) {
        frame.lost ||= this.identity !== null;
        this.previous = []; this.gated = true; this.identity = identity;
      }
      const pressed = pad.buttons.map((b, i) => N.hysteresis(N.normalizeTrigger(b, 0), this.previous[i]));
      const settings = this.settings.value, bindings = settings.bindings;
      const steer = N.clamp(N.normalizeStick(pad.axes[0], settings.stickDeadzone, settings.steerExponent) * settings.steerSensitivity, -1, 1);
      const walk = -N.normalizeStick(pad.axes[1], settings.stickDeadzone, settings.steerExponent);
      // Camera look shares drift protection, not steering sensitivity/curve.
      const lookX = N.normalizeStick(pad.axes[2], settings.stickDeadzone, 1);
      const lookY = N.normalizeStick(pad.axes[3], settings.stickDeadzone, 1);
      frame.neutral = steer === 0 && walk === 0 && lookX === 0 && lookY === 0 && !pressed.some(Boolean)
        && N.normalizeTrigger(pad.buttons[bindings.throttle], settings.triggerDeadzone) === 0
        && N.normalizeTrigger(pad.buttons[bindings.brake], settings.triggerDeadzone) === 0;
      frame.meaningful = meaningful(pad) || lookX !== 0 || lookY !== 0;
      if (this.gated) {
        this.previous = pressed;
        frame.message = 'Lepaskan trigger, analog, dan tombol untuk mengaktifkan controller.';
        if (frame.neutral) this.gated = false;
        return frame;
      }
      const edge = index => !!pressed[index] && !this.previous[index];
      for (const name of ['interact', 'ignition', 'camera', 'signalLeft', 'signalRight', 'menu', 'pause', 'hazard', 'lights', 'handbrake', 'gearDown', 'gearUp']) frame.edges[name] = edge(bindings[name]);
      for (const [name, index] of Object.entries({ confirm: 0, back: 1, menuUp: 12, menuDown: 13, menuLeft: 14, menuRight: 15 })) frame.edges[name] = edge(index);
      frame.continuous = { steer, walk, lookX, lookY, throttle: N.normalizeTrigger(pad.buttons[bindings.throttle], settings.triggerDeadzone),
        brakeAmount: N.normalizeTrigger(pad.buttons[bindings.brake], settings.triggerDeadzone),
        clutch: pressed[bindings.clutch] ? 1 : 0, horn: !!pressed[bindings.horn] };
      if (frame.continuous.brakeAmount > 0) frame.continuous.throttle = 0;
      this.previous = pressed; frame.message = 'Controller terhubung'; return frame;
    }
    dispose() {
      if (this.disposed) return;
      this.target.removeEventListener?.('gamepaddisconnected', this.onDisconnect);
      this.target.removeEventListener?.('gamepadconnected', this.onConnect);
      this.disposed = true; this.selected = null; this.reset();
    }
  }
  root.GamepadAdapter = GamepadAdapter;
})(window);
