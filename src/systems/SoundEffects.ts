import type { WeaponId } from './EconomyCatalog';
import { MusicSystem } from './MusicSystem';

/**
 * Motor de Áudio Procedural para NECROVOLT
 * Gera efeitos sonoros realistas de armas, impactos, trilha sonora dinâmica e
 * atmosfera de terror apocalíptico utilizando a Web Audio API (100% nativo).
 */
export class SoundEffects {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;

  public music: MusicSystem = new MusicSystem();

  private noiseBuffer: AudioBuffer | null = null;
  private isAmbienceRunning: boolean = false;
  private muted: boolean = false;

  private masterVolume: number = 0.85;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.65;

  // Nós de áudio do gerador de terror atmosférico
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private heartbeatInterval: number | null = null;
  private stingerInterval: number | null = null;

  constructor() {
    const unlockAudio = () => {
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (!this.isAmbienceRunning) {
        this.startHorrorAmbience();
        this.startMusic('menu');
      }
    };

    // Desbloqueia e inicia a atmosfera nos primeiros gestos do jogador
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('mousedown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
  }

  /**
   * Garante a criação do AudioContext e dos canais de ganho Master, SFX e Ambiente.
   */
  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return null;

      this.ctx = new AudioCtxClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX Gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Ambience Gain
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);

      // Prepara buffer de ruído branco de alta fidelidade
      this.initNoiseBuffer();

      // Inicializa o motor de trilha sonora no masterGain
      this.music.init(this.ctx, this.masterGain);
      this.music.setVolume(this.musicVolume);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public startMusic(mode: 'menu' | 'combat' = 'menu'): void {
    const ctx = this.ensureContext();
    if (ctx && this.masterGain) {
      this.music.init(ctx, this.masterGain);
      this.music.start(mode);
    }
  }

  public setMusicMode(mode: 'menu' | 'combat'): void {
    this.music.setMode(mode);
  }

  public stopMusic(): void {
    this.music.stop();
  }

