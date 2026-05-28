






export default class PlayerParticleJuice {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.lastRunDustAt = 0;

    this.ensureParticleTextures();
    this.createEmitters();
  }

  ensureParticleTextures() {
    const scene = this.scene;

    if (!scene.textures.exists("run_dust_particle")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xd8e2dd, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture("run_dust_particle", 8, 8);
      g.destroy();
    }

    if (!scene.textures.exists("jump_spark_particle")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xf5fff0, 1);
      g.fillCircle(5, 5, 5);
      g.lineStyle(1, 0x90ffb0, 0.9);
      g.strokeCircle(5, 5, 4);
      g.generateTexture("jump_spark_particle", 10, 10);
      g.destroy();
    }

    if (!scene.textures.exists("tree_birth_particle")) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 5);
      g.lineStyle(2, 0xa7ffbf, 0.95);
      g.strokeCircle(6, 6, 5);
      g.generateTexture("tree_birth_particle", 12, 12);
      g.destroy();
    }
  }

  createEmitters() {
    const scene = this.scene;

    this.runDust = scene.add.particles(0, 0, "run_dust_particle", {
      lifespan: { min: 180, max: 360 },
      speedX: { min: -42, max: 42 },
      speedY: { min: -38, max: -10 },
      gravityY: 280,
      scale: { start: 0.75, end: 0.08 },
      alpha: { start: 0.42, end: 0 },
      quantity: 1,
      emitting: false,
      blendMode: "NORMAL"
    });
    this.runDust.setDepth(22);

    this.jumpBurst = scene.add.particles(0, 0, "jump_spark_particle", {
      lifespan: { min: 240, max: 520 },
      speed: { min: 70, max: 185 },
      angle: { min: 205, max: 335 },
      gravityY: 360,
      rotate: { min: -140, max: 140 },
      scale: { start: 0.72, end: 0.06 },
      alpha: { start: 0.72, end: 0 },
      emitting: false,
      blendMode: "ADD"
    });
    this.jumpBurst.setDepth(24);

    this.treeBirth = scene.add.particles(0, 0, "tree_birth_particle", {
      lifespan: { min: 360, max: 850 },
      speed: { min: 38, max: 150 },
      gravityY: -42,
      rotate: { min: -180, max: 180 },
      scale: { start: 0.9, end: 0.05 },
      alpha: { start: 0.85, end: 0 },
      emitting: false,
      blendMode: "ADD"
    });
    this.treeBirth.setDepth(30);
  }

  
  
  
  

  emitRunDust(time, direction = 1) {
    if (!this.player?.body || !this.runDust) return;
    if (time - this.lastRunDustAt < 92) return;

    this.lastRunDustAt = time;
    const footX = this.player.x - direction * 16;
    const footY = this.player.y + Math.max(26, this.player.body.height * 0.42);
    this.runDust.explode(2, footX, footY);
  }

  emitJumpBurst(kind = "jump") {
    if (!this.player?.body || !this.jumpBurst) return;

    const count = kind === "double" ? 14 : kind === "land" ? 10 : 12;
    const x = this.player.x;
    const y = this.player.y + Math.max(28, this.player.body.height * 0.45);
    this.jumpBurst.explode(count, x, y);
  }

  emitLadderJumpBurst() {
    this.emitJumpBurst("jump");
  }

  emitTreeBirth(x, y, direction = "up", scale = 1) {
    if (!this.treeBirth) return;

    const offsetY = direction === "up" ? -22 * scale : 22 * scale;
    const burstY = y + offsetY;
    this.treeBirth.explode(28, x, burstY);

    
    
    const sprayCount = 16;
    for (let i = 0; i < sprayCount; i++) {
      const px = x + Phaser.Math.Between(-18, 18) * scale;
      const py = y + Phaser.Math.Between(-8, 8) * scale;
      this.treeBirth.emitParticleAt(px, py, 1);
    }
  }

  destroy() {
    this.runDust?.destroy?.();
    this.jumpBurst?.destroy?.();
    this.treeBirth?.destroy?.();
    this.runDust = null;
    this.jumpBurst = null;
    this.treeBirth = null;
  }
}
