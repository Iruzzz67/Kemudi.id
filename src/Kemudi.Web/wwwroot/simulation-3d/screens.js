/**
 * Screens — Overlay screens for the simulation:
 * - VehicleSelectScreen: choose vehicle + transmission
 * - WalkingHUD: walking phase instructions + enter button
 * - PauseScreen: pause overlay
 * - FinishedScreen: results with scoring formula
 * - FailedScreen: failure with reason
 *
 * Scoring: skor = 100 − pelanggaran×8 − offRoadCount×5 − penaltyWaktu
 * penaltyWaktu = max(0, waktuDetik − 180) × 1
 */

class VehicleSelectScreen {
  constructor(container, onStart) {
    this.container = container;
    this.onStart = onStart;
    this.element = null;
    this.selectedVehicle = 'MOBIL';
    this.selectedTransmission = 'automatic';
    this.muted = false;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'vehicle-select';
    this.element.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(10,10,10,0.88); backdrop-filter: blur(16px);
      display: none; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
    `;
    this._render();
    this.container.appendChild(this.element);
  }

  _render() {
    const vehicles = [
      { type: 'MOTOR', label: 'Motor', sub: 'Sport Biru', speed: '94 km/j', gears: '4', accel: '9 m/s²', color: '#2563eb' },
      { type: 'MOBIL', label: 'Mobil', sub: 'Sport Merah', speed: '79 km/j', gears: '5', accel: '6 m/s²', color: '#dc2626' },
      { type: 'TRUK', label: 'Truk', sub: 'Box Putih', speed: '58 km/j', gears: '6', accel: '3.2 m/s²', color: '#e2e8f0' },
    ];

    this.element.innerHTML = `
      <div style="max-width: 650px; width: 100%; padding: 2rem; text-align: center;">
        <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">Pilih Kendaraan</h1>
        <p style="color: #94a3b8; margin-bottom: 2rem; font-size: 0.9rem;">
          Satu perjalanan melewati perumahan, dua simpang berlampu, dan jalan berkelok panjang. Ikuti lajur kiri hingga finis.
        </p>

        <!-- Vehicle cards -->
        <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 1.5rem;">
          ${vehicles.map(v => `
            <button type="button" class="vs-card" aria-pressed="${this.selectedVehicle === v.type}" data-type="${v.type}" style="
              flex: 1; max-width: 180px;
              border: 2px solid ${this.selectedVehicle === v.type ? '#2563eb' : 'rgba(255,255,255,0.1)'};
              background: ${this.selectedVehicle === v.type ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.05)'};
              border-radius: 12px; padding: 20px 16px; cursor: pointer;
              transition: all 0.2s ease;
            ">
              <div style="width: 16px; height: 16px; border-radius: 50%; background: ${v.color}; margin: 0 auto 12px;"></div>
              <div style="font-weight: 700; font-size: 1.1rem;">${v.label}</div>
              <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px;">${v.sub}</div>
              <div style="margin-top: 12px; font-size: 0.85rem; color: #38bdf8; font-weight: 600;">${v.speed}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${v.gears} gigi · ${v.accel}</div>
            </button>
          `).join('')}
        </div>

        <!-- Transmission -->
        <div style="margin-bottom: 1rem;">
          <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Jenis Transmisi</div>
          <div style="display: inline-flex; gap: 0; border-radius: 999px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);">
            <button class="vs-trans" data-trans="automatic" style="
              padding: 8px 24px; font-size: 0.85rem; font-weight: 600;
              background: ${this.selectedTransmission === 'automatic' ? '#2563eb' : 'rgba(255,255,255,0.05)'};
              color: #fff; border: none; cursor: pointer; transition: all 0.2s;
            ">Automatic</button>
            <button class="vs-trans" data-trans="manual" style="
              padding: 8px 24px; font-size: 0.85rem;
              background: ${this.selectedTransmission === 'manual' ? '#2563eb' : 'rgba(255,255,255,0.05)'};
              color: #fff; border: none; cursor: pointer; transition: all 0.2s;
            ">Manual</button>
          </div>
        </div>

        <!-- Mute toggle -->
        <div style="margin-bottom:16px;font-size:13px">
          <span>Jalan latihan terpadu · sekitar 480 meter</span>
        </div>
        <div style="margin-bottom: 1.5rem;">
          <button id="vs-mute" style="
            padding: 6px 16px; font-size: 0.8rem;
            background: ${this.muted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'};
            color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
            cursor: pointer; transition: all 0.2s;
          ">${this.muted ? '🔇 Muted' : '🔊 Suara'}</button>
        </div>

        <!-- Start button -->
        <button id="vs-start" style="
          padding: 14px 48px; font-size: 1.1rem; font-weight: 700;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff; border: none; border-radius: 999px;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 24px rgba(37,99,235,0.4);
        ">Mulai Simulasi</button>
        <div style="margin-top:12px"><button id="vs-intersection-demo" type="button" style="padding:10px 14px;border:1px solid #555b65;border-radius:6px;background:#22252a;color:#ddd;cursor:pointer">Latihan dekat simpang empat</button></div>

        <!-- Keyboard hints -->
        <div style="margin-top: 1.5rem; font-size: 0.75rem; color: #64748b;">
          <div style="margin-bottom: 4px;"><b style="color:#94a3b8;">Walking:</b> WASD berjalan · E/Enter masuk kendaraan</div>
          <div><b style="color:#94a3b8;">Driving:</b> I kontak · W gas · S rem · A/D belok · Space rem tangan · C kamera</div>
          <div style="margin-top:6px;color:#cbd5e1">L lampu · K jauh · Z/X sein · V hazard · T klakson · P jeda/cuaca</div>
        </div>
      </div>
    `;

    // Bind events
    this.element.querySelector('#vs-intersection-demo').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('map', 'unified'); url.searchParams.set('demo', 'intersection');
      url.searchParams.set('vehicle', this.selectedVehicle); url.searchParams.set('transmission', this.selectedTransmission);
      location.href = url.href;
    });
    this.element.querySelectorAll('.vs-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedVehicle = card.dataset.type;
        this._render();
      });
    });

    this.element.querySelectorAll('.vs-trans').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTransmission = btn.dataset.trans;
        this._render();
      });
    });

    const muteBtn = this.element.querySelector('#vs-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.muted = !this.muted;
        this._render();
      });
    }

    const startBtn = this.element.querySelector('#vs-start');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.hide();
        this.onStart(this.selectedVehicle, this.selectedTransmission, this.muted);
      });
    }
  }

  show() { this.element.style.display = 'flex'; }
  hide() { this.element.style.display = 'none'; }
}

class WalkingHUD {
  constructor(container) {
    this.container = container;
    this.element = null;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'walking-hud';
    this.element.style.cssText = `
      position: absolute; inset: 0; pointer-events: none;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
      display: none; z-index: 10;
    `;
    this.element.innerHTML = `
      <div style="
        position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.55); backdrop-filter: blur(8px);
        border-radius: 12px; padding: 10px 20px; text-align: center;
        border: 1px solid rgba(255,255,255,0.08);
      ">
        <div style="font-size: 0.8rem; color: #94a3b8;">WASD untuk berjalan ke kendaraan</div>
      </div>
      <button id="wh-enter" style="
        position: absolute; bottom: 136px; left: 50%; transform: translateX(-50%);
        padding: 12px 32px; font-size: 1rem; font-weight: 700;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #fff; border: none; border-radius: 999px;
        cursor: pointer; pointer-events: auto; display: none;
        box-shadow: 0 4px 20px rgba(34,197,94,0.4);
      ">🚗 Masuk Kendaraan</button>
    `;
    this.container.appendChild(this.element);
  }

  show() { this.element.style.display = 'block'; }
  hide() { this.element.style.display = 'none'; }

  setShowEnterButton(show) {
    const btn = this.element.querySelector('#wh-enter');
    if (btn) btn.style.display = show ? 'block' : 'none';
  }

  onEnterClick(callback) {
    const btn = this.element.querySelector('#wh-enter');
    if (btn) btn.addEventListener('click', callback);
  }

  playDoorAnimation() {
    return new Promise(resolve => {
      // Simple door animation placeholder
      setTimeout(resolve, 500);
    });
  }
}

class PauseScreen {
  constructor(container, onResume) {
    this.container = container;
    this.onResume = onResume;
    this.element = null;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'pause-screen';
    this.element.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.7); backdrop-filter: blur(12px);
      display: none; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
    `;
    this.element.innerHTML = `
      <div style="text-align: center;">
        <h1 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem;">⏸ Jeda</h1>
        <p style="color: #94a3b8; margin-bottom: 2rem;">Simulasi dijeda</p>
        <button id="pause-resume" style="
          padding: 12px 36px; font-size: 1rem; font-weight: 700;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff; border: none; border-radius: 999px;
          cursor: pointer; margin-right: 12px;
        ">Lanjut</button>
        <button id="pause-quit" style="
          padding: 12px 36px; font-size: 1rem;
          background: rgba(255,255,255,0.1); color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
          cursor: pointer;
        ">Keluar</button>
      </div>
    `;

    this.element.querySelector('#pause-resume').addEventListener('click', () => {
      this.hide();
      this.onResume();
    });

    this.element.querySelector('#pause-quit').addEventListener('click', () => {
      this.hide();
      if (this.onQuit) this.onQuit();
    });

    this.container.appendChild(this.element);
  }

