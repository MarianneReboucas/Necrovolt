export type WeaponId =
  | 'pistol'
  | 'shotgun'
  | 'smg'
  | 'rifle'
  | 'revolver'
  | 'plasma_rifle'
  | 'sniper'
  | 'grenade_launcher';
export type UpgradeId = 'upg_damage' | 'upg_reload' | 'upg_ammo' | 'upg_speed';

export type SkinId =
  | 'skin_urban'
  | 'skin_scientist'
  | 'skin_tracker'
  | 'skin_mechanic'
  | 'skin_scavenger'
  | 'skin_containment';

export type AchievementId =
  | 'ach_first_blood'
  | 'ach_kill_100'
  | 'ach_stage_5'
  | 'ach_boss_slayer'
  | 'ach_flawless';

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  category: 'weapon';
  icon: string;
  price: number;
  reqLevel: number;
  damage: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  spread: number;
  pellets: number;
  range: number;
  bulletSpeed: number;
  bulletColor?: number;
  bulletScale?: number;
  desc: string;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  category: 'upgrade';
  icon: string;
  basePrice: number;
  priceMultiplier: number;
  maxLevel: number;
  reqLevel: number;
  bonusPerLevel: number;
  unit: string;
  desc: string;
}

export type SkinUnlockType = 'free' | 'coins' | 'achievement';

export interface SkinDefinition {
  id: SkinId;
  name: string;
  category: 'cosmetic';
  icon: string;
  unlockType: SkinUnlockType;
  price: number;
  reqLevel: number;
  reqAchievement?: AchievementId;
  reqDescription?: string;
  // Propriedades visuais do modelo 3D
  jacketColor: number;
  pantsColor: number;
  backpackColor: number;
  hatColor: number;
  accessoryType: 'goggles' | 'gasmask' | 'welding_mask' | 'scav_hood' | 'helmet' | 'visor';
  desc: string;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  icon: string;
  desc: string;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  unlockSkinId?: SkinId;
}

export const WEAPONS_CATALOG: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: 'pistol',
    name: 'Pistola Tática 9mm',
    category: 'weapon',
    icon: '🔫',
    price: 0,
    reqLevel: 1,
    damage: 55,
    fireRate: 0.20,
    magSize: 16,
    reloadTime: 0.85,
    spread: 0.02,
    pellets: 1,
    range: 40,
    bulletSpeed: 70,
    bulletColor: 0xfef08a,
    bulletScale: 1.1,
    desc: 'Pistola semiautomática militar leve. Recarregamento ultrarrápido e precisão impecável para tiros na cabeça.',
  },
  revolver: {
    id: 'revolver',
    name: 'Revólver Magnum .44 Brutal',
    category: 'weapon',
    icon: '🤠',
    price: 650,
    reqLevel: 3,
    damage: 175,
    fireRate: 0.40,
    magSize: 6,
    reloadTime: 1.25,
    spread: 0.012,
    pellets: 1,
    range: 48,
    bulletSpeed: 85,
    bulletColor: 0xf97316,
    bulletScale: 1.6,
    desc: 'Canhão de mão calibre .44. Projéteis ogivais maciços com impacto devastador capaz de abater zumbis com 1 tiro.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Espingarda Calibre 12 Heavy',
    category: 'weapon',
    icon: '💥',
    price: 980,
    reqLevel: 5,
    damage: 45,
    fireRate: 0.58,
    magSize: 8,
    reloadTime: 1.6,
    spread: 0.16,
    pellets: 7,
    range: 28,
    bulletSpeed: 60,
    bulletColor: 0xfde047,
    bulletScale: 1.2,
    desc: 'Escopeta tática de choque. Dispara 7 bagos perfurantes (315 de dano total) que pulverizam hordas à queima-roupa.',
  },
  smg: {
    id: 'smg',
    name: 'Submetralhadora Vector Hyper',
    category: 'weapon',
    icon: '⚡',
    price: 1550,
    reqLevel: 7,
    damage: 38,
    fireRate: 0.065,
    magSize: 42,
    reloadTime: 1.1,
    spread: 0.08,
    pellets: 1,
    range: 34,
    bulletSpeed: 80,
    bulletColor: 0x38bdf8,
    bulletScale: 1.0,
    desc: 'Cadência supersônica (15 tiros/segundo). Varre multidões de infectados e corredores com saraivada contínua.',
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle de Assalto M4-S Devastator',
    category: 'weapon',
    icon: '🎯',
    price: 2400,
    reqLevel: 9,
    damage: 115,
    fireRate: 0.12,
    magSize: 35,
    reloadTime: 1.35,
    spread: 0.018,
    pellets: 1,
    range: 58,
    bulletSpeed: 90,
    bulletColor: 0x22c55e,
    bulletScale: 1.3,
    desc: 'Armamento de infantaria pesada. Precisão milimétrica a longa distância, estabilidade e alto DPS contra chefes.',
  },
  plasma_rifle: {
    id: 'plasma_rifle',
    name: 'Fuzil de Plasma NecroVolt',
    category: 'weapon',
    icon: '🔋',
    price: 3600,
    reqLevel: 12,
    damage: 150,
    fireRate: 0.15,
    magSize: 30,
    reloadTime: 1.2,
    spread: 0.015,
    pellets: 1,
    range: 54,
    bulletSpeed: 80,
    bulletColor: 0xa855f7,
    bulletScale: 1.8,
    desc: 'Tecnologia experimental bioelétrica. Dispara esferas ionizadas de plasma elétrico de alto impacto biológico.',
  },
  sniper: {
    id: 'sniper',
    name: 'Rifle Sniper Antimutante .50',
    category: 'weapon',
    icon: '🔭',
    price: 5200,
    reqLevel: 15,
    damage: 450,
    fireRate: 0.95,
    magSize: 6,
    reloadTime: 1.7,
    spread: 0.003,
    pellets: 1,
    range: 90,
    bulletSpeed: 120,
    bulletColor: 0xef4444,
    bulletScale: 2.2,
    desc: 'Calibre .50 BMG de velocidade hipersônica. Projétil perfurante que atravessa mutantes colossais de ponta a ponta.',
  },
  grenade_launcher: {
    id: 'grenade_launcher',
    name: 'Lança-Granadas Tático M79',
    category: 'weapon',
    icon: '💣',
    price: 7500,
    reqLevel: 18,
    damage: 135,
    fireRate: 0.85,
    magSize: 5,
    reloadTime: 1.8,
    spread: 0.28,
    pellets: 5,
    range: 40,
    bulletSpeed: 55,
    bulletColor: 0xf97316,
    bulletScale: 2.6,
    desc: 'Canhão pesado de fragmentação 40mm. Lança salva de 5 ogivas com catastrófico raio de aniquilação em área.',
  },
};

