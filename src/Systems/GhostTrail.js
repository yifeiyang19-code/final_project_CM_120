export default class GhostTrail {
  constructor(scene, sprite, options = {}) {
    this.scene = scene;
    this.sprite = sprite;
    this.enabled = options.enabled !== false;
    this.velocityThreshold = options.velocityThreshold ?? 430;
    this.minIntervalMs = options.minIntervalMs ?? 44;
    this.lifeMs = options.lifeMs ?? 220;
    this.maxGhosts = options.maxGhosts ?? 18;
    this.alpha = options.alpha ?? 0.28;
    this.scaleMultiplier = options.scaleMultiplier ?? 1;
    this.depthOffset = options.depthOffset ?? -1;
    this.lastSpawnAt = -99999;
    this.ghosts = [];
  }

  update(time) {
    if (!this.enabled || !this.sprite || !this.sprite.active || !this.sprite.body) return;

    const velocity = this.sprite.body.velocity;
    const speed = Math.hypot(velocity.x, velocity.y);

    if (speed < this.velocityThreshold) return;
    if (time - this.lastSpawnAt < this.minIntervalMs) return;

    this.spawn();
    this.lastSpawnAt = time;
  }

  burst(count = 4, spacingMs = 28) {
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * spacingMs, () => this.spawn());
    }
  }

  spawn() {
    const source = this.sprite;
    if (!source || !source.active || !source.texture || !source.frame) return;

    const ghost = this.scene.add.image(source.x, source.y, source.texture.key, source.frame.name)
      .setOrigin(source.originX, source.originY)
      .setScale(source.scaleX * this.scaleMultiplier, source.scaleY * this.scaleMultiplier)
      .setFlipX(source.flipX)
      .setFlipY(source.flipY)
      .setRotation(source.rotation)
      .setAlpha(this.alpha)
      .setTint(0x9fdcff)
      .setDepth((source.depth || 0) + this.depthOffset);

    this.ghosts.push(ghost);
    while (this.ghosts.length > this.maxGhosts) {
      const old = this.ghosts.shift();
      if (old && old.active) old.destroy();
    }

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: ghost.scaleX * 1.03,
      scaleY: ghost.scaleY * 1.03,
      duration: this.lifeMs,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.ghosts = this.ghosts.filter((item) => item !== ghost);
        if (ghost && ghost.active) ghost.destroy();
      }
    });
  }

  destroy() {
    this.ghosts.forEach((ghost) => {
      if (ghost && ghost.active) ghost.destroy();
    });
    this.ghosts = [];
  }
}
