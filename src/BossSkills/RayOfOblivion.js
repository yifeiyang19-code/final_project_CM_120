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
    this.currentHorizontalBlockIntervals = [];
    this.currentVerticalBlockIntervals = [];
    this.noCastingLock = false;
    this.phase4ForcedRadialActive = false;
    this.activeSweepTweens = new Set();
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
    scene.audioCues?.play?.("laserCharge", { volume: 0.38, cooldownMs: 400 });

    const steps = [
      {
        label: "EXTREME SLOW SWEEP: LEFT TO RIGHT",
        warning: 1300,
        fire: 5600,
        preview: () => this.createVerticalSweepPreview("right", 1300),
        start: () => this.runVerticalSweep("right", 5600)
      },
      {
        label: "EXTREME SLOW SWEEP: TOP TO BOTTOM",
        warning: 1300,
        fire: 5600,
        preview: () => this.createHorizontalSweepPreview("down", 1300),
        start: () => this.runHorizontalSweep("down", 5600)
      }
    ];

    let offset = 0;
    for (const step of steps) {
      this.schedule(offset, () => {
        step.preview?.();
      });
      this.schedule(offset + step.warning, step.start);
      offset += step.warning + step.fire + 40;
    }
    this.schedule(offset + 120, () => this.endCast());
  }

  startPhase4ScriptedLaserWalls() {
    const scene = this.scene;
    if (scene.gameOver || scene.bossPhase !== 4 || scene.__ultimateFinaleStarted || scene.__phase4LaserWallsStarted) return;
    scene.__phase4LaserWallsStarted = true;

    const first = scene.time.delayedCall(3200, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.runVerticalSweep("right", 8000, { scriptedWall: true });
      }
    });
    const second = scene.time.delayedCall(8200, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.runHorizontalSweep("down", 8000, { scriptedWall: true });
      }
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      first?.remove?.(false);
      second?.remove?.(false);
    });
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

  runHorizontalSweep(direction = "down", duration = 5600, options = {}) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    this.hasHitPlayer = false;
    this.damagedTreesThisBeam.clear();
    this.currentHorizontalBlockIntervals = [];
    scene.audioCues?.play?.("laserFire", { volume: 0.26, cooldownMs: 220 });
    scene.cameras.main.shake(80, 0.0025);

    const view = scene.cameras.main.worldView;
    const startY = direction === "down" ? view.top - 170 : view.bottom + 170;
    const endY = direction === "down" ? view.bottom + 170 : view.top - 170;
    const beamHeight = 18;
    const gapWidth = Math.min(920, Math.max(660, view.width * 0.42));
    const playerX = scene.player?.active ? scene.player.x : view.centerX;
    const gapX = Phaser.Math.Clamp(playerX, view.left + gapWidth * 0.55, view.right - gapWidth * 0.55);

    const rawGlow = scene.add.graphics().setName("phase4_horizontal_sweep").setDepth(9870).setBlendMode(Phaser.BlendModes.ADD);
    const rawCore = scene.add.graphics().setName("phase4_horizontal_sweep_core").setDepth(9871).setBlendMode(Phaser.BlendModes.ADD);
    const glow = options.scriptedWall ? rawGlow : this.trackVisual(rawGlow);
    const core = options.scriptedWall ? rawCore : this.trackVisual(rawCore);

    const sweepTween = scene.tweens.addCounter({
      from: startY,
      to: endY,
      duration,
      ease: "Linear",
      onUpdate: (tween) => {
        if (scene.gameOver) return;
        const y = tween.getValue();
        this.drawHorizontalSweepSegments(glow, core, y, beamHeight, gapX, gapWidth);
        this.destroyTreesCrossedByHorizontalSweep(y, beamHeight);
        this.applyHorizontalSweepDamage(y, beamHeight, gapX, gapWidth);
      },
      onComplete: () => {
        this.activeSweepTweens?.delete?.(sweepTween);
        this.currentHorizontalBlockIntervals = [];
        this.destroyVisual(glow);
        this.destroyVisual(core);
      }
    });
    this.activeSweepTweens?.add?.(sweepTween);
  }


  drawHorizontalSweepSegments(glow, core, y, beamHeight, gapX, gapWidth) {
    const scene = this.scene;
    const view = scene.cameras.main.worldView;
    const intervals = [
      { start: gapX - gapWidth * 0.5, end: gapX + gapWidth * 0.5 }
    ];

    this.currentHorizontalBlockIntervals = intervals;
    this.drawHorizontalIntervals(glow, core, y, beamHeight, view.left, view.right, intervals);
  }


  drawHorizontalIntervals(glow, core, y, beamHeight, left, right, blockers) {
    if (!glow?.active || !core?.active) return;
    glow.clear();
    core.clear();
    const blocked = blockers
      .map((b) => ({ start: Phaser.Math.Clamp(Math.min(b.start, b.end), left, right), end: Phaser.Math.Clamp(Math.max(b.start, b.end), left, right) }))
      .filter((b) => b.end - b.start > 2)
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const b of blocked) {
      const last = merged[merged.length - 1];
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else merged.push({ ...b });
    }

    let cursor = left;
    for (const b of merged) {
      if (b.start > cursor + 4) this.drawHorizontalBeamPart(glow, core, cursor, b.start, y, beamHeight);
      cursor = Math.max(cursor, b.end);
    }
    if (right > cursor + 4) this.drawHorizontalBeamPart(glow, core, cursor, right, y, beamHeight);
  }

  drawHorizontalBeamPart(glow, core, startX, endX, y, beamHeight) {
    const width = endX - startX;
    const centerX = startX + width * 0.5;
    glow.fillStyle(0xff2233, 0.72);
    glow.fillRect(centerX - width * 0.5, y - beamHeight * 0.5, width, beamHeight);
    core.fillStyle(0xffffff, 0.94);
    core.fillRect(centerX - width * 0.5, y - 4, width, 8);
  }

  applyHorizontalSweepDamage(y, beamHeight, gapX = null, gapWidth = 0) {
    const scene = this.scene;
    if (scene.gameOver || !scene.player?.active || this.hasHitPlayer) return;
    if (gapX !== null && Math.abs(scene.player.x - gapX) <= gapWidth * 0.5 + 18) return;
    if (Math.abs(scene.player.y - y) <= beamHeight * 0.5 + 20) {
      if (this.currentHorizontalBlockIntervals.some((b) => scene.player.x >= b.start - 18 && scene.player.x <= b.end + 18)) return;
      this.hasHitPlayer = true;
      this.damagePlayerFromRay();
    }
  }

  runVerticalSweep(direction = "right", duration = 5600, options = {}) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning) return;

    this.hasHitPlayer = false;
    this.damagedTreesThisBeam.clear();
    this.currentVerticalBlockIntervals = [];
    scene.audioCues?.play?.("laserFire", { volume: 0.26, cooldownMs: 220 });
    scene.cameras.main.shake(80, 0.0025);

    const view = scene.cameras.main.worldView;
    const startX = direction === "right" ? view.left - 210 : view.right + 210;
    const endX = direction === "right" ? view.right + 210 : view.left - 210;
    const beamWidth = 18;
    const gapHeight = Math.min(760, Math.max(560, view.height * 0.46));
    const playerY = scene.player?.active ? scene.player.y : view.centerY;
    const gapY = Phaser.Math.Clamp(playerY, view.top + gapHeight * 0.55, view.bottom - gapHeight * 0.55);

    const rawGlow = scene.add.graphics().setName("phase4_vertical_sweep").setDepth(9870).setBlendMode(Phaser.BlendModes.ADD);
    const rawCore = scene.add.graphics().setName("phase4_vertical_sweep_core").setDepth(9871).setBlendMode(Phaser.BlendModes.ADD);
    const glow = options.scriptedWall ? rawGlow : this.trackVisual(rawGlow);
    const core = options.scriptedWall ? rawCore : this.trackVisual(rawCore);

    const sweepTween = scene.tweens.addCounter({
      from: startX,
      to: endX,
      duration,
      ease: "Linear",
      onUpdate: (tween) => {
        if (scene.gameOver) return;
        const x = tween.getValue();
        this.drawVerticalSweepSegments(glow, core, x, beamWidth, gapY, gapHeight);
        this.destroyTreesCrossedByVerticalSweep(x, beamWidth);
        this.applyVerticalSweepDamage(x, beamWidth, gapY, gapHeight);
      },
      onComplete: () => {
        this.activeSweepTweens?.delete?.(sweepTween);
        this.currentVerticalBlockIntervals = [];
        this.destroyVisual(glow);
        this.destroyVisual(core);
      }
    });
    this.activeSweepTweens?.add?.(sweepTween);
  }


  drawVerticalSweepSegments(glow, core, x, beamWidth, gapY, gapHeight) {
    const scene = this.scene;
    const view = scene.cameras.main.worldView;
    const intervals = [
      { start: gapY - gapHeight * 0.5, end: gapY + gapHeight * 0.5 }
    ];

    this.currentVerticalBlockIntervals = intervals;
    this.drawVerticalIntervals(glow, core, x, beamWidth, view.top, view.bottom, intervals);
  }


  drawVerticalIntervals(glow, core, x, beamWidth, top, bottom, blockers) {
    if (!glow?.active || !core?.active) return;
    glow.clear();
    core.clear();
    const blocked = blockers
      .map((b) => ({ start: Phaser.Math.Clamp(Math.min(b.start, b.end), top, bottom), end: Phaser.Math.Clamp(Math.max(b.start, b.end), top, bottom) }))
      .filter((b) => b.end - b.start > 2)
      .sort((a, b) => a.start - b.start);

    const merged = [];
    for (const b of blocked) {
      const last = merged[merged.length - 1];
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else merged.push({ ...b });
    }

    let cursor = top;
    for (const b of merged) {
      if (b.start > cursor + 4) this.drawVerticalBeamPart(glow, core, x, beamWidth, cursor, b.start);
      cursor = Math.max(cursor, b.end);
    }
    if (bottom > cursor + 4) this.drawVerticalBeamPart(glow, core, x, beamWidth, cursor, bottom);
  }

  drawVerticalBeamPart(glow, core, x, beamWidth, startY, endY) {
    const height = endY - startY;
    const centerY = startY + height * 0.5;
    glow.fillStyle(0xff2233, 0.72);
    glow.fillRect(x - beamWidth * 0.5, centerY - height * 0.5, beamWidth, height);
    core.fillStyle(0xffffff, 0.94);
    core.fillRect(x - 4, centerY - height * 0.5, 8, height);
  }

  applyVerticalSweepDamage(x, beamWidth, gapY = null, gapHeight = 0) {
    const scene = this.scene;
    if (scene.gameOver || !scene.player?.active || this.hasHitPlayer) return;
    if (gapY !== null && Math.abs(scene.player.y - gapY) <= gapHeight * 0.5 + 18) return;
    if (Math.abs(scene.player.x - x) <= beamWidth * 0.5 + 20) {
      if (this.currentVerticalBlockIntervals.some((b) => scene.player.y >= b.start - 18 && scene.player.y <= b.end + 18)) return;
      this.hasHitPlayer = true;
      this.damagePlayerFromRay();
    }
  }

  runRadialSweep(duration = 12000, options = {}) {
    const scene = this.scene;
    if (scene.gameOver || scene.isPhaseTransitioning || !scene.boss?.active) return;

    this.hasHitPlayer = false;
    this.damagedTreesThisBeam.clear();
    const protectedSweep = options.protectedSweep === true;
    if (protectedSweep) this.phase4ForcedRadialActive = true;
    const lockedCenterX = protectedSweep ? scene.cameras.main.worldView.centerX : null;
    const lockedCenterY = protectedSweep ? Phaser.Math.Clamp(scene.cameras.main.worldView.centerY - 80, scene.cameras.main.worldView.top + 150, scene.cameras.main.worldView.bottom - 180) : null;
    if (protectedSweep && scene.boss?.active) {
      scene.tweens.killTweensOf(scene.boss);
      scene.boss.setVelocity(0, 0);
      scene.boss.setPosition(lockedCenterX, lockedCenterY);
    }
    scene.audioCues?.play?.("laserFire", { volume: 0.28, cooldownMs: 220 });
    scene.cameras.main.shake(90, 0.0025);

    const view = scene.cameras.main.worldView;
    const distance = Math.max(view.width, view.height) * 1.85;
    const beamWidth = 16;
    const startAngle = -Math.PI;
    const endAngle = Math.PI;
    const rawGlow = scene.add.graphics().setName("phase4_radial_sweep").setDepth(9870).setBlendMode(Phaser.BlendModes.ADD);
    const rawCore = scene.add.graphics().setName("phase4_radial_sweep_core").setDepth(9871).setBlendMode(Phaser.BlendModes.ADD);
    const glow = protectedSweep ? rawGlow : this.trackVisual(rawGlow);
    const core = protectedSweep ? rawCore : this.trackVisual(rawCore);

    const sweepTween = scene.tweens.addCounter({
      from: startAngle,
      to: endAngle,
      duration,
      ease: "Linear",
      onUpdate: (tween) => {
        if (scene.gameOver || !scene.boss?.active) return;
        const angle = tween.getValue();
        if (protectedSweep && scene.boss?.active) {
          scene.boss.setVelocity(0, 0);
          scene.boss.setPosition(lockedCenterX, lockedCenterY);
        }
        const originX = protectedSweep ? lockedCenterX : scene.boss.x;
        const originY = (protectedSweep ? lockedCenterY : scene.boss.y) - 28;
        this.destroyTreesCrossedByLineSweep(originX, originY, angle, distance, beamWidth);
        this.drawRadialSweepLine(glow, core, originX, originY, angle, distance, beamWidth);
        this.applyLineSweepDamage(originX, originY, angle, distance, beamWidth, null);
      },
      onComplete: () => {
        this.activeSweepTweens?.delete?.(sweepTween);
        if (protectedSweep) {
          glow?.destroy?.();
          core?.destroy?.();
          this.phase4ForcedRadialActive = false;
        } else {
          this.destroyVisual(glow);
          this.destroyVisual(core);
        }
      }
    });
    this.activeSweepTweens?.add?.(sweepTween);
  }


  drawRadialSweepLine(glow, core, originX, originY, angle, distance, beamWidth) {
    if (!glow?.active || !core?.active) return;
    const endX = originX + Math.cos(angle) * distance;
    const endY = originY + Math.sin(angle) * distance;
    glow.clear();
    core.clear();
    glow.lineStyle(beamWidth, 0xff3344, 0.62);
    glow.beginPath();
    glow.moveTo(originX, originY);
    glow.lineTo(endX, endY);
    glow.strokePath();
    core.lineStyle(6, 0xffffff, 0.84);
    core.beginPath();
    core.moveTo(originX, originY);
    core.lineTo(endX, endY);
    core.strokePath();
  }

  applyLineSweepDamage(originX, originY, angle, distance, beamWidth, blockingTree = null) {
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
    if (blockingTree && blockingTree.distance <= projection + 48) return;
    const closestX = originX + vx * projection;
    const closestY = originY + vy * projection;
    const dist = Phaser.Math.Distance.Between(px, py, closestX, closestY);

    if (dist <= beamWidth * 0.5 + 18) {
      this.hasHitPlayer = true;
      this.damagePlayerFromRay();
    }
  }

  findNearestSweepLineTree(originX, originY, angle, distance, beamWidth, destroyOnHit = false) {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const endX = originX + vx * distance;
    const endY = originY + vy * distance;
    const beamLine = new Phaser.Geom.Line(originX, originY, endX, endY);
    let nearest = null;

    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 76 + beamWidth, 92 + beamWidth);
      if (!bounds) continue;
      if (!Phaser.Geom.Intersects.LineToRectangle(beamLine, bounds)) continue;
      const dx = bounds.centerX - originX;
      const dy = bounds.centerY - originY;
      const projection = dx * vx + dy * vy;
      if (projection < 0 || projection > distance) continue;
      if (!nearest || projection < nearest.distance) nearest = { tree, distance: projection, bounds };
    }

    if (nearest && destroyOnHit) this.destroyTreeFromSweep(nearest.tree, nearest.bounds.centerX, nearest.bounds.centerY);
    return nearest;
  }

  startPhase4OpeningRadialSweep() {
    const scene = this.scene;
    if (scene.gameOver || scene.bossPhase !== 4 || scene.__ultimateFinaleStarted || this.__phase4OpeningRadialStarted) return;
    this.__phase4OpeningRadialStarted = true;
    this.phase4ForcedRadialActive = true;
    const timer = scene.time.delayedCall(120, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.runRadialSweep(17000, { protectedSweep: true });
      }
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => timer?.remove?.(false));
  }

  createSweepBorderFlash(kind = "sweep", duration = 3000) {
    const scene = this.scene;
    const camera = scene.cameras?.main;
    const flash = { alpha: 0.08 };
    const border = this.trackVisual(scene.add.graphics()
      .setName(`phase4_sweep_border_${kind}`)
      .setScrollFactor(0)
      .setDepth(9998));

    const draw = () => {
      if (!border?.active) return;
      const width = camera?.width || scene.scale?.width || 1280;
      const height = camera?.height || scene.scale?.height || 720;
      const inset = 6;
      border.clear();
      border.lineStyle(12, 0xff1a1a, Phaser.Math.Clamp(flash.alpha, 0, 0.42));
      border.strokeRect(inset, inset, Math.max(1, width - inset * 2), Math.max(1, height - inset * 2));
      border.lineStyle(4, 0xffffff, Phaser.Math.Clamp(flash.alpha * 0.85, 0, 0.25));
      border.strokeRect(inset + 7, inset + 7, Math.max(1, width - (inset + 7) * 2), Math.max(1, height - (inset + 7) * 2));
    };

    draw();
    scene.tweens.add({
      targets: flash,
      alpha: 0.34,
      duration: 180,
      yoyo: true,
      repeat: Math.max(2, Math.floor(duration / 360)),
      ease: "Sine.easeInOut",
      onUpdate: draw,
      onComplete: () => this.destroyVisual(border)
    });
  }

  destroyTreesCrossedByHorizontalSweep(y, beamHeight) {
    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 54, 72);
      if (!bounds) continue;
      const crossesTree = y >= bounds.top - beamHeight * 0.9 && y <= bounds.bottom + beamHeight * 0.9;
      if (crossesTree) this.destroyTreeFromSweep(tree, bounds.centerX, y);
    }
  }

  destroyTreesCrossedByVerticalSweep(x, beamWidth) {
    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 54, 72);
      if (!bounds) continue;
      const crossesTree = x >= bounds.left - beamWidth * 0.9 && x <= bounds.right + beamWidth * 0.9;
      if (crossesTree) this.destroyTreeFromSweep(tree, x, bounds.centerY);
    }
  }

  destroyTreesCrossedByLineSweep(originX, originY, angle, distance, beamWidth) {
    const vx = Math.cos(angle);
    const vy = Math.sin(angle);
    const endX = originX + vx * distance;
    const endY = originY + vy * distance;
    const beamLine = new Phaser.Geom.Line(originX, originY, endX, endY);

    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 76 + beamWidth, 92 + beamWidth);
      if (!bounds) continue;
      if (!Phaser.Geom.Intersects.LineToRectangle(beamLine, bounds)) continue;
      this.destroyTreeFromSweep(tree, bounds.centerX, bounds.centerY);
    }
  }

  getSweepTreeBounds(tree, inflateX = 40, inflateY = 56) {
    if (!tree || !tree.active || !tree.blessingTree) return null;
    const bounds = this.scene.getTreeBlockBounds?.(tree, inflateX, inflateY) || tree.getBounds?.();
    if (!bounds) return null;
    return new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  damageTreeOnceFromSweep(tree) {
    this.destroyTreeFromSweep(tree);
  }

  destroyTreeFromSweep(tree, x = null, y = null) {
    const scene = this.scene;
    if (!tree || !tree.active || this.damagedTreesThisBeam.has(tree)) return;
    this.damagedTreesThisBeam.add(tree);
    scene.treeBlocksThisRun = (scene.treeBlocksThisRun || 0) + 1;

    const hitX = x ?? tree.x;
    const hitY = y ?? tree.y;
    scene.audioCues?.play?.("treeBreak", { volume: 0.62, cooldownMs: 100 });
    scene.effects?.impactCircle?.(hitX, hitY, {
      radius: 42,
      color: 0xff3344,
      alpha: 0.76,
      scale: 2.1,
      duration: 220,
      depth: 9900
    });

    if (scene.damagePlayerTree) scene.damagePlayerTree(tree, 999);
    else if (scene.damageTreeFromHostile) scene.damageTreeFromHostile(tree, 999);
    else tree.destroy();

    if (tree.active) tree.destroy();
  }

  getSweepBlockingTrees() {
    return (this.scene.playerTrees?.getChildren?.() || []).filter((tree) => tree?.active && tree.blessingTree);
  }

  drawHorizontalTreeBlocks(graphics, y, beamHeight) {
    if (!graphics?.active) return;
    graphics.clear();
    const trees = this.getSweepBlockingTrees();
    for (const tree of trees) {
      const bounds = this.getSweepTreeBounds(tree, 54, 72);
      if (!bounds) continue;
      const crossesTree = y >= bounds.top - beamHeight * 0.8 && y <= bounds.bottom + beamHeight * 0.8;
      if (!crossesTree) continue;
      const padX = 34;
      const h = Math.max(beamHeight * 3.4, 74);
      graphics.fillStyle(0x02080d, 0.94);
      graphics.fillRect(bounds.left - padX, y - h * 0.5, bounds.width + padX * 2, h);
      graphics.lineStyle(3, 0xb8fff8, 0.72);
      graphics.strokeRect(bounds.left - padX, y - h * 0.5, bounds.width + padX * 2, h);
    }
  }

  drawVerticalTreeBlocks(graphics, x, beamWidth) {
    if (!graphics?.active) return;
    graphics.clear();
    const trees = this.getSweepBlockingTrees();
    for (const tree of trees) {
      const bounds = this.getSweepTreeBounds(tree, 54, 72);
      if (!bounds) continue;
      const crossesTree = x >= bounds.left - beamWidth * 0.8 && x <= bounds.right + beamWidth * 0.8;
      if (!crossesTree) continue;
      const padY = 34;
      const w = Math.max(beamWidth * 3.4, 74);
      graphics.fillStyle(0x02080d, 0.94);
      graphics.fillRect(x - w * 0.5, bounds.top - padY, w, bounds.height + padY * 2);
      graphics.lineStyle(3, 0xb8fff8, 0.72);
      graphics.strokeRect(x - w * 0.5, bounds.top - padY, w, bounds.height + padY * 2);
    }
  }

  isPlayerProtectedByHorizontalTree(y, beamHeight) {
    const player = this.scene.player;
    if (!player?.active) return false;
    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 74, 86);
      if (!bounds) continue;
      const verticalMatch = y >= bounds.top - beamHeight - 20 && y <= bounds.bottom + beamHeight + 20;
      const playerInShadow = player.x >= bounds.left - 80 && player.x <= bounds.right + 80;
      if (verticalMatch && playerInShadow) {
        this.damageTreeOnceFromSweep(tree);
        return true;
      }
    }
    return false;
  }

  isPlayerProtectedByVerticalTree(x, beamWidth) {
    const player = this.scene.player;
    if (!player?.active) return false;
    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 74, 86);
      if (!bounds) continue;
      const horizontalMatch = x >= bounds.left - beamWidth - 20 && x <= bounds.right + beamWidth + 20;
      const playerInShadow = player.y >= bounds.top - 80 && player.y <= bounds.bottom + 80;
      if (horizontalMatch && playerInShadow) {
        this.damageTreeOnceFromSweep(tree);
        return true;
      }
    }
    return false;
  }

  isPlayerProtectedByLineTree(originX, originY, playerX, playerY, beamWidth) {
    const beamLine = new Phaser.Geom.Line(originX, originY, playerX, playerY);
    const totalDistance = Phaser.Math.Distance.Between(originX, originY, playerX, playerY);
    for (const tree of this.getSweepBlockingTrees()) {
      const bounds = this.getSweepTreeBounds(tree, 76 + beamWidth, 92 + beamWidth);
      if (!bounds) continue;
      if (!Phaser.Geom.Intersects.LineToRectangle(beamLine, bounds)) continue;
      const treeDistance = Phaser.Math.Distance.Between(originX, originY, bounds.centerX, bounds.centerY);
      if (treeDistance <= totalDistance + 32) {
        this.damageTreeOnceFromSweep(tree);
        return true;
      }
    }
    return false;
  }

  damagePlayerFromRay() {
    const scene = this.scene;
    if (!scene || scene.gameOver) return false;

    const damaged = scene.damagePlayer?.(this.damage);
    if ((scene.playerHp ?? 1) <= 0 || scene.gameOver) {
      this.forceClearPhase4SweepVisuals();
      scene.forceResumeSceneClock?.();
      if (!scene.gameOver) scene.failTrial?.();
    }
    return damaged;
  }


  forceClearPhase4SweepVisuals() {
    const scene = this.scene;
    try {
      for (const tween of Array.from(this.activeSweepTweens || [])) {
        try { tween?.stop?.(); tween?.remove?.(); } catch (_error) {}
      }
      this.activeSweepTweens?.clear?.();
      this.phase4ForcedRadialActive = false;
      this.hasHitPlayer = true;
      scene.children?.list
        ?.filter((obj) => {
          const name = obj?.name || "";
          return name.startsWith("phase4_horizontal_sweep") ||
            name.startsWith("phase4_vertical_sweep") ||
            name.startsWith("phase4_radial_sweep") ||
            name.startsWith("phase4_radial_preview") ||
            name.startsWith("phase4_sweep_tree_block") ||
            name.startsWith("phase4_sweep_border");
        })
        ?.forEach((obj) => {
          scene.tweens?.killTweensOf?.(obj);
          obj.destroy?.();
        });
    } catch (_error) {
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
    this.damagePlayerFromRay();
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
      const name = obj?.name || "";
      if (this.phase4ForcedRadialActive && name.startsWith("phase4_radial_sweep")) continue;
      this.destroyVisual(obj);
    }
    for (const obj of Array.from(this.activeVisuals)) {
      if (!obj?.active) this.activeVisuals.delete(obj);
    }
    this.damagedTreesThisBeam.clear();
    this.currentHorizontalBlockIntervals = [];
    this.currentVerticalBlockIntervals = [];

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
