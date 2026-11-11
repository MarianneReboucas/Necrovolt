import * as THREE from 'three';
import { GAME_CONFIG } from '../config';

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth <= 1024) ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
};

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public toxicLights: THREE.PointLight[] = [];

  // Modo de Câmera: 3ª Pessoa Isométrica ou 1ª Pessoa nos Olhos do Boneco (F2 / F3)
  public cameraMode: 'third_person' | 'first_person' = 'third_person';
  public fpYaw: number = 0;
  public fpPitch: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a111a); // Noite urbana clara e nítida
    // Névoa atmosférica suave apenas na distância extrema (> 55 metros)
    this.scene.fog = new THREE.Fog(0x0a111a, 55, 130);

    // Câmera isométrica em 3ª pessoa bem elevada e ampla (FOV 54)
    this.camera = new THREE.PerspectiveCamera(
      54,
      window.innerWidth / window.innerHeight,
      0.1,
      250
    );
    this.camera.position.set(
      GAME_CONFIG.camera.offset.x,
      GAME_CONFIG.camera.offset.y,
      GAME_CONFIG.camera.offset.z
    );
    this.camera.lookAt(0, GAME_CONFIG.camera.lookAtOffsetY, 0);

    // Renderer com pós-processamento tonal cinematográfico e sombras realistas
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const isMobile = isMobileDevice();
    // Limita o DPI no mobile (1.5x) para reduzir fill-rate e consumo de bateria mantendo alta nitidez
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0));
    // Tonalidade cinematográfica e fidelidade de cor sRGB
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // PARTE 2: Sombras suaves realistas (PCF Shadow Map)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.setupLighting();
    this.setupAtmosphericParticles();
    this.setupResizeListener();
  }

  // PARTE 4: Partículas atmosféricas de névoa e poeira noturna suspensas no ar
  private particles?: THREE.Points;
  private particlePositions?: Float32Array;

  private setupAtmosphericParticles(): void {
    const isMobile = isMobileDevice();
    const count = isMobile ? 75 : 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 130;
      positions[i * 3 + 1] = Math.random() * 7.5 + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x86efac,
      size: 0.25,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particlePositions = positions;
    this.scene.add(this.particles);
  }

  private setupLighting(): void {
    // PARTE 1: Iluminação hemisférica para equilíbrio natural entre céu noturno e chão
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    this.scene.add(hemiLight);

    // Luz ambiente nítida
    const ambientLight = new THREE.AmbientLight(
      GAME_CONFIG.lighting.ambientColor,
      1.15
    );
    this.scene.add(ambientLight);

    // PARTE 2: Direcional da Lua com sombras suaves em alta definição (2048x2048)
    const moonLight = new THREE.DirectionalLight(
      GAME_CONFIG.lighting.directionalColor,
      1.65
    );
    moonLight.position.set(34, 52, 28);
    moonLight.castShadow = true;
    const isMobile = isMobileDevice();
    const shadowRes = isMobile ? 1024 : 2048;
    moonLight.shadow.mapSize.width = shadowRes;
    moonLight.shadow.mapSize.height = shadowRes;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 150;
    const d = 58;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    moonLight.shadow.bias = -0.0003;
    moonLight.shadow.normalBias = 0.025;
    this.scene.add(moonLight);

    // Luz de recorte azulada (Rim light)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    fillLight.position.set(-30, 32, -25);
    this.scene.add(fillLight);

    // Ponto de luz da lanterna suave de rua (estilo o poste na foto)
    const streetLamp = new THREE.PointLight(0xffedd5, 2.2, 16, 1.5);
    streetLamp.position.set(-6, 4.5, -6);
    this.scene.add(streetLamp);

    // Cristais de energia verde flutuantes (como na foto de referência)
    const crystalPositions = [
      new THREE.Vector3(-3.5, 1.2, 4.5),
      new THREE.Vector3(1.5, 1.3, -2.5),
      new THREE.Vector3(3.8, 1.4, 7.2),
      new THREE.Vector3(-1.8, 1.2, -6.8),
      new THREE.Vector3(12.5, 1.5, -4.0),
    ];

    const crystalGeo = new THREE.OctahedronGeometry(0.38, 0);
    const crystalMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });

    crystalPositions.forEach((pos) => {
      const pLight = new THREE.PointLight(0x22c55e, 2.8, 9, 1.8);
      pLight.position.copy(pos);
      this.scene.add(pLight);
      this.toxicLights.push(pLight);

      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.copy(pos);
      crystal.scale.set(0.9, 1.5, 0.9);
      this.scene.add(crystal);

      // Poça de lodo / radiação verde no chão ao redor do cristal
      const puddleGeo = new THREE.CircleGeometry(1.4, 16);
      const puddleMat = new THREE.MeshBasicMaterial({
        color: 0x15803d,
        transparent: true,
        opacity: 0.55,
      });
      const puddle = new THREE.Mesh(puddleGeo, puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(pos.x, 0.02, pos.z);
      this.scene.add(puddle);
    });
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const isMobile = isMobileDevice();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0));
    });
  }

  public setCameraMode(mode: 'third_person' | 'first_person'): void {
    this.cameraMode = mode;
    if (mode === 'first_person') {
      this.camera.fov = 72; // FOV amplo e imersivo de FPS
      this.camera.near = 0.05;
    } else {
      this.camera.fov = 54; // Câmera tática 3ª pessoa
      this.camera.near = 0.1;
    }
    this.camera.updateProjectionMatrix();
  }

  public updateCamera(
    targetPosition: THREE.Vector3,
    delta: number,
    cameraYaw?: number,
    cameraPitch?: number
  ): void {
    if (cameraYaw !== undefined) this.fpYaw = cameraYaw;
    if (cameraPitch !== undefined) this.fpPitch = cameraPitch;

    if (this.cameraMode === 'first_person') {
      // 1ª Pessoa: Câmera fixada na altura exata dos olhos do boneco
      this.camera.position.set(
        targetPosition.x,
        targetPosition.y + 1.68,
        targetPosition.z
      );

      const dirX = Math.sin(this.fpYaw) * Math.cos(this.fpPitch);
      const dirY = Math.sin(this.fpPitch);
      const dirZ = Math.cos(this.fpYaw) * Math.cos(this.fpPitch);

      this.camera.lookAt(
        this.camera.position.x + dirX * 10,
        this.camera.position.y + dirY * 10,
        this.camera.position.z + dirZ * 10
      );
    } else {
      // 3ª Pessoa: Suave interpolação da câmera isométrica acompanhando o jogador
      const desiredX = targetPosition.x + GAME_CONFIG.camera.offset.x;
      const desiredY = GAME_CONFIG.camera.offset.y;
      const desiredZ = targetPosition.z + GAME_CONFIG.camera.offset.z;

      const smoothFactor = Math.min(1.0, delta * 6.5);
      this.camera.position.x += (desiredX - this.camera.position.x) * smoothFactor;
      this.camera.position.y += (desiredY - this.camera.position.y) * smoothFactor;
      this.camera.position.z += (desiredZ - this.camera.position.z) * smoothFactor;

      this.camera.lookAt(
        targetPosition.x,
        targetPosition.y + GAME_CONFIG.camera.lookAtOffsetY,
        targetPosition.z
      );
    }
  }

  // Ponto no mundo 3D para onde a mira em 1ª Pessoa está apontando
  public getFirstPersonAimTarget(playerPos: THREE.Vector3): THREE.Vector3 {
    const dirX = Math.sin(this.fpYaw) * Math.cos(this.fpPitch);
    const dirY = Math.sin(this.fpPitch);
    const dirZ = Math.cos(this.fpYaw) * Math.cos(this.fpPitch);
    return new THREE.Vector3(
      playerPos.x + dirX * 60,
      playerPos.y + 1.68 + dirY * 60,
      playerPos.z + dirZ * 60
    );
  }

  // Converte a posição do mouse na tela para as coordenadas X/Z exatas no chão 3D
  public screenToWorldPoint(screenX: number, screenY: number): THREE.Vector3 {
    const normX = (screenX / window.innerWidth) * 2 - 1;
    const normY = -(screenY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(ground, target);
    if (!hit) {
      target.set(0, 0, 0);
    }
    return target;
  }

  public render(): void {
    if (this.particles && this.particlePositions) {
      const posAttr = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      const time = performance.now() * 0.001;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] -= 0.01; // Desce suavemente como bruma noturna
        arr[i * 3] += Math.sin(time * 0.7 + i) * 0.006;
        if (arr[i * 3 + 1] < 0.3) {
          arr[i * 3 + 1] = 8.0;
        }
      }
      posAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }
}
