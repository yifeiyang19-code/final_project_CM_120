export default class RayOfOblivion {
  constructor(scene) {
    this.scene = scene;

    this.warningDuration = 1150;
    this.beamDuration = 420;
    this.beamWidth = 58;
    this.warningWidth = 22;
    this.damage = 1;

    this.hasHitPlayer = false;
    this.activeVisuals = new Set();
    this.activeTimers = new Set();
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

    
    
    
    this.cleanup();

    scene.bossSpeakRandom("rayOfOblivion", 2200);
    scene.audioCues?.play?.("laserCharge", { volume: 0.46, cooldownMs: 300 });

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;

    const originX = scene.boss.x;
    const originY = scene.boss.y - 24;

    const targetX = scene.player.x;
    const targetY = scene.player.y - 20;

    const angle = Phaser.Math.Angle.Between(
      originX,
      originY,
      targetX,
      targetY
    );

    const view = scene.cameras.main.worldView;
    const maxDistance = Math.max(view.width, view.height) * 1.8;

    const endX = originX + Math.cos(angle) * maxDistance;
    const endY = originY + Math.sin(angle) * maxDistance;

    scene.boss.setFlipX(targetX < originX);

    if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    } else if (scene.anims.exists("blue_idle_anim")) {
      scene.boss.play("blue_idle_anim", true);
    }

    this.createWarning(originX, originY, endX, endY, angle, maxDistance);

    this.schedule(this.warningDuration, () => {
      this.cleanupWarningVisuals();

      if (
        !scene.boss ||
        !scene.boss.active ||
        scene.gameOver ||
        scene.isPhaseTransitioning
      ) {
        this.endCast();
        return;
      }

      this.fireBeam(originX, originY, endX, endY, angle, maxDistance);
    });
  }

  trackVisual(obj) {
    if (!obj) return obj;

    const tracked = this.scene.trackHostileObject?.(obj) || obj;
    this.activeVisuals.add(tracked);
    return tracked;
  }

  schedule(delay, callback) {
    const scene = this.scene;
    const timer = scene.time.delayedCall(delay, () => {
      this.activeTimers.delete(timer);
      callback();
    });

    this.activeTimers.add(timer);
    return timer;
  }

  createWarning(originX, originY, endX, endY, angle, distance) {
    const scene = this.scene;

    const centerX = (originX + endX) / 2;
    const centerY = (originY + endY) / 2;

    const warningLine = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      distance,
      this.warningWidth,
      0xff3344,
      0.24
    ))
      .setName("ray_warning_line")
      .setOrigin(0.5)
      .setRotation(angle)
      .setDepth(60);

    const coreLine = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      distance,
      5,
      0xffffff,
      0.52
    ))
      .setName("ray_warning_core")
      .setOrigin(0.5)
      .setRotation(angle)
      .setDepth(61);

    const labelX = Phaser.Math.Clamp(
      scene.player.x,
      scene.cameras.main.worldView.left + 180,
      scene.cameras.main.worldView.right - 180
    );

    const labelY = Phaser.Math.Clamp(
      scene.player.y - 150,
      scene.cameras.main.worldView.top + 90,
      scene.cameras.main.worldView.bottom - 90
    );


    scene.tweens.add({
      targets: warningLine,
      alpha: 0.9,
      height: this.warningWidth + 34,
      duration: 130,
      yoyo: true,
      repeat: Math.ceil(this.warningDuration / 260),
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: coreLine,
      alpha: 1,
      height: 14,
      duration: 90,
      yoyo: true,
      repeat: Math.ceil(this.warningDuration / 180),
      ease: "Sine.easeInOut"
    });

  }

  fireBeam(originX, originY, endX, endY, angle, distance) {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      this.endCast();
      return;
    }

    this.hasHitPlayer = false;
    this.cleanupWarningVisuals();

    const blockingTree = this.findBlockingTree(originX, originY, endX, endY);

    let finalEndX = endX;
    let finalEndY = endY;
    let finalDistance = distance;

    if (blockingTree) {
      finalDistance = Phaser.Math.Distance.Between(
        originX,
        originY,
        blockingTree.x,
        blockingTree.y
      );

      finalEndX = originX + Math.cos(angle) * finalDistance;
      finalEndY = originY + Math.sin(angle) * finalDistance;
    }

    const centerX = (originX + finalEndX) / 2;
    const centerY = (originY + finalEndY) / 2;

    scene.audioCues?.play?.("laserFire", { volume: 0.56, cooldownMs: 180 });
    scene.cameras.main.flash(120, 255, 90, 90);
    scene.cameras.main.shake(260, 0.013);

    scene.playBossEnergyEffect(0xff3344, 2.0, 80);

    const beam = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      finalDistance,
      this.beamWidth,
      0xff3344,
      0.82
    ))
      .setName("ray_beam")
      .setOrigin(0.5)
      .setRotation(angle)
      .setDepth(68)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamCore = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      finalDistance,
      this.beamWidth * 0.36,
      0xffffff,
      0.9
    ))
      .setName("ray_beam_core")
      .setOrigin(0.5)
      .setRotation(angle)
      .setDepth(69)
      .setBlendMode(Phaser.BlendModes.ADD);

    
    
    const beamEdge = this.trackVisual(scene.add.rectangle(
      centerX,
      centerY,
      finalDistance,
      this.beamWidth * 1.45,
      0xff0000,
      0.18
    ))
      .setName("ray_beam_edge")
      .setOrigin(0.5)
      .setRotation(angle)
      .setDepth(67)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.damagePlayerOnBeam(originX, originY, finalEndX, finalEndY);

    if (blockingTree) {
      this.damageBlockingTree(blockingTree, finalEndX, finalEndY);
    }

    scene.tweens.add({
      targets: [beam, beamCore, beamEdge],
      alpha: 0,
      duration: this.beamDuration,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.destroyVisual(beam);
        this.destroyVisual(beamCore);
        this.destroyVisual(beamEdge);
        this.endCast();
      }
    });

    
    this.schedule(this.beamDuration + 90, () => {
      this.destroyVisual(beam);
      this.destroyVisual(beamCore);
      this.destroyVisual(beamEdge);
      this.endCast();
    });
  }

  findBlockingTree(originX, originY, endX, endY) {
    const scene = this.scene;

    if (!scene.findTreeBlockingLine) {
      return null;
    }

    const tree = scene.findTreeBlockingLine(originX, originY, endX, endY);

    if (!tree || !tree.active || !tree.blessingTree) {
      return null;
    }

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
    for (const obj of Array.from(this.activeVisuals)) {
      if (this.isWarningVisual(obj)) {
        this.destroyVisual(obj);
      }
    }
  }

  destroyVisual(obj) {
    if (!obj) return;

    this.activeVisuals.delete(obj);

    try {
      this.scene.tweens?.killTweensOf?.(obj);
    } catch (_error) {
      
    }

    if (obj.active) {
      obj.destroy();
    }
  }

  cleanup({ endCast = true } = {}) {
    for (const timer of Array.from(this.activeTimers)) {
      try {
        timer?.remove?.(false);
      } catch (_error) {
        
      }
    }
    this.activeTimers.clear();

    for (const obj of Array.from(this.activeVisuals)) {
      this.destroyVisual(obj);
    }
    this.activeVisuals.clear();

    if (endCast) {
      this.endCast();
    }
  }

  endCast() {
    const scene = this.scene;

    scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

    if (scene.boss && scene.boss.active) {
      scene.boss.body.allowGravity = false;
      scene.boss.setVelocity(0, 0);

      if (!scene.gameOver && !scene.isPhaseTransitioning) {
        if (scene.anims.exists("blue_idle_anim")) {
          scene.boss.play("blue_idle_anim", true);
        }
      }
    }
  }
}
