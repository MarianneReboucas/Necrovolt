import * as THREE from 'three';
import { GAME_CONFIG } from '../config';
import type { ZombieInstance } from '../entities/ZombieManager';

export type HazardType = 'mine' | 'electric' | 'toxic';

export interface TrapLandmine {
  group: THREE.Group;
  pos: THREE.Vector3;
  radius: number;
  blastRadius: number;
  damage: number;
  isArmed: boolean;
  isTriggered: boolean;
  fuseTimer: number;
  isExploded: boolean;
  ledMesh: THREE.Mesh;
  ledLight: THREE.PointLight;
  pulsePhase: number;
}

export interface TrapElectricArc {
  group: THREE.Group;
  posA: THREE.Vector3;
  posB: THREE.Vector3;
  meshArc: THREE.Mesh;
  light: THREE.PointLight;
  cycleTimer: number;
  activeDuration: number;
  inactiveDuration: number;
  isActive: boolean;
  damage: number;
  hitCooldown: number;
}

export interface TrapToxicZone {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  radius: number;
  damagePerSec: number;
  slowMult: number;
  light: THREE.PointLight;
  bubbles: THREE.Mesh[];
  tickTimer: number;
}

export interface ExplosionVisual {
  group: THREE.Group;
  fireball: THREE.Mesh;
  shockwave: THREE.Mesh;
  light: THREE.PointLight;
  timer: number;
  duration: number;
}

export type VehicleType =
  | 'police'
  | 'ambulance'
  | 'taxi'
  | 'military'
  | 'sedan'
  | 'wagon'
  | 'wreck'
  | 'flipped'
  | 'bus';

interface VehicleDef {
  x: number;
  z: number;
  rot: number;
  type: VehicleType;
  color?: number;
}

/**
 * Environment: Cidade Pós-Apocalíptica Urbana Profunda.
 * Cenário expandido com dezenas de veículos abandonados, engarrafamentos de fuga,
 * barricadas de quarentena militar, barris em chamas, vazamentos tóxicos,
 * manchas de sangue orgânicas, marcas de frenagem e detalhes urbanos decadentes.
 */
export class Environment {
  public obstacles: THREE.Box3[] = [];
  public group: THREE.Group;
  public floorLights: THREE.PointLight[] = [];

  // Armadilhas e Perigos Ambientais Ativos
  public landmines: TrapLandmine[] = [];
  public electricArcs: TrapElectricArc[] = [];
  public toxicZones: TrapToxicZone[] = [];
  public explosions: ExplosionVisual[] = [];

  // Luzes dinâmicas com animação (chamas, sirenes)
  private animatedFires: { light: THREE.PointLight; baseIntensity: number; phase: number }[] = [];
  private animatedSirens: { light: THREE.PointLight; colA: number; colB: number; timer: number }[] = [];

  // Texturas de Canvas procedurais em cache
  private static bloodTexture: THREE.CanvasTexture | null = null;
  private static toxicSludgeTexture: THREE.CanvasTexture | null = null;
  private static skidTexture: THREE.CanvasTexture | null = null;
  private static manholeTexture: THREE.CanvasTexture | null = null;
  private static hazardStripeTexture: THREE.CanvasTexture | null = null;
  private static glassShardsTexture: THREE.CanvasTexture | null = null;

  constructor(_scene: THREE.Scene, stageNumber: number = 1) {
    this.group = new THREE.Group();
    _scene.add(this.group);

    this.buildMapForStage(stageNumber);
  }

