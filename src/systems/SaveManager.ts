import type { WeaponId, UpgradeId, SkinId, AchievementId } from './EconomyCatalog';
import { WEAPONS_CATALOG, SKINS_CATALOG, ACHIEVEMENTS_CATALOG } from './EconomyCatalog';

export interface PlayerSaveData {
  version: number;
  xp: number;
  level: number;
  coins: number;
  totalKillsLifetime: number;
  highestStageReached: number;
  currentSavedStage: number;
  completedStages: number[];
  unlockedWeapons: WeaponId[];
  equippedWeapon: WeaponId;
  upgradeLevels: Record<UpgradeId, number>;
  unlockedSkins: SkinId[];
  equippedSkin: SkinId;
  // Conquistas concluídas
  completedAchievements: AchievementId[];
  achievementProgress: Record<AchievementId, number>;
}

const SAVE_KEY = 'deadcharge_player_profile_v2';
const CURRENT_VERSION = 2;

export class SaveManager {
  private static defaultData(): PlayerSaveData {
    return {
      version: CURRENT_VERSION,
      xp: 0,
      level: 1,
      coins: 250,
      totalKillsLifetime: 0,
      highestStageReached: 1,
      currentSavedStage: 1,
      completedStages: [],
      unlockedWeapons: ['pistol'],
      equippedWeapon: 'pistol',
      upgradeLevels: {
        upg_damage: 0,
        upg_reload: 0,
        upg_ammo: 0,
        upg_speed: 0,
      },
      unlockedSkins: ['skin_urban'],
      equippedSkin: 'skin_urban',
      completedAchievements: [],
      achievementProgress: {
        ach_first_blood: 0,
        ach_kill_100: 0,
        ach_stage_5: 1,
        ach_boss_slayer: 0,
        ach_flawless: 0,
      },
    };
  }

  public static load(): PlayerSaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        const fresh = this.defaultData();
        this.save(fresh);
        return fresh;
      }

      const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
      const defaults = this.defaultData();

      const sanitized: PlayerSaveData = {
        version: CURRENT_VERSION,
        xp: typeof parsed.xp === 'number' && parsed.xp >= 0 ? parsed.xp : defaults.xp,
        level: typeof parsed.level === 'number' && parsed.level >= 1 ? parsed.level : defaults.level,
        coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? parsed.coins : defaults.coins,
        totalKillsLifetime: typeof parsed.totalKillsLifetime === 'number' ? parsed.totalKillsLifetime : 0,
        highestStageReached: typeof parsed.highestStageReached === 'number' ? parsed.highestStageReached : 1,
        currentSavedStage: typeof parsed.currentSavedStage === 'number' && parsed.currentSavedStage >= 1 && parsed.currentSavedStage <= 100
          ? parsed.currentSavedStage
          : (typeof parsed.highestStageReached === 'number' && parsed.highestStageReached >= 1 && parsed.highestStageReached <= 100 ? parsed.highestStageReached : 1),
        completedStages: Array.isArray(parsed.completedStages)
          ? parsed.completedStages.filter((s) => typeof s === 'number' && s >= 1 && s <= 100)
          : [],
        unlockedWeapons: Array.isArray(parsed.unlockedWeapons) && parsed.unlockedWeapons.length > 0
          ? parsed.unlockedWeapons.filter((w) => w in WEAPONS_CATALOG)
          : defaults.unlockedWeapons,
        equippedWeapon: parsed.equippedWeapon && parsed.equippedWeapon in WEAPONS_CATALOG
          ? parsed.equippedWeapon
          : defaults.equippedWeapon,
        upgradeLevels: {
          upg_damage: parsed.upgradeLevels?.upg_damage ?? 0,
          upg_reload: parsed.upgradeLevels?.upg_reload ?? 0,
          upg_ammo: parsed.upgradeLevels?.upg_ammo ?? 0,
          upg_speed: parsed.upgradeLevels?.upg_speed ?? 0,
        },
        unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0
          ? parsed.unlockedSkins.filter((s) => s in SKINS_CATALOG)
          : defaults.unlockedSkins,
        equippedSkin: parsed.equippedSkin && parsed.equippedSkin in SKINS_CATALOG
          ? parsed.equippedSkin
          : defaults.equippedSkin,
        completedAchievements: Array.isArray(parsed.completedAchievements)
          ? parsed.completedAchievements.filter((a) => a in ACHIEVEMENTS_CATALOG)
          : [],
        achievementProgress: {
          ach_first_blood: parsed.achievementProgress?.ach_first_blood ?? 0,
          ach_kill_100: parsed.achievementProgress?.ach_kill_100 ?? 0,
          ach_stage_5: parsed.achievementProgress?.ach_stage_5 ?? 1,
          ach_boss_slayer: parsed.achievementProgress?.ach_boss_slayer ?? 0,
          ach_flawless: parsed.achievementProgress?.ach_flawless ?? 0,
        },
      };

      if (!sanitized.unlockedWeapons.includes('pistol')) sanitized.unlockedWeapons.push('pistol');
      if (!sanitized.unlockedSkins.includes('skin_urban')) sanitized.unlockedSkins.push('skin_urban');

      // Se o jogador já avançou de fase, todas as fases anteriores contam como completadas
      const maxCleared = Math.max(sanitized.highestStageReached, sanitized.currentSavedStage);
      for (let s = 1; s < maxCleared; s++) {
        if (!sanitized.completedStages.includes(s)) {
          sanitized.completedStages.push(s);
        }
      }

      return sanitized;
    } catch (e) {
      console.warn('Falha ao ler save local. Restaurando padrão seguro:', e);
      return this.defaultData();
    }
  }

  public static save(data: PlayerSaveData): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Erro ao gravar dados no localStorage:', e);
    }
  }

  public static resetProfile(): PlayerSaveData {
    const fresh = this.defaultData();
    this.save(fresh);
    return fresh;
  }
}
