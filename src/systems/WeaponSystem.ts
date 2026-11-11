import * as THREE from 'three';
import type { WeaponId, WeaponDefinition } from './EconomyCatalog';
import { WEAPONS_CATALOG } from './EconomyCatalog';

export interface Bullet {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  distanceTraveled: number;
  damage: number;
  speed: number;
  range: number;
}

export class WeaponSystem {
  public currentWeaponId: WeaponId = 'pistol';
  public currentWeapon: WeaponDefinition;

  public ammo: number;
  public maxAmmo: number;
  public isReloading: boolean = false;
  private lastShotTime: number = 0;
  private reloadTimer: number = 0;

  public bullets: Bullet[] = [];
  private scene: THREE.Scene;
  private bulletGeo: THREE.CylinderGeometry;
  private muzzleFlash: THREE.PointLight;
  private flashDuration: number = 0;

  // Modificadores de melhorias permanentes
  private damageMult: number = 1.0;
  private reloadMult: number = 1.0;
  private ammoMult: number = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentWeapon = WEAPONS_CATALOG['pistol'];
    this.maxAmmo = this.currentWeapon.magSize;
    this.ammo = this.maxAmmo;

    // Projétil traçante
    this.bulletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.65, 6);
    this.bulletGeo.rotateX(Math.PI / 2);

    this.muzzleFlash = new THREE.PointLight(0xffedd5, 3.5, 5.0);
    this.muzzleFlash.visible = false;
    this.scene.add(this.muzzleFlash);
  }

  public applyModifiers(damageMult: number, reloadMult: number, ammoMult: number): void {
    this.damageMult = damageMult;
    this.reloadMult = reloadMult;
    this.ammoMult = ammoMult;
    this.updateMaxAmmo();
  }

  private updateMaxAmmo(): void {
    this.maxAmmo = Math.round(this.currentWeapon.magSize * this.ammoMult);
    this.ammo = Math.min(this.ammo, this.maxAmmo);
  }

  public setWeapon(id: WeaponId): void {
    if (this.currentWeaponId === id && this.currentWeapon) return;

    this.currentWeaponId = id;
    this.currentWeapon = WEAPONS_CATALOG[id] || WEAPONS_CATALOG['pistol'];
    this.isReloading = false;
    this.updateMaxAmmo();
    this.ammo = this.maxAmmo; // Recarrega automaticamente ao trocar de arma
  }

  public update(delta: number, obstacles: THREE.Box3[]): void {
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.ammo = this.maxAmmo;
        this.isReloading = false;
      }
    }

    if (this.flashDuration > 0) {
      this.flashDuration -= delta;
      if (this.flashDuration <= 0) {
        this.muzzleFlash.visible = false;
      }
    }

    // Atualiza projéteis
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const step = b.speed * delta;
      b.mesh.position.addScaledVector(b.direction, step);
      b.distanceTraveled += step;

      let hitObstacle = false;
      const bulletPos = b.mesh.position;
      for (let o = 0; o < obstacles.length; o++) {
        if (obstacles[o].containsPoint(bulletPos)) {
          hitObstacle = true;
          break;
        }
      }

      if (hitObstacle || b.distanceTraveled >= b.range) {
        this.scene.remove(b.mesh);
        this.bullets.splice(i, 1);
      }
    }
  }

  public tryShoot(
    origin: THREE.Vector3,
    targetPoint: THREE.Vector3,
    currentTime: number
  ): 'shot' | 'empty' | 'reloading' | 'cooldown' {
    if (this.isReloading) return 'reloading';

    if (this.ammo <= 0) {
      this.startReload();
      return 'empty';
    }

    if (currentTime - this.lastShotTime < this.currentWeapon.fireRate) {
      return 'cooldown';
    }

    this.lastShotTime = currentTime;
    this.ammo--;

    const spawnPos = origin.clone().add(new THREE.Vector3(0, 1.25, 0));
    const baseDir = new THREE.Vector3().subVectors(targetPoint, spawnPos);
    if (targetPoint.y < 0.2) {
      baseDir.y = 0;
    }
    baseDir.normalize();

    // Dispara 1 ou mais projéteis (pellets) para armas como Espingarda
    const pellets = this.currentWeapon.pellets;
    const spread = this.currentWeapon.spread;

    for (let p = 0; p < pellets; p++) {
      const dir = baseDir.clone();
      if (spread > 0) {
        // Dispersão angular aleatória no plano horizontal
        const angleOffset = (Math.random() - 0.5) * spread;
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);
      }

      const bColor = this.currentWeapon.bulletColor ?? 0xfef08a;
      const bScale = this.currentWeapon.bulletScale ?? 1.0;
      const bMat = new THREE.MeshBasicMaterial({ color: bColor });

      const mesh = new THREE.Mesh(this.bulletGeo, bMat);
      mesh.scale.set(bScale, bScale, bScale);
      mesh.position.copy(spawnPos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      this.scene.add(mesh);

      this.bullets.push({
        mesh,
        direction: dir,
        distanceTraveled: 0,
        damage: Math.round(this.currentWeapon.damage * this.damageMult),
        speed: this.currentWeapon.bulletSpeed,
        range: this.currentWeapon.range,
      });
    }

    // Clarão do disparo
    this.muzzleFlash.position.copy(spawnPos).addScaledVector(baseDir, 0.4);
    this.muzzleFlash.visible = true;
    this.flashDuration = 0.05;

    return 'shot';
  }

  public startReload(): boolean {
    if (this.isReloading || this.ammo >= this.maxAmmo) return false;
    this.isReloading = true;
    this.reloadTimer = this.currentWeapon.reloadTime * this.reloadMult;
    return true;
  }

  public removeBullet(index: number): void {
    if (index >= 0 && index < this.bullets.length) {
      this.scene.remove(this.bullets[index].mesh);
      this.bullets.splice(index, 1);
    }
  }

  public reset(): void {
    this.bullets.forEach((b) => this.scene.remove(b.mesh));
    this.bullets = [];
    this.updateMaxAmmo();
    this.ammo = this.maxAmmo;
    this.isReloading = false;
    this.muzzleFlash.visible = false;
  }
}
