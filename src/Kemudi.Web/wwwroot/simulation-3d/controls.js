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