export const UPGRADES_CATALOG: Record<UpgradeId, UpgradeDefinition> = {
  upg_damage: {
    id: 'upg_damage',
    name: 'Munição Ponta Oca',
    category: 'upgrade',
    icon: '💥',
    basePrice: 150,
    priceMultiplier: 1.6,
    maxLevel: 5,
    reqLevel: 1,
    bonusPerLevel: 0.20, // Aumentado de +10% para +20% por nível (até +100% de dano total!)
    unit: '%',
    desc: '+20% de dano base permanente para todas as armas a cada nível.',
  },
  upg_reload: {
    id: 'upg_reload',
    name: 'Mecanismo de Saque Rápido',
    category: 'upgrade',
    icon: '🔄',
    basePrice: 120,
    priceMultiplier: 1.5,
    maxLevel: 5,
    reqLevel: 2,
    bonusPerLevel: 0.12, // Aumentado de 8% para 12% por nível
    unit: '%',
    desc: 'Reduz o tempo de recarga em 12% por nível.',
  },
  upg_ammo: {
    id: 'upg_ammo',
    name: 'Carregadores Estendidos',
    category: 'upgrade',
    icon: '📦',
    basePrice: 200,
    priceMultiplier: 1.7,
    maxLevel: 4,
    reqLevel: 2,
    bonusPerLevel: 0.25, // Aumentado de 15% para 25% por nível
    unit: '%',
    desc: 'Aumenta a capacidade de munição de todos os pentes em +25%.',
  },
  upg_speed: {
    id: 'upg_speed',
    name: 'Botas Táticas Leves',
    category: 'upgrade',
    icon: '👟',
    basePrice: 140,
    priceMultiplier: 1.5,
    maxLevel: 5,
    reqLevel: 1,
    bonusPerLevel: 0.10, // Aumentado de 6% para 10% por nível
    unit: '%',
    desc: '+10% de velocidade de movimento contínua do sobrevivente.',
  },
};

