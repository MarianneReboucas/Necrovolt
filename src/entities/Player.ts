import * as THREE from 'three';
import { GAME_CONFIG } from '../config';
import type { SkinId } from '../systems/EconomyCatalog';
import { SKINS_CATALOG } from '../systems/EconomyCatalog';

export class Player {
  public group: THREE.Group;
  public speed: number = GAME_CONFIG.player.baseSpeed;
  public hp: number = GAME_CONFIG.player.maxHp;
  public maxHp: number = GAME_CONFIG.player.maxHp;
  public isDead: boolean = false;
  public iFrameTimer: number = 0;

  // Partes do corpo para animações e personalização
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private backpack: THREE.Mesh;
  private rightArm: THREE.Group;
  private leftArm: THREE.Group;
  private shieldGroup: THREE.Group;
  private shieldEnergyMat?: THREE.MeshStandardMaterial;
  private hatGroup: THREE.Group;
  private faceFeaturesGroup: THREE.Group;
  private strapsGroup: THREE.Group;
  private walkTime: number = 0;
  private recoilOffset: number = 0;

  // Materiais dinâmicos
  private coatMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private backpackMat: THREE.MeshStandardMaterial;
  private hatMesh: THREE.Mesh;
  private visorMesh: THREE.Mesh;
  private accessoryContainer: THREE.Group;
  private hpBarGreen: THREE.Mesh;
  private hpBarGroup?: THREE.Group;
  private selectRing?: THREE.Mesh;
  public isFirstPerson: boolean = false;

