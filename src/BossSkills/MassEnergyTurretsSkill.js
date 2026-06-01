export default class MassEnergyTurretsSkill {
  constructor(scene) {
    this.scene = scene;
  }

  cast() {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active) return;

    scene.bossSpeakRandom("massEnergyTurrets", 2600);
    scene.audioCues?.play?.("turretSpawn", { volume: 0.42, cooldownMs: 500 });

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.bossInvincible = true;
    scene.savedBossPosition = {
      x: scene.boss.x,
      y: scene.boss.y
    };

    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;

    const centerX = scene.map.widthInPixels / 2;
    const centerY = 210;

    scene.boss.play("blue_fly_up_anim", true);

    scene.tweens.add({
      targets: scene.boss,
      x: centerX,
      y: centerY,
      duration: 1200,
      ease: "Sine.easeInOut",
      onComplete: () => {
        scene.boss.setVelocity(0, 0);
        scene.boss.play("blue_idle_anim", true);

        this.startBossInvincibleFlicker();

        scene.time.delayedCall(700, () => {
          if (!scene.gameOver && !scene.isPhaseTransitioning) {
            this.spawnTurrets();
          }
        });
      }
    });
  }

  getTurretCountByPhase() {
    const scene = this.scene;

    if (scene.bossPhase >= 4) return 3;
    if (scene.bossPhase >= 3) return 3;
    if (scene.bossPhase >= 2) return 2;
    return 3;
  }

  spawnTurrets() {
    const scene = this.scene;

    this.cleanupTurrets();

    const turretCount = this.getTurretCountByPhase();

    const duration = scene.bossPhase >= 4
      ? 8600
      : scene.bossPhase >= 3
        ? 8200
        : scene.bossPhase >= 2
          ? 7600
          : 7000;

    const positions = [];

    positions.push(this.getRandomWalkableTurretPositionNearEnd());
    positions.push(this.getRandomWalkableTurretPositionNearEnd());

    while (positions.length < turretCount) {
      positions.push(this.getRandomWalkableTurretPosition());
    }

    positions.forEach((pos, i) => {
      scene.audioCues?.play?.("turretSpawn", { volume: 0.28, cooldownMs: 130 });
      const turret = scene.add.sprite(pos.x, pos.y - 42, "turret_attack");

      turret.setScale(1.45);
      turret.setDepth(30);
      turret.play("turret_attack_anim", true);

      turret.canPierceTiles = false;
      turret.isOvercharged = false;
      turret.fireDelay = scene.bossPhase >= 3
        ? 1120
        : scene.bossPhase >= 2
          ? 1280
          : 1360;

      turret.setTint(0x99ccff);

      this.createTurretPointer(turret);

      turret.fireEvent = scene.time.addEvent({
        delay: turret.fireDelay,
        loop: true,
        callback: () => {
          this.fireBullet(turret);
        }
      });

      scene.activeTurrets.push(turret);

      scene.tweens.add({
        targets: turret,
        scaleX: 1.9,
        scaleY: 1.9,
        duration: 360,
        yoyo: true,
        ease: "Back.easeOut",
        delay: i * 170
      });
    });

    this.scheduleTurretSequentialUpgrades();

    scene.time.delayedCall(duration, () => {
      if (scene.gameOver || scene.isPhaseTransitioning) return;

      this.cleanupTurrets(true);
      this.returnBoss();
    });
  }

  scheduleTurretSequentialUpgrades() {
    const scene = this.scene;

    const startDelay = 2600;
    const stepDelay = scene.bossPhase >= 3 ? 1600 : 1700;

    scene.activeTurrets.forEach((turret, index) => {
      scene.time.delayedCall(startDelay + index * stepDelay, () => {
        if (!turret || !turret.active || scene.gameOver || scene.isPhaseTransitioning) return;
        this.upgradeTurret(turret, index);
      });
    });
  }

  upgradeTurret(turret, index) {
    const scene = this.scene;

    if (!turret || !turret.active || scene.gameOver) return;

    turret.canPierceTiles = true;
    turret.isOvercharged = true;
    turret.setTint(0xff66ff);

    if (turret.pointer) {
      turret.pointer.fillColor = 0xff66ff;
    }

    if (turret.fireEvent) {
      turret.fireEvent.remove(false);
    }

    turret.fireDelay = scene.bossPhase >= 3
      ? 1420
      : scene.bossPhase >= 2
        ? 1560
        : 1660;

    turret.fireEvent = scene.time.addEvent({
      delay: turret.fireDelay,
      loop: true,
      callback: () => {
        this.fireBullet(turret);
      }
    });


    const ring = scene.add.circle(turret.x, turret.y, 32).setDepth(119);
    ring.setStrokeStyle(8, 0xff66ff, 0.95);

    scene.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (ring && ring.active) ring.destroy();
      }
    });

    scene.cameras.main.shake(180, 0.006);
  }

  getRandomWalkableTurretPosition() {
    const scene = this.scene;

    const tileW = scene.map.tileWidth;
    const tileH = scene.map.tileHeight;
    const minDistanceFromPlayer = 260;

    for (let i = 0; i < 90; i++) {
      const tileX = Phaser.Math.Between(7, scene.map.width - 8);
      const tileY = Phaser.Math.Between(7, scene.map.height - 12);

      const here = scene.groundLayer.getTileAt(tileX, tileY);
      const below = scene.groundLayer.getTileAt(tileX, tileY + 1);
      const above = scene.groundLayer.getTileAt(tileX, tileY - 1);

      const emptyHere = !here || here.index === -1;
      const emptyAbove = !above || above.index === -1;
      const solidBelow = below && below.index !== -1;

      const x = tileX * tileW + tileW / 2;
      const y = tileY * tileH + tileH / 2;

      const farEnough =
        Phaser.Math.Distance.Between(x, y, scene.player.x, scene.player.y) >
        minDistanceFromPlayer;

      if (emptyHere && emptyAbove && solidBelow && farEnough) {
        return { x, y };
      }
    }

    return {
      x: Phaser.Math.Clamp(
        scene.player.x + Phaser.Math.Between(-520, 520),
        160,
        scene.map.widthInPixels - 160
      ),
      y: Phaser.Math.Clamp(
        scene.player.y - 260,
        140,
        scene.map.heightInPixels - 140
      )
    };
  }

  getRandomWalkableTurretPositionNearEnd() {
    const scene = this.scene;

    const preferredLeft = Math.floor(scene.map.width * 0.78);
    const preferredRight = scene.map.width - 8;
    const tileW = scene.map.tileWidth;
    const tileH = scene.map.tileHeight;

    for (let i = 0; i < 180; i++) {
      const tileX = Phaser.Math.Between(preferredLeft, preferredRight);
      const tileY = Phaser.Math.Between(7, scene.map.height - 12);

      const here = scene.groundLayer.getTileAt(tileX, tileY);
      const below = scene.groundLayer.getTileAt(tileX, tileY + 1);
      const above = scene.groundLayer.getTileAt(tileX, tileY - 1);

      const emptyHere = !here || here.index === -1;
      const emptyAbove = !above || above.index === -1;
      const solidBelow = below && below.index !== -1;

      if (emptyHere && emptyAbove && solidBelow) {
        return {
          x: tileX * tileW + tileW / 2,
          y: tileY * tileH + tileH / 2
        };
      }
    }

    return this.getRandomWalkableTurretPosition();
  }

  fireBullet(turret) {
    const scene = this.scene;

    if (!turret || !turret.active || scene.gameOver) return;

    const angle = Phaser.Math.Angle.Between(
      turret.x,
      turret.y,
      scene.player.x,
      scene.player.y
    );

    turret.rotation = angle;

    const speed = turret.canPierceTiles ? 620 : 560;

    scene.audioCues?.play?.("turretShot", { volume: turret.canPierceTiles ? 0.24 : 0.20, cooldownMs: 220 });

    const bullet = scene.physics.add.sprite(
      turret.x,
      turret.y,
      "turret_bullet"
    );
    scene.trackHostileObject?.(bullet);

    bullet.setScale(turret.canPierceTiles ? 3.7 : 3.1);
    bullet.setDepth(25);
    bullet.body.allowGravity = false;
    bullet.rotation = angle;
    bullet.canPierceTiles = turret.canPierceTiles;
    bullet.setTint(turret.canPierceTiles ? 0xff66ff : 0x99ccff);

    bullet.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );

    if (scene.registerProjectileVsTrees) {
      scene.registerProjectileVsTrees(
        bullet,
        1,
        true
      );
    }

    scene.physics.add.overlap(bullet, scene.player, () => {
      if (!bullet || !bullet.active || scene.gameOver) return;

      bullet.destroy();
      scene.damagePlayer(1);
    });

    if (!bullet.canPierceTiles) {
      scene.physics.add.collider(bullet, scene.solidBodies, () => {
        if (bullet && bullet.active) {
          bullet.destroy();
        }
      });
    }

    scene.time.delayedCall(5000, () => {
      if (bullet && bullet.active) {
        bullet.destroy();
      }
    });
  }

  createTurretPointer(turret) {
    const scene = this.scene;

    const pointer = scene.add.triangle(
      0,
      0,
      0,
      -14,
      12,
      10,
      -12,
      10,
      turret.canPierceTiles ? 0xff66ff : 0x99ccff
    );

    pointer.setDepth(300);
    pointer.setScrollFactor(0);

    turret.pointer = pointer;
  }

  updateTurretPointers() {
    const scene = this.scene;

    if (!scene.activeTurrets) return;

    const now = scene.time.now;
    if (this.nextPointerUpdateAt && now < this.nextPointerUpdateAt) return;
    this.nextPointerUpdateAt = now + 50;

    const cam = scene.cameras.main;

    scene.activeTurrets.forEach((turret) => {
      if (!turret || !turret.active || !turret.pointer) return;

      const screenX = turret.x - cam.scrollX;
      const screenY = turret.y - cam.scrollY;

      const clampedX = Phaser.Math.Clamp(screenX, 40, scene.scale.width - 40);
      const clampedY = Phaser.Math.Clamp(screenY, 40, scene.scale.height - 40);

      turret.pointer.x = clampedX;
      turret.pointer.y = clampedY;

      const angle = Phaser.Math.Angle.Between(
        scene.scale.width / 2,
        scene.scale.height / 2,
        screenX,
        screenY
      );

      turret.pointer.rotation = angle + Math.PI / 2;
      turret.pointer.setAlpha(
        screenX === clampedX && screenY === clampedY ? 0.38 : 1
      );
    });
  }

  cleanupTurrets(withExplosion = false) {
    const scene = this.scene;

    if (!scene.activeTurrets) return;

    scene.activeTurrets.forEach((turret) => {
      if (!turret) return;

      if (turret.fireEvent) {
        turret.fireEvent.remove(false);
      }

      if (turret.pointer) {
        turret.pointer.destroy();
      }

      scene.tweens.killTweensOf(turret);

      if (withExplosion && turret.active) {
        scene.audioCues?.play?.("turretDestroy", { volume: 0.34, cooldownMs: 140 });
        if (scene.effects) {
          scene.effects.explosion(turret.x, turret.y, {
            scale: 2.1,
            tint: 0xff66ff,
            yOffset: 0,
            depth: 40
          });
        } else {
          const explosion = scene.add.sprite(turret.x, turret.y, "Explosion_0");
          explosion.setScale(2.1);
          explosion.setTint(0xff66ff);
          explosion.setDepth(40);
          explosion.play("explosion_anim");
          explosion.once("animationcomplete", () => explosion.destroy());
        }
      }

      if (turret.active) {
        turret.destroy();
      }
    });

    scene.activeTurrets = [];
    this.stopBossInvincibleFlicker();
    scene.bossInvincible = false;
    scene.setBossCasting?.(false);
  }

  startBossInvincibleFlicker() {
    const scene = this.scene;

    scene.tweens.add({
      targets: scene.boss,
      alpha: 0.22,
      duration: 140,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  stopBossInvincibleFlicker() {
    const scene = this.scene;

    scene.tweens.killTweensOf(scene.boss);
    scene.boss.setAlpha(1);
  }

  returnBoss() {
    const scene = this.scene;

    this.stopBossInvincibleFlicker();

    if (!scene.boss || !scene.boss.active) return;

    scene.boss.play("blue_land_anim", true);

    scene.tweens.add({
      targets: scene.boss,
      x: scene.savedBossPosition.x,
      y: scene.savedBossPosition.y,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        scene.bossInvincible = false;
        scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);
        scene.boss.body.allowGravity = false;
        scene.boss.play("blue_idle_anim", true);
      }
    });
  }
}
