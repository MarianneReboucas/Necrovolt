import * as THREE from 'three';
import type { Bullet } from '../systems/WeaponSystem';
import { GAME_CONFIG } from '../config';
import type { ZombieType } from '../config';
import { SpriteGenerator } from '../rendering/SpriteGenerator';

export type ZombieState = 'patrol' | 'chase' | 'attack' | 'windup' | 'exploding' | 'dead';

export interface ZombieInstance2D {
  group: THREE.Group;
  spriteMesh: THREE.Mesh;
  spriteMaterial: THREE.MeshBasicMaterial;
  hpBarFill: THREE.Mesh;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  scale: number;
  type: ZombieType;
  state: ZombieState;
  animTime: number;
  animFrame: number;
  attackCooldown: number;
  windupTimer: number;
  telegraphRing?: THREE.Mesh;
  patrolTarget: THREE.Vector3;
  patrolTimer: number;
  deathTimer: number;
  damageFlashTimer: number;
  isCountedKill: boolean;
  lastDist: number;
  stuckTimer: number;
}

export interface PickupItem {
  mesh: THREE.Mesh;
  type: 'ammo' | 'medkit';
  value: number;
}

export class ZombieManager2D {
  public zombies: ZombieInstance2D[] = [];
  public pickups: PickupItem[] = [];

