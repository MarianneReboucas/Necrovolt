import * as THREE from 'three';
import type { ZombieInstance } from './ZombieManager';

/**
 * DogCompanion: Cão de Combate Tático Preto (K9)
 * Fiel companheiro de quatro patas que acompanha o sobrevivente,
 * patrulha ao lado dele, persegue e ataca zumbis com mordidas ferozes.
 */
export class DogCompanion {
  public group: THREE.Group;
  private scene: THREE.Scene;

  // Partes do modelo 3D canino
  private bodyMesh: THREE.Mesh;
  private headGroup: THREE.Group;
  private flLeg: THREE.Group;
  private frLeg: THREE.Group;
  private blLeg: THREE.Group;
  private brLeg: THREE.Group;
  private tailGroup: THREE.Group;

  // Estado e IA do cão
  private state: 'follow' | 'chase' | 'attack' = 'follow';
  private targetZombie: ZombieInstance | null = null;
  private walkTime: number = 0;
  private biteCooldown: number = 0;
  private barkTimer: number = 2.0; // Intervalo para latidos ocasionais
  private pounceTime: number = 0;

  // Atributos de combate
  public damage: number = 32;
  public speed: number = 8.5; // Ágil e rápido para alcançar os zumbis
  public attackRange: number = 1.35;
  public detectionRange: number = 13.0;

