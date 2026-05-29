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
