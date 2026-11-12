import type { GameState } from '../systems/StageManager';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { CharacterPreviewScene } from '../rendering/CharacterPreviewScene';
import { getWeaponIconSvg, getWeaponBadgeInfo, GOLD_COIN_SVG } from '../rendering/WeaponIcons';
import { STAGES_CONFIG } from '../config';
import {
  WEAPONS_CATALOG,
  UPGRADES_CATALOG,
  SKINS_CATALOG,
  ACHIEVEMENTS_CATALOG,
} from '../systems/EconomyCatalog';
import type { WeaponId, SkinId } from '../systems/EconomyCatalog';

export class UIManager {
  private startScreen: HTMLElement;
  private hud: HTMLElement;
  private settingsModal: HTMLElement;
  private shopModal: HTMLElement;
  private customModal: HTMLElement;
  private achievementsModal: HTMLElement;
  private stagesMapModal: HTMLElement;
  private pauseModal: HTMLElement;
  private gameOverModal: HTMLElement;
  private victoryModal: HTMLElement;
  private stageClearModal: HTMLElement;

  // Elementos do Mapa de Fases (Expedições)
  private mapSelectedTier: HTMLElement;
  private mapSelectedTitle: HTMLElement;
  private mapSelectedDesc: HTMLElement;
  private btnLaunchExpedition: HTMLButtonElement;
  private selectedStageNumber: number = 1;

  // Elementos do HUD de combate
  private hpBarFill: HTMLElement;
  private hpText: HTMLElement;
  private ammoCount: HTMLElement;
  private weaponName: HTMLElement;
  private killCount: HTMLElement;
  private missionProgress: HTMLElement;
  private stageTitle: HTMLElement;
  private reloadWarning: HTMLElement;

  // Moedas e nível no menu
  private menuPlayerLevel: HTMLElement;
  private menuPlayerXp: HTMLElement;
  private menuPlayerCoins: HTMLElement;
  private shopCoinsDisplay: HTMLElement;
  private shopFeedback: HTMLElement;

  // Elementos do Modal de Resultados
  private resultStageName: HTMLElement;
  private resultKills: HTMLElement;
  private resultXp: HTMLElement;
  private resultCoins: HTMLElement;
  private resultTime: HTMLElement;
  private resultAchievementsBox: HTMLElement;
  private btnNextStage: HTMLButtonElement;

  // Elementos do Modal de Personalização 3D
  private previewCanvas: HTMLCanvasElement;
  private characterPreviewScene: CharacterPreviewScene | null = null;
  private customSelectedName: HTMLElement;
  private customSelectedDesc: HTMLElement;
  private btnCustomAction: HTMLButtonElement;
  private selectedPreviewSkinId: SkinId = 'skin_urban';

  public state: GameState = 'menu';
  private progression: ProgressionSystem;

  private onGameStartCallback: (() => void) | null = null;
  private onRestartCallback: (() => void) | null = null;
  private onNextStageCallback: (() => void) | null = null;
  private onWeaponChangedCallback: ((id: WeaponId) => void) | null = null;
  private onSkinChangedCallback: ((id: SkinId) => void) | null = null;

  private isProcessingAction: boolean = false;
  private activeShopTab: 'weapons' | 'upgrades' = 'weapons';

