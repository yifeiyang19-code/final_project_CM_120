export default class BossMovementController {
  constructor(scene) {
    this.scene = scene;
    this.scareDashAfterimageEvent = null;
    this.activeRayVisuals = [];
    this.activeRayTimers = [];
  }

  update(time) {
    const scene = this.scene;

    if (!scene.hasStartedAttackCycle || scene.controlsLocked || scene.gameOver) return;
    if (scene.isBossCasting || scene.isPhaseTransitioning || scene.bossInvincible) return;
    if (!scene.boss || !scene.boss.active) return;
    if (time < scene.nextBossPatrolTime) return;

    scene.nextBossPatrolTime =
      time + scene.bossPatrolCooldown + Phaser.Math.Between(0, 700);

    const roll = Math.random();

    if (roll < scene.bossChargeAttackChance) {
      this.menacingAdvance();
    } else if (roll < scene.bossChargeAttackChance + scene.bossLaserAttackChance) {
      this.rayOfOblivion();
    } else if (
      roll <
      scene.bossChargeAttackChance +
        scene.bossLaserAttackChance +
        scene.bossBulletAttackChance
    ) {
      this.holyClearance();
    } else if (
      roll <
      scene.bossChargeAttackChance +
        scene.bossLaserAttackChance +
        scene.bossBulletAttackChance +
        scene.bossScareDashChance
    ) {
      this.scareDash();
    } else {
      this.patrolStep();
    }
  }

  performTransition(nextAction) {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.isBossCasting ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      if (nextAction && !scene.isPhaseTransitioning) nextAction();
      return;
    }

    this.cleanupRayVisuals({ endCast: false });

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);

    const anchor = scene.getPhaseBossAnchor?.(scene.bossPhase) || { x: scene.player.x, y: scene.boss.y };
    const moveX = Phaser.Math.Clamp(
      Phaser.Math.Linear(anchor.x, scene.player.x, 0.35) + Phaser.Math.Between(-320, 320),
      260,
      scene.map.widthInPixels - 260
    );
    const moveY = anchor.y;

    scene.boss.setFlipX(moveX < scene.boss.x);

    if (scene.anims.exists("boss_walk_anim")) {
      scene.boss.play("boss_walk_anim", true);
    } else {
      scene.boss.play("blue_idle_anim", true);
    }

    scene.tweens.add({
      targets: scene.boss,
      x: moveX,
      y: moveY,
      duration: 820,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
          scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);
          return;
        }

        scene.playBossEnergyEffect(
          scene.bossPhase === 3
            ? 0xff3333
            : scene.bossPhase === 2
              ? 0xff66ff
              : 0x7df9ff,
          1.75,
          70
        );

        if (scene.anims.exists("boss_attack_anim")) {
          scene.boss.play("boss_attack_anim", true);

          scene.boss.once("animationcomplete", () => {
            if (!scene.boss || !scene.boss.active) return;

            scene.boss.play("blue_idle_anim", true);
            scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

            if (nextAction && !scene.isPhaseTransitioning && !scene.gameOver) {
              nextAction();
            }
          });
        } else {
          scene.boss.play("blue_idle_anim", true);
          scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

          if (nextAction && !scene.isPhaseTransitioning && !scene.gameOver) {
            nextAction();
          }
        }
      }
    });
  }

  patrolStep() {
    const scene = this.scene;
    if (!scene.boss || !scene.boss.active) return;

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);

    const anchor = scene.getPhaseBossAnchor?.(scene.bossPhase) || { x: scene.player.x, y: scene.boss.y };
    const targetX = Phaser.Math.Clamp(
      Phaser.Math.Linear(anchor.x, scene.player.x, 0.30) + Phaser.Math.Between(-460, 460),
      240,
      scene.map.widthInPixels - 240
    );
    const targetY = anchor.y;

    scene.boss.setFlipX(targetX < scene.boss.x);

    if (scene.anims.exists("boss_walk_anim")) {
      scene.boss.play("boss_walk_anim", true);
    }

    scene.tweens.add({
      targets: scene.boss,
      x: targetX,
      y: targetY,
      duration: 900,
      ease: "Sine.easeInOut",
      onComplete: () => {
        scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

        if (scene.boss && scene.boss.active && !scene.gameOver && !scene.isPhaseTransitioning) {
          scene.boss.play("blue_idle_anim", true);
        }
      }
    });
  }

  scareDash() {
    const scene = this.scene;
    if (!scene.boss || !scene.boss.active) return;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    this.stopScareDashAfterimages();

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.body.allowGravity = false;
    scene.boss.setVelocity(0, 0);
    scene.boss.setDepth(72);

    const startX = scene.boss.x;
    const startY = scene.boss.y;

    const dir = scene.player.x < scene.boss.x ? -1 : 1;

    const alignX = Phaser.Math.Clamp(
      scene.player.x - dir * 220,
      220,
      scene.map.widthInPixels - 220
    );

    const alignY = Phaser.Math.Clamp(
      scene.player.y,
      120,
      scene.map.heightInPixels - 120
    );

    scene.boss.setFlipX(dir < 0);

    if (scene.anims.exists("blue_fly_up_anim")) {
      scene.boss.play("blue_fly_up_anim", true);
    }

    scene.tweens.add({
      targets: scene.boss,
      x: alignX,
      y: alignY,
      duration: 500,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.createScareDashAfterimage({
          alpha: 0.16,
          duration: 180,
          depth: 84,
          scaleMultiplier: 1.02
        });
      },
      onComplete: () => {
        this.executeScareDash(startX, startY, dir);
      }
    });
  }

  executeScareDash(originalX, originalY, dir) {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
      this.endScareDashState();
      return;
    }

    const startX = scene.boss.x;
    const startY = scene.boss.y;

    const dashX = Phaser.Math.Clamp(
      scene.player.x - dir * 180,
      220,
      scene.map.widthInPixels - 220
    );

    scene.boss.setFlipX(dir < 0);
    scene.boss.setDepth(72);

    const warning = scene.add.rectangle(
      (startX + dashX) / 2,
      startY,
      Math.abs(dashX - startX),
      28,
      0x7df9ff,
      0.24
    );

    warning.setDepth(35);

    scene.tweens.add({
      targets: warning,
      alpha: 0.85,
      height: 60,
      duration: 260,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut"
    });

    if (scene.anims.exists("boss_walk_attack_anim")) {
      scene.boss.play("boss_walk_attack_anim", true);
    } else if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    }

    scene.time.delayedCall(1050, () => {
      if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
        if (warning && warning.active) warning.destroy();
        this.endScareDashState();
        return;
      }

      if (warning && warning.active) warning.destroy();

      scene.playBossEnergyEffect(0x7df9ff, 1.8, 86);
      scene.cameras.main.shake(220, 0.008);

      this.createScareDashAfterimage({
        alpha: 0.26,
        duration: 240,
        depth: 86,
        scaleMultiplier: 1.03
      });

      this.startScareDashAfterimages();

      scene.tweens.add({
        targets: scene.boss,
        x: dashX,
        duration: 240,
        ease: "Quad.easeOut",
        onUpdate: () => {
          this.createScareDashAfterimage({
            alpha: 0.23,
            duration: 230,
            depth: 86,
            scaleMultiplier: 1.03
          });
        },
        onComplete: () => {
          this.stopScareDashAfterimages();

          if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
            this.endScareDashState();
            return;
          }

          scene.tweens.add({
            targets: scene.boss,
            x: originalX + dir * 80,
            y: originalY,
            duration: 500,
            ease: "Sine.easeInOut",
            onUpdate: () => {
              this.createScareDashAfterimage({
                alpha: 0.12,
                duration: 160,
                depth: 82,
                scaleMultiplier: 1.01
              });
            },
            onComplete: () => {
              this.endScareDashState();
            }
          });
        }
      });
    });
  }

  startScareDashAfterimages() {
    const scene = this.scene;

    this.stopScareDashAfterimages();

    this.scareDashAfterimageEvent = scene.time.addEvent({
      delay: 55,
      loop: true,
      callback: () => {
        this.createScareDashAfterimage({
          alpha: 0.2,
          duration: 220,
          depth: 86,
          scaleMultiplier: 1.02
        });
      }
    });
  }

  stopScareDashAfterimages() {
    if (this.scareDashAfterimageEvent) {
      this.scareDashAfterimageEvent.remove(false);
      this.scareDashAfterimageEvent = null;
    }
  }

  createScareDashAfterimage({
    alpha = 0.2,
    duration = 220,
    depth = 86,
    scaleMultiplier = 1.02
  } = {}) {
    const scene = this.scene;

    if (!scene.effects || !scene.effects.afterimage) return null;
    if (!scene.boss || !scene.boss.active) return null;

    return scene.effects.afterimage(scene.boss, {
      alpha,
      tint: 0x66ccff,
      duration,
      depth,
      scaleMultiplier,
      blendMode: Phaser.BlendModes.ADD
    });
  }

  endScareDashState() {
    const scene = this.scene;

    this.stopScareDashAfterimages();

    if (scene.boss && scene.boss.active) {
      scene.boss.body.allowGravity = false;
      scene.boss.setVelocity(0, 0);
      scene.boss.setDepth(30);

      if (!scene.gameOver && !scene.isPhaseTransitioning && scene.anims.exists("blue_idle_anim")) {
        scene.boss.play("blue_idle_anim", true);
      }
    }

    scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);
  }

  menacingAdvance() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    if (scene.menacingAdvanceSkill && scene.menacingAdvanceSkill.cast) {
      scene.menacingAdvanceSkill.cast();
      return;
    }

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.body.allowGravity = false;
    scene.boss.setVelocity(0, 0);

    const approachDir = scene.player.x < scene.boss.x ? -1 : 1;

    const frontX = Phaser.Math.Clamp(
      scene.player.x - approachDir * 220,
      180,
      scene.map.widthInPixels - 180
    );

    const frontY = Phaser.Math.Clamp(
      scene.player.y - 40,
      120,
      scene.map.heightInPixels - 120
    );

    scene.boss.setFlipX(approachDir < 0);

    if (scene.anims.exists("blue_fly_up_anim")) {
      scene.boss.play("blue_fly_up_anim", true);
    }

    scene.playBossEnergyEffect(0x7df9ff, 1.8, 70);

    scene.tweens.add({
      targets: scene.boss,
      x: frontX,
      y: frontY,
      duration: 430,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (!scene.boss || !scene.boss.active) return;

        const dashDir = scene.player.x >= scene.boss.x ? 1 : -1;

        const dashEndX = Phaser.Math.Clamp(
          scene.player.x + dashDir * 360,
          120,
          scene.map.widthInPixels - 120
        );

        const dashEndY = scene.boss.y;

        const warning = scene.add.rectangle(
          (scene.boss.x + dashEndX) / 2,
          dashEndY,
          Math.abs(dashEndX - scene.boss.x),
          36,
          0xff4444,
          0.28
        ).setDepth(45);

        scene.tweens.add({
          targets: warning,
          alpha: 0.95,
          height: 82,
          duration: 190,
          yoyo: true,
          repeat: 5,
          ease: "Sine.easeInOut"
        });

        if (scene.anims.exists("boss_walk_attack_anim")) {
          scene.boss.play("boss_walk_attack_anim", true);
        } else if (scene.anims.exists("boss_attack_anim")) {
          scene.boss.play("boss_attack_anim", true);
        } else {
          scene.boss.play("blue_idle_anim", true);
        }

        scene.time.delayedCall(1150, () => {
          if (!scene.boss || !scene.boss.active) return;

          warning.destroy();
          scene.cameras.main.shake(360, 0.018);
          scene.playBossEnergyEffect(0xff4444, 2.0, 80);

          const hitbox = scene.add.rectangle(
            scene.boss.x,
            scene.boss.y,
            190,
            130,
            0xff0000,
            0
          );

          scene.physics.add.existing(hitbox);
          hitbox.body.allowGravity = false;

          let hasHit = false;

          const overlap = scene.physics.add.overlap(hitbox, scene.player, () => {
            if (hasHit) return;

            hasHit = true;
            scene.damagePlayer(1);
          });

          scene.tweens.add({
            targets: [scene.boss, hitbox],
            x: dashEndX,
            duration: 260,
            ease: "Quad.easeOut",
            onComplete: () => {
              overlap.destroy();
              hitbox.destroy();

              scene.boss.body.allowGravity = false;
              scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

              if (scene.boss && scene.boss.active) {
                scene.boss.play("blue_idle_anim", true);
              }
            }
          });
        });
      }
    });
  }

  trackRayVisual(obj) {
    if (!obj) return obj;
    obj.setName?.("legacy_ray_visual");
    this.activeRayVisuals.push(obj);
    return this.scene.trackHostileObject?.(obj) || obj;
  }

  scheduleRay(delay, callback) {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.activeRayTimers = this.activeRayTimers.filter((entry) => entry !== timer);
      callback();
    });
    this.activeRayTimers.push(timer);
    return timer;
  }

  cleanupRayVisuals({ endCast = true } = {}) {
    for (const timer of this.activeRayTimers) {
      try { timer?.remove?.(false); } catch (_error) {}
    }
    this.activeRayTimers = [];

    for (const obj of this.activeRayVisuals) {
      try { this.scene.tweens?.killTweensOf?.(obj); } catch (_error) {}
      if (obj?.active) obj.destroy();
    }
    this.activeRayVisuals = [];

    if (endCast) {
      this.scene.setBossCasting?.(false) ?? (this.scene.isBossCasting = false);
    }
  }

  rayOfOblivion() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    this.cleanupRayVisuals({ endCast: false });

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.setFlipX(scene.player.x < scene.boss.x);

    const startX = scene.boss.x;
    const startY = scene.boss.y - 30;
    const targetX = scene.player.x;
    const targetY = scene.player.y - 20;

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const length = 2200;

    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;

    const warning = this.trackRayVisual(scene.add.rectangle(
      (startX + endX) / 2,
      (startY + endY) / 2,
      length,
      22,
      0x7df9ff,
      0.26
    ).setDepth(55));

    warning.setRotation(angle);


    if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    }

    scene.tweens.add({
      targets: warning,
      height: 64,
      alpha: 0.95,
      duration: 240,
      yoyo: true,
      repeat: 5,
      ease: "Sine.easeInOut"
    });

    this.scheduleRay(1350, () => {
      if (!scene.boss || !scene.boss.active) return;

      if (warning && warning.active) warning.destroy();

      scene.playBossEnergyEffect(0x7df9ff, 2.0, 85);
      scene.cameras.main.shake(300, 0.014);

      const beam = this.trackRayVisual(scene.add.rectangle(
        (startX + endX) / 2,
        (startY + endY) / 2,
        length,
        78,
        0x7df9ff,
        0.72
      ).setDepth(65));

      beam.setRotation(angle);

      const core = this.trackRayVisual(scene.add.rectangle(
        (startX + endX) / 2,
        (startY + endY) / 2,
        length,
        22,
        0xffffff,
        0.95
      ).setDepth(66));

      core.setRotation(angle);

      const hitbox = this.trackRayVisual(scene.add.rectangle(
        (startX + endX) / 2,
        (startY + endY) / 2,
        length,
        70,
        0xffffff,
        0
      ));

      hitbox.setRotation(angle);
      scene.physics.add.existing(hitbox);
      hitbox.body.allowGravity = false;

      let hasHit = false;

      const overlap = scene.physics.add.overlap(hitbox, scene.player, () => {
        if (hasHit) return;

        hasHit = true;
        scene.damagePlayer(1);
      });

      this.scheduleRay(360, () => {
        overlap.destroy();
        this.cleanupRayVisuals({ endCast: false });

        scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

        if (scene.boss && scene.boss.active) {
          scene.boss.play("blue_idle_anim", true);
        }
      });
    });
  }

  holyClearance() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.setFlipX(scene.player.x < scene.boss.x);

    const volleyCount = scene.bossPhase >= 3 ? 5 : Phaser.Math.Between(2, 3);
    const delayBetween = scene.bossPhase >= 3 ? 280 : 420;

    if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    }

    for (let i = 0; i < volleyCount; i++) {
      scene.time.delayedCall(i * delayBetween, () => {
        if (!scene.boss || !scene.boss.active || scene.gameOver) return;

        const spreadCount = scene.bossPhase >= 3 ? i + 1 : 1;
        this.fireBossBulletVolley(spreadCount);
      });
    }

    scene.time.delayedCall(volleyCount * delayBetween + 500, () => {
      scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

      if (scene.boss && scene.boss.active) {
        scene.boss.play("blue_idle_anim", true);
      }
    });
  }

  cleanup() {
    this.stopScareDashAfterimages();
    this.cleanupRayVisuals({ endCast: false });
  }

  fireBossBulletVolley(count = 1) {
    const scene = this.scene;

    const startX = scene.boss.x;
    const startY = scene.boss.y - 20;

    const baseAngle = Phaser.Math.Angle.Between(
      startX,
      startY,
      scene.player.x,
      scene.player.y - 20
    );

    const bulletKey = Phaser.Utils.Array.GetRandom(scene.bossBulletKeys);
    const spread = Phaser.Math.DegToRad(10);

    scene.playBossEnergyEffect(
      scene.bossPhase >= 3 ? 0xff3333 : 0x7df9ff,
      1.35,
      75
    );

    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2;
      const angle = baseAngle + offsetIndex * spread;

      const bullet = scene.physics.add.sprite(startX, startY, bulletKey);
      scene.trackHostileObject?.(bullet);

      bullet.setScale(scene.bossPhase >= 3 ? 1.6 : 1.35);
      bullet.setDepth(50);
      bullet.body.allowGravity = false;
      bullet.rotation = angle;

      const speed = scene.bossPhase >= 3 ? 720 : 560;

      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      scene.physics.add.overlap(bullet, scene.player, () => {
        if (!bullet.active) return;

        bullet.destroy();
        scene.damagePlayer(1);
      });

      scene.time.delayedCall(9000, () => {
        if (bullet.active) bullet.destroy();
      });
    }
  }
}
