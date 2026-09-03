// Procedural Web Audio API Sound Engine
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmInterval: number | null = null;
  private bgmGain: GainNode | null = null;

  constructor() {}

  private init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Lowpass filter for Slow Motion bullet-time
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 20000;

    // Dynamics compressor to avoid clipping
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
    compressor.knee.setValueAtTime(30, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(12, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;

    this.filterNode.connect(compressor);
    compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  public ensureAudio() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setSlowMotion(active: boolean) {
    if (!this.filterNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.exponentialRampToValueAtTime(380, now + 0.2);
      this.playWhoosh(false);
    } else {
      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.exponentialRampToValueAtTime(20000, now + 0.15);
      this.playWhoosh(true);
    }
  }

  // Hit sound with dynamic velocity
  public playHit(intensity: number = 0.5) {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const clamped = Math.min(Math.max(intensity, 0.1), 1.0);
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 + clamped * 120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(clamped * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.filterNode);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Heavy Explosion with sub-bass and white noise crackle
  public playExplosion() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;

    // 1. Noise buffer for blast crackle
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(80, now + 0.35);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.filterNode);
    noise.start(now);

    // 2. Sub-bass punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.filterNode);
    subOsc.start(now);
    subOsc.stop(now + 0.4);
  }

  // Force Pulse Cannon
  public playPulse() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Laser zap sound
  public playLaser() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Portal teleportation warp
  public playPortalWarp() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(980, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Spring jump / bounce
  public playBounce() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Spawn pop sound
  public playSpawn() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Victory Fanfare
  public playVictory() {
    if (this.isMuted) return;
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.filterNode) return;
      const startTime = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(this.filterNode);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  // Slow motion whoosh sound
  private playWhoosh(speedUp: boolean) {
    if (this.isMuted) return;
    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (speedUp) {
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.15);
    } else {
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.2);
    }

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.filterNode);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Procedural Synthwave BGM loop
  public toggleBgm(): boolean {
    this.ensureAudio();
    if (!this.ctx || !this.filterNode) return false;

    if (this.bgmPlaying) {
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
      if (this.bgmGain) {
        this.bgmGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      }
      this.bgmPlaying = false;
      return false;
    }

    this.bgmPlaying = true;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.bgmGain.connect(this.filterNode);

    // Minor pentatonic synth arpeggio
    const scale = [130.81, 155.56, 174.61, 196.00, 233.08, 261.63, 311.13, 349.23]; // C minor
    let step = 0;

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || !this.bgmGain || this.isMuted) return;
      const now = this.ctx.currentTime;
      const noteFreq = scale[step % scale.length];
      const bassFreq = scale[Math.floor(step / 4) % 3] / 2;

      // Arp synth
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(noteFreq, now);

      noteGain.gain.setValueAtTime(0.08, now);
      noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(700 + Math.sin(step * 0.4) * 400, now);
      bandpass.Q.value = 3;

      osc.connect(bandpass);
      bandpass.connect(noteGain);
      noteGain.connect(this.bgmGain);

      osc.start(now);
      osc.stop(now + 0.19);

      // Bass punch on every 4th step
      if (step % 4 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassG = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(bassFreq, now);
        bassG.gain.setValueAtTime(0.18, now);
        bassG.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        bassOsc.connect(bassG);
        bassG.connect(this.bgmGain);
        bassOsc.start(now);
        bassOsc.stop(now + 0.35);
      }

      step++;
    }, 170); // ~88 BPM 16th notes

    return true;
  }

  public isBgmOn(): boolean {
    return this.bgmPlaying;
  }
}

export const soundEngine = new SoundEngine();
