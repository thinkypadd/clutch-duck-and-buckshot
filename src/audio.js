export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineGain = null;
    this.oscA = null;
    this.oscB = null;
    this.engineFilter = null;
    this.rumbleGain = null;
    this.noiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.42;
    this.master.connect(this.ctx.destination);

    // Reusable white-noise buffer for shotgun, nitro hiss, crashes, and curb buzz
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Continuous engine synth
    this.oscA = this.ctx.createOscillator();
    this.oscB = this.ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscB.type = 'square';
    this.oscA.frequency.value = 52;
    this.oscB.frequency.value = 26.3;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 240;
    this.engineFilter.Q.value = 2.5;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.oscA.connect(this.engineFilter);
    this.oscB.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    this.oscA.start();
    this.oscB.start();

    // Continuous curb/skid loop
    const skidSrc = this.ctx.createBufferSource();
    skidSrc.buffer = this.noiseBuffer;
    skidSrc.loop = true;
    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 880;
    this.skidFilter.Q.value = 4.0;
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0;
    skidSrc.connect(this.skidFilter);
    this.skidFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.master);
    skidSrc.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
    }
  }

  suspendEngine() {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, t, 0.04);
    this.rumbleGain.gain.setTargetAtTime(0, t, 0.04);
  }

  updateContinuous({ rpm, gasHeld, nitroStacks, onCurb, offRoad, brakingHard, active }) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    if (!active) {
      this.engineGain.gain.setTargetAtTime(0, t, 0.05);
      this.rumbleGain.gain.setTargetAtTime(0, t, 0.05);
      return;
    }

    const baseFreq = 42 + rpm * 128 + nitroStacks * 22;
    this.oscA.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.oscB.frequency.setTargetAtTime(baseFreq * 0.503, t, 0.04);

    const cutoff = 190 + rpm * 750 + (gasHeld ? 280 : 0) + nitroStacks * 340;
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);

    const targetVol = 0.11 + (gasHeld ? 0.09 : 0) + nitroStacks * 0.035;
    this.engineGain.gain.setTargetAtTime(targetVol, t, 0.05);

    let surfaceVol = 0;
    if (brakingHard) {
      this.skidFilter.frequency.setTargetAtTime(1350, t, 0.03);
      surfaceVol = 0.14;
    } else if (onCurb) {
      this.skidFilter.frequency.setTargetAtTime(210, t, 0.03);
      surfaceVol = 0.18;
    } else if (offRoad) {
      this.skidFilter.frequency.setTargetAtTime(340, t, 0.03);
      surfaceVol = 0.12;
    }
    this.rumbleGain.gain.setTargetAtTime(surfaceVol, t, 0.04);
  }

  playShotgunBlast() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // Heavy noise transient
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.36);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.95, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.4);

    // Sub-bass cannon thump
    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(135, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.24);
    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(0.85, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    sub.connect(sGain);
    sGain.connect(this.master);
    sub.start(t);
    sub.stop(t + 0.28);
  }

  playDryFire() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.035);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  playShellEject() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1650, t);
    osc.frequency.setValueAtTime(2280, t + 0.04);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playShellLoad() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.065);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playBreechSnap(opening = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 480 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(opening ? 220 : 620, t + 0.06);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.38, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playNitroTrigger(stacks) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // Pressurized N2O hiss
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400 + stacks * 500, t);
    bp.Q.value = 1.8;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.48, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.36);

    // Turbine spool pitch
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 240 + stacks * 140;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.25);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.26, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(og);
    og.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playLowPsi() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.setValueAtTime(98, t + 0.07);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playCrash(scale = 1) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(950, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.65, 0.35 * scale), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    noise.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.24);
  }

  playRivalWreck() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + 0.52);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.72, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    noise.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.56);
  }

  playCountdown(isGo = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isGo ? 784 : 392, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.32 : 0.14));
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + (isGo ? 0.34 : 0.16));
  }

  playLap(isFinish = false) {
    if (!this.ctx || this.muted) return;
    const notes = isFinish ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.085;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }
}
