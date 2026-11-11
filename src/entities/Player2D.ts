import * as THREE from 'three';
import { GAME_CONFIG } from '../config';
import type { SkinId } from '../systems/EconomyCatalog';
import { SpriteGenerator } from '../rendering/SpriteGenerator';

export class Player2D {
  public group: THREE.Group;
  public speed: number = GAME_CONFIG.player.baseSpeed;
  public hp: number = GAME_CONFIG.player.maxHp;
  public maxHp: number = GAME_CONFIG.player.maxHp;
  public isDead: boolean = false;
  public iFrameTimer: number = 0;

  private spriteMesh: THREE.Mesh;
  private spriteMaterial: THREE.MeshBasicMaterial;
  private currentSkinId: SkinId = 'skin_urban';
  private walkTime: number = 0;
  private walkFrame: number = 0;
  private isFiring: boolean = false;
  private fireTimer: number = 0;

  // Barra de vida flutuante sobre a cabeça
  private hpBarFill: THREE.Mesh;

  // Luz do Jogador: Aura suave ao redor + Lanterna tática para onde mira
  public playerGlow: THREE.PointLight;
  public flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // Cria o plano de sprite 2D do jogador (aumentado para 4.0 x 4.0 para destaque e visibilidade)
    const geo = new THREE.PlaneGeometry(4.0, 4.0);
    this.spriteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.spriteMesh = new THREE.Mesh(geo, this.spriteMaterial);
    // Posiciona o plano horizontalmente sobre o chão (X/Z)
    this.spriteMesh.rotation.x = -Math.PI / 2;
    this.spriteMesh.position.y = 0.05;
    this.group.add(this.spriteMesh);

    // Barra de Vida 2D sobre o personagem (ajustada para o tamanho maior)
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    hpBarBg.rotation.x = -Math.PI / 2;
    hpBarBg.position.set(0, 0.06, -2.4);
    this.group.add(hpBarBg);

    this.hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    this.hpBarFill.rotation.x = -Math.PI / 2;
    this.hpBarFill.position.set(0, 0.07, -2.4);
    this.group.add(this.hpBarFill);

    // 1. Aura de luz suave em torno do personagem (360 graus)
    this.playerGlow = new THREE.PointLight(0x38bdf8, 2.2, 10, 1.2);
    this.playerGlow.position.set(0, 1.2, 0);
    this.group.add(this.playerGlow);

    // 2. Lanterna Tática (Spotlight) voltada na direção da mira
    this.flashlightTarget = new THREE.Object3D();
    scene.add(this.flashlightTarget);

    this.flashlight = new THREE.SpotLight(0xfff7ed, 5.0, 22, Math.PI / 5, 0.45, 1.2);
    this.flashlight.position.set(0, 1.2, 0);
    this.flashlight.target = this.flashlightTarget;
    this.group.add(this.flashlight);

    this.updateTexture();
  }

  public setSkin(skinId: SkinId): void {
    this.currentSkinId = skinId;
    this.updateTexture();
  }

  public applySpeedModifier(speedMultiplier: number): void {
    this.speed = GAME_CONFIG.player.baseSpeed * speedMultiplier;
  }

  public triggerRecoil(): void {
    this.isFiring = true;
    this.fireTimer = 0.12;
    this.updateTexture();
  }

  private updateTexture(): void {
    const canvas = SpriteGenerator.createPlayerSprite(
      this.currentSkinId,
      this.walkFrame,
      this.isFiring
    );
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;

    if (this.spriteMaterial.map) {
      this.spriteMaterial.map.dispose();
    }
    this.spriteMaterial.map = texture;
    this.spriteMaterial.needsUpdate = true;
  }

  public update(
    input: { x: number; z: number },
    aimTarget: THREE.Vector3,
    delta: number,
    obstacles: THREE.Box3[],
    isRunning: boolean = false
  ): void {
    if (this.isDead) return;

    // Atualiza temporizador de iFrames e dano
    if (this.iFrameTimer > 0) {
      this.iFrameTimer -= delta;
      const flash = Math.floor(this.iFrameTimer * 12) % 2 === 0;
      this.spriteMaterial.color.setHex(flash ? 0xef4444 : 0xffffff);
      if (this.iFrameTimer <= 0) {
        this.spriteMaterial.color.setHex(0xffffff);
      }
    }

    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.isFiring = false;
        this.updateTexture();
      }
    }

    // 1. Rotação em direção à mira do mouse no plano X/Z
    const dirX = aimTarget.x - this.group.position.x;
    const dirZ = aimTarget.z - this.group.position.z;
    if (Math.hypot(dirX, dirZ) > 0.05) {
      // O topo do sprite (-Y no canvas) corresponde a -Z no mundo Three.js
      const angle = Math.atan2(dirX, -dirZ);
      this.group.rotation.y = angle;

      // Atualiza o alvo da lanterna tática
      this.flashlightTarget.position.set(aimTarget.x, 0, aimTarget.z);
    }

    // 2. Movimentação em 8 direções com colisão e corrida (Sprint = 1.65x velocidade)
    const isMoving = input.x !== 0 || input.z !== 0;
    if (isMoving) {
      const sprintMultiplier = isRunning ? 1.65 : 1.0;
      const step = this.speed * sprintMultiplier * delta;
      const nextX = this.group.position.x + input.x * step;
      const nextZ = this.group.position.z + input.z * step;

      const bounds = GAME_CONFIG.arena.bounds;
      if (Math.abs(nextX) < bounds && !this.checkCollision(nextX, this.group.position.z, obstacles)) {
        this.group.position.x = nextX;
      }
      if (Math.abs(nextZ) < bounds && !this.checkCollision(this.group.position.x, nextZ, obstacles)) {
        this.group.position.z = nextZ;
      }

      // Animação de caminhada / corrida acelerada
      this.walkTime += delta * (isRunning ? 17 : 10);
      const nextFrame = Math.floor(this.walkTime) % 4;
      if (nextFrame !== this.walkFrame) {
        this.walkFrame = nextFrame;
        this.updateTexture();
      }
    } else {
      if (this.walkFrame !== 0) {
        this.walkFrame = 0;
        this.updateTexture();
      }
    }

    // Atualiza barra de vida sobre a cabeça
    const hpPct = Math.max(0, this.hp / this.maxHp);
    this.hpBarFill.scale.x = hpPct;
  }

  public takeDamage(amount: number): boolean {
    if (this.iFrameTimer > 0 || this.isDead) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.iFrameTimer = GAME_CONFIG.player.iFrameDuration;

    if (this.hp <= 0) {
      this.isDead = true;
    }
    return true;
  }

  public reset(): void {
    this.hp = this.maxHp;
    this.isDead = false;
    this.iFrameTimer = 0;
    this.spriteMaterial.color.setHex(0xffffff);
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.updateTexture();
  }

  private checkCollision(x: number, z: number, obstacles: THREE.Box3[]): boolean {
    const r = GAME_CONFIG.player.radius;
    const box = new THREE.Box3(
      new THREE.Vector3(x - r, 0, z - r),
      new THREE.Vector3(x + r, 2.0, z + r)
    );
    for (let i = 0; i < obstacles.length; i++) {
      if (box.intersectsBox(obstacles[i])) return true;
    }
    return false;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }
}