  constructor(progression: ProgressionSystem) {
    this.progression = progression;

    this.startScreen = document.getElementById('start-screen') as HTMLElement;
    this.hud = document.getElementById('hud') as HTMLElement;
    this.settingsModal = document.getElementById('settings-modal') as HTMLElement;
    this.shopModal = document.getElementById('shop-modal') as HTMLElement;
    this.customModal = document.getElementById('custom-modal') as HTMLElement;
    this.achievementsModal = document.getElementById('achievements-modal') as HTMLElement;
    this.stagesMapModal = document.getElementById('stages-map-modal') as HTMLElement;
    this.pauseModal = document.getElementById('pause-modal') as HTMLElement;
    this.gameOverModal = document.getElementById('game-over-modal') as HTMLElement;
    this.victoryModal = document.getElementById('victory-modal') as HTMLElement;
    this.stageClearModal = document.getElementById('stage-clear-modal') as HTMLElement;

    this.mapSelectedTier = document.getElementById('map-selected-tier') as HTMLElement;
    this.mapSelectedTitle = document.getElementById('map-selected-title') as HTMLElement;
    this.mapSelectedDesc = document.getElementById('map-selected-desc') as HTMLElement;
    this.btnLaunchExpedition = document.getElementById('btn-launch-expedition') as HTMLButtonElement;

    this.hpBarFill = document.getElementById('hp-bar-fill') as HTMLElement;
    this.hpText = document.getElementById('hp-text') as HTMLElement;
    this.ammoCount = document.getElementById('ammo-count') as HTMLElement;
    this.weaponName = document.getElementById('weapon-name') as HTMLElement;
    this.killCount = document.getElementById('kill-count') as HTMLElement;
    this.missionProgress = document.getElementById('mission-progress') as HTMLElement;
    this.stageTitle = document.getElementById('stage-title') as HTMLElement;
    this.reloadWarning = document.getElementById('reload-warning') as HTMLElement;

    const gameClock = document.getElementById('game-clock-time');
    if (gameClock) this.resultTime = gameClock;

    this.menuPlayerLevel = document.getElementById('menu-player-level') as HTMLElement;
    this.menuPlayerXp = document.getElementById('menu-player-xp') as HTMLElement;
    this.menuPlayerCoins = document.getElementById('menu-player-coins') as HTMLElement;
    this.shopCoinsDisplay = document.getElementById('shop-coins-display') as HTMLElement;
    this.shopFeedback = document.getElementById('shop-feedback') as HTMLElement;

    this.resultStageName = document.getElementById('result-stage-name') as HTMLElement;
    this.resultKills = document.getElementById('result-kills') as HTMLElement;
    this.resultXp = document.getElementById('result-xp') as HTMLElement;
    this.resultCoins = document.getElementById('result-coins') as HTMLElement;
    this.resultTime = document.getElementById('result-time') as HTMLElement;
    this.resultAchievementsBox = document.getElementById('result-achievements-box') as HTMLElement;
    this.btnNextStage = document.getElementById('btn-next-stage') as HTMLButtonElement;

    this.previewCanvas = document.getElementById('preview-2d-canvas') as HTMLCanvasElement;
    this.customSelectedName = document.getElementById('custom-skin-title') as HTMLElement;
    this.customSelectedDesc = document.getElementById('custom-skin-desc') as HTMLElement;
    this.btnCustomAction = document.getElementById('btn-custom-action') as HTMLButtonElement;

    this.bindEvents();
    this.renderHeaderBalances();

    this.progression.subscribe(() => {
      this.renderHeaderBalances();
      if (!this.shopModal.classList.contains('hidden')) {
        this.renderShopContent();
      }
      if (!this.customModal.classList.contains('hidden')) {
        this.renderCustomizationList();
      }
      if (!this.achievementsModal.classList.contains('hidden')) {
        this.renderAchievementsList();
      }
    });
  }

  public onStartGame(callback: () => void): void {
    this.onGameStartCallback = callback;
  }

  public onRestartGame(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  public onNextStage(callback: () => void): void {
    this.onNextStageCallback = callback;
  }

  public onWeaponChanged(callback: (id: WeaponId) => void): void {
    this.onWeaponChangedCallback = callback;
  }

  public onSkinChanged(callback: (id: SkinId) => void): void {
    this.onSkinChangedCallback = callback;
  }

  public onCameraModeChanged(callback: (mode: 'third_person' | 'first_person') => void): void {
    this.onCameraModeCallback = callback;
  }

  public updateCameraModeUI(mode: 'third_person' | 'first_person'): void {
    this.currentCameraMode = mode;
    const btnFirst = document.getElementById('btn-camera-first');
    const btnThird = document.getElementById('btn-camera-third');
    if (btnFirst && btnThird) {
      if (mode === 'first_person') {
        btnFirst.classList.add('active-mode');
        btnThird.classList.remove('active-mode');
      } else {
        btnThird.classList.add('active-mode');
        btnFirst.classList.remove('active-mode');
      }
    }

    const hudCamIcon = document.getElementById('hud-camera-icon');
    if (hudCamIcon) {
      hudCamIcon.textContent = mode === 'first_person' ? '👁️ 1ªP' : '👁️ 3ªP';
    }
  }

  private onCameraModeCallback: ((mode: 'third_person' | 'first_person') => void) | null = null;
  private currentCameraMode: 'third_person' | 'first_person' = 'third_person';

  private bindEvents(): void {
    // Inicia o jogo diretamente ao clicar em "Iniciar Expedição"
    document.getElementById('btn-play')?.addEventListener('click', () => {
      this.startGame();
    });
    document.getElementById('btn-shop')?.addEventListener('click', () => {
      this.renderShopContent();
      this.openModal(this.shopModal);
    });

    // Abrir Mapa de Fases (Seleção de Fases e Retorno a Níveis Anteriores)
    document.getElementById('btn-stages')?.addEventListener('click', () => {
      this.openStagesMapModal();
    });

    // Iniciar a partir do botão do Mapa de Fases
    this.btnLaunchExpedition?.addEventListener('click', () => {
      this.progression.setCurrentSavedStage(this.selectedStageNumber);
      this.closeModal(this.stagesMapModal);
      this.startGame();
    });

    // Abrir Tela de Personalização com Prévia 3D
    document.getElementById('btn-custom')?.addEventListener('click', () => {
      this.openCustomizationModal();
    });

    // Abrir Tela de Conquistas
    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      this.renderAchievementsList();
      this.openModal(this.achievementsModal);
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => this.openModal(this.settingsModal));

    // Alternar Perspectiva de Câmera (Configurações e HUD para PC e Celular)
    document.getElementById('btn-camera-third')?.addEventListener('click', () => {
      this.currentCameraMode = 'third_person';
      this.updateCameraModeUI('third_person');
      if (this.onCameraModeCallback) this.onCameraModeCallback('third_person');
    });

    document.getElementById('btn-camera-first')?.addEventListener('click', () => {
      this.currentCameraMode = 'first_person';
      this.updateCameraModeUI('first_person');
      if (this.onCameraModeCallback) this.onCameraModeCallback('first_person');
    });

    document.getElementById('btn-hud-camera')?.addEventListener('click', () => {
      this.currentCameraMode = this.currentCameraMode === 'first_person' ? 'third_person' : 'first_person';
      this.updateCameraModeUI(this.currentCameraMode);
      if (this.onCameraModeCallback) this.onCameraModeCallback(this.currentCameraMode);
    });

    // Abas da Loja
    document.querySelectorAll('.shop-tab-btn').forEach((tabBtn) => {
      tabBtn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as 'weapons' | 'upgrades';
        if (tab) {
          this.activeShopTab = tab;
          document.querySelectorAll('.shop-tab-btn').forEach((b) => b.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
          this.renderShopContent();
        }
      });
    });