// 6 SKINS COM IDENTIDADES VISUAIS FORTES E TOTALMENTE DIFERENCIADAS
export const SKINS_CATALOG: Record<SkinId, SkinDefinition> = {
  skin_urban: {
    id: 'skin_urban',
    name: 'Operador Tático Bio-Escudo',
    category: 'cosmetic',
    icon: '🛡️',
    unlockType: 'free',
    price: 0,
    reqLevel: 1,
    jacketColor: 0x181f18, // Traje tático de combate oliva escuro
    pantsColor: 0x181c19,  // Calça tática preta
    backpackColor: 0x1a241b, // Mochila militar compacta
    hatColor: 0x1b231c,    // Chapéu boonie tático escuro
    accessoryType: 'goggles',
    desc: 'Operador com chapéu tático, óculos neon verde e escudo de energia biológica.',
  },
  skin_scientist: {
    id: 'skin_scientist',
    name: 'Cientista Contaminado',
    category: 'cosmetic',
    icon: '🥼',
    unlockType: 'coins',
    price: 450,
    reqLevel: 2,
    jacketColor: 0xf1f5f9, // Jaleco de laboratório branco puro
    pantsColor: 0x334155,  // Calça cinza-chumbo
    backpackColor: 0x0284c7, // Mochila com tanque pressurizado
    hatColor: 0x475569,    // Máscara respiratória completa
    accessoryType: 'gasmask',
    desc: 'Jaleco cirúrgico ensanguentado com máscara de gás NBC e filtros respiratórios duplos.',
  },
  skin_tracker: {
    id: 'skin_tracker',
    name: 'Explorador Noturno',
    category: 'cosmetic',
    icon: '🔦',
    unlockType: 'coins',
    price: 600,
    reqLevel: 3,
    jacketColor: 0x090d16, // Traje stealth preto absoluto / camuflagem escura
    pantsColor: 0x020617,  // Calça ninja/infiltração preta
    backpackColor: 0x1e1b4b, // Mochila compacta de ataque
    hatColor: 0x090d16,    // Balaclava / capuz noturno
    accessoryType: 'visor',
    desc: 'Uniforme de operações especiais blackout com visor holográfico de visão noturna ciano brilhante.',
  },
  skin_mechanic: {
    id: 'skin_mechanic',
    name: 'Mecânico da Sucata',
    category: 'cosmetic',
    icon: '🔧',
    unlockType: 'coins',
    price: 750,
    reqLevel: 3,
    jacketColor: 0xc2410c, // Macacão industrial laranja mecânico
    pantsColor: 0x7c2d12,  // Calça pesada com reforço de couro
    backpackColor: 0x78350f, // Bolsa de ferramentas pesada
    hatColor: 0x451a03,    // Máscara de solda metálica
    accessoryType: 'welding_mask',
    desc: 'Macacão operário de alta visibilidade reforçado com armadura de sucata e máscara de solda.',
  },
  skin_scavenger: {
    id: 'skin_scavenger',
    name: 'Saqueador das Ruínas',
    category: 'cosmetic',
    icon: '🎒',
    unlockType: 'achievement',
    price: 0,
    reqLevel: 1,
    reqAchievement: 'ach_kill_100',
    reqDescription: 'Desbloqueado ao eliminar 100 zumbis',
    jacketColor: 0x4d7c0f, // Tecido camuflado verde-oliva das florestas
    pantsColor: 0x365314,  // Calça camuflada desgastada
    backpackColor: 0xb45309, // Mochila de carga gigante de couro
    hatColor: 0x27272a,    // Capuz ghillie rústico sobre a cabeça
    accessoryType: 'scav_hood',
    desc: 'Capuz camuflado artesanal com poncho rasgado e mochila gigante estufada de mantimentos.',
  },
  skin_containment: {
    id: 'skin_containment',
    name: 'Traje de Contenção Alfa',
    category: 'cosmetic',
    icon: '☣️',
    unlockType: 'achievement',
    price: 0,
    reqLevel: 1,
    reqAchievement: 'ach_boss_slayer',
    reqDescription: 'Desbloqueado ao derrotar o Colosso da Quarentena',
    jacketColor: 0xeab308, // Macacão Hazmat amarelo radioativo total
    pantsColor: 0xca8a04,  // Calça Hazmat de borracha selada
    backpackColor: 0x15803d, // Cilindros de oxigênio verdes radioativos
    hatColor: 0x1c1917,    // Capacete hermético com visor dourado
    accessoryType: 'helmet',
    desc: 'Traje Hazmat de risco biológico nível 4 com capacete pressurizado e cilindros de descontaminação.',
  },
};

// 5 CONQUISTAS COM PROGRESSO E RECOMPENSAS REAIS
export const ACHIEVEMENTS_CATALOG: Record<AchievementId, AchievementDefinition> = {
  ach_first_blood: {
    id: 'ach_first_blood',
    name: 'Primeiro Contato',
    icon: '🎯',
    desc: 'Elimine o primeiro zumbi na cidade em quarentena.',
    target: 1,
    rewardCoins: 50,
    rewardXp: 80,
  },
  ach_kill_100: {
    id: 'ach_kill_100',
    name: 'Exterminador Urbano',
    icon: '💀',
    desc: 'Elimine um total acumulado de 100 zumbis.',
    target: 100,
    rewardCoins: 250,
    rewardXp: 300,
    unlockSkinId: 'skin_scavenger',
  },
  ach_stage_5: {
    id: 'ach_stage_5',
    name: 'Perímetro Rompido',
    icon: '🗺️',
    desc: 'Alcance o Setor 05 da quarentena.',
    target: 5,
    rewardCoins: 200,
    rewardXp: 250,
  },
  ach_boss_slayer: {
    id: 'ach_boss_slayer',
    name: 'Matador de Colossos',
    icon: '👑',
    desc: 'Derrote o Chefe Goliath Mutante Alfa no Setor 05.',
    target: 1,
    rewardCoins: 500,
    rewardXp: 600,
    unlockSkinId: 'skin_containment',
  },
  ach_flawless: {
    id: 'ach_flawless',
    name: 'Intocável',
    icon: '🛡️',
    desc: 'Conclua qualquer setor com 100% de vida sem ser ferido.',
    target: 1,
    rewardCoins: 300,
    rewardXp: 400,
  },
};
