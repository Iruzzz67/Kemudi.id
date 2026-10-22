"use client";

// Procedurally synthesized engine + skid sound via the Web Audio API — no
// sample files to source/license. The engine is a sawtooth oscillator through
// a lowpass filter (frequency/tone rise with "RPM"); the skid is a looping
// noise buffer through a bandpass filter, with its gain riding the slip
// intensity so it fades in/out instead of being started and stopped per-frame.
//
// A single module-level instance is shared: SimulationApp calls start() from
// a user-gesture click handler (required by autoplay policy), and
// VehicleController calls update()/silence() every frame.
class VehicleAudioEngine {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private hornGain: GainNode | null = null;
  private hornNodes: AudioScheduledSourceNode[] = [];
  private muted = false;

  start() {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      this.ctx = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = this.muted ? 0 : 1;
      masterGain.connect(ctx.destination);
      this.masterGain = masterGain;

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 300;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(filter).connect(gain).connect(masterGain);
      osc.start();
      this.engineOsc = osc;
      this.engineFilter = filter;
      this.engineGain = gain;

      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 2200;
      bandpass.Q.value = 0.7;
      const skidGain = ctx.createGain();
      skidGain.gain.value = 0;
      noiseSource.connect(bandpass).connect(skidGain).connect(masterGain);
      noiseSource.start();
      this.skidFilter = bandpass;
      this.skidGain = skidGain;
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  update({
    rpmRatio,
    throttleOn,
    skidIntensity,
  }: {
    rpmRatio: number;
    throttleOn: boolean;
    skidIntensity: number;
  }) {
    const ctx = this.ctx;
    if (!ctx || !this.engineOsc || !this.engineFilter || !this.engineGain || !this.skidGain) return;

    const clampedRpm = Math.min(1, Math.max(0, rpmRatio));
    const now = ctx.currentTime;

    const freq = 55 + clampedRpm * 170;
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.06);
    this.engineFilter.frequency.setTargetAtTime(300 + clampedRpm * 1600, now, 0.06);
    const targetGain = (throttleOn ? 0.05 : 0.025) + clampedRpm * 0.07;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.1);

    const clampedSkid = Math.min(1, Math.max(0, skidIntensity));
    this.skidGain.gain.setTargetAtTime(clampedSkid * 0.12, now, 0.05);
  }

  silence() {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain || !this.skidGain) return;
    const now = ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, 0.15);
    this.skidGain.gain.setTargetAtTime(0, now, 0.1);
  }

  // One-shot noise burst for a bad gearbox shift — a short, sharp bandpassed
  // rasp, distinct from the continuous cornering/braking skid noise (which
  // stays driven by update() every frame and would otherwise fight this).
  gearGrind() {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const duration = 0.32;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900;
    bandpass.Q.value = 4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(bandpass).connect(gain).connect(this.masterGain);
    source.start(now);
    source.stop(now + duration);
  }

  // Two-tone electric honk. Held input (keyboard T / right stick press) keeps
  // the tone looping through a per-oscillator tremolo; releasing ramps the
  // gain down and tears the nodes down shortly after, so it never lingers.
  setHorn(on: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;

    if (on && !this.hornGain) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterGain);
      this.hornGain = gain;

      const nodes: AudioScheduledSourceNode[] = [];
      [332, 415].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const tremolo = ctx.createOscillator();
        tremolo.frequency.value = 11 + i * 3;
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.18;
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.16;
        tremolo.connect(tremoloGain).connect(oscGain.gain);
        osc.connect(oscGain).connect(gain);
        osc.start();
        tremolo.start();
        nodes.push(osc, tremolo);
      });
      this.hornNodes = nodes;
      gain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.02);
    } else if (!on && this.hornGain) {
      const gain = this.hornGain;
      const stopAt = ctx.currentTime + 0.12;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      for (const node of this.hornNodes) {
        try {
          node.stop(stopAt);
        } catch {
          // already stopped
        }
      }
      this.hornNodes = [];
      this.hornGain = null;
    }
  }

  // One-shot low thump for an engine stall — a quick downward sine sweep.
  stallThud() {
    const ctx = this.ctx;
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const duration = 0.3;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  isMuted() {
    return this.muted;
  }
}

export const vehicleAudio = new VehicleAudioEngine();