  // Limpa o mapa atual e reconstrói o ambiente para a nova fase
  public loadStageMap(stageNumber: number): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }
    this.obstacles = [];
    this.floorLights = [];
    this.animatedFires = [];
    this.animatedSirens = [];
    this.landmines = [];
    this.electricArcs = [];
    this.toxicZones = [];
    this.explosions = [];

    this.buildMapForStage(stageNumber);
  }

  // Atualização de iluminação ambiental viva, armadilhas, poças de ácido, choques e minas
  public update(
    delta: number,
    playerPos?: THREE.Vector3,
    onPlayerHazardDamage?: (dmg: number, type: HazardType) => void,
    onPlayerSlow?: (slowMult: number) => void,
    zombies?: ZombieInstance[],
    onZombieDamageFromMine?: (z: ZombieInstance, dmg: number) => void,
    onMineArmed?: () => void
  ): void {
    // 1. Chamas de barris crepitantes
    for (let i = 0; i < this.animatedFires.length; i++) {
      const f = this.animatedFires[i];
      f.phase += delta * 12;
      const flicker = Math.sin(f.phase) * 0.25 + Math.cos(f.phase * 2.3) * 0.15;
      f.light.intensity = f.baseIntensity * (1 + flicker * 0.35);
    }

    // 2. Sirenes de viaturas de polícia (alterna vermelho / azul)
    for (let i = 0; i < this.animatedSirens.length; i++) {
      const s = this.animatedSirens[i];
      s.timer += delta * 4;
      const isRed = Math.floor(s.timer) % 2 === 0;
      s.light.color.setHex(isRed ? s.colA : s.colB);
    }

    // 3. Efeitos visuais de explosão
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.timer += delta;
      const progress = exp.timer / exp.duration;
      if (progress >= 1.0) {
        this.group.remove(exp.group);
        this.explosions.splice(i, 1);
      } else {
        const scale = 1.0 + progress * 2.5;
        exp.fireball.scale.set(scale, scale, scale);
        exp.shockwave.scale.set(scale * 1.6, scale * 1.6, 1);
        const op = Math.max(0, 1.0 - progress);
        (exp.fireball.material as THREE.MeshBasicMaterial).opacity = op * 0.95;
        (exp.shockwave.material as THREE.MeshBasicMaterial).opacity = op * 0.85;
        exp.light.intensity = 8.0 * (1.0 - progress);
      }
    }

    // 4. Poças de Lodo Tóxico Ativas (Dano contínuo & Lentidão)
    let playerInSludge = false;
    let worstSlowMult = 1.0;

    for (let i = 0; i < this.toxicZones.length; i++) {
      const tz = this.toxicZones[i];
      for (let b = 0; b < tz.bubbles.length; b++) {
        const bubble = tz.bubbles[b];
        bubble.position.y += delta * 0.35;
        if (bubble.position.y > 0.4) {
          bubble.position.y = 0.08;
        }
      }

      if (playerPos) {
        const distToPlayer = Math.hypot(playerPos.x - tz.pos.x, playerPos.z - tz.pos.z);
        if (distToPlayer < tz.radius) {
          playerInSludge = true;
          if (tz.slowMult < worstSlowMult) {
            worstSlowMult = tz.slowMult;
          }
          tz.tickTimer += delta;
          if (tz.tickTimer >= 0.55) {
            tz.tickTimer = 0;
            onPlayerHazardDamage?.(tz.damagePerSec * 0.55, 'toxic');
          }
        }
      }
    }
    onPlayerSlow?.(playerInSludge ? worstSlowMult : 1.0);

    // 5. Arcos Elétricos Tesla (Choque Intermitente)
    for (let i = 0; i < this.electricArcs.length; i++) {
      const arc = this.electricArcs[i];
      arc.cycleTimer += delta;
      if (arc.hitCooldown > 0) arc.hitCooldown -= delta;

      const totalCycle = arc.activeDuration + arc.inactiveDuration;
      const cycleMod = arc.cycleTimer % totalCycle;
      const isNowActive = cycleMod < arc.activeDuration;
      arc.isActive = isNowActive;

      arc.meshArc.visible = isNowActive;
      if (isNowActive) {
        arc.light.intensity = 3.2 + Math.random() * 2.2;
        arc.light.color.setHex(Math.random() > 0.25 ? 0x38bdf8 : 0x7dd3fc);

        if (playerPos && arc.hitCooldown <= 0) {
          const distToSegment = this.distancePointToSegment2D(
            playerPos.x, playerPos.z,
            arc.posA.x, arc.posA.z,
            arc.posB.x, arc.posB.z
          );
          if (distToSegment < 1.45) {
            arc.hitCooldown = 0.85;
            onPlayerHazardDamage?.(arc.damage, 'electric');
          }
        }
      } else {
        arc.light.intensity = 0;
      }
    }

    // 6. Minas Terrestres Táticas (Detecção de Proximidade do Jogador e de Zumbis)
    for (let i = this.landmines.length - 1; i >= 0; i--) {
      const mine = this.landmines[i];
      if (mine.isExploded) continue;

      if (!mine.isTriggered) {
        mine.pulsePhase += delta * 4;
        const pulse = 0.5 + Math.sin(mine.pulsePhase) * 0.5;
        mine.ledLight.intensity = 0.4 + pulse * 1.4;

        let triggered = false;
        if (playerPos) {
          const distToPlayer = Math.hypot(playerPos.x - mine.pos.x, playerPos.z - mine.pos.z);
          if (distToPlayer < mine.radius) {
            triggered = true;
          }
        }

        if (!triggered && zombies) {
          for (let z = 0; z < zombies.length; z++) {
            const zomb = zombies[z];
            if (zomb.state === 'dead') continue;
            const distZ = Math.hypot(zomb.group.position.x - mine.pos.x, zomb.group.position.z - mine.pos.z);
            if (distZ < mine.radius) {
              triggered = true;
              break;
            }
          }
        }

        if (triggered) {
          mine.isTriggered = true;
          mine.ledLight.intensity = 5.0;
          (mine.ledMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
          onMineArmed?.();
        }
      } else {
        mine.fuseTimer -= delta;
        if (mine.fuseTimer <= 0) {
          mine.isExploded = true;
          this.group.remove(mine.group);
          this.spawnExplosionVisual(mine.pos);

          if (playerPos) {
            const distToPlayer = Math.hypot(playerPos.x - mine.pos.x, playerPos.z - mine.pos.z);
            if (distToPlayer <= mine.blastRadius) {
              const falloff = 1.0 - (distToPlayer / mine.blastRadius) * 0.4;
              onPlayerHazardDamage?.(Math.round(mine.damage * falloff), 'mine');
            }
          }

          if (zombies) {
            for (let z = 0; z < zombies.length; z++) {
              const zomb = zombies[z];
              if (zomb.state === 'dead') continue;
              const distZ = Math.hypot(zomb.group.position.x - mine.pos.x, zomb.group.position.z - mine.pos.z);
              if (distZ <= mine.blastRadius) {
                onZombieDamageFromMine?.(zomb, 200);
              }
            }
          }

          this.landmines.splice(i, 1);
        }
      }
    }
  }

  private buildMapForStage(stageNumber: number): void {
    this.buildCityGround(stageNumber);
    this.buildCityStreetGrid(stageNumber);
    this.buildRainPuddles(stageNumber);
    this.buildCityBlocksAndRooftops(stageNumber);
    this.buildSkidMarks(stageNumber);
    this.buildStreetVehicles(stageNumber);
    this.buildUrbanProps(stageNumber);
    this.buildStreetProps(stageNumber);
    this.buildApocalypticDecorations(stageNumber);
    this.buildOrganicBloodDecals(stageNumber);
    this.buildTacticalSignage(stageNumber);
    this.buildCityStreetLighting(stageNumber);

    // Sistema de Dificuldade de Mapas: Labirintos e Armadilhas Escalonadas
    this.buildStageMaze(stageNumber);
    this.buildStageTraps(stageNumber);
  }

  // ==========================================
  // TEXTURAS PROCEDURAIS CANVAS
  // ==========================================

  private static getBloodTexture(): THREE.CanvasTexture {
    if (this.bloodTexture) return this.bloodTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Fundo transparente
    ctx.clearRect(0, 0, 128, 128);

    // Poça central orgânica de sangue coagulado
    ctx.save();
    ctx.translate(64, 64);

    // Mancha escura central
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const rad = 28 + Math.sin(a * 4 + 1.2) * 8 + Math.cos(a * 2) * 6;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Bordas de sangue carmesim fresco
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const rad = 22 + Math.sin(a * 5) * 6;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Respingo satélite e gotas em volta
    ctx.fillStyle = '#7f1d1d';
    const drops = [
      { x: -38, y: -16, r: 4.5 },
      { x: -44, y: 12, r: 3.2 },
      { x: -32, y: 34, r: 3.8 },
      { x: 2, y: 46, r: 4.0 },
      { x: 38, y: 32, r: 5.0 },
      { x: 48, y: -8, r: 3.6 },
      { x: 36, y: -38, r: 4.2 },
      { x: -12, y: -45, r: 3.4 },
      { x: -22, y: -28, r: 2.8 },
      { x: 26, y: -22, r: 3.0 },
      { x: 18, y: 30, r: 3.2 },
      { x: -52, y: -4, r: 2.2 },
      { x: 42, y: 44, r: 2.5 },
    ];
    drops.forEach((d) => {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    this.bloodTexture = new THREE.CanvasTexture(canvas);
    return this.bloodTexture;
  }

  private static getToxicSludgeTexture(): THREE.CanvasTexture {
    if (this.toxicSludgeTexture) return this.toxicSludgeTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);
    ctx.save();
    ctx.translate(64, 64);

    // Halo externo verde musgo escuro
    ctx.fillStyle = 'rgba(21, 128, 61, 0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo brilhante verde biohazard
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.25) {
      const rad = 32 + Math.sin(a * 6) * 6;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Gotas e bolhas radioativas
    ctx.fillStyle = '#86efac';
    [-18, 12, -4, 22].forEach((bx, idx) => {
      const by = [10, -16, 22, 6][idx];
      ctx.beginPath();
      ctx.arc(bx, by, 4.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
    this.toxicSludgeTexture = new THREE.CanvasTexture(canvas);
    return this.toxicSludgeTexture;
  }

  private static getSkidTexture(): THREE.CanvasTexture {
    if (this.skidTexture) return this.skidTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 256);

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(5, 5, 8, 0.0)');
    grad.addColorStop(0.3, 'rgba(5, 5, 8, 0.75)');
    grad.addColorStop(0.85, 'rgba(5, 5, 8, 0.9)');
    grad.addColorStop(1, 'rgba(10, 10, 15, 0.95)');

    ctx.fillStyle = grad;
    // Pista de pneu esquerda
    ctx.fillRect(24, 0, 18, 256);
    // Pista de pneu direita
    ctx.fillRect(86, 0, 18, 256);

    this.skidTexture = new THREE.CanvasTexture(canvas);
    return this.skidTexture;
  }

  private static getManholeTexture(): THREE.CanvasTexture {
    if (this.manholeTexture) return this.manholeTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);

    // Aro de ferro fundido
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();

    // Borda escura
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.fill();

    // Tampa com ranhuras em cruz / grade
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    for (let r = 16; r <= 46; r += 10) {
      ctx.beginPath();
      ctx.arc(64, 64, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(64, 14);
    ctx.lineTo(64, 114);
    ctx.moveTo(14, 64);
    ctx.lineTo(114, 64);
    ctx.stroke();

    this.manholeTexture = new THREE.CanvasTexture(canvas);
    return this.manholeTexture;
  }

  private static getHazardStripeTexture(): THREE.CanvasTexture {
    if (this.hazardStripeTexture) return this.hazardStripeTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#eab308'; // Amarelo industrial
    ctx.fillRect(0, 0, 128, 64);

    ctx.fillStyle = '#0f172a'; // Faixas pretas diagonais
    for (let x = -64; x < 192; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 18, 0);
      ctx.lineTo(x + 18 - 32, 64);
      ctx.lineTo(x - 32, 64);
      ctx.closePath();
      ctx.fill();
    }

    this.hazardStripeTexture = new THREE.CanvasTexture(canvas);
    this.hazardStripeTexture.wrapS = THREE.RepeatWrapping;
    this.hazardStripeTexture.wrapT = THREE.RepeatWrapping;
    return this.hazardStripeTexture;
  }

  private static getGlassShardsTexture(): THREE.CanvasTexture {
    if (this.glassShardsTexture) return this.glassShardsTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.75)';

    for (let i = 0; i < 35; i++) {
      const gx = 20 + Math.random() * 88;
      const gy = 20 + Math.random() * 88;
      const sz = 3 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + sz, gy + sz * 0.5);
      ctx.lineTo(gx + sz * 0.3, gy + sz * 1.2);
      ctx.closePath();
      ctx.fill();
    }

    this.glassShardsTexture = new THREE.CanvasTexture(canvas);
    return this.glassShardsTexture;
  }

  // ==========================================
  // CONSTRUÇÃO DO AMBIENTE
  // ==========================================

  // 1. Asfalto base urbano
  private buildCityGround(stage: number): void {
    const cycle = (stage - 1) % 5;
    let groundColor = 0x090d14;
    if (cycle === 1) groundColor = 0x141010; // Industrial/ferrugem
    else if (cycle === 2) groundColor = 0x07130e; // Esvaziado e tóxico
    else if (cycle === 3) groundColor = 0x160a0f; // Tom avermelhado decadente
    else if (cycle === 4) groundColor = 0x0b0507; // Zona de extermínio crítico

    const groundGeo = new THREE.PlaneGeometry(GAME_CONFIG.arena.size, GAME_CONFIG.arena.size);
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  // 2. Malha de Ruas e Avenidas Ampliadas com Calçadas e Pistas Múltiplas
  private buildCityStreetGrid(stage: number): void {
    const cycle = (stage - 1) % 5;
    // PARTE 3: Textura de asfalto noturno com reflexão e especularidade cinematográfica
    const roadMat = new THREE.MeshStandardMaterial({
      color: cycle === 1 ? 0x18171a : cycle === 3 ? 0x161014 : 0x0f151f,
      roughness: 0.65,
      metalness: 0.18,
    });

    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: cycle === 2 ? 0x1a2620 : cycle === 4 ? 0x221318 : 0x1e2837,
      roughness: 0.75,
      metalness: 0.08,
    });

    const mainAvenueWidth = 32;

    // Avenida Principal Leste-Oeste
    const aveX = new THREE.Mesh(new THREE.PlaneGeometry(GAME_CONFIG.arena.size, mainAvenueWidth), roadMat);
    aveX.rotation.x = -Math.PI / 2;
    aveX.position.y = 0.01;
    this.group.add(aveX);

    // Avenida Principal Norte-Sul
    const aveZ = new THREE.Mesh(new THREE.PlaneGeometry(mainAvenueWidth, GAME_CONFIG.arena.size), roadMat);
    aveZ.rotation.x = -Math.PI / 2;
    aveZ.position.y = 0.01;
    this.group.add(aveZ);

    // Ruas secundárias paralelas (formando uma grade urbana ampla)
    const subRoadW = 18;
    [-65, 65].forEach((offset) => {
      const subX = new THREE.Mesh(new THREE.PlaneGeometry(GAME_CONFIG.arena.size, subRoadW), roadMat);
      subX.rotation.x = -Math.PI / 2;
      subX.position.set(0, 0.01, offset);
      this.group.add(subX);

      const subZ = new THREE.Mesh(new THREE.PlaneGeometry(subRoadW, GAME_CONFIG.arena.size), roadMat);
      subZ.rotation.x = -Math.PI / 2;
      subZ.position.set(offset, 0.01, 0);
      this.group.add(subZ);
    });

    // Quarteirões ampliados (Calçadas)
    const curbs = [
      { x: -48, z: -48, w: 34, d: 34 },
      { x: 48, z: -48, w: 34, d: 34 },
      { x: -48, z: 48, w: 34, d: 34 },
      { x: 48, z: 48, w: 34, d: 34 },
    ];

    curbs.forEach((c) => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(c.w, c.d), sidewalkMat);
      sw.rotation.x = -Math.PI / 2;
      sw.position.set(c.x, 0.015, c.z);
      this.group.add(sw);

      // Meio-fio em cinza
      const edgeMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
      const edgeTop = new THREE.Mesh(new THREE.PlaneGeometry(c.w, 0.6), edgeMat);
      edgeTop.rotation.x = -Math.PI / 2;
      edgeTop.position.set(c.x, 0.017, c.z - c.d / 2);
      this.group.add(edgeTop);

      const edgeBottom = new THREE.Mesh(new THREE.PlaneGeometry(c.w, 0.6), edgeMat);
      edgeBottom.rotation.x = -Math.PI / 2;
      edgeBottom.position.set(c.x, 0.017, c.z + c.d / 2);
      this.group.add(edgeBottom);

      const edgeLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.6, c.d), edgeMat);
      edgeLeft.rotation.x = -Math.PI / 2;
      edgeLeft.position.set(c.x - c.w / 2, 0.017, c.z);
      this.group.add(edgeLeft);

      const edgeRight = new THREE.Mesh(new THREE.PlaneGeometry(0.6, c.d), edgeMat);
      edgeRight.rotation.x = -Math.PI / 2;
      edgeRight.position.set(c.x + c.w / 2, 0.017, c.z);
      this.group.add(edgeRight);
    });

    // Faixas de pedestre desgastadas
    const stripeMat = new THREE.MeshBasicMaterial({
      color: 0xc8d1dc,
      transparent: true,
      opacity: 0.85,
    });

    const crosswalks = [
      { x: 0, z: -18, horiz: true },
      { x: 0, z: 18, horiz: true },
      { x: -18, z: 0, horiz: false },
      { x: 18, z: 0, horiz: false },
    ];

    crosswalks.forEach((cw) => {
      for (let i = -12; i <= 12; i += 2.8) {
        if (cw.horiz) {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.2), stripeMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(cw.x + i, 0.02, cw.z);
          this.group.add(bar);
        } else {
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.4), stripeMat);
          bar.rotation.x = -Math.PI / 2;
          bar.position.set(cw.x, 0.02, cw.z + i);
          this.group.add(bar);
        }
      }
    });

    // Linhas amarelas tracejadas dividindo as pistas duplas
    const yellowDashMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, opacity: 0.8, transparent: true });
    for (let pos = -90; pos <= 90; pos += 8) {
      if (Math.abs(pos) < 20) continue;
      // Pistas principais
      const dashX1 = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.45), yellowDashMat);
      dashX1.rotation.x = -Math.PI / 2;
      dashX1.position.set(pos, 0.018, 0);
      this.group.add(dashX1);

      const dashZ1 = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 4.0), yellowDashMat);
      dashZ1.rotation.x = -Math.PI / 2;
      dashZ1.position.set(0, 0.018, pos);
      this.group.add(dashZ1);

      // Linhas nas vias secundárias
      const dashSubX = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 0.4), yellowDashMat);
      dashSubX.rotation.x = -Math.PI / 2;
      dashSubX.position.set(pos, 0.018, 65);
      this.group.add(dashSubX);

      const dashSubZ = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4.0), yellowDashMat);
      dashSubZ.rotation.x = -Math.PI / 2;
      dashSubZ.position.set(65, 0.018, pos);
      this.group.add(dashSubZ);
    }
  }

  // PARTE 3: Poças d'água reflexivas nas ruas (especularidade que reflete o luar e postes)
  private buildRainPuddles(_stage: number): void {
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x070c14,
      roughness: 0.1,
      metalness: 0.65,
      transparent: true,
      opacity: 0.85,
    });

    const puddleCoords = [
      { x: -5, z: 7, rx: 3.2, rz: 1.8, rot: 0.35 },
      { x: 9, z: -8, rx: 3.6, rz: 2.2, rot: -0.45 },
      { x: -14, z: -11, rx: 2.5, rz: 1.6, rot: 0.2 },
      { x: 11, z: 14, rx: 3.2, rz: 2.4, rot: 0.75 },
      { x: 0, z: -24, rx: 3.8, rz: 2.2, rot: 0.05 },
      { x: -26, z: 4, rx: 2.8, rz: 1.8, rot: -0.3 },
      { x: 25, z: -4, rx: 3.0, rz: 2.0, rot: 0.55 },
      { x: -7, z: 26, rx: 3.6, rz: 2.4, rot: -0.25 },
      { x: -38, z: 10, rx: 3.0, rz: 1.8, rot: 0.4 },
      { x: 36, z: -12, rx: 3.2, rz: 2.0, rot: -0.6 },
    ];

    puddleCoords.forEach((p) => {
      const pMesh = new THREE.Mesh(new THREE.PlaneGeometry(p.rx, p.rz), puddleMat);
      pMesh.rotation.x = -Math.PI / 2;
      pMesh.rotation.z = p.rot;
      pMesh.position.set(p.x, 0.016, p.z);
      this.group.add(pMesh);
    });
  }

  // 3. Edifícios 3D e Casas Residenciais Estilizados
  private buildCityBlocksAndRooftops(_stage: number): void {
    // ----------------------------------------------------
    // QUADRANTE 1 (Noroeste, x: -48, z: -48):
    // COMPLEXO CORPORATIVO & ARRANHA-CÉU COM HELIPONTO
    // ----------------------------------------------------
    // Edifício 1: Grande Torre Comercial com Antena de Rádio e Mureta
    this.createBuilding({
      x: -52,
      z: -52,
      w: 16,
      d: 15,
      h: 15,
      wallColor: 0x1e293b, // Aço/concreto urbano escuro
      type: 'office',
      hasParapet: true,
      hasAntenna: true,
      hasWaterTower: true,
      hasAwning: true,
      awningColor: 0x0284c7, // Azul executivo
    });

    // Edifício 2: Anexo Comercial com Heliponto no topo
    this.createBuilding({
      x: -35,
      z: -48,
      w: 11,
      d: 12,
      h: 7,
      wallColor: 0x334155, // Concreto cinza ardósia
      type: 'office',
      hasParapet: true,
      hasHelipad: true,
      hasAwning: true,
      awningColor: 0x3b82f6,
    });

    // ----------------------------------------------------
    // QUADRANTE 2 (Nordeste, x: 48, z: -48):
    // CENTRO HOSPITALAR DE QUARENTENA & CLÍNICA DE EMERGÊNCIA
    // ----------------------------------------------------
    // Edifício 3: Hospital Central de Emergência / Centro de Pesquisa
    this.createBuilding({
      x: 50,
      z: -52,
      w: 17,
      d: 15,
      h: 12,
      wallColor: 0x475569, // Cinza hospitalar com janelas azuladas
      type: 'hospital',
      hasParapet: true,
      hasWaterTower: true,
      hasAwning: true,
      awningColor: 0xdc2626, // Vermelho de emergência
    });

    // Edifício 4: Farmácia / Laboratório de Apoio Tático
    this.createBuilding({
      x: 35,
      z: -46,
      w: 10,
      d: 11,
      h: 5.5,
      wallColor: 0x1e3a8a, // Azul profundo
      type: 'store',
      hasParapet: true,
      hasAwning: true,
      awningColor: 0x16a34a, // Verde farmácia / saúde
    });

    // ----------------------------------------------------
    // QUADRANTE 3 (Sudoeste, x: -48, z: 48):
    // BAIRRO RESIDENCIAL SUBURBANO (CASAS COM TELHADO E VARANDA)
    // ----------------------------------------------------
    // Casa 1: Casa Familiar Clássica com Garagem, Telhado Telha Escura e Chaminé
    this.createHouse({
      x: -52,
      z: 42,
      w: 8.5,
      d: 7.5,
      h: 3.8,
      roofHeight: 2.2,
      wallColor: 0x78350f, // Madeira/tijolo amadeirado acolhedor
      roofColor: 0x1c1917, // Telhas ardósia cinza carvão
      hasChimney: true,
      hasPorch: true,
      hasGarage: true,
      garageOnRight: true,
    });

    // Casa 2: Casa Colonial de Tijolos com Varanda Ampla e Chaminé
    this.createHouse({
      x: -36,
      z: 42,
      w: 7.5,
      d: 7.0,
      h: 4.4,
      roofHeight: 2.0,
      wallColor: 0x991b1b, // Vermelho tijolo aparente colonial
      roofColor: 0x451a03, // Telhas marrom terracota
      hasChimney: true,
      hasPorch: true,
      hasGarage: false,
    });

    // Casa 3: Bangalô Suburbano Aconchegante com Telhado Verde Musgo
    this.createHouse({
      x: -46,
      z: 56,
      w: 8.0,
      d: 6.8,
      h: 3.6,
      roofHeight: 2.0,
      wallColor: 0x1e293b, // Madeira escura estilizada
      roofColor: 0x064e3b, // Telhado verde escuro floresta
      hasChimney: true,
      hasPorch: true,
      hasGarage: false,
    });

    // ----------------------------------------------------
    // QUADRANTE 4 (Sudeste, x: 48, z: 48):
    // SETOR MISTO: LOJA DE CONVENIÊNCIA & CASAS URBANAS
    // ----------------------------------------------------
    // Edifício 5: Mercadinho / Conveniência de Posto 24 Horas
    this.createBuilding({
      x: 37,
      z: 42,
      w: 11,
      d: 9,
      h: 4.5,
      wallColor: 0x334155,
      type: 'store',
      hasParapet: true,
      hasAwning: true,
      awningColor: 0xf59e0b, // Laranja vibrante de loja de conveniência
    });

    // Casa 4: Casa de Dois Andares com Varanda
    this.createHouse({
      x: 54,
      z: 42,
      w: 8.0,
      d: 7.2,
      h: 5.0,
      roofHeight: 2.2,
      wallColor: 0x475569, // Pintura azul acinzentada moderna
      roofColor: 0x0f172a, // Telhas pretas
      hasChimney: true,
      hasPorch: true,
      hasGarage: false,
    });

    // Casa 5: Casa Residencial de Esquina
    this.createHouse({
      x: 44,
      z: 56,
      w: 8.5,
      d: 7.0,
      h: 3.8,
      roofHeight: 2.1,
      wallColor: 0x854d0e, // Tom ocre / terracota claro
      roofColor: 0x292524, // Telhas de pedra
      hasChimney: true,
      hasPorch: true,
      hasGarage: true,
      garageOnRight: false,
    });

    // ----------------------------------------------------
    // HORIZONTE NORTE (SKYLINE DE ARRANHA-CÉUS AO FUNDO)
    // Dá profundidade cinematográfica épica sem atrapalhar a pista
    // ----------------------------------------------------
    const skylineDefs = [
      { x: -24, z: -78, w: 16, d: 12, h: 22, col: 0x0f172a },
      { x: 0, z: -80, w: 18, d: 14, h: 26, col: 0x111827 },
      { x: 24, z: -78, w: 15, d: 12, h: 20, col: 0x0f172a },
    ];
    skylineDefs.forEach((sk) => {
      this.createBuilding({
        x: sk.x,
        z: sk.z,
        w: sk.w,
        d: sk.d,
        h: sk.h,
        wallColor: sk.col,
        hasParapet: true,
        hasAntenna: true,
      });
    });
  }

  // Construtor de Edifícios 3D Urbanos
  private createBuilding(opts: {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    wallColor: number;
    type?: 'office' | 'hospital' | 'store' | 'skyline';
    hasParapet?: boolean;
    hasWaterTower?: boolean;
    hasAntenna?: boolean;
    hasHelipad?: boolean;
    hasAwning?: boolean;
    awningColor?: number;
  }): void {
    const bGroup = new THREE.Group();

    // 1. Corpo principal do edifício
    const wallMat = new THREE.MeshStandardMaterial({
      color: opts.wallColor,
      roughness: 0.82,
      metalness: 0.18,
    });
    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(opts.w, opts.h, opts.d), wallMat);
    bodyMesh.position.y = opts.h / 2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bGroup.add(bodyMesh);

    // 2. Base reforçada em concreto escuro
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(opts.w + 0.4, 0.4, opts.d + 0.4), baseMat);
    baseMesh.position.y = 0.2;
    bGroup.add(baseMesh);

    // 3. Janelas distribuídas nas fachadas visíveis (face Sul / Z positivo)
    const litColors = [0xfef08a, 0x93c5fd, 0x38bdf8, 0x64748b, 0x0f172a, 0x0f172a];
    const windowWidth = 1.3;
    const windowHeight = 1.6;
    const spacingX = 2.4;
    const spacingY = 2.4;
    const numRows = Math.max(1, Math.floor((opts.h - 3.0) / spacingY));
    const numColsFront = Math.max(1, Math.floor((opts.w - 2.5) / spacingX));

    for (let r = 0; r < numRows; r++) {
      const wy = 2.4 + r * spacingY;
      for (let c = 0; c < numColsFront; c++) {
        const wx = -(numColsFront - 1) * (spacingX / 2) + c * spacingX;
        const color = litColors[(r * 5 + c * 3 + Math.floor(Math.abs(opts.x) + Math.abs(opts.z))) % litColors.length];
        const isLit = color === 0xfef08a || color === 0x93c5fd || color === 0x38bdf8;
        const winMat = isLit
          ? new THREE.MeshBasicMaterial({ color })
          : new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2, metalness: 0.8 });

        const win = new THREE.Mesh(new THREE.PlaneGeometry(windowWidth, windowHeight), winMat);
        win.position.set(wx, wy, opts.d / 2 + 0.02);
        bGroup.add(win);

        // Moldura fina da janela
        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(windowWidth + 0.2, windowHeight + 0.2),
          new THREE.MeshBasicMaterial({ color: 0x1e293b })
        );
        frame.position.set(wx, wy, opts.d / 2 + 0.01);
        bGroup.add(frame);
      }
    }

    // 4. Porta de entrada no térreo
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    doorFrame.position.set(0, 1.15, opts.d / 2 + 0.08);
    bGroup.add(doorFrame);

    const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
    doorGlass.position.set(0, 1.15, opts.d / 2 + 0.19);
    bGroup.add(doorGlass);

    // 5. Toldo / Marquise de entrada
    if (opts.hasAwning) {
      const awnColor = opts.awningColor ?? 0xdc2626;
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(opts.w * 0.45, 0.18, 2.2),
        new THREE.MeshStandardMaterial({ color: awnColor, roughness: 0.6 })
      );
      awning.position.set(0, 2.7, opts.d / 2 + 1.1);
      awning.rotation.x = 0.08;
      bGroup.add(awning);
    }

    // 6. Telhado com Mureta / Parapeito
    if (opts.hasParapet ?? true) {
      const parapetMat = new THREE.MeshStandardMaterial({ color: opts.wallColor, roughness: 0.85 });
      const pThickness = 0.35;
      const pHeight = 0.65;

      const pFront = new THREE.Mesh(new THREE.BoxGeometry(opts.w, pHeight, pThickness), parapetMat);
      pFront.position.set(0, opts.h + pHeight / 2, opts.d / 2 - pThickness / 2);
      bGroup.add(pFront);

      const pBack = new THREE.Mesh(new THREE.BoxGeometry(opts.w, pHeight, pThickness), parapetMat);
      pBack.position.set(0, opts.h + pHeight / 2, -opts.d / 2 + pThickness / 2);
      bGroup.add(pBack);

      const pLeft = new THREE.Mesh(new THREE.BoxGeometry(pThickness, pHeight, opts.d), parapetMat);
      pLeft.position.set(-opts.w / 2 + pThickness / 2, opts.h + pHeight / 2, 0);
      bGroup.add(pLeft);

      const pRight = new THREE.Mesh(new THREE.BoxGeometry(pThickness, pHeight, opts.d), parapetMat);
      pRight.position.set(opts.w / 2 - pThickness / 2, opts.h + pHeight / 2, 0);
      bGroup.add(pRight);

      // Piso escuro de cascalho do teto
      const roofFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(opts.w - 0.7, opts.d - 0.7),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 })
      );
      roofFloor.rotation.x = -Math.PI / 2;
      roofFloor.position.set(0, opts.h + 0.02, 0);
      bGroup.add(roofFloor);
    }

    // 7. Equipamentos de Cobertura (HVAC)
    const acMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75, metalness: 0.3 });
    const ac = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.5), acMat);
    ac.position.set(-opts.w * 0.25, opts.h + 0.6, -opts.d * 0.2);
    ac.castShadow = true;
    bGroup.add(ac);

    const acFan = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    acFan.position.set(-opts.w * 0.25, opts.h + 1.22, -opts.d * 0.2);
    bGroup.add(acFan);

    // 8. Caixa d'água elevada
    if (opts.hasWaterTower) {
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
      const towerLegs = [-0.9, 0.9];
      towerLegs.forEach((lx) => {
        towerLegs.forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2), legMat);
          leg.position.set(opts.w * 0.25 + lx, opts.h + 1.1, opts.d * 0.2 + lz);
          bGroup.add(leg);
        });
      });

      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 2.0, 16),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 })
      );
      tank.position.set(opts.w * 0.25, opts.h + 2.8, opts.d * 0.2);
      tank.castShadow = true;
      bGroup.add(tank);

      const tankCone = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
      );
      tankCone.position.set(opts.w * 0.25, opts.h + 4.2, opts.d * 0.2);
      bGroup.add(tankCone);
    }

    // 9. Antena com luz de balizamento vermelha
    if (opts.hasAntenna) {
      const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
      const antMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 5.0, 8), antMat);
      antMast.position.set(opts.w * 0.3, opts.h + 2.5, -opts.d * 0.3);
      bGroup.add(antMast);

      const redLightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      redLightMesh.position.set(opts.w * 0.3, opts.h + 5.0, -opts.d * 0.3);
      bGroup.add(redLightMesh);

      const beaconLight = new THREE.PointLight(0xef4444, 1.2, 10);
      beaconLight.position.set(opts.w * 0.3, opts.h + 5.1, -opts.d * 0.3);
      bGroup.add(beaconLight);
    }

    // 10. Heliponto
    if (opts.hasHelipad) {
      const heliCircle = new THREE.Mesh(
        new THREE.RingGeometry(3.6, 4.2, 24),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
      );
      heliCircle.rotation.x = -Math.PI / 2;
      heliCircle.position.set(0, opts.h + 0.05, 0);
      bGroup.add(heliCircle);

      const hH1 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      hH1.rotation.x = -Math.PI / 2;
      hH1.position.set(-1.1, opts.h + 0.06, 0);
      bGroup.add(hH1);

      const hH2 = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 3.8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      hH2.rotation.x = -Math.PI / 2;
      hH2.position.set(1.1, opts.h + 0.06, 0);
      bGroup.add(hH2);

      const hMid = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
      hMid.rotation.x = -Math.PI / 2;
      hMid.position.set(0, opts.h + 0.06, 0);
      bGroup.add(hMid);
    }

    bGroup.position.set(opts.x, 0, opts.z);
    this.group.add(bGroup);

    // Registro de Colisão
    const bBox = new THREE.Box3();
    bBox.setFromCenterAndSize(
      new THREE.Vector3(opts.x, opts.h / 2, opts.z),
      new THREE.Vector3(opts.w, opts.h, opts.d)
    );
    this.obstacles.push(bBox);
  }

  // Construtor de Casas Residenciais 3D
  private createHouse(opts: {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    roofHeight?: number;
    wallColor: number;
    roofColor: number;
    rot?: number;
    hasChimney?: boolean;
    hasPorch?: boolean;
    hasGarage?: boolean;
    garageOnRight?: boolean;
  }): void {
    const hGroup = new THREE.Group();
    const rot = opts.rot ?? 0;

    // 1. Paredes principais da casa
    const wallMat = new THREE.MeshStandardMaterial({
      color: opts.wallColor,
      roughness: 0.86,
    });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(opts.w, opts.h, opts.d), wallMat);
    mainBody.position.y = opts.h / 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    hGroup.add(mainBody);

    // 2. Telhado de duas águas (Gable Roof)
    const rh = opts.roofHeight ?? Math.min(opts.w * 0.42, 2.8);
    const eavesW = opts.w + 0.8;
    const eavesD = opts.d + 0.8;

    const roofShape = new THREE.Shape();
    roofShape.moveTo(-eavesW / 2, 0);
    roofShape.lineTo(0, rh);
    roofShape.lineTo(eavesW / 2, 0);
    roofShape.closePath();

    const roofGeom = new THREE.ExtrudeGeometry(roofShape, {
      depth: eavesD,
      bevelEnabled: false,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: opts.roofColor,
      roughness: 0.72,
    });
    const roofMesh = new THREE.Mesh(roofGeom, roofMat);
    roofMesh.position.set(0, opts.h, -eavesD / 2);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    hGroup.add(roofMesh);

    // Triângulos das empenas (fechamento sob o telhado na frente e atrás)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-opts.w / 2, 0);
    gableShape.lineTo(0, rh * (opts.w / eavesW));
    gableShape.lineTo(opts.w / 2, 0);
    gableShape.closePath();
    const gableMat = new THREE.MeshStandardMaterial({ color: opts.wallColor, roughness: 0.86 });

    const frontGable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), gableMat);
    frontGable.position.set(0, opts.h, opts.d / 2 + 0.01);
    hGroup.add(frontGable);

    const backGable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), gableMat);
    backGable.rotation.y = Math.PI;
    backGable.position.set(0, opts.h, -opts.d / 2 - 0.01);
    hGroup.add(backGable);

    // 3. Janelas Residenciais
    const winMatWarm = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Luz quente caseira
    const winMatDark = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    [-opts.w * 0.28, opts.w * 0.28].forEach((wx, idx) => {
      const isLit = idx === 0 || Math.floor(Math.abs(opts.x) + Math.abs(opts.z)) % 2 === 0;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), isLit ? winMatWarm : winMatDark);
      win.position.set(wx, 1.8, opts.d / 2 + 0.02);
      hGroup.add(win);

      // Venezianas laterais
      const shutterL = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.4), shutterMat);
      shutterL.position.set(wx - 0.75, 1.8, opts.d / 2 + 0.025);
      hGroup.add(shutterL);

      const shutterR = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.4), shutterMat);
      shutterR.position.set(wx + 0.75, 1.8, opts.d / 2 + 0.025);
      hGroup.add(shutterR);
    });

    // 4. Porta de Entrada e Varanda (Porch)
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x3f2e18, roughness: 0.7 })
    );
    door.position.set(0, 1.05, opts.d / 2 + 0.02);
    hGroup.add(door);

    if (opts.hasPorch ?? true) {
      const porchFloor = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.2, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 })
      );
      porchFloor.position.set(0, 0.1, opts.d / 2 + 0.8);
      hGroup.add(porchFloor);

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
      [-1.1, 1.1].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), pillarMat);
        pillar.position.set(px, 1.2, opts.d / 2 + 1.45);
        pillar.castShadow = true;
        hGroup.add(pillar);
      });

      const porchRoof = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.15, 1.7),
        new THREE.MeshStandardMaterial({ color: opts.roofColor, roughness: 0.75 })
      );
      porchRoof.position.set(0, 2.3, opts.d / 2 + 0.85);
      porchRoof.rotation.x = 0.12;
      porchRoof.castShadow = true;
      hGroup.add(porchRoof);
    }

    // 5. Chaminé de Tijolos
    if (opts.hasChimney ?? true) {
      const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 });
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, rh + 1.4, 0.8), chimneyMat);
      chimney.position.set(opts.w * 0.28, opts.h + rh * 0.5, opts.d * 0.12);
      chimney.castShadow = true;
      hGroup.add(chimney);

      const chimneyCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.12, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      chimneyCap.position.set(opts.w * 0.28, opts.h + rh + 0.75, opts.d * 0.12);
      hGroup.add(chimneyCap);
    }

    // 6. Garagem Anexa
    let extraGarageWidth = 0;
    if (opts.hasGarage) {
      extraGarageWidth = 4.2;
      const gw = 4.0;
      const gh = 2.6;
      const gd = opts.d - 0.6;
      const gx = (opts.w / 2 + gw / 2) * (opts.garageOnRight ? 1 : -1);

      const garageMesh = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), wallMat);
      garageMesh.position.set(gx, gh / 2, 0);
      garageMesh.castShadow = true;
      garageMesh.receiveShadow = true;
      hGroup.add(garageMesh);

      const garageRoof = new THREE.Mesh(
        new THREE.BoxGeometry(gw + 0.4, 0.15, gd + 0.4),
        new THREE.MeshStandardMaterial({ color: opts.roofColor, roughness: 0.75 })
      );
      garageRoof.position.set(gx, gh + 0.08, 0);
      garageRoof.rotation.z = opts.garageOnRight ? -0.15 : 0.15;
      hGroup.add(garageRoof);

      const doorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });
      const gDoor = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.1), doorMat);
      gDoor.position.set(gx, 1.05, gd / 2 + 0.02);
      hGroup.add(gDoor);
    }

    hGroup.position.set(opts.x, 0, opts.z);
    hGroup.rotation.y = rot;
    this.group.add(hGroup);

    // Registro de Colisão
    const totalW = opts.w + extraGarageWidth;
    const isRot90 = Math.abs(rot - Math.PI / 2) < 0.1 || Math.abs(rot + Math.PI / 2) < 0.1;
    const effW = isRot90 ? opts.d : totalW;
    const effD = isRot90 ? totalW : opts.d;

    const hBox = new THREE.Box3();
    hBox.setFromCenterAndSize(
      new THREE.Vector3(opts.x, (opts.h + rh) / 2, opts.z),
      new THREE.Vector3(effW, opts.h + rh, effD)
    );
    this.obstacles.push(hBox);
  }

  // 4. Marcas de Frenagem no Asfalto
  private buildSkidMarks(_stage: number): void {
    const skidMat = new THREE.MeshBasicMaterial({
      map: Environment.getSkidTexture(),
      transparent: true,
      opacity: 0.8,
    });

    const skidPositions = [
      { x: -14, z: -10, rot: 0.35, len: 12 },
      { x: 18, z: 12, rot: -0.65, len: 14 },
      { x: -28, z: 8, rot: 1.35, len: 10 },
      { x: 24, z: -18, rot: -1.1, len: 16 },
      { x: 0, z: -35, rot: 0.0, len: 18 },
      { x: -40, z: 22, rot: 0.8, len: 12 },
      { x: 38, z: 32, rot: -0.9, len: 15 },
    ];

    skidPositions.forEach((sp) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, sp.len), skidMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = sp.rot;
      mesh.position.set(sp.x, 0.02, sp.z);
      this.group.add(mesh);
    });
  }

  // ==========================================
  // VEÍCULOS 3D PÓS-APOCALÍPTICOS DETALHADOS
  // ==========================================

  private createVehicleMesh(def: VehicleDef): THREE.Group {
    const vGroup = new THREE.Group();
    const isBus = def.type === 'bus';
    const isMilitary = def.type === 'military';
    const isFlipped = def.type === 'flipped';
    const isWreck = def.type === 'wreck';

    const length = isBus ? 9.2 : isMilitary ? 5.2 : 4.6;
    const width = isBus ? 3.0 : isMilitary ? 2.6 : 2.2;
    const height = isBus ? 1.3 : isMilitary ? 1.15 : 0.95;

    // Cores temáticas
    let bodyCol = def.color ?? 0x334155;
    if (def.type === 'police') bodyCol = 0x0284c7; // Azul polícia tático
    else if (def.type === 'ambulance') bodyCol = 0xf8fafc; // Branco hospitalar
    else if (def.type === 'taxi') bodyCol = 0xfacc15; // Amarelo táxi
    else if (def.type === 'military') bodyCol = 0x365314; // Verde camuflado militar
    else if (def.type === 'wreck') bodyCol = 0x1c1917; // Metal carbonizado
    else if (def.type === 'flipped') bodyCol = 0x475569; // Sedan acidentado

    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyCol,
      roughness: isWreck ? 0.95 : 0.65,
      metalness: isWreck ? 0.05 : 0.25,
    });

    const glassMat = new THREE.MeshBasicMaterial({ color: isWreck ? 0x050505 : 0x0a1120 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.95 });

    // Sombra suave sob o veículo
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(length + 0.6, width + 0.6),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.021;
    vGroup.add(shadow);

    // Sub-grupo do carro para suportar rotação de capotamento se flipped
    const carMeshContainer = new THREE.Group();

    // 1. Chassi inferior
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(length, height * 0.55, width), bodyMat);
    chassis.position.y = height * 0.35;
    carMeshContainer.add(chassis);

    // 2. Cabine superior / teto
    if (!isBus) {
      const cabinLen = length * 0.52;
      const cabinWidth = width * 0.88;
      const cabinHeight = height * 0.5;
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinLen, cabinHeight, cabinWidth), bodyMat);
      cabin.position.set(-length * 0.08, height * 0.75, 0);
      carMeshContainer.add(cabin);

      // Para-brisa frontal escurecido
      const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinWidth * 0.95, cabinHeight * 0.85), glassMat);
      frontGlass.rotation.y = Math.PI / 2;
      frontGlass.position.set(cabinLen * 0.5 + 0.01 - length * 0.08, height * 0.75, 0);
      carMeshContainer.add(frontGlass);

      // Vidro traseiro
      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinWidth * 0.9, cabinHeight * 0.75), glassMat);
      rearGlass.rotation.y = -Math.PI / 2;
      rearGlass.position.set(-cabinLen * 0.5 - 0.01 - length * 0.08, height * 0.75, 0);
      carMeshContainer.add(rearGlass);
    } else {
      // Ônibus: Cabine longa com janelas
      const busRoof = new THREE.Mesh(new THREE.BoxGeometry(length * 0.94, height * 0.5, width * 0.92), bodyMat);
      busRoof.position.set(0, height * 0.75, 0);
      carMeshContainer.add(busRoof);

      // Faixas de janelas nas laterais do ônibus
      const sideGlassMat = new THREE.MeshBasicMaterial({ color: 0x050d1a });
      const winL = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.85, height * 0.35), sideGlassMat);
      winL.position.set(0, height * 0.78, width * 0.465);
      carMeshContainer.add(winL);

      const winR = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.85, height * 0.35), sideGlassMat);
      winR.rotation.y = Math.PI;
      winR.position.set(0, height * 0.78, -width * 0.465);
      carMeshContainer.add(winR);
    }

    // 3. Para-choques táticos
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.35, height * 0.3, width * 1.02), bumperMat);
    frontBumper.position.set(length * 0.5, height * 0.2, 0);
    carMeshContainer.add(frontBumper);

    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.35, height * 0.3, width * 1.02), bumperMat);
    rearBumper.position.set(-length * 0.5, height * 0.2, 0);
    carMeshContainer.add(rearBumper);

    // 4. Rodas nos 4 cantos
    const wheelGeo = new THREE.BoxGeometry(0.85, height * 0.45, 0.35);
    const wX = length * 0.32;
    const wZ = width * 0.48;
    [-wX, wX].forEach((wx) => {
      [-wZ, wZ].forEach((wz) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.position.set(wx, height * 0.22, wz);
        carMeshContainer.add(wheel);
      });
    });

    // 5. Faróis dianteiros e lanternas traseiras
    const lightMatHead = new THREE.MeshBasicMaterial({ color: isWreck ? 0x222222 : 0xfef08a });
    const lightMatTail = new THREE.MeshBasicMaterial({ color: isWreck ? 0x222222 : 0xef4444 });

    const fLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), lightMatHead);
    fLight1.position.set(length * 0.51, height * 0.4, width * 0.32);
    carMeshContainer.add(fLight1);
    const fLight2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), lightMatHead);
    fLight2.position.set(length * 0.51, height * 0.4, -width * 0.32);
    carMeshContainer.add(fLight2);

    const rLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), lightMatTail);
    rLight1.position.set(-length * 0.51, height * 0.4, width * 0.32);
    carMeshContainer.add(rLight1);
    const rLight2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), lightMatTail);
    rLight2.position.set(-length * 0.51, height * 0.4, -width * 0.32);
    carMeshContainer.add(rLight2);

    // Detalhes especiais por tipo de veículo:
    if (def.type === 'police') {
      // Giroflex policial
      const sirenBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.2), new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
      sirenBar.position.set(-length * 0.08, height + 0.08, 0);
      carMeshContainer.add(sirenBar);

      // Luzes piscantes
      const sirenLight = new THREE.PointLight(0xef4444, 2.0, 10, 1.4);
      sirenLight.position.set(-length * 0.08, height + 0.4, 0);
      carMeshContainer.add(sirenLight);
      this.floorLights.push(sirenLight);
      this.animatedSirens.push({ light: sirenLight, colA: 0xef4444, colB: 0x0284c7, timer: Math.random() * 5 });
    } else if (def.type === 'ambulance') {
      // Cruz vermelha médica nas laterais
      const crossMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
      const sideStripe = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.7, 0.3), crossMat);
      sideStripe.position.set(0, height * 0.45, width * 0.505);
      carMeshContainer.add(sideStripe);

      const sideStripe2 = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.7, 0.3), crossMat);
      sideStripe2.rotation.y = Math.PI;
      sideStripe2.position.set(0, height * 0.45, -width * 0.505);
      carMeshContainer.add(sideStripe2);

      // Giroflex vermelho
      const ambLight = new THREE.PointLight(0xdc2626, 1.8, 9, 1.4);
      ambLight.position.set(-length * 0.08, height + 0.3, 0);
      carMeshContainer.add(ambLight);
      this.floorLights.push(ambLight);
      this.animatedSirens.push({ light: ambLight, colA: 0xdc2626, colB: 0xffffff, timer: Math.random() * 5 });
    } else if (def.type === 'taxi') {
      // Letreiro no teto
      const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      taxiSign.position.set(-length * 0.08, height + 0.09, 0);
      carMeshContainer.add(taxiSign);
    } else if (def.type === 'military') {
      // Escotilha blindada / montagem de torreta
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 12), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }));
      hatch.position.set(-length * 0.08, height + 0.08, 0);
      carMeshContainer.add(hatch);
    } else if (def.type === 'wreck') {
      // Carro carbonizado com fumaça / brasa sutil
      const emberLight = new THREE.PointLight(0xf97316, 1.0, 5.0, 1.5);
      emberLight.position.set(length * 0.2, height * 0.3, 0);
      carMeshContainer.add(emberLight);
      this.floorLights.push(emberLight);
      this.animatedFires.push({ light: emberLight, baseIntensity: 1.0, phase: Math.random() * 10 });
    }

    // Se o carro estiver capotado, gira de lado e adiciona cacos de vidro no asfalto
    if (isFlipped) {
      carMeshContainer.rotation.z = Math.PI / 2.2;
      carMeshContainer.position.y = width * 0.4;

      const glassMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 4.5),
        new THREE.MeshBasicMaterial({
          map: Environment.getGlassShardsTexture(),
          transparent: true,
          opacity: 0.85,
        })
      );
      glassMesh.rotation.x = -Math.PI / 2;
      glassMesh.position.set(0, 0.022, 0);
      vGroup.add(glassMesh);
    }

    vGroup.add(carMeshContainer);
    vGroup.position.set(def.x, 0, def.z);
    vGroup.rotation.y = def.rot;
    this.group.add(vGroup);

    // Registro de Colisão Sólida
    const sin = Math.abs(Math.sin(def.rot));
    const cos = Math.abs(Math.cos(def.rot));
    const boundX = length * cos + width * sin;
    const boundZ = length * sin + width * cos;

    const carBox = new THREE.Box3();
    carBox.setFromCenterAndSize(
      new THREE.Vector3(def.x, 0.9, def.z),
      new THREE.Vector3(boundX * 0.92, 1.8, boundZ * 0.92)
    );
    this.obstacles.push(carBox);

    return vGroup;
  }

  // 5. Veículos Abandonados e Engarrafamento em Massa por Fase
  private buildStreetVehicles(stage: number): void {
    const vehiclesByStage: Record<number, VehicleDef[]> = {
      // FASE 1: O Cruzamento Central (Panico inicial, táxis abandonados, ambulâncias e viaturas de contenção)
      1: [
        // Bloqueio policial no cruzamento oeste
        { x: -16, z: -8, rot: 0.4, type: 'police' },
        { x: -14, z: 8, rot: -0.3, type: 'police' },
        { x: -28, z: 0, rot: 1.57, type: 'ambulance' },
        // Engarrafamento de fuga ao leste
        { x: 18, z: -10, rot: -0.7, type: 'taxi' },
        { x: 26, z: -14, rot: -0.5, type: 'sedan', color: 0x1e293b },
        { x: 16, z: 12, rot: 0.8, type: 'wagon', color: 0x7c2d12 },
        { x: 28, z: 10, rot: 0.6, type: 'sedan', color: 0x064e3b },
        // Veículos batidos no cruzamento central
        { x: -4, z: -14, rot: 1.2, type: 'wreck' },
        { x: 4, z: 14, rot: -1.3, type: 'flipped' },
        { x: 8, z: -4, rot: 0.2, type: 'sedan', color: 0x334155 },
        // Acesso norte e sul
        { x: -10, z: -38, rot: 0.1, type: 'taxi' },
        { x: 12, z: -42, rot: -0.2, type: 'sedan', color: 0x581c87 },
        { x: -12, z: 38, rot: 1.6, type: 'police' },
        { x: 14, z: 42, rot: -1.4, type: 'ambulance' },
        // Ônibus de evacuação atravessado na avenida norte
        { x: 0, z: -60, rot: 1.57, type: 'bus' },
        // Veículos adicionais periféricos
        { x: -42, z: -18, rot: 0.9, type: 'wreck' },
        { x: -48, z: 16, rot: -0.4, type: 'sedan', color: 0x3f3f46 },
        { x: 42, z: -18, rot: -0.8, type: 'taxi' },
        { x: 48, z: 18, rot: 0.5, type: 'sedan', color: 0x1c1917 },
        { x: -20, z: 58, rot: 1.3, type: 'wagon', color: 0x451a03 },
        { x: 22, z: -58, rot: -0.3, type: 'wreck' },
        { x: 0, z: 56, rot: 1.5, type: 'military' },
      ],

      // FASE 2: Distrito Industrial Quarentenado (Blindados, caminhonetes, viaturas e destruição)
      2: [
        { x: -14, z: -14, rot: 0.6, type: 'military' },
        { x: 14, z: 14, rot: -0.6, type: 'military' },
        { x: -22, z: 12, rot: 1.4, type: 'wreck' },
        { x: 22, z: -12, rot: -1.4, type: 'flipped' },
        { x: -8, z: 28, rot: 0.1, type: 'police' },
        { x: 8, z: -28, rot: -0.2, type: 'ambulance' },
        { x: -32, z: -10, rot: 1.5, type: 'wagon', color: 0x78350f },
        { x: 32, z: 12, rot: -1.5, type: 'sedan', color: 0x14532d },
        { x: -40, z: 24, rot: 0.4, type: 'wreck' },
        { x: 40, z: -24, rot: -0.4, type: 'wreck' },
        { x: -18, z: -45, rot: 0.9, type: 'taxi' },
        { x: 18, z: 45, rot: -0.9, type: 'sedan', color: 0x312e81 },
        { x: 0, z: 52, rot: 1.57, type: 'bus' },
        { x: -55, z: 0, rot: 0.0, type: 'bus' },
        { x: -28, z: -32, rot: 0.7, type: 'military' },
        { x: 28, z: 32, rot: -0.7, type: 'police' },
        { x: -45, z: -45, rot: 1.2, type: 'wreck' },
        { x: 45, z: 45, rot: -1.2, type: 'flipped' },
        { x: 52, z: -8, rot: 0.3, type: 'ambulance' },
        { x: -52, z: 8, rot: -0.3, type: 'taxi' },
        { x: -6, z: -18, rot: 0.8, type: 'wreck' },
        { x: 6, z: 18, rot: -0.8, type: 'wreck' },
        { x: -25, z: 50, rot: 1.3, type: 'sedan', color: 0x581c87 },
        { x: 25, z: -50, rot: -1.3, type: 'wagon', color: 0x1e3a8a },
      ],

      // FASE 3: Subúrbio Tóxico Subterrâneo (Vazamento químico, viaturas corrosivas e ônibus tombados)
      3: [
        { x: -18, z: -16, rot: 0.4, type: 'ambulance' },
        { x: 18, z: 16, rot: -0.4, type: 'ambulance' },
        { x: -24, z: 24, rot: 1.2, type: 'military' },
        { x: 24, z: -24, rot: -1.2, type: 'military' },
        { x: 0, z: -22, rot: 1.57, type: 'wreck' },
        { x: 0, z: 22, rot: 1.57, type: 'flipped' },
        { x: -36, z: -8, rot: 0.8, type: 'police' },
        { x: 36, z: 8, rot: -0.8, type: 'police' },
        { x: -12, z: 36, rot: 0.2, type: 'wreck' },
        { x: 12, z: -36, rot: -0.2, type: 'wreck' },
        { x: -48, z: 28, rot: 1.3, type: 'taxi' },
        { x: 48, z: -28, rot: -1.3, type: 'sedan', color: 0x064e3b },
        { x: 55, z: 0, rot: 0.0, type: 'bus' },
        { x: -55, z: 12, rot: 1.4, type: 'bus' },
        { x: -30, z: -40, rot: 0.5, type: 'wreck' },
        { x: 30, z: 40, rot: -0.5, type: 'wreck' },
        { x: -8, z: -55, rot: 0.1, type: 'ambulance' },
        { x: 8, z: 55, rot: -0.1, type: 'military' },
        { x: -42, z: -30, rot: 1.1, type: 'flipped' },
        { x: 42, z: 30, rot: -1.1, type: 'wreck' },
        { x: -2, z: 8, rot: 0.7, type: 'sedan', color: 0x4c0519 },
        { x: 2, z: -8, rot: -0.7, type: 'wagon', color: 0x1f2937 },
        { x: -60, z: -45, rot: 1.5, type: 'wreck' },
        { x: 60, z: 45, rot: -1.5, type: 'wreck' },
        { x: 38, z: -52, rot: -0.6, type: 'taxi' },
        { x: -38, z: 52, rot: 0.6, type: 'police' },
      ],

      // FASE 4: Avenida Vermelha dos Condenados (Cemitério de veículos carbonizados e barreiras de contenção)
      4: [
        { x: -12, z: -10, rot: 0.5, type: 'wreck' },
        { x: 12, z: 10, rot: -0.5, type: 'wreck' },
        { x: -10, z: 14, rot: 1.2, type: 'flipped' },
        { x: 10, z: -14, rot: -1.2, type: 'wreck' },
        { x: -24, z: -18, rot: 0.8, type: 'military' },
        { x: 24, z: 18, rot: -0.8, type: 'military' },
        { x: -28, z: 22, rot: 1.5, type: 'police' },
        { x: 28, z: -22, rot: -1.5, type: 'police' },
        { x: 0, z: 34, rot: 1.57, type: 'bus' },
        { x: 0, z: -34, rot: 1.57, type: 'bus' },
        { x: -42, z: 8, rot: 0.3, type: 'ambulance' },
        { x: 42, z: -8, rot: -0.3, type: 'ambulance' },
        { x: -38, z: -35, rot: 1.1, type: 'wreck' },
        { x: 38, z: 35, rot: -1.1, type: 'flipped' },
        { x: -16, z: 50, rot: 0.6, type: 'wreck' },
        { x: 16, z: -50, rot: -0.6, type: 'wreck' },
        { x: -52, z: 32, rot: 1.4, type: 'wreck' },
        { x: 52, z: -32, rot: -1.4, type: 'wreck' },
        { x: -50, z: -18, rot: 0.2, type: 'military' },
        { x: 50, z: 18, rot: -0.2, type: 'police' },
        { x: -22, z: -55, rot: 0.9, type: 'taxi' },
        { x: 22, z: 55, rot: -0.9, type: 'wagon', color: 0x7c2d12 },
        { x: 4, z: -6, rot: 0.8, type: 'wreck' },
        { x: -4, z: 6, rot: -0.8, type: 'wreck' },
        { x: -60, z: -10, rot: 1.5, type: 'flipped' },
        { x: 60, z: 10, rot: -1.5, type: 'wreck' },
        { x: -35, z: 55, rot: 0.4, type: 'wreck' },
        { x: 35, z: -55, rot: -0.4, type: 'wreck' },
      ],

      // FASE 5: Covil Central do Colosso Mutante (Zona de aniquilação total, escombros pesados)
      5: [
        { x: -16, z: -16, rot: 0.7, type: 'military' },
        { x: 16, z: 16, rot: -0.7, type: 'military' },
        { x: -22, z: 22, rot: 1.3, type: 'wreck' },
        { x: 22, z: -22, rot: -1.3, type: 'wreck' },
        { x: -8, z: -26, rot: 0.3, type: 'police' },
        { x: 8, z: 26, rot: -0.3, type: 'police' },
        { x: -32, z: 10, rot: 1.5, type: 'ambulance' },
        { x: 32, z: -10, rot: -1.5, type: 'ambulance' },
        { x: -38, z: -28, rot: 0.9, type: 'flipped' },
        { x: 38, z: 28, rot: -0.9, type: 'flipped' },
        { x: 0, z: 42, rot: 1.57, type: 'bus' },
        { x: 0, z: -42, rot: 1.57, type: 'bus' },
        { x: -50, z: 0, rot: 0.0, type: 'bus' },
        { x: 50, z: 0, rot: 0.0, type: 'bus' },
        { x: -45, z: 35, rot: 1.2, type: 'wreck' },
        { x: 45, z: -35, rot: -1.2, type: 'wreck' },
        { x: -18, z: 48, rot: 0.5, type: 'military' },
        { x: 18, z: -48, rot: -0.5, type: 'military' },
        { x: -55, z: -25, rot: 1.0, type: 'wreck' },
        { x: 55, z: 25, rot: -1.0, type: 'wreck' },
        { x: -30, z: 52, rot: 1.4, type: 'police' },
        { x: 30, z: -52, rot: -1.4, type: 'wreck' },
        { x: -6, z: 12, rot: 0.8, type: 'wreck' },
        { x: 6, z: -12, rot: -0.8, type: 'wreck' },
        { x: 12, z: 4, rot: -1.1, type: 'flipped' },
        { x: -12, z: -4, rot: 1.1, type: 'wreck' },
        { x: -62, z: 20, rot: 0.4, type: 'wreck' },
        { x: 62, z: -20, rot: -0.4, type: 'wreck' },
        { x: -40, z: -52, rot: 1.3, type: 'ambulance' },
        { x: 40, z: 52, rot: -1.3, type: 'military' },
      ],
    };

    const stageIndex = ((stage - 1) % 5) + 1;
    const cars = vehiclesByStage[stageIndex] || vehiclesByStage[1];
    cars.forEach((c) => this.createVehicleMesh(c));
  }

  // 6. Bueiros Urbanos Realistas com Grelha de Ferro Fundido
  private buildStreetProps(_stage: number): void {
    const manholeMat = new THREE.MeshBasicMaterial({
      map: Environment.getManholeTexture(),
      transparent: true,
    });

    const manholePositions = [
      { x: -8, z: -6 },
      { x: 10, z: 8 },
      { x: -20, z: 18 },
      { x: 22, z: -22 },
      { x: 4, z: 28 },
      { x: -34, z: -16 },
      { x: 45, z: -45 },
      { x: -45, z: 45 },
    ];

    manholePositions.forEach((m) => {
      const cover = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), manholeMat);
      cover.rotation.x = -Math.PI / 2;
      cover.position.set(m.x, 0.022, m.z);
      this.group.add(cover);

      // Névoa sutil saindo do bueiro
      const steamMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.22,
      });
      const steam = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), steamMat);
      steam.rotation.x = -Math.PI / 2;
      steam.position.set(m.x, 0.024, m.z);
      this.group.add(steam);
    });
  }

  // 7. Adereços Urbanos Principais (Caçambas, Barricadas Jersey com Faixas de Alerta, Bunkers de Sacos de Areia)
  private buildUrbanProps(_stage: number): void {
    // Caçambas industriais de lixo/entulho
    const dumpsterMatGreen = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });
    const dumpsterMatBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });

    const dumpsters = [
      { x: -28, z: -18, rot: 0.2, mat: dumpsterMatGreen },
      { x: 28, z: 18, rot: -0.15, mat: dumpsterMatBlue },
      { x: -18, z: 32, rot: 1.5, mat: dumpsterMatGreen },
      { x: 34, z: -28, rot: 1.4, mat: dumpsterMatBlue },
      { x: -52, z: -40, rot: 0.8, mat: dumpsterMatGreen },
      { x: 52, z: 40, rot: -0.8, mat: dumpsterMatBlue },
    ];

    dumpsters.forEach((d) => {
      const dGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.2, 1.6), d.mat);
      body.position.y = 0.6;
      dGroup.add(body);

      // Tampa de plástico reforçado
      const lid = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.15, 1.7), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
      lid.position.y = 1.25;
      dGroup.add(lid);

      dGroup.position.set(d.x, 0, d.z);
      dGroup.rotation.y = d.rot;
      this.group.add(dGroup);

      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(d.x, 0.7, d.z), new THREE.Vector3(2.8, 1.4, 2.0));
      this.obstacles.push(box);
    });

    // Barricadas Jersey de Concreto com Faixas de Perigo Zebradas
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const stripeMat = new THREE.MeshBasicMaterial({
      map: Environment.getHazardStripeTexture(),
    });

    const barricades = [
      { x: -12, z: -32, rot: 0.3 },
      { x: 12, z: 32, rot: -0.2 },
      { x: 32, z: -14, rot: 1.3 },
      { x: -32, z: 14, rot: 1.6 },
      { x: -20, z: -8, rot: 0.0 },
      { x: 20, z: 8, rot: 0.0 },
      { x: -48, z: 0, rot: 1.57 },
      { x: 48, z: 0, rot: 1.57 },
    ];

    barricades.forEach((b) => {
      const bGroup = new THREE.Group();
      const concrete = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 0.75), concreteMat);
      concrete.position.y = 0.4;
      bGroup.add(concrete);

      // Faixas de aviso de quarentena na lateral
      const stripeFace = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.35), stripeMat);
      stripeFace.position.set(0, 0.45, 0.385);
      bGroup.add(stripeFace);

      const stripeBack = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.35), stripeMat);
      stripeBack.rotation.y = Math.PI;
      stripeBack.position.set(0, 0.45, -0.385);
      bGroup.add(stripeBack);

      bGroup.position.set(b.x, 0, b.z);
      bGroup.rotation.y = b.rot;
      this.group.add(bGroup);

      const bBox = new THREE.Box3();
      bBox.setFromCenterAndSize(new THREE.Vector3(b.x, 0.5, b.z), new THREE.Vector3(3.2, 1.2, 1.4));
      this.obstacles.push(bBox);
    });

    // Bunkers de sacos de areia militares
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const sandbagEmplacements = [
      { x: -10, z: 22, rot: 0.2 },
      { x: 10, z: -22, rot: -0.2 },
      { x: -30, z: -25, rot: 1.2 },
      { x: 30, z: 25, rot: -1.2 },
    ];

    sandbagEmplacements.forEach((s) => {
      const sGroup = new THREE.Group();
      for (let layer = 0; layer < 3; layer++) {
        for (let seg = -2; seg <= 2; seg++) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.38), sandbagMat);
          bag.position.set(seg * 0.65, 0.11 + layer * 0.2, (Math.random() - 0.5) * 0.05);
          sGroup.add(bag);
        }
      }
      sGroup.position.set(s.x, 0, s.z);
      sGroup.rotation.y = s.rot;
      this.group.add(sGroup);

      const sBox = new THREE.Box3();
      sBox.setFromCenterAndSize(new THREE.Vector3(s.x, 0.4, s.z), new THREE.Vector3(2.8, 1.0, 1.2));
      this.obstacles.push(sBox);
    });
  }

  // 8. Elementos Apocalípticos: Barris em Chamas, Barris Tóxicos com Poças Radioativas e Caixas de Suprimentos
  private buildApocalypticDecorations(_stage: number): void {
    // A. BARRIS EM CHAMAS (Burn Barrels com iluminação quente crepitante)
    const barrelMatMetal = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const firePositions = [
      { x: -16, z: -20 },
      { x: 16, z: 20 },
      { x: -35, z: 18 },
      { x: 35, z: -18 },
      { x: 0, z: 30 },
      { x: 0, z: -30 },
    ];

    firePositions.forEach((fp) => {
      const fGroup = new THREE.Group();

      // Tambor de metal furado
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 12), barrelMatMetal);
      drum.position.y = 0.55;
      fGroup.add(drum);

      // Fogo estilizado saindo do topo
      const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.8, 8), fireMat);
      fireCone.position.y = 1.35;
      fGroup.add(fireCone);

      // Ponto de luz quente crepitante
      const fireLight = new THREE.PointLight(0xf97316, 2.5, 14, 1.4);
      fireLight.position.set(0, 1.4, 0);
      fGroup.add(fireLight);
      this.floorLights.push(fireLight);
      this.animatedFires.push({ light: fireLight, baseIntensity: 2.5, phase: Math.random() * 10 });

      fGroup.position.set(fp.x, 0, fp.z);
      this.group.add(fGroup);

      const bBox = new THREE.Box3();
      bBox.setFromCenterAndSize(new THREE.Vector3(fp.x, 0.6, fp.z), new THREE.Vector3(1.2, 1.5, 1.2));
      this.obstacles.push(bBox);
    });

    // B. BARRIS TÓXICOS E POÇAS DE RESÍDUO RADIOATIVO
    const toxicBarrelMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
    const toxicSludgeMat = new THREE.MeshBasicMaterial({
      map: Environment.getToxicSludgeTexture(),
      transparent: true,
      opacity: 0.9,
    });

    const toxicZones = [
      { x: -22, z: 34 },
      { x: 22, z: -34 },
      { x: -44, z: -12 },
      { x: 44, z: 12 },
      { x: -14, z: 52 },
    ];

    toxicZones.forEach((tz) => {
      // Poça verde no chão
      const sludgePool = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.0), toxicSludgeMat);
      sludgePool.rotation.x = -Math.PI / 2;
      sludgePool.position.set(tz.x, 0.023, tz.z);
      this.group.add(sludgePool);

      // Tambor caído
      const drumTumbled = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.0, 10), toxicBarrelMat);
      drumTumbled.rotation.z = Math.PI / 2;
      drumTumbled.position.set(tz.x + 0.6, 0.25, tz.z);
      this.group.add(drumTumbled);

      // Luz verde radioativa
      const toxicLight = new THREE.PointLight(0x22c55e, 1.6, 10, 1.5);
      toxicLight.position.set(tz.x, 0.8, tz.z);
      this.group.add(toxicLight);
      this.floorLights.push(toxicLight);
    });

    // C. CAIXAS DE SUPRIMENTOS E PILHAS DE PNEUS
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const supplyCrates = [
      { x: -26, z: -30 },
      { x: 26, z: 30 },
      { x: -34, z: -40 },
      { x: 34, z: 40 },
    ];

    supplyCrates.forEach((c) => {
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), crateMat);
      cMesh.position.set(c.x, 0.6, c.z);
      this.group.add(cMesh);

      const cBox = new THREE.Box3();
      cBox.setFromCenterAndSize(new THREE.Vector3(c.x, 0.6, c.z), new THREE.Vector3(1.8, 1.4, 1.8));
      this.obstacles.push(cBox);
    });

    // Cones de trânsito espalhados
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7 });
    const conePositions = [
      { x: -6, z: -10 },
      { x: -5, z: -11 },
      { x: 14, z: 6 },
      { x: 15, z: 7 },
      { x: -22, z: 2 },
      { x: 24, z: -2 },
    ];

    conePositions.forEach((cp) => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), coneMat);
      cone.position.set(cp.x, 0.35, cp.z);
      this.group.add(cone);
    });
  }

  // 9. Poças de Sangue Orgânicas Suaves (Substitui totalmente os polígonos angulares)
  private buildOrganicBloodDecals(stage: number): void {
    const bloodMat = new THREE.MeshBasicMaterial({
      map: Environment.getBloodTexture(),
      transparent: true,
      opacity: 0.9,
    });

    const count = 16 + stage * 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 6 + (i * 7) % 65;
      const bx = Math.cos(angle) * dist + (Math.sin(i * 1.5) * 6);
      const bz = Math.sin(angle) * dist + (Math.cos(i * 1.5) * 6);
      const scale = 2.4 + (i % 4) * 0.8;

      const decal = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), bloodMat);
      decal.rotation.x = -Math.PI / 2;
      decal.rotation.z = (i * 1.3) % (Math.PI * 2);
      decal.position.set(bx, 0.022, bz);
      this.group.add(decal);
    }
  }

  // 10. Sinalização Tática no Asfalto (Zonas de Evacuação)
  private buildTacticalSignage(stage: number): void {
    const cycle = (stage - 1) % 5;
    const colorHex = cycle === 4 ? 0xef4444 : cycle === 2 ? 0xf97316 : 0xeab308;
    const signColor = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });

    const createEvacZone = (x: number, z: number) => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.0, 32), signColor);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.025, z);
      this.group.add(ring);

      const crossH = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 0.6), signColor);
      crossH.rotation.x = -Math.PI / 2;
      crossH.position.set(x, 0.026, z);
      this.group.add(crossH);

      const crossV = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 12.0), signColor);
      crossV.rotation.x = -Math.PI / 2;
      crossV.position.set(x, 0.026, z);
      this.group.add(crossV);
    };

    createEvacZone(-40, 40);
    createEvacZone(40, -40);
    createEvacZone(0, 0);
  }

  // 11. Iluminação Pública e Postes Danificados
  private buildCityStreetLighting(stage: number): void {
    const cycle = (stage - 1) % 5;
    const mainCol = cycle === 4 ? 0xef4444 : cycle === 2 ? 0x22c55e : 0xfbbf24; // Âmbar / Verde / Vermelho
    const secCol = cycle >= 3 ? 0xdc2626 : 0xf59e0b;

    const lampCoords = [
      { x: -22, z: -22, col: mainCol },
      { x: 22, z: -22, col: mainCol },
      { x: -22, z: 22, col: mainCol },
      { x: 22, z: 22, col: mainCol },
      { x: -50, z: 0, col: secCol },
      { x: 50, z: 0, col: secCol },
      { x: 0, z: -50, col: secCol },
      { x: 0, z: 50, col: secCol },
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

    lampCoords.forEach((l) => {
      // Poste de luz metálico urbano
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 4.0, 8), poleMat);
      pole.position.set(l.x, 2.0, l.z);
      this.group.add(pole);

      // Luminária no topo
      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: l.col }));
      lampHead.position.set(l.x, 4.1, l.z);
      this.group.add(lampHead);

      const pLight = new THREE.PointLight(l.col, 2.4, 24.0, 1.2);
      pLight.position.set(l.x, 3.8, l.z);
      this.group.add(pLight);
      this.floorLights.push(pLight);

      // PARTE 4: Piscina de luz atmosférica projetada no chão abaixo do poste
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(5.2, 24),
        new THREE.MeshBasicMaterial({
          color: l.col,
          transparent: true,
          opacity: 0.16,
        })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(l.x, 0.017, l.z);
      this.group.add(pool);

      // Obstáculo para a base do poste
      const pBox = new THREE.Box3();
      pBox.setFromCenterAndSize(new THREE.Vector3(l.x, 1.0, l.z), new THREE.Vector3(0.8, 2.0, 0.8));
      this.obstacles.push(pBox);
    });
  }

  // ==========================================
  // SISTEMA DINÂMICO DE LABIRINTOS POR FASE
  // ==========================================

  private buildStageMaze(stage: number): void {
    if (stage <= 4) {
      // TIER 1 (Fases 1-4): Perímetro Aberto
      this.createMazeBarricade(-28, -28, 6.0, 0.4);
      this.createMazeBarricade(28, 28, 6.0, -0.4);
      this.createMazeBarricade(-28, 28, 6.0, 1.2);
      this.createMazeBarricade(28, -28, 6.0, -1.2);
      return;
    }

    if (stage <= 8) {
      // TIER 2 (Fases 5-8): Quarentena Militar com Gargalos Táticos (Chokepoints)
      this.createMazeBarricade(-7, -26, 16.0, 0);
      this.createMazeBarricade(7, 26, 16.0, 0);
      this.createMazeBarricade(26, -7, 16.0, Math.PI / 2);
      this.createMazeBarricade(-26, 7, 16.0, Math.PI / 2);

      this.createMazeBarricade(-26, -26, 8.0, 0.3);
      this.createMazeBarricade(26, 26, 8.0, -0.3);
      return;
    }

    if (stage <= 16) {
      // TIER 3 (Fases 9-16): Labirinto de Contêineres e Bloqueios em Zigue-Zague
      this.createMazeContainer(-6, -24, 0x1e3a8a, 0);
      this.createMazeContainer(6, -38, 0x991b1b, 0);
      this.createMazeBarricade(-10, -31, 8.0, Math.PI / 2);

      this.createMazeContainer(6, 24, 0x166534, 0);
      this.createMazeContainer(-6, 38, 0x854d0e, 0);
      this.createMazeBarricade(10, 31, 8.0, Math.PI / 2);

      this.createMazeContainer(24, 6, 0x374151, Math.PI / 2);
      this.createMazeContainer(38, -6, 0x1e3a8a, Math.PI / 2);
      this.createMazeBarricade(31, -10, 8.0, 0);

      this.createMazeContainer(-24, -6, 0x991b1b, Math.PI / 2);
      this.createMazeContainer(-38, 6, 0x166534, Math.PI / 2);
      this.createMazeBarricade(-31, 10, 8.0, 0);
      return;
    }

    if (stage <= 24) {
      // TIER 4 (Fases 17-24): Complexo de Contenção da Usina (Labirinto Central Concéntrico)
      this.createMazeBarricade(-7, -13, 13.0, 0);
      this.createMazeBarricade(7, 13, 13.0, 0);
      this.createMazeBarricade(13, -7, 13.0, Math.PI / 2);
      this.createMazeBarricade(-13, 7, 13.0, Math.PI / 2);

      this.createMazeContainer(-10, -28, 0x1e293b, 0);
      this.createMazeContainer(10, 28, 0x1e293b, 0);
      this.createMazeContainer(28, -10, 0x7f1d1d, Math.PI / 2);
      this.createMazeContainer(-28, 10, 0x14532d, Math.PI / 2);

      this.createMazeBarricade(-22, -22, 10.0, 0.78);
      this.createMazeBarricade(22, 22, 10.0, 0.78);
      this.createMazeBarricade(-22, 22, 10.0, -0.78);
      this.createMazeBarricade(22, -22, 10.0, -0.78);
      return;
    }

    // TIER 5 (Fases 25-32): Pesadelo Apocalíptico Total: Mega-Labirinto Interconectado
    this.createMazeBarricade(-7, -12, 12.0, 0);
    this.createMazeBarricade(7, 12, 12.0, 0);
    this.createMazeBarricade(12, -7, 12.0, Math.PI / 2);
    this.createMazeBarricade(-12, 7, 12.0, Math.PI / 2);

    this.createMazeContainer(-8, -26, 0x991b1b, 0);
    this.createMazeContainer(8, -38, 0x1e3a8a, 0);
    this.createMazeBarricade(-12, -32, 9.0, Math.PI / 2);

    this.createMazeContainer(8, 26, 0x166534, 0);
    this.createMazeContainer(-8, 38, 0x854d0e, 0);
    this.createMazeBarricade(12, 32, 9.0, Math.PI / 2);

    this.createMazeContainer(26, 8, 0x374151, Math.PI / 2);
    this.createMazeContainer(38, -8, 0x991b1b, Math.PI / 2);
    this.createMazeBarricade(32, -12, 9.0, 0);

    this.createMazeContainer(-26, -8, 0x1e3a8a, Math.PI / 2);
    this.createMazeContainer(-38, 8, 0x166534, Math.PI / 2);
    this.createMazeBarricade(-32, 12, 9.0, 0);

    this.createMazeBarricade(-42, -24, 12.0, 0);
    this.createMazeBarricade(42, 24, 12.0, 0);
    this.createMazeBarricade(-24, 42, 12.0, Math.PI / 2);
    this.createMazeBarricade(24, -42, 12.0, Math.PI / 2);
  }

  // ==========================================
  // SISTEMA DINÂMICO DE ARMADILHAS POR FASE
  // ==========================================

  private buildStageTraps(stage: number): void {
    if (stage <= 4) {
      this.createActiveToxicZone(-24, 24, 2.2, 4, 0.85);
      return;
    }

    if (stage <= 8) {
      this.createLandmine(12, -22);
      this.createLandmine(-12, 22);
      this.createLandmine(22, 12);

      this.createActiveToxicZone(-18, -20, 2.5, 6, 0.75);
      this.createActiveToxicZone(18, 20, 2.5, 6, 0.75);
      return;
    }

    if (stage <= 16) {
      this.createElectricArc(18, -16, 18, -26);
      this.createElectricArc(-18, 16, -18, 26);

      this.createLandmine(-8, -28);
      this.createLandmine(8, -42);
      this.createLandmine(8, 28);
      this.createLandmine(-8, 42);
      this.createLandmine(28, 8);
      this.createLandmine(-28, -8);

      this.createActiveToxicZone(-14, -18, 2.6, 8, 0.65);
      this.createActiveToxicZone(14, 18, 2.6, 8, 0.65);
      this.createActiveToxicZone(18, -14, 2.4, 8, 0.65);
      this.createActiveToxicZone(-18, 14, 2.4, 8, 0.65);
      this.createActiveToxicZone(0, -46, 2.8, 8, 0.65);
      return;
    }

    if (stage <= 24) {
      this.createElectricArc(-13, -6, -13, 6);
      this.createElectricArc(13, -6, 13, 6);
      this.createElectricArc(-6, -13, 6, -13);
      this.createElectricArc(-6, 13, 6, 13);

      this.createLandmine(-9, -18);
      this.createLandmine(9, 18);
      this.createLandmine(18, -9);
      this.createLandmine(-18, 9);
      this.createLandmine(-16, -28);
      this.createLandmine(16, 28);
      this.createLandmine(28, 16);
      this.createLandmine(-28, -16);
      this.createLandmine(0, 32);

      this.createActiveToxicZone(-10, -10, 2.6, 10, 0.60);
      this.createActiveToxicZone(10, 10, 2.6, 10, 0.60);
      this.createActiveToxicZone(-20, 20, 2.8, 10, 0.60);
      this.createActiveToxicZone(20, -20, 2.8, 10, 0.60);
      this.createActiveToxicZone(-32, 0, 2.6, 10, 0.60);
      this.createActiveToxicZone(32, 0, 2.6, 10, 0.60);
      this.createActiveToxicZone(0, -32, 2.8, 10, 0.60);
      return;
    }

    // TIER 5 (Fases 25-32)
    this.createElectricArc(-12, -5, -12, 5);
    this.createElectricArc(12, -5, 12, 5);
    this.createElectricArc(-5, -12, 5, -12);
    this.createElectricArc(-5, 12, 5, 12);
    this.createElectricArc(-28, -20, -28, -32);
    this.createElectricArc(28, 20, 28, 32);

    this.createLandmine(-8, -16);
    this.createLandmine(8, 16);
    this.createLandmine(16, -8);
    this.createLandmine(-16, 8);
    this.createLandmine(-14, -28);
    this.createLandmine(14, 28);
    this.createLandmine(28, 14);
    this.createLandmine(-28, -14);
    this.createLandmine(-24, 24);
    this.createLandmine(24, -24);
    this.createLandmine(0, -38);
    this.createLandmine(0, 38);

    this.createActiveToxicZone(-9, -9, 2.8, 12, 0.55);
    this.createActiveToxicZone(9, 9, 2.8, 12, 0.55);
    this.createActiveToxicZone(-18, 18, 3.0, 12, 0.55);
    this.createActiveToxicZone(18, -18, 3.0, 12, 0.55);
    this.createActiveToxicZone(-34, -12, 2.8, 12, 0.55);
    this.createActiveToxicZone(34, 12, 2.8, 12, 0.55);
    this.createActiveToxicZone(-12, 34, 2.8, 12, 0.55);
    this.createActiveToxicZone(12, -34, 2.8, 12, 0.55);
    this.createActiveToxicZone(0, -48, 3.2, 12, 0.55);
    this.createActiveToxicZone(0, 48, 3.2, 12, 0.55);
  }

  // --- MÉTODOS AUXILIARES DE CONSTRUÇÃO DE ELEMENTOS FÍSICOS E ARMADILHAS ---

  private createMazeBarricade(x: number, z: number, length: number = 5.0, rotY: number = 0): void {
    const bGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const concrete = new THREE.Mesh(new THREE.BoxGeometry(length, 1.2, 0.8), concreteMat);
    concrete.position.y = 0.6;
    bGroup.add(concrete);

    const stripeMat = new THREE.MeshBasicMaterial({ map: Environment.getHazardStripeTexture() });
    const stripeFace = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.9, 0.4), stripeMat);
    stripeFace.position.set(0, 0.6, 0.41);
    bGroup.add(stripeFace);

    const stripeBack = new THREE.Mesh(new THREE.PlaneGeometry(length * 0.9, 0.4), stripeMat);
    stripeBack.rotation.y = Math.PI;
    stripeBack.position.set(0, 0.6, -0.41);
    bGroup.add(stripeBack);

    const wireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.4 });
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, length * 0.95, 6), wireMat);
    wire.rotation.z = Math.PI / 2;
    wire.position.y = 1.35;
    bGroup.add(wire);

    bGroup.position.set(x, 0, z);
    bGroup.rotation.y = rotY;
    this.group.add(bGroup);

    const bBox = new THREE.Box3();
    const halfLen = length / 2;
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const extX = Math.abs(cos * halfLen) + Math.abs(sin * 0.45);
    const extZ = Math.abs(sin * halfLen) + Math.abs(cos * 0.45);
    bBox.min.set(x - extX, 0, z - extZ);
    bBox.max.set(x + extX, 1.4, z + extZ);
    this.obstacles.push(bBox);
  }

  private createMazeContainer(x: number, z: number, colorHex: number = 0x1e3a8a, rotY: number = 0): void {
    const cGroup = new THREE.Group();
    const w = 7.2;
    const h = 2.7;
    const d = 2.6;

    const contMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.75, metalness: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), contMat);
    body.position.y = h / 2;
    cGroup.add(body);

    const stripeMat = new THREE.MeshBasicMaterial({ map: Environment.getHazardStripeTexture() });
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 0.5), stripeMat);
    stripe.position.set(0, h * 0.5, d / 2 + 0.02);
    cGroup.add(stripe);

    cGroup.position.set(x, 0, z);
    cGroup.rotation.y = rotY;
    this.group.add(cGroup);

    const cBox = new THREE.Box3();
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const extX = Math.abs(cos * (w / 2)) + Math.abs(sin * (d / 2));
    const extZ = Math.abs(sin * (w / 2)) + Math.abs(cos * (d / 2));
    cBox.min.set(x - extX, 0, z - extZ);
    cBox.max.set(x + extX, h, z + extZ);
    this.obstacles.push(cBox);
  }

  private createLandmine(x: number, z: number): void {
    const mGroup = new THREE.Group();

    const baseGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.14, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x222a27, roughness: 0.6, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.07;
    mGroup.add(base);

    const ringGeo = new THREE.RingGeometry(0.38, 0.58, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xeab308, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.145;
    mGroup.add(ring);

    const domeGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.08, 12);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.9 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.16;
    mGroup.add(dome);

    const ledGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.y = 0.22;
    mGroup.add(ledMesh);

    const ledLight = new THREE.PointLight(0xef4444, 1.2, 4.0, 1.8);
    ledLight.position.set(0, 0.35, 0);
    mGroup.add(ledLight);
    this.floorLights.push(ledLight);

    mGroup.position.set(x, 0, z);
    this.group.add(mGroup);

    this.landmines.push({
      group: mGroup,
      pos: new THREE.Vector3(x, 0, z),
      radius: 1.8,
      blastRadius: 4.2,
      damage: 24,
      isArmed: true,
      isTriggered: false,
      fuseTimer: 0.35,
      isExploded: false,
      ledMesh,
      ledLight,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  private createElectricArc(x1: number, z1: number, x2: number, z2: number): void {
    const arcGroup = new THREE.Group();

    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.6 });
    const postGeo = new THREE.CylinderGeometry(0.2, 0.24, 2.2, 8);

    const postA = new THREE.Mesh(postGeo, postMat);
    postA.position.set(x1, 1.1, z1);
    arcGroup.add(postA);

    const postB = new THREE.Mesh(postGeo, postMat);
    postB.position.set(x2, 1.1, z2);
    arcGroup.add(postB);

    const hazardMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const signA = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), hazardMat);
    signA.position.set(x1, 1.6, z1 + 0.26);
    arcGroup.add(signA);

    const signB = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), hazardMat);
    signB.position.set(x2, 1.6, z2 + 0.26);
    arcGroup.add(signB);

    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const angle = Math.atan2(z2 - z1, x2 - x1);

    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, dist, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = Math.PI / 2;
    beam.rotation.y = -angle;
    beam.position.set(midX, 1.1, midZ);
    arcGroup.add(beam);

    const light = new THREE.PointLight(0x38bdf8, 3.5, 9.0, 1.5);
    light.position.set(midX, 1.3, midZ);
    arcGroup.add(light);
    this.floorLights.push(light);

    this.group.add(arcGroup);

    this.electricArcs.push({
      group: arcGroup,
      posA: new THREE.Vector3(x1, 0, z1),
      posB: new THREE.Vector3(x2, 0, z2),
      meshArc: beam,
      light,
      cycleTimer: Math.random() * 2.0,
      activeDuration: 2.2,
      inactiveDuration: 1.6,
      isActive: true,
      damage: 18,
      hitCooldown: 0,
    });
  }

  private createActiveToxicZone(x: number, z: number, radius: number = 2.4, dps: number = 8, slowMult: number = 0.65): void {
    const tGroup = new THREE.Group();

    const poolGeo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const poolMat = new THREE.MeshBasicMaterial({
      map: Environment.getToxicSludgeTexture(),
      transparent: true,
      opacity: 0.92,
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.024;
    tGroup.add(pool);

    const tLight = new THREE.PointLight(0x22c55e, 1.8, radius * 2.5, 1.6);
    tLight.position.set(0, 0.5, 0);
    tGroup.add(tLight);
    this.floorLights.push(tLight);

    const bubbles: THREE.Mesh[] = [];
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 4; i++) {
      const bMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 8, 8), bubbleMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius * 0.7);
      bMesh.position.set(Math.cos(angle) * dist, 0.08, Math.sin(angle) * dist);
      tGroup.add(bMesh);
      bubbles.push(bMesh);
    }

    const drumMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10), drumMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(radius * 0.6, 0.22, 0);
    tGroup.add(drum);

    tGroup.position.set(x, 0, z);
    this.group.add(tGroup);

    this.toxicZones.push({
      mesh: pool,
      pos: new THREE.Vector3(x, 0, z),
      radius,
      damagePerSec: dps,
      slowMult,
      light: tLight,
      bubbles,
      tickTimer: 0,
    });
  }

  public spawnExplosionVisual(pos: THREE.Vector3): void {
    const expGroup = new THREE.Group();

    const fireGeo = new THREE.SphereGeometry(1.2, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.95 });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.y = 1.0;
    expGroup.add(fireball);

    const ringGeo = new THREE.RingGeometry(0.6, 1.4, 20);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.y = 0.05;
    expGroup.add(shockwave);

    const light = new THREE.PointLight(0xffedd5, 8.0, 16.0, 1.2);
    light.position.set(0, 1.5, 0);
    expGroup.add(light);

    expGroup.position.copy(pos);
    this.group.add(expGroup);

    this.explosions.push({
      group: expGroup,
      fireball,
      shockwave,
      light,
      timer: 0,
      duration: 0.45,
    });
  }

  private distancePointToSegment2D(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.hypot(px - projX, pz - projZ);
  }
}
