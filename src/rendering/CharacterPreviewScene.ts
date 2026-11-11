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
  private autoRotateSpeed: number = 0.005;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 50);
    this.camera.position.set(0, 1.4, 3.8);
    this.camera.lookAt(0, 1.05, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Iluminação do estúdio de inspeção
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(amb);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 2.2);
    keyLight.position.set(4, 5, 4);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x39ff14, 2.0);
    rimLight.position.set(-4, 3, -3);
    this.scene.add(rimLight);

    // Plataforma circular de inspeção sob os pés
    const standGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.12, 32);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.4,
      metalness: 0.8,
    });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = -0.06;
    this.scene.add(stand);

    // Anel luminoso na base do stand
    const ringGeo = new THREE.RingGeometry(1.15, 1.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x39ff14, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // Cria o personagem preview reutilizando o mesmo modelo Player
    this.player = new Player(this.scene);

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

    // Touch para celular / tablets
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isDragging = true;
        this.previousMouseX = e.touches[0].clientX;
      }
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      this.player.group.rotation.y += deltaX * 0.012;
      this.previousMouseX = e.touches[0].clientX;
    });
  }

  public setSkin(skinId: SkinId): void {
    this.player.setSkin(skinId);
  }

  public start(): void {
    if (this.animFrameId !== null) return;

    // Redimensionamento responsivo do canvas interno
    const width = this.canvas.clientWidth || 380;
    const height = this.canvas.clientHeight || 460;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    const render = () => {
      this.animFrameId = requestAnimationFrame(render);
      if (!this.isDragging) {
        this.player.group.rotation.y += this.autoRotateSpeed;
      }
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
