/**
 * Motor de Trilha Sonora Dinâmica para NECROVOLT
 *
 * Gera uma trilha sonora procedural completa no estilo Dark Synth / Horror Apocalíptico
 * utilizando síntese nativa com Web Audio API (baixo industrial, bateria, arpejos de tensão e pads).
 *
 * Suporta transição dinâmica entre modo 'menu' (sombrio, misterioso) e 'combat' (adrenalina pura de sobrevivência).
 */
export class MusicSystem {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentMode: 'menu' | 'combat' = 'menu';

  // Configurações rítmicas e de andamento
  private bpm: number = 126;
  private nextNoteTime: number = 0;
  private currentStep: number = 0;
  private timerId: number | null = null;

  // Ruído para bateria sintetizada (caixa e chimbal)
  private noiseBuffer: AudioBuffer | null = null;

  // Frequências das notas na escala Ré Menor (D Minor)
  // D1=36.7, D2=73.4, F2=87.3, G2=98.0, A2=110.0, Bb2=116.5, C3=130.8, D3=146.8
  private readonly NOTE_FREQS: Record<string, number> = {
    D1: 36.71,
    F1: 43.65,
    G1: 49.0,
    A1: 55.0,
    Bb1: 58.27,
    C2: 65.41,
    D2: 73.42,
    E2: 82.41,
    F2: 87.31,
    G2: 98.0,
    A2: 110.0,
    Bb2: 116.54,
    C3: 130.81,
    D3: 146.83,
    E3: 164.81,
    F3: 174.61,
    G3: 196.0,
    A3: 220.0,
    Bb3: 233.08,
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    A4: 440.0,
    D5: 587.33,
  };

  // Padrão de Baixo Dark Synth (4 compassos x 16 passos = 64 passos)
  private readonly BASS_PATTERN: (string | null)[] = [
    // Compasso 1: Dm
    'D2', null, 'D2', 'D2', 'F2', null, 'D2', null, 'D2', null, 'A2', null, 'D2', 'C3', 'D2', null,
    // Compasso 2: Dm com variação
    'D2', null, 'D2', null, 'G2', null, 'F2', null, 'D2', 'D2', 'D2', null, 'Bb2', null, 'A2', null,
    // Compasso 3: Bb (Subida dramática apocalíptica)
    'Bb1', null, 'Bb1', 'Bb1', 'D2', null, 'Bb1', null, 'F2', null, 'Bb1', null, 'Bb1', 'C2', 'D2', null,
    // Compasso 4: A (Tensão e resolução)
    'A1', null, 'A1', null, 'C2', null, 'A1', null, 'E2', null, 'A1', 'A1', 'G2', null, 'F2', 'E2',
  ];

  // Padrão de Arpejo Hipnótico de Suspense
  private readonly ARP_PATTERN: (string | null)[] = [
    'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'D4', 'A4', 'F4', 'A4', 'D5', 'F4', 'A4', 'D4', 'F4', 'A4',
    'D4', 'G4', 'Bb3', 'D5', 'Bb3', 'G4', 'D4', 'G4', 'Bb3', 'D4', 'G4', 'D5', 'Bb3', 'G4', 'D4', 'G4',
    'Bb3', 'D4', 'F4', 'Bb4', 'F4', 'D4', 'Bb3', 'D4', 'F4', 'Bb4', 'D4', 'F4', 'Bb4', 'F4', 'D4', 'Bb3',
    'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3', 'C4', 'E4', 'A4', 'C4', 'E4', 'A4', 'E4', 'C4', 'A3',
  ];

  constructor(ctx?: AudioContext, destination?: AudioNode) {
    if (ctx) {
      this.init(ctx, destination);
    }
  }

  public init(ctx: AudioContext, destination?: AudioNode): void {
    if (this.ctx) return;
    this.ctx = ctx;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.55, this.ctx.currentTime);

    if (destination) {
      this.musicGain.connect(destination);
    } else {
      this.musicGain.connect(this.ctx.destination);
    }

    // Gera buffer de ruído para chimbal e caixa
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 1.0;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Inicia a reprodução musical
   */
  public start(mode: 'menu' | 'combat' = 'menu'): void {
    this.currentMode = mode;
    if (this.isPlaying) return;
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.isPlaying = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    // Scheduler de alta precisão (Look-ahead a cada 25ms)
    this.timerId = window.setInterval(() => {
      this.scheduler();
    }, 25);
  }

  /**
   * Altera dinamicamente o tema entre Menu (sombrio/tensão) e Combate (ação/adrenalina)
   */
  public setMode(mode: 'menu' | 'combat'): void {
    this.currentMode = mode;
    if (mode === 'combat') {
      this.bpm = 128;
    } else {
      this.bpm = 112;
    }
  }

