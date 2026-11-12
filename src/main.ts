import './style.css';
import * as THREE from 'three';
import { SceneManager, isMobileDevice } from './rendering/SceneManager';
import { Environment } from './environment/Environment';
import { Player } from './entities/Player';
import { ZombieManager } from './entities/ZombieManager';
import { DogCompanion } from './entities/DogCompanion';
import { InputManager } from './controls/InputManager';
import { WeaponSystem } from './systems/WeaponSystem';
import { SoundEffects } from './systems/SoundEffects';
import { StageManager } from './systems/StageManager';
import { ProgressionSystem } from './systems/ProgressionSystem';
import { UIManager } from './ui/UIManager';
import { GAME_CONFIG } from './config';
import { ACHIEVEMENTS_CATALOG } from './systems/EconomyCatalog';
import type { WeaponId, SkinId } from './systems/EconomyCatalog';

class Game {
  private sceneManager: SceneManager;
  private environment: Environment;
  private player: Player;
  private zombieManager: ZombieManager;
  private dog: DogCompanion;
  private inputManager: InputManager;
  private weaponSystem: WeaponSystem;
  private sfx: SoundEffects;
  private stageManager: StageManager;
  private progression: ProgressionSystem;
  private uiManager: UIManager;

  // Perspectiva de Câmera (F2: 1ª Pessoa nos Olhos • F3: 3ª Pessoa Isométrica)
  public cameraMode: 'third_person' | 'first_person' = 'third_person';

  private lastTime: number = 0;
  private spawnCooldownTimer: number = 0;
  private tookDamageThisStage: boolean = false;

  constructor() {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element #bg-canvas not found');
    }

    this.progression = new ProgressionSystem();
    this.sceneManager = new SceneManager(canvas);
    this.environment = new Environment(this.sceneManager.scene);
    this.player = new Player(this.sceneManager.scene);
    this.zombieManager = new ZombieManager(this.sceneManager.scene);
    this.dog = new DogCompanion(this.sceneManager.scene, this.player.getPosition());
    this.inputManager = new InputManager();
    this.weaponSystem = new WeaponSystem(this.sceneManager.scene);
    this.sfx = new SoundEffects();
    this.stageManager = new StageManager();
    const savedStage = this.progression.data.currentSavedStage || 1;
    this.stageManager.setStage(savedStage);
    this.uiManager = new UIManager(this.progression);

    // No celular, sempre força 3ª pessoa isométrica para visão panorâmica tática
    const isMobile = isMobileDevice();
    const savedCam = isMobile
      ? 'third_person'
      : ((localStorage.getItem('necrovolt_camera_mode') as 'first_person' | 'third_person' | null) || 'third_person');
    this.setCameraMode(savedCam);

