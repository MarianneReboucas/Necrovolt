import * as THREE from 'three';
import type { WeaponId } from '../systems/EconomyCatalog';

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  public mousePos: { x: number; y: number } = { x: 0, y: 0 };
  public rawScreen: { x: number; y: number } = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  public isMouseDown: boolean = false;
  public reloadRequested: boolean = false;
  public pauseRequested: boolean = false;

  // Seleção de arma rápida (Teclas 1, 2, 3, 4)
  public weaponSlotRequested: WeaponId | null = null;
  public cycleWeaponRequested: 1 | -1 | 0 = 0;

  // Perspectiva de Câmera (F2: 1ª Pessoa nos Olhos / F3: 3ª Pessoa Isométrica)
  public isFirstPerson: boolean = false;
  public fpYaw: number = 0;
  public fpPitch: number = 0;
  public cameraModeRequested: 'first_person' | 'third_person' | null = null;

  // Suporte para joysticks/toque mobile e botão de correr
  public touchMoveVector: { x: number; z: number } = { x: 0, z: 0 };
  public touchAimVector: { x: number; z: number } = { x: 0, z: 0 };
  public isTouchFiring: boolean = false;
  public isTouchRunning: boolean = false;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private mouseWorldTarget: THREE.Vector3 = new THREE.Vector3();

  private isRunKey(code: string, key: string): boolean {
    const k = key ? key.toLowerCase() : '';
    return (
      code === 'ControlLeft' ||
      code === 'ControlRight' ||
      k === 'control' ||
      code === 'Space' ||
      key === ' ' ||
      code === 'Numpad0' ||
      code === 'Insert' ||
      code === 'Digit0' ||
      key === '0' ||
      k === 'insert'
    );
  }

  constructor() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;

      // Corrida acionada por CTRL, ESPAÇO ou 0(Ins)
      if (this.isRunKey(e.code, e.key)) {
        this.keys['run'] = true;
      }

      if (k === 'r') this.reloadRequested = true;
      if (e.key === 'Escape' || k === 'p') this.pauseRequested = true;

      // Atalhos F2 (1ª Pessoa) e F3 (3ª Pessoa)
      if (e.key === 'F2') {
        e.preventDefault();
        this.cameraModeRequested = 'first_person';
      }
      if (e.key === 'F3') {
        e.preventDefault();
        this.cameraModeRequested = 'third_person';
      }

      // Troca por teclado numérico (1 a 8)
      if (k === '1') this.weaponSlotRequested = 'pistol';
      if (k === '2') this.weaponSlotRequested = 'revolver';
      if (k === '3') this.weaponSlotRequested = 'shotgun';
      if (k === '4') this.weaponSlotRequested = 'smg';
      if (k === '5') this.weaponSlotRequested = 'rifle';
      if (k === '6') this.weaponSlotRequested = 'plasma_rifle';
      if (k === '7') this.weaponSlotRequested = 'sniper';
      if (k === '8') this.weaponSlotRequested = 'grenade_launcher';

      // Tecla Q ou E para ciclar arma
      if (k === 'q') this.cycleWeaponRequested = -1;
      if (k === 'e') this.cycleWeaponRequested = 1;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      if (this.isRunKey(e.code, e.key)) {
        this.keys['run'] = false;
      }
    });

    // Roda do mouse cicla armas
    window.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) this.cycleWeaponRequested = 1;
      else if (e.deltaY < 0) this.cycleWeaponRequested = -1;
    });

    let lastClientX = window.innerWidth / 2;
    let lastClientY = window.innerHeight / 2;

    window.addEventListener('mousemove', (e) => {
      this.rawScreen.x = e.clientX;
      this.rawScreen.y = e.clientY;
      this.mousePos.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePos.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isFirstPerson) {
        let dx = e.movementX;
        let dy = e.movementY;
        if (dx === undefined || (dx === 0 && dy === 0 && !document.pointerLockElement)) {
          dx = e.clientX - lastClientX;
          dy = e.clientY - lastClientY;
        }
        lastClientX = e.clientX;
        lastClientY = e.clientY;

        const sens = 0.0028;
        this.fpYaw -= dx * sens;
        this.fpPitch = Math.max(-1.15, Math.min(1.15, this.fpPitch - dy * sens));
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isMouseDown = false;
      this.isTouchFiring = false;
      this.isTouchRunning = false;
    });

    this.setupMobileButtons();
  }

  private setupMobileButtons(): void {
    // 1. Botão de Correr no Celular (#btn-action-run)
    const btnRun = document.getElementById('btn-action-run');
    if (btnRun) {
      const startRun = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isTouchRunning = true;
        btnRun.classList.add('active');
      };
      const stopRun = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isTouchRunning = false;
        btnRun.classList.remove('active');
      };

      btnRun.addEventListener('touchstart', startRun, { passive: false });
      btnRun.addEventListener('touchend', stopRun);
      btnRun.addEventListener('touchcancel', stopRun);
      btnRun.addEventListener('mousedown', startRun);
      btnRun.addEventListener('mouseup', stopRun);
      btnRun.addEventListener('mouseleave', stopRun);
    }

    // 2. Botão de Atirar no Celular (#btn-action-dash)
    const btnShoot = document.getElementById('btn-action-dash');
    if (btnShoot) {
      const startShoot = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isTouchFiring = true;
      };
      const stopShoot = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isTouchFiring = false;
      };

      btnShoot.addEventListener('touchstart', startShoot, { passive: false });
      btnShoot.addEventListener('touchend', stopShoot);
      btnShoot.addEventListener('touchcancel', stopShoot);
      btnShoot.addEventListener('mousedown', startShoot);
      btnShoot.addEventListener('mouseup', stopShoot);
      btnShoot.addEventListener('mouseleave', stopShoot);
    }

    // 3. Botão de Recarregar no Celular (#btn-action-ability)
    const btnReload = document.getElementById('btn-action-ability');
    if (btnReload) {
      const triggerReload = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.reloadRequested = true;
      };
      btnReload.addEventListener('touchstart', triggerReload, { passive: false });
      btnReload.addEventListener('click', triggerReload);
    }

    // 4. Botão de Trocar Arma no Celular (#btn-action-backpack)
    const btnCycleWeapon = document.getElementById('btn-action-backpack');
    if (btnCycleWeapon) {
      const triggerCycle = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.cycleWeaponRequested = 1;
      };
      btnCycleWeapon.addEventListener('touchstart', triggerCycle, { passive: false });
      btnCycleWeapon.addEventListener('click', triggerCycle);
    }

    // 5. D-Pad Virtual de Movimentação no Celular
    const dpadRing = document.querySelector('.dpad-outer-ring') as HTMLElement | null;
    const dpadKnob = document.querySelector('.dpad-center-knob') as HTMLElement | null;
    if (dpadRing) {
      const updateDpad = (clientX: number, clientY: number) => {
        const rect = dpadRing.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxRadius = rect.width / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          const clampedDist = Math.min(dist, maxRadius);
          const nx = dx / dist;
          const ny = dy / dist;

          this.touchMoveVector.x = nx;
          this.touchMoveVector.z = ny;

          if (dpadKnob) {
            dpadKnob.style.transform = `translate(${nx * clampedDist * 0.5}px, ${ny * clampedDist * 0.5}px)`;
          }

          // Atualiza a direção de mira quando anda no celular
          this.rawScreen.x = window.innerWidth / 2 + nx * 150;
          this.rawScreen.y = window.innerHeight / 2 + ny * 150;
        }
      };

      const resetDpad = () => {
        this.touchMoveVector.x = 0;
        this.touchMoveVector.z = 0;
        if (dpadKnob) {
          dpadKnob.style.transform = 'translate(0px, 0px)';
        }
      };

      dpadRing.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          updateDpad(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });

      dpadRing.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          updateDpad(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });

      dpadRing.addEventListener('touchend', resetDpad);
      dpadRing.addEventListener('touchcancel', resetDpad);
    }

    // 6. Toque na tela para girar visão em 1ª Pessoa no Celular
    let touchLookStartX = 0;
    let touchLookStartY = 0;
    let isTouchLooking = false;

    window.addEventListener('touchstart', (e) => {
      if (!this.isFirstPerson) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const target = t.target as HTMLElement;
        if (
          !target.closest('.mobile-dpad-container') &&
          !target.closest('.action-buttons-cluster') &&
          !target.closest('.modal-overlay') &&
          !target.closest('.hud-top-right') &&
          !target.closest('.hud-top-left-portrait')
        ) {
          touchLookStartX = t.clientX;
          touchLookStartY = t.clientY;
          isTouchLooking = true;
          break;
        }
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isFirstPerson || !isTouchLooking) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const target = t.target as HTMLElement;
        if (
          !target.closest('.mobile-dpad-container') &&
          !target.closest('.action-buttons-cluster') &&
          !target.closest('.modal-overlay') &&
          !target.closest('.hud-top-right')
        ) {
          const dx = t.clientX - touchLookStartX;
          const dy = t.clientY - touchLookStartY;
          touchLookStartX = t.clientX;
          touchLookStartY = t.clientY;
          const sens = 0.0055;
          this.fpYaw -= dx * sens;
          this.fpPitch = Math.max(-1.15, Math.min(1.15, this.fpPitch - dy * sens));
          break;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isTouchLooking = false;
    });
  }

  public getMovementVector(): { x: number; z: number } {
    let dx = 0;
    let dz = 0;

    if (this.keys['w'] || this.keys['arrowup']) dz -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dz += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    if (this.touchMoveVector.x !== 0 || this.touchMoveVector.z !== 0) {
      dx = this.touchMoveVector.x;
      dz = this.touchMoveVector.z;
    }

    if (dx !== 0 && dz !== 0) {
      const invLen = 1 / Math.hypot(dx, dz);
      dx *= invLen;
      dz *= invLen;
    }

    return { x: dx, z: dz };
  }

  // Retorna true se o jogador está segurando CTRL, ESPAÇO ou 0(Ins) no PC ou o botão de Correr no Celular
  public isRunning(): boolean {
    return Boolean(
      this.keys['run'] ||
      this.keys['control'] ||
      this.keys[' '] ||
      this.isTouchRunning
    );
  }

  public getAimWorldPoint(camera: THREE.Camera): THREE.Vector3 {
    this.raycaster.setFromCamera(
      new THREE.Vector2(this.mousePos.x, this.mousePos.y),
      camera
    );
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.mouseWorldTarget);
    if (!hit) {
      this.mouseWorldTarget.set(0, 0, 0);
    }
    return this.mouseWorldTarget;
  }

  public shouldShoot(): boolean {
    return this.isMouseDown || this.isTouchFiring;
  }

  public consumeReload(): boolean {
    const val = this.reloadRequested;
    this.reloadRequested = false;
    return val;
  }

  public consumePause(): boolean {
    const val = this.pauseRequested;
    this.pauseRequested = false;
    return val;
  }

  public consumeWeaponSlot(): WeaponId | null {
    const val = this.weaponSlotRequested;
    this.weaponSlotRequested = null;
    return val;
  }

  public consumeCycleWeapon(): 1 | -1 | 0 {
    const val = this.cycleWeaponRequested;
    this.cycleWeaponRequested = 0;
    return val;
  }

  public setFirstPerson(fp: boolean): void {
    this.isFirstPerson = fp;
  }

  public consumeCameraMode(): 'first_person' | 'third_person' | null {
    const val = this.cameraModeRequested;
    this.cameraModeRequested = null;
    return val;
  }
}
