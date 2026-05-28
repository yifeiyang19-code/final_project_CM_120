export default class AnnihilationSlashSkill {
  constructor(scene) {
    this.scene = scene;
  }

  cast() {
    const scene = this.scene;

    if (scene.bossPhase >= 3) {
      this.castBerserk();
      return;
    }

    scene.bossSpeakRandom("annihilationSlash", 2600);
    this.castSingle(0xffffff, 1.0, 0);
  }

  castBerserk() {
    const scene = this.scene;

    
    
    scene.bossSpeakRandom("annihilationSlash", 2600);

    this.castSingle(0xffffff, 1.0, 0);

    scene.time.delayedCall(650, () => {
      if (!scene.gameOver && !scene.isPhaseTransitioning) {
        this.castSingle(0x111111, 0.78, 1);
      }
    });

    scene.time.delayedCall(1300, () => {
      if (!scene.gameOver && !scene.isPhaseTransitioning) {
        this.castSingle(0x000000, 0.68, 2);
      }
    });
  }

  castSingle(tintColor = 0xffffff, alpha = 1.0, offsetIndex = 0) {
    const scene = this.scene;

    if (scene.gameOver || scene.isPhaseTransitioning) return;

    const view = scene.cameras.main.worldView;

    const greenOnRight = scene.player.x < view.centerX;

    const targetX = greenOnRight
      ? scene.player.x + 190 + offsetIndex * 80
      : scene.player.x - 190 - offsetIndex * 80;

    const targetY = Phaser.Math.Clamp(
      scene.player.y - 230,
      view.top + 130,
      view.bottom - 240
    );

    const slashDir = greenOnRight ? -1 : 1;

    const startX = Phaser.Math.Clamp(
      targetX + slashDir * -300,
      view.left + 140,
      view.right - 140
    );

    const startY = view.bottom + 150;

    const green = scene.trackHostileObject?.(scene.add.sprite(startX, startY, "green_fly_up"));
    green.setScale(1.85);
    green.setFlipX(slashDir === -1);
    green.setTint(tintColor);
    green.setAlpha(alpha);
    green.setDepth(22);
    green.play("green_fly_up_anim");

    scene.tweens.add({
      targets: green,
      x: targetX,
      y: targetY,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => {
        if (!green.active || scene.gameOver || scene.isPhaseTransitioning) return;

        green.play("green_warning_anim");

        this.createCrescentWarning(
          green,
          targetX,
          targetY,
          slashDir,
          tintColor,
          alpha
        );
      }
    });
  }

  createCrescentWarning(
    green,
    x,
    y,
    slashDir,
    tintColor = 0xffffff,
    alphaMod = 1.0
  ) {
    const scene = this.scene;

    if (scene.gameOver || scene.isPhaseTransitioning) return;

    const warning = scene.trackHostileObject?.(scene.add.graphics().setDepth(12));

    const slashWidth = 390;
    const slashHeight = 240;

    const slashX = x + slashDir * 130;
    const slashY = y + 130;

    const startAngle = slashDir === 1 ? -70 : 110;
    const endAngle = slashDir === 1 ? 70 : 250;

    const isPrimarySlash = tintColor === 0xffffff;
    const warningColor = isPrimarySlash ? 0x66ff66 : 0x101010;

    const drawWarning = (a) => {
      warning.clear();

      warning.lineStyle(14, warningColor, a * alphaMod);
      warning.beginPath();
      warning.arc(
        slashX,
        slashY,
        185,
        Phaser.Math.DegToRad(startAngle),
        Phaser.Math.DegToRad(endAngle),
        false
      );
      warning.strokePath();

      warning.lineStyle(6, 0xffffff, a * 0.7 * alphaMod);
      warning.beginPath();
      warning.arc(
        slashX,
        slashY,
        145,
        Phaser.Math.DegToRad(startAngle),
        Phaser.Math.DegToRad(endAngle),
        false
      );
      warning.strokePath();
    };

    scene.audioCues?.play?.("annihilationSlashWarning", { volume: 0.58, cooldownMs: 760 });
    scene.time.delayedCall(450, () => {
      if (!scene.gameOver && !scene.isPhaseTransitioning) {
        scene.audioCues?.play?.("annihilationSlashCharge", { volume: 0.62, cooldownMs: 900 });
      }
    });

    drawWarning(0.25);

    scene.tweens.addCounter({
      from: 0.25,
      to: 0.95,
      duration: 190,
      yoyo: true,
      repeat: 8,
      onUpdate: (tween) => {
        if (!warning || !warning.active) return;
        drawWarning(tween.getValue());
      }
    });

    
    const dangerText = null;

    scene.time.delayedCall(1550, () => {
      if (scene.gameOver || scene.isPhaseTransitioning) {
        if (warning && warning.active) warning.destroy();
        if (dangerText && dangerText.active) dangerText.destroy();
        if (green && green.active) green.destroy();
        return;
      }

      if (warning && warning.active) warning.destroy();
      if (dangerText && dangerText.active) dangerText.destroy();

      this.executeSlash(
        green,
        slashX,
        slashY,
        slashDir,
        tintColor,
        alphaMod,
        slashWidth,
        slashHeight
      );
    });
  }

  executeSlash(
    green,
    slashX,
    slashY,
    slashDir,
    tintColor,
    alphaMod,
    slashWidth,
    slashHeight
  ) {
    const scene = this.scene;

    if (scene.gameOver || scene.isPhaseTransitioning) {
      if (green && green.active) green.destroy();
      return;
    }

    scene.audioCues?.play?.("annihilationSlashHit", { volume: 0.72, cooldownMs: 220 });
    scene.time.delayedCall(180, () => {
      if (!scene.gameOver && !scene.isPhaseTransitioning) {
        scene.audioCues?.play?.("annihilationSlashAftershock", { volume: 0.54, cooldownMs: 260 });
      }
    });

    let slash = null;

    if (scene.effects && scene.effects.slash) {
      slash = scene.effects.slash(slashX, slashY, {
        scale: 2.45,
        tint: tintColor,
        alpha: alphaMod,
        flipX: slashDir === -1,
        depth: 13
      });
    } else {
      slash = scene.trackHostileObject?.(scene.add.sprite(slashX, slashY, "Slash_0"));
      slash.setScale(2.45);
      slash.setDepth(13);
      slash.setFlipX(slashDir === -1);
      slash.setTint(tintColor);
      slash.setAlpha(alphaMod);
      slash.play("slash_anim");
      slash.once("animationcomplete", () => slash.destroy());
    }

    scene.cameras.main.shake(
      580,
      tintColor === 0xffffff ? 0.02 : 0.012
    );

    
    
    this.destroyTreesInSlashArea(
      slashX,
      slashY,
      slashWidth,
      slashHeight,
      tintColor
    );

    
    
    
    this.damagePlayerInSlashArea(slashX, slashY, slashWidth, slashHeight, slashDir);
    scene.time.delayedCall(110, () => this.damagePlayerInSlashArea(slashX, slashY, slashWidth, slashHeight, slashDir));
    scene.time.delayedCall(220, () => this.damagePlayerInSlashArea(slashX, slashY, slashWidth, slashHeight, slashDir));

    scene.time.delayedCall(500, () => {
      if (green && green.active) {
        green.destroy();
      }
    });
  }

  damagePlayerInSlashArea(slashX, slashY, slashWidth, slashHeight, slashDir) {
    const scene = this.scene;
    const player = scene.player;

    if (!player || !player.active || !player.body || scene.gameOver || scene.isPhaseTransitioning) return;

    const now = scene.time?.now || 0;
    if (now < (this.lastPlayerSlashDamageAt || 0) + 260) return;

    const body = player.body;
    const playerRect = new Phaser.Geom.Rectangle(
      body.x + 4,
      body.y + 4,
      Math.max(12, body.width - 8),
      Math.max(18, body.height - 8)
    );

    
    
    const slashRect = new Phaser.Geom.Rectangle(
      slashX - slashWidth * 0.6,
      slashY - slashHeight * 0.66,
      slashWidth * 1.2,
      slashHeight * 1.32
    );

    if (!Phaser.Geom.Intersects.RectangleToRectangle(playerRect, slashRect)) return;

    const playerCenterX = playerRect.centerX;
    const directionalSide = slashDir === 1
      ? playerRect.right >= slashX - 96 && playerCenterX >= slashX - slashWidth * 0.28
      : playerRect.left <= slashX + 96 && playerCenterX <= slashX + slashWidth * 0.28;

    if (!directionalSide) return;

    this.lastPlayerSlashDamageAt = now;
    scene.damagePlayer?.(1);
  }

  destroyTreesInSlashArea(slashX, slashY, slashWidth, slashHeight, tintColor) {
    const scene = this.scene;

    if (!scene.playerTrees) return;

    const trees = scene.playerTrees.getChildren();

    const left = slashX - slashWidth / 2;
    const right = slashX + slashWidth / 2;
    const top = slashY - slashHeight / 2;
    const bottom = slashY + slashHeight / 2;

    for (const tree of trees) {
      if (!tree || !tree.active || !tree.blessingTree) continue;

      const treeBounds = tree.getBounds();

      const overlaps =
        treeBounds.right >= left &&
        treeBounds.left <= right &&
        treeBounds.bottom >= top &&
        treeBounds.top <= bottom;

      if (!overlaps) continue;

      this.playTreeCutEffect(tree.x, tree.y, tintColor);

      if (scene.damagePlayerTree) {
        scene.damagePlayerTree(tree, 999);
      } else if (scene.damageTreeFromHostile) {
        scene.damageTreeFromHostile(tree, 999);
      } else {
        tree.destroy();
      }
    }
  }

  playTreeCutEffect(x, y, tintColor = 0xffffff) {
    const scene = this.scene;

    const color = tintColor === 0xffffff ? 0x66ff66 : 0x222222;

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(x, y, {
        radius: 54,
        color,
        alpha: 0.82,
        scale: 2.6,
        duration: 240,
        depth: 110
      });
      return;
    }

    const burst = scene.add.circle(x, y, 34, color, 0.5).setDepth(110);

    scene.tweens.add({
      targets: burst,
      scale: 2.4,
      alpha: 0,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (burst && burst.active) burst.destroy();
      }
    });
  }
}