  /**
   * Cria um buffer contínuo de ruído estocástico para simular pólvora, vento e impactos.
   */
  private initNoiseBuffer(): void {
    if (!this.ctx || this.noiseBuffer) return;
    const duration = 2.0;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Ruído com leve suavização para calor analógico
      data[i] = Math.random() * 2 - 1;
    }
  }

  // ==========================================
  // ⚡ SISTEMA DE TIROS REALISTAS POR ARMA
  // ==========================================

  /**
   * Dispara o som característico de tiro correspondente à arma equipada,
   * combinando estalo mecânico, explosão de pólvora (ruído) e soco sub-grave.
   */
  public playGunshot(weaponId: WeaponId = 'pistol'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;

    switch (weaponId) {
      case 'shotgun':
        this.synthShotgun(now);
        break;
      case 'revolver':
        this.synthRevolver(now);
        break;
      case 'smg':
        this.synthSmg(now);
        break;
      case 'rifle':
        this.synthRifle(now);
        break;
      case 'plasma_rifle':
        this.synthPlasmaRifle(now);
        break;
      case 'sniper':
        this.synthSniper(now);
        break;
      case 'grenade_launcher':
        this.synthGrenadeLauncher(now);
        break;
      case 'pistol':
      default:
        this.synthPistol(now);
        break;
    }
  }

  /**
   * Pistola 9mm: Estalo seco, recuo rápido e soco médio.
   */
  private synthPistol(t: number): void {
    const ctx = this.ctx!;
    // 1. Explosão de pólvora (Ruído filtrado)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2800, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(350, t + 0.12);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.14);

    // 2. Punch subgrave de percussão
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.09);

    oscGain.gain.setValueAtTime(0.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  /**
   * Revólver Magnum .44: Detonação cavernosa, estalo metálico agudo e cauda explosiva.
   */
  private synthRevolver(t: number): void {
    const ctx = this.ctx!;
    // Explosão pesada
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3600, t);
    filter.frequency.exponentialRampToValueAtTime(220, t + 0.28);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.32);

    // Soco sub-grave devastador
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.18);

    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  /**
   * Espingarda Calibre 12: Dupla detonação de bagos de chumbo e estrondo abafado.
   */
  private synthShotgun(t: number): void {
    const ctx = this.ctx!;
    // Explosão massiva de bagos de chumbo
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.Q.setValueAtTime(1.2, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.35);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.4);

    // Estrondo concussivo que treme o chão
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(130, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.22);

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(180, t);

    subGain.gain.setValueAtTime(0.95, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    sub.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(t);
    sub.stop(t + 0.26);
  }

  /**
   * SMG Vector: Estalo rápido e ultra-seco, calibrado para rajadas contínuas sem embolar.
   */
  private synthSmg(t: number): void {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.09);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.05);

    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  /**
   * Rifle M4-S: Disparo militar nítido, choque supersônico e corpo potente.
   */
  private synthRifle(t: number): void {
    const ctx = this.ctx!;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.16);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.2);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.13);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  /**
   * Fuzil de Plasma: Zumbido de descarga elétrica ionizada e zigue-zague futurista.
   */
  private synthPlasmaRifle(t: number): void {
    const ctx = this.ctx!;
    // Descarga de laser/ion
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.16);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.2);

    // Ruído de arco elétrico
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.setValueAtTime(2400, t);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.13);
  }

  /**
   * Sniper .50: O trovoar mais violento do arsenal com eco sísmico.
   */
  private synthSniper(t: number): void {
    const ctx = this.ctx!;
    // Estalo inicial violento
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5500, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.55);

    // Choque sísmico grave
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(280, t);
    sub.frequency.exponentialRampToValueAtTime(20, t + 0.35);

    subGain.gain.setValueAtTime(1.0, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    sub.connect(subGain);
    subGain.connect(this.sfxGain!);
    sub.start(t);
    sub.stop(t + 0.42);
  }

  /**
   * Lança-Granadas M79: Disparo de mola pneumática profunda "THUMP-FOOSH".
   */
  private synthGrenadeLauncher(t: number): void {
    const ctx = this.ctx!;
    // Pancada pneumática
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.25);

    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.32);

    // Ejeção de gás pressurizado
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.28);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.32);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    noise.start(t);
    noise.stop(t + 0.35);
  }

  // ==========================================
  // 💀 AMBIÊNCIA DE TERROR APOCALÍPTICO PROCEDURAL
  // ==========================================

  /**
   * Inicia a paisagem sonora apocalíptica contínua:
   * - Zumbido grave dissonante subterrâneo (Drones em 43Hz e 46Hz)
   * - Vento gélido da quarentena varrendo ruínas (Ruído estocástico oscilante)
   * - Batimentos cardíacos soturnos de fundo (Tensão psicológica)
   * - Gemidos e rangidos metálicos ocasionais no setor
   */
  public startHorrorAmbience(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain || this.isAmbienceRunning) return;

    this.isAmbienceRunning = true;
    const now = ctx.currentTime;

    // 1. Drones graves e dissonantes (Sub-bass sombrio de apocalipse)
    this.droneOsc1 = ctx.createOscillator();
    this.droneOsc2 = ctx.createOscillator();

    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(43, now); // Frequência fúnebre

    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(46.5, now); // Batimento binaural sutil e desconfortável

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(85, now);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.22, now);

    this.droneOsc1.connect(droneFilter);
    this.droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.ambienceGain);

    this.droneOsc1.start(now);
    this.droneOsc2.start(now);

    // 2. Vento apocalíptico das ruínas (Ruído branco com filtro passa-banda modulado por LFO)
    if (this.noiseBuffer) {
      this.windSource = ctx.createBufferSource();
      this.windSource.buffer = this.noiseBuffer;
      this.windSource.loop = true;

      this.windFilter = ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(450, now);
      this.windFilter.Q.setValueAtTime(3.0, now);

      // LFO para fazer o vento uivar lentamente
      this.windLfo = ctx.createOscillator();
      this.windLfo.type = 'sine';
      this.windLfo.frequency.setValueAtTime(0.18, now); // Ciclo lento de vento (5.5s)

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(220, now);

      this.windLfo.connect(lfoGain);
      lfoGain.connect(this.windFilter.frequency);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.18, now);

      this.windSource.connect(this.windFilter);
      this.windFilter.connect(windGain);
      windGain.connect(this.ambienceGain);

      this.windSource.start(now);
      this.windLfo.start(now);
    }

    // 3. Batimento cardíaco lento e pesado da quarentena (a cada 1.1s)
    this.heartbeatInterval = window.setInterval(() => {
      this.playHeartbeatThump();
    }, 1150);

    // 4. Ecos ocasionais de terror (rangido metálico ou gemido distante a cada 18s)
    this.stingerInterval = window.setInterval(() => {
      this.playHorrorStinger();
    }, 19000);
  }

  /**
   * Pulso cardíaco apocalíptico (simula adrenalina e respiração pesada do sobrevivente)
   */
  private playHeartbeatThump(): void {
    if (!this.ctx || !this.ambienceGain || !this.isAmbienceRunning || this.muted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(58, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ambienceGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Efeito sonoro pontual de susto/terror no ambiente (eco metálico ou acorde dissonante)
   */
  private playHorrorStinger(): void {
    if (!this.ctx || !this.ambienceGain || !this.isAmbienceRunning || this.muted) return;
    const t = this.ctx.currentTime;

    // Acorde dissonante de suspense (trítono fúnebre D - G#)
    const notes = [146.83, 207.65]; // D3 e G#3
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.8 + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambienceGain!);

      osc.start(t);
      osc.stop(t + 3.0);
    });
  }

  /**
   * Para os sons da ambiência de terror
   */
  public stopHorrorAmbience(): void {
    this.isAmbienceRunning = false;

    if (this.droneOsc1) {
      try {
        this.droneOsc1.stop();
        this.droneOsc1.disconnect();
      } catch {}
      this.droneOsc1 = null;
    }
    if (this.droneOsc2) {
      try {
        this.droneOsc2.stop();
        this.droneOsc2.disconnect();
      } catch {}
      this.droneOsc2 = null;
    }
    if (this.windSource) {
      try {
        this.windSource.stop();
        this.windSource.disconnect();
      } catch {}
      this.windSource = null;
    }
    if (this.windLfo) {
      try {
        this.windLfo.stop();
        this.windLfo.disconnect();
      } catch {}
      this.windLfo = null;
    }
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.stingerInterval !== null) {
      clearInterval(this.stingerInterval);
      this.stingerInterval = null;
    }
  }

  // ==========================================
  // 🧟 EFEITOS DE ZUMBIS, IMPACTO E JOGADOR
  // ==========================================

  /**
   * Rosnado gutural visceral de zumbi faminto
   */
  public playZombieGrowl(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.28);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(260, t);
    filter.Q.setValueAtTime(2.2, t);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.32);
  }

  /**
   * Impacto de projétil contra carne de zumbi (impacto pesado)
   */
  public playHitSound(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Zumbi eliminado com colapso sonoro
   */
  public playZombieDeath(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.2);
  }

  /**
   * Dano sofrido pelo jogador (gemido de dor sob impacto)
   */
  public playPlayerHurt(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Clique de arma descarregada
   */
  public playEmptyClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(950, t);

    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  /**
   * Barulho mecânico tático de recarga (ejeção e encaixe de pente)
   */
  public playReload(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Ejeção do pente vazio
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(310, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.09);

    // Encaixe do pente novo e ferrolho
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.frequency.setValueAtTime(540, now + 0.55);
    gain2.gain.setValueAtTime(0.38, now + 0.55);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now + 0.55);
    osc2.stop(now + 0.7);
  }

  /**
   * Coleta de itens de sobrevivência (munição, kits médicos)
   */
  public playPickup(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(960, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Latido do cão companheiro tático (K9 preto)
   */
  public playDogBark(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.14);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);

    // Filtro passa-baixa para timbre canino encorpado
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Mordida agressiva do cão nos zumbis
   */
  public playDogBite(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.muted) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.1);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // ==========================================
  // 🔊 CONTROLES DE ÁUDIO E VOLUME
  // ==========================================

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setSfxVolume(val: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMusicVolume(val: number): void {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.music.setVolume(this.musicVolume);
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Explosão de mina terrestre ou barril combustível
   */
  public playExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.65);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.7);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.75);

    // Impacto sub-grave
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.55);
    subGain.gain.setValueAtTime(0.85, t);
    subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.58);
  }

  /**
   * Bip tático de armamento de mina de proximidade
   */
  public playMineBeep(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1900, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Descarga elétrica sob contato (arco voltaico)
   */
  public playElectricShock(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.linearRampToValueAtTime(100, t + 0.18);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, t);
    filter.Q.setValueAtTime(3, t);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Chiado corrosivo de ácido / lodo tóxico
   */
  public playAcidSizzle(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.setValueAtTime(4.5, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.26);
  }
}
