export default class HealthPackManager {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.minRespawnMs = options.minRespawnMs ?? 10000;
    this.maxRespawnMs = options.maxRespawnMs ?? 10000;
    this.maxActive = options.maxActive ?? 3;
    this.packs = [];
    this.nextSpawnEvent = null;
    this.overlaps = [];
  }

  start(initialDelayMs = 4500) {
    this.scheduleNext(initialDelayMs);
    return this;
  }

  scheduleNext(delayMs = null) {
    this.cancelTimer();
    const scene = this.scene;
    if (!scene || scene.gameOver) return;

    const delay = Number.isFinite(delayMs)
      ? delayMs
      : Phaser.Math.Between(this.minRespawnMs, this.maxRespawnMs);

    this.nextSpawnEvent = scene.time.delayedCall(delay, () => {
      this.nextSpawnEvent = null;
      this.trySpawn();
    });
  }

  trySpawn() {
    const scene = this.scene;
    if (!scene || scene.gameOver) return;

    this.cleanupInactive();

    if (this.packs.length >= this.maxActive) {
      this.scheduleNext();
      return;
    }

    const point = this.findSpawnPoint();
    if (!point) {
      this.scheduleNext(6000);
      return;
    }

    const healAmount = Phaser.Math.Between(1, 2);
    const pack = scene.physics.add.image(point.x, point.y, "health_pack")
      .setDepth(650)
      .setScale(1.35)
      .setData("healAmount", healAmount)
      .setData("healthPack", true);

    pack.body.allowGravity = false;
    pack.body.setCircle(12, 4, 4);
    pack.body.setImmovable(true);

    scene.tweens.add({
      targets: pack,
      y: point.y - 8,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    const overlap = scene.physics.add.overlap(scene.player, pack, () => this.collect(pack));
    this.overlaps.push(overlap);
    this.packs.push(pack);

    this.scheduleNext();
  }

  findSpawnPoint() {
    const scene = this.scene;
    const rects = scene.arena?.solidRects || [];
    const width = scene.map?.widthInPixels || 3840;
    const height = scene.map?.heightInPixels || 2048;

    const candidates = rects
      .filter(([x, y, w, h]) => w >= 96 && h >= 16 && y > 280 && y < height - 64)
      .map(([x, y, w]) => ({
        x: Phaser.Math.Between(Math.ceil(x + 34), Math.floor(x + w - 34)),
        y: y - 30,
        surfaceY: y
      }))
      .filter((p) => {
        if (p.x < 48 || p.x > width - 48 || p.y < 80 || p.y > height - 80) return false;
        if (scene.player && Phaser.Math.Distance.Between(scene.player.x, scene.player.y, p.x, p.y) < 260) return false;
        return scene.arena?.isPlayerAreaEmptyAt
          ? scene.arena.isPlayerAreaEmptyAt(p.x, p.y, 18, 28)
          : true;
      });

    if (candidates.length <= 0) return null;
    return Phaser.Utils.Array.GetRandom(candidates);
  }

  collect(pack) {
    const scene = this.scene;
    if (!pack || !pack.active || scene.gameOver) return;

    const maxHp = scene.playerMaxHp || 4;
    if (scene.playerHp >= maxHp) {
      scene.audioCues?.play?.("uiWarning", { volume: 0.18, cooldownMs: 250 });
      this.flashFull(pack.x, pack.y);
      return;
    }

    const amount = pack.getData("healAmount") || 1;
    scene.audioCues?.play?.("phaseTitle", { volume: 0.22, cooldownMs: 300 });
    scene.playerHp = Math.min(maxHp, scene.playerHp + amount);
    this.flashHeal(pack.x, pack.y, amount);
    this.destroyPack(pack);
    this.scheduleNext();
  }

  flashHeal(x, y, amount) {
    const scene = this.scene;
    const text = scene.add.text(x, y - 32, `+${amount} HP`, {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#b8ffd6",
      stroke: "#00190a",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(2000);

    scene.tweens.add({
      targets: text,
      y: y - 70,
      alpha: 0,
      duration: 720,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy()
    });
  }

  flashFull(x, y) {
    const scene = this.scene;
    const text = scene.add.text(x, y - 32, "HP FULL", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#e8fff1",
      stroke: "#00190a",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(2000);

    scene.tweens.add({
      targets: text,
      y: y - 58,
      alpha: 0,
      duration: 420,
      ease: "Quad.easeOut",
      onComplete: () => text.destroy()
    });
  }

  destroyPack(pack) {
    if (!pack) return;
    this.packs = this.packs.filter((p) => p !== pack);
    this.scene.tweens.killTweensOf(pack);
    if (pack.active) pack.destroy();
  }

  cleanupInactive() {
    this.packs = this.packs.filter((pack) => pack && pack.active);
  }

  cancelTimer() {
    if (this.nextSpawnEvent) {
      this.nextSpawnEvent.remove(false);
      this.nextSpawnEvent = null;
    }
  }

  cleanup() {
    this.cancelTimer();
    this.overlaps.forEach((overlap) => overlap?.destroy?.());
    this.overlaps = [];
    this.packs.forEach((pack) => {
      this.scene.tweens.killTweensOf(pack);
      if (pack && pack.active) pack.destroy();
    });
    this.packs = [];
  }
}
