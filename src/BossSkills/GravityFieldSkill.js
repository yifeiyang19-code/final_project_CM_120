export default class GravityFieldSkill {
  constructor(scene) {
    this.scene = scene;

    this.vortexEvent = null;
  }

  cast() {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active) return;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    scene.bossSpeakRandom("gravityField", 2600);
    scene.audioCues?.play?.("gravityFieldStart", { volume: 0.48, cooldownMs: 900 });

    const view = scene.cameras.main.worldView;
    const fieldX = view.centerX;
    const fieldY = view.centerY + 40;

    const warningTime = scene.bossPhase >= 3
      ? 2200
      : scene.bossPhase >= 2
        ? 2800
        : 3300;

    const activeDuration = scene.bossPhase >= 3
      ? 7800
      : scene.bossPhase >= 2
        ? 8500
        : 7000;

    scene.gravityFieldCenter = { x: fieldX, y: fieldY };

    scene.boss.setVelocity(0, 0);
    scene.boss.play("blue_idle_anim", true);

    const warning = scene.add.circle(
      fieldX,
      fieldY,
      scene.gravityFieldRadius,
      0x7a33ff,
      0.1
    ).setDepth(10);

    const expandingDarkCircle = scene.add.circle(
      fieldX,
      fieldY,
      8,
      0x080010,
      0.46
    ).setDepth(10.5);

    const ring = scene.add.circle(
      fieldX,
      fieldY,
      scene.gravityFieldRadius
    ).setDepth(11);

    ring.setStrokeStyle(10, 0xaa77ff, 0.72);

    scene.tweens.add({
      targets: expandingDarkCircle,
      scaleX: scene.gravityFieldRadius / 8,
      scaleY: scene.gravityFieldRadius / 8,
      alpha: 0.72,
      duration: warningTime,
      ease: "Linear"
    });


    scene.tweens.add({
      targets: ring,
      scale: 1.08,
      alpha: 1,
      duration: 320,
      yoyo: true,
      repeat: Math.ceil(warningTime / 320),
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: warning,
      alpha: 0.26,
      duration: 300,
      yoyo: true,
      repeat: Math.ceil(warningTime / 300),
      ease: "Sine.easeInOut"
    });

    scene.cameras.main.shake(700, 0.006);

    scene.time.delayedCall(warningTime, () => {
      if (scene.gameOver || scene.isPhaseTransitioning) {
        this.destroyWarningObjects(warning, expandingDarkCircle, ring);
        return;
      }

      this.destroyWarningObjects(warning, expandingDarkCircle, ring);
      this.activate(fieldX, fieldY, activeDuration);
    });
  }

  destroyWarningObjects(...objects) {
    for (const obj of objects) {
      if (obj && obj.active) {
        obj.destroy();
      }
    }
  }

  activate(fieldX, fieldY, duration) {
    const scene = this.scene;

    if (scene.gameOver || scene.isPhaseTransitioning) return;

    scene.audioCues?.play?.("gravityFieldStart", { volume: 0.42, cooldownMs: 900 });
    scene.audioCues?.startLoop?.("gravityFieldLoop", { volume: 0.18 });
    scene.gravityFieldActive = true;
    scene.gravityFieldCenter = { x: fieldX, y: fieldY };
    scene.gravityFieldEndTime = scene.time.now + duration;

    scene.cameras.main.shake(900, 0.025);
    scene.cameras.main.flash(450, 120, 60, 255);

    const escapeDistance = Phaser.Math.Distance.Between(
      scene.player.x,
      scene.player.y,
      fieldX,
      fieldY
    );

    if (escapeDistance <= scene.gravityFieldRadius) {
      this.forcePlayerToCenter(fieldX, fieldY);
    }

    scene.gravityOverlay = scene.add.rectangle(
      640,
      360,
      1280,
      720,
      0x331166,
      0.13
    ).setScrollFactor(0).setDepth(8);

    scene.gravityVisual = scene.add.circle(
      fieldX,
      fieldY,
      scene.gravityFieldRadius,
      0x331166,
      0.22
    ).setDepth(9);

    scene.gravityRing = scene.add.circle(
      fieldX,
      fieldY,
      scene.gravityFieldRadius
    ).setDepth(10);

    scene.gravityRing.setStrokeStyle(12, 0xaa77ff, 0.95);

    scene.tweens.add({
      targets: scene.gravityVisual,
      scale: 1.08,
      alpha: 0.34,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    this.startVortexPull(fieldX, fieldY);

    scene.time.delayedCall(duration, () => {
      this.deactivate();
    });
  }

  forcePlayerToCenter(x, y) {
    const scene = this.scene;

    if (!scene.player || !scene.player.active) return;

    scene.player.setVelocity(0, 0);
    scene.player.body.allowGravity = false;

    scene.tweens.add({
      targets: scene.player,
      x,
      y,
      duration: 420,
      ease: "Cubic.easeIn",
      onComplete: () => {
        if (scene.player && scene.player.active) {
          scene.player.body.allowGravity = true;
        }
      }
    });

    scene.cameras.main.shake(420, 0.018);
  }

  startVortexPull(fieldX, fieldY) {
    const scene = this.scene;

    if (this.vortexEvent) {
      this.vortexEvent.remove(false);
      this.vortexEvent = null;
    }

    this.vortexEvent = scene.time.addEvent({
      delay: scene.bossPhase >= 3 ? 33 : 24,
      loop: true,
      callback: () => {
        this.applyVortexForce(fieldX, fieldY);
      }
    });
  }

  applyVortexForce(fieldX, fieldY) {
    const scene = this.scene;

    if (
      !scene.gravityFieldActive ||
      !scene.player ||
      !scene.player.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    const player = scene.player;

    const dx = fieldX - player.x;
    const dy = fieldY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > scene.gravityFieldRadius) return;
    if (distance < 6) return;

    const nx = dx / distance;
    const ny = dy / distance;

    const tangentX = -ny;
    const tangentY = nx;

    const phaseBoost = scene.bossPhase >= 3
      ? 1.45
      : scene.bossPhase >= 2
        ? 1.2
        : 1.0;

    const pullStrength = Phaser.Math.Linear(
      520,
      980,
      1 - distance / scene.gravityFieldRadius
    ) * phaseBoost;

    const swirlStrength = Phaser.Math.Linear(
      300,
      620,
      1 - distance / scene.gravityFieldRadius
    ) * phaseBoost;

    const vx = nx * pullStrength + tangentX * swirlStrength;
    const vy = ny * pullStrength + tangentY * swirlStrength * 0.55;

    player.setVelocity(
      Phaser.Math.Linear(player.body.velocity.x, vx, 0.045),
      Phaser.Math.Linear(player.body.velocity.y, vy, 0.045)
    );

    scene.gravityDebuffUntil = scene.time.now + 1800;
  }

  update() {
    const scene = this.scene;
    const now = scene.time.now;

    if (scene.gameOver || scene.isPhaseTransitioning) {
      this.deactivate();
      return;
    }

    if (scene.gravityFieldActive && scene.gravityFieldCenter) {
      const d = Phaser.Math.Distance.Between(
        scene.player.x,
        scene.player.y,
        scene.gravityFieldCenter.x,
        scene.gravityFieldCenter.y
      );

      if (d <= scene.gravityFieldRadius) {
        scene.gravityDebuffUntil = now + 1800;
      }
    }

    if (now < scene.gravityDebuffUntil) {
      scene.physics.world.gravity.y = scene.bossPhase >= 3 ? 1900 : 1750;
    } else if (!scene.gravityFieldActive) {
      scene.physics.world.gravity.y = scene.defaultGravityY;
    }
  }

  deactivate() {
    const scene = this.scene;

    
    
    
    if (!scene || !scene.sys || !scene.sys.settings) {
      return;
    }

    if (scene.gravityFieldActive) {
      scene.audioCues?.play?.("gravityFieldCollapse", { volume: 0.42, cooldownMs: 900 });
    }
    scene.audioCues?.stopLoop?.("gravityFieldLoop", 350);
    scene.gravityFieldActive = false;

    if (this.vortexEvent) {
      this.vortexEvent.remove(false);
      this.vortexEvent = null;
    }

    if (scene.gravityVisual && scene.gravityVisual.active) {
      scene.gravityVisual.destroy();
      scene.gravityVisual = null;
    }

    if (scene.gravityRing && scene.gravityRing.active) {
      scene.gravityRing.destroy();
      scene.gravityRing = null;
    }

    if (scene.gravityOverlay && scene.gravityOverlay.active) {
      if (scene.tweens && scene.sys?.isActive?.()) {
        scene.tweens.add({
          targets: scene.gravityOverlay,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            if (scene.gravityOverlay && scene.gravityOverlay.active) {
              scene.gravityOverlay.destroy();
            }

            scene.gravityOverlay = null;
          }
        });
      } else {
        scene.gravityOverlay.destroy();
        scene.gravityOverlay = null;
      }
    }

    if (scene.physics?.world?.gravity) {
      scene.physics.world.gravity.y = scene.defaultGravityY ?? 1500;
    }
  }
}
