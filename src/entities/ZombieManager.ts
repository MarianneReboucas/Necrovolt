import * as THREE from 'three';
import type { Bullet } from '../systems/WeaponSystem';
import { GAME_CONFIG } from '../config';
import type { ZombieType } from '../config';

export type ZombieState = 'patrol' | 'chase' | 'attack' | 'windup' | 'exploding' | 'dead';

export interface ZombieInstance {
  group: THREE.Group;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  scale: number;
  type: ZombieType;
  state: ZombieState;
  animOffset: number;
  attackCooldown: number;
  windupTimer: number;
  arms: (THREE.Mesh | THREE.Group)[];
  head: THREE.Mesh | THREE.Group;
  bodyMesh: THREE.Mesh;
  leftLeg?: THREE.Mesh | THREE.Group;
  rightLeg?: THREE.Mesh | THREE.Group;
  telegraphRing?: THREE.Mesh;
  hpBarGroup?: THREE.Group;
  hpBarFill?: THREE.Mesh;
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

export class ZombieManager {
  public zombies: ZombieInstance[] = [];
  public pickups: PickupItem[] = [];

  private scene: THREE.Scene;

  // Materiais reutilizáveis para alto desempenho em 3D
  private skinMaterials: Map<ZombieType, THREE.MeshStandardMaterial> = new Map();
  private clothesMaterials: Map<ZombieType, THREE.MeshStandardMaterial> = new Map();
  private eyeMat: THREE.MeshBasicMaterial;
  private glowMat: THREE.MeshBasicMaterial;
  private telegraphMat: THREE.MeshBasicMaterial;
  private goreMat!: THREE.MeshStandardMaterial;
  private boneMat!: THREE.MeshStandardMaterial;
  private mouthMat!: THREE.MeshBasicMaterial;
  private hairMat!: THREE.MeshStandardMaterial;
  private brownHairMat!: THREE.MeshStandardMaterial;
  private eyebrowMat!: THREE.MeshBasicMaterial;
  private socketMat!: THREE.MeshBasicMaterial;
  private pantsMat!: THREE.MeshStandardMaterial;
  private bootMat!: THREE.MeshStandardMaterial;

