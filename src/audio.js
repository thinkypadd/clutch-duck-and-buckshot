export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineGain = null;
    this.oscA = null;
    this.oscB = null;
    this.blowerOsc = null;
    this.blowerGain = null;
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

    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.oscA = this.ctx.createOscillator();
    this.oscB = this.ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscB.type = 'square';
    this.oscA.frequency.value = 52;
    this.oscB.frequency.value = 26.3;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 240;
    this.engineFilter.Q.value = 2.4;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    this.oscA.connect(this.engineFilter);
    this.oscB.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    this.oscA.start();
    this.oscB.start();

    this.blowerOsc = this.ctx.createOscillator();
    this.blowerOsc.type = 'triangle';
    this.blowerOsc.frequency.value = 680;
    this.blowerGain = this.ctx.createGain();
    this.blowerGain.gain.value = 0;
    this.blowerOsc.connect(this.blowerGain);
    this.blowerGain.connect(this.master);
    this.blowerOsc.start();

    const skidSrc = this.ctx.createBufferSource();
    skidSrc.buffer = this.noiseBuffer;
    skidSrc.loop = true;
    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 880;
    this.skidFilter.Q.value = 3.8;
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
    this.blowerGain.gain.setTargetAtTime(0, t, 0.04);
  }

  updateContinuous({
    rpm,
    nitroStacks,
    blowerActive,
    drifting,
    onCurb,
    offRoad,
    airborne,
    active,
    carId,
  }) {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    if (!active) {
      this.suspendEngine();
      return;
    }

    const pitchScale =
      carId === 'muscle' || carId === 'truck'
        ? 0.8
        : carId === 'junker'
        ? 0.88
        : carId === 'rotary' || carId === 'hyper'
        ? 1.32
        : carId === 'rally'
        ? 1.15
        : 1.0;

    const baseFreq = (40 + rpm * 138 + nitroStacks * 22) * pitchScale;
    this.oscA.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.oscB.frequency.setTargetAtTime(baseFreq * 0.503, t, 0.04);

    const cutoff = 220 + rpm * 850 + nitroStacks * 320;
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);
    this.engineGain.gain.setTargetAtTime(0.15 + nitroStacks * 0.03, t, 0.05);

    this.blowerOsc.frequency.setTargetAtTime(520 + rpm * 1180, t, 0.04);
    this.blowerGain.gain.setTargetAtTime(blowerActive ? 0.095 : 0, t, 0.05);

    let surfaceVol = 0;
    if (!airborne) {
      if (drifting) {
        this.skidFilter.frequency.setTargetAtTime(1420, t, 0.03);
        surfaceVol = 0.16;
      } else if (onCurb) {
        this.skidFilter.frequency.setTargetAtTime(220, t, 0.03);
        surfaceVol = 0.17;
      } else if (offRoad) {
        this.skidFilter.frequency.setTargetAtTime(360, t, 0.03);
        surfaceVol = 0.11;
      }
    }
    this.rumbleGain.gain.setTargetAtTime(surfaceVol, t, 0.04);
  }

  playGearShift(downshift = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(downshift ? 210 : 320, t);
    osc.frequency.exponentialRampToValueAtTime(downshift ? 420 : 180, t + 0.065);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playPanelHinge(open = true) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(open ? 140 : 280, t);
    osc.frequency.exponentialRampToValueAtTime(open ? 290 : 110, t + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playHydroJump() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.23);
  }

  playTrunkDeploy(type = 'oil') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type === 'mine' ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(type === 'mine' ? 880 : 260, t);
    osc.frequency.exponentialRampToValueAtTime(type === 'napalm' ? 120 : 480, t + 0.18);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  playWeaponFire(gunId, suppressed = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    const dur =
      gunId === 'thumper'
        ? 0.44
        : gunId === 'sawed_off' || gunId === 'pump_shotgun'
        ? 0.36
        : gunId === 'lever_rifle' || gunId === 'revolver'
        ? 0.28
        : gunId === 'ak_shorty'
        ? 0.16
        : gunId === 'm1911'
        ? 0.17
        : 0.1;

    const startFreq = suppressed
      ? 920
      : gunId === 'thumper'
      ? 1150
      : gunId === 'sawed_off' || gunId === 'pump_shotgun'
      ? 2400
      : 2950;
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(140, t + dur);

    const nGain = this.ctx.createGain();
    const vol = suppressed ? 0.35 : gunId === 'smg' ? 0.46 : 0.88;
    nGain.gain.setValueAtTime(vol, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.master);
    noise.start(t);
    noise.stop(t + dur + 0.02);

    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    const subStart =
      gunId === 'thumper'
        ? 190
        : gunId === 'sawed_off' || gunId === 'pump_shotgun'
        ? 135
        : gunId === 'lever_rifle' || gunId === 'revolver'
        ? 165
        : 210;
    sub.frequency.setValueAtTime(subStart, t);
    sub.frequency.exponentialRampToValueAtTime(36, t + dur * 0.75);
    const sGain = this.ctx.createGain();
    sGain.gain.setValueAtTime(vol * 0.88, t);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.78);
    sub.connect(sGain);
    sGain.connect(this.master);
    sub.start(t);
    sub.stop(t + dur * 0.82);
  }

  playEnemyShot() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1650, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.13);
  }

  playDryFire() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.035);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.26, t);
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
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.065);
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
    osc.frequency.setValueAtTime(opening ? 480 : 250, t);
    osc.frequency.exponentialRampToValueAtTime(opening ? 220 : 660, t + 0.065);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.36, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playShopBuy() {
    if (!this.ctx || this.muted) return;
    const notes = [523.25, 783.99];
    notes.forEach((f, i) => {
      const t = this.ctx.currentTime + i * 0.065;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  playNitroTrigger(stacks) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400 + stacks * 450, t);
    bp.Q.value = 1.8;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.46, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    noise.connect(bp);
    bp.connect(ng);
    ng.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.35);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 230 + stacks * 130;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.9, t + 0.24);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
    osc.connect(og);
    og.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.29);
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
    lp.frequency.setValueAtTime(1750, t);
    lp.frequency.exponentialRampToValueAtTime(110, t + 0.56);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.76, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    noise.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    noise.start(t);
    noise.stop(t + 0.62);
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
