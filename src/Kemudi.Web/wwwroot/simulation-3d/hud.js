/**
 * HUD — Heads-Up Display overlay for driving mode.
 * Speedometer, gear, RPM, time, violations, checklist, warnings, camera mode.
 * Based on DOKUMENTASI_SIMULASI.md.
 */

class HUD {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.visible = false;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'hud';
    this.element.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
      display: none; z-index: 10;
    `;
    this.element.innerHTML = `
      <!-- Speedometer — top left -->
      <div id="hud-speedo" style="
        position: absolute; top: 16px; left: 16px;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(10px);
        border-radius: 16px; padding: 16px 20px; min-width: 180px;
        border: 1px solid rgba(255,255,255,0.08);
      ">
        <div id="hud-vehicle-type" style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 600;">MOBIL</div>
        <div id="hud-speed" style="font-size: 3rem; font-weight: 800; line-height: 1; margin: 4px 0; font-variant-numeric: tabular-nums;">0</div>
        <div style="font-size: 0.75rem; color: #94a3b8;">km/j</div>
        <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
          <div id="hud-gear" style="
            background: rgba(255,255,255,0.15); border-radius: 6px;
            padding: 2px 10px; font-weight: 700; font-size: 0.95rem;
            font-variant-numeric: tabular-nums; min-width: 28px; text-align: center;
          ">N</div>
          <div style="flex: 1;">
            <div style="font-size: 0.65rem; color: #94a3b8; margin-bottom: 2px;">RPM</div>
            <div id="hud-rpm-bar" style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden;">
              <div id="hud-rpm-fill" style="height: 100%; width: 10%; background: linear-gradient(90deg, #22c55e, #eab308, #ef4444); border-radius: 999px; transition: width 0.1s;"></div>
            </div>
          </div>
        </div>
        <div style="margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
          <span id="hud-engine" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">Mesin OFF</span>
          <span id="hud-seatbelt" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">Sabuk OFF</span>
          <span id="hud-handbrake" style="font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; background: rgba(239,68,68,0.6);">Rem Tangan</span>
        </div>
        <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap;">
          <span id="hud-hazard" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); display: none;">⚠ Hazard</span>
          <span id="hud-signal-l" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); display: none;">◀ Sein Kiri</span>
          <span id="hud-signal-r" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); display: none;">▶ Sein Kanan</span>
          <span id="hud-lights" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); display: none;">💡 Lampu</span>
          <span id="hud-highbeam" style="font-size: 0.65rem; padding: 1px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); display: none;">🔦 Jauh</span>
        </div>
      </div>

      <!-- Time & Stats — top right -->
      <div id="hud-stats" style="
        position: absolute; top: 16px; right: 16px;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(10px);
        border-radius: 16px; padding: 16px 20px; min-width: 160px;
        text-align: right; border: 1px solid rgba(255,255,255,0.08);
      ">
        <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 600;">Waktu</div>
        <div id="hud-time" style="font-size: 1.8rem; font-weight: 800; font-variant-numeric: tabular-nums;">0.0s</div>
        <div style="margin-top: 8px; font-size: 0.8rem; color: #94a3b8;">
          Pelanggaran: <span id="hud-violations" style="color: #fff; font-weight: 700;">0</span>
        </div>
        <div style="font-size: 0.8rem; color: #94a3b8;">
          Keluar: <span id="hud-offroad" style="color: #fff; font-weight: 700;">0</span>
        </div>
      </div>

      <!-- Camera mode — top center -->
      <div id="hud-camera" style="
        position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
        border-radius: 8px; padding: 4px 12px;
        font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;
        border: 1px solid rgba(255,255,255,0.08);
      ">TPV</div>

      <!-- Pre-drive checklist — left side below speedo -->
      <div id="hud-checklist" style="
        position: absolute; top: 240px; left: 16px;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(10px);
        border-radius: 12px; padding: 12px 16px; width: 240px;
        border: 1px solid rgba(255,255,255,0.08);
        display: none;
      ">
        <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 600; margin-bottom: 8px;">Pemeriksaan Pra-Jalan</div>
        <div id="checklist-items"></div>
      </div>

      <!-- Warning bar — center -->
      <div id="hud-warning" style="
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(217, 119, 6, 0.9); backdrop-filter: blur(8px);
        border-radius: 12px; padding: 12px 24px;
        font-weight: 600; font-size: 0.95rem; text-align: center;
        display: none; z-index: 20;
      "></div>

      <!-- Off-road warning bar — bottom center -->
      <div id="hud-offroad-bar" style="
        position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%);
        background: rgba(239, 68, 68, 0.85); backdrop-filter: blur(8px);
        border-radius: 8px; padding: 8px 20px;
        font-weight: 600; font-size: 0.85rem; text-align: center;
        display: none; z-index: 15;
      ">⚠ Keluar Jalur!</div>

      <!-- Seatbelt warning bar -->
      <div id="hud-seatbelt-bar" style="
        position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: rgba(239, 68, 68, 0.85); backdrop-filter: blur(8px);
        border-radius: 8px; padding: 8px 20px;
        font-weight: 600; font-size: 0.85rem; text-align: center;
        display: none; z-index: 15;
      ">⚠ Sabuk Pengaman Tidak Terpasang!</div>

      <!-- Control hints — bottom center -->
      <div id="hud-controls" style="
        position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
        border-radius: 12px; padding: 10px 20px;
        font-size: 0.7rem; color: #94a3b8; text-align: center;
        border: 1px solid rgba(255,255,255,0.08); white-space: nowrap;
      ">
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">I</kbd> Kontak ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">W</kbd> Gas ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">S</kbd> Rem ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">A/D</kbd> Belok ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">Space</kbd> Rem Tangan ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">C</kbd> Kamera ·
        <kbd style="background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fff;">P</kbd> Pause
      </div>

      <!-- Motor safety — bottom right (only for MOTOR) -->
      <div id="hud-motor-safety" style="
        position: absolute; bottom: 16px; right: 16px;
        background: rgba(0,0,0,0.65); backdrop-filter: blur(10px);
        border-radius: 12px; padding: 12px 16px;
        border: 1px solid rgba(255,255,255,0.08);
        display: none;
      ">
        <div style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 600; margin-bottom: 6px;">Keselamatan Motor</div>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          <span id="hud-helm" style="font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">🪖 Helm</span>
          <span id="hud-jaket" style="font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">🧥 Jaket</span>
          <span id="hud-gloves" style="font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">🧤 Sarung</span>
          <span id="hud-shoes" style="font-size: 0.7rem; padding: 3px 8px; border-radius: 999px; background: rgba(255,255,255,0.15);">👟 Sepatu</span>
        </div>
      </div>
    `;
    this.container.appendChild(this.element);
  }

  show() { this.visible = true; this.element.style.display = 'block'; }
  hide() { this.visible = false; this.element.style.display = 'none'; }

  update(vehicle, snapshot) {
    if (!this.visible) return;
    const el = this.element;

    // Speed
    el.querySelector('#hud-speed').textContent = snapshot ? snapshot.speedText : Math.round(vehicle.getSpeedKmh());
    el.querySelector('#hud-vehicle-type').textContent = vehicle.config.label;

    // Gear
    const gearText = snapshot ? snapshot.gear : vehicle.gear === 0 ? 'N' : vehicle.gear === -1 ? 'R' : vehicle.gear;
    el.querySelector('#hud-gear').textContent = gearText;

    // RPM bar
    const rpmPercent = Math.min(100, (vehicle.rpm / 7000) * 100);
    el.querySelector('#hud-rpm-fill').style.width = rpmPercent + '%';

    // Engine status
    const engineEl = el.querySelector('#hud-engine');
    engineEl.textContent = vehicle.enginePhase === 'STARTING' ? 'Menyalakan...' :
      vehicle.engineOn ? 'Mesin ON' : 'Mesin OFF';
    engineEl.style.background = vehicle.engineOn ? 'rgba(5,150,105,0.8)' :
      vehicle.enginePhase === 'STARTING' ? 'rgba(217,119,6,0.8)' : 'rgba(255,255,255,0.15)';

    // Seatbelt
    const seatbeltEl = el.querySelector('#hud-seatbelt');
    seatbeltEl.textContent = vehicle.seatbeltOn ? 'Sabuk ON' : 'Sabuk OFF';
    seatbeltEl.style.background = vehicle.seatbeltOn ? 'rgba(5,150,105,0.8)' : 'rgba(255,255,255,0.15)';

    // Handbrake
    const hbEl = el.querySelector('#hud-handbrake');
    hbEl.style.display = vehicle.handbrakeOn ? 'inline-block' : 'none';

    // Time
    el.querySelector('#hud-time').textContent = vehicle.timeElapsed.toFixed(1) + 's';

    // Stats
    el.querySelector('#hud-violations').textContent = vehicle.violations;
    el.querySelector('#hud-offroad').textContent = vehicle.offRoadCount;

    // Signal / Hazard / Lights
    el.querySelector('#hud-hazard').style.display = vehicle.hazardOn ? 'inline-block' : 'none';
    el.querySelector('#hud-signal-l').style.display = vehicle.signalLeft || vehicle.hazardOn ? 'inline-block' : 'none';
    el.querySelector('#hud-signal-r').style.display = vehicle.signalRight || vehicle.hazardOn ? 'inline-block' : 'none';
    el.querySelector('#hud-lights').style.display = vehicle.lightsOn || vehicle.highBeamOn ? 'inline-block' : 'none';
    el.querySelector('#hud-highbeam').style.display = vehicle.highBeamOn ? 'inline-block' : 'none';

    if (snapshot) {
      const blink = snapshot.lights.blink !== false;
      for (const id of ['hud-signal-l', 'hud-signal-r', 'hud-hazard']) {
        el.querySelector('#' + id).style.opacity = blink ? '1' : '.35';
      }
      const speedo = el.querySelector('#hud-speedo');
      speedo.setAttribute('aria-label', snapshot.speedText + ' kilometer per jam, gigi ' + snapshot.gear);
      speedo.style.borderBottom = `3px solid ${snapshot.braking ? '#f87171' : '#38bdf8'}`;
      let environmentLabel = el.querySelector('#hud-environment');
      if (!environmentLabel) {
        environmentLabel = document.createElement('div');
        environmentLabel.id = 'hud-environment';
        environmentLabel.style.cssText = 'font-size:12px;color:#cbd5e1;margin-top:8px';
        speedo.appendChild(environmentLabel);
      }
      environmentLabel.textContent = snapshot.timeOfDay + ' · ' + ({ off: 'cerah', light: 'hujan ringan', heavy: 'hujan deras' }[snapshot.weather] || snapshot.weather);
    }

    // Motor safety
    const motorEl = el.querySelector('#hud-motor-safety');
    if (vehicle.type === 'MOTOR') {
      motorEl.style.display = 'block';
      this._updateSafetyItem('hud-helm', vehicle.helmetOn);
      this._updateSafetyItem('hud-jaket', vehicle.jacketOn);
      this._updateSafetyItem('hud-gloves', vehicle.glovesOn);
      this._updateSafetyItem('hud-shoes', vehicle.shoesOn);
    } else {
      motorEl.style.display = 'none';
    }
  }

  _updateSafetyItem(id, active) {
    const el = this.element.querySelector('#' + id);
    if (el) {
      el.style.background = active ? 'rgba(5,150,105,0.8)' : 'rgba(255,255,255,0.15)';
    }
  }

  updateChecklist(items) {
    const container = this.element.querySelector('#hud-checklist');
    const list = this.element.querySelector('#checklist-items');
    if (!items || items.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    list.innerHTML = items.map(item => `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:0.8rem;">
        <span style="color:${item.done ? '#22c55e' : '#94a3b8'};">${item.done ? '✓' : '○'}</span>
        <span style="color:${item.done ? '#fff' : '#94a3b8'};">${item.label}</span>
      </div>
    `).join('');
  }

  setCameraMode(mode) {
    const el = this.element.querySelector('#hud-camera');
    if (el) el.textContent = mode;
  }

  showOffRoadWarning(show) {
    const el = this.element.querySelector('#hud-offroad-bar');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  showSeatbeltWarning(show) {
    const el = this.element.querySelector('#hud-seatbelt-bar');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  showWarning(text, duration = 3000, color = 'rgba(217,119,6,0.9)') {
    const el = this.element.querySelector('#hud-warning');
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = color;
    clearTimeout(this._warningTimeout);
    this._warningTimeout = setTimeout(() => { el.style.display = 'none'; }, duration);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

window.HUD = HUD;