    // Fechar modais
    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetId = (e.currentTarget as HTMLElement).getAttribute('data-close');
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            this.closeModal(target);
          }
        }
      });
    });

    document.getElementById('btn-hud-pause')?.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume')?.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-pause-menu')?.addEventListener('click', () => this.returnToMenu());

    this.btnNextStage?.addEventListener('click', () => {
      if (this.isProcessingAction) return;
      this.isProcessingAction = true;
      this.btnNextStage.disabled = true;

      this.stageClearModal.classList.add('hidden');
      this.state = 'playing';

      if (this.onNextStageCallback) {
        this.onNextStageCallback();
      }

      setTimeout(() => {
        this.isProcessingAction = false;
        this.btnNextStage.disabled = false;
      }, 500);
    });

    document.getElementById('btn-restart-game')?.addEventListener('click', () => this.restartGame());
    document.getElementById('btn-victory-restart')?.addEventListener('click', () => this.restartGame());
    document.getElementById('btn-gameover-menu')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('btn-victory-menu')?.addEventListener('click', () => this.returnToMenu());

    // Ação no botão da personalização (Comprar / Equipar)
    this.btnCustomAction?.addEventListener('click', () => {
      this.handleCustomAction();
    });
  }

  // --- MAPA DE FASES TÁTICO (32 FASES / 8 TIERS) ---
  public openStagesMapModal(): void {
    const highest = Math.max(
      this.progression.data.highestStageReached || 1,
      this.progression.data.currentSavedStage || 1
    );
    const current = this.progression.data.currentSavedStage || 1;
    this.selectedStageNumber = Math.min(Math.max(1, current), Math.min(highest, STAGES_CONFIG.length));
    this.renderStagesNetwork();
    this.updateSelectedStageDetails(this.selectedStageNumber);
    this.openModal(this.stagesMapModal);

    // Garante que o mapa sempre inicie no topo, com o Tier 1 visível
    setTimeout(() => {
      const viewport = document.querySelector('.map-network-viewport');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }, 10);
  }

  public renderStagesNetwork(): void {
    const grid = document.getElementById('stages-nodes-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const highest = Math.max(
      this.progression.data.highestStageReached || 1,
      this.progression.data.currentSavedStage || 1
    );

    // Agrupa as 32 fases em 8 Tiers temáticos (4 fases por fileira / constelação)
    const tiers = [
      { name: 'TIER 1 • O INÍCIO DO SURTO', stages: [1, 2, 3, 4] },
      { name: 'TIER 2 • A CONTAMINAÇÃO SE ESPALHA', stages: [5, 6, 7, 8] },
      { name: 'TIER 3 • ZONA TÓXICA SUBTERRÂNEA', stages: [9, 10, 11, 12] },
      { name: 'TIER 4 • TERRITÓRIO VERMELHO DOS CONDENADOS', stages: [13, 14, 15, 16] },
      { name: 'TIER 5 • O APOCALIPSE SUPREMO', stages: [17, 18, 19, 20] },
      { name: 'TIER 6 • COMPLEXO NUCLEAR RADIOATIVO', stages: [21, 22, 23, 24] },
      { name: 'TIER 7 • PESADELO BIO-CIBERNÉTICO', stages: [25, 26, 27, 28] },
      { name: 'TIER 8 • EXTINÇÃO FINAL & O DEUS DA MORTE', stages: [29, 30, 31, 32] },
    ];

    tiers.forEach((tier) => {
      const tierGroup = document.createElement('div');
      tierGroup.className = 'tier-group-row';

      const tierHeader = document.createElement('div');
      tierHeader.className = 'tier-group-header';
      tierHeader.textContent = tier.name;
      tierGroup.appendChild(tierHeader);

      const track = document.createElement('div');
      track.className = 'tier-nodes-track';

      tier.stages.forEach((stNum) => {
        const stageConfig = STAGES_CONFIG[stNum - 1];
        const isCleared = this.progression.isStageCleared(stNum);
        const isUnlocked = stNum <= highest || isCleared;
        const isSelected = stNum === this.selectedStageNumber;
        const hasBoss = Boolean(stageConfig?.hasBoss);

        const node = document.createElement('div');
        node.className = `stage-node-item ${isUnlocked ? 'unlocked' : 'locked'} ${isCleared ? 'cleared' : ''} ${isSelected ? 'selected' : ''} ${hasBoss ? 'has-boss' : ''}`;
        node.setAttribute('data-stage', stNum.toString());

        node.innerHTML = `
          <div class="stage-diamond-core"></div>
          ${isCleared ? '<div class="stage-cleared-badge" title="Fase Concluída!">✓</div>' : ''}
          <div class="stage-node-content">
            <span class="stage-node-num">${hasBoss ? '💀' : stNum}</span>
            ${isCleared ? '<span class="stage-cleared-label">PASSOU ✓</span>' : ''}
            <span class="stage-node-icon">🔒</span>
          </div>
        `;

        node.addEventListener('click', () => {
          if (!isUnlocked) return; // Bloqueado com cadeado!
          this.selectedStageNumber = stNum;
          this.progression.setCurrentSavedStage(stNum);
          this.renderHeaderBalances();
          this.renderStagesNetwork();
          this.updateSelectedStageDetails(stNum);
        });

        track.appendChild(node);
      });

      tierGroup.appendChild(track);
      grid.appendChild(tierGroup);
    });
  }

  private updateSelectedStageDetails(stageNumber: number): void {
    const config = STAGES_CONFIG[stageNumber - 1];
    if (!config) return;

    const highest = this.progression.data.highestStageReached || 1;
    const isUnlocked = stageNumber <= highest;

    const tierName = stageNumber <= 4
      ? 'TIER 1 • O INÍCIO DO SURTO'
      : stageNumber <= 8
      ? 'TIER 2 • A CONTAMINAÇÃO SE ESPALHA'
      : stageNumber <= 12
      ? 'TIER 3 • ZONA TÓXICA SUBTERRÂNEA'
      : stageNumber <= 16
      ? 'TIER 4 • TERRITÓRIO VERMELHO DOS CONDENADOS'
      : stageNumber <= 20
      ? 'TIER 5 • O APOCALIPSE SUPREMO'
      : stageNumber <= 24
      ? 'TIER 6 • COMPLEXO NUCLEAR RADIOATIVO'
      : stageNumber <= 28
      ? 'TIER 7 • PESADELO BIO-CIBERNÉTICO'
      : 'TIER 8 • EXTINÇÃO FINAL & O DEUS DA MORTE';

    if (this.mapSelectedTier) this.mapSelectedTier.textContent = tierName;
    const isCleared = this.progression.isStageCleared(stageNumber);
    if (this.mapSelectedTitle) {
      this.mapSelectedTitle.innerHTML = `${config.name} ${isCleared ? '<span style="color: #4ade80; font-size: 0.85rem; margin-left: 8px; font-weight: 900; text-shadow: 0 0 8px rgba(74,222,128,0.8);">[PASSOU ✓]</span>' : ''}`;
    }

    const bossText = config.hasBoss ? ` • ⚠️ CHEFE: ${config.bossName}` : '';
    if (this.mapSelectedDesc) {
      this.mapSelectedDesc.textContent = `Meta: ${config.targetKills} zumbis • Recompensa: +${config.rewards.xp} XP • +${config.rewards.coins} 🪙${bossText}`;
    }

    if (this.btnLaunchExpedition) {
      if (!isUnlocked) {
        this.btnLaunchExpedition.textContent = '🔒 SETOR BLOQUEADO';
        this.btnLaunchExpedition.disabled = true;
      } else {
        this.btnLaunchExpedition.textContent = `INICIAR SETOR ${stageNumber.toString().padStart(2, '0')} ➔`;
        this.btnLaunchExpedition.disabled = false;
      }
    }
  }

  // --- TELA DE PERSONALIZAÇÃO 3D ---
  public openCustomizationModal(): void {
    this.selectedPreviewSkinId = this.progression.data.equippedSkin;
    this.openModal(this.customModal);

    if (!this.characterPreviewScene && this.previewCanvas) {
      this.characterPreviewScene = new CharacterPreviewScene(this.previewCanvas);
    }
    if (this.characterPreviewScene) {
      this.characterPreviewScene.setSkin(this.selectedPreviewSkinId);
      this.characterPreviewScene.start();
    }

    this.renderCustomizationList();
    this.updateCustomizationDetails(this.selectedPreviewSkinId);
  }

  public renderCustomizationList(): void {
    const list = document.getElementById('custom-skins-list');
    if (!list) return;
    list.innerHTML = '';

    const d = this.progression.data;

    Object.values(SKINS_CATALOG).forEach((skin) => {
      const isUnlocked = d.unlockedSkins.includes(skin.id);
      const isEquipped = d.equippedSkin === skin.id;
      const isSelected = this.selectedPreviewSkinId === skin.id;

      const item = document.createElement('div');
      item.className = `skin-select-item ${isSelected ? 'selected' : ''} ${isEquipped ? 'equipped' : ''}`;
      item.innerHTML = `
        <div class="skin-item-icon">${skin.icon}</div>
        <div class="skin-item-info">
          <h4>${skin.name}</h4>
          <span class="skin-item-status">
            ${isEquipped ? '✓ EQUIPADO' : isUnlocked ? 'ADQUIRIDO' : skin.unlockType === 'achievement' ? '🏆 CONQUISTA' : `${skin.price} 🪙`}
          </span>
        </div>
      `;

      item.addEventListener('click', () => {
        this.selectedPreviewSkinId = skin.id;
        if (this.characterPreviewScene) {
          this.characterPreviewScene.setSkin(skin.id);
        }
        this.renderCustomizationList();
        this.updateCustomizationDetails(skin.id);
      });

      list.appendChild(item);
    });
  }

  private updateCustomizationDetails(skinId: SkinId): void {
    const skin = SKINS_CATALOG[skinId];
    if (!skin) return;

    const d = this.progression.data;
    const isUnlocked = d.unlockedSkins.includes(skinId);
    const isEquipped = d.equippedSkin === skinId;
    const canAfford = d.coins >= skin.price;
    const levelMet = d.level >= skin.reqLevel;

    this.customSelectedName.textContent = skin.name;
    this.customSelectedDesc.textContent = skin.desc;

    if (isEquipped) {
      this.btnCustomAction.textContent = 'VISUAL EQUIPADO';
      this.btnCustomAction.disabled = true;
      this.btnCustomAction.className = 'btn-primary btn-custom-equipped';
    } else if (isUnlocked) {
      this.btnCustomAction.textContent = 'EQUIPAR VISUAL';
      this.btnCustomAction.disabled = false;
      this.btnCustomAction.className = 'btn-primary btn-custom-equip';
    } else if (skin.unlockType === 'achievement') {
      this.btnCustomAction.textContent = `BLOQUEADO: ${skin.reqDescription || 'Conquista necessária'}`;
      this.btnCustomAction.disabled = true;
      this.btnCustomAction.className = 'btn-primary btn-custom-locked';
    } else if (!levelMet) {
      this.btnCustomAction.textContent = `REQUER NÍVEL ${skin.reqLevel}`;
      this.btnCustomAction.disabled = true;
      this.btnCustomAction.className = 'btn-primary btn-custom-locked';
    } else {
      this.btnCustomAction.textContent = `COMPRAR • ${skin.price} 🪙`;
      this.btnCustomAction.disabled = !canAfford;
      this.btnCustomAction.className = 'btn-primary btn-custom-buy';
    }
  }

  private handleCustomAction(): void {
    const skin = SKINS_CATALOG[this.selectedPreviewSkinId];
    if (!skin) return;

    const d = this.progression.data;
    const isUnlocked = d.unlockedSkins.includes(this.selectedPreviewSkinId);

    if (isUnlocked) {
      if (this.progression.equipSkin(this.selectedPreviewSkinId)) {
        if (this.onSkinChangedCallback) this.onSkinChangedCallback(this.selectedPreviewSkinId);
        this.renderCustomizationList();
        this.updateCustomizationDetails(this.selectedPreviewSkinId);
      }
    } else if (skin.unlockType === 'coins') {
      const res = this.progression.buySkin(this.selectedPreviewSkinId);
      if (res.success) {
        if (this.onSkinChangedCallback) this.onSkinChangedCallback(this.selectedPreviewSkinId);
        this.renderCustomizationList();
        this.updateCustomizationDetails(this.selectedPreviewSkinId);
      }
    }
  }

  // --- TELA DE CONQUISTAS ---
  public renderAchievementsList(): void {
    const container = document.getElementById('achievements-list-container');
    if (!container) return;
    container.innerHTML = '';

    const d = this.progression.data;

    Object.values(ACHIEVEMENTS_CATALOG).forEach((ach) => {
      const isCompleted = d.completedAchievements.includes(ach.id);
      const currentVal = d.achievementProgress[ach.id] || 0;
      const progressPct = Math.min(100, (currentVal / ach.target) * 100);

      const card = document.createElement('div');
      card.className = `achievement-card ${isCompleted ? 'ach-completed' : ''}`;
      card.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-content">
          <div class="ach-header">
            <h3>${ach.name}</h3>
            ${isCompleted ? '<span class="ach-badge-done">CONCLUÍDO</span>' : `<span class="ach-progress-text">${Math.min(currentVal, ach.target)} / ${ach.target}</span>`}
          </div>
          <p class="ach-desc">${ach.desc}</p>
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" style="width: ${progressPct}%"></div>
          </div>
          <div class="ach-rewards-row">
            <span>Recompensa: <strong>+${ach.rewardCoins} 🪙</strong> • <strong>+${ach.rewardXp} XP</strong></span>
            ${ach.unlockSkinId ? `<span class="ach-skin-reward">Desbloqueia Skin: ${SKINS_CATALOG[ach.unlockSkinId]?.name || 'Cosmético'}</span>` : ''}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  public renderHeaderBalances(): void {
    const d = this.progression.data;
    const neededXp = this.progression.getXpForNextLevel();

    if (this.menuPlayerLevel) this.menuPlayerLevel.textContent = `NVL ${d.level}`;
    if (this.menuPlayerXp) this.menuPlayerXp.textContent = `${d.xp.toLocaleString('pt-BR')} / ${neededXp.toLocaleString('pt-BR')} XP`;
    if (this.menuPlayerCoins) {
      this.menuPlayerCoins.innerHTML = `${d.coins.toLocaleString('pt-BR')} ${GOLD_COIN_SVG}`;
    }
    if (this.shopCoinsDisplay) {
      this.shopCoinsDisplay.innerHTML = `${d.coins.toLocaleString('pt-BR')} ${GOLD_COIN_SVG}`;
    }

    const btnPlayText = document.getElementById('btn-play-text');
    if (btnPlayText) {
      const savedStage = d.currentSavedStage || 1;
      btnPlayText.textContent = savedStage > 1
        ? `CONTINUAR EXPEDIÇÃO (SETOR ${savedStage.toString().padStart(2, '0')})`
        : 'INICIAR EXPEDIÇÃO';
    }
  }

  // Renderiza a Loja Ampla e Harmônica
  public renderShopContent(): void {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';

    const d = this.progression.data;

    if (this.activeShopTab === 'weapons') {
      Object.values(WEAPONS_CATALOG).forEach((w) => {
        const isUnlocked = d.unlockedWeapons.includes(w.id);
        const isEquipped = d.equippedWeapon === w.id;
        const canAfford = d.coins >= w.price;
        const levelMet = d.level >= w.reqLevel;
        const badgeInfo = getWeaponBadgeInfo(w.id);
        const iconSvg = getWeaponIconSvg(w.id);

        const totalDmg = w.damage * w.pellets;
        const dmgPct = Math.min(100, Math.round((totalDmg / 450) * 100));
        const fireRateVal = 1 / w.fireRate;
        const fireRatePct = Math.min(100, Math.round((fireRateVal / 16) * 100));
        const magPct = Math.min(100, Math.round((w.magSize / 45) * 100));
        const rangePct = Math.min(100, Math.round((w.range / 90) * 100));

        const card = document.createElement('div');
        card.className = `shop-card ${isEquipped ? 'card-equipped' : ''}`;
        card.innerHTML = `
          <div class="card-header">
            <div class="card-weapon-icon-box" style="--badge-color: ${badgeInfo.color}; --badge-bg: ${badgeInfo.accentBg};">
              ${iconSvg}
            </div>
            <div class="card-title-group">
              <div class="card-badge-row">
                <span class="weapon-category-tag" style="color: ${badgeInfo.color}; border-color: ${badgeInfo.color}; background: ${badgeInfo.accentBg};">${badgeInfo.label}</span>
                ${isEquipped ? '<span class="badge-equipped">✓ EQUIPADA</span>' : isUnlocked ? '<span class="badge-unlocked">ADQUIRIDA</span>' : ''}
              </div>
              <h3 class="weapon-name-title">${w.name}</h3>
              <p class="card-sub">${w.desc}</p>
            </div>
          </div>

          <div class="card-stats-visual-grid">
            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">💥 DANO</span>
                <strong class="stat-gauge-val" style="color: #f87171;">${w.damage}${w.pellets > 1 ? ` x${w.pellets}` : ''}</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-damage" style="width: ${dmgPct}%;"></div>
              </div>
            </div>

            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">⚡ CADÊNCIA</span>
                <strong class="stat-gauge-val" style="color: #38bdf8;">${fireRateVal.toFixed(1)} t/s</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-firerate" style="width: ${fireRatePct}%;"></div>
              </div>
            </div>

            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">🎒 PENTE</span>
                <strong class="stat-gauge-val" style="color: #4ade80;">${w.magSize} tiros</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-mag" style="width: ${magPct}%;"></div>
              </div>
            </div>

            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">🎯 ALCANCE</span>
                <strong class="stat-gauge-val" style="color: #facc15;">${w.range}m</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-range" style="width: ${rangePct}%;"></div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-footer-tags">
              <span class="weapon-meta-tag">⏱️ ${w.reloadTime.toFixed(1)}s</span>
              <span class="weapon-meta-tag">🚀 ${w.bulletSpeed}m/s</span>
            </div>
            ${
              !levelMet
                ? `<span class="lock-req">🔒 Nível ${w.reqLevel} • ${w.price.toLocaleString('pt-BR')} ${GOLD_COIN_SVG}</span>`
                : isUnlocked
                ? `<button class="btn-shop-action btn-equip ${isEquipped ? 'btn-active-equipped' : ''}" data-weapon="${w.id}" ${isEquipped ? 'disabled' : ''}>${isEquipped ? '✓ EM USO' : 'EQUIPAR ARMA'}</button>`
                : `<button class="btn-shop-action btn-buy" data-weapon="${w.id}" ${canAfford ? '' : 'disabled'}>ADQUIRIR • ${w.price.toLocaleString('pt-BR')} ${GOLD_COIN_SVG}</button>`
            }
          </div>
        `;

        card.querySelector('.btn-buy')?.addEventListener('click', () => {
          const res = this.progression.buyWeapon(w.id);
          this.showFeedback(res.message, res.success);
          if (res.success && this.onWeaponChangedCallback) {
            this.onWeaponChangedCallback(w.id);
          }
        });

        card.querySelector('.btn-equip')?.addEventListener('click', () => {
          if (this.progression.equipWeapon(w.id)) {
            this.showFeedback(`${w.name} equipada com sucesso!`, true);
            if (this.onWeaponChangedCallback) {
              this.onWeaponChangedCallback(w.id);
            }
          }
        });

        container.appendChild(card);
      });
    } else if (this.activeShopTab === 'upgrades') {
      Object.values(UPGRADES_CATALOG).forEach((u) => {
        const currentLvl = d.upgradeLevels[u.id] || 0;
        const isMax = currentLvl >= u.maxLevel;
        const cost = this.progression.getUpgradeCost(u.id);
        const canAfford = d.coins >= cost;
        const levelMet = d.level >= u.reqLevel;

        const card = document.createElement('div');
        card.className = `shop-card ${isMax ? 'card-max' : ''}`;
        card.innerHTML = `
          <div class="card-header">
            <div class="card-weapon-icon-box" style="--badge-color: #facc15; --badge-bg: rgba(250, 204, 21, 0.15);">
              <span class="card-icon" style="font-size: 2.2rem;">${u.icon}</span>
            </div>
            <div class="card-title-group">
              <div class="card-badge-row">
                <span class="weapon-category-tag" style="color: #facc15; border-color: #facc15; background: rgba(250, 204, 21, 0.18);">UPGRADE PERMANENTE</span>
                <span class="badge-level">NÍVEL ${currentLvl} / ${u.maxLevel}</span>
              </div>
              <h3 class="weapon-name-title">${u.name}</h3>
              <p class="card-sub">${u.desc}</p>
            </div>
          </div>

          <div class="card-stats-visual-grid">
            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">BÔNUS ATUAL</span>
                <strong class="stat-gauge-val" style="color: #4ade80;">+${(currentLvl * u.bonusPerLevel * 100).toFixed(0)}${u.unit}</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-mag" style="width: ${(currentLvl / u.maxLevel) * 100}%;"></div>
              </div>
            </div>

            <div class="stat-gauge-item">
              <div class="stat-gauge-header">
                <span class="stat-gauge-label">PRÓXIMO NÍVEL</span>
                <strong class="stat-gauge-val" style="color: #38bdf8;">${isMax ? 'MÁXIMO' : `+${((currentLvl + 1) * u.bonusPerLevel * 100).toFixed(0)}${u.unit}`}</strong>
              </div>
              <div class="stat-gauge-track">
                <div class="stat-gauge-fill stat-fill-firerate" style="width: ${Math.min(100, ((currentLvl + 1) / u.maxLevel) * 100)}%;"></div>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-footer-tags">
              <span class="weapon-meta-tag">⚡ Todas as Armas</span>
            </div>
            ${
              isMax
                ? `<span class="badge-maxed">✓ Nível Máximo</span>`
                : !levelMet
                ? `<span class="lock-req">🔒 Requer Nível ${u.reqLevel}</span>`
                : `<button class="btn-shop-action btn-buy" data-upgrade="${u.id}" ${canAfford ? '' : 'disabled'}>APRIMORAR • ${cost.toLocaleString('pt-BR')} ${GOLD_COIN_SVG}</button>`
            }
          </div>
        `;

        card.querySelector('.btn-buy')?.addEventListener('click', () => {
          const res = this.progression.buyUpgrade(u.id);
          this.showFeedback(res.message, res.success);
        });

        container.appendChild(card);
      });
    }
  }

  private showFeedback(msg: string, success: boolean): void {
    if (!this.shopFeedback) return;
    this.shopFeedback.textContent = msg;
    this.shopFeedback.className = `shop-feedback-toast ${success ? 'feedback-success' : 'feedback-error'}`;
    this.shopFeedback.classList.remove('hidden');

    setTimeout(() => {
      this.shopFeedback.classList.add('hidden');
    }, 2500);
  }

  public startGame(): void {
    this.state = 'playing';
    this.startScreen.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
    this.stageClearModal.classList.add('hidden');
    this.hud.classList.remove('hidden');

    if (this.onGameStartCallback) {
      this.onGameStartCallback();
    }
  }

  public restartGame(): void {
    this.state = 'playing';
    this.gameOverModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.stageClearModal.classList.add('hidden');
    this.hud.classList.remove('hidden');

    if (this.onRestartCallback) {
      this.onRestartCallback();
    }
  }

  public returnToMenu(): void {
    this.state = 'menu';
    this.renderHeaderBalances();
    this.hud.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.gameOverModal.classList.add('hidden');
    this.victoryModal.classList.add('hidden');
    this.stageClearModal.classList.add('hidden');
    this.startScreen.classList.remove('hidden');
  }

  public togglePause(): void {
    if (this.state !== 'playing' && this.state !== 'paused') return;

    if (this.state === 'playing') {
      this.state = 'paused';
      this.pauseModal.classList.remove('hidden');
    } else {
      this.state = 'playing';
      this.pauseModal.classList.add('hidden');
    }
  }

  public showStageClear(
    stageName: string,
    kills: number,
    targetKills: number,
    xp: number,
    coins: number,
    timeStr: string,
    achievementsUnlocked: string[]
  ): void {
    this.state = 'stage_cleared';
    this.resultStageName.textContent = stageName;
    this.resultKills.textContent = `${kills} / ${targetKills}`;
    this.resultXp.textContent = `+${xp} XP`;
    this.resultCoins.textContent = `+${coins} Moedas`;
    this.resultTime.textContent = timeStr;

    if (this.resultAchievementsBox) {
      if (achievementsUnlocked.length > 0) {
        this.resultAchievementsBox.innerHTML = `
          <div class="result-ach-title">🏆 CONQUISTAS DESBLOQUEADAS:</div>
          <div class="result-ach-tags">${achievementsUnlocked.map((a) => `<span class="badge-ach-unlocked">${a}</span>`).join('')}</div>
        `;
        this.resultAchievementsBox.classList.remove('hidden');
      } else {
        this.resultAchievementsBox.classList.add('hidden');
      }
    }

    this.stageClearModal.classList.remove('hidden');
  }

  public showGameOver(kills: number, timeStr: string): void {
    this.state = 'game_over';
    (document.getElementById('gameover-kills') as HTMLElement).textContent = kills.toString();
    (document.getElementById('gameover-time') as HTMLElement).textContent = timeStr;
    this.gameOverModal.classList.remove('hidden');
  }

  public showVictory(
    totalKills: number,
    timeStr: string,
    totalCoins: number,
    totalXp: number,
    bonusCoins: number = 5000,
    bonusXp: number = 5000
  ): void {
    this.state = 'stage_cleared';
    (document.getElementById('victory-kills') as HTMLElement).textContent = totalKills.toString();
    (document.getElementById('victory-time') as HTMLElement).textContent = timeStr;
    const rewardsEl = document.getElementById('victory-rewards');
    if (rewardsEl) {
      rewardsEl.innerHTML = `
        <div style="margin-bottom: 0.35rem; font-size: 1.05rem;">🏆 Recompensa Suprema de Vitória: <strong>+${bonusCoins} 🪙</strong> • <strong>+${bonusXp} XP</strong></div>
        <small style="color: #4ade80;">Saldo Acumulado: ${totalCoins} 🪙 (${totalXp} XP) • Campanha reiniciada na Fase 01 (Novo Ciclo mantendo todo o seu arsenal!)</small>
      `;
    }
    this.victoryModal.classList.remove('hidden');
  }

  public updateCombatHud(
    hp: number,
    maxHp: number,
    ammo: number,
    maxAmmo: number,
    isReloading: boolean,
    weaponName: string,
    kills: number,
    targetKills: number,
    stageTitleStr: string
  ): void {
    const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    this.hpBarFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(hp)} / ${maxHp}`;

    if (isReloading) {
      this.ammoCount.textContent = `RECARREGANDO...`;
      this.reloadWarning.classList.remove('hidden');
    } else {
      this.ammoCount.textContent = `${ammo} / ${maxAmmo}`;
      this.reloadWarning.classList.add('hidden');
    }

    this.weaponName.textContent = weaponName;
    this.killCount.textContent = kills.toString();
    if (targetKills - kills === 1) {
      this.missionProgress.innerHTML = `<span style="color:#ef4444;font-weight:bold;text-shadow:0 0 10px rgba(239,68,68,0.85)">${kills} / ${targetKills} • ÚLTIMO ZUMBI!</span>`;
    } else {
      this.missionProgress.textContent = `${kills} / ${targetKills}`;
    }
    this.stageTitle.textContent = stageTitleStr;
  }

  public openModal(modal: HTMLElement): void {
    modal.classList.remove('hidden');
  }

  public closeModal(modal: HTMLElement): void {
    if (modal === this.customModal && this.characterPreviewScene) {
      this.characterPreviewScene.stop();
    }
    modal.classList.add('hidden');
  }

  public isPlaying(): boolean {
    return this.state === 'playing';
  }
}
