import * as THREE from 'three';
import { Player } from '../entities/Player';
import type { SkinId } from '../systems/EconomyCatalog';

export class CharacterPreviewScene {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private animFrameId: number | null = null;
  private autoRotateSpeed: number = 0.006;
  private idleTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 360;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.set(0, 1.35, 3.8);
    this.camera.lookAt(0, 1.0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Iluminação cinematográfica do estúdio de inspeção tática
    const amb = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    keyLight.position.set(3.5, 4.5, 4);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x39ff14, 2.0);
    rimLight.position.set(-3.5, 3.5, -3);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.1);
    fillLight.position.set(-2, 3, 3);
    this.scene.add(fillLight);

    // Plataforma circular de inspeção militar sob os pés
    const standGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.12, 32);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.8,
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = -0.06;
    this.scene.add(stand);

    // Anel luminoso neon verde na base do pedestal
    const ringGeo = new THREE.RingGeometry(1.15, 1.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // Modelo 3D autêntico do Sobrevivente
    this.player = new Player(this.scene);
    this.player.setHpBarVisible(false);

    this.setupInteractions();
  }

  private setupInteractions(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouseX = e.clientX;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMouseX;
      this.player.group.rotation.y += deltaX * 0.012;
      this.previousMouseX = e.clientX;
    });

    // Rotação touch suave para celular e tablets
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.player.group.rotation.y += deltaX * 0.012;
      this.previousMouseX = e.touches[0].clientX;
    }, { passive: false });
  }

  public setSkin(skinId: SkinId): void {
    this.player.setSkin(skinId);
  }

  public resize(): void {
    const width = this.canvas.clientWidth || 300;
    const height = this.canvas.clientHeight || 360;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  public start(): void {
    this.resize();
    if (this.animFrameId !== null) return;

    let frameCount = 0;

    const render = () => {
      this.animFrameId = requestAnimationFrame(render);

      // Reajusta dimensões nos primeiros frames ao abrir o modal
      if (frameCount < 5) {
        frameCount++;
        this.resize();
      }

      if (!this.isDragging) {
        this.player.group.rotation.y += this.autoRotateSpeed;
      }

      // Sutil respiração idle para dar vida ao personagem
      this.idleTime += 0.03;
      this.player.group.position.y = Math.sin(this.idleTime) * 0.018;

      this.renderer.render(this.scene, this.camera);
    };

    render();
  }

  public stop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
}