  // Pontos de origem urbanos temáticos da cidade (avenidas, becos e cruzamentos distantes)
  private static readonly CITY_SPAWN_NODES = [
    // Avenidas Principais
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
    // Becos e Vielas entre os Complexos Urbanos
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

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Olhos amarelo-limão radioativos e vibrantes (inspirados diretamente na arte de referência)
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xd9ff00 });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
    this.eyebrowMat = new THREE.MeshBasicMaterial({ color: 0x141812 });
    this.socketMat = new THREE.MeshBasicMaterial({ color: 0x0f1809 });
    this.telegraphMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    this.initMaterials();
  }

  private initMaterials(): void {
    this.goreMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 });
    this.boneMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 });
    this.mouthMat = new THREE.MeshBasicMaterial({ color: 0x090a07 });
    this.hairMat = new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.95 });
    this.brownHairMat = new THREE.MeshStandardMaterial({ color: 0x3d251a, roughness: 0.95 });
    this.pantsMat = new THREE.MeshStandardMaterial({ color: 0x181e26, roughness: 0.9 });
    this.bootMat = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.95 });

    // Walker: Verde tóxico cartunesco vibrante e camisa verde-militar rasgada (idêntico ao zumbi em primeiro plano)
    this.skinMaterials.set('walker', new THREE.MeshStandardMaterial({ color: 0x6ab535, roughness: 0.7 }));
    this.clothesMaterials.set('walker', new THREE.MeshStandardMaterial({ color: 0x1f3c1d, roughness: 0.85 }));

    // Runner: Infectado veloz com verde tóxico vibrante e cabelo castanho longo da arte de fundo
    this.skinMaterials.set('runner', new THREE.MeshStandardMaterial({ color: 0x78c73e, roughness: 0.65 }));
    this.clothesMaterials.set('runner', new THREE.MeshStandardMaterial({ color: 0x2e4521, roughness: 0.85 }));

    // Brute: Mutante massivo com pele verde tóxico profundo e macacão industrial escuro
    this.skinMaterials.set('brute', new THREE.MeshStandardMaterial({ color: 0x4e9126, roughness: 0.85, metalness: 0.1 }));
    this.clothesMaterials.set('brute', new THREE.MeshStandardMaterial({ color: 0x152230, roughness: 0.8 }));

    // Exploder: Pútrido com tom esmeralda químico e barriga ácida fluorescente
    this.skinMaterials.set('exploder', new THREE.MeshStandardMaterial({ color: 0x84db37, roughness: 0.6 }));
    this.clothesMaterials.set('exploder', new THREE.MeshStandardMaterial({ color: 0x153d1d, roughness: 0.7 }));

    // Boss: Titã radioativo supremo com armadura negra desgastada
    this.skinMaterials.set('boss', new THREE.MeshStandardMaterial({ color: 0x3c731e, roughness: 0.75, metalness: 0.25 }));
    this.clothesMaterials.set('boss', new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 }));
  }

  /**
   * Verifica se uma coordenada (x, z) está visível na tela da câmera 3D.
   * Garante que zumbis nunca brotem dentro da visão do jogador.
   */
  public isPointVisible(x: number, z: number, camera?: THREE.Camera): boolean {
    if (!camera) return false;
    const v = new THREE.Vector3(x, 0.5, z);
    v.project(camera);
    return v.x >= -1.15 && v.x <= 1.15 && v.y >= -1.15 && v.y <= 1.15 && v.z > 0 && v.z < 1;
  }

  // Gera inimigos de forma segura fora da visão, vindo de becos e avenidas
  public spawnSafeZombie(
    obstacles: THREE.Box3[],
    playerPos: THREE.Vector3,
    type: ZombieType,
    stageNumber: number = 1,
    camera?: THREE.Camera
  ): boolean {
    const bounds = GAME_CONFIG.arena.bounds - 4;

    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      let x = 0;
      let z = 0;

      // 50% de chance: vir de nós urbanos temáticos (becos, bueiros distantes, avenidas)
      // 50% de chance: vir pelas vias e calçadas periféricas fora da tela
      if (Math.random() < 0.5) {
        const offscreenNodes = ZombieManager.CITY_SPAWN_NODES.filter(
          (node) => !this.isPointVisible(node.x, node.z, camera)
        );

        if (offscreenNodes.length > 0) {
          const chosen = offscreenNodes[Math.floor(Math.random() * offscreenNodes.length)];
          x = chosen.x + (Math.random() - 0.5) * 4.0;
          z = chosen.z + (Math.random() - 0.5) * 4.0;
        }
      }

      if (x === 0 && z === 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 24 + Math.random() * 12; // 24m a 36m de distância
        x = playerPos.x + Math.cos(angle) * dist;
        z = playerPos.z + Math.sin(angle) * dist;
      }

      x = Math.max(-bounds, Math.min(bounds, x));
      z = Math.max(-bounds, Math.min(bounds, z));

      // Garante que NUNCA brote visível na tela
      if (this.isPointVisible(x, z, camera)) {
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

    // Fallback de emergência garantido para NUNCA faltar zumbi na fase
    const fallbackAngle = Math.random() * Math.PI * 2;
    let fx = playerPos.x + Math.cos(fallbackAngle) * 32;
    let fz = playerPos.z + Math.sin(fallbackAngle) * 32;
    fx = Math.max(-bounds, Math.min(bounds, fx));
    fz = Math.max(-bounds, Math.min(bounds, fz));
    this.createZombie(fx, fz, type, stageNumber);
    return true;
  }

  public createZombie(x: number, z: number, type: ZombieType, stageNumber: number = 1): void {
    const group = new THREE.Group();
    const config = GAME_CONFIG.zombieTypes[type];

    // Escalonamento progressivo por fase: Zumbis crescem e ficam mais fortes (+5% tamanho por fase)
    const stageGrowthFactor = 1.0 + (stageNumber - 1) * 0.05;
    const scale = config.scale * stageGrowthFactor;

    const levelMultHp = 1.0 + (stageNumber - 1) * 0.14;
    const levelMultSpd = 1.0 + (stageNumber - 1) * 0.025;
    const levelMultDmg = 1.0 + (stageNumber - 1) * 0.12;

    const skinMat = this.skinMaterials.get(type) || this.skinMaterials.get('walker')!;
    const clothesMat = (this.clothesMaterials.get(type) || this.clothesMaterials.get('walker')!).clone();

    // 1. Tronco / Corpo 3D modelado com postura de zumbi encurvada e peito rasgado
    const isHeavy = type === 'brute' || type === 'boss';
    const torsoGeo = isHeavy
      ? new THREE.BoxGeometry(0.88 * scale, 1.25 * scale, 0.65 * scale)
      : new THREE.BoxGeometry(0.56 * scale, 0.82 * scale, 0.40 * scale);

    const torso = new THREE.Mesh(torsoGeo, clothesMat);
    torso.position.set(0, (isHeavy ? 1.05 : 0.95) * scale, 0.05 * scale);
    torso.rotation.x = type === 'runner' ? 0.42 : 0.28; // Postura corcunda clássica de zumbi
    torso.castShadow = true;
    group.add(torso);

    // Pescoço verde exposto por colarinho rasgado
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.22 * scale, 8), skinMat);
    neck.position.set(0, (isHeavy ? 1.62 : 1.42) * scale, 0.14 * scale);
    group.add(neck);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19 * scale, 0.045 * scale, 6, 12), clothesMat);
    collar.rotation.x = Math.PI / 2 + 0.25;
    collar.position.set(0, (isHeavy ? 1.54 : 1.34) * scale, 0.12 * scale);
    group.add(collar);

    // Ferida aberta no peito com costelas podres expostas
    const wound = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.22 * scale, 0.05 * scale), this.goreMat);
    wound.position.set(0.04 * scale, 0.04 * scale, (isHeavy ? 0.33 : 0.21) * scale);
    torso.add(wound);

    const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.03 * scale, 0.04 * scale), this.boneMat);
    rib1.position.set(0.04 * scale, 0.08 * scale, (isHeavy ? 0.34 : 0.22) * scale);
    const rib2 = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.03 * scale, 0.04 * scale), this.boneMat);
    rib2.position.set(0.04 * scale, -0.02 * scale, (isHeavy ? 0.34 : 0.22) * scale);
    torso.add(rib1);
    torso.add(rib2);

    // Detalhes específicos de mutação
    if (type === 'exploder') {
      const bileBelly = new THREE.Mesh(new THREE.SphereGeometry(0.45 * scale, 8, 8), this.glowMat);
      bileBelly.position.set(0, -0.06 * scale, 0.26 * scale);
      torso.add(bileBelly);
    } else if (isHeavy) {
      const spur1 = new THREE.Mesh(new THREE.ConeGeometry(0.10 * scale, 0.32 * scale, 5), this.boneMat);
      spur1.rotation.x = -Math.PI / 3;
      spur1.position.set(0, 0.25 * scale, -0.38 * scale);
      torso.add(spur1);
    }

    // 2. Cabeça Cartunesca Expressiva 3D (Inspirada fielmente na arte de referência)
    const headScale = (type === 'brute' ? 0.38 : (type === 'exploder' ? 0.33 : 0.35)) * scale;
    const headGroup = new THREE.Group();
    headGroup.position.set(0, (type === 'exploder' ? 1.62 : (isHeavy ? 1.95 : 1.74)) * scale, (type === 'runner' ? 0.38 : 0.25) * scale);
    headGroup.rotation.set(0.10, 0.06, -0.10); // Cabeça torta e pendente de morto-vivo

    // Crânio verde tóxico
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(headScale, 12, 12), skinMat);
    cranium.scale.set(1.0, 1.05, 0.96);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Orelhas arredondadas no formato chibi da arte
    const earL = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.25, 8, 8), skinMat);
    earL.scale.set(0.45, 0.9, 0.7);
    earL.position.set(-headScale * 0.96, -headScale * 0.04, 0);
    headGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.25, 8, 8), skinMat);
    earR.scale.set(0.45, 0.9, 0.7);
    earR.position.set(headScale * 0.96, -headScale * 0.04, 0);
    headGroup.add(earR);

    // Cabelos: Diferenciados por tipo conforme os 2 zumbis da referência
    const isRunnerStyle = type === 'runner';
    const activeHairMat = isRunnerStyle ? this.brownHairMat : this.hairMat;

    if (isRunnerStyle) {
      // Cabelo castanho comprido repartido ao meio (zumbi de fundo na referência)
      const hairTop = new THREE.Mesh(new THREE.SphereGeometry(headScale * 1.06, 10, 10), activeHairMat);
      hairTop.position.set(0, headScale * 0.22, -headScale * 0.12);
      headGroup.add(hairTop);

      const hairSideL = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.28, headScale * 0.92, headScale * 0.72), activeHairMat);
      hairSideL.position.set(-headScale * 0.88, -headScale * 0.12, 0);
      hairSideL.rotation.z = -0.16;
      headGroup.add(hairSideL);

      const hairSideR = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.28, headScale * 0.92, headScale * 0.72), activeHairMat);
      hairSideR.position.set(headScale * 0.88, -headScale * 0.12, 0);
      hairSideR.rotation.z = 0.16;
      headGroup.add(hairSideR);

      const bangL = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.36, headScale * 0.22, headScale * 0.22), activeHairMat);
      bangL.position.set(-headScale * 0.36, headScale * 0.52, headScale * 0.68);
      bangL.rotation.z = -0.25;
      headGroup.add(bangL);

      const bangR = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.36, headScale * 0.22, headScale * 0.22), activeHairMat);
      bangR.position.set(headScale * 0.36, headScale * 0.52, headScale * 0.68);
      bangR.rotation.z = 0.25;
      headGroup.add(bangR);
    } else {
      // Cabelo preto espetado desgrenhado em mechas (zumbi principal em primeiro plano na referência)
      const hairCrown = new THREE.Mesh(new THREE.BoxGeometry(headScale * 1.85, headScale * 0.62, headScale * 1.75), activeHairMat);
      hairCrown.position.set(0, headScale * 0.68, -headScale * 0.05);
      headGroup.add(hairCrown);

      // Mechas espetadas da franja caindo na testa
      const spike1 = new THREE.Mesh(new THREE.ConeGeometry(headScale * 0.24, headScale * 0.44, 4), activeHairMat);
      spike1.rotation.set(-Math.PI / 3, 0, -0.3);
      spike1.position.set(-headScale * 0.44, headScale * 0.46, headScale * 0.72);
      headGroup.add(spike1);

      const spike2 = new THREE.Mesh(new THREE.ConeGeometry(headScale * 0.28, headScale * 0.52, 4), activeHairMat);
      spike2.rotation.set(-Math.PI / 3.2, 0, 0);
      spike2.position.set(0, headScale * 0.54, headScale * 0.80);
      headGroup.add(spike2);

      const spike3 = new THREE.Mesh(new THREE.ConeGeometry(headScale * 0.24, headScale * 0.44, 4), activeHairMat);
      spike3.rotation.set(-Math.PI / 3, 0, 0.35);
      spike3.position.set(headScale * 0.44, headScale * 0.46, headScale * 0.72);
      headGroup.add(spike3);

      // Mechas laterais rebeldes
      const spikeL = new THREE.Mesh(new THREE.ConeGeometry(headScale * 0.25, headScale * 0.48, 4), activeHairMat);
      spikeL.rotation.set(0, 0, Math.PI / 3);
      spikeL.position.set(-headScale * 0.90, headScale * 0.66, 0);
      headGroup.add(spikeL);

      const spikeR = new THREE.Mesh(new THREE.ConeGeometry(headScale * 0.25, headScale * 0.48, 4), activeHairMat);
      spikeR.rotation.set(0, 0, -Math.PI / 3);
      spikeR.position.set(headScale * 0.90, headScale * 0.66, 0);
      headGroup.add(spikeR);
    }

    // Sobrancelhas zumbi franzidas e agressivas
    const browL = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.42, headScale * 0.12, headScale * 0.12), this.eyebrowMat);
    browL.position.set(-headScale * 0.36, headScale * 0.25, headScale * 0.86);
    browL.rotation.set(0.1, 0.18, -0.32);
    headGroup.add(browL);

    const browR = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.42, headScale * 0.12, headScale * 0.12), this.eyebrowMat);
    browR.position.set(headScale * 0.36, headScale * 0.25, headScale * 0.86);
    browR.rotation.set(0.1, -0.18, 0.32);
    headGroup.add(browR);

    // Cavidades oculares escuras profundas
    const socketL = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.27, 8, 8), this.socketMat);
    socketL.position.set(-headScale * 0.36, headScale * 0.07, headScale * 0.84);
    socketL.scale.set(1.15, 1.15, 0.35);
    headGroup.add(socketL);

    const socketR = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.27, 8, 8), this.socketMat);
    socketR.position.set(headScale * 0.36, headScale * 0.07, headScale * 0.84);
    socketR.scale.set(1.15, 1.15, 0.35);
    headGroup.add(socketR);

    // Olhos gigantes amarelos-limão radioativos (brilho neon como na referência)
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.21, 10, 10), this.eyeMat);
    eyeL.position.set(-headScale * 0.36, headScale * 0.07, headScale * 0.92);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(headScale * 0.21, 10, 10), this.eyeMat);
    eyeR.position.set(headScale * 0.36, headScale * 0.07, headScale * 0.92);
    headGroup.add(eyeR);

    // Narinas escuras triangulares
    const nostril = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.14, headScale * 0.10, headScale * 0.10), this.socketMat);
    nostril.position.set(0, -headScale * 0.12, headScale * 0.93);
    headGroup.add(nostril);

    // Cavidade bucal escura aberta
    const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.70, headScale * 0.34, headScale * 0.25), this.mouthMat);
    mouthCavity.position.set(0, -headScale * 0.36, headScale * 0.76);
    headGroup.add(mouthCavity);

    // Dentes superiores quadrados espaçados de osso (exatamente como na imagem)
    const toothU1 = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.14, headScale * 0.14, headScale * 0.08), this.boneMat);
    toothU1.position.set(-headScale * 0.11, -headScale * 0.26, headScale * 0.86);
    headGroup.add(toothU1);

    const toothU2 = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.14, headScale * 0.14, headScale * 0.08), this.boneMat);
    toothU2.position.set(headScale * 0.11, -headScale * 0.26, headScale * 0.86);
    headGroup.add(toothU2);

    // Mandíbula inferior verde protuberante
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.82, headScale * 0.30, headScale * 0.65), skinMat);
    jaw.position.set(0, -headScale * 0.58, headScale * 0.55);
    headGroup.add(jaw);

    // Dentes inferiores irregulares pontiagudos
    const toothL1 = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.12, headScale * 0.14, headScale * 0.08), this.boneMat);
    toothL1.position.set(-headScale * 0.16, -headScale * 0.44, headScale * 0.84);
    headGroup.add(toothL1);

    const toothL2 = new THREE.Mesh(new THREE.BoxGeometry(headScale * 0.12, headScale * 0.14, headScale * 0.08), this.boneMat);
    toothL2.position.set(headScale * 0.08, -headScale * 0.44, headScale * 0.84);
    headGroup.add(toothL2);

    group.add(headGroup);

    // 3. Braços Assimétricos com Mãos Verdes e Dedos Espalmados (estilo arte de referência)
    const armLen = type === 'boss' ? 1.5 : (type === 'runner' ? 0.8 : 0.92);
    const armThickness = isHeavy ? 0.20 : 0.095;

    // Braço Esquerdo estendido para agarrar
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.46 * scale, 1.25 * scale, 0.25 * scale);
    leftArmGroup.rotation.x = -Math.PI / 2.2;
    leftArmGroup.rotation.y = 0.22;

    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(armThickness * scale, armThickness * scale, armLen * 0.45 * scale, 6), clothesMat);
    lUpper.position.set(0, 0, 0.15 * scale);
    lUpper.rotation.x = -Math.PI / 2;
    leftArmGroup.add(lUpper);

    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(armThickness * 0.85 * scale, armThickness * 0.7 * scale, armLen * 0.5 * scale, 6), skinMat);
    lForearm.position.set(0, 0, 0.46 * scale);
    lForearm.rotation.x = -Math.PI / 2;
    leftArmGroup.add(lForearm);

    // Palma da mão verde
    const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.15 * scale, 0.09 * scale, 0.12 * scale), skinMat);
    lPalm.position.set(0, 0.02 * scale, 0.74 * scale);
    leftArmGroup.add(lPalm);

    // 4 Dedos/Garras verdes esticados para frente
    const fingerOffsets = [-0.05, -0.015, 0.02, 0.055];
    fingerOffsets.forEach((fx, idx) => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.028 * scale, 0.028 * scale, 0.13 * scale), skinMat);
      finger.position.set(fx * scale, 0.02 * scale, 0.84 * scale);
      finger.rotation.y = (idx - 1.5) * 0.08;
      leftArmGroup.add(finger);
    });
    group.add(leftArmGroup);

    // Braço Direito
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.46 * scale, 1.18 * scale, 0.25 * scale);
    rightArmGroup.rotation.x = -Math.PI / 1.95;
    rightArmGroup.rotation.y = -0.18;

    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(armThickness * scale, armThickness * scale, armLen * 0.45 * scale, 6), clothesMat);
    rUpper.position.set(0, 0, 0.15 * scale);
    rUpper.rotation.x = -Math.PI / 2;
    rightArmGroup.add(rUpper);

    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(armThickness * 0.85 * scale, armThickness * 0.7 * scale, armLen * 0.5 * scale, 6), skinMat);
    rForearm.position.set(0, 0, 0.46 * scale);
    rForearm.rotation.x = -Math.PI / 2;
    rightArmGroup.add(rForearm);

    const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.15 * scale, 0.09 * scale, 0.12 * scale), skinMat);
    rPalm.position.set(0, 0.02 * scale, 0.74 * scale);
    rightArmGroup.add(rPalm);

    fingerOffsets.forEach((fx, idx) => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.028 * scale, 0.028 * scale, 0.13 * scale), skinMat);
      finger.position.set(fx * scale, 0.02 * scale, 0.84 * scale);
      finger.rotation.y = (idx - 1.5) * 0.08;
      rightArmGroup.add(finger);
    });
    group.add(rightArmGroup);

    // 4. Pernas Rasgadas e Desajeitadas
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.20 * scale, 0.65 * scale, 0);

    const lPants = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.11 * scale, 0.45 * scale, 6), this.pantsMat);
    lPants.position.set(0, -0.22 * scale, 0);
    const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.08 * scale, 0.35 * scale, 6), skinMat);
    lShin.position.set(0, -0.48 * scale, 0);
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.11 * scale, 0.28 * scale), this.bootMat);
    lBoot.position.set(0, -0.60 * scale, 0.05 * scale);
    leftLegGroup.add(lPants);
    leftLegGroup.add(lShin);
    leftLegGroup.add(lBoot);
    group.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.20 * scale, 0.65 * scale, 0);

    const rPants = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.11 * scale, 0.52 * scale, 6), this.pantsMat);
    rPants.position.set(0, -0.24 * scale, 0);
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.11 * scale, 0.28 * scale), this.bootMat);
    rBoot.position.set(0, -0.60 * scale, 0.05 * scale);
    rightLegGroup.add(rPants);
    rightLegGroup.add(rBoot);
    group.add(rightLegGroup);

    // Círculo de sinalização no chão (Boss / Exploder)
    let telegraphRing: THREE.Mesh | undefined;
    if (type === 'boss' || type === 'exploder') {
      const radius = (type === 'boss' ? (config as { smashRadius: number }).smashRadius : (config as { explosionRadius: number }).explosionRadius) * stageGrowthFactor;
      const ringGeo = new THREE.RingGeometry(radius * 0.9, radius, 32);
      telegraphRing = new THREE.Mesh(ringGeo, this.telegraphMat.clone());
      telegraphRing.rotation.x = -Math.PI / 2;
      telegraphRing.position.y = 0.04;
      telegraphRing.visible = false;
      this.scene.add(telegraphRing);
    }

    // 5. Barra de vida discreta e tática
    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.set(0, (type === 'boss' ? 3.4 : 2.2) * scale, 0);
    hpBarGroup.rotation.x = Math.PI / 4.0;

    const barWidth = 0.95 * scale;
    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth, 0.10),
      new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide })
    );
    hpBarGroup.add(hpBarBg);

    const hpBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(barWidth * 0.96, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
    );
    hpBarFill.position.z = 0.01;
    hpBarGroup.add(hpBarFill);
    group.add(hpBarGroup);

    group.position.set(x, 0, z);
    this.scene.add(group);

    const instance: ZombieInstance = {
      group,
      speed: config.speed * levelMultSpd,
      hp: Math.round(config.hp * levelMultHp),
      maxHp: Math.round(config.hp * levelMultHp),
      damage: Math.round(config.damage * levelMultDmg),
      scale,
      type,
      state: 'chase',
      animOffset: Math.random() * 10,
      attackCooldown: 1.0,
      windupTimer: 0,
      arms: [leftArmGroup, rightArmGroup],
      head: headGroup,
      bodyMesh: torso,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      telegraphRing,
      hpBarGroup,
      hpBarFill,
      patrolTarget: new THREE.Vector3(x + (Math.random() - 0.5) * 14, 0, z + (Math.random() - 0.5) * 14),
      patrolTimer: 2 + Math.random() * 4,
      deathTimer: 0,
      damageFlashTimer: 0,
      isCountedKill: false,
      lastDist: 999,
      stuckTimer: 0,
    };

    this.zombies.push(instance);
  }

  public repositionToOpenApproach(z: ZombieInstance, playerPos: THREE.Vector3, obstacles: THREE.Box3[], camera?: THREE.Camera): void {
    const bounds = GAME_CONFIG.arena.bounds - 4;
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    for (const ang of angles) {
      let cx = playerPos.x + Math.cos(ang) * 28;
      let cz = playerPos.z + Math.sin(ang) * 28;
      cx = Math.max(-bounds, Math.min(bounds, cx));
      cz = Math.max(-bounds, Math.min(bounds, cz));

      if (!this.isPointVisible(cx, cz, camera) && !this.checkCollision(cx, cz, obstacles, z.type === 'boss')) {
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
    onZombieExploded?: (zombie: ZombieInstance) => void,
    camera?: THREE.Camera
  ): void {
    // Pickups flutuando e girando em 3D
    this.pickups.forEach((p) => {
      p.mesh.rotation.y += delta * 2.5;
      p.mesh.position.y = 0.5 + Math.sin(performance.now() * 0.004) * 0.1;
    });

    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];

      // Atualiza posição do anel telegrafado no chão
      if (z.telegraphRing) {
        z.telegraphRing.position.x = z.group.position.x;
        z.telegraphRing.position.z = z.group.position.z;
      }

      // 1. Zumbi morto com animação de queda no chão
      if (z.state === 'dead') {
        if (z.telegraphRing) z.telegraphRing.visible = false;
        z.deathTimer += delta;
        if (z.group.rotation.x > -Math.PI / 2) {
          z.group.rotation.x -= delta * 4.5;
          z.group.position.y = Math.max(0.1, z.group.position.y - delta * 2);
        }
        if (z.deathTimer > 2.0) {
          if (z.telegraphRing) this.scene.remove(z.telegraphRing);
          this.scene.remove(z.group);
          this.zombies.splice(i, 1);
        }
        continue;
      }

      // 2. Feedback de dano com emissão vermelha
      if (z.damageFlashTimer > 0) {
        z.damageFlashTimer -= delta;
        const mat = z.bodyMesh.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(z.damageFlashTimer > 0 ? 0xff0000 : 0x000000);
      }

      // Atualiza barra de vida sobre o zumbi
      if (z.hpBarFill) {
        z.hpBarFill.scale.x = Math.max(0, z.hp / z.maxHp);
      }

      let distToPlayer = z.group.position.distanceTo(playerPos);

      // Verificação anti-travamento fora da tela:
      // Se não consegue se aproximar por > 2.5s, reposiciona na via livre em direção ao jogador
      if (!this.isPointVisible(z.group.position.x, z.group.position.z, camera)) {
        if (Math.abs(distToPlayer - z.lastDist) < 0.25) {
          z.stuckTimer = (z.stuckTimer || 0) + delta;
          if (z.stuckTimer > 2.5) {
            z.stuckTimer = 0;
            this.repositionToOpenApproach(z, playerPos, obstacles, camera);
            distToPlayer = z.group.position.distanceTo(playerPos);
          }
        } else {
          z.lastDist = distToPlayer;
          z.stuckTimer = 0;
        }
      } else {
        z.lastDist = distToPlayer;
        z.stuckTimer = 0;
      }

      // Se ficar excessivamente distante (> 52m), reposiciona suavemente fora da visão
      if (distToPlayer > 52) {
        this.repositionToOpenApproach(z, playerPos, obstacles, camera);
        distToPlayer = z.group.position.distanceTo(playerPos);
      }

      // 3. Máquina de Estados da IA: Perseguição ativa implacável
      if (z.type === 'exploder') {
        if (distToPlayer <= 3.2 && z.state !== 'exploding') {
          z.state = 'exploding';
          z.windupTimer = 1.0;
          if (z.telegraphRing) z.telegraphRing.visible = true;
        } else if (z.state !== 'exploding') {
          z.state = 'chase';
        }
      } else if (z.type === 'boss') {
        if (distToPlayer <= 5.5 && z.attackCooldown <= 0 && z.state !== 'windup') {
          z.state = 'windup';
          z.windupTimer = 1.2;
          if (z.telegraphRing) z.telegraphRing.visible = true;
        } else if (z.state !== 'windup') {
          z.state = distToPlayer <= 2.2 ? 'attack' : 'chase';
        }
      } else {
        if (distToPlayer <= 1.8) {
          z.state = 'attack';
        } else {
          z.state = 'chase';
        }
      }

      // 4. Execução do Comportamento
      let moveDir = new THREE.Vector3();

      if (z.state === 'exploding') {
        z.windupTimer -= delta;
        const pulse = 1.0 + Math.sin(performance.now() * 0.03) * 0.2;
        z.group.scale.set(pulse * z.scale, pulse * z.scale, pulse * z.scale);

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
        z.arms[0].rotation.x = -Math.PI + 0.3;
        z.arms[1].rotation.x = -Math.PI + 0.3;

        if (z.windupTimer <= 0) {
          if (z.telegraphRing) z.telegraphRing.visible = false;
          if (distToPlayer <= 6.5) {
            onZombieAttackPlayer(z.damage);
          }
          z.attackCooldown = 3.0;
          z.state = 'chase';
        }
      } else if (z.state === 'attack') {
        moveDir.set(0, 0, 0);
        z.attackCooldown -= delta;
        const lunge = Math.sin(performance.now() * 0.016) * 0.45;
        z.arms[0].rotation.x = -Math.PI / 2.3 + lunge;
        z.arms[1].rotation.x = -Math.PI / 2.1 + lunge;

        if (z.attackCooldown <= 0) {
          z.attackCooldown = z.type === 'runner' ? 0.7 : 1.1;
          onZombieAttackPlayer(z.damage);
        }
      } else if (z.state === 'chase' || z.state === 'patrol') {
        moveDir.subVectors(playerPos, z.group.position);
        moveDir.y = 0;
        moveDir.normalize();
      }

      // 5. Movimentação física 3D com desvio tangencial de obstáculos
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

        // Desvio pelas 4 tangentes ao redor de veículos ou barricadas
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

        const angle = Math.atan2(moveDir.x, moveDir.z);
        z.group.rotation.y = angle;
      }

      // 6. Animações de passos 3D (Balanço claudicante de zumbi, cabeça, braços e pernas)
      z.animOffset += delta * (z.type === 'runner' ? 14.0 : 6.0);
      const shamble = Math.sin(z.animOffset);
      z.group.rotation.z = shamble * 0.06;
      z.head.rotation.y = Math.cos(z.animOffset * 0.7) * 0.18;
      z.head.rotation.z = -0.15 + Math.sin(z.animOffset * 0.5) * 0.08;

      if (z.leftLeg && z.rightLeg) {
        z.leftLeg.rotation.x = shamble * 0.45;
        z.rightLeg.rotation.x = -shamble * 0.35;
      }
      if (z.arms && z.arms.length >= 2 && z.state !== 'attack' && z.state !== 'windup') {
        z.arms[0].rotation.x = -Math.PI / 2.2 + Math.sin(z.animOffset * 0.9) * 0.15;
        z.arms[1].rotation.x = -Math.PI / 1.95 + Math.cos(z.animOffset * 0.8) * 0.12;
      }

      // Mantém a barra de vida alinhada horizontalmente com a visão da câmera
      if (z.hpBarGroup) {
        z.hpBarGroup.rotation.y = -z.group.rotation.y;
      }
    }
  }

  // Verifica colisões de projéteis contra zumbis em 3D
  public checkBulletHits(
    bullets: Bullet[],
    onHit: (zombie: ZombieInstance, hitPos: THREE.Vector3) => void,
    onConfirmedKill: (zombie: ZombieInstance) => void
  ): number[] {
    const hitsToRemove: number[] = [];

    for (let bIdx = 0; bIdx < bullets.length; bIdx++) {
      const b = bullets[bIdx];
      const bPos = b.mesh.position;

      for (let zIdx = 0; zIdx < this.zombies.length; zIdx++) {
        const z = this.zombies[zIdx];
        if (z.state === 'dead') continue;

        const zPos = z.group.position;
        const radius = (z.type === 'boss' ? 1.8 : (z.type === 'brute' ? 1.0 : 0.7)) * z.scale;

        if (
          Math.hypot(bPos.x - zPos.x, bPos.z - zPos.z) < radius &&
          bPos.y >= 0.1 &&
          bPos.y <= (z.type === 'boss' ? 4.5 : (z.type === 'brute' ? 2.8 : 2.2)) * z.scale
        ) {
          hitsToRemove.push(bIdx);
          z.hp -= b.damage;
          z.damageFlashTimer = 0.14;

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
    const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const mat = new THREE.MeshStandardMaterial({
      color: isMedkit ? 0xef4444 : 0xfacc15,
      roughness: 0.3,
      metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, 0.5, pos.z);
    mesh.castShadow = true;
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

  // Retorna a lista de zumbis vivos para o cão companheiro farejar e atacar
  public getAliveZombies(): ZombieInstance[] {
    return this.zombies.filter((z) => z.state !== 'dead' && !z.isCountedKill);
  }

  // Aplica dano direto causado pela mordida do cão companheiro
  public damageZombie(
    zombie: ZombieInstance,
    amount: number,
    onHit?: (z: ZombieInstance, hitPos: THREE.Vector3) => void,
    onConfirmedKill?: (z: ZombieInstance) => void
  ): boolean {
    if (zombie.state === 'dead') return false;

    zombie.hp -= amount;
    zombie.damageFlashTimer = 0.16;
    onHit?.(zombie, zombie.group.position);

    if (zombie.hp <= 0 && !zombie.isCountedKill) {
      zombie.isCountedKill = true;
      zombie.state = 'dead';
      onConfirmedKill?.(zombie);
      this.spawnPickup(zombie.group.position, zombie.type === 'boss');
      return true;
    }
    return false;
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
