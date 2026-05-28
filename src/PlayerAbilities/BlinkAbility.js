export default class BlinkAbility {
  constructor(scene, player, config, flash) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    this.flash = flash;

    this.lastBlinkTime = -99999;
    this.isBlinking = false;

    this.minX = 40;
    this.minY = 40;
    this.safeRadiusX = 18;
    this.safeRadiusY = 34;
  }

  tryBlink() {
    const scene = this.scene;
    const player = this.player;
    const now = scene.time.now;

    if (!player || !player.active || !player.body) return false;

    if (now - this.lastBlinkTime < this.config.blinkCooldown) {
      return false;
    }

    const pointer = scene.input.activePointer;
    const worldPoint = pointer.positionToCamera(scene.cameras.main);

    let tx = Phaser.Math.Clamp(
      worldPoint.x,
      this.minX,
      scene.map.widthInPixels - this.minX
    );

    let ty = Phaser.Math.Clamp(
      worldPoint.y,
      this.minY,
      scene.map.heightInPixels - this.minY
    );

    const safePoint = this.findSafeBlinkPoint(tx, ty);

    if (!safePoint) {
      this.flash(tx, ty, 0xff3333);
      scene.audioCues?.play?.("abilityFail");
      return false;
    }

    tx = safePoint.x;
    ty = safePoint.y;

    this.lastBlinkTime = now;
    this.isBlinking = true;
    scene.audioCues?.play?.("playerBlink");

    scene.tweens.killTweensOf(player);

    this.flash(player.x, player.y, this.config.blinkFlashColor);
    scene.playerGhostTrail?.burst?.(5, 18);

    player.body.allowGravity = true;
    player.setPosition(tx, ty);
    player.setVelocity(0, 0);

    
    scene.playerInvulnerableUntil = Math.max(
      scene.playerInvulnerableUntil || 0,
      now + 220
    );

    this.flash(tx, ty, this.config.blinkFlashColor);

    scene.time.delayedCall(120, () => {
      this.isBlinking = false;
    });

    return true;
  }

  interrupt() {
    this.isBlinking = false;
  }

  findSafeBlinkPoint(x, y) {
    if (this.isPlayerAreaEmpty(x, y)) {
      return { x, y };
    }

    const offsets = [
      [0, -32],
      [0, 32],
      [-32, 0],
      [32, 0],
      [-32, -32],
      [32, -32],
      [-32, 32],
      [32, 32],
      [0, -64],
      [0, 64],
      [-64, 0],
      [64, 0],
      [-64, -64],
      [64, -64],
      [-64, 64],
      [64, 64],
      [0, -96],
      [0, 96],
      [-96, 0],
      [96, 0]
    ];

    for (const [ox, oy] of offsets) {
      const nx = Phaser.Math.Clamp(
        x + ox,
        this.minX,
        this.scene.map.widthInPixels - this.minX
      );

      const ny = Phaser.Math.Clamp(
        y + oy,
        this.minY,
        this.scene.map.heightInPixels - this.minY
      );

      if (this.isPlayerAreaEmpty(nx, ny)) {
        return { x: nx, y: ny };
      }
    }

    return null;
  }

  isPlayerAreaEmpty(x, y) {
    return (
      !this.hasSolidAt(x, y) &&
      !this.hasSolidAt(x - this.safeRadiusX, y - this.safeRadiusY) &&
      !this.hasSolidAt(x + this.safeRadiusX, y - this.safeRadiusY) &&
      !this.hasSolidAt(x - this.safeRadiusX, y + this.safeRadiusY) &&
      !this.hasSolidAt(x + this.safeRadiusX, y + this.safeRadiusY)
    );
  }

  hasSolidAt(x, y) {
    const scene = this.scene;

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
}