  show() { this.element.style.display = 'flex'; }
  hide() { this.element.style.display = 'none'; }
}

class FinishedScreen {
  constructor(container) {
    this.container = container;
    this.element = null;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'finished-screen';
    this.element.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
      display: none; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
    `;
    this.container.appendChild(this.element);
  }

  show(stats) {
    return new Promise(resolve => {
      const score = stats.score;
      const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
      const gradeColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

      this.element.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
          <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem;">🎉 Selesai!</h1>
          <div style="
            font-size: 5rem; font-weight: 900; color: ${gradeColor};
            line-height: 1; margin: 1rem 0;
          ">${score}</div>
          <div style="font-size: 1.2rem; color: ${gradeColor}; font-weight: 700; margin-bottom: 1.5rem;">Grade ${grade}</div>

          <div style="
            background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;
            text-align: left; margin-bottom: 1.5rem;
          ">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;">
              <span style="color:#94a3b8;">Waktu</span><span>${stats.time}s</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;">
              <span style="color:#94a3b8;">Pelanggaran</span><span style="color:${stats.violations > 0 ? '#ef4444' : '#22c55e'};">${stats.violations} × -8 = -${stats.violations * 8}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:0.9rem;">
              <span style="color:#94a3b8;">Keluar jalur</span><span style="color:${stats.offRoad > 0 ? '#ef4444' : '#22c55e'};">${stats.offRoad} × -5 = -${stats.offRoad * 5}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
              <span style="color:#94a3b8;">Penalty waktu</span><span style="color:${stats.timePenalty > 0 ? '#ef4444' : '#22c55e'};">-${stats.timePenalty}</span>
            </div>
          </div>

          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="fs-action" data-action="retry" style="
              padding: 12px 28px; font-size: 0.95rem; font-weight: 700;
              background: linear-gradient(135deg, #2563eb, #3b82f6);
              color: #fff; border: none; border-radius: 999px; cursor: pointer;
            ">🔄 Coba Lagi</button>
            <button class="fs-action" data-action="change" style="
              padding: 12px 28px; font-size: 0.95rem;
              background: rgba(255,255,255,0.1); color: #94a3b8;
              border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; cursor: pointer;
            ">🚗 Ganti</button>
          </div>
        </div>
      `;

      this.element.style.display = 'flex';

      this.element.querySelectorAll('.fs-action').forEach(btn => {
        btn.addEventListener('click', () => {
          this.hide();
          resolve(btn.dataset.action);
        });
      });
    });
  }

  hide() { this.element.style.display = 'none'; }
}

