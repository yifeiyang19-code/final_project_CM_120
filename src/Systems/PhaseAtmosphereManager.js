export default class PhaseAtmosphereManager {
  constructor(scene) {
    this.scene = scene;
    this.phase = 1;

    this.darkOverlay = null;
    this.darkLayers = [];
    this.colorGradeOverlay = null;
    this.flashOverlay = null;
    this.cloudGraphics = null;
    this.cloudTweenProxy = { alpha: 0 };
    this.cloudAlpha = 0;
    this.cloudTargetAlpha = 0;
    this.cloudScroll = 0;
    this.cloudSeed = 0;
    this.cloudGraphics = null;
    this.rainGraphics = null;
    this.playerGlow = null;

    this.rainDrops = [];
    this.rainDrawAccumulator = 0;
    this.rainMode = "drizzle";
    this.rainActive = false;
    this.rainAlpha = 0;
    this.rainTargetAlpha = 0;
    this.rainTweenProxy = { alpha: 0 };
    this.pendingPhaseThreeRain = false;

    this.playerOriginalDepth = null;
    this.playerOriginalTint = null;
    this.playerGlowPhase = 0;
    this.playerGlowActive = false;
  }

  create() {
    const { width, height } = this.getViewportSize();
    this.screenLayer = this.scene.createScreenSpaceLayer ? this.scene.createScreenSpaceLayer(5000) : null;

    
    
    
    
    
    
    
    this.darkLayers = [
      this.scene.add.rectangle(0, 0, width, height, 0x000000, 0),
      this.scene.add.rectangle(0, 0, width, height, 0x000000, 0),
      this.scene.add.rectangle(0, 0, width, height, 0x000000, 0)
    ];

    this.darkLayers.forEach((layer, index) => {
      layer
        .setOrigin(0, 0)
        .setDepth(5000 + index)
        .setBlendMode(Phaser.BlendModes.NORMAL);
    });

    this.darkOverlay = this.darkLayers[0];

    
    
    this.colorGradeOverlay = this.scene.add.rectangle(0, 0, width, height, 0x020715, 0)
      .setOrigin(0, 0)
      .setDepth(5003)
      .setBlendMode(Phaser.BlendModes.NORMAL);

    this.flashOverlay = this.scene.add.rectangle(0, 0, width, height, 0x31405f, 0)
      .setOrigin(0, 0)
      .setDepth(5600);

    
    
    
    this.cloudGraphics = this.scene.add.graphics()
      .setDepth(5004)
      .setVisible(false);

    
    this.rainGraphics = this.scene.add.graphics()
      .setDepth(5700)
      .setVisible(false);

    if (this.screenLayer) {
      this.screenLayer.add([
        ...this.darkLayers,
        this.colorGradeOverlay,
        this.flashOverlay,
        this.cloudGraphics,
        this.rainGraphics
      ]);
    }

    
    this.playerGlow = this.scene.add.graphics()
      .setDepth(5900)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.createRain(width, height, "drizzle");
    this.startRain(900, "drizzle");

    this.scene.scale.on("resize", this.handleResize, this);
    return this;
  }

  getViewportSize() {
    const camera = this.scene.cameras?.main;
    const canvas = this.scene.sys?.game?.canvas;
    const scale = this.scene.scale;

    const rawWidth = Math.max(
      1980,
      scale?.width || 0,
      scale?.gameSize?.width || 0,
      scale?.displaySize?.width || 0,
      camera?.width || 0,
      canvas?.width || 0,
      canvas?.clientWidth || 0,
      typeof window !== "undefined" ? window.innerWidth : 0
    );

    const rawHeight = Math.max(
      1080,
      scale?.height || 0,
      scale?.gameSize?.height || 0,
      scale?.displaySize?.height || 0,
      camera?.height || 0,
      canvas?.height || 0,
      canvas?.clientHeight || 0,
      typeof window !== "undefined" ? window.innerHeight : 0
    );

    return {
      width: Math.ceil(rawWidth),
      height: Math.ceil(rawHeight)
    };
  }

  getRainProfile(mode = this.rainMode) {
    if (mode === "storm") {
      return {
        mode: "storm",
        baseCount: 760,
        alpha: 0.9,
        lineAlpha: 0.88,
        lineWidth: 1.95,
        minLength: 84,
        maxLength: 162,
        minSpeedY: 920,
        maxSpeedY: 1620,
        minSpeedX: -420,
        maxSpeedX: -190,
        color: 0xe6f6ff
      };
    }

    if (mode === "medium") {
      return {
        mode: "medium",
        baseCount: 520,
        alpha: 0.68,
        lineAlpha: 0.7,
        lineWidth: 1.55,
        minLength: 62,
        maxLength: 126,
        minSpeedY: 740,
        maxSpeedY: 1320,
        minSpeedX: -330,
        maxSpeedX: -140,
        color: 0xdaf1ff
      };
    }

    return {
      mode: "drizzle",
      baseCount: 250,
      alpha: 0.34,
      lineAlpha: 0.38,
      lineWidth: 1.05,
      minLength: 34,
      maxLength: 78,
      minSpeedY: 540,
      maxSpeedY: 940,
      minSpeedX: -220,
      maxSpeedX: -90,
      color: 0xcfeeff
    };
  }

  getRainCanvasBounds() {
    const { width, height } = this.getViewportSize();
    const marginX = Math.max(900, width * 0.65);
    const marginY = Math.max(520, height * 0.42);

    return {
      viewportWidth: width,
      viewportHeight: height,
      marginX,
      marginY,
      drawWidth: width + marginX * 2,
      drawHeight: height + marginY * 2
    };
  }

  handleResize() {
    const { width, height } = this.getViewportSize();
    this.darkLayers?.forEach((layer) => layer?.setSize(width, height));
    this.darkOverlay?.setSize(width, height);
    this.colorGradeOverlay?.setSize(width, height);
    this.flashOverlay?.setSize(width, height);
    this.createRain(width, height, this.rainMode);
    this.drawClouds(0);
  }

  createRain(width, height, mode = this.rainMode) {
    this.rainMode = mode;
    const profile = this.getRainProfile(mode);
    const bounds = this.getRainCanvasBounds();
    const areaScale = Math.max(1, (bounds.viewportWidth * bounds.viewportHeight) / (1980 * 1080));
    const count = Math.round(profile.baseCount * areaScale);

    this.rainDrops = [];

    for (let i = 0; i < count; i++) {
      this.rainDrops.push(this.createRainDrop(profile, bounds, true));
    }
  }

  createRainDrop(profile, bounds, randomY = false) {
    return {
      x: Phaser.Math.FloatBetween(0, bounds.drawWidth),
      y: randomY
        ? Phaser.Math.FloatBetween(0, bounds.drawHeight)
        : Phaser.Math.FloatBetween(-bounds.marginY * 0.8, 0),
      length: Phaser.Math.FloatBetween(profile.minLength, profile.maxLength),
      speedY: Phaser.Math.FloatBetween(profile.minSpeedY, profile.maxSpeedY),
      speedX: Phaser.Math.FloatBetween(profile.minSpeedX, profile.maxSpeedX)
    };
  }

  setPhase(phase, options = {}) {
    phase = Phaser.Math.Clamp(phase || 1, 1, 4);
    if (phase === this.phase && !options.force) return;

    this.phase = phase;
    this.pendingPhaseThreeRain = false;

    
    
    if (phase === 1) {
      this.setDarkness(0.055, 220, 0.035);
      this.setCloudCover(0.10, 420);
      this.setRainMode("drizzle", 450);
      this.phaseFlash(0x6f8999, 0.12);
    } else if (phase === 2) {
      this.setDarkness(0.06, 420, 0.065);
      this.setCloudCover(0.24, 650);
      this.setRainMode("medium", 650);
      this.phaseFlash(0x4d6374, 0.2);
    } else if (phase === 3) {
      this.setDarkness(0.11, 520, 0.1);
      this.setCloudCover(0.4, 760);
      this.setRainMode("storm", 760);
      this.phaseFlash(0x33415a, 0.28);
    } else {
      this.setDarkness(0.18, 420, 0.16);
      this.setCloudCover(0.52, 520);
      this.setRainMode("storm", 420);
      this.phaseFlash(0xffffff, 0.36);
    }

    this.enablePlayerGlow();
  }

  onPhaseTransitionComplete() {
    if (this.phase < 3 || !this.pendingPhaseThreeRain) return;
    this.pendingPhaseThreeRain = false;
    this.setRainMode("storm", 1600);
  }

  setRainMode(mode, duration = 700) {
    const profile = this.getRainProfile(mode);
    const { width, height } = this.getViewportSize();
    this.createRain(width, height, mode);
    this.startRain(duration, mode, profile.alpha);
  }

  setDarkness(alpha, duration = 700, gradeAlpha = 0) {
    if (!this.darkOverlay) return;
    const { width, height } = this.getViewportSize();

    const requested = Phaser.Math.Clamp(alpha, 0, 0.995);
    const nextGrade = Phaser.Math.Clamp(gradeAlpha, 0, 0.85);

    this.darkLayers?.forEach((layer) => {
      layer?.setSize(width, height);
      this.scene.tweens.killTweensOf(layer);
    });
    this.colorGradeOverlay?.setSize(width, height);

    
    
    
    let layerTargets;
    if (requested >= 0.92) {
      layerTargets = [0.90, 0.62, 0.34];
    } else if (requested >= 0.82) {
      layerTargets = [0.78, 0.46, 0.22];
    } else if (requested >= 0.20) {
      layerTargets = [requested, requested * 0.25, 0];
    } else {
      layerTargets = [requested, 0, 0];
    }

    this.darkLayers?.forEach((layer, index) => {
      if (!layer) return;
      this.scene.tweens.add({
        targets: layer,
        alpha: layerTargets[index] || 0,
        duration,
        ease: "Sine.easeInOut"
      });
    });

    if (this.colorGradeOverlay) {
      this.scene.tweens.killTweensOf(this.colorGradeOverlay);
      this.scene.tweens.add({
        targets: this.colorGradeOverlay,
        alpha: nextGrade,
        duration,
        ease: "Sine.easeInOut"
      });
    }
  }

  setCloudCover(alpha, duration = 700) {
    if (!this.cloudGraphics) return;

    this.cloudTargetAlpha = Phaser.Math.Clamp(alpha, 0, 0.92);
    this.cloudGraphics.setVisible(this.cloudTargetAlpha > 0.01 || this.cloudAlpha > 0.01);
    this.scene.tweens.killTweensOf(this.cloudTweenProxy);
    this.cloudTweenProxy.alpha = this.cloudAlpha;

    this.scene.tweens.add({
      targets: this.cloudTweenProxy,
      alpha: this.cloudTargetAlpha,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.cloudAlpha = this.cloudTweenProxy.alpha;
      },
      onComplete: () => {
        this.cloudAlpha = this.cloudTargetAlpha;
        this.cloudGraphics?.setVisible(this.cloudAlpha > 0.01);
      }
    });
  }

  drawClouds(delta = 0) {
    if (!this.cloudGraphics || this.cloudAlpha <= 0.01) {
      this.cloudGraphics?.clear();
      this.cloudGraphics?.setVisible(false);
      return;
    }

    const { width, height } = this.getViewportSize();
    const g = this.cloudGraphics;
    const dt = Math.min(delta || 16, 50) / 1000;
    this.cloudScroll = (this.cloudScroll + dt * (this.phase >= 3 ? 28 : 14)) % 520;

    g.clear();
    g.setVisible(true);

    
    const baseAlpha = Phaser.Math.Clamp(this.cloudAlpha * (this.phase >= 3 ? 0.72 : 0.55), 0, 0.78);
    g.fillStyle(this.phase >= 3 ? 0x05070d : 0x0b111c, baseAlpha);
    g.fillRect(0, 0, width, height);

    
    
    const rows = this.phase >= 3 ? 5 : 4;
    for (let row = 0; row < rows; row++) {
      const y = 52 + row * (height / (rows + 0.7));
      const rowOffset = (row * 173 + this.cloudScroll * (row % 2 ? 0.72 : 1.0)) % 520;
      const color = row % 2 === 0 ? 0x1d2633 : 0x111824;
      const alpha = Phaser.Math.Clamp(this.cloudAlpha * (this.phase >= 3 ? 0.34 : 0.24), 0, 0.42);
      g.fillStyle(color, alpha);

      for (let x = -620 - rowOffset; x < width + 620; x += 260) {
        const radiusX = 150 + (row % 3) * 38;
        const radiusY = 34 + (row % 2) * 18;
        g.fillEllipse(x, y, radiusX * 2.2, radiusY * 2.0);
        g.fillEllipse(x + 94, y - 22, radiusX * 1.8, radiusY * 1.55);
        g.fillEllipse(x + 184, y + 8, radiusX * 1.55, radiusY * 1.35);
      }
    }

    
    if (this.phase >= 3) {
      g.fillStyle(0x000000, Phaser.Math.Clamp(this.cloudAlpha * 0.34, 0, 0.42));
      g.fillRect(0, 0, width, Math.max(170, height * 0.18));
    }
  }

  phaseFlash(color, alpha = 0.24) {
    if (!this.flashOverlay) return;
    const { width, height } = this.getViewportSize();
    this.flashOverlay.setSize(width, height);
    this.scene.tweens.killTweensOf(this.flashOverlay);
    this.flashOverlay.setFillStyle(color, 1).setAlpha(alpha);
    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 650,
      ease: "Sine.easeOut"
    });
  }

  startRain(duration = 900, mode = this.rainMode, targetAlpha = null) {
    if (!this.rainGraphics) return;

    const profile = this.getRainProfile(mode);
    const bounds = this.getRainCanvasBounds();
    this.rainGraphics.setPosition(-bounds.marginX, -bounds.marginY);

    this.rainActive = true;
    this.rainGraphics.setVisible(true);
    this.scene.tweens.killTweensOf(this.rainTweenProxy);
    this.rainTweenProxy.alpha = this.rainAlpha;
    this.rainTargetAlpha = targetAlpha ?? profile.alpha;

    this.scene.tweens.add({
      targets: this.rainTweenProxy,
      alpha: this.rainTargetAlpha,
      duration,
      ease: "Sine.easeOut",
      onUpdate: () => {
        this.rainAlpha = this.rainTweenProxy.alpha;
      },
      onComplete: () => {
        this.rainAlpha = this.rainTargetAlpha;
      }
    });
  }

  stopRain(duration = 500) {
    if (!this.rainGraphics) return;
    this.rainActive = false;
    this.scene.tweens.killTweensOf(this.rainTweenProxy);
    this.rainTweenProxy.alpha = this.rainAlpha;
    this.scene.tweens.add({
      targets: this.rainTweenProxy,
      alpha: 0,
      duration,
      ease: "Sine.easeIn",
      onUpdate: () => {
        this.rainAlpha = this.rainTweenProxy.alpha;
      },
      onComplete: () => {
        this.rainAlpha = 0;
        this.rainGraphics?.clear();
        this.rainGraphics?.setVisible(false);
      }
    });
  }

  enablePlayerGlow() {
    const player = this.scene.player;
    if (!player) return;

    this.playerGlowActive = true;

    if (this.playerOriginalDepth === null) {
      this.playerOriginalDepth = player.depth || 0;
    }

    if (this.playerOriginalTint === null) {
      this.playerOriginalTint = 0xffffff;
    }

    player.setDepth(Math.max(player.depth || 0, 5905));
    player.setTint(0xeaffff);
    this.playerGlow?.setVisible(true);
  }

  disablePlayerGlow() {
    const player = this.scene.player;
    if (player && this.playerOriginalDepth !== null) {
      player.setDepth(this.playerOriginalDepth);
      player.clearTint();
    }

    this.playerGlow?.clear();
    this.playerGlow?.setVisible(false);
    this.playerOriginalDepth = null;
    this.playerOriginalTint = null;
    this.playerGlowActive = false;
  }

  getPlayerGlowProfile() {
    if (this.phase === 3) {
      return {
        depth: 5905,
        tint: 0xeaffff,
        radiusBase: 56,
        radiusPulse: 20,
        outerAlpha: 0.46,
        outerPulse: 0.36,
        innerAlpha: 0.56,
        innerPulse: 0.30,
        fillAlpha: 0.18,
        fillPulse: 0.16,
        lineWidth: 7
      };
    }

    if (this.phase === 2) {
      return {
        depth: 5905,
        tint: 0xf4ffff,
        radiusBase: 48,
        radiusPulse: 13,
        outerAlpha: 0.34,
        outerPulse: 0.24,
        innerAlpha: 0.42,
        innerPulse: 0.20,
        fillAlpha: 0.11,
        fillPulse: 0.10,
        lineWidth: 5
      };
    }

    return {
      depth: 5905,
      tint: 0xffffff,
      radiusBase: 48,
      radiusPulse: 10,
      outerAlpha: 0.34,
      outerPulse: 0.22,
      innerAlpha: 0.46,
      innerPulse: 0.18,
      fillAlpha: 0.09,
      fillPulse: 0.08,
      lineWidth: 5
    };
  }

  updatePlayerGlow(delta) {
    if (!this.playerGlowActive || !this.playerGlow) return;

    const player = this.scene.player;
    if (!player || !player.active) {
      this.playerGlow.clear();
      return;
    }

    const profile = this.getPlayerGlowProfile();

    if ((player.depth || 0) < profile.depth) player.setDepth(profile.depth);
    player.setTint(profile.tint);

    this.playerGlowPhase += Math.min(delta || 16, 40) * 0.016;
    const pulse = 0.5 + 0.5 * Math.sin(this.playerGlowPhase);
    const x = player.x;
    const y = player.y - 8;
    const radius = profile.radiusBase + pulse * profile.radiusPulse;
    const alpha = profile.outerAlpha + pulse * profile.outerPulse;

    this.playerGlow.clear();
    this.playerGlow.lineStyle(profile.lineWidth, 0xbff7ff, alpha);
    this.playerGlow.strokeCircle(x, y, radius);
    this.playerGlow.lineStyle(Math.max(2, profile.lineWidth - 3), 0xffffff, profile.innerAlpha + pulse * profile.innerPulse);
    this.playerGlow.strokeCircle(x, y, radius * 0.56);
    this.playerGlow.fillStyle(0x7df9ff, profile.fillAlpha + pulse * profile.fillPulse);
    this.playerGlow.fillCircle(x, y, radius * 0.78);
  }

  drawRain(delta) {
    if (!this.rainGraphics || this.rainAlpha <= 0.001) return;

    
    
    
    this.rainDrawAccumulator += delta || 16;
    if (this.rainDrawAccumulator < 30) return;
    const drawDelta = this.rainDrawAccumulator;
    this.rainDrawAccumulator = 0;

    const profile = this.getRainProfile();
    const bounds = this.getRainCanvasBounds();
    const dt = Math.min(drawDelta || 30, 60) / 1000;
    const g = this.rainGraphics;

    g.setPosition(-bounds.marginX, -bounds.marginY);
    g.clear();
    g.setVisible(true);
    g.lineStyle(
      profile.lineWidth,
      profile.color,
      Phaser.Math.Clamp(profile.lineAlpha * this.rainAlpha, 0, 1)
    );
    g.beginPath();

    for (const drop of this.rainDrops) {
      drop.x += drop.speedX * dt;
      drop.y += drop.speedY * dt;

      if (drop.y > bounds.drawHeight + 260 || drop.x < -220) {
        drop.x = Phaser.Math.FloatBetween(bounds.marginX * 0.10, bounds.drawWidth + bounds.marginX * 0.30);
        drop.y = Phaser.Math.FloatBetween(-bounds.marginY * 0.8, 0);
      }

      g.moveTo(drop.x, drop.y);
      g.lineTo(drop.x - drop.length * 0.38, drop.y + drop.length);
    }

    g.strokePath();
  }

  update(_, delta) {
    this.updatePlayerGlow(delta);
    this.drawClouds(delta);
    this.drawRain(delta);
  }

  destroy() {
    this.scene.scale.off("resize", this.handleResize, this);
    this.darkLayers?.forEach((layer) => this.scene.tweens.killTweensOf(layer));
    this.scene.tweens.killTweensOf(this.darkOverlay);
    this.scene.tweens.killTweensOf(this.colorGradeOverlay);
    this.scene.tweens.killTweensOf(this.flashOverlay);
    this.scene.tweens.killTweensOf(this.rainTweenProxy);
    this.scene.tweens.killTweensOf(this.cloudTweenProxy);
    this.disablePlayerGlow();
    if (this.screenLayer && this.scene?.destroyScreenSpaceLayer) {
      this.scene.destroyScreenSpaceLayer(this.screenLayer);
    } else {
      this.darkLayers?.forEach((layer) => layer?.destroy());
      this.darkOverlay?.destroy();
      this.colorGradeOverlay?.destroy();
      this.flashOverlay?.destroy();
      this.cloudGraphics?.destroy();
      this.rainGraphics?.destroy();
    }
    this.screenLayer = null;
    this.playerGlow?.destroy();
    this.darkOverlay = null;
    this.darkLayers = [];
    this.colorGradeOverlay = null;
    this.flashOverlay = null;
    this.cloudGraphics = null;
    this.rainGraphics = null;
    this.playerGlow = null;
    this.rainDrops = [];
  }
}
