import { STAGES_CONFIG } from '../config';
import type { StageConfig, ZombieType } from '../config';

export type GameState = 'menu' | 'playing' | 'stage_cleared' | 'game_over' | 'paused';

export class StageManager {
  public currentStageIndex: number = 0;
  public stageKills: number = 0;
  public stageSpawnedCount: number = 0;
  public totalKills: number = 0;
  public totalXp: number = 0;
  public totalCoins: number = 0;
  public stageTime: number = 0;
  public isStageCompleted: boolean = false;
  public bossSpawned: boolean = false;
  public bossDefeated: boolean = false;

  constructor() {
    this.resetToFirstStage();
  }

  public getCurrentStage(): StageConfig {
    return STAGES_CONFIG[this.currentStageIndex];
  }

  public resetToFirstStage(): void {
    this.currentStageIndex = 0;
    this.stageKills = 0;
    this.stageSpawnedCount = 0;
    this.totalKills = 0;
    this.totalXp = 0;
    this.totalCoins = 0;
    this.stageTime = 0;
    this.isStageCompleted = false;
    this.bossSpawned = false;
    this.bossDefeated = false;
  }

  public resetCurrentStage(): void {
    this.stageKills = 0;
    this.stageSpawnedCount = 0;
    this.stageTime = 0;
    this.isStageCompleted = false;
    this.bossSpawned = false;
    this.bossDefeated = false;
  }

  public setStage(stageNumber: number): boolean {
    const idx = stageNumber - 1;
    if (idx >= 0 && idx < STAGES_CONFIG.length) {
      this.currentStageIndex = idx;
      this.resetCurrentStage();
      return true;
    }
    return false;
  }

  // Registra uma eliminação real de zumbi
  public recordKill(isBoss: boolean = false): boolean {
    if (this.isStageCompleted) return false;

    this.stageKills++;
    this.totalKills++;

    if (isBoss) {
      this.bossDefeated = true;
    }

    const currentStage = this.getCurrentStage();

    // Condição de conclusão da fase:
    // Se a fase tem chefe, além do número de kills atingido, o chefe precisa estar derrotado
    const killsMet = this.stageKills >= currentStage.targetKills;
    const bossMet = !currentStage.hasBoss || this.bossDefeated;

    if (killsMet && bossMet && !this.isStageCompleted) {
      this.isStageCompleted = true;
      this.totalXp += currentStage.rewards.xp;
      this.totalCoins += currentStage.rewards.coins;
      return true; // Fase acabou de ser concluída
    }

    return false;
  }

  // Verifica se o chefe deve surgir
  public shouldSpawnBoss(): boolean {
    const stage = this.getCurrentStage();
    if (!stage.hasBoss || this.bossSpawned) return false;
    // Spawna o chefe quando atingir 50% das kills da fase 5
    return this.stageKills >= Math.floor(stage.targetKills * 0.45);
  }

  // Determina o tipo de zumbi a ser gerado com base nas probabilidades da fase atual
  public getNextZombieType(): ZombieType {
    const stage = this.getCurrentStage();
    const rand = Math.random();
    let accumulated = 0;

    const chances = stage.spawnChances;

    accumulated += chances.walker;
    if (rand <= accumulated) return 'walker';

    accumulated += chances.runner;
    if (rand <= accumulated) return 'runner';

    accumulated += chances.brute;
    if (rand <= accumulated) return 'brute';

    return 'exploder';
  }

  public advanceToNextStage(): boolean {
    if (this.currentStageIndex + 1 < STAGES_CONFIG.length) {
      this.currentStageIndex++;
      this.stageKills = 0;
      this.stageSpawnedCount = 0;
      this.stageTime = 0;
      this.isStageCompleted = false;
      this.bossSpawned = false;
      this.bossDefeated = false;
      return true;
    }
    return false; // Chegou ao fim do conjunto de fases
  }

  public isLastStage(): boolean {
    return this.currentStageIndex >= STAGES_CONFIG.length - 1;
  }
}
