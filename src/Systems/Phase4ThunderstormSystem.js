export default class Phase4ThunderstormSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.startedAt = 0;
    this.nextStrikeAt = 0;
    this.nextSkyShowAt = 0;
    this.objects = new Set();
    this.timers = new Set();
    this.layer = null;
    this.screenLayer = null;
    this.screenFlash = null;
    this.skyGraphics = null;
    this.lastPlayerDamageAt = 0;
  }

  create() {
    const scene = this.scene;
    this.layer = scene.add.container(0, 0).setDepth(7650);
    this.screenLayer = scene.createScreenSpaceLayer
      ? scene.createScreenSpaceLayer(5750)
      : scene.add.container(0, 0).setDepth(5750);

    this.screenFlash = scene.add.rectangle(0, 0, scene.scale.width || 1280, scene.scale.height || 720, 0xffffff, 0)
      .setOrigin(0, 0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.skyGraphics = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.screenLayer.add([this.skyGraphics, this.screenFlash]);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
    return this;
  }

  startFinalStorm() {
    if (this.active || this.scene.gameOver) return;
    this.active = true;
    this.startedAt = this.scene.time?.now || 0;
    this.nextStrikeAt = this.startedAt + 900;
    this.nextSkyShowAt = this.startedAt + 260;


    this.flashScreen(0.42, 280);
    this.scene.cameras?.main?.shake?.(260, 0.0045 * (this.scene.screenShakeMultiplier || 1));

    this.addTimer(this.scene.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => this.pulseStorm()
    }));
  }

  stop() {
    this.active = false;
    for (const timer of this.timers) timer?.remove?.(false);
    this.timers.clear();
    for (const obj of this.objects) {
      this.scene.tweens?.killTweensOf?.(obj);
      obj?.destroy?.();
    }
    this.objects.clear();
    this.skyGraphics?.clear();
    if (this.screenFlash) {
      this.scene.tweens?.killTweensOf?.(this.screenFlash);
      this.screenFlash.setAlpha(0);
    }
  }

  destroy() {
    this.stop();
    if (this.screenLayer && this.scene?.destroyScreenSpaceLayer) {
      this.scene.destroyScreenSpaceLayer(this.screenLayer);
    } else {
      this.screenLayer?.destroy?.();
    }
    this.layer?.destroy?.();
    this.screenLayer = null;
    this.layer = null;
    this.screenFlash = null;
    this.skyGraphics = null;
  }

  addTimer(timer) {
    if (!timer) return timer;
    this.timers.add(timer);
    const originalRemove = timer.remove?.bind(timer);
    if (originalRemove && !timer.__phase4StormRemoveWrapped) {
      timer.__phase4StormRemoveWrapped = true;
      timer.remove = (dispatchCallback = false) => {
        this.timers.delete(timer);
        return originalRemove(dispatchCallback);
      };
    }
    return timer;
  }

  getWorldBounds() {
    const scene = this.scene;
    return {
      width: scene.map?.widthInPixels || scene.physics?.world?.bounds?.width || 3840,
      height: scene.map?.heightInPixels || scene.physics?.world?.bounds?.height || 2048
    };
  }

  getCameraStrikeArea() {
    const cam = this.scene.cameras?.main;
    const bounds = this.getWorldBounds();
    if (!cam?.worldView) return new Phaser.Geom.Rectangle(0, 0, bounds.width, bounds.height);

    const padX = Math.max(260, cam.worldView.width * 0.18);
    const padY = Math.max(180, cam.worldView.height * 0.16);
    return new Phaser.Geom.Rectangle(
      Phaser.Math.Clamp(cam.worldView.left - padX, 0, Math.max(0, bounds.width - 1)),
      Phaser.Math.Clamp(cam.worldView.top - padY, 0, Math.max(0, bounds.height - 1)),
      Math.min(bounds.width, cam.worldView.width + padX * 2),
      Math.min(bounds.height, cam.worldView.height + padY * 2)
    );
  }

  pulseStorm() {
    if (!this.active || this.scene.gameOver || this.scene.bossPhase < 4) return;

    const now = this.scene.time?.now || 0;
    if (now >= this.nextSkyShowAt) {
      this.spawnSkyPerformanceBolt();
      this.nextSkyShowAt = now + Phaser.Math.Between(360, 760);
    }

    if (now >= this.nextStrikeAt) {
      const elapsed = now - this.startedAt;
      const count = elapsed > 12000 ? Phaser.Math.Between(2, 3) : Phaser.Math.Between(1, 2);
      for (let i = 0; i < count; i++) {
        this.addTimer(this.scene.time.delayedCall(i * Phaser.Math.Between(120, 230), () => this.spawnBattlefieldStrike()));
      }
      this.nextStrikeAt = now + Phaser.Math.Between(1350, 2300);
    }
  }

  update() {
    if (!this.active || !this.screenLayer || !this.scene.layoutScreenSpaceLayer) return;
    this.scene.layoutScreenSpaceLayer(this.screenLayer);
  }

  pickStrikePoint() {
    const scene = this.scene;
    const area = this.getCameraStrikeArea();
    const player = scene.player;

    if (player?.active && Phaser.Math.Between(0, 100) < 62) {
      const predictedX = player.x + (player.body?.velocity?.x || 0) * Phaser.Math.FloatBetween(0.18, 0.36);
      const predictedY = player.y + (player.body?.velocity?.y || 0) * Phaser.Math.FloatBetween(0.08, 0.18);
      return {
        x: Phaser.Math.Clamp(predictedX + Phaser.Math.Between(-230, 230), area.left + 60, area.right - 60),
        y: Phaser.Math.Clamp(predictedY + Phaser.Math.Between(-80, 140), area.top + 120, area.bottom - 80)
      };
    }

    return {
      x: Phaser.Math.Between(Math.round(area.left + 90), Math.round(area.right - 90)),
      y: Phaser.Math.Between(Math.round(area.top + 160), Math.round(area.bottom - 110))
    };
  }

  spawnBattlefieldStrike() {
    if (!this.active || this.scene.gameOver || this.scene.bossPhase < 4) return;

    const scene = this.scene;
    const point = this.pickStrikePoint();
    const warningMs = Phaser.Math.Between(720, 980);
    const radiusX = Phaser.Math.Between(92, 128);
    const radiusY = Phaser.Math.Between(34, 48);
    const topY = Math.max(0, point.y - Phaser.Math.Between(580, 920));

    const marker = scene.add.container(point.x, point.y).setDepth(7640);
    const warning = scene.add.ellipse(0, 0, radiusX * 2, radiusY * 2, 0xaeefff, 0.11)
      .setStrokeStyle(4, 0xffffff, 0.70)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = scene.add.ellipse(0, 0, radiusX * 0.68, radiusY * 0.76, 0xffffff, 0.10)
      .setBlendMode(Phaser.BlendModes.ADD);
    const line = scene.add.line(0, 0, 0, topY - point.y, 0, -34, 0xbdf7ff, 0.48)
      .setOrigin(0.5, 0)
      .setLineWidth(3, 7)
      .setBlendMode(Phaser.BlendModes.ADD);
    marker.add([line, warning, core]);
    this.layer?.add?.(marker);
    this.objects.add(marker);
    scene.trackHostileObject?.(marker);

    scene.tweens.add({ targets: warning, scaleX: 1.18, scaleY: 1.42, alpha: 0.32, duration: 210, yoyo: true, repeat: Math.max(2, Math.floor(warningMs / 230)) });
    scene.tweens.add({ targets: core, alpha: 0.38, duration: 90, yoyo: true, repeat: Math.max(4, Math.floor(warningMs / 110)) });
    scene.tweens.add({ targets: line, alpha: 0.88, duration: 120, yoyo: true, repeat: Math.max(4, Math.floor(warningMs / 130)) });

    this.addTimer(scene.time.delayedCall(warningMs, () => {
      if (!this.active || scene.gameOver || !marker.active) return;
      marker.destroy();
      this.objects.delete(marker);
      this.spawnStrikeImpact(point.x, point.y, topY, radiusX, radiusY);
    }));
  }

  spawnStrikeImpact(x, y, topY, radiusX, radiusY) {
    const scene = this.scene;
    const bolt = scene.add.sprite(x + Phaser.Math.Between(-18, 18), (topY + y) * 0.5, "phase_lightning_1")
      .setDepth(7660)
      .setScale(Phaser.Math.FloatBetween(2.6, 3.35), Math.max(3.4, (y - topY) / 145))
      .setOrigin(0.5, 0.5)
      .setAlpha(0.96)
      .setBlendMode(Phaser.BlendModes.ADD);
    bolt.name = "phase4_thunderbolt";
    this.objects.add(bolt);
    scene.trackHostileObject?.(bolt);

    if (scene.anims.exists("phase_lightning_anim")) bolt.play("phase_lightning_anim");

    const impact = scene.add.ellipse(x, y, radiusX * 2.45, radiusY * 2.25, 0xffffff, 0.42)
      .setDepth(7658)
      .setBlendMode(Phaser.BlendModes.ADD);
    const shock = scene.add.ellipse(x, y, radiusX * 2.8, radiusY * 2.55, 0x6cecff, 0.24)
      .setDepth(7657)
      .setStrokeStyle(5, 0xffffff, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.objects.add(impact);
    this.objects.add(shock);
    scene.trackHostileObject?.(impact);
    scene.trackHostileObject?.(shock);

    this.flashScreen(0.26, 130);
    scene.cameras?.main?.shake?.(170, 0.0065 * (scene.screenShakeMultiplier || 1));
    scene.audioCues?.play?.("gravityFieldCollapse", { volume: 0.24, cooldownMs: 120 });

    this.damagePlayerInStrike(x, y, radiusX * 1.18, Math.max(radiusY * 1.4, 58));
    this.damageTreesInStrike(x, y, radiusX * 1.3, Math.max(radiusY * 1.7, 72));

    scene.tweens.add({ targets: impact, scaleX: 1.6, scaleY: 1.55, alpha: 0, duration: 260, ease: "Sine.easeOut", onComplete: () => impact.destroy() });
    scene.tweens.add({ targets: shock, scaleX: 1.75, scaleY: 1.65, alpha: 0, duration: 340, ease: "Sine.easeOut", onComplete: () => shock.destroy() });
    this.addTimer(scene.time.delayedCall(260, () => bolt?.destroy?.()));
  }

  damagePlayerInStrike(x, y, radiusX, radiusY) {
    const scene = this.scene;
    const player = scene.player;
    if (!player?.active || scene.gameOver) return;

    const px = player.x;
    const py = player.y;
    const normalized = ((px - x) * (px - x)) / (radiusX * radiusX) + ((py - y) * (py - y)) / (radiusY * radiusY);
    if (normalized > 1.0) return;

    const now = scene.time?.now || 0;
    if (now - this.lastPlayerDamageAt < 420) return;
    this.lastPlayerDamageAt = now;
    scene.damagePlayer?.(1);
  }

  damageTreesInStrike(x, y, radiusX, radiusY) {
    const scene = this.scene;
    const trees = scene.playerTrees?.getChildren?.() || [];
    for (const tree of trees) {
      if (!tree?.active) continue;
      const normalized = ((tree.x - x) * (tree.x - x)) / (radiusX * radiusX) + ((tree.y - y) * (tree.y - y)) / (radiusY * radiusY);
      if (normalized <= 1.0) scene.damagePlayerTree?.(tree, 1);
    }
  }

  spawnSkyPerformanceBolt() {
    if (!this.skyGraphics || !this.active) return;

    const scene = this.scene;
    const width = scene.scale.width || scene.cameras?.main?.width || 1280;
    const height = scene.scale.height || scene.cameras?.main?.height || 720;
    const startX = Phaser.Math.Between(80, Math.max(100, width - 80));
    const startY = Phaser.Math.Between(0, Math.max(30, Math.round(height * 0.18)));
    const segments = Phaser.Math.Between(4, 7);
    const length = Phaser.Math.Between(Math.round(height * 0.20), Math.round(height * 0.46));

    this.skyGraphics.clear();
    this.skyGraphics.lineStyle(8, 0xffffff, 0.42);
    this.drawJaggedBolt(startX, startY, length, segments, 36);
    this.skyGraphics.lineStyle(3, 0x9eefff, 0.78);
    this.drawJaggedBolt(startX, startY, length, segments, 30);

    if (Phaser.Math.Between(0, 100) < 48) this.flashScreen(0.12, 90);
    this.addTimer(scene.time.delayedCall(95, () => this.skyGraphics?.clear()));
  }

  drawJaggedBolt(startX, startY, length, segments, jitter) {
    const g = this.skyGraphics;
    let x = startX;
    let y = startY;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 1; i <= segments; i++) {
      x += Phaser.Math.Between(-jitter, jitter);
      y = startY + (length / segments) * i;
      g.lineTo(x, y);
      if (i > 1 && Phaser.Math.Between(0, 100) < 46) {
        const branchX = x + Phaser.Math.Between(-jitter * 2, jitter * 2);
        const branchY = y + Phaser.Math.Between(24, 82);
        g.moveTo(x, y);
        g.lineTo(branchX, branchY);
        g.moveTo(x, y);
      }
    }
    g.strokePath();
  }

  flashScreen(alpha = 0.18, duration = 120) {
    if (!this.screenFlash) return;
    this.screenFlash.setSize(this.scene.scale.width || 1280, this.scene.scale.height || 720);
    this.scene.tweens?.killTweensOf?.(this.screenFlash);
    this.screenFlash.setAlpha(alpha);
    this.scene.tweens.add({ targets: this.screenFlash, alpha: 0, duration, ease: "Sine.easeOut" });
  }
}
