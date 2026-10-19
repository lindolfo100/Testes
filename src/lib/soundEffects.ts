// Web Audio API Sound Synthesizer for Classroom Presentations
// Zero external assets or network dependencies - guaranteed instant audio in any browser

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;

  constructor() {
    try {
      const storedMute = localStorage.getItem('valendo_sound_muted');
      if (storedMute !== null) {
        this.isMuted = storedMute === 'true';
      }
      const storedVol = localStorage.getItem('valendo_sound_volume');
      if (storedVol !== null) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(storedVol) || 0.7));
      }
    } catch {
      // localStorage may fail in restricted iframes
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('valendo_sound_muted', String(muted));
    } catch {}
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playTick(); // subtle feedback
    }
    return this.isMuted;
  }

  // 1. Clock countdown tick (subtle, clean, non-intrusive)
  public playTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.masterVolume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  // 2. Urgent warning beep for final 5 seconds
  public playUrgentTick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.07);

    gain.gain.setValueAtTime(this.masterVolume * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  }

  // 3. Question reveal chime (harmonic chord reveal)
  public playReveal() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

      const startTime = ctx.currentTime + i * 0.07;
      const duration = 0.45;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.28, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  // 4. Podium fanfare arpeggio
  public playFanfare() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Fanfare melodic sequence: G4, C5, E5, G5, long C6 chord
    const sequence = [
      { freq: 392.0, time: 0, dur: 0.14 },
      { freq: 523.25, time: 0.15, dur: 0.14 },
      { freq: 659.25, time: 0.3, dur: 0.14 },
      { freq: 783.99, time: 0.45, dur: 0.28 },
      { freq: 1046.5, time: 0.75, dur: 0.9 },
    ];

    sequence.forEach((item) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(item.freq, ctx.currentTime + item.time);

      const st = ctx.currentTime + item.time;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.38, st + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + item.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + item.dur);
    });

    // Sub harmonic chord on final resolution
    const chordFrequencies = [523.25, 659.25, 783.99];
    chordFrequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + 0.75);

      const st = ctx.currentTime + 0.75;
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, st + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 1.2);
    });
  }

  // 5. Positive feedback sound
  public playCorrect() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const freqs = [587.33, 880]; // D5, A5
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      const st = ctx.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(this.masterVolume * 0.3, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(st);
      osc.stop(st + 0.22);
    });
  }

  // 6. Gentle incorrect / missed sound
  public playIncorrect() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(146.83, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(this.masterVolume * 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }
}

export const soundEffects = new SoundManager();