  private scene: THREE.Scene;
  private telegraphMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
  }

  // Pontos de origem urbanos temáticos (becos escuros, avenidas de acesso e cruzamentos distantes)
  private static readonly CITY_SPAWN_NODES = [
    // Avenidas Principais (Entradas distantes da cidade)
    { x: 0, z: -72 },
    { x: 0, z: 72 },
    { x: -72, z: 0 },
    { x: 72, z: 0 },
    // Cruzamentos e Vias Secundárias
    { x: -65, z: -65 },
    { x: 65, z: -65 },
    { x: -65, z: 65 },
    { x: 65, z: 65 },
    { x: -65, z: 0 },
    { x: 65, z: 0 },
    { x: 0, z: -65 },
    { x: 0, z: 65 },
    // Becos e Vielas entre Edifícios
    { x: -32, z: -48 },
    { x: 32, z: -48 },
    { x: -32, z: 48 },
    { x: 32, z: 48 },
    { x: -48, z: -32 },
    { x: 48, z: -32 },
    { x: -48, z: 32 },
    { x: 48, z: 32 },
    { x: -28, z: -28 },
    { x: 28, z: -28 },
    { x: -28, z: 28 },
    { x: 28, z: 28 },
    // Bueiros e galerias subterrâneas urbanas distantes
    { x: -34, z: -16 },
    { x: 45, z: -45 },
    { x: -45, z: 45 },
    { x: 22, z: -22 },
    { x: -20, z: 18 },
  ];

  /**
   * Verifica se uma coordenada (x, z) está visível na tela da câmera.
   * Câmera ortográfica top-down 2D (viewSize = 46).
   */
  public isPointVisible(x: number, z: number, playerPos: THREE.Vector3, margin: number = 2.0): boolean {
    const aspect = typeof window !== 'undefined' && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 1.777;
    const halfH = 23 + margin;
    const halfW = halfH * aspect + margin;

    return Math.abs(x - playerPos.x) <= halfW && Math.abs(z - playerPos.z) <= halfH;
  }

  public spawnSafeZombie(
    obstacles: THREE.Box3[],
    playerPos: THREE.Vector3,
    type: ZombieType,
    stageNumber: number = 1
  ): boolean {
    const aspect = typeof window !== 'undefined' && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 1.777;
    const halfH = 23;
    const halfW = halfH * aspect;
    const bounds = GAME_CONFIG.arena.bounds - 4;

    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      let x = 0;
      let z = 0;

      // 50% de chance: surgir de pontos urbanos (becos, bueiros distantes, avenidas)
      // 50% de chance: surgir ao longo das vias e calçadas periféricas fora da tela
      if (Math.random() < 0.5) {
        const offscreenNodes = ZombieManager2D.CITY_SPAWN_NODES.filter(
          (node) => !this.isPointVisible(node.x, node.z, playerPos, 3.0)
        );

        if (offscreenNodes.length > 0) {
          const chosen = offscreenNodes[Math.floor(Math.random() * offscreenNodes.length)];
          // Pequena dispersão na via ou beco de origem
          x = chosen.x + (Math.random() - 0.5) * 4.0;
          z = chosen.z + (Math.random() - 0.5) * 4.0;
        }
      }

      // Se não escolheu nó ou precisa de spawn perimetral pelas vias da cidade:
      if (x === 0 && z === 0) {
        // Escolhe uma das 4 bordas externas à tela (Norte, Sul, Leste, Oeste)
        const side = Math.floor(Math.random() * 4);
        const extraDist = 4.0 + Math.random() * 6.0; // 4m a 10m além do campo visual

        if (side === 0) {
          // Norte (acima da tela)
          z = playerPos.z - (halfH + extraDist);
          x = playerPos.x + (Math.random() - 0.5) * (halfW * 1.8);
        } else if (side === 1) {
          // Sul (abaixo da tela)
          z = playerPos.z + (halfH + extraDist);
          x = playerPos.x + (Math.random() - 0.5) * (halfW * 1.8);
        } else if (side === 2) {
          // Oeste (esquerda da tela)
          x = playerPos.x - (halfW + extraDist);
          z = playerPos.z + (Math.random() - 0.5) * (halfH * 1.8);
        } else {
          // Leste (direita da tela)
          x = playerPos.x + (halfW + extraDist);
          z = playerPos.z + (Math.random() - 0.5) * (halfH * 1.8);
        }
      }

      // Confinar dentro dos limites da cidade
      x = Math.max(-bounds, Math.min(bounds, x));
      z = Math.max(-bounds, Math.min(bounds, z));

      // Garante que NUNCA brote visível na tela
      if (this.isPointVisible(x, z, playerPos, 1.5)) {
        continue;
      }

      const testRadius = type === 'boss' ? 2.0 : 0.8;
      const testBox = new THREE.Box3(
        new THREE.Vector3(x - testRadius, 0, z - testRadius),
        new THREE.Vector3(x + testRadius, 3.0, z + testRadius)
      );

      let overlaps = false;
      for (let o = 0; o < obstacles.length; o++) {
        if (testBox.intersectsBox(obstacles[o])) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.createZombie(x, z, type, stageNumber);
        return true;
      }
    }

    // Fallback de emergência garantido: se todas as 30 tentativas colidiram,
    // gera com segurança na borda da via fora da tela para NUNCA faltar zumbi na fase
    const fallbackSide = Math.floor(Math.random() * 4);
    let fx = playerPos.x;
    let fz = playerPos.z;
    if (fallbackSide === 0) fz = playerPos.z - (halfH + 5);
    else if (fallbackSide === 1) fz = playerPos.z + (halfH + 5);
    else if (fallbackSide === 2) fx = playerPos.x - (halfW + 5);
    else fx = playerPos.x + (halfW + 5);

    fx = Math.max(-bounds, Math.min(bounds, fx));
    fz = Math.max(-bounds, Math.min(bounds, fz));
    this.createZombie(fx, fz, type, stageNumber);
    return true;
  }

  public createZombie(x: number, z: number, type: ZombieType, stageNumber: number = 1): void {
    const group = new THREE.Group();
    const config = GAME_CONFIG.zombieTypes[type];

    // Escalonamento de tamanho por fase: Zumbis crescem a cada fase sucessiva (+5% por fase)
    const stageGrowthFactor = 1.0 + (stageNumber - 1) * 0.05;
    const scale = config.scale * stageGrowthFactor;

    // Escalonamento progressivo de dificuldade a cada fase:
    // Mais vida (+14% por fase), Muito mais rápidos (+7% velocidade por fase) e mais letais (+12% dano por fase)
    const levelMultHp = 1.0 + (stageNumber - 1) * 0.14;
    const levelMultSpd = 1.0 + (stageNumber - 1) * 0.07;
    const levelMultDmg = 1.0 + (stageNumber - 1) * 0.12;

    // Sprite 2D do Zumbi (ampliado conforme a escala da fase)
    const size = 3.8 * scale;
    const geo = new THREE.PlaneGeometry(size, size);
    const spriteMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });
    const spriteMesh = new THREE.Mesh(geo, spriteMaterial);
    spriteMesh.rotation.x = -Math.PI / 2;
    spriteMesh.position.y = 0.04;
    group.add(spriteMesh);

    // Barra de Vida 2D visível sobre o zumbi (acompanha o tamanho gigante)
    const barWidth = 1.4 * scale;
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    hpBarBg.rotation.x = -Math.PI / 2;
    hpBarBg.position.set(0, 0.06, -1.9 * scale);
    group.add(hpBarBg);

    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth * 0.95, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    hpBarFill.rotation.x = -Math.PI / 2;
    hpBarFill.position.set(0, 0.07, -1.9 * scale);
    group.add(hpBarFill);

    // Círculo de telegrafia de golpe
    let telegraphRing: THREE.Mesh | undefined;
    if (type === 'boss' || type === 'exploder') {
      const radius = (type === 'boss' ? (config as { smashRadius: number }).smashRadius : (config as { explosionRadius: number }).explosionRadius) * stageGrowthFactor;
      const ringGeo = new THREE.RingGeometry(radius * 0.9, radius, 32);
      telegraphRing = new THREE.Mesh(ringGeo, this.telegraphMat.clone());
      telegraphRing.rotation.x = -Math.PI / 2;
      telegraphRing.position.y = 0.03;
      telegraphRing.visible = false;
      this.scene.add(telegraphRing);
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    const instance: ZombieInstance2D = {
      group,
      spriteMesh,
      spriteMaterial,
      hpBarFill,
      speed: config.speed * levelMultSpd,
      hp: Math.round(config.hp * levelMultHp),
      maxHp: Math.round(config.hp * levelMultHp),
      damage: Math.round(config.damage * levelMultDmg),
      scale,
      type,
      state: 'chase',
      animTime: Math.random() * 10,
      animFrame: 0,
      attackCooldown: 1.0,
      windupTimer: 0,
      telegraphRing,
      patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 14, 0, z + (Math.random() - 0.5) * 14),
      patrolTimer: 2 + Math.random() * 4,
      deathTimer: 0,
      damageFlashTimer: 0,
      isCountedKill: false,
      lastDist: 999,
      stuckTimer: 0,
    };

    this.updateZombieTexture(instance, false);
    this.zombies.push(instance);
  }

  private updateZombieTexture(z: ZombieInstance2D, isHit: boolean): void {
    const canvas = SpriteGenerator.createZombieSprite(z.type, z.animFrame, isHit);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;

    if (z.spriteMaterial.map) {
      z.spriteMaterial.map.dispose();
    }
    z.spriteMaterial.map = texture;
    z.spriteMaterial.needsUpdate = true;
  }

  public repositionToOpenApproach(z: ZombieInstance2D, playerPos: THREE.Vector3, obstacles: THREE.Box3[]): void {
    const aspect = typeof window !== 'undefined' && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 1.777;
    const halfH = 23;
    const halfW = halfH * aspect;
    const bounds = GAME_CONFIG.arena.bounds - 4;

    const approaches = [
      { x: playerPos.x, z: playerPos.z - (halfH + 4) },
      { x: playerPos.x, z: playerPos.z + (halfH + 4) },
      { x: playerPos.x - (halfW + 4), z: playerPos.z },
      { x: playerPos.x + (halfW + 4), z: playerPos.z },
    ];

    for (const app of approaches) {
      const cx = Math.max(-bounds, Math.min(bounds, app.x));
      const cz = Math.max(-bounds, Math.min(bounds, app.z));
      if (!this.isPointVisible(cx, cz, playerPos, 1.0) && !this.checkCollision(cx, cz, obstacles, z.type === 'boss')) {
        z.group.position.x = cx;
        z.group.position.z = cz;
        z.state = 'chase';
        return;
      }
    }
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isGamePlaying: boolean,
    obstacles: THREE.Box3[],
    onZombieAttackPlayer: (dmg: number, isExplosion?: boolean) => void,
    onZombieExploded?: (zombie: ZombieInstance2D) => void
  ): void {
    this.pickups.forEach((p) => {
      p.mesh.rotation.y += delta * 2.5;
    });

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      if (z.telegraphRing) {
        z.telegraphRing.position.x = z.group.position.x;
        z.telegraphRing.position.z = z.group.position.z;
      }

      if (z.state === 'dead') {
        if (z.telegraphRing) z.telegraphRing.visible = false;
        z.deathTimer += delta;
        z.group.scale.multiplyScalar(Math.max(0, 1 - delta * 2));
        if (z.deathTimer > 1.2) {
          if (z.telegraphRing) this.scene.remove(z.telegraphRing);
          this.scene.remove(z.group);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      if (z.damageFlashTimer > 0) {
        z.damageFlashTimer -= delta;
        if (z.damageFlashTimer <= 0) {
          this.updateZombieTexture(z, false);
        }
      }

      let dist = z.group.position.distanceTo(playerPos);

      // Verificação anti-travamento para zumbis fora da tela:
      // Se estiver fora de visão e a distância até o jogador não diminuir por > 2.5s,
      // reposiciona numa aproximação desimpedida da via para vir correndo diretamente
      if (!this.isPointVisible(z.group.position.x, z.group.position.z, playerPos, 0)) {
        if (Math.abs(dist - z.lastDist) < 0.25) {
          z.stuckTimer = (z.stuckTimer || 0) + delta;
          if (z.stuckTimer > 2.5) {
            z.stuckTimer = 0;
            this.repositionToOpenApproach(z, playerPos, obstacles);
            dist = z.group.position.distanceTo(playerPos);
          }
        } else {
          z.lastDist = dist;
          z.stuckTimer = 0;
        }
      } else {
        z.lastDist = dist;
        z.stuckTimer = 0;
      }

      // Se o zumbi ficar excessivamente distante (> 52m, muito além da tela) e não conseguir alcançar,
      // reposiciona-o suavemente fora da tela (em uma via ou beco periférico além da visão)
      // para que venha correndo naturalmente até o jogador — NUNCA brotando na tela!
      if (dist > 52) {
        const aspect = typeof window !== 'undefined' && window.innerHeight > 0
          ? window.innerWidth / window.innerHeight
          : 1.777;
        const halfH = 23;
        const halfW = halfH * aspect;
        const bounds = GAME_CONFIG.arena.bounds - 4;

        for (let attempt = 0; attempt < 8; attempt++) {
          const side = Math.floor(Math.random() * 4);
          const extraDist = 4.0 + Math.random() * 5.0;
          let targetX = playerPos.x;
          let targetZ = playerPos.z;

          if (side === 0) {
            targetZ = playerPos.z - (halfH + extraDist);
            targetX = playerPos.x + (Math.random() - 0.5) * (halfW * 1.5);
          } else if (side === 1) {
            targetZ = playerPos.z + (halfH + extraDist);
            targetX = playerPos.x + (Math.random() - 0.5) * (halfW * 1.5);
          } else if (side === 2) {
            targetX = playerPos.x - (halfW + extraDist);
            targetZ = playerPos.z + (Math.random() - 0.5) * (halfH * 1.5);
          } else {
            targetX = playerPos.x + (halfW + extraDist);
            targetZ = playerPos.z + (Math.random() - 0.5) * (halfH * 1.5);
          }

          targetX = Math.max(-bounds, Math.min(bounds, targetX));
          targetZ = Math.max(-bounds, Math.min(bounds, targetZ));

          if (!this.isPointVisible(targetX, targetZ, playerPos, 2.0) &&
              !this.checkCollision(targetX, targetZ, obstacles, z.type === 'boss')) {
            z.group.position.x = targetX;
            z.group.position.z = targetZ;
            dist = z.group.position.distanceTo(playerPos);
            break;
          }
        }
      }

      // Comportamentos: Todos os zumbis perseguem ativamente o jogador não importa onde ele esteja
      if (z.type === 'exploder') {
        if (dist <= 3.2 && z.state !== 'exploding') {
          z.state = 'exploding';
          z.windupTimer = 1.0;
          if (z.telegraphRing) z.telegraphRing.visible = true;
        } else if (z.state !== 'exploding') {
          z.state = 'chase';
        }
      } else if (z.type === 'boss') {
        if (dist <= 5.5 && z.attackCooldown <= 0 && z.state !== 'windup') {
          z.state = 'windup';
          z.windupTimer = 1.2;
          if (z.telegraphRing) z.telegraphRing.visible = true;
        } else if (z.state !== 'windup') {
          z.state = dist <= 2.2 ? 'attack' : 'chase';
        }
      } else {
        if (dist <= 1.8) {
          z.state = 'attack';
        } else {
          // Perseguição total implacável em qualquer ponto do mapa
          z.state = 'chase';
        }
      }

      let moveDir = new THREE.Vector3();

      if (z.state === 'exploding') {
        z.windupTimer -= delta;
        if (z.windupTimer <= 0) {
          if (z.telegraphRing) z.telegraphRing.visible = false;
          onZombieAttackPlayer(z.damage, true);
          z.hp = 0;
          z.state = 'dead';
          if (!z.isCountedKill) {
            z.isCountedKill = true;
            onZombieExploded?.(z);
          }
          continue;
        }
      } else if (z.state === 'windup') {
        z.windupTimer -= delta;
        if (z.windupTimer <= 0) {
          if (z.telegraphRing) z.telegraphRing.visible = false;
          if (dist <= 6.5) onZombieAttackPlayer(z.damage);
          z.attackCooldown = 3.0;
          z.state = 'chase';
        }
      } else if (z.state === 'attack') {
        moveDir.set(0, 0, 0);
        z.attackCooldown -= delta;
        if (z.attackCooldown <= 0) {
          z.attackCooldown = z.type === 'runner' ? 0.7 : 1.1;
          onZombieAttackPlayer(z.damage);
        }
      } else if (z.state === 'chase' || z.state === 'patrol') {
        // Mira diretamente no jogador
        moveDir.subVectors(playerPos, z.group.position);
        moveDir.y = 0;
        moveDir.normalize();
      }

      // Movimentação contínua de perseguição (com contorno inteligente de carros/obstáculos)
      if (moveDir.lengthSq() > 0 && isGamePlaying && z.state !== 'windup' && z.state !== 'exploding') {
        const step = z.speed * delta;
        const nextX = z.group.position.x + moveDir.x * step;
        const nextZ = z.group.position.z + moveDir.z * step;

        const bounds = GAME_CONFIG.arena.bounds;
        let movedX = false;
        let movedZ = false;

        if (Math.abs(nextX) < bounds && !this.checkCollision(nextX, z.group.position.z, obstacles, z.type === 'boss')) {
          z.group.position.x = nextX;
          movedX = true;
        }
        if (Math.abs(nextZ) < bounds && !this.checkCollision(z.group.position.x, nextZ, obstacles, z.type === 'boss')) {
          z.group.position.z = nextZ;
          movedZ = true;
        }

        // Se bloqueado contra um veículo ou parede, contorna pelas 4 direções tangenciais/laterais
        if (!movedX && !movedZ) {
          const tangents = [
            { x: -moveDir.z * step, z: moveDir.x * step },
            { x: moveDir.z * step, z: -moveDir.x * step },
            { x: moveDir.x * step, z: 0 },
            { x: 0, z: moveDir.z * step },
          ];

          for (const t of tangents) {
            if (!this.checkCollision(z.group.position.x + t.x, z.group.position.z + t.z, obstacles, z.type === 'boss')) {
              z.group.position.x += t.x;
              z.group.position.z += t.z;
              break;
            }
          }
        }

        const angle = Math.atan2(moveDir.x, -moveDir.z);
        z.group.rotation.y = angle;

        z.animTime += delta * 8;
        const nextFrame = Math.floor(z.animTime) % 2;
        if (nextFrame !== z.animFrame) {
          z.animFrame = nextFrame;
          this.updateZombieTexture(z, z.damageFlashTimer > 0);
        }
      }

      // Atualiza barra de vida
      const pct = Math.max(0, z.hp / z.maxHp);
      z.hpBarFill.scale.x = pct;
    }
  }

  public checkBulletHits(
    bullets: Bullet[],
    onHit: (zombie: ZombieInstance2D, hitPos: THREE.Vector3) => void,
    onConfirmedKill: (zombie: ZombieInstance2D) => void
  ): number[] {
    const hitsToRemove: number[] = [];

    for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
      const b = bullets[bIdx];
      const bPos = b.mesh.position;

      for (let zIdx = 0; zIdx < this.zombies.length; zIdx++) {
        const z = this.zombies[zIdx];
        if (z.state === 'dead') continue;

        const zPos = z.group.position;
        const baseRadius = z.type === 'boss' ? 1.8 : (z.type === 'brute' ? 1.0 : 0.7);
        const radius = baseRadius * (z.scale || 1.0);

        if (Math.hypot(bPos.x - zPos.x, bPos.z - zPos.z) < radius) {
          hitsToRemove.push(bIdx);
          z.hp -= b.damage;
          z.damageFlashTimer = 0.15;
          this.updateZombieTexture(z, true);

          onHit(z, bPos);

          if (z.hp <= 0 && !z.isCountedKill) {
            z.isCountedKill = true;
            z.state = 'dead';
            onConfirmedKill(z);
            this.spawnPickup(z.group.position, z.type === 'boss');
          }
          break;
        }
      }
    }

    return hitsToRemove;
  }

  private spawnPickup(pos: THREE.Vector3, isGuaranteed: boolean = false): void {
    if (!isGuaranteed && Math.random() > 0.4) return;

    const isMedkit = Math.random() < 0.3;
    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: isMedkit ? 0xef4444 : 0xfacc15,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.05, pos.z);
    this.scene.add(mesh);

    this.pickups.push({
      mesh,
      type: isMedkit ? 'medkit' : 'ammo',
      value: isMedkit ? 35 : 12,
    });
  }

  public collectPickupsNearPlayer(
    playerPos: THREE.Vector3,
    onCollect: (type: 'ammo' | 'medkit', val: number) => void
  ): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(playerPos.x - p.mesh.position.x, playerPos.z - p.mesh.position.z) < 1.4) {
        onCollect(p.type, p.value);
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  private checkCollision(x: number, z: number, obstacles: THREE.Box3[], isBoss: boolean): boolean {
    const r = isBoss ? 1.0 : 0.45;
    const box = new THREE.Box3(
      new THREE.Vector3(x - r, 0, z - r),
      new THREE.Vector3(x + r, 2.0, z + r)
    );
    for (let i = 0; i < obstacles.length; i++) {
      if (box.intersectsBox(obstacles[i])) return true;
    }
    return false;
  }

  public getActiveCount(): number {
    return this.zombies.filter((z) => z.state !== 'dead').length;
  }

  public clearAllZombies(): void {
    this.zombies.forEach((z) => {
      if (z.telegraphRing) this.scene.remove(z.telegraphRing);
      this.scene.remove(z.group);
    });
    this.zombies = [];
  }

  public resetAll(): void {
    this.clearAllZombies();
    this.pickups.forEach((p) => this.scene.remove(p.mesh));
    this.pickups = [];
  }
}
