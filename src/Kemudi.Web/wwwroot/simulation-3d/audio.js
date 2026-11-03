/**
 * Audio — Procedural audio system using Web Audio API.
 * Engine sound (sawtooth + lowpass), gear grind, stall thud, horn, tire skid.
 * Based on DOKUMENTASI_SIMULASI.md §13.
 */

class SimAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineNode = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.engineFilter = null;
    this.initialized = false;
    this.voices = new Set();
    this.activeHornVoices = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      // Engine sound: sawtooth oscillator + lowpass filter
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 80;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 800;
      this.engineFilter.Q.value = 2;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();

      // One reusable noise source; hard braking must not allocate a buffer each frame.
      const noise = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * .25), this.ctx.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .3;
      this.skidSource = this.ctx.createBufferSource();
      this.skidSource.buffer = noise;
      this.skidSource.loop = true;
      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass'; this.skidFilter.frequency.value = 2000;
      this.skidGain = this.ctx.createGain(); this.skidGain.gain.value = 0;
      this.skidSource.connect(this.skidFilter);
      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.masterGain);
      this.skidSource.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
      this.dispose();
    }
  }

  updateEngine(rpm, engineOn) {
    if (!this.initialized || this.muted) {
      if (this.engineGain) this.engineGain.gain.value = 0;
      return;
    }

    if (engineOn) {
      // Map RPM to frequency and gain
      const freq = 40 + (rpm / 7000) * 200;
      const gain = 0.05 + (rpm / 7000) * 0.25;
      const filterFreq = 400 + (rpm / 7000) * 2000;

      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
    } else {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  playGearGrind() {
    if (!this._canPlay()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200 + Math.random() * 100;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    this._trackVoice([osc], [osc, gain], 'grind');
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playStallThud() {
    if (!this._canPlay()) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.4);
    gain.gain.value = 0.3;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    this._trackVoice([osc], [osc, gain], 'stall');
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playHorn(type = 'MOBIL') {
    if (!this._canPlay() || this.activeHornVoices >= 3) return false;
    // Original synthesized tones; no downloaded audio or extra AudioContexts.
    const profile = type === 'MOTOR' ? { notes: [540, 680], wave: 'square', gain: .065, duration: .24 }
      : type === 'TRUK' ? { notes: [180, 225], wave: 'sawtooth', gain: .075, duration: .48 }
      : { notes: [332, 415], wave: 'sine', gain: .15, duration: .4 };
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = profile.wave;
    osc1.frequency.value = profile.notes[0];
    osc2.type = profile.wave;
    osc2.frequency.value = profile.notes[1];
    gain.gain.value = profile.gain;
    gain.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + profile.duration);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    this._trackVoice([osc1, osc2], [osc1, osc2, gain], 'horn');
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + profile.duration);
    osc2.stop(this.ctx.currentTime + profile.duration);
    return true;
  }

  playTireSkid(intensity) {
    if (!this.initialized || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.skidGain.gain.cancelScheduledValues(now);
    this.skidGain.gain.setTargetAtTime(Math.min(1, Math.max(0, intensity || 0)) * .12, now, .015);
    this.skidGain.gain.setTargetAtTime(0, now + .08, .04);
  }

  _canPlay() {
    return this.initialized && !this.muted && this.ctx.state === 'running' && this.voices.size < 8;
  }

  _trackVoice(sources, nodes, kind) {
    const voice = { sources, nodes, kind, ended: 0, cleaned: false };
    if (kind === 'horn') this.activeHornVoices++;
    this.voices.add(voice);
    voice.cleanup = () => {
      if (voice.cleaned) return;
      voice.cleaned = true;
      nodes.forEach(node => node.disconnect());
      this.voices.delete(voice);
      if (kind === 'horn') this.activeHornVoices--;
    };
    sources.forEach(source => { source.onended = () => { if (++voice.ended === sources.length) voice.cleanup(); }; });
  }

  _stopVoices() {
    for (const voice of [...this.voices]) {
      voice.sources.forEach(source => {
        try { source.stop(); } catch (error) { if (error.name !== 'InvalidStateError') throw error; }
      });
      voice.cleanup();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.silence();
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 0.3;
    }
  }

  silence() {
    for (const node of [this.engineGain, this.skidGain]) if (node) {
      node.gain.cancelScheduledValues(this.ctx.currentTime);
      node.gain.value = 0;
    }
    this._stopVoices();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  dispose() {
    this.silence();
    for (const source of [this.engineOsc, this.skidSource]) if (source) {
      try { source.stop(); } catch (error) { if (error.name !== 'InvalidStateError') throw error; }
    }
    for (const node of [this.engineOsc, this.engineFilter, this.engineGain, this.skidSource, this.skidFilter, this.skidGain, this.masterGain]) node?.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') this.ctx.close().catch(() => {});
    this.engineOsc = this.engineFilter = this.engineGain = this.skidSource = this.skidFilter = this.skidGain = this.masterGain = null;
    this.ctx = null;
    this.initialized = false;
  }
}

window.SimAudio = SimAudio;
