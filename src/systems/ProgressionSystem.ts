import { SaveManager } from './SaveManager';
import type { PlayerSaveData } from './SaveManager';
import type { WeaponId, UpgradeId, SkinId, AchievementId } from './EconomyCatalog';
import { STAGES_CONFIG } from '../config';
import {
  WEAPONS_CATALOG,
  UPGRADES_CATALOG,
  SKINS_CATALOG,
  ACHIEVEMENTS_CATALOG,
} from './EconomyCatalog';

export class ProgressionSystem {
  public data: PlayerSaveData;
  private onChangeCallbacks: (() => void)[] = [];
  public newlyUnlockedAchievements: AchievementId[] = [];

  constructor() {
    this.data = SaveManager.load();
  }

  public subscribe(cb: () => void): void {
    this.onChangeCallbacks.push(cb);
  }

  public notify(): void {
    SaveManager.save(this.data);
    this.onChangeCallbacks.forEach((cb) => cb());
  }

  public getXpForNextLevel(): number {
    return Math.floor(120 * Math.pow(1.35, this.data.level - 1));
  }

  public addXp(amount: number): boolean {
    if (amount <= 0) return false;
    this.data.xp += amount;

    let leveledUp = false;
    let needed = this.getXpForNextLevel();

    while (this.data.xp >= needed) {
      this.data.xp -= needed;
      this.data.level++;
      leveledUp = true;
      this.data.coins += 50 * this.data.level;
      needed = this.getXpForNextLevel();
    }

    this.notify();
    return leveledUp;
  }

  public addCoins(amount: number): void {
    if (amount <= 0) return;
    this.data.coins += amount;
    this.notify();
  }

  // Registra progresso e verificação de conquistas
  public recordKillAchievement(): void {
    this.data.totalKillsLifetime++;
    this.updateAchievementProgress('ach_first_blood', this.data.totalKillsLifetime);
    this.updateAchievementProgress('ach_kill_100', this.data.totalKillsLifetime);
    this.notify();
  }

  public isStageCleared(stageNumber: number): boolean {
    if (!this.data.completedStages) this.data.completedStages = [];
    return (
      this.data.completedStages.includes(stageNumber) ||
      stageNumber < (this.data.highestStageReached || 1) ||
      stageNumber < (this.data.currentSavedStage || 1)
    );
  }

  public recordStageCleared(stageNumber: number): void {
    if (!this.data.completedStages) this.data.completedStages = [];
    if (!this.data.completedStages.includes(stageNumber)) {
      this.data.completedStages.push(stageNumber);
    }
    const next = Math.min(STAGES_CONFIG.length, stageNumber + 1);
    if (next > this.data.highestStageReached) {
      this.data.highestStageReached = next;
    }
    this.data.currentSavedStage = next;
    this.notify();
  }

  public recordStageReached(stageNumber: number): void {
    this.data.currentSavedStage = Math.max(1, Math.min(STAGES_CONFIG.length, stageNumber));
    if (stageNumber > this.data.highestStageReached) {
      this.data.highestStageReached = stageNumber;
    }
    this.updateAchievementProgress('ach_stage_5', this.data.highestStageReached);
    this.notify();
  }

  public setCurrentSavedStage(stageNumber: number): void {
    this.data.currentSavedStage = Math.max(1, Math.min(STAGES_CONFIG.length, stageNumber));
    if (this.data.currentSavedStage > this.data.highestStageReached) {
      this.data.highestStageReached = this.data.currentSavedStage;
    }
    this.notify();
  }

  public recordBossDefeated(): void {
    this.updateAchievementProgress('ach_boss_slayer', 1);
    this.notify();
  }

  public recordFlawlessStage(): void {
    this.updateAchievementProgress('ach_flawless', 1);
    this.notify();
  }

  private updateAchievementProgress(id: AchievementId, currentVal: number): void {
    const ach = ACHIEVEMENTS_CATALOG[id];
    if (!ach || this.data.completedAchievements.includes(id)) return;

    this.data.achievementProgress[id] = Math.max(this.data.achievementProgress[id] || 0, currentVal);

    if (this.data.achievementProgress[id] >= ach.target) {
      this.data.completedAchievements.push(id);
      this.newlyUnlockedAchievements.push(id);
      // Recompensas da conquista
      this.data.coins += ach.rewardCoins;
      this.data.xp += ach.rewardXp;

      // Desbloqueio de Skin especial por conquista
      if (ach.unlockSkinId && !this.data.unlockedSkins.includes(ach.unlockSkinId)) {
        this.data.unlockedSkins.push(ach.unlockSkinId);
      }
    }
  }

  public popRecentAchievements(): AchievementId[] {
    const list = [...this.newlyUnlockedAchievements];
    this.newlyUnlockedAchievements = [];
    return list;
  }

