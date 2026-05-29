export default class MenacingAdvance {
  constructor(scene) {
    this.scene = scene;

    this.afterimageEvent = null;
    this.warning = null;
    this.chargeHitbox = null;
    this.chargeOverlap = null;

    this.approachDuration = 300;
    this.warningDuration = 660;
    this.chargeDuration = 250;
    this.recoveryDuration = 220;

    this.approachDistance = 260;
    this.chargeDistance = 600;
    this.chargeDamage = 1;

    this.lastAfterimageTime = 0;
    this.afterimageInterval = 22;
  }

  cast() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    this.cleanupChargeObjects();

    scene.bossSpeakRandom("menacingAdvance", 2200);
    scene.audioCues?.play?.("menacingAdvanceCharge", { volume: 0.46, cooldownMs: 600 });

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.body.allowGravity = false;
    scene.boss.setVelocity(0, 0);
    scene.boss.setDepth(80);

    const approachDir = scene.player.x < scene.boss.x ? -1 : 1;

    const frontX = Phaser.Math.Clamp(
      scene.player.x - approachDir * this.approachDistance,
      180,
      scene.map.widthInPixels - 180
    );

    const frontY = Phaser.Math.Clamp(
      scene.player.y - 50,
      120,
      scene.map.heightInPixels - 140
    );

    scene.boss.setFlipX(approachDir < 0);

    if (scene.anims.exists("blue_fly_up_anim")) {
      scene.boss.play("blue_fly_up_anim", true);
    }

    scene.playBossEnergyEffect(0x7df9ff, 1.8, 86);

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(scene.boss.x, scene.boss.y, {
        radius: 36,
        color: 0x7df9ff,
        alpha: 0.65,
        scale: 2.4,
        duration: 260,
        depth: 82
      });
    }

    scene.tweens.add({
      targets: scene.boss,
      x: frontX,
      y: frontY,
      duration: this.approachDuration,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.createTimedAfterimage({
          tint: 0x7df9ff,
          alpha: 0.42,
          duration: 240,
          depth: 92,
          scaleMultiplier: 1.04,
          interval: 45
        });
      },
      onComplete: () => {
        this.startCharge();
      }
    });
  }

  startCharge() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      this.endChargeState();
      return;
    }

    const dashDir = scene.player.x >= scene.boss.x ? 1 : -1;
    scene.boss.setFlipX(dashDir < 0);
    scene.boss.setDepth(80);

    const rawEndX = scene.boss.x + dashDir * this.chargeDistance;
    const dashEndX = Phaser.Math.Clamp(
      rawEndX,
      120,
      scene.map.widthInPixels - 120
    );

    const dashEndY = scene.boss.y;

    this.createChargeWarning(dashEndX, dashEndY);

    if (scene.anims.exists("boss_walk_attack_anim")) {
      scene.boss.play("boss_walk_attack_anim", true);
    } else if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    } else if (scene.anims.exists("blue_idle_anim")) {
      scene.boss.play("blue_idle_anim", true);
    }

    scene.playBossEnergyEffect(0xff3344, 2.0, 88);

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(scene.boss.x, scene.boss.y, {
        radius: 44,
        color: 0xff3344,
        alpha: 0.72,
        scale: 2.9,
        duration: 300,
        depth: 84
      });
    }

    scene.time.delayedCall(this.warningDuration, () => {
      this.executeCharge(dashEndX, dashEndY, dashDir);
    });
  }

  createChargeWarning(dashEndX, dashEndY) {
    const scene = this.scene;

    const startX = scene.boss.x;
    const width = Math.max(80, Math.abs(dashEndX - startX));
    const centerX = (startX + dashEndX) / 2;

    const warning = scene.add.rectangle(
      centerX,
      dashEndY,
      width,
      42,
      0xff2233,
      0.2
    ).setDepth(45);

    const coreLine = scene.add.rectangle(
      centerX,
      dashEndY,
      width,
      8,
      0xffffff,
      0.55
    ).setDepth(46);


    this.warning = scene.add.container(0, 0, [warning, coreLine]);
    this.warning.setDepth(45);

    scene.tweens.add({
      targets: warning,
      alpha: 0.92,
      height: 96,
      duration: 120,
      yoyo: true,
      repeat: 5,
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: coreLine,
      alpha: 0.95,
      height: 18,
      duration: 90,
      yoyo: true,
      repeat: 7,
      ease: "Sine.easeInOut"
    });

  }

  executeCharge(dashEndX, dashEndY, dashDir) {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      this.endChargeState();
      return;
    }

    this.destroyWarning();

    scene.audioCues?.play?.("menacingAdvanceDash", { volume: 0.54, cooldownMs: 250 });
    scene.boss.setFlipX(dashDir < 0);
    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;
    scene.boss.setDepth(80);

    scene.cameras.main.shake(240, 0.016);
    scene.playBossEnergyEffect(0xff2233, 2.25, 90);

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(scene.boss.x, scene.boss.y, {
        radius: 54,
        color: 0xff3344,
        alpha: 0.86,
        scale: 3.1,
        duration: 260,
        depth: 90
      });
    }

    this.createChargeHitbox();

    if (scene.anims.exists("boss_walk_attack_anim")) {
      scene.boss.play("boss_walk_attack_anim", true);
    }

    this.createHardAfterimage();
    scene.time.delayedCall(25, () => this.createHardAfterimage());
    scene.time.delayedCall(50, () => this.createHardAfterimage());

    this.startAfterimageTrail();
    this.tryAttachOblivionRayDuringCharge();

    scene.tweens.add({
      targets: scene.boss,
      x: dashEndX,
      duration: this.chargeDuration,
      ease: "Expo.easeOut",
      onUpdate: () => {
        this.updateChargeHitbox();
        this.createTimedAfterimage({
          tint: 0xff3344,
          alpha: 0.78,
          duration: 420,
          depth: 96,
          scaleMultiplier: 1.1,
          interval: this.afterimageInterval
        });
      },
      onComplete: () => {
        this.updateChargeHitbox();
        this.finishChargeImpact(dashEndX, dashEndY);
      }
    });
  }

  tryAttachOblivionRayDuringCharge() {
    const scene = this.scene;
    if (!scene.skills?.rayOfOblivion) return;
    const now = scene.time.now || 0;
    const cooldown = scene.bossPhase >= 4 ? 5200 : scene.bossPhase >= 3 ? 6200 : scene.bossPhase >= 2 ? 7200 : 9000;
    if (scene.lastAttachedOblivionRayAt && now - scene.lastAttachedOblivionRayAt < cooldown) return;

    const chance = scene.bossPhase >= 4 ? 0.42 : scene.bossPhase >= 3 ? 0.3 : scene.bossPhase >= 2 ? 0.22 : 0.14;
    if (Math.random() > chance) return;
    scene.lastAttachedOblivionRayAt = now;

    scene.time.delayedCall(120, () => {
      if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) return;
      scene.skills.rayOfOblivion.cast({ attachedToBoss: true, noCastingLock: true });
    });
  }

  createChargeHitbox() {
    const scene = this.scene;

    const hitbox = scene.add.rectangle(
      scene.boss.x,
      scene.boss.y,
      260,
      160,
      0xff0000,
      0
    );

    scene.physics.add.existing(hitbox);
    hitbox.body.allowGravity = false;
    hitbox.body.setImmovable(true);

    this.chargeHitbox = hitbox;
    this.hasHitPlayer = false;

    this.chargeOverlap = scene.physics.add.overlap(hitbox, scene.player, () => {
      if (this.hasHitPlayer) return;

      this.hasHitPlayer = true;
      scene.damagePlayer(this.chargeDamage);

      if (scene.effects && scene.effects.impactCircle) {
        scene.effects.impactCircle(scene.player.x, scene.player.y - 20, {
          radius: 38,
          color: 0xff2233,
          alpha: 0.9,
          scale: 2.4,
          duration: 220,
          depth: 98
        });
      }
    });
  }

  updateChargeHitbox() {
    if (!this.chargeHitbox || !this.chargeHitbox.active) return;

    const scene = this.scene;
    this.chargeHitbox.x = scene.boss.x;
    this.chargeHitbox.y = scene.boss.y;
  }

  startAfterimageTrail() {
    const scene = this.scene;

    this.stopAfterimageTrail();

    this.afterimageEvent = scene.time.addEvent({
      delay: 28,
      loop: true,
      callback: () => {
        this.createHardAfterimage();
      }
    });
  }

  stopAfterimageTrail() {
    if (this.afterimageEvent) {
      this.afterimageEvent.remove(false);
      this.afterimageEvent = null;
    }
  }

  createTimedAfterimage({
    tint,
    alpha,
    duration,
    depth,
    scaleMultiplier,
    interval
  }) {
    const now = this.scene.time.now;

    if (now - this.lastAfterimageTime < interval) return;

    this.lastAfterimageTime = now;

    this.createAfterimage({
      tint,
      alpha,
      duration,
      depth,
      scaleMultiplier
    });
  }

  createAfterimage({
    tint = 0xff3344,
    alpha = 0.72,
    duration = 360,
    depth = 96,
    scaleMultiplier = 1.08
  } = {}) {
    const scene = this.scene;

    if (!scene.effects || !scene.effects.afterimage) return null;
    if (!scene.boss || !scene.boss.active) return null;

    return scene.effects.afterimage(scene.boss, {
      alpha,
      tint,
      duration,
      depth,
      scaleMultiplier,
      blendMode: Phaser.BlendModes.ADD
    });
  }

  createSoftAfterimage(tint = 0x7df9ff, alpha = 0.42, duration = 240) {
    return this.createAfterimage({
      tint,
      alpha,
      duration,
      depth: 92,
      scaleMultiplier: 1.04
    });
  }

  createHardAfterimage() {
    return this.createAfterimage({
      alpha: 0.82,
      tint: 0xff3344,
      duration: 460,
      depth: 96,
      scaleMultiplier: 1.12
    });
  }

  finishChargeImpact(x, y) {
    const scene = this.scene;

    this.stopAfterimageTrail();
    this.destroyChargeHitbox();

    scene.cameras.main.shake(260, 0.018);

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(x, y, {
        radius: 62,
        color: 0xff3344,
        alpha: 0.9,
        scale: 3.4,
        duration: 320,
        depth: 98
      });
    }

    if (scene.effects && scene.effects.afterimage && scene.boss && scene.boss.active) {
      for (let i = 0; i < 6; i++) {
        scene.time.delayedCall(i * 28, () => {
          this.createHardAfterimage();
        });
      }
    }

    scene.time.delayedCall(this.recoveryDuration, () => {
      this.endChargeState();
    });
  }

  endChargeState() {
    const scene = this.scene;

    this.cleanupChargeObjects();

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

  destroyWarning() {
    if (this.warning && this.warning.active) {
      this.warning.destroy(true);
    }

    this.warning = null;
  }

  destroyChargeHitbox() {
    if (this.chargeOverlap) {
      this.chargeOverlap.destroy();
      this.chargeOverlap = null;
    }

    if (this.chargeHitbox && this.chargeHitbox.active) {
      this.chargeHitbox.destroy();
    }

    this.chargeHitbox = null;
  }

  cleanupChargeObjects() {
    this.stopAfterimageTrail();
    this.destroyWarning();
    this.destroyChargeHitbox();
  }
}
