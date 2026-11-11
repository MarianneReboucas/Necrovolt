import * as THREE from 'three';

/**
 * SceneManager2D: Renderizador 2D Top-Down com Three.js OrthographicCamera.
 * Mantém alta performance a 60 FPS, iluminação dinâmica (luzes dos cristais e geradores)
 * e visão isométrica/top-down plana perfeita sem distorção de perspectiva.
 */
export class SceneManager2D {
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;
  public renderer: THREE.WebGLRenderer;
  public toxicLights: THREE.PointLight[] = [];

  private viewSize: number = 46; // Campo de visão ainda mais amplo e panorâmico da cidade

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04080c);

    const aspect = window.innerWidth / window.innerHeight;
    const halfH = this.viewSize / 2;
    const halfW = halfH * aspect;

    // Câmera Ortográfica Top-Down direta (eixo Y olhando de cima para o plano X/Z)
    this.camera = new THREE.OrthographicCamera(
      -halfW,
      halfW,
      halfH,
      -halfH,
      0.1,
      100
    );
    this.camera.position.set(0, 30, 0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    this.setupLighting();
    this.setupResizeListener();
  }

  private setupLighting(): void {
    // Luz ambiente escura noturna para contraste urbano
    const amb = new THREE.AmbientLight(0x1e293b, 1.1);
    this.scene.add(amb);

    // Luz de luar fria direcionada
    const moon = new THREE.DirectionalLight(0x38bdf8, 0.45);
    moon.position.set(10, 25, 10);
    this.scene.add(moon);
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      const halfH = this.viewSize / 2;
      const halfW = halfH * aspect;

      this.camera.left = -halfW;
      this.camera.right = halfW;
      this.camera.top = halfH;
      this.camera.bottom = -halfH;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public updateCamera(targetPos: THREE.Vector3, delta: number): void {
    const smooth = Math.min(1.0, delta * 7.0);
    this.camera.position.x += (targetPos.x - this.camera.position.x) * smooth;
    this.camera.position.z += (targetPos.z - this.camera.position.z) * smooth;
    this.camera.lookAt(this.camera.position.x, 0, this.camera.position.z);
  }

  // Converte posição 2D da tela (mouse) diretamente nas coordenadas X/Z da arena
  public screenToWorldPoint(screenX: number, screenY: number): THREE.Vector3 {
    const normX = (screenX / window.innerWidth) * 2 - 1;
    const normY = -(screenY / window.innerHeight) * 2 + 1;

    const vector = new THREE.Vector3(normX, normY, 0);
    vector.unproject(this.camera);

    return new THREE.Vector3(vector.x, 0, vector.z);
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
