export type ZombieType = 'walker' | 'runner' | 'brute' | 'exploder' | 'boss';

export interface StageConfig {
  stageNumber: number;
  name: string;
  targetKills: number;
  maxActiveZombies: number;
  spawnInterval: number; // segundos entre checagens de spawn
  spawnChances: {
    walker: number;
    runner: number;
    brute: number;
    exploder: number;
  };
  hasBoss: boolean;
  bossName?: string;
  rewards: {
    xp: number;
    coins: number;
  };
}

export const STAGES_CONFIG: StageConfig[] = [
  // TIER 1: O Início do Surto (Fases 1 a 4) - Leve, suave e balanceado
  {
    stageNumber: 1,
    name: 'Setor 01: Cruzamento Central da Cidade',
    targetKills: 10,
    maxActiveZombies: 6,
    spawnInterval: 1.4,
    spawnChances: { walker: 0.90, runner: 0.10, brute: 0.00, exploder: 0.00 },
    hasBoss: false,
    rewards: { xp: 180, coins: 80 },
  },
  {
    stageNumber: 2,
    name: 'Setor 02: Distrito Comercial Saqueado',
    targetKills: 16,
    maxActiveZombies: 8,
    spawnInterval: 1.3,
    spawnChances: { walker: 0.75, runner: 0.20, brute: 0.05, exploder: 0.00 },
    hasBoss: false,
    rewards: { xp: 260, coins: 120 },
  },
  {
    stageNumber: 3,
    name: 'Setor 03: Bloqueio Policial Abandonado',
    targetKills: 22,
    maxActiveZombies: 9,
    spawnInterval: 1.2,
    spawnChances: { walker: 0.65, runner: 0.25, brute: 0.10, exploder: 0.00 },
    hasBoss: false,
    rewards: { xp: 340, coins: 160 },
  },
  {
    stageNumber: 4,
    name: 'Setor 04: Pátio de Carga Suburbano',
    targetKills: 28,
    maxActiveZombies: 11,
    spawnInterval: 1.15,
    spawnChances: { walker: 0.55, runner: 0.30, brute: 0.10, exploder: 0.05 },
    hasBoss: false,
    rewards: { xp: 420, coins: 200 },
  },

  // TIER 2: A Contaminação se Espalha (Fases 5 a 8)
  {
    stageNumber: 5,
    name: 'Setor 05: Covil do Primeiro Titã Mutante',
    targetKills: 35,
    maxActiveZombies: 12,
    spawnInterval: 1.1,
    spawnChances: { walker: 0.45, runner: 0.35, brute: 0.12, exploder: 0.08 },
    hasBoss: true,
    bossName: 'Goliath Mutante Jovem',
    rewards: { xp: 600, coins: 300 },
  },
  {
    stageNumber: 6,
    name: 'Setor 06: Distrito Industrial Quarentenado',
    targetKills: 40,
    maxActiveZombies: 13,
    spawnInterval: 1.05,
    spawnChances: { walker: 0.40, runner: 0.35, brute: 0.15, exploder: 0.10 },
    hasBoss: false,
    rewards: { xp: 520, coins: 260 },
  },
  {
    stageNumber: 7,
    name: 'Setor 07: Refinaria de Gás em Chamas',
    targetKills: 46,
    maxActiveZombies: 14,
    spawnInterval: 1.0,
    spawnChances: { walker: 0.35, runner: 0.35, brute: 0.15, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 600, coins: 300 },
  },
  {
    stageNumber: 8,
    name: 'Setor 08: Ponte de Evacuação Bloqueada',
    targetKills: 52,
    maxActiveZombies: 15,
    spawnInterval: 0.95,
    spawnChances: { walker: 0.30, runner: 0.40, brute: 0.15, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 680, coins: 350 },
  },

  // TIER 3: Zona Tóxica e Hordas Vorazes (Fases 9 a 12)
  {
    stageNumber: 9,
    name: 'Setor 09: Subúrbio Químico Tóxico',
    targetKills: 58,
    maxActiveZombies: 16,
    spawnInterval: 0.9,
    spawnChances: { walker: 0.25, runner: 0.40, brute: 0.18, exploder: 0.16 },
    hasBoss: false,
    rewards: { xp: 760, coins: 400 },
  },
  {
    stageNumber: 10,
    name: 'Setor 10: O Colosso da Usina Química',
    targetKills: 65,
    maxActiveZombies: 17,
    spawnInterval: 0.85,
    spawnChances: { walker: 0.20, runner: 0.40, brute: 0.20, exploder: 0.20 },
    hasBoss: true,
    bossName: 'Abominação Ácida Alpha',
    rewards: { xp: 1000, coins: 500 },
  },
  {
    stageNumber: 11,
    name: 'Setor 11: Túnel Ferroviário dos Condenados',
    targetKills: 70,
    maxActiveZombies: 18,
    spawnInterval: 0.82,
    spawnChances: { walker: 0.20, runner: 0.45, brute: 0.20, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 900, coins: 460 },
  },
  {
    stageNumber: 12,
    name: 'Setor 12: Cemitério de Carros em Chamas',
    targetKills: 76,
    maxActiveZombies: 19,
    spawnInterval: 0.8,
    spawnChances: { walker: 0.18, runner: 0.45, brute: 0.22, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1000, coins: 520 },
  },

  // TIER 4: Território Vermelho da Morte (Fases 13 a 16)
  {
    stageNumber: 13,
    name: 'Setor 13: Avenida Vermelha dos Condenados',
    targetKills: 82,
    maxActiveZombies: 20,
    spawnInterval: 0.78,
    spawnChances: { walker: 0.15, runner: 0.45, brute: 0.23, exploder: 0.17 },
    hasBoss: false,
    rewards: { xp: 1100, coins: 580 },
  },
  {
    stageNumber: 14,
    name: 'Setor 14: Hospital Militar em Ruínas',
    targetKills: 88,
    maxActiveZombies: 21,
    spawnInterval: 0.75,
    spawnChances: { walker: 0.15, runner: 0.48, brute: 0.22, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1200, coins: 640 },
  },
  {
    stageNumber: 15,
    name: 'Setor 15: O Berçário das Feras Sangrentas',
    targetKills: 95,
    maxActiveZombies: 22,
    spawnInterval: 0.72,
    spawnChances: { walker: 0.12, runner: 0.48, brute: 0.25, exploder: 0.15 },
    hasBoss: true,
    bossName: 'Carniceiro de Ossos Titânico',
    rewards: { xp: 1500, coins: 800 },
  },
  {
    stageNumber: 16,
    name: 'Setor 16: Anel Viário da Catástrofe',
    targetKills: 100,
    maxActiveZombies: 23,
    spawnInterval: 0.7,
    spawnChances: { walker: 0.10, runner: 0.50, brute: 0.25, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1400, coins: 750 },
  },

  // TIER 5: O Apocalipse Supremo (Fases 17 a 20)
  {
    stageNumber: 17,
    name: 'Setor 17: Trincheiras de Radiação Crítica',
    targetKills: 110,
    maxActiveZombies: 24,
    spawnInterval: 0.68,
    spawnChances: { walker: 0.10, runner: 0.50, brute: 0.25, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1550, coins: 820 },
  },
  {
    stageNumber: 18,
    name: 'Setor 18: Fortaleza de Quarentena em Colapso',
    targetKills: 120,
    maxActiveZombies: 25,
    spawnInterval: 0.65,
    spawnChances: { walker: 0.08, runner: 0.52, brute: 0.25, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1700, coins: 900 },
  },
  {
    stageNumber: 19,
    name: 'Setor 19: Epicentro do Horror Biológico',
    targetKills: 130,
    maxActiveZombies: 26,
    spawnInterval: 0.62,
    spawnChances: { walker: 0.05, runner: 0.55, brute: 0.25, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 1900, coins: 1000 },
  },
  {
    stageNumber: 20,
    name: 'Setor 20: O Trono do Colosso Necrótico',
    targetKills: 150,
    maxActiveZombies: 28,
    spawnInterval: 0.58,
    spawnChances: { walker: 0.05, runner: 0.50, brute: 0.28, exploder: 0.17 },
    hasBoss: true,
    bossName: 'Necrovolt Colossus Prime',
    rewards: { xp: 3000, coins: 2000 },
  },

  // TIER 6: Complexo Nuclear Radioativo (Fases 21 a 24)
  {
    stageNumber: 21,
    name: 'Setor 21: Usina Termonuclear Abandonada',
    targetKills: 160,
    maxActiveZombies: 28,
    spawnInterval: 0.56,
    spawnChances: { walker: 0.05, runner: 0.50, brute: 0.28, exploder: 0.17 },
    hasBoss: false,
    rewards: { xp: 3200, coins: 2100 },
  },
  {
    stageNumber: 22,
    name: 'Setor 22: Laboratório Secreto Subterrâneo',
    targetKills: 175,
    maxActiveZombies: 29,
    spawnInterval: 0.54,
    spawnChances: { walker: 0.04, runner: 0.50, brute: 0.30, exploder: 0.16 },
    hasBoss: false,
    rewards: { xp: 3450, coins: 2250 },
  },
  {
    stageNumber: 23,
    name: 'Setor 23: Dutos de Refrigeração Contaminados',
    targetKills: 190,
    maxActiveZombies: 30,
    spawnInterval: 0.52,
    spawnChances: { walker: 0.04, runner: 0.52, brute: 0.28, exploder: 0.16 },
    hasBoss: false,
    rewards: { xp: 3700, coins: 2400 },
  },
  {
    stageNumber: 24,
    name: 'Setor 24: O Behemoth de Radiação Gama',
    targetKills: 210,
    maxActiveZombies: 32,
    spawnInterval: 0.50,
    spawnChances: { walker: 0.03, runner: 0.52, brute: 0.30, exploder: 0.15 },
    hasBoss: true,
    bossName: 'Giga-Titã Radioativo Alpha',
    rewards: { xp: 4500, coins: 3000 },
  },

  // TIER 7: Pesadelo Bio-Cibernético (Fases 25 a 28)
  {
    stageNumber: 25,
    name: 'Setor 25: Pântano Negro de Resíduos Químicos',
    targetKills: 225,
    maxActiveZombies: 33,
    spawnInterval: 0.48,
    spawnChances: { walker: 0.03, runner: 0.53, brute: 0.29, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 4800, coins: 3200 },
  },
  {
    stageNumber: 26,
    name: 'Setor 26: Pátio de Contêineres Sinistros',
    targetKills: 240,
    maxActiveZombies: 34,
    spawnInterval: 0.46,
    spawnChances: { walker: 0.02, runner: 0.54, brute: 0.29, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 5200, coins: 3450 },
  },
  {
    stageNumber: 27,
    name: 'Setor 27: Ruínas da Catedral Gótica em Chamas',
    targetKills: 260,
    maxActiveZombies: 35,
    spawnInterval: 0.44,
    spawnChances: { walker: 0.02, runner: 0.55, brute: 0.28, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 5600, coins: 3700 },
  },
  {
    stageNumber: 28,
    name: 'Setor 28: A Quimera de Duas Cabeças',
    targetKills: 280,
    maxActiveZombies: 36,
    spawnInterval: 0.42,
    spawnChances: { walker: 0.02, runner: 0.55, brute: 0.28, exploder: 0.15 },
    hasBoss: true,
    bossName: 'Quimera Cibernética Carmesim',
    rewards: { xp: 6500, coins: 4500 },
  },

  // TIER 8: Extinção Planetária & O Protocolo Zero (Fases 29 a 32)
  {
    stageNumber: 29,
    name: 'Setor 29: Silo de Mísseis Desativado',
    targetKills: 300,
    maxActiveZombies: 37,
    spawnInterval: 0.40,
    spawnChances: { walker: 0.02, runner: 0.55, brute: 0.28, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 7000, coins: 4800 },
  },
  {
    stageNumber: 30,
    name: 'Setor 30: Base Militar Subpolar em Colapso',
    targetKills: 320,
    maxActiveZombies: 38,
    spawnInterval: 0.38,
    spawnChances: { walker: 0.01, runner: 0.56, brute: 0.28, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 7500, coins: 5200 },
  },
  {
    stageNumber: 31,
    name: 'Setor 31: Crateras do Impacto Bio-Nuclear',
    targetKills: 350,
    maxActiveZombies: 39,
    spawnInterval: 0.36,
    spawnChances: { walker: 0.01, runner: 0.57, brute: 0.27, exploder: 0.15 },
    hasBoss: false,
    rewards: { xp: 8200, coins: 5800 },
  },
  {
    stageNumber: 32,
    name: 'Setor 32: O Deus Necrótico do Fim dos Tempos',
    targetKills: 400,
    maxActiveZombies: 40,
    spawnInterval: 0.34,
    spawnChances: { walker: 0.01, runner: 0.55, brute: 0.28, exploder: 0.16 },
    hasBoss: true,
    bossName: 'Soberano Necrovolt Omega (Chefe Supremo)',
    rewards: { xp: 12000, coins: 10000 },
  },
];

