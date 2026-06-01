export default class RayOfOblivion {
  constructor(scene) {
    this.scene = scene;
    this.warningDuration = 1150;
    this.beamDuration = 420;
    this.beamWidth = 58;
    this.warningWidth = 22;
    this.attachedWarningDuration = 1450;
    this.attachedBeamDuration = 280;
    this.attachedBeamWidth = 38;
    this.attachedWarningWidth = 16;
    this.damage = 1;
    this.hasHitPlayer = false;
    this.activeVisuals = new Set();
    this.activeTimers = new Set();
    this.activeUpdateCleanups = new Set();
    this.damagedTreesThisBeam = new Set();
    this.noCastingLock = false;
  }

  cast(options = {}) {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
      return;
    }

    const attachedToBoss = options.attachedToBoss === true;
    this.noCastingLock = options.noCastingLock === true;

    if (!attachedToBoss && scene.bossPhase >= 4 && options.forceStandard !== true) {
      this.cleanup({ endCast: true });
      this.castPhase4Sweep();
      return;
    }

    this.cleanup({ endCast: !this.noCastingLock });
    this.noCastingLock = options.noCastingLock === true;

    const warningDuration = attachedToBoss ? this.attachedWarningDuration : this.warningDuration;
    const beamDuration = attachedToBoss ? this.attachedBeamDuration : this.beamDuration;

    scene.bossSpeakRandom("rayOfOblivion", attachedToBoss ? 1300 : 2200);
    scene.audioCues?.play?.("laserCharge", { volume: attachedToBoss ? 0.3 : 0.46, cooldownMs: 300 });

    if (!this.noCastingLock) {
      scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
      scene.boss.setVelocity(0, 0);
      scene.boss.body.allowGravity = false;
    }

    const beam = this.computeBeamData();
    if (!beam) {
      this.endCast();
      return;
    }

    scene.boss.setFlipX(beam.targetX < beam.originX);

    if (!attachedToBoss) {
      if (scene.anims.exists("boss_attack_anim")) {
        scene.boss.play("boss_attack_anim", true);
      } else if (scene.anims.exists("blue_idle_anim")) {
        scene.boss.play("blue_idle_anim", true);
      }
    }

    this.createWarning(beam, attachedToBoss);

    this.schedule(warningDuration, () => {
      this.cleanupWarningVisuals();

      if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
        this.endCast();
        return;
      }

      const liveBeam = attachedToBoss ? this.computeBeamData({ angleOverride: beam.angle }) : beam;
      if (!liveBeam) {
        this.endCast();
        return;
      }

      this.fireBeam(liveBeam, attachedToBoss, beamDuration);
    });
  }


  castPhase4Sweep() {
    const scene = this.scene;
    if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) return;

    this.noCastingLock = false;
    this.hasHitPlayer = false;
    this.damagedTreesThisBeam.clear();
    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;
    scene.bossSpeak?.("FINAL SWEEP PATTERN AUTHORIZED", 1700, {
      ignoreOnce: true,
      anchorToSpeaker: true,
      fontSize: "22px",
      boxWidth: 660,
      offsetY: -148,
      strokeColor: 0xff3344
    });
    scene.audioCues?.play?.("laserCharge", { volume: 0.38, cooldownMs: 400 });

    const steps = [
      {
        label: "SLOW SWEEP: TOP TO BOTTOM",
        warning: 700,
        fire: 2100,
        preview: () => this.createHorizontalSweepPreview("down", 700),
        start: () => this.runHorizontalSweep("down", 2100)
      },
      {
        label: "SLOW SWEEP: BOTTOM TO TOP",
        warning: 700,
        fire: 2100,
        preview: () => this.createHorizontalSweepPreview("up", 700),
        start: () => this.runHorizontalSweep("up", 2100)
      },
      {
        label: "SLOW SWEEP: LEFT TO RIGHT",
        warning: 700,
        fire: 2100,
        preview: () => this.createVerticalSweepPreview("right", 700),
        start: () => this.runVerticalSweep("right", 2100)
      },
      {
        label: "SLOW SWEEP: RIGHT TO LEFT",
        warning: 700,
        fire: 2100,
        preview: () => this.createVerticalSweepPreview("left", 700),
        start: () => this.runVerticalSweep("left", 2100)
      },
      {
        label: "SLOW SWEEP: 360 DEGREES",
        warning: 900,
        fire: 4200,
        preview: () => this.createRadialSweepPreview(900),
        start: () => this.runRadialSweep(4200)
      }
    ];

    let offset = 0;
    for (const step of steps) {
      this.schedule(offset, () => {
        this.createSweepWarningText(step.label, step.warning);
        step.preview?.();
      });
      this.schedule(offset + step.warning, step.start);
      offset += step.warning + step.fire + 40;
    }
    this.schedule(offset + 120, () => this.endCast());
  }

  createSweepWarningText(text, duration = 900) {
    const scene = this.scene;
    const width = scene.scale?.width || scene.cameras?.main?.width || 1280;
    const y = 104;
    const backing = this.trackVisual(scene.add.rectangle(width * 0.5, y, Math.min(880, width - 90), 56, 0x050005, 0.82)
      .setScrollFactor(0)
      .setDepth(9890)
      .setStrokeStyle(3, 0xffffff, 0.76));
    const label = this.trackVisual(scene.add.text(width * 0.5, y, text, {
      fontFamily: "monospace",
      fontSize: "26px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 9
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9891));

    scene.tweens.add({
      targets: [label, backing],
      alpha: 0.36,
      duration: 120,
      yoyo: true,
      repeat: Math.ceil(duration / 240),
      ease: "Stepped"
    });
    this.schedule(duration, () => {
      label?.destroy?.();
      backing?.destroy?.();
    });
  }

  createHorizontalSweepPreview(direction = "down", duration = 1800) {
    const scene = this.scene;
    const view = scene.cameras.main.worldView;
    const startY = direction === "down" ? view.top - 120 : view.bottom + 120;
    const gapWidth = 320;
    const playerX = scene.player?.active ? scene.player.x : view.centerX;
    const gapX = Phaser.Math.Clamp(playerX, view.left + gapWidth * 0.65, view.right - gapWidth * 0.65);
    const leftWidth = Math.max(0, gapX - gapWidth * 0.5 - view.left);
    const rightWidth = Math.max(0, view.right - (gapX + gapWidth * 0.5));
    const leftX = view.left + leftWidth * 0.5;
    const rightX = gapX + gapWidth * 0.5 + rightWidth * 0.5;
    const objects = [];

    if (leftWidth > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(leftX, startY, leftWidth, 34, 0xff2233, 0.30)
        .setDepth(9860)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }
    if (rightWidth > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(rightX, startY, rightWidth, 34, 0xff2233, 0.30)
        .setDepth(9860)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }

    const safe = this.trackVisual(scene.add.rectangle(gapX, startY, gapWidth, 74, 0xb8fff8, 0.10)
      .setDepth(9861)
      .setStrokeStyle(4, 0xb8fff8, 0.78));
    objects.push(safe);

    scene.tweens.add({
      targets: objects,
      alpha: 0.08,
      duration: 160,
      yoyo: true,
      repeat: Math.ceil(duration / 320),
      ease: "Sine.easeInOut"
    });
    this.schedule(duration, () => objects.forEach((obj) => this.destroyVisual(obj)));
  }

  createVerticalSweepPreview(direction = "right", duration = 1800) {
    const scene = this.scene;
    const view = scene.cameras.main.worldView;
    const startX = direction === "right" ? view.left - 150 : view.right + 150;
    const gapHeight = 280;
    const playerY = scene.player?.active ? scene.player.y : view.centerY;
    const gapY = Phaser.Math.Clamp(playerY, view.top + gapHeight * 0.65, view.bottom - gapHeight * 0.65);
    const topHeight = Math.max(0, gapY - gapHeight * 0.5 - view.top);
    const bottomHeight = Math.max(0, view.bottom - (gapY + gapHeight * 0.5));
    const topY = view.top + topHeight * 0.5;
    const bottomY = gapY + gapHeight * 0.5 + bottomHeight * 0.5;
    const objects = [];

    if (topHeight > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(startX, topY, 34, topHeight, 0xff2233, 0.30)
        .setDepth(9860)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }
    if (bottomHeight > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(startX, bottomY, 34, bottomHeight, 0xff2233, 0.30)
        .setDepth(9860)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }

    const safe = this.trackVisual(scene.add.rectangle(startX, gapY, 76, gapHeight, 0xb8fff8, 0.10)
      .setDepth(9861)
      .setStrokeStyle(4, 0xb8fff8, 0.78));
    objects.push(safe);

    scene.tweens.add({
      targets: objects,
      alpha: 0.08,
      duration: 160,
      yoyo: true,
      repeat: Math.ceil(duration / 320),
      ease: "Sine.easeInOut"
    });
    this.schedule(duration, () => objects.forEach((obj) => this.destroyVisual(obj)));
  }

  createRadialSweepPreview(duration = 2200) {
    const scene = this.scene;
    if (!scene.boss?.active) return;
    const view = scene.cameras.main.worldView;
    const distance = Math.max(view.width, view.height) * 1.5;
    const guide = this.trackVisual(scene.add.rectangle(scene.boss.x, scene.boss.y - 28, distance, 18, 0xff2233, 0.24)
      .setName("phase4_radial_preview")
      .setOrigin(0, 0.5)
      .setDepth(9860)
      .setBlendMode(Phaser.BlendModes.ADD));
    const ring = this.trackVisual(scene.add.circle(scene.boss.x, scene.boss.y - 28, 72, 0xffffff, 0.04)
      .setDepth(9861)
      .setStrokeStyle(5, 0xb8fff8, 0.78));

    scene.tweens.addCounter({
      from: -Math.PI,
      to: Math.PI,
      duration,
      ease: "Linear",
      onUpdate: (tween) => {
        if (!scene.boss?.active) return;
        guide.setPosition(scene.boss.x, scene.boss.y - 28).setRotation(tween.getValue());
        ring.setPosition(scene.boss.x, scene.boss.y - 28);
      },
      onComplete: () => {
        this.destroyVisual(guide);
        this.destroyVisual(ring);
      }
    });
  }

  runHorizontalSweep(direction = "down", duration = 1700) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    this.hasHitPlayer = false;
    scene.audioCues?.play?.("laserFire", { volume: 0.32, cooldownMs: 220 });
    scene.cameras.main.shake(100, 0.004);

    const view = scene.cameras.main.worldView;
    const startY = direction === "down" ? view.top - 140 : view.bottom + 140;
    const endY = direction === "down" ? view.bottom + 140 : view.top - 140;
    const beamHeight = 24;
    const gapWidth = 320;
    const playerX = scene.player?.active ? scene.player.x : view.centerX;
    const gapX = Phaser.Math.Clamp(playerX, view.left + gapWidth * 0.65, view.right - gapWidth * 0.65);
    const leftWidth = Math.max(0, gapX - gapWidth * 0.5 - view.left);
    const rightWidth = Math.max(0, view.right - (gapX + gapWidth * 0.5));
    const leftX = view.left + leftWidth * 0.5;
    const rightX = gapX + gapWidth * 0.5 + rightWidth * 0.5;

    const objects = [];
    if (leftWidth > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(leftX, startY, leftWidth, beamHeight, 0xff2233, 0.72)
        .setName("phase4_horizontal_sweep")
        .setDepth(9870)
        .setBlendMode(Phaser.BlendModes.ADD)));
      objects.push(this.trackVisual(scene.add.rectangle(leftX, startY, leftWidth, 8, 0xffffff, 0.94)
        .setName("phase4_horizontal_sweep_core")
        .setDepth(9871)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }
    if (rightWidth > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(rightX, startY, rightWidth, beamHeight, 0xff2233, 0.72)
        .setName("phase4_horizontal_sweep")
        .setDepth(9870)
        .setBlendMode(Phaser.BlendModes.ADD)));
      objects.push(this.trackVisual(scene.add.rectangle(rightX, startY, rightWidth, 8, 0xffffff, 0.94)
        .setName("phase4_horizontal_sweep_core")
        .setDepth(9871)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }

    scene.tweens.add({
      targets: objects,
      y: endY,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const y = objects.find((obj) => obj?.active)?.y ?? startY;
        this.applyHorizontalSweepDamage(y, beamHeight, gapX, gapWidth);
      },
      onComplete: () => {
        for (const obj of objects) this.destroyVisual(obj);
      }
    });
  }

  applyHorizontalSweepDamage(y, beamHeight, gapX = null, gapWidth = 0) {
    const scene = this.scene;
    if (!scene.player?.active || this.hasHitPlayer) return;
    if (gapX !== null && Math.abs(scene.player.x - gapX) <= gapWidth * 0.5 + 18) return;
    if (Math.abs(scene.player.y - y) <= beamHeight * 0.5 + 20) {
      this.hasHitPlayer = true;
      scene.damagePlayer?.(this.damage);
    }
  }

  runVerticalSweep(direction = "right", duration = 1700) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    this.hasHitPlayer = false;
    scene.audioCues?.play?.("laserFire", { volume: 0.32, cooldownMs: 220 });
    scene.cameras.main.shake(100, 0.004);

    const view = scene.cameras.main.worldView;
    const startX = direction === "right" ? view.left - 170 : view.right + 170;
    const endX = direction === "right" ? view.right + 170 : view.left - 170;
    const beamWidth = 24;
    const gapHeight = 280;
    const playerY = scene.player?.active ? scene.player.y : view.centerY;
    const gapY = Phaser.Math.Clamp(playerY, view.top + gapHeight * 0.65, view.bottom - gapHeight * 0.65);
    const topHeight = Math.max(0, gapY - gapHeight * 0.5 - view.top);
    const bottomHeight = Math.max(0, view.bottom - (gapY + gapHeight * 0.5));
    const topY = view.top + topHeight * 0.5;
    const bottomY = gapY + gapHeight * 0.5 + bottomHeight * 0.5;

    const objects = [];
    if (topHeight > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(startX, topY, beamWidth, topHeight, 0xff2233, 0.72)
        .setName("phase4_vertical_sweep")
        .setDepth(9870)
        .setBlendMode(Phaser.BlendModes.ADD)));
      objects.push(this.trackVisual(scene.add.rectangle(startX, topY, 8, topHeight, 0xffffff, 0.94)
        .setName("phase4_vertical_sweep_core")
        .setDepth(9871)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }
    if (bottomHeight > 12) {
      objects.push(this.trackVisual(scene.add.rectangle(startX, bottomY, beamWidth, bottomHeight, 0xff2233, 0.72)
        .setName("phase4_vertical_sweep")
        .setDepth(9870)
        .setBlendMode(Phaser.BlendModes.ADD)));
      objects.push(this.trackVisual(scene.add.rectangle(startX, bottomY, 8, bottomHeight, 0xffffff, 0.94)
        .setName("phase4_vertical_sweep_core")
        .setDepth(9871)
        .setBlendMode(Phaser.BlendModes.ADD)));
    }

    scene.tweens.add({
      targets: objects,
      x: endX,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const x = objects.find((obj) => obj?.active)?.x ?? startX;
        this.applyVerticalSweepDamage(x, beamWidth, gapY, gapHeight);
      },
      onComplete: () => {
        for (const obj of objects) this.destroyVisual(obj);
      }
    });
  }

  applyVerticalSweepDamage(x, beamWidth, gapY = null, gapHeight = 0) {
    const scene = this.scene;
    if (!scene.player?.active || this.hasHitPlayer) return;
    if (gapY !== null && Math.abs(scene.player.y - gapY) <= gapHeight * 0.5 + 18) return;
    if (Math.abs(scene.player.x - x) <= beamWidth * 0.5 + 20) {
      this.hasHitPlayer = true;
      scene.damagePlayer?.(this.damage);
    }
  }

  runRadialSweep(duration = 1800) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning || !scene.boss?.active) return;

    this.hasHitPlayer = false;
    scene.audioCues?.play?.("laserFire", { volume: 0.34, cooldownMs: 220 });
    scene.cameras.main.shake(120, 0.004);

    const view = scene.cameras.main.worldView;
    const distance = Math.max(view.width, view.height) * 1.75;
    const beamWidth = 20;
    const startAngle = -Math.PI;
    const endAngle = Math.PI;
    const beam = this.trackVisual(scene.add.rectangle(scene.boss.x, scene.boss.y - 28, distance, beamWidth, 0xff3344, 0.62)
      .setName("phase4_radial_sweep")
      .setOrigin(0, 0.5)
      .setDepth(9870)
      .setBlendMode(Phaser.BlendModes.ADD));
    const core = this.trackVisual(scene.add.rectangle(scene.boss.x, scene.boss.y - 28, distance, 6, 0xffffff, 0.84)
      .setName("phase4_radial_sweep_core")
      .setOrigin(0, 0.5)
      .setDepth(9871)
      .setBlendMode(Phaser.BlendModes.ADD));

    scene.tweens.addCounter({
      from: startAngle,
      to: endAngle,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        if (!scene.boss?.active) return;
        const angle = tween.getValue();
        const originX = scene.boss.x;
        const originY = scene.boss.y - 28;
        beam.setPosition(originX, originY).setRotation(angle);
        core.setPosition(originX, originY).setRotation(angle);
        this.applyLineSweepDamage(originX, originY, angle, distance, beamWidth);
      },
      onComplete: () => {
        beam.destroy();
        core.destroy();
      }
    });
  }

  applyLineSweepDamage(originX, originY, angle, distance, beamWidth) {
    const scene = this.scene;
    if (!scene.player?.active || this.hasHitPlayer) return;

    const px = scene.player.x;
    const py = scene.player.y - 12;
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const dx = px - originX;
    const dy = py - originY;
    const projection = dx * vx + dy * vy;
    if (projection < 0 || projection > distance) return;
    const closestX = originX + vx * projection;
    const closestY = originY + vy * projection;
    const dist = Phaser.Math.Distance.Between(px, py, closestX, closestY);

    if (dist <= beamWidth * 0.5 + 18) {
      this.hasHitPlayer = true;
      scene.damagePlayer?.(this.damage);
    }
  }

  computeBeamData(options = {}) {
    const scene = this.scene;
    if (!scene.boss || !scene.boss.active || !scene.player || !scene.player.active) return null;

    const originX = scene.boss.x;
    const originY = scene.boss.y - 24;
    const targetX = scene.player.x;
    const targetY = scene.player.y - 20;
    const angle = typeof options.angleOverride === "number"
      ? options.angleOverride
      : Phaser.Math.Angle.Between(originX, originY, targetX, targetY);
    const view = scene.cameras.main.worldView;
    const maxDistance = Math.max(view.width, view.height) * 1.8;
    const endX = originX + Math.cos(angle) * maxDistance;
    const endY = originY + Math.sin(angle) * maxDistance;

    return { originX, originY, targetX, targetY, angle, distance: maxDistance, endX, endY };
  }

  trackVisual(obj) {
    if (!obj) return obj;
    const tracked = this.scene.trackHostileObject?.(obj) || obj;
    this.activeVisuals.add(tracked);
    return tracked;
  }

  schedule(delay, callback) {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.activeTimers.delete(timer);
      callback();
    });

    this.activeTimers.add(timer);
    return timer;
  }

  trackUpdate(callback) {
    const events = this.scene.events;
    events.on(Phaser.Scenes.Events.UPDATE, callback);
    const cleanup = () => events.off(Phaser.Scenes.Events.UPDATE, callback);
    this.activeUpdateCleanups.add(cleanup);
    return cleanup;
  }

  createWarning(beamData, attachedToBoss = false) {
    const scene = this.scene;
    const centerX = (beamData.originX + beamData.endX) / 2;
    const centerY = (beamData.originY + beamData.endY) / 2;

    const warningLine = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      beamData.distance,
      attachedToBoss ? this.attachedWarningWidth : this.warningWidth,
      0xff3344,
      attachedToBoss ? 0.18 : 0.24
    ))
      .setName("ray_warning_line")
      .setOrigin(0.5)
      .setRotation(beamData.angle)
      .setDepth(60);

    const coreLine = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      beamData.distance,
      5,
      0xffffff,
      attachedToBoss ? 0.38 : 0.52
    ))
      .setName("ray_warning_core")
      .setOrigin(0.5)
      .setRotation(beamData.angle)
      .setDepth(61);

    const updateWarning = () => {
      if (!attachedToBoss || !warningLine.active || !coreLine.active) return;
      const live = this.computeBeamData({ angleOverride: beamData.angle });
      if (!live) return;
      const x = (live.originX + live.endX) / 2;
      const y = (live.originY + live.endY) / 2;
      warningLine.setPosition(x, y).setRotation(live.angle).setSize(live.distance, warningLine.height);
      coreLine.setPosition(x, y).setRotation(live.angle).setSize(live.distance, coreLine.height);
    };

    if (attachedToBoss) this.trackUpdate(updateWarning);

    scene.tweens.add({
      targets: warningLine,
      alpha: attachedToBoss ? 0.68 : 0.9,
      height: (attachedToBoss ? this.attachedWarningWidth : this.warningWidth) + (attachedToBoss ? 12 : 34),
      duration: 130,
      yoyo: true,
      repeat: Math.ceil((attachedToBoss ? this.attachedWarningDuration : this.warningDuration) / 260),
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: coreLine,
      alpha: attachedToBoss ? 0.82 : 1,
      height: attachedToBoss ? 7 : 14,
      duration: 90,
      yoyo: true,
      repeat: Math.ceil((attachedToBoss ? this.attachedWarningDuration : this.warningDuration) / 180),
      ease: "Sine.easeInOut"
    });
  }

  fireBeam(beamData, attachedToBoss = false, beamDuration = this.beamDuration) {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active || scene.gameOver || scene.isPhaseTransitioning) {
      this.endCast();
      return;
    }

    this.hasHitPlayer = false;
    this.damagedTreesThisBeam.clear();
    this.cleanupWarningVisuals();

    const resolved = this.resolveTreeBlock(beamData);

    scene.audioCues?.play?.("laserFire", { volume: attachedToBoss ? 0.34 : 0.56, cooldownMs: 180 });
    scene.cameras.main.flash(attachedToBoss ? 50 : 120, 255, 90, 90);
    scene.cameras.main.shake(attachedToBoss ? 90 : 260, attachedToBoss ? 0.004 : 0.013);
    scene.playBossEnergyEffect(0xff3344, attachedToBoss ? 0.9 : 2.0, 80);

    const beam = this.trackVisual(scene.add.rectangle(
      resolved.centerX,
      resolved.centerY,
      resolved.distance,
      attachedToBoss ? this.attachedBeamWidth : this.beamWidth,
      0xff3344,
      attachedToBoss ? 0.64 : 0.82
    ))
      .setName("ray_beam")
      .setOrigin(0.5)
      .setRotation(resolved.angle)
      .setDepth(68)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamCore = this.trackVisual(scene.add.rectangle(
      resolved.centerX,
      resolved.centerY,
      resolved.distance,
      attachedToBoss ? this.attachedBeamWidth * 0.22 : this.beamWidth * 0.36,
      0xffffff,
      attachedToBoss ? 0.72 : 0.9
    ))
      .setName("ray_beam_core")
      .setOrigin(0.5)
      .setRotation(resolved.angle)
      .setDepth(69)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamEdge = this.trackVisual(scene.add.rectangle(
      resolved.centerX,
      resolved.centerY,
      resolved.distance,
      attachedToBoss ? this.attachedBeamWidth * 1.05 : this.beamWidth * 1.45,
      0xff0000,
      attachedToBoss ? 0.12 : 0.18
    ))
      .setName("ray_beam_edge")
      .setOrigin(0.5)
      .setRotation(resolved.angle)
      .setDepth(67)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.applyBeamDamage(resolved);

    const updateDynamicBeam = () => {
      if (!attachedToBoss || !beam.active || !beamCore.active || !beamEdge.active) return;
      const live = this.computeBeamData({ angleOverride: beamData.angle });
      if (!live) return;
      const next = this.resolveTreeBlock(live);
      for (const obj of [beam, beamCore, beamEdge]) {
        obj.setPosition(next.centerX, next.centerY).setRotation(next.angle).setSize(next.distance, obj.height);
      }
      this.applyBeamDamage(next);
    };

    if (attachedToBoss) this.trackUpdate(updateDynamicBeam);

    scene.tweens.add({
      targets: [beam, beamCore, beamEdge],
      alpha: 0,
      duration: beamDuration,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.destroyVisual(beam);
        this.destroyVisual(beamCore);
        this.destroyVisual(beamEdge);
        this.endCast();
      }
    });

    this.schedule(beamDuration + 90, () => {
      this.destroyVisual(beam);
      this.destroyVisual(beamCore);
      this.destroyVisual(beamEdge);
      this.endCast();
    });
  }

  resolveTreeBlock(beamData) {
    const blockingTree = this.findBlockingTree(beamData.originX, beamData.originY, beamData.endX, beamData.endY);
    let endX = beamData.endX;
    let endY = beamData.endY;
    let distance = beamData.distance;

    if (blockingTree) {
      distance = Math.max(32, Phaser.Math.Distance.Between(beamData.originX, beamData.originY, blockingTree.x, blockingTree.y));
      endX = beamData.originX + Math.cos(beamData.angle) * distance;
      endY = beamData.originY + Math.sin(beamData.angle) * distance;
    }

    return {
      ...beamData,
      endX,
      endY,
      distance,
      blockingTree,
      centerX: (beamData.originX + endX) / 2,
      centerY: (beamData.originY + endY) / 2
    };
  }

  applyBeamDamage(beam) {
    this.damagePlayerOnBeam(beam.originX, beam.originY, beam.endX, beam.endY);
    if (beam.blockingTree && !this.damagedTreesThisBeam.has(beam.blockingTree)) {
      this.damagedTreesThisBeam.add(beam.blockingTree);
      this.damageBlockingTree(beam.blockingTree, beam.endX, beam.endY);
    }
  }

  findBlockingTree(originX, originY, endX, endY) {
    const scene = this.scene;
    if (!scene.findTreeBlockingLine) return null;
    const tree = scene.findTreeBlockingLine(originX, originY, endX, endY);
    if (!tree || !tree.active || !tree.blessingTree) return null;
    return tree;
  }

  damageBlockingTree(tree, x, y) {
    const scene = this.scene;
    if (!tree || !tree.active || !tree.blessingTree) return;

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(x, y, {
        radius: 46,
        color: 0xff3344,
        alpha: 0.8,
        scale: 2.3,
        duration: 240,
        depth: 100
      });
    } else {
      const hit = scene.add.circle(x, y, 32, 0xff3344, 0.52).setDepth(100);
      scene.tweens.add({
        targets: hit,
        scale: 2.2,
        alpha: 0,
        duration: 240,
        ease: "Quad.easeOut",
        onComplete: () => {
          if (hit && hit.active) hit.destroy();
        }
      });
    }

    if (scene.damagePlayerTree) {
      scene.damagePlayerTree(tree, 2);
      return;
    }

    if (scene.damageTreeFromHostile) {
      scene.damageTreeFromHostile(tree, 2);
      return;
    }

    tree.destroy();
  }

  damagePlayerOnBeam(originX, originY, endX, endY) {
    const scene = this.scene;
    if (!scene.player || !scene.player.active || this.hasHitPlayer) return;
    const line = new Phaser.Geom.Line(originX, originY, endX, endY);
    const playerBounds = scene.player.getBounds();
    const hit = Phaser.Geom.Intersects.LineToRectangle(line, playerBounds);
    if (!hit) return;
    this.hasHitPlayer = true;
    scene.damagePlayer(this.damage);
  }

  isWarningVisual(obj) {
    return Boolean(obj?.name && obj.name.startsWith("ray_warning"));
  }

  cleanupWarningVisuals() {
    for (const cleanup of Array.from(this.activeUpdateCleanups)) {
      cleanup();
      this.activeUpdateCleanups.delete(cleanup);
    }

    for (const obj of Array.from(this.activeVisuals)) {
      if (this.isWarningVisual(obj)) this.destroyVisual(obj);
    }
  }

  destroyVisual(obj) {
    if (!obj) return;
    this.activeVisuals.delete(obj);
    try {
      this.scene.tweens?.killTweensOf?.(obj);
    } catch (_error) {
    }
    if (obj.active) obj.destroy();
  }

  cleanup({ endCast = true } = {}) {
    for (const timer of Array.from(this.activeTimers)) {
      try {
        timer?.remove?.(false);
      } catch (_error) {
      }
    }
    this.activeTimers.clear();

    for (const cleanup of Array.from(this.activeUpdateCleanups)) {
      cleanup();
      this.activeUpdateCleanups.delete(cleanup);
    }

    for (const obj of Array.from(this.activeVisuals)) {
      this.destroyVisual(obj);
    }
    this.activeVisuals.clear();
    this.damagedTreesThisBeam.clear();

    if (endCast) this.endCast();
  }

  endCast() {
    if (this.noCastingLock) return;
    const scene = this.scene;
    scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

    if (scene.boss && scene.boss.active) {
      scene.boss.body.allowGravity = false;
      scene.boss.setVelocity(0, 0);

      if (!scene.gameOver && !scene.isPhaseTransitioning && scene.anims.exists("blue_idle_anim")) {
        scene.boss.play("blue_idle_anim", true);
      }
    }
  }
}