  /**
   * Para a música
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Ajusta o volume geral da música (0.0 a 1.0)
   */
  public setVolume(vol: number): void {
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(
        Math.max(0, Math.min(1, vol)),
        this.ctx.currentTime
      );
    }
  }

  // ==========================================
  // ⏱️ SCHEDULER DE ÁUDIO WEB PRECISO
  // ==========================================

  private scheduler(): void {
    if (!this.ctx || !this.isPlaying) return;

    const scheduleAheadTime = 0.12; // segundos
    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    // Cada passo é uma semicolcheia (1/16 de tempo = 0.25 beat)
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.currentStep = (this.currentStep + 1) % 64;
  }

  private scheduleStep(step: number, time: number): void {
    if (!this.ctx || !this.musicGain) return;

    const isCombat = this.currentMode === 'combat';

    // 1. BATERIA (Apenas em combate, ou sutil no menu)
    if (isCombat) {
      // Bumbo (Kick): Batidas 1, 5, 9, 13 (Four-on-the-floor pulsante de ação)
      if (step % 4 === 0) {
        this.playSynthKick(time);
      }

      // Caixa (Snare): Batidas 4 e 12 (contra-tempos marcantes nos tempos 2 e 4)
      if (step % 8 === 4) {
        this.playSynthSnare(time);
      }

      // Chimbal (Hi-Hat): Semicolcheias contínuas com acentuação
      if (step % 2 === 0) {
        const isAccent = step % 4 === 2;
        this.playSynthHiHat(time, isAccent ? 0.25 : 0.12);
      }
    } else {
      // Menu: apenas pulso sutil de bumbo e prato misterioso
      if (step % 8 === 0) {
        this.playSynthKick(time, 0.4);
      }
      if (step % 16 === 12) {
        this.playSynthHiHat(time, 0.08);
      }
    }

    // 2. LINHA DE BAIXO INDUSTRIAL (Dark Synth Bass)
    const bassNote = this.BASS_PATTERN[step];
    if (bassNote) {
      const freq = this.NOTE_FREQS[bassNote] || 73.4;
      const bassVol = isCombat ? 0.38 : 0.25;
      this.playSynthBass(time, freq, bassVol, isCombat);
    }

    // 3. ARPEJO ELETRÔNICO DE TENSÃO
    const arpNote = this.ARP_PATTERN[step];
    if (arpNote && (isCombat || step % 4 === 0)) {
      const freq = this.NOTE_FREQS[arpNote] || 293.6;
      const arpVol = isCombat ? 0.18 : 0.12;
      this.playSynthArp(time, freq, arpVol);
    }

    // 4. PAD SOTURNO NO INÍCIO DE CADA COMPASSO (A cada 16 passos)
    if (step % 16 === 0) {
      const barIndex = Math.floor(step / 16);
      const chordRoot = barIndex === 2 ? 'Bb3' : barIndex === 3 ? 'A3' : 'D3';
      const rootFreq = this.NOTE_FREQS[chordRoot] || 146.8;
      this.playSynthPad(time, rootFreq, 0.14);
    }
  }

  // ==========================================
  // 🎹 INSTRUMENTOS SINTETIZADOS
  // ==========================================

  private playSynthKick(time: number, gainMult: number = 1.0): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.09);

    gain.gain.setValueAtTime(0.7 * gainMult, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain!);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  private playSynthSnare(time: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;

    // Componente de ruído (estalo da esteira da caixa)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.Q.setValueAtTime(1.5, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    noise.start(time);
    noise.stop(time + 0.15);

    // Componente tonal do tambor
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);

    oscGain.gain.setValueAtTime(0.35, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.musicGain!);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private playSynthHiHat(time: number, vol: number): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.005, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  private playSynthBass(time: number, freq: number, vol: number, aggressive: boolean): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = aggressive ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Filtro envelope característico de Dark Synthwave
    filter.type = 'lowpass';
    const cutoff = aggressive ? 1600 : 800;
    filter.frequency.setValueAtTime(cutoff, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.14);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.16);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  private playSynthArp(time: number, freq: number, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.Q.setValueAtTime(2.5, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    osc.start(time);
    osc.stop(time + 0.09);
  }

  private playSynthPad(time: number, freq: number, vol: number): void {
    const ctx = this.ctx!;
    // Pad com leve desafinação (detune) para atmosfera encorpada
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.005, time); // Detune sutil

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, time);

    const dur = (60.0 / this.bpm) * 3.8; // Dura ~3.8 tempos
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.005, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.1);
    osc2.stop(time + dur + 0.1);
  }
}