  // Compra e equipagem de Armas
  public buyWeapon(id: WeaponId): { success: boolean; message: string } {
    const weapon = WEAPONS_CATALOG[id];
    if (!weapon) return { success: false, message: 'Arma inexistente.' };

    if (this.data.unlockedWeapons.includes(id)) {
      return { success: false, message: 'Arma já adquirida.' };
    }

    if (this.data.level < weapon.reqLevel) {
      return { success: false, message: `Requer Nível ${weapon.reqLevel} de Sobrevivente.` };
    }

    if (this.data.coins < weapon.price) {
      return { success: false, message: `Moedas insuficientes (Precisa de ${weapon.price}).` };
    }

    this.data.coins -= weapon.price;
    this.data.unlockedWeapons.push(id);
    this.data.equippedWeapon = id;
    this.notify();

    return { success: true, message: `${weapon.name} adquirida e equipada com sucesso!` };
  }

  public equipWeapon(id: WeaponId): boolean {
    if (!this.data.unlockedWeapons.includes(id)) return false;
    this.data.equippedWeapon = id;
    this.notify();
    return true;
  }

  public cycleWeapon(direction: 1 | -1): WeaponId {
    const unlocked = this.data.unlockedWeapons;
    if (unlocked.length <= 1) return this.data.equippedWeapon;

    const currIdx = unlocked.indexOf(this.data.equippedWeapon);
    const nextIdx = (currIdx + direction + unlocked.length) % unlocked.length;
    const nextWeapon = unlocked[nextIdx];

    this.data.equippedWeapon = nextWeapon;
    this.notify();
    return nextWeapon;
  }

  // Melhorias permanentes
  public getUpgradeCost(id: UpgradeId): number {
    const upg = UPGRADES_CATALOG[id];
    if (!upg) return 0;
    const currentLvl = this.data.upgradeLevels[id] || 0;
    return Math.floor(upg.basePrice * Math.pow(upg.priceMultiplier, currentLvl));
  }

  public buyUpgrade(id: UpgradeId): { success: boolean; message: string } {
    const upg = UPGRADES_CATALOG[id];
    if (!upg) return { success: false, message: 'Melhoria inexistente.' };

    const currentLvl = this.data.upgradeLevels[id] || 0;
    if (currentLvl >= upg.maxLevel) {
      return { success: false, message: 'Melhoria já atingiu o nível máximo.' };
    }

    if (this.data.level < upg.reqLevel) {
      return { success: false, message: `Requer Nível ${upg.reqLevel}.` };
    }

    const cost = this.getUpgradeCost(id);
    if (this.data.coins < cost) {
      return { success: false, message: `Moedas insuficientes (${cost} necessárias).` };
    }

    this.data.coins -= cost;
    this.data.upgradeLevels[id] = currentLvl + 1;
    this.notify();

    return {
      success: true,
      message: `${upg.name} aprimorada para Nível ${currentLvl + 1}!`,
    };
  }

  // Skins Cosméticas
  public buySkin(id: SkinId): { success: boolean; message: string } {
    const skin = SKINS_CATALOG[id];
    if (!skin) return { success: false, message: 'Visual inexistente.' };

    if (this.data.unlockedSkins.includes(id)) {
      return { success: false, message: 'Visual já adquirido.' };
    }

    if (skin.unlockType === 'achievement') {
      return { success: false, message: skin.reqDescription || 'Desbloqueio por conquista.' };
    }

    if (this.data.level < skin.reqLevel) {
      return { success: false, message: `Requer Nível ${skin.reqLevel}.` };
    }

    if (this.data.coins < skin.price) {
      return { success: false, message: `Moedas insuficientes (${skin.price} necessárias).` };
    }

    this.data.coins -= skin.price;
    this.data.unlockedSkins.push(id);
    this.data.equippedSkin = id;
    this.notify();

    return { success: true, message: `${skin.name} desbloqueado e equipado!` };
  }

  public equipSkin(id: SkinId): boolean {
    if (!this.data.unlockedSkins.includes(id)) return false;
    this.data.equippedSkin = id;
    this.notify();
    return true;
  }

  public getModifiers(): {
    damageMult: number;
    reloadMult: number;
    ammoMult: number;
    speedMult: number;
  } {
    const dmgLvl = this.data.upgradeLevels.upg_damage || 0;
    const relLvl = this.data.upgradeLevels.upg_reload || 0;
    const ammoLvl = this.data.upgradeLevels.upg_ammo || 0;
    const spdLvl = this.data.upgradeLevels.upg_speed || 0;

    return {
      damageMult: 1.0 + dmgLvl * UPGRADES_CATALOG.upg_damage.bonusPerLevel,
      reloadMult: Math.max(0.4, 1.0 - relLvl * UPGRADES_CATALOG.upg_reload.bonusPerLevel),
      ammoMult: 1.0 + ammoLvl * UPGRADES_CATALOG.upg_ammo.bonusPerLevel,
      speedMult: 1.0 + spdLvl * UPGRADES_CATALOG.upg_speed.bonusPerLevel,
    };
  }
}
