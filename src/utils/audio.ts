/**
 * Web Audio API synthesizer for industrial simulation sounds.
 * Zero external audio files or 404 dependencies.
 */

class HaberAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private compressorOsc: OscillatorNode | null = null;
  private compressorGain: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.25, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.startContinuousAudio();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private startContinuousAudio() {
    if (!this.ctx || !this.masterGain) return;

    // 1. Low compressor industrial motor hum (60Hz with subtle detune)
    try {
      this.compressorOsc = this.ctx.createOscillator();
      this.compressorOsc.type = 'sawtooth';
      this.compressorOsc.frequency.setValueAtTime(58, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.compressorGain = this.ctx.createGain();
      this.compressorGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.compressorOsc.connect(filter);
      filter.connect(this.compressorGain);
      this.compressorGain.connect(this.masterGain);
      this.compressorOsc.start();
    } catch {
      // Audio element safety fallback
    }

    // 2. High pressure gas hiss through pipes (filtered white noise)
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(800, this.ctx.currentTime);
      bandpass.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      whiteNoise.connect(bandpass);
      bandpass.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);
      whiteNoise.start();
    } catch {
      // Audio element safety fallback
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!this.ctx && !muted) {
      this.initContext();
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.22, now, 0.05);
    }
  }

  public updateParameters(speed: number, pressure: number, isPaused: boolean) {
    if (!this.ctx || this.isMuted || !this.compressorOsc || !this.noiseGain || !this.compressorGain) return;
    const now = this.ctx.currentTime;
    if (isPaused) {
      this.compressorGain.gain.setTargetAtTime(0, now, 0.1);
      this.noiseGain.gain.setTargetAtTime(0, now, 0.1);
      return;
    }

    // Pitch rises with pressure (more mechanical load)
    const baseFreq = 50 + (pressure / 350) * 25 * speed;
    this.compressorOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
    this.compressorGain.gain.setTargetAtTime(0.08 * Math.min(speed, 1.5), now, 0.1);
    this.noiseGain.gain.setTargetAtTime((0.02 + (pressure / 350) * 0.04) * Math.min(speed, 1.5), now, 0.1);
  }

  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }

  public playCondenseDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }
}

export const audioEngine = new HaberAudioEngine();
