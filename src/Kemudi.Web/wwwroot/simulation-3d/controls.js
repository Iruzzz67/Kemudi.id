/**
 * InputManager — Keyboard input handler.
 * Full mapping per DOKUMENTASI_SIMULASI.md §11.
 *
 * | Tombol | Fungsi | Tombol | Fungsi |
 * | W / ↑  | Gas    | Space  | Rem tangan |
 * | S / ↓  | Rem    | C      | Ganti kamera |
 * | A/←, D/→ | Belok | P      | Pause |
 * | Shift  | Kopling | I     | Kunci kontak |
 * | Q/ PgDn | Gigi turun | L / K | Lampu / Lampu jauh |
 * | E/ PgUp | Gigi naik | V    | Hazard |
 * | R      | Mundur | M      | Tengok spion |
 * | N      | Netral | Z / X  | Sein kiri / kanan |
 * | T      | Klakson | [/ ] | Tinggi kursi |
 * | H/J/G/F | Helm/jaket/sarung/sepatu | B | Sabuk |
 */

class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._prev = {};
    this._pending = {};

    this._onKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) || e.target.isContentEditable) return;
      if (e.repeat && !this.keys[e.code]) return; // Held keys must not re-arm after safety reset.
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.keys[e.code] && !e.repeat) this._pending[e.code] = true;
      this.keys[e.code] = true;
    };

    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._onBlur = () => { this.keys = {}; this.justPressed = {}; this._prev = {}; this._pending = {}; };
    window.addEventListener('blur', this._onBlur);
  }

  /** Call once per frame at the START of the update loop */
  update() {
    this.justPressed = this._pending;
    this._pending = {};
  }

  isDown(code) { return !!this.keys[code]; }
  wasJustPressed(code) { return !!this.justPressed[code]; }

  // ── Driving controls ──
  get forward() { return this.isDown('KeyW') || this.isDown('ArrowUp'); }
  get backward() { return this.isDown('KeyS') || this.isDown('ArrowDown'); }
  get left() { return this.isDown('KeyA') || this.isDown('ArrowLeft'); }
  get right() { return this.isDown('KeyD') || this.isDown('ArrowRight'); }
  get brake() { return this.isDown('Space'); }
  get clutch() { return this.isDown('ShiftLeft') || this.isDown('ShiftRight'); }

  // ── Gear shifting ──
  get gearUp() { return this.wasJustPressed('KeyE') || this.wasJustPressed('Period') || this.wasJustPressed('PageUp'); }
  get gearDown() { return this.wasJustPressed('KeyQ') || this.wasJustPressed('Comma') || this.wasJustPressed('PageDown'); }
  get neutral() { return this.wasJustPressed('KeyN'); }
  get reverse() { return this.wasJustPressed('KeyR'); }

  // ── Engine & handbrake ──
  get ignition() { return this.wasJustPressed('KeyI'); }
  get handbrake() { return this.wasJustPressed('Space') && !this.isDown('KeyW') && !this.isDown('KeyS'); }

  // ── Lights & signals ──
  get lights() { return this.wasJustPressed('KeyL'); }
  get highBeam() { return this.wasJustPressed('KeyK'); }
  get hazard() { return this.wasJustPressed('KeyV'); }
  get signalLeft() { return this.wasJustPressed('KeyZ'); }
  get signalRight() { return this.wasJustPressed('KeyX'); }
  get horn() { return this.wasJustPressed('KeyT'); }

  // ── Camera & mirror ──
  get camera() { return this.wasJustPressed('KeyC'); }
  get mirror() { return this.wasJustPressed('KeyM'); }

  // ── Seat ──
  get seatUp() { return this.wasJustPressed('BracketRight'); }
  get seatDown() { return this.wasJustPressed('BracketLeft'); }

  // ── Seatbelt ──
  get seatbelt() { return this.wasJustPressed('KeyB'); }

  // ── Motor safety ──
  get helmet() { return this.wasJustPressed('KeyH'); }
  get jacket() { return this.wasJustPressed('KeyJ'); }
  get gloves() { return this.wasJustPressed('KeyG'); }
  get shoes() { return this.wasJustPressed('KeyF'); }

  // ── Pause ──
  get pause() { return this.wasJustPressed('KeyP') || this.wasJustPressed('Escape'); }

  // ── Walking phase ──
  get enterVehicle() { return this.wasJustPressed('KeyE') || this.wasJustPressed('Enter'); }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}

window.InputManager = InputManager;

// Domain snapshots keep gamepad actions independent of keyboard event codes.
(function(root) {
  const actions = ['gearUp','gearDown','neutral','reverse','ignition','handbrake',
    'lights','highBeam','hazard','signalLeft','signalRight','camera','mirror',
    'seatUp','seatDown','seatbelt','helmet','jacket','gloves','shoes','pause','enterVehicle','selectDrive','selectReverse'];
  class DomainInput {
    constructor(frame) {
      this.continuous = frame.continuous;
      this.justPressed = frame.edges;
      this.analog = frame.source === 'gamepad';
      this.source = frame.source;
    }
    get throttle() { return this.continuous.throttle; }
    get brakeAmount() { return this.continuous.brakeAmount; }
    get steer() { return this.continuous.steer; }
    get lookX() { return this.continuous.lookX || 0; }
    get lookY() { return this.continuous.lookY || 0; }
    get forward() { return this.throttle > 0; }
    get backward() { return this.brakeAmount > 0; }
    get brake() { return this.continuous.parkingBrake || false; }
    get left() { return this.steer < 0; }
    get right() { return this.steer > 0; }
    get clutch() { return this.continuous.clutch; }
    get horn() { return this.continuous.horn || !!this.justPressed.horn; }
    static accumulateEdges(target, edges) {
      for (const [action, pressed] of Object.entries(edges)) if (pressed) target[action]=true;
    }
    static keyboard(manager) {
      const edges = Object.fromEntries(actions.map(name => [name, manager[name]]));
      edges.horn = manager.horn;
      return { continuous: { throttle: manager.forward ? 1 : 0,
        brakeAmount: manager.backward ? 1 : 0, parkingBrake: manager.brake,
        steer: manager.left ? -1 : manager.right ? 1 : 0,
        clutch: manager.clutch, horn: manager.horn, walk: manager.forward ? 1 : manager.backward ? -1 : 0,
        lookX: 0, lookY: 0 },
        edges, meaningful: Object.values(edges).some(Boolean) ||
          ['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyT'].some(k => manager.wasJustPressed(k)) };
    }
  }
  for (const name of actions) Object.defineProperty(DomainInput.prototype, name, { get() { return !!this.justPressed[name]; } });
  root.DomainInput = DomainInput;
})(window);