  private currentSkinJacketColor: number = 0x181f18;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf0ba94,
      roughness: 0.6,
    });
    this.coatMat = new THREE.MeshStandardMaterial({
      color: this.currentSkinJacketColor,
      roughness: 0.7,
    });
    this.pantsMat = new THREE.MeshStandardMaterial({
      color: 0x181c19,
      roughness: 0.8,
    });
    this.backpackMat = new THREE.MeshStandardMaterial({
      color: 0x1a241b,
      roughness: 0.85,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x0f1310,
      roughness: 0.9,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      metalness: 0.85,
      roughness: 0.25,
    });

    // --- CORPO (Traje de combate com alças táticas neon) ---
    const bodyGeo = new THREE.SphereGeometry(0.55, 14, 12);
    this.bodyMesh = new THREE.Mesh(bodyGeo, this.coatMat);
    this.bodyMesh.scale.set(1.15, 1.0, 1.05);
    this.bodyMesh.position.y = 0.95;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Alças táticas neon verde estilo colete/mochila da referência
    this.strapsGroup = new THREE.Group();
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x15803d,
      emissiveIntensity: 0.45,
      roughness: 0.4,
    });
    const leftStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.08), strapMat);
    leftStrap.position.set(-0.25, 0.02, 0.49);
    this.strapsGroup.add(leftStrap);

    const rightStrap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.54, 0.08), strapMat);
    rightStrap.position.set(0.25, 0.02, 0.49);
    this.strapsGroup.add(rightStrap);

    // Fecho peitoral
    const chestClip = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.05, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111612, roughness: 0.8 })
    );
    chestClip.position.set(0, 0.08, 0.51);
    this.strapsGroup.add(chestClip);

    this.bodyMesh.add(this.strapsGroup);

    // --- CABEÇA ---
    const headGeo = new THREE.SphereGeometry(0.46, 16, 14);
    this.headMesh = new THREE.Mesh(headGeo, skinMat);
    this.headMesh.position.set(0, 1.7, 0.05);
    this.headMesh.castShadow = true;
    this.group.add(this.headMesh);

    // Feições estilizadas determinadas (olhos e sobrancelhas da referência)
    this.faceFeaturesGroup = new THREE.Group();
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.03), eyeMat);
    leftEye.position.set(-0.15, -0.01, 0.44);
    leftEye.rotation.z = -0.12;
    this.faceFeaturesGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.03), eyeMat);
    rightEye.position.set(0.15, -0.01, 0.44);
    rightEye.rotation.z = 0.12;
    this.faceFeaturesGroup.add(rightEye);

    const browMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    const leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), browMat);
    leftBrow.position.set(-0.16, 0.08, 0.45);
    leftBrow.rotation.z = -0.22;
    this.faceFeaturesGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), browMat);
    rightBrow.position.set(0.16, 0.08, 0.45);
    rightBrow.rotation.z = 0.22;
    this.faceFeaturesGroup.add(rightBrow);

    // Orelhas
    const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), skinMat);
    leftEar.scale.set(0.4, 1.0, 0.8);
    leftEar.position.set(-0.46, -0.02, 0.0);
    this.faceFeaturesGroup.add(leftEar);

    const rightEar = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), skinMat);
    rightEar.scale.set(0.4, 1.0, 0.8);
    rightEar.position.set(0.46, -0.02, 0.0);
    this.faceFeaturesGroup.add(rightEar);

    this.headMesh.add(this.faceFeaturesGroup);

    // --- CHAPÉU BOONIE TÁTICO & ÓCULOS NEON VERDE (Da Imagem de Referência) ---
    this.hatGroup = new THREE.Group();

    // 1. Topo do Chapéu Boonie
    const crownGeo = new THREE.CylinderGeometry(0.44, 0.49, 0.28, 16);
    this.hatMesh = new THREE.Mesh(
      crownGeo,
      new THREE.MeshStandardMaterial({ color: 0x1b231c, roughness: 0.8 })
    );
    this.hatMesh.position.set(0, 0.32, -0.03);
    this.hatMesh.rotation.x = -0.05;
    this.hatGroup.add(this.hatMesh);

    // 2. Aba circular 360° do chapéu
    const brimGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.04, 18);
    this.visorMesh = new THREE.Mesh(
      brimGeo,
      new THREE.MeshStandardMaterial({ color: 0x1b231c, roughness: 0.8 })
    );
    this.visorMesh.position.set(0, 0.20, -0.03);
    this.visorMesh.rotation.x = -0.05;
    this.hatGroup.add(this.visorMesh);

    // 3. Faixa tática com detalhe neon lateral
    const bandMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.495, 0.495, 0.08, 16),
      new THREE.MeshStandardMaterial({ color: 0x111612, roughness: 0.9 })
    );
    bandMesh.position.set(0, 0.26, -0.03);
    bandMesh.rotation.x = -0.05;
    this.hatGroup.add(bandMesh);

    const hatNotch = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.03, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    hatNotch.position.set(-0.48, 0.28, 0.0);
    this.hatGroup.add(hatNotch);

    // 4. Óculos táticos com lentes neon verde da referência
    const goggleFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.16, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x111413, roughness: 0.4, metalness: 0.6 })
    );
    goggleFrame.position.set(0, 0.28, 0.44);
    this.hatGroup.add(goggleFrame);

    const leftLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x22c55e,
        emissiveIntensity: 0.95,
        roughness: 0.15,
      })
    );
    leftLens.position.set(-0.13, 0.28, 0.51);
    this.hatGroup.add(leftLens);

    const rightLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        emissive: 0x22c55e,
        emissiveIntensity: 0.95,
        roughness: 0.15,
      })
    );
    rightLens.position.set(0.13, 0.28, 0.51);
    this.hatGroup.add(rightLens);

    this.headMesh.add(this.hatGroup);

    // Recipiente modular de outros acessórios de skins
    this.accessoryContainer = new THREE.Group();
    this.headMesh.add(this.accessoryContainer);

    // --- MOCHILA ---
    const backpackGeo = new THREE.BoxGeometry(0.7, 0.8, 0.5);
    this.backpack = new THREE.Mesh(backpackGeo, this.backpackMat);
    this.backpack.position.set(0, 1.05, -0.6);
    this.backpack.castShadow = true;
    this.group.add(this.backpack);

    // Saco de dormir
    const roll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.75, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b231c })
    );
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 1.55, -0.6);
    this.group.add(roll);

    // --- BRAÇO DIREITO (Arma de fogo empunhada como na imagem) ---
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.55, 1.25, 0.1);

    const armGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.5, 8);
    const armMesh = new THREE.Mesh(armGeo, this.coatMat);
    armMesh.rotation.x = -Math.PI / 2;
    armMesh.position.set(0, 0, 0.25);
    this.rightArm.add(armMesh);

    // Pistola tática idêntica à empunhada na referência
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.17, 0.42), gunMat);
    gunBody.position.set(0, 0.05, 0.55);
    this.rightArm.add(gunBody);

    const gunBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8),
      gunMat
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.09, 0.78);
    this.rightArm.add(gunBarrel);

    this.group.add(this.rightArm);

    // --- BRAÇO ESQUERDO COM O ESCUDO DE ENERGIA VERDE NEON DA REFERÊNCIA ---
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.52, 1.22, 0.2);

    const leftArmMesh = new THREE.Mesh(armGeo, this.coatMat);
    leftArmMesh.rotation.x = -Math.PI / 2.3;
    leftArmMesh.rotation.y = 0.42;
    leftArmMesh.position.set(0, 0, 0.22);
    this.leftArm.add(leftArmMesh);

    // Escudo Hexagonal de Plasma Bio-Energético
    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(0.10, -0.05, 0.46);
    this.shieldGroup.rotation.y = -0.22;
    this.shieldGroup.rotation.x = -0.05;

    // 1. Moldura externa hexagonal do escudo
    const shieldBorderGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.05, 6);
    const shieldBorderMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.3,
    });
    const shieldBorder = new THREE.Mesh(shieldBorderGeo, shieldBorderMat);
    shieldBorder.rotation.x = Math.PI / 2;
    shieldBorder.rotation.z = Math.PI / 6;
    this.shieldGroup.add(shieldBorder);

    // 2. Barreira de energia de plasma interior
    const shieldEnergyGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.03, 6);
    this.shieldEnergyMat = new THREE.MeshStandardMaterial({
      color: 0x86efac,
      emissive: 0x22c55e,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.78,
      roughness: 0.1,
    });
    const shieldEnergy = new THREE.Mesh(shieldEnergyGeo, this.shieldEnergyMat);
    shieldEnergy.rotation.x = Math.PI / 2;
    shieldEnergy.rotation.z = Math.PI / 6;
    shieldEnergy.position.z = 0.01;
    this.shieldGroup.add(shieldEnergy);

    // 3. Núcleo brilhante central de energia
    const coreMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 })
    );
    coreMesh.position.z = 0.035;
    this.shieldGroup.add(coreMesh);

    // 4. Raios elétricos estáticos no escudo (estilo relâmpagos da imagem)
    const crackleGeo = new THREE.BufferGeometry();
    const cracklePoints: number[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      cracklePoints.push(0, 0, 0.038);
      const midR = 0.24;
      const jAngle = angle + (i % 2 === 0 ? 0.15 : -0.15);
      cracklePoints.push(Math.cos(jAngle) * midR, Math.sin(jAngle) * midR, 0.038);

      cracklePoints.push(Math.cos(jAngle) * midR, Math.sin(jAngle) * midR, 0.038);
      const outR = 0.46;
      cracklePoints.push(Math.cos(angle) * outR, Math.sin(angle) * outR, 0.038);
    }
    crackleGeo.setAttribute('position', new THREE.Float32BufferAttribute(cracklePoints, 3));
    const crackleMat = new THREE.LineBasicMaterial({ color: 0xbbf7d0, linewidth: 2 });
    const crackleLines = new THREE.LineSegments(crackleGeo, crackleMat);
    this.shieldGroup.add(crackleLines);

    // 5. Luz pontual verde suave emitida pelo escudo iluminando a cena
    const shieldLight = new THREE.PointLight(0x22c55e, 1.3, 3.5, 1.8);
    shieldLight.position.set(0, 0, 0.15);
    this.shieldGroup.add(shieldLight);

    this.leftArm.add(this.shieldGroup);
    this.group.add(this.leftArm);

    // --- PERNAS ---
    const legGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.55, 8);
    this.leftLeg = new THREE.Mesh(legGeo, this.pantsMat);
    this.leftLeg.position.set(-0.24, 0.35, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, this.pantsMat);
    this.rightLeg.position.set(0.24, 0.35, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // Botas
    const bootGeo = new THREE.BoxGeometry(0.26, 0.2, 0.4);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.24, 0.1, 0.08);
    this.group.add(leftBoot);

    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.24, 0.1, 0.08);
    this.group.add(rightBoot);

    // Lanterna ampla e brilhante de longo alcance
    const flashlight = new THREE.SpotLight(0xfffbeb, 6.0, 42, Math.PI / 3.8, 0.35, 1.0);
    flashlight.position.set(0.3, 1.2, 0.3);
    flashlight.target.position.set(0.3, 0.5, 8);
    this.group.add(flashlight);
    this.group.add(flashlight.target);

    // Círculo de seleção branco/ciano no chão (como exatamente na imagem ao redor do personagem)
    const selectRingGeo = new THREE.RingGeometry(1.05, 1.2, 32);
    const selectRingMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.selectRing = new THREE.Mesh(selectRingGeo, selectRingMat);
    this.selectRing.rotation.x = -Math.PI / 2;
    this.selectRing.position.y = 0.02;
    this.group.add(this.selectRing);

    // Pequena barra de vida verde flutuante acima da cabeça do personagem
    this.hpBarGroup = new THREE.Group();
    this.hpBarGroup.position.set(0, 2.35, 0);
    this.hpBarGroup.rotation.x = Math.PI / 4.5; // Inclinada em direção à câmera isométrica

    const hpBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    this.hpBarGroup.add(hpBarBg);

    this.hpBarGreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x22c55e })
    );
    this.hpBarGreen.position.z = 0.01;
    this.hpBarGroup.add(this.hpBarGreen);
    this.group.add(this.hpBarGroup);

    // Inicializa acessórios padrão
    this.setSkin('skin_urban');
  }

  public setHpBarVisible(visible: boolean): void {
    if (this.hpBarGroup) {
      this.hpBarGroup.visible = visible;
    }
  }

  // Alterna o modelo visual entre 1ª Pessoa (olhos do boneco) e 3ª Pessoa Isométrica
  public setFirstPersonMode(isFirstPerson: boolean): void {
    this.isFirstPerson = isFirstPerson;
    this.headMesh.visible = !isFirstPerson;
    this.backpack.visible = !isFirstPerson;
    if (this.leftArm) this.leftArm.visible = !isFirstPerson;
    if (this.hpBarGroup) this.hpBarGroup.visible = !isFirstPerson;
    if (this.selectRing) this.selectRing.visible = !isFirstPerson;

    if (isFirstPerson) {
      // Posiciona a arma no campo de visão frontal clássico de jogos de tiro (FPS)
      this.rightArm.position.set(0.28, 1.35, 0.45);
      this.bodyMesh.visible = false;
      this.leftLeg.visible = false;
      this.rightLeg.visible = false;
    } else {
      this.rightArm.position.set(0.55, 1.25, 0.1);
      this.bodyMesh.visible = true;
      this.leftLeg.visible = true;
      this.rightLeg.visible = true;
    }
  }

  // Aplica o tema completo da skin com troca modular de acessórios
  public setSkin(skinId: SkinId): void {
    const skin = SKINS_CATALOG[skinId] || SKINS_CATALOG['skin_urban'];
    this.currentSkinJacketColor = skin.jacketColor;

    this.coatMat.color.setHex(skin.jacketColor);
    this.pantsMat.color.setHex(skin.pantsColor);
    this.backpackMat.color.setHex(skin.backpackColor);
    (this.hatMesh.material as THREE.MeshStandardMaterial).color.setHex(skin.hatColor);
    (this.visorMesh.material as THREE.MeshStandardMaterial).color.setHex(skin.hatColor);

    // Reconstrói acessórios modulares na cabeça
    this.buildAccessory(skin.accessoryType);
  }

  private buildAccessory(
    type: 'goggles' | 'gasmask' | 'welding_mask' | 'scav_hood' | 'helmet' | 'visor'
  ): void {
    // Limpa acessórios anteriores
    while (this.accessoryContainer.children.length > 0) {
      const child = this.accessoryContainer.children[0];
      this.accessoryContainer.remove(child);
    }

    if (type === 'goggles') {
      const gogglesMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.8 });
      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.1), gogglesMat);
      goggles.position.set(0, 1.82, 0.46);
      this.accessoryContainer.add(goggles);
    } else if (type === 'gasmask') {
      // Máscara com respirador e filtro cilíndrico
      const maskMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
      const maskBase = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.25), maskMat);
      maskBase.position.set(0, 1.62, 0.45);
      this.accessoryContainer.add(maskBase);

      const filterMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.6 });
      const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8), filterMat);
      filter.rotation.x = Math.PI / 2;
      filter.position.set(0, 1.55, 0.6);
      this.accessoryContainer.add(filter);
    } else if (type === 'welding_mask') {
      // Máscara de solda basculante de metal
      const maskMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, metalness: 0.8, roughness: 0.3 });
      const mask = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.15), maskMat);
      mask.position.set(0, 1.7, 0.48);
      this.accessoryContainer.add(mask);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.08, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x15803d })
      );
      glass.position.set(0, 1.72, 0.56);
      this.accessoryContainer.add(glass);
    } else if (type === 'scav_hood') {
      // Capuz rústico de saqueador cobrindo o pescoço e laterais
      const hoodMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 });
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.58, 0.45, 12), hoodMat);
      hood.position.set(0, 1.72, 0.05);
      this.accessoryContainer.add(hood);
    } else if (type === 'helmet') {
      // Capacete de contenção tático pressurizado
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), helmetMat);
      dome.position.set(0, 1.74, 0.05);
      this.accessoryContainer.add(dome);

      const goldVisor = new THREE.Mesh(
        new THREE.SphereGeometry(0.48, 12, 8, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.1 })
      );
      goldVisor.rotation.y = -Math.PI / 2;
      goldVisor.position.set(0, 1.74, 0.1);
      this.accessoryContainer.add(goldVisor);
    } else if (type === 'visor') {
      // Visor tático militar neon verde
      const visorNeon = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.08, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x39ff14 })
      );
      visorNeon.position.set(0, 1.78, 0.48);
      this.accessoryContainer.add(visorNeon);
    }
  }

  public hazardSpeedMult: number = 1.0;

  public applySpeedModifier(speedMultiplier: number): void {
    this.speed = GAME_CONFIG.player.baseSpeed * speedMultiplier;
  }

  public setHazardSpeedModifier(hazardMult: number): void {
    this.hazardSpeedMult = hazardMult;
  }

  public update(
    input: { x: number; z: number },
    aimTarget: THREE.Vector3,
    delta: number,
    obstacles: THREE.Box3[],
    isRunning: boolean = false,
    isFirstPerson: boolean = false,
    cameraYaw: number = 0
  ): void {
    if (this.hpBarGreen) {
      this.hpBarGreen.scale.x = Math.max(0, this.hp / this.maxHp);
    }

    if (this.isDead) {
      if (this.group.rotation.x > -Math.PI / 2) {
        this.group.rotation.x -= delta * 3.5;
        this.group.position.y = Math.max(0.3, this.group.position.y - delta * 2.0);
      }
      return;
    }

    if (this.iFrameTimer > 0) {
      this.iFrameTimer -= delta;
      const flashRed = Math.floor(this.iFrameTimer * 12) % 2 === 0;
      this.coatMat.color.setHex(flashRed ? 0xef4444 : this.currentSkinJacketColor);
      if (this.iFrameTimer <= 0) {
        this.coatMat.color.setHex(this.currentSkinJacketColor);
      }
    }

    if (isFirstPerson) {
      // Em 1ª Pessoa, o corpo acompanha diretamente o giro horizontal da visão (yaw)
      this.group.rotation.y = cameraYaw;
    } else {
      const dirToAim = new THREE.Vector3().subVectors(aimTarget, this.group.position);
      dirToAim.y = 0;
      if (dirToAim.lengthSq() > 0.01) {
        const aimAngle = Math.atan2(dirToAim.x, dirToAim.z);
        this.group.rotation.y = aimAngle;
      }
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - delta * 5.0);
      if (isFirstPerson) {
        this.rightArm.position.z = 0.45 - this.recoilOffset * 0.12;
      } else {
        this.rightArm.position.z = 0.1 - this.recoilOffset * 0.15;
      }
    }

    const isMoving = input.x !== 0 || input.z !== 0;
    if (isMoving) {
      const sprintMult = isRunning ? 1.65 : 1.0;
      const moveDistance = this.speed * this.hazardSpeedMult * sprintMult * delta;

      let worldDx = input.x;
      let worldDz = input.z;

      if (isFirstPerson) {
        // Converte WASD relativo à visão da câmera FPS
        const forwardAmount = -input.z; // W = +frente, S = -trás
        const rightAmount = input.x;    // D = +direita, A = -esquerda
        worldDx = Math.sin(cameraYaw) * forwardAmount + Math.cos(cameraYaw) * rightAmount;
        worldDz = Math.cos(cameraYaw) * forwardAmount - Math.sin(cameraYaw) * rightAmount;
      }

      const nextX = this.group.position.x + worldDx * moveDistance;
      const nextZ = this.group.position.z + worldDz * moveDistance;

      const bounds = GAME_CONFIG.arena.bounds;
      if (Math.abs(nextX) < bounds && !this.checkCollision(nextX, this.group.position.z, obstacles)) {
        this.group.position.x = nextX;
      }
      if (Math.abs(nextZ) < bounds && !this.checkCollision(this.group.position.x, nextZ, obstacles)) {
        this.group.position.z = nextZ;
      }

      this.walkTime += delta * (isRunning ? 18 : 12);
      const sway = Math.sin(this.walkTime);
      this.bodyMesh.position.y = 0.95 + Math.abs(sway) * 0.08;
      this.headMesh.position.y = 1.7 + Math.abs(sway) * 0.07;
      if (this.leftArm) {
        this.leftArm.position.y = 1.22 + Math.abs(sway) * 0.05;
        this.leftArm.rotation.x = -Math.PI / 2.3 + sway * 0.06;
      }
      if (this.shieldEnergyMat) {
        this.shieldEnergyMat.opacity = 0.74 + Math.sin(this.walkTime * 3) * 0.12;
      }
      this.bodyMesh.rotation.z = sway * 0.06;
      this.leftLeg.position.z = sway * 0.18;
      this.rightLeg.position.z = -sway * 0.18;
    } else {
      this.walkTime += delta * 3;
      const breath = Math.sin(this.walkTime) * 0.02;
      this.bodyMesh.scale.set(1.15 + breath, 1.0 - breath, 1.05 + breath);
      this.leftLeg.position.z = 0;
      this.rightLeg.position.z = 0;
      if (this.leftArm) {
        this.leftArm.position.y = 1.22;
        this.leftArm.rotation.x = -Math.PI / 2.3;
      }
      if (this.shieldEnergyMat) {
        this.shieldEnergyMat.opacity = 0.74 + Math.sin(this.walkTime * 2) * 0.08;
      }
      this.bodyMesh.rotation.z = 0;
    }
  }

  public triggerRecoil(): void {
    this.recoilOffset = 1.0;
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
    this.hazardSpeedMult = 1.0;
    this.coatMat.color.setHex(this.currentSkinJacketColor);
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.bodyMesh.position.set(0, 0.95, 0);
    this.headMesh.position.set(0, 1.7, 0.05);
    if (this.leftArm) {
      this.leftArm.position.set(-0.52, 1.22, 0.2);
      this.leftArm.rotation.set(0, 0, 0);
    }
  }

  private checkCollision(x: number, z: number, obstacles: THREE.Box3[]): boolean {
    const playerRadius = GAME_CONFIG.player.radius;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(x - playerRadius, 0, z - playerRadius),
      new THREE.Vector3(x + playerRadius, 2.2, z + playerRadius)
    );

    for (let i = 0; i < obstacles.length; i++) {
      if (playerBox.intersectsBox(obstacles[i])) {
        return true;
      }
    }
    return false;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }
}
