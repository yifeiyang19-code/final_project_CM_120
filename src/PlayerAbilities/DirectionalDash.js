export default class DirectionalDash {
  constructor(scene, player, config, flash) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    this.flash = flash;

    this.lastTap = {
      A: -99999,
      D: -99999,
      W: -99999,
      S: -99999
    };

    this.lastDash = {
      horizontal: -99999,
      up: -99999,
      down: -99999
    };

    this.keyWasDown = {
      A: false,
      D: false,
      W: false,
      S: false
    };

    this.isDashing = false;
    this.dashStopPadding = 30;
    this.dashScanStep = 12;
  }

  update() {
    const scene = this.scene;

    this.checkDoubleTap(scene.keyA, "A", -1, 0, "horizontal");
    this.checkDoubleTap(scene.keyD, "D", 1, 0, "horizontal");
    this.checkDoubleTap(scene.keyW, "W", 0, -1, "up");
    this.checkDoubleTap(scene.keyS, "S", 0, 1, "down");
  }

  checkDoubleTap(key, keyName, dirX, dirY, cooldownGroup) {
    if (!key) return;

    const scene = this.scene;
    const isDown = Boolean(key.isDown);
    const rawFreshDown = isDown && !this.keyWasDown[keyName];
    this.keyWasDown[keyName] = isDown;

    const hasSampledState = Boolean(scene.inputState?.dashTap);
    const sampledFreshDown = hasSampledState
      ? Boolean(scene.inputState.dashTap[keyName])
      : false;

    const tappedThisFrame = hasSampledState ? sampledFreshDown : rawFreshDown;

    if (!tappedThisFrame) return;

    const now = scene.time.now;

    const tappedFastEnough =
      now - this.lastTap[keyName] <= this.config.dashDoubleTapWindow;

    this.lastTap[keyName] = now;

    if (!tappedFastEnough) return;

    this.tryDash(dirX, dirY, cooldownGroup);
  }

  tryDash(dirX, dirY, cooldownGroup) {
    const scene = this.scene;
    const player = this.player;
    const now = scene.time.now;

    if (!player || !player.active || !player.body) return false;
    if (now < (scene.gravityMovementLockUntil || scene.gravityDebuffUntil || 0)) return false;
    if (this.isDashing) return false;

    const cooldown = this.getCooldown(cooldownGroup);

    if (now - this.lastDash[cooldownGroup] < cooldown) {
      return false;
    }

    const distance = this.getDashDistance(cooldownGroup);
    const target = this.findSafeDashTarget(dirX, dirY, distance);

    if (!target) return false;

    const movedDistance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);
    const minimumDistance = this.config.dashMinimumMoveDistance ?? 48;
    if (movedDistance < minimumDistance) {
      return false;
    }

    this.lastDash[cooldownGroup] = now;
    this.isDashing = true;
    scene.audioCues?.play?.("playerDash");

    const startX = player.x;
    const startY = player.y;
    const immediateRatio = Phaser.Math.Clamp(
      this.config.dashImmediateRatio ?? 0.38,
      0,
      0.85
    );
    const instantX = Phaser.Math.Linear(startX, target.x, immediateRatio);
    const instantY = Phaser.Math.Linear(startY, target.y, immediateRatio);
    const remainingDuration = Math.max(45, Math.round(this.config.dashDuration * (1 - immediateRatio)));

    player.body.allowGravity = false;
    player.setVelocity(0, 0);

    this.flash(player.x, player.y, 0x99ccff);
    scene.playerGhostTrail?.burst?.(2, 34);

    scene.tweens.killTweensOf(player);

    
    
    
    player.setPosition(instantX, instantY);
    if (player.body) {
      player.body.reset(instantX, instantY);
      player.body.allowGravity = false;
    }

    scene.tweens.add({
      targets: player,
      x: target.x,
      y: target.y,
      duration: remainingDuration,
      ease: "Linear",
      onUpdate: () => {
        scene.playerGhostTrail?.update?.(scene.time.now);
      },
      onComplete: () => {
        if (player && player.active && player.body) {
          player.body.reset(target.x, target.y);
          player.body.allowGravity = true;
          player.setVelocity(0, 0);
        }

        this.isDashing = false;
      }
    });

    return true;
  }

  interrupt() {
    const player = this.player;
    const scene = this.scene;

    if (!this.isDashing) return;

    this.isDashing = false;
    if (player && player.active) {
      scene.tweens.killTweensOf(player);
      if (player.body) {
        player.body.allowGravity = true;
        player.body.reset(player.x, player.y);
        player.setVelocity(0, 0);
      }
    }
  }

  getDashDistance(group) {
    if (group === "up") {
      return this.config.dashDistanceY;
    }

    if (group === "down") {
      return this.config.downDashDistance;
    }

    return this.config.dashDistanceX;
  }

  findSafeDashTarget(dirX, dirY, distance) {
    const scene = this.scene;
    const player = this.player;

    const startX = player.x;
    const startY = player.y;

    let safeX = startX;
    let safeY = startY;

    for (let traveled = this.dashScanStep; traveled <= distance; traveled += this.dashScanStep) {
      const testX = Phaser.Math.Clamp(
        startX + dirX * traveled,
        40,
        scene.map.widthInPixels - 40
      );

      const testY = Phaser.Math.Clamp(
        startY + dirY * traveled,
        40,
        scene.map.heightInPixels - 40
      );

      if (this.wouldHitSolid(testX, testY, dirX, dirY)) {
        const backDistance = Math.max(0, traveled - this.dashStopPadding);

        return {
          x: Phaser.Math.Clamp(
            startX + dirX * backDistance,
            40,
            scene.map.widthInPixels - 40
          ),
          y: Phaser.Math.Clamp(
            startY + dirY * backDistance,
            40,
            scene.map.heightInPixels - 40
          )
        };
      }

      safeX = testX;
      safeY = testY;
    }

    return {
      x: safeX,
      y: safeY
    };
  }

  wouldHitSolid(x, y, dirX = 0, dirY = 0) {
    const horizontalOnly = Math.abs(dirX) > 0 && Math.abs(dirY) === 0;

    if (dirY < 0) {
      
      
      return (
        this.hasSolidAt(x, y - 36, true) ||
        this.hasSolidAt(x - 14, y - 36, true) ||
        this.hasSolidAt(x + 14, y - 36, true) ||
        this.hasSolidAt(x, y - 8, true)
      );
    }

    if (dirY > 0) {
      return (
        this.hasSolidAt(x, y + 34, true) ||
        this.hasSolidAt(x - 14, y + 34, true) ||
        this.hasSolidAt(x + 14, y + 34, true)
      );
    }

    if (horizontalOnly) {
      
      
      
      const frontX = x + dirX * 18;
      return (
        this.hasSolidAt(frontX, y - 62, true) ||
        this.hasSolidAt(frontX, y - 46, true) ||
        this.hasSolidAt(frontX, y - 28, true) ||
        this.hasSolidAt(frontX, y - 12, true)
      );
    }

    return (
      this.hasSolidAt(x, y - 54, false) ||
      this.hasSolidAt(x - 16, y - 36, false) ||
      this.hasSolidAt(x + 16, y - 36, false) ||
      this.hasSolidAt(x - 16, y - 12, false) ||
      this.hasSolidAt(x + 16, y - 12, false)
    );
  }

  hasSolidAt(x, y, hardOnly = false) {
    const scene = this.scene;

    if (hardOnly && scene.isBlockingSolidAtWorld) {
      return scene.isBlockingSolidAtWorld(x, y);
    }

    if (scene.isSolidAtWorld && scene.isSolidAtWorld(x, y)) {
      return true;
    }

    const layers = [
      scene.groundLayer,
      scene.destructibleLayer,
      scene.creatableLayer
    ];

    for (const layer of layers) {
      if (!layer || !layer.getTileAtWorldXY) continue;

      const tile = layer.getTileAtWorldXY(x, y, true);

      if (tile && tile.index !== -1 && tile.collides) {
        return true;
      }
    }

    return false;
  }

  getCooldown(group) {
    if (group === "horizontal") {
      return this.config.dashCooldownHorizontal;
    }

    if (group === "up") {
      return this.config.dashCooldownUp;
    }

    return this.config.dashCooldownDown;
  }
}