    this.applyPlayerProgressionState();
    this.setupGameEvents();
    this.startLoop();
  }

  public setCameraMode(mode: 'third_person' | 'first_person'): void {
    this.cameraMode = mode;
    this.sceneManager.setCameraMode(mode);
    this.inputManager.setFirstPerson(mode === 'first_person');
    this.player.setFirstPersonMode(mode === 'first_person');
    this.uiManager.updateCameraModeUI(mode);

    const crosshair = document.getElementById('fps-crosshair');
    if (crosshair) {
      if (mode === 'first_person') crosshair.classList.remove('hidden');
      else crosshair.classList.add('hidden');
    }

    try {
      localStorage.setItem('necrovolt_camera_mode', mode);
    } catch {}
  }

  private applyPlayerProgressionState(): void {
    const mods = this.progression.getModifiers();
    this.weaponSystem.setWeapon(this.progression.data.equippedWeapon);
    this.weaponSystem.applyModifiers(mods.damageMult, mods.reloadMult, mods.ammoMult);
    this.player.setSkin(this.progression.data.equippedSkin);
    this.player.applySpeedModifier(mods.speedMult);
  }

  private setupGameEvents(): void {
    const toggleAudio = () => {
      const isMuted = this.sfx.toggleMute();
      const icon = isMuted ? '🔇' : '🔊';
      const menuAudioBtn = document.getElementById('btn-menu-audio');
      if (menuAudioBtn) menuAudioBtn.textContent = icon;
      const hudAudioBtn = document.getElementById('btn-hud-audio');
      if (hudAudioBtn) hudAudioBtn.textContent = icon;
      const settingsAudioBtn = document.getElementById('btn-settings-audio-toggle');
      if (settingsAudioBtn) settingsAudioBtn.textContent = isMuted ? 'MUTADO' : 'ATIVADO';
    };

    document.getElementById('btn-menu-audio')?.addEventListener('click', toggleAudio);
    document.getElementById('btn-hud-audio')?.addEventListener('click', toggleAudio);
    document.getElementById('btn-settings-audio-toggle')?.addEventListener('click', toggleAudio);

    // Controles de Volume (Master, Tiros/SFX e Música)
    const sliderMaster = document.getElementById('settings-volume-master') as HTMLInputElement | null;
    const labelMaster = document.getElementById('volume-master-val');
    const sliderSfx = document.getElementById('settings-volume-sfx') as HTMLInputElement | null;
    const labelSfx = document.getElementById('volume-sfx-val');
    const sliderMusic = document.getElementById('settings-volume-music') as HTMLInputElement | null;
    const labelMusic = document.getElementById('volume-music-val');

    // Carrega preferências salvas no navegador
    const savedAudio = localStorage.getItem('necrovolt_audio_config');
    if (savedAudio) {
      try {
        const parsed = JSON.parse(savedAudio);
        if (typeof parsed.master === 'number') {
          this.sfx.setMasterVolume(parsed.master / 100);
          if (sliderMaster) sliderMaster.value = String(parsed.master);
          if (labelMaster) labelMaster.textContent = `${parsed.master}%`;
        }
        if (typeof parsed.sfx === 'number') {
          this.sfx.setSfxVolume(parsed.sfx / 100);
          if (sliderSfx) sliderSfx.value = String(parsed.sfx);
          if (labelSfx) labelSfx.textContent = `${parsed.sfx}%`;
        }
        if (typeof parsed.music === 'number') {
          this.sfx.setMusicVolume(parsed.music / 100);
          if (sliderMusic) sliderMusic.value = String(parsed.music);
          if (labelMusic) labelMusic.textContent = `${parsed.music}%`;
        }
      } catch {}
    }

    const saveAudioConfig = () => {
      const config = {
        master: sliderMaster ? Number(sliderMaster.value) : 85,
        sfx: sliderSfx ? Number(sliderSfx.value) : 90,
        music: sliderMusic ? Number(sliderMusic.value) : 65,
      };
      localStorage.setItem('necrovolt_audio_config', JSON.stringify(config));
    };

    sliderMaster?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.sfx.setMasterVolume(val / 100);
      if (labelMaster) labelMaster.textContent = `${val}%`;
      saveAudioConfig();
    });

    sliderSfx?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.sfx.setSfxVolume(val / 100);
      if (labelSfx) labelSfx.textContent = `${val}%`;
      saveAudioConfig();
    });

    sliderMusic?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value);
      this.sfx.setMusicVolume(val / 100);
      if (labelMusic) labelMusic.textContent = `${val}%`;
      saveAudioConfig();
    });

    this.uiManager.onStartGame(() => {
      this.sfx.startHorrorAmbience();
      const savedStage = this.progression.data.currentSavedStage || 1;
      this.stageManager.setStage(savedStage);
      this.startStageMatch();
    });

    this.uiManager.onRestartGame(() => {
      this.sfx.startHorrorAmbience();
      const savedStage = this.progression.data.currentSavedStage || 1;
      this.stageManager.setStage(savedStage);
      this.startStageMatch();
    });

    this.uiManager.onNextStage(() => {
      this.sfx.startHorrorAmbience();
      if (this.stageManager.advanceToNextStage()) {
        const nextStageNum = this.stageManager.getCurrentStage().stageNumber;
        this.progression.setCurrentSavedStage(nextStageNum);
        this.startStageMatch();
      }
    });

    this.uiManager.onWeaponChanged((id: WeaponId) => {
      this.weaponSystem.setWeapon(id);
      const mods = this.progression.getModifiers();
      this.weaponSystem.applyModifiers(mods.damageMult, mods.reloadMult, mods.ammoMult);
    });

    this.uiManager.onSkinChanged((id: SkinId) => {
      this.player.setSkin(id);
    });

    this.uiManager.onCameraModeChanged((mode) => {
      this.setCameraMode(mode);
    });

    // Ao clicar na tela durante o jogo em 1ª Pessoa no PC, captura o cursor (Pointer Lock)
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    canvas?.addEventListener('click', () => {
      if (this.cameraMode === 'first_person' && this.uiManager.isPlaying()) {
        canvas.requestPointerLock?.();
      }
    });
  }

  private startStageMatch(): void {
    this.sfx.startHorrorAmbience();
    this.sfx.startMusic('combat');
    const currentStage = this.stageManager.getCurrentStage();
    // Reconstrói e carrega o mapa correspondente a esta fase
    this.environment.loadStageMap(currentStage.stageNumber);

    this.applyPlayerProgressionState();
    this.player.reset();
    this.dog.reset(this.player.getPosition());
    this.weaponSystem.reset();
    this.zombieManager.clearAllZombies();
    this.spawnCooldownTimer = 0;
    this.tookDamageThisStage = false;

    this.progression.recordStageReached(currentStage.stageNumber);
    this.progression.setCurrentSavedStage(currentStage.stageNumber);

    const initialCount = Math.min(3, currentStage.targetKills, currentStage.maxActiveZombies);
    for (let i = 0; i < initialCount; i++) {
      if (this.stageManager.stageSpawnedCount < currentStage.targetKills) {
        this.stageManager.stageSpawnedCount++;
        const type = this.stageManager.getNextZombieType();
        this.zombieManager.spawnSafeZombie(
          this.environment.obstacles,
          this.player.getPosition(),
          type,
          currentStage.stageNumber,
          this.sceneManager.camera
        );
      }
    }
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    requestAnimationFrame(this.loop.bind(this));

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.inputManager.consumePause()) {
      this.uiManager.togglePause();
    }

    // Processa troca de perspectiva de câmera solicitada por tecla (F2 / F3)
    const camRequested = this.inputManager.consumeCameraMode();
    if (camRequested) {
      this.setCameraMode(camRequested);
    }

    const isPlaying = this.uiManager.isPlaying();

    if (isPlaying) {
      this.stageManager.stageTime += delta;
      const currentStage = this.stageManager.getCurrentStage();

      // 1. Troca de Armas
      const slot = this.inputManager.consumeWeaponSlot();
      if (slot && this.progression.data.unlockedWeapons.includes(slot)) {
        this.progression.equipWeapon(slot);
        this.weaponSystem.setWeapon(slot);
        const mods = this.progression.getModifiers();
        this.weaponSystem.applyModifiers(mods.damageMult, mods.reloadMult, mods.ammoMult);
      }

      const cycle = this.inputManager.consumeCycleWeapon();
      if (cycle !== 0) {
        const nextW = this.progression.cycleWeapon(cycle);
        this.weaponSystem.setWeapon(nextW);
        const mods = this.progression.getModifiers();
        this.weaponSystem.applyModifiers(mods.damageMult, mods.reloadMult, mods.ammoMult);
      }

      // 2. Spawner de Ondas Controladas e Resiliente
      const activeCount = this.zombieManager.getActiveCount();

      // Boss Spawner
      if (currentStage.hasBoss && !this.stageManager.bossSpawned && this.stageManager.shouldSpawnBoss()) {
        const spawnedBoss = this.zombieManager.spawnSafeZombie(
          this.environment.obstacles,
          this.player.getPosition(),
          'boss',
          currentStage.stageNumber,
          this.sceneManager.camera
        );
        if (spawnedBoss) {
          this.stageManager.bossSpawned = true;
          this.stageManager.stageSpawnedCount++;
          this.sfx.playZombieGrowl();
        }
      }

      // Spawner Regular de Zumbis:
      // O número de zumbis que ainda precisam ser gerados é: targetKills - (stageKills + activeCount)
      const unspawnedNeeded = currentStage.targetKills - (this.stageManager.stageKills + activeCount);

      if (unspawnedNeeded > 0 && activeCount < currentStage.maxActiveZombies) {
        // Se a arena ficou sem nenhum zumbi (activeCount === 0) e ainda faltam abates, força o spawn imediato do próximo zumbi!
        if (activeCount === 0) {
          this.spawnCooldownTimer = Math.max(this.spawnCooldownTimer, currentStage.spawnInterval);
        }

        this.spawnCooldownTimer += delta;
        if (this.spawnCooldownTimer >= currentStage.spawnInterval) {
          this.spawnCooldownTimer = 0;
          const type = this.stageManager.getNextZombieType();
          const spawned = this.zombieManager.spawnSafeZombie(
            this.environment.obstacles,
            this.player.getPosition(),
            type,
            currentStage.stageNumber,
            this.sceneManager.camera
          );
          if (spawned) {
            this.stageManager.stageSpawnedCount++;
          }
        }
      }

      // 3. Mira e Movimentação (1ª Pessoa nos Olhos vs 3ª Pessoa Isométrica)
      const isFP = this.cameraMode === 'first_person';
      let aimTarget = isFP
        ? this.sceneManager.getFirstPersonAimTarget(this.player.getPosition())
        : this.sceneManager.screenToWorldPoint(
            this.inputManager.rawScreen.x,
            this.inputManager.rawScreen.y
          );

      // AUTO-AIM INTELIGENTE (Prioritário em Celular / Toque / Botão de Tiro Tátil)
      if (!isFP) {
        const isShootingMobile = this.inputManager.isTouchFiring;
        const isMovingTouch = this.inputManager.touchMoveVector.x !== 0 || this.inputManager.touchMoveVector.z !== 0;

        if (isShootingMobile || isMovingTouch || isMobileDevice()) {
          const playerPos = this.player.getPosition();
          const aliveZombies = this.zombieManager.getAliveZombies();

          if (aliveZombies.length > 0) {
            let closestZombie: any = null;
            let minDistSq = 34 * 34; // Raio de alcance de mira assistida (34m)

            for (let zIdx = 0; zIdx < aliveZombies.length; zIdx++) {
              const z = aliveZombies[zIdx];
              const distSq = playerPos.distanceToSquared(z.group.position);
              if (distSq < minDistSq) {
                minDistSq = distSq;
                closestZombie = z;
              }
            }

            if (closestZombie && (isShootingMobile || this.inputManager.shouldShoot())) {
              // Ao disparar no celular, crava a mira diretamente no centro de massa do zumbi mais próximo
              aimTarget = new THREE.Vector3(
                closestZombie.group.position.x,
                0,
                closestZombie.group.position.z
              );
            } else if (closestZombie && minDistSq < 18 * 18) {
              // Se um zumbi estiver próximo (18m), vira o sobrevivente para a ameaça iminente
              aimTarget = new THREE.Vector3(
                closestZombie.group.position.x,
                0,
                closestZombie.group.position.z
              );
            } else if (isMovingTouch) {
              // Mira na direção em que o jogador está correndo pelo joystick
              aimTarget = new THREE.Vector3(
                playerPos.x + this.inputManager.touchMoveVector.x * 12,
                0,
                playerPos.z + this.inputManager.touchMoveVector.z * 12
              );
            }
          } else if (isMovingTouch) {
            aimTarget = new THREE.Vector3(
              playerPos.x + this.inputManager.touchMoveVector.x * 12,
              0,
              playerPos.z + this.inputManager.touchMoveVector.z * 12
            );
          }
        }
      }

      const moveInput = this.inputManager.getMovementVector();
      const isRunning = this.inputManager.isRunning();
      this.player.update(
        moveInput,
        aimTarget,
        delta,
        this.environment.obstacles,
        isRunning,
        isFP,
        this.inputManager.fpYaw
      );

      // 4. Recarga manual
      if (this.inputManager.consumeReload()) {
        if (this.weaponSystem.startReload()) {
          this.sfx.playReload();
        }
      }

      // 5. Disparo da arma
      if (this.inputManager.shouldShoot() && !this.player.isDead) {
        const shotResult = this.weaponSystem.tryShoot(
          this.player.getPosition(),
          aimTarget,
          currentTime / 1000
        );

        if (shotResult === 'shot') {
          this.sfx.playGunshot(this.weaponSystem.currentWeaponId);
          this.player.triggerRecoil();
        } else if (shotResult === 'empty') {
          this.sfx.playEmptyClick();
          this.sfx.playReload();
        }
      }

      // 6. Atualização de Projéteis
      this.weaponSystem.update(delta, this.environment.obstacles);

      // 7. Colisões de Projéteis com Zumbis e Registro de Eliminações Confirmadas
      const hitBullets = this.zombieManager.checkBulletHits(
        this.weaponSystem.bullets,
        (_zombie, _hitPos) => {
          this.sfx.playHitSound();
        },
        (confirmedDeadZombie) => {
          this.sfx.playZombieDeath();
          // Concede XP e moedas imediatas da eliminação
          const zConf = GAME_CONFIG.zombieTypes[confirmedDeadZombie.type];
          this.progression.addXp(zConf.xpValue);
          this.progression.addCoins(Math.round(zConf.xpValue * 0.5));

          // Atualiza conquistas de abates acumulados
          this.progression.recordKillAchievement();

          if (confirmedDeadZombie.type === 'boss') {
            this.progression.recordBossDefeated();
          }

          const stageFinished = this.stageManager.recordKill(confirmedDeadZombie.type === 'boss');

          if (stageFinished) {
            this.handleStageCleared();
          }
        }
      );

      hitBullets.sort((a, b) => b - a).forEach((idx) => {
        this.weaponSystem.removeBullet(idx);
      });

      // 8. Companheiro Canino (K9 Preto) patrulha e ataca zumbis
      this.dog.update(
        delta,
        this.player.getPosition(),
        this.player.group.rotation.y,
        this.zombieManager.getAliveZombies(),
        (zombie, dogDmg) => {
          this.zombieManager.damageZombie(
            zombie,
            dogDmg,
            () => {
              this.sfx.playHitSound();
            },
            (confirmedDeadZombie) => {
              this.sfx.playZombieDeath();
              const zConf = GAME_CONFIG.zombieTypes[confirmedDeadZombie.type];
              this.progression.addXp(zConf.xpValue);
              this.progression.addCoins(Math.round(zConf.xpValue * 0.5));
              this.progression.recordKillAchievement();

              if (confirmedDeadZombie.type === 'boss') {
                this.progression.recordBossDefeated();
              }

              const stageFinished = this.stageManager.recordKill(confirmedDeadZombie.type === 'boss');
              if (stageFinished) {
                this.handleStageCleared();
              }
            }
          );
        },
        () => {
          this.sfx.playDogBark();
        },
        () => {
          this.sfx.playDogBite();
        }
      );

      // 9. Atualização dos Zumbis
      this.zombieManager.update(
        delta,
        this.player.getPosition(),
        isPlaying,
        this.environment.obstacles,
        (damage) => {
          if (this.player.takeDamage(damage)) {
            this.tookDamageThisStage = true;
            this.sfx.playZombieGrowl();
            this.sfx.playPlayerHurt();

            if (this.player.isDead) {
              this.sfx.setMusicMode('menu');
              const timeStr = this.formatTime(this.stageManager.stageTime);
              this.uiManager.showGameOver(this.stageManager.stageKills, timeStr);
            }
          }
        },
        (explodedZombie) => {
          // Quando o exploder detona, computa a eliminação para não trancar a fase
          this.sfx.playZombieDeath();
          const zConf = GAME_CONFIG.zombieTypes[explodedZombie.type];
          this.progression.addXp(zConf.xpValue);
          this.progression.addCoins(Math.round(zConf.xpValue * 0.5));
          this.progression.recordKillAchievement();

          if (explodedZombie.type === 'boss') {
            this.progression.recordBossDefeated();
          }

          const stageFinished = this.stageManager.recordKill(explodedZombie.type === 'boss');
          if (stageFinished) {
            this.handleStageCleared();
          }
        },
        this.sceneManager.camera
      );

      // 9. Coleta de Pickups no chão
      this.zombieManager.collectPickupsNearPlayer(
        this.player.getPosition(),
        (type, value) => {
          this.sfx.playPickup();
          if (type === 'ammo') {
            this.weaponSystem.ammo = Math.min(
              this.weaponSystem.maxAmmo,
              this.weaponSystem.ammo + value
            );
          } else if (type === 'medkit') {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + value);
          }
        }
      );

      // 10. Atualiza a Interface de Combate
      this.uiManager.updateCombatHud(
        this.player.hp,
        this.player.maxHp,
        this.weaponSystem.ammo,
        this.weaponSystem.maxAmmo,
        this.weaponSystem.isReloading,
        this.weaponSystem.currentWeapon.name,
        this.stageManager.stageKills,
        currentStage.targetKills,
        currentStage.name
      );
    } else {
      const orbitSpeed = currentTime * 0.00025;
      const targetPos = this.player.getPosition();
      this.sceneManager.camera.position.x = targetPos.x + Math.sin(orbitSpeed) * 4;
      this.dog.update(delta, targetPos, this.player.group.rotation.y, [], () => {});
    }

    this.environment.update(
      delta,
      isPlaying ? this.player.getPosition() : undefined,
      (dmg, type) => {
        if (this.player.takeDamage(dmg)) {
          this.tookDamageThisStage = true;
          this.sfx.playPlayerHurt();
          if (type === 'mine') {
            this.sfx.playExplosion();
            this.uiManager.showHazardToast('💥 MINA TERRESTRE DETONADA!', '#ef4444');
          } else if (type === 'electric') {
            this.sfx.playElectricShock();
            this.uiManager.showHazardToast('⚡ DESCARGA ELÉTRICA: CHOQUE!', '#38bdf8');
          } else if (type === 'toxic') {
            this.sfx.playAcidSizzle();
            this.uiManager.showHazardToast('☣️ LODO TÓXICO: CORROSÃO & LENTIDÃO!', '#22c55e');
          }

          if (this.player.isDead) {
            this.sfx.setMusicMode('menu');
            const timeStr = this.formatTime(this.stageManager.stageTime);
            this.uiManager.showGameOver(this.stageManager.stageKills, timeStr);
          }
        }
      },
      (slowMult) => {
        this.player.setHazardSpeedModifier(slowMult);
      },
      isPlaying ? this.zombieManager.zombies : undefined,
      (zombie, mineDmg) => {
        this.zombieManager.damageZombie(
          zombie,
          mineDmg,
          () => {
            this.sfx.playHitSound();
          },
          (killed) => {
            this.sfx.playZombieDeath();
            const zConf = GAME_CONFIG.zombieTypes[killed.type];
            this.progression.addXp(zConf.xpValue);
            this.progression.addCoins(Math.round(zConf.xpValue * 0.5));
            this.progression.recordKillAchievement();
            if (killed.type === 'boss') this.progression.recordBossDefeated();
            const stageFinished = this.stageManager.recordKill(killed.type === 'boss');
            if (stageFinished) this.handleStageCleared();
          }
        );
      },
      () => {
        this.sfx.playMineBeep();
      }
    );
    if (this.cameraMode === 'first_person' && isPlaying) {
      this.sceneManager.updateCamera(
        this.player.getPosition(),
        delta,
        this.inputManager.fpYaw,
        this.inputManager.fpPitch
      );
    } else {
      this.sceneManager.updateCamera(this.player.getPosition(), delta);
    }
    this.sceneManager.render();
  }

  private handleStageCleared(): void {
    const currentStage = this.stageManager.getCurrentStage();
    this.sfx.setMusicMode('menu');
    this.progression.addXp(currentStage.rewards.xp);
    this.progression.addCoins(currentStage.rewards.coins);
    this.progression.recordStageCleared(currentStage.stageNumber);

    if (!this.tookDamageThisStage) {
      this.progression.recordFlawlessStage();
    }

    const recentAchievements = this.progression
      .popRecentAchievements()
      .map((id) => ACHIEVEMENTS_CATALOG[id]?.name || 'Conquista');

    const timeStr = this.formatTime(this.stageManager.stageTime);

    if (this.stageManager.isLastStage()) {
      // Grande Recompensa da Campanha Suprema: +5.000 🪙 Moedas e +5.000 XP
      const grandRewardCoins = 5000;
      const grandRewardXp = 5000;
      this.progression.addCoins(grandRewardCoins);
      this.progression.addXp(grandRewardXp);

      // Reinicia a campanha para a Fase 1 (Novo Ciclo / New Game+) mantendo todo o arsenal
      this.progression.setCurrentSavedStage(1);
      this.stageManager.setStage(1);

      this.uiManager.showVictory(
        this.stageManager.totalKills,
        timeStr,
        this.progression.data.coins,
        this.progression.data.xp,
        grandRewardCoins,
        grandRewardXp
      );
    } else {
      this.uiManager.showStageClear(
        currentStage.name,
        this.stageManager.stageKills,
        currentStage.targetKills,
        currentStage.rewards.xp,
        currentStage.rewards.coins,
        timeStr,
        recentAchievements
      );
    }
  }

  private formatTime(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