export const GAME_CONFIG = {
  player: {
    baseSpeed: 7.2,
    maxHp: 100,
    radius: 0.55,
    iFrameDuration: 1.0,
  },
  weapon: {
    name: 'Pistola Tática 9mm',
    damage: 48,
    fireRate: 0.22,
    magSize: 14,
    reloadTime: 1.1,
    maxRange: 38,
    bulletSpeed: 60,
  },
  camera: {
    offset: { x: 0, y: 24.5, z: 18.0 },
    lookAtOffsetY: 0.5,
  },
  arena: {
    size: 200,
    bounds: 88,
  },
  lighting: {
    ambientColor: 0x334155, // Luz ambiente bem mais clara e nítida
    ambientIntensity: 1.45,
    directionalColor: 0xa5b4fc, // Luz do luar prateada/azulada com excelente contraste
    directionalIntensity: 1.55,
    toxicLightColor: 0x22c55e,
    neonRedColor: 0xef4444,
    shadowMapSize: 1024,
  },
  zombieTypes: {
    walker: {
      hp: 35,
      speed: 3.4, // Zumbi comum com passo mais lento e constante
      damage: 14,
      scale: 1.0,
      xpValue: 10,
    },
    runner: {
      hp: 25,
      speed: 5.2, // Runner veloz mas balanceado e justo
      damage: 12,
      scale: 0.85,
      xpValue: 15,
    },
    brute: {
      hp: 130,
      speed: 2.6, // Brute tanque lento e pesado
      damage: 32,
      scale: 1.45,
      xpValue: 30,
    },
    exploder: {
      hp: 45,
      speed: 3.8, // Exploder moderado dando tempo para abater
      damage: 50,
      explosionRadius: 5.0,
      scale: 1.1,
      xpValue: 25,
    },
    boss: {
      hp: 550,
      speed: 3.0, // Chefe colossal com marcha lenta e ameaçadora
      damage: 42,
      scale: 2.3,
      smashRadius: 6.5,
      xpValue: 250,
    },
  },
  colors: {
    asphalt: 0x1b1f24,
    roadMarkings: 0xd1d5db,
    curb: 0x2e353d,
    sidewalk: 0x252a32,
    buildingWall: 0x181c22,
    buildingRoof: 0x101317,
    wreckCarBody: 0x4a1d24,
    wreckCarRust: 0x3a2018,
    debris: 0x3f3f46,
    vegetation: 0x1c3829,
    vegetationDark: 0x13271d,
    toxicGreen: 0x39ff14,
    toxicGreenDim: 0x15803d,
    barrierMetal: 0x475569,
  },
};