  constructor(scene: THREE.Scene, initialPlayerPos: THREE.Vector3) {
    this.scene = scene;
    this.group = new THREE.Group();

    // ==========================================
    // MATERIAIS DO CÃO LARANJA-CARAMELO CLARO
    // ==========================================
    // Pelagem laranja puxada para o caramelo claro (estilo Shiba Inu / Akita / Golden)
    const furCaramelMat = new THREE.MeshStandardMaterial({
      color: 0xd97724, // Laranja caramelo vibrante e quente
      roughness: 0.65,
      metalness: 0.12,
    });

    // Focinho, bochechas e patas em creme caramelo claro suave
    const lightSnoutMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7, // Creme suave caramelo claro
      roughness: 0.72,
    });

    // Coleira tática azul marinho com fivela de aço (alto contraste)
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.5,
      metalness: 0.2,
    });

    const buckleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.2,
    });

    // Olhos cor âmbar escuro / castanho brilhante
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1c1917 });

    // ==========================================
    // CORPO PRINCIPAL
    // ==========================================
    // Tronco / Dorso
    const bodyGeo = new THREE.BoxGeometry(0.44, 0.42, 0.88);
    this.bodyMesh = new THREE.Mesh(bodyGeo, furCaramelMat);
    this.bodyMesh.position.y = 0.52;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // Peitoral robusto
    const chestGeo = new THREE.BoxGeometry(0.48, 0.46, 0.38);
    const chestMesh = new THREE.Mesh(chestGeo, lightSnoutMat);
    chestMesh.position.set(0, 0.56, 0.26);
    chestMesh.castShadow = true;
    this.group.add(chestMesh);

    // ==========================================
    // CABEÇA & FOCINHO ARTICULADOS
    // ==========================================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.76, 0.48);

    // Pescoço
    const neckGeo = new THREE.BoxGeometry(0.3, 0.36, 0.32);
    const neckMesh = new THREE.Mesh(neckGeo, furCaramelMat);
    neckMesh.position.set(0, -0.05, -0.06);
    neckMesh.rotation.x = 0.35;
    this.headGroup.add(neckMesh);

    // Coleira tática no pescoço
    const collarMesh = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.1, 0.35), collarMat);
    collarMesh.position.set(0, -0.08, -0.04);
    collarMesh.rotation.x = 0.35;
    this.headGroup.add(collarMesh);

    const tagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), buckleMat);
    tagMesh.position.set(0, -0.14, 0.14);
    this.headGroup.add(tagMesh);

    // Cabeça
    const headGeo = new THREE.BoxGeometry(0.34, 0.32, 0.36);
    const headMesh = new THREE.Mesh(headGeo, furCaramelMat);
    headMesh.position.set(0, 0.15, 0.08);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Focinho em tom creme caramelo claro
    const snoutGeo = new THREE.BoxGeometry(0.22, 0.18, 0.28);
    const snoutMesh = new THREE.Mesh(snoutGeo, lightSnoutMat);
    snoutMesh.position.set(0, 0.08, 0.32);
    this.headGroup.add(snoutMesh);

    // Trufa / Nariz preto
    const noseGeo = new THREE.BoxGeometry(0.09, 0.07, 0.07);
    const noseMesh = new THREE.Mesh(noseGeo, new THREE.MeshBasicMaterial({ color: 0x050505 }));
    noseMesh.position.set(0, 0.13, 0.47);
    this.headGroup.add(noseMesh);

    // Olhos expressivos
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
      eye.position.set(ex, 0.2, 0.24);
      this.headGroup.add(eye);
    });

    // Orelhas empinadas
    [-0.12, 0.12].forEach((earX) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), furCaramelMat);
      ear.position.set(earX, 0.38, 0.05);
      ear.rotation.x = -0.15;
      ear.rotation.z = earX > 0 ? -0.12 : 0.12;
      this.headGroup.add(ear);
    });

    this.group.add(this.headGroup);

    // ==========================================
    // 4 PATAS ARTICULADAS
    // ==========================================
    this.flLeg = this.createLeg(furCaramelMat, lightSnoutMat, -0.18, 0.32);
    this.frLeg = this.createLeg(furCaramelMat, lightSnoutMat, 0.18, 0.32);
    this.blLeg = this.createLeg(furCaramelMat, lightSnoutMat, -0.18, -0.32);
    this.brLeg = this.createLeg(furCaramelMat, lightSnoutMat, 0.18, -0.32);

    this.group.add(this.flLeg);
    this.group.add(this.frLeg);
    this.group.add(this.blLeg);
    this.group.add(this.brLeg);

    // ==========================================
    // CAUDA ARTICULADA
    // ==========================================
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0.62, -0.42);

    const tailGeo = new THREE.CylinderGeometry(0.035, 0.06, 0.38, 6);
    const tailMesh = new THREE.Mesh(tailGeo, furCaramelMat);
    tailMesh.position.set(0, 0.15, -0.14);
    tailMesh.rotation.x = -0.7;
    this.tailGroup.add(tailMesh);
    this.group.add(this.tailGroup);

    // Sombra de contato suave no chão
    const shadowGeo = new THREE.PlaneGeometry(0.8, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);

    // Posiciona inicialmente ao lado do jogador
    this.reset(initialPlayerPos);
    this.scene.add(this.group);
  }

  private createLeg(
    mat: THREE.Material,
    pawMat: THREE.Material,
    x: number,
    z: number
  ): THREE.Group {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 0.44, z);

    // Coxa / Perna superior
    const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.42, 8);
    const legMesh = new THREE.Mesh(legGeo, mat);
    legMesh.position.y = -0.18;
    legMesh.castShadow = true;
    legGroup.add(legMesh);

    // Pata
    const pawGeo = new THREE.BoxGeometry(0.12, 0.08, 0.15);
    const pawMesh = new THREE.Mesh(pawGeo, pawMat);
    pawMesh.position.set(0, -0.4, 0.03);
    legGroup.add(pawMesh);

    return legGroup;
  }

  // Reposiciona o cão ao lado do jogador (ex: reinício de fase)
  public reset(playerPos: THREE.Vector3): void {
    this.group.position.set(playerPos.x - 1.2, 0, playerPos.z + 0.8);
    this.targetZombie = null;
    this.state = 'follow';
    this.biteCooldown = 0;
  }

  /**
   * Atualização contínua da IA, movimentação e combate do cão
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    playerFacingAngle: number,
    aliveZombies: ZombieInstance[],
    onAttack: (zombie: ZombieInstance, damage: number) => void,
    onBark?: () => void,
    onBite?: () => void
  ): void {
    if (this.biteCooldown > 0) {
      this.biteCooldown -= delta;
    }
    if (this.barkTimer > 0) {
      this.barkTimer -= delta;
    }

    const distToPlayer = this.group.position.distanceTo(playerPos);

    // 1. SELEÇÃO DE ALVO (Fareja o zumbi vivo mais próximo)
    let closestZombie: ZombieInstance | null = null;
    let closestDist = Infinity;

    for (let i = 0; i < aliveZombies.length; i++) {
      const z = aliveZombies[i];
      if (z.state === 'dead' || z.isCountedKill) continue;

      const dZombieToDog = this.group.position.distanceTo(z.group.position);
      const dZombieToPlayer = playerPos.distanceTo(z.group.position);

      // Prioriza zumbis dentro do raio de detecção (ou ameaçando o dono)
      if (dZombieToDog < this.detectionRange && dZombieToPlayer < this.detectionRange + 3) {
        if (dZombieToDog < closestDist) {
          closestDist = dZombieToDog;
          closestZombie = z;
        }
      }
    }

    // Se o cão se afastar demais do jogador (> 16m), ele quebra o combate para voltar e proteger o dono
    const tetherExceeded = distToPlayer > 15.0;

    if (closestZombie && !tetherExceeded) {
      this.targetZombie = closestZombie;
      if (closestDist <= this.attackRange) {
        this.state = 'attack';
      } else {
        this.state = 'chase';
      }
    } else {
      this.targetZombie = null;
      this.state = 'follow';
    }

    // 2. COMPORTAMENTO POR ESTADO
    let targetX = playerPos.x;
    let targetZ = playerPos.z;
    let moveSpeed = this.speed;

    if (this.state === 'follow') {
      // Posiciona-se estrategicamente ao flanco esquerdo/traseiro do sobrevivente
      const sideAngle = playerFacingAngle - Math.PI / 2.3;
      targetX = playerPos.x + Math.sin(sideAngle) * 1.35;
      targetZ = playerPos.z + Math.cos(sideAngle) * 1.35;

      const offsetDist = Math.hypot(targetX - this.group.position.x, targetZ - this.group.position.z);
      if (offsetDist < 0.4) {
        moveSpeed = 0; // Já está acompanhando confortavelmente ao lado
      } else if (distToPlayer > 5.0) {
        moveSpeed = this.speed * 1.35; // Acelera sprint para alcançar o dono
      }
    } else if (this.state === 'chase' && this.targetZombie) {
      targetX = this.targetZombie.group.position.x;
      targetZ = this.targetZombie.group.position.z;
      moveSpeed = this.speed;

      // Late ocasionalmente ao iniciar a perseguição
      if (this.barkTimer <= 0) {
        onBark?.();
        this.barkTimer = 3.5 + Math.random() * 2.0;
      }
    } else if (this.state === 'attack' && this.targetZombie) {
      targetX = this.targetZombie.group.position.x;
      targetZ = this.targetZombie.group.position.z;
      moveSpeed = 0; // Para durante a mordida

      // Realiza ataque de mordida com bote
      if (this.biteCooldown <= 0) {
        this.biteCooldown = 0.65;
        this.pounceTime = 0.35;
        onBite?.();
        onAttack(this.targetZombie, this.damage);
      }
    }

    // 3. MOVIMENTAÇÃO E ROTAÇÃO
    const dx = targetX - this.group.position.x;
    const dz = targetZ - this.group.position.z;
    const distToTarget = Math.hypot(dx, dz);

    const isMoving = moveSpeed > 0 && distToTarget > 0.15;

    if (distToTarget > 0.05) {
      // Gira suavemente na direção do alvo
      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = targetAngle - this.group.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.group.rotation.y += angleDiff * Math.min(1.0, delta * 14.0);
    }

    if (isMoving) {
      const step = Math.min(distToTarget, moveSpeed * delta);
      this.group.position.x += (dx / distToTarget) * step;
      this.group.position.z += (dz / distToTarget) * step;

      // Animação de trote / corrida canina
      this.walkTime += delta * 16.0;
      const legSwing = Math.sin(this.walkTime);

      this.flLeg.rotation.x = legSwing * 0.55;
      this.brLeg.rotation.x = legSwing * 0.55;
      this.frLeg.rotation.x = -legSwing * 0.55;
      this.blLeg.rotation.x = -legSwing * 0.55;

      // Balanço natural do corpo
      this.bodyMesh.position.y = 0.52 + Math.abs(legSwing) * 0.04;
      this.headGroup.position.y = 0.76 + Math.abs(legSwing) * 0.05;
    } else {
      // Em repouso: postura atenta
      this.flLeg.rotation.x = 0;
      this.frLeg.rotation.x = 0;
      this.blLeg.rotation.x = 0;
      this.brLeg.rotation.x = 0;
      this.bodyMesh.position.y = 0.52;
    }

    // 4. ANIMAÇÃO DE BOTE / MORDIDA
    if (this.pounceTime > 0) {
      this.pounceTime -= delta;
      const pounceProgress = Math.sin((this.pounceTime / 0.35) * Math.PI);
      this.headGroup.position.z = 0.48 + pounceProgress * 0.22;
      this.headGroup.position.y = 0.76 - pounceProgress * 0.1;
      this.headGroup.rotation.x = pounceProgress * 0.35;
    } else {
      this.headGroup.position.z = 0.48;
      this.headGroup.rotation.x = 0;
    }

    // 5. CAUDA ABANANDO (Alegre e ativa ao lado do dono)
    const tailWagSpeed = this.state === 'follow' ? 14 : 22;
    this.tailGroup.rotation.y = Math.sin(performance.now() * 0.001 * tailWagSpeed) * 0.45;
  }
}

