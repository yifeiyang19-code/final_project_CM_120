export default class EffectManager {
  constructor(scene) {
    this.scene = scene;
  }

  screenImpact({
    shakeDuration = 450,
    shakeIntensity = 0.012,
    flashDuration = 160,
    flashColor = [255, 120, 255]
  } = {}) {
    const cam = this.scene.cameras.main;
    cam.flash(flashDuration, flashColor[0], flashColor[1], flashColor[2]);
    cam.shake(shakeDuration, shakeIntensity);
  }

  blinkFlash(x, y, color = 0x7df9ff) {
    const flash = this.scene.add.circle(x, y, 34, color, 0.7).setDepth(60);

    this.scene.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (flash && flash.active) {
          flash.destroy();
        }
      }
    });

    return flash;
  }

  impactCircle(x, y, {
    radius = 48,
    color = 0xff88ff,
    alpha = 0.95,
    scale = 3.2,
    duration = 320,
    depth = 20
  } = {}) {
    const impact = this.scene.add.circle(x, y, radius, color, alpha)
      .setDepth(depth);

    this.scene.tweens.add({
      targets: impact,
      scale,
      alpha: 0,
      duration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (impact && impact.active) {
          impact.destroy();
        }
      }
    });

    return impact;
  }

  afterimage(target, {
  alpha = 0.85,
  tint = 0xff3344,
  duration = 520,
  depth = 1500,
  scaleMultiplier = 1.12,
  blendMode = Phaser.BlendModes.NORMAL
} = {}) {
  if (!target || !target.active || !target.texture) {
    return null;
  }

  const textureKey = target.texture.key;
  const frameName = target.frame && target.frame.name !== undefined
    ? target.frame.name
    : undefined;

  const ghost = this.scene.add.sprite(target.x, target.y, textureKey);

  if (frameName !== undefined && ghost.setFrame) {
    try {
      ghost.setFrame(frameName);
    } catch (e) {
      console.warn("afterimage setFrame failed:", frameName, e);
    }
  }

  ghost.setOrigin(target.originX ?? 0.5, target.originY ?? 0.5);
  ghost.setDisplaySize(
    target.displayWidth * scaleMultiplier,
    target.displayHeight * scaleMultiplier
  );

  ghost.setFlipX(target.flipX);
  ghost.setFlipY(target.flipY);
  ghost.setRotation(target.rotation || 0);
  ghost.setAlpha(alpha);
  ghost.setTintFill(tint);
  ghost.setDepth(depth);
  ghost.setBlendMode(blendMode);

  this.scene.tweens.add({
    targets: ghost,
    alpha: 0,
    scaleX: ghost.scaleX * 1.18,
    scaleY: ghost.scaleY * 1.18,
    duration,
    ease: "Cubic.easeOut",
    onComplete: () => {
      if (ghost && ghost.active) {
        ghost.destroy();
      }
    }
  });

  return ghost;
}

  getSafeFrameName(target) {
    if (!target || !target.frame) {
      return undefined;
    }

    const frame = target.frame;

    if (frame.name !== undefined && frame.name !== null) {
      return frame.name;
    }

    if (frame.textureFrame !== undefined && frame.textureFrame !== null) {
      return frame.textureFrame;
    }

    return undefined;
  }

  debugAfterimage(target) {
    return this.afterimage(target, {
      alpha: 1,
      tint: 0xffffff,
      duration: 1000,
      depth: 130,
      scaleMultiplier: 1.18,
      blendMode: Phaser.BlendModes.ADD
    });
  }

  purgeWarningLine(y, {
    color = 0xff3355,
    alpha = 0.85,
    duration = 900,
    thickness = 6,
    depth = 75
  } = {}) {
    const cam = this.scene.cameras.main;

    const line = this.scene.add.rectangle(
      cam.scrollX + cam.width / 2,
      y,
      cam.width + 260,
      thickness,
      color,
      alpha
    );

    line.setDepth(depth);
    line.setScrollFactor(1);

    this.scene.tweens.add({
      targets: line,
      alpha: 0.15,
      height: thickness * 2.2,
      duration: 140,
      yoyo: true,
      repeat: Math.floor(duration / 280),
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (line && line.active) {
          line.destroy();
        }
      }
    });

    return line;
  }

  purgeExplosion(x, y, {
    big = false,
    scale = 1.9,
    tint = null,
    depth = 66,
    shake = true
  } = {}) {
    const textureKey = big ? "purge_big_blast" : "purge_blast";
    const animKey = big ? "purge_big_blast_anim" : "purge_blast_anim";

    if (!this.scene.anims.exists(animKey)) {
      return this.impactCircle(x, y, {
        radius: big ? 70 : 52,
        color: 0xff7755,
        alpha: 0.9,
        scale: big ? 3.6 : 2.8,
        duration: 300,
        depth
      });
    }

    const blast = this.scene.add.sprite(x, y, textureKey);

    blast.setScale(scale);
    blast.setDepth(depth);

    if (tint !== null) {
      blast.setTint(tint);
    }

    blast.play(animKey);

    blast.once("animationcomplete", () => {
      if (blast && blast.active) {
        blast.destroy();
      }
    });

    if (shake) {
      this.screenImpact({
        shakeDuration: big ? 300 : 180,
        shakeIntensity: big ? 0.008 : 0.004,
        flashDuration: big ? 100 : 60,
        flashColor: big ? [255, 160, 90] : [255, 120, 80]
      });
    }

    return blast;
  }

  purgeBombWarning(x, y, {
    radius = 42,
    color = 0xff3344,
    duration = 520,
    depth = 50
  } = {}) {
    const ring = this.scene.add.circle(x, y, radius)
      .setDepth(depth);

    ring.setStrokeStyle(4, color, 0.85);

    this.scene.tweens.add({
      targets: ring,
      scale: 1.45,
      alpha: 0,
      duration,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (ring && ring.active) {
          ring.destroy();
        }
      }
    });

    return ring;
  }

  explosion(x, y, {
    scale = 3.3,
    tint = 0xbb55ff,
    yOffset = -190,
    depth = 19
  } = {}) {
    const explosion = this.scene.add.sprite(x, y + yOffset, "Explosion_0");

    explosion.setScale(scale);
    explosion.setTint(tint);
    explosion.setDepth(depth);
    explosion.play("explosion_anim");

    explosion.once("animationcomplete", () => {
      if (explosion && explosion.active) {
        explosion.destroy();
      }
    });

    return explosion;
  }

  slash(x, y, {
    scale = 2.45,
    tint = 0xffffff,
    alpha = 1,
    flipX = false,
    depth = 13
  } = {}) {
    const slash = this.scene.add.sprite(x, y, "Slash_0");

    slash.setScale(scale);
    slash.setDepth(depth);
    slash.setFlipX(flipX);
    slash.setTint(tint);
    slash.setAlpha(alpha);
    slash.play("slash_anim");

    slash.once("animationcomplete", () => {
      if (slash && slash.active) {
        slash.destroy();
      }
    });

    return slash;
  }

  bossEnergy(boss, color = 0x7df9ff, scale = 2.0, depth = 70) {
    if (!boss || !boss.active) return null;

    if (!this.scene.anims.exists("boss_attack2_effect_anim")) {
      return null;
    }

    const effect = this.scene.add.sprite(
      boss.x,
      boss.y - 35,
      "boss_attack2_effect"
    );

    effect.setScale(scale);
    effect.setDepth(depth);
    effect.setTint(color);
    effect.play("boss_attack2_effect_anim");

    effect.once("animationcomplete", () => {
      if (effect && effect.active) {
        effect.destroy();
      }
    });

    return effect;
  }

  deathPulse(x, y, color, index = 0) {
    const pulseCount = 3;

    for (let i = 0; i < pulseCount; i++) {
      const ring = this.scene.add.circle(x, y, 60)
        .setDepth(90 + i);

      ring.setStrokeStyle(8 - i * 2, color, 0.95 - i * 0.18);

      this.scene.tweens.add({
        targets: ring,
        scale: 4.2 + index * 0.9 + i * 1.1,
        alpha: 0,
        duration: 950 + i * 170,
        delay: i * 120,
        ease: "Cubic.easeOut",
        onComplete: () => {
          if (ring && ring.active) {
            ring.destroy();
          }
        }
      });
    }

    const core = this.scene.add.circle(x, y, 42, color, 0.55)
      .setDepth(89);

    this.scene.tweens.add({
      targets: core,
      scale: 2.8,
      alpha: 0,
      duration: 780,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (core && core.active) {
          core.destroy();
        }
      }
    });
  }
}