class FailedScreen {
  constructor(container) {
    this.container = container;
    this.element = null;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.id = 'failed-screen';
    this.element.style.cssText = `
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(12px);
      display: none; align-items: center; justify-content: center;
      font-family: 'Inter', system-ui, sans-serif; color: #fff;
    `;
    this.container.appendChild(this.element);
  }

  show(reason = 'Kecelakaan dengan pejalan kaki') {
    return new Promise(resolve => {
      this.element.innerHTML = `
        <div style="text-align: center; max-width: 400px;">
          <h1 style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: #ef4444;">❌ Gagal</h1>
          <p style="color: #94a3b8; margin-bottom: 2rem; font-size: 1rem;">${reason}</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="fs-action" data-action="retry" style="
              padding: 12px 28px; font-size: 0.95rem; font-weight: 700;
              background: linear-gradient(135deg, #2563eb, #3b82f6);
              color: #fff; border: none; border-radius: 999px; cursor: pointer;
            ">🔄 Coba Lagi</button>
            <button class="fs-action" data-action="change" style="
              padding: 12px 28px; font-size: 0.95rem;
              background: rgba(255,255,255,0.1); color: #94a3b8;
              border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; cursor: pointer;
            ">🚗 Ganti Kendaraan</button>
          </div>
        </div>
      `;

      this.element.style.display = 'flex';

      this.element.querySelectorAll('.fs-action').forEach(btn => {
        btn.addEventListener('click', () => {
          this.hide();
          resolve(btn.dataset.action);
        });
      });
    });
  }

  hide() { this.element.style.display = 'none'; }
}

window.VehicleSelectScreen = VehicleSelectScreen;
window.WalkingHUD = WalkingHUD;
window.PauseScreen = PauseScreen;
window.FinishedScreen = FinishedScreen;
window.FailedScreen = FailedScreen;
