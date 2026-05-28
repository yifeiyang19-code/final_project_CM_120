export default class DestructionBlastSkill {
  constructor(scene) {
    this.scene = scene;

    
    
    this.treeBlockPadding = 36;
  }

  cast() {
    const scene = this.scene;

    if (scene.bossPhase >= 3) {
      this.castBerserk();
      return;
    }

    scene.bossSpeakRandom("destructionBlast", 2600);
    this.castSingle(false, 0);
  }

  castBerserk() {
    const scene = this.scene;

    
    
    scene.bossSpeakRandom("destructionBlast", 2600);

    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 760, () => {
        if (!scene.gameOver && !scene.isPhaseTransitioning) {
          this.castSingle(true, i);
        }
      });
    }
  }

  castSingle(angled = false, index = 0) {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const view = cam.worldView;

    const fromLeft = angled
      ? Phaser.Math.Between(0, 1) === 0
      : scene.player.x >= view.centerX;

    const spawnX = fromLeft ? view.left + 150 : view.right - 150;

    const spawnY = angled
      ? Phaser.Math.Clamp(
          scene.player.y + Phaser.Math.Between(-260, 180),
          view.top + 120,
          view.bottom - 130
        )
      : Phaser.Math.Clamp(
          scene.player.y - 20,
          view.top + 130,
          view.bottom - 130
        );

    const targetX = angled
      ? scene.player.x
      : fromLeft
        ? view.right - 70
        : view.left + 70;

    const targetY = angled
      ? scene.player.y - 20
      : spawnY;

    const angle = Phaser.Math.Angle.Between(
      spawnX,
      spawnY,
      targetX,
      targetY
    );

    const distance = Phaser.Math.Distance.Between(
      spawnX,
      spawnY,
      targetX,
      targetY
    );

    const purple = scene.trackHostileObject?.(scene.add.sprite(spawnX, spawnY, "purple_idle"));
    purple.setScale(1.8);
    purple.setFlipX(!fromLeft);
    purple.setDepth(20);
    purple.play("purple_idle_anim");

    const warningLine = scene.trackHostileObject?.(scene.add.rectangle(
      (spawnX + targetX) / 2,
      (spawnY + targetY) / 2,
      distance,
      24,
      0x7a1f55,
      0.24
    ));

    warningLine.setRotation(angle);
    warningLine.setDepth(15);

    
    const chargeText = null;

    const chargeTime = angled ? 1450 : 2400;
    scene.audioCues?.play?.("destructionBlastCharge", { volume: 0.42, cooldownMs: 320 });

    scene.tweens.add({
      targets: warningLine,
      height: angled ? 74 : 86,
      alpha: 1,
      duration: chargeTime,
      ease: "Sine.easeInOut"
    });

    scene.tweens.add({
      targets: warningLine,
      fillAlpha: 0.72,
      duration: 180,
      yoyo: true,
      repeat: Math.max(2, Math.floor(chargeTime / 360)),
      ease: "Sine.easeInOut"
    });

    scene.time.delayedCall(chargeTime, () => {
      if (!purple.active || scene.gameOver || scene.isPhaseTransitioning) return;

      if (warningLine && warningLine.active) warningLine.destroy();
      if (chargeText && chargeText.active) chargeText.destroy();

      purple.play("purple_attack_anim");

      scene.audioCues?.play?.("destructionBlastFire", { volume: 0.56, cooldownMs: 220 });
      scene.cameras.main.flash(130, 255, 120, 255);
      scene.cameras.main.shake(330, 0.012);

      const blockInfo = this.resolveBlastTreeBlock(
        spawnX,
        spawnY,
        targetX,
        targetY,
        angle
      );

      const finalX = blockInfo.blocked ? blockInfo.x : targetX;
      const finalY = blockInfo.blocked ? blockInfo.y : targetY;
      const blockedTree = blockInfo.tree;

      const blast = scene.trackHostileObject?.(scene.add.sprite(spawnX, spawnY, "purple_bullet"));
      blast.setScale(2.7, 1.05);
      blast.setRotation(angle);
      blast.play("purple_bullet_anim");
      blast.setDepth(18);

      scene.tweens.add({
        targets: blast,
        x: finalX,
        y: finalY,
        duration: angled ? 470 : 520,
        ease: "Quad.easeOut",
        onUpdate: () => {
          this.damagePlayerAlongBlastPath(spawnX, spawnY, blast.x, blast.y, angled ? 62 : 72);
        },
        onComplete: () => {
          this.damagePlayerAlongBlastPath(spawnX, spawnY, finalX, finalY, angled ? 72 : 86);
          if (blockInfo.blocked) {
            this.destroyTreeByBlast(blockedTree, finalX, finalY);
          } else {
            this.createExplosionAndFragments(
              targetX,
              targetY,
              fromLeft ? 1 : -1
            );
          }

          if (blast && blast.active) {
            blast.destroy();
          }

          scene.time.delayedCall(350, () => {
            if (purple && purple.active) purple.destroy();
          });
        }
      });
    });
  }

  damagePlayerAlongBlastPath(x1, y1, x2, y2, radius = 72) {
    const scene = this.scene;
    const player = scene.player;

    if (!player || !player.active || !player.body || scene.gameOver) return;

    const now = scene.time?.now || 0;
    if (now < (this.lastPathDamageAt || 0) + 210) return;

    const body = player.body;
    const px = body.center?.x ?? player.x;
    const py = body.center?.y ?? player.y;
    const distance = this.distancePointToSegment(px, py, x1, y1, x2, y2);

    const playerRadius = Math.max(body.width || 34, body.height || 70) * 0.35;
    if (distance <= radius + playerRadius) {
      this.lastPathDamageAt = now;
      scene.damagePlayer?.(1);
    }
  }

  distancePointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq <= 0.0001) {
      return Phaser.Math.Distance.Between(px, py, x1, y1);
    }

    const t = Phaser.Math.Clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    return Phaser.Math.Distance.Between(px, py, cx, cy);
  }

  resolveBlastTreeBlock(spawnX, spawnY, targetX, targetY, angle) {
    const scene = this.scene;

    if (!scene.findTreeBlockingLine) {
      return {
        blocked: false,
        x: targetX,
        y: targetY,
        tree: null
      };
    }

    const tree = scene.findTreeBlockingLine(spawnX, spawnY, targetX, targetY);

    if (!tree || !tree.active || !tree.blessingTree) {
      return {
        blocked: false,
        x: targetX,
        y: targetY,
        tree: null
      };
    }

    const distanceToTree = Phaser.Math.Distance.Between(
      spawnX,
      spawnY,
      tree.x,
      tree.y
    );

    const blockedDistance = Phaser.Math.Clamp(
      distanceToTree - this.treeBlockPadding,
      60,
      Phaser.Math.Distance.Between(spawnX, spawnY, targetX, targetY)
    );

    return {
      blocked: true,
      x: spawnX + Math.cos(angle) * blockedDistance,
      y: spawnY + Math.sin(angle) * blockedDistance,
      tree
    };
  }

  destroyTreeByBlast(tree, impactX, impactY) {
    const scene = this.scene;

    this.playTreeBlastBlockEffect(impactX, impactY);

    if (!tree || !tree.active || !tree.blessingTree) {
      return;
    }

    if (scene.damagePlayerTree) {
      scene.damagePlayerTree(tree, 999);
      return;
    }

    if (scene.damageTreeFromHostile) {
      scene.damageTreeFromHostile(tree, 999);
      return;
    }

    tree.destroy();
  }

  playTreeBlastBlockEffect(x, y) {
    const scene = this.scene;

    scene.cameras.main.shake(220, 0.01);

    if (scene.effects && scene.effects.impactCircle) {
      scene.effects.impactCircle(x, y, {
        radius: 56,
        color: 0xff88ff,
        alpha: 0.86,
        scale: 2.2,
        duration: 240,
        depth: 105
      });
      return;
    }

    const burst = scene.add.circle(x, y, 36, 0xff88ff, 0.55).setDepth(105);

    scene.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 240,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (burst && burst.active) burst.destroy();
      }
    });
  }

  createExplosionAndFragments(x, y, direction) {
    const scene = this.scene;

    if (scene.effects) {
      scene.effects.screenImpact({
        shakeDuration: 900,
        shakeIntensity: 0.032,
        flashDuration: 260,
        flashColor: [230, 170, 255]
      });

      scene.effects.impactCircle(x, y);
      scene.effects.explosion(x, y);
    } else {
      scene.cameras.main.shake(900, 0.032);
      scene.cameras.main.flash(260, 230, 170, 255);
    }
  }
}
