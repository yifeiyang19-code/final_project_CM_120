export default class BossUiManager {
  constructor(scene) {
    this.scene = scene;

    this.barWidth = 680;
    this.barHeight = 28;
    this.barFillHeight = 16;

    this.currentBarScreenWidth = this.barWidth;

    this.uiDepth = 5200;
    this.blackDepth = 9000;
    this.authDepth = 9002;

    this.bossHudShown = false;
    this.bossIdentityHidden = false;
    this.bossHudElements = [];
    this.playerHudElements = [];
    this.hpCells = [];
    this.cooldownWidgets = [];
    this.lowHealthVignette = null;
    this.lowHealthTween = null;
    this.lowHealthPulseLevel = 0;

    this.bossDisplayName = "@-R4d1-CAT0R";
    this.bossSystemTitle = "Morningstar Port Guardian Network";

    this.phaseSubtitles = {
      1: "Containment Patrol Active",
      2: "Emergency Defense Escalation",
      3: "Final Exclusion Protocol",
      4: "Ultimate Berserk Directive"
    };

    this.phaseColors = {
      1: {
        fill: 0x45d9ff,
        glow: 0x7df9ff,
        stroke: 0x7df9ff,
        name: "#e8fbff",
        subtitle: "#9eeeff",
        back: 0x02080c
      },
      2: {
        fill: 0xff9a2f,
        glow: 0xffc16a,
        stroke: 0xffb04a,
        name: "#fff1dc",
        subtitle: "#ffd39a",
        back: 0x0c0702
      },
      3: {
        fill: 0xff3333,
        glow: 0xff6666,
        stroke: 0xff3d3d,
        name: "#ffe8e8",
        subtitle: "#ff9b9b",
        back: 0x0d0202
      },
      4: {
        fill: 0xffffff,
        glow: 0xff3333,
        stroke: 0xffffff,
        name: "#ffffff",
        subtitle: "#ffd0d0",
        back: 0x110000
      }
    };

    const accessibility = scene.registry.get("gameConfig")?.accessibility || {};
    if (accessibility.colorBlindMode) {
      this.applyColorBlindPalette(accessibility.colorBlindPalette);
    }

    this.hudAlpha = {
      back: 0.46,
      fill: 0.72,
      glow: 0.14,
      name: 0.78,
      subtitle: 0.68
    };
  }

  parseColor(value, fallback) {
    if (typeof value !== "string") return fallback;
    const parsed = Number.parseInt(value.replace(/^0x/, ""), 16);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  resetPhasePalette() {
    this.phaseColors[2].fill = 0xff9a2f;
    this.phaseColors[2].glow = 0xffc16a;
    this.phaseColors[2].stroke = 0xffb04a;
    this.phaseColors[2].name = "#fff1dc";
    this.phaseColors[2].subtitle = "#ffd39a";
    this.phaseColors[2].back = 0x0c0702;

    this.phaseColors[3].fill = 0xff3333;
    this.phaseColors[3].glow = 0xff6666;
    this.phaseColors[3].stroke = 0xff3d3d;
    this.phaseColors[3].name = "#ffe8e8";
    this.phaseColors[3].subtitle = "#ff9b9b";
    this.phaseColors[3].back = 0x0d0202;
  }

  applyColorBlindPalette(palette = {}) {
    const phase2 = palette.phase2 || {};
    const phase3 = palette.phase3 || {};

    this.phaseColors[2].fill = this.parseColor(phase2.fill, 0xe6d04a);
    this.phaseColors[2].glow = this.parseColor(phase2.glow, 0xf6e58d);
    this.phaseColors[2].stroke = this.parseColor(phase2.stroke, 0xe6d04a);
    this.phaseColors[2].subtitle = phase2.subtitle || "#fff0a8";

    this.phaseColors[3].fill = this.parseColor(phase3.fill, 0xb56cff);
    this.phaseColors[3].glow = this.parseColor(phase3.glow, 0xd8b4ff);
    this.phaseColors[3].stroke = this.parseColor(phase3.stroke, 0xb56cff);
    this.phaseColors[3].subtitle = phase3.subtitle || "#e1c4ff";
  }

  create() {
    this.blackScreen = this.scene.add.rectangle(0, 0, 10, 10, 0x000000)
      .setOrigin(0.5)
      .setDepth(this.blackDepth)
      .setAlpha(1);

    this.authText = this.scene.add.text(0, 0, "", {
      fontSize: "42px",
      color: "#dff8ff",
      fontFamily: "'Cinzel', 'Marcellus SC', serif",
      fontStyle: "bold",
      align: "center",
      stroke: "#001018",
      strokeThickness: 9
    })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(this.authDepth);

    this.bossBarBack = this.scene.add.rectangle(
      0,
      0,
      this.barWidth,
      this.barHeight,
      this.phaseColors[1].back,
      this.hudAlpha.back
    )
      .setOrigin(0.5)
      .setDepth(this.uiDepth);

    this.bossBarBack.setStrokeStyle(3, this.phaseColors[1].stroke, 0.58);

    this.bossBarFill = this.scene.add.rectangle(
      0,
      0,
      this.barWidth,
      this.barFillHeight,
      this.phaseColors[1].fill,
      this.hudAlpha.fill
    )
      .setOrigin(0, 0.5)
      .setDepth(this.uiDepth + 1);

    this.bossBarGlow = this.scene.add.rectangle(
      0,
      0,
      this.barWidth,
      22,
      this.phaseColors[1].glow,
      this.hudAlpha.glow
    )
      .setOrigin(0, 0.5)
      .setDepth(this.uiDepth + 0.5);

    this.bossNameText = this.scene.add.text(0, 0, this.bossDisplayName, {
      fontSize: "24px",
      color: this.phaseColors[1].name,
      fontFamily: "'Cinzel', 'Marcellus SC', serif",
      fontStyle: "bold",
      letterSpacing: 2,
      stroke: "#001018",
      strokeThickness: 6
    })
      .setOrigin(0.5)
      .setAlpha(this.hudAlpha.name)
      .setDepth(this.uiDepth + 2);

    this.bossSubtitleText = this.scene.add.text(
      0,
      0,
      `${this.bossSystemTitle} // ${this.phaseSubtitles[1]}`,
      {
        fontSize: "14px",
        color: this.phaseColors[1].subtitle,
        fontFamily: "'Marcellus SC', 'Cinzel', serif",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3
      }
    )
      .setOrigin(0.5)
      .setAlpha(this.hudAlpha.subtitle)
      .setDepth(this.uiDepth + 2);

    this.phaseText = this.scene.add.text(0, 0, "", {
      fontSize: "88px",
      color: "#ffffff",
      fontFamily: "'Cinzel', 'Marcellus SC', serif",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 12
    })
      .setOrigin(0.5)
      .setDepth(9200)
      .setAlpha(0);

    this.phaseSubText = this.scene.add.text(0, 0, "", {
      fontSize: "40px",
      color: "#dff8ff",
      fontFamily: "'Marcellus SC', 'Cinzel', serif",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 8
    })
      .setOrigin(0.5)
      .setDepth(9200)
      .setAlpha(0);

    this.createPlayerHud();
    this.createAbilityCooldownHud();
    this.createLowHealthVignette();

    this.gameOverText = this.scene.add.text(0, 0, "", {
      fontSize: "56px",
      color: "#ffffff",
      fontFamily: "'Cinzel', 'Marcellus SC', serif",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 10
    })
      .setOrigin(0.5)
      .setDepth(9300)
      .setAlpha(0);

    this.bossHudElements = [
      { object: this.bossBarBack, alpha: this.hudAlpha.back },
      { object: this.bossBarFill, alpha: this.hudAlpha.fill },
      { object: this.bossBarGlow, alpha: this.hudAlpha.glow },
      { object: this.bossNameText, alpha: this.hudAlpha.name },
      { object: this.bossSubtitleText, alpha: this.hudAlpha.subtitle }
    ];

    this.registerResizeHandler();
    this.layout();
    this.hideBossHud(0);

    return this;
  }

  createPlayerHud() {
    this.playerHudPanel = this.scene.add.image(0, 0, "hud_panel")
      .setOrigin(0, 0.5)
      .setDepth(this.uiDepth + 8)
      .setAlpha(0.72);

    this.playerHudLabel = this.scene.add.text(0, 0, "CORE INTEGRITY", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d8fbff",
      stroke: "#001319",
      strokeThickness: 3
    })
      .setOrigin(0, 0.5)
      .setDepth(this.uiDepth + 9);

    this.playerHudElements = [this.playerHudPanel, this.playerHudLabel];
    this.hpCells = [];

    for (let i = 0; i < 6; i++) {
      const cell = this.scene.add.image(0, 0, "hp_cell")
        .setOrigin(0.5)
        .setDepth(this.uiDepth + 9)
        .setAlpha(0);
      this.hpCells.push(cell);
      this.playerHudElements.push(cell);
    }
  }


  createLowHealthVignette() {
    const makeEdge = () => this.scene.add.rectangle(0, 0, 10, 10, 0xff1d1d, 0)
      .setOrigin(0, 0)
      .setDepth(this.uiDepth + 18)
      .setVisible(false);

    this.lowHealthVignette = [makeEdge(), makeEdge(), makeEdge(), makeEdge()];

    for (const edge of this.lowHealthVignette) {
      edge.setBlendMode?.(Phaser.BlendModes.ADD);
    }
  }

  layoutLowHealthVignette() {
    if (!Array.isArray(this.lowHealthVignette)) return;

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const thickness = 54;
    const [top, bottom, left, right] = this.lowHealthVignette;

    const zoom = this.getZoom();
    const topLeft = this.screenToWorld(0, 0);
    const bottomLeft = this.screenToWorld(0, height - thickness);
    const rightTop = this.screenToWorld(width - thickness, 0);

    top?.setPosition(topLeft.x, topLeft.y).setSize(width / zoom, thickness / zoom);
    bottom?.setPosition(bottomLeft.x, bottomLeft.y).setSize(width / zoom, thickness / zoom);
    left?.setPosition(topLeft.x, topLeft.y).setSize(thickness / zoom, height / zoom);
    right?.setPosition(rightTop.x, rightTop.y).setSize(thickness / zoom, height / zoom);
  }

  updateLowHealthVignette(hp, maxHp) {
    if (!Array.isArray(this.lowHealthVignette)) return;

    this.layoutLowHealthVignette();

    const active = hp > 0 && hp <= Math.min(2, maxHp) && !this.scene.gameOver;
    if (!active) {
      this.lowHealthPulseLevel = 0;
      if (this.lowHealthTween) {
        this.lowHealthTween.stop();
        this.lowHealthTween = null;
      }
      for (const edge of this.lowHealthVignette) {
        edge?.setVisible(false).setAlpha(0);
      }
      return;
    }

    const level = hp <= 1 ? 1 : 2;
    if (this.lowHealthPulseLevel === level && this.lowHealthTween) return;

    this.lowHealthPulseLevel = level;
    if (this.lowHealthTween) {
      this.lowHealthTween.stop();
      this.lowHealthTween = null;
    }

    const duration = hp <= 1 ? 360 : 780;
    const alpha = hp <= 1 ? 0.32 : 0.18;
    for (const edge of this.lowHealthVignette) {
      edge?.setVisible(true).setAlpha(alpha * 0.45);
    }

    this.lowHealthTween = this.scene.tweens.add({
      targets: this.lowHealthVignette,
      alpha,
      duration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  createAbilityCooldownHud() {
    const makeWidget = (key, label, subLabel) => {
      const box = this.scene.add.rectangle(0, 0, 92, 66, 0x061017, 0.76)
        .setOrigin(0.5)
        .setDepth(this.uiDepth + 10)
        .setStrokeStyle(2, 0x7df9ff, 0.55)
        .setAlpha(0.72);

      const title = this.scene.add.text(0, 0, label, {
        fontFamily: "monospace",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#e9fbff",
        stroke: "#001018",
        strokeThickness: 3,
        align: "center"
      }).setOrigin(0.5).setDepth(this.uiDepth + 11);

      const value = this.scene.add.text(0, 0, "READY", {
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#9eeeff",
        stroke: "#001018",
        strokeThickness: 3,
        align: "center"
      }).setOrigin(0.5).setDepth(this.uiDepth + 11);

      const sub = this.scene.add.text(0, 0, subLabel, {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#b9d7df",
        stroke: "#001018",
        strokeThickness: 2,
        align: "center"
      }).setOrigin(0.5).setDepth(this.uiDepth + 11);

      const widget = { key, box, title, value, sub };
      this.cooldownWidgets.push(widget);
      return widget;
    };

    makeWidget("dashH", "Cryward", "A/D x2 rush");
    makeWidget("dashV", "Unfallen", "W/S x2 leap");
    makeWidget("blink", "Re-leave", "Q blink");
  }

  getCamera() {
    return this.scene.cameras.main;
  }

  getZoom() {
    const cam = this.getCamera();
    return cam && cam.zoom ? cam.zoom : 1;
  }

  screenToWorld(screenX, screenY) {
    const cam = this.getCamera();
    const zoom = this.getZoom();
    const view = cam.worldView;

    return {
      x: view.left + screenX / zoom,
      y: view.top + screenY / zoom
    };
  }

  screenSizeToWorld(screenSize) {
    return screenSize / this.getZoom();
  }

  setScreenTextScale(text) {
    if (!text) return;
    text.setScale(1 / this.getZoom());
  }

  registerResizeHandler() {
    this.scene.scale.off("resize", this.handleResize, this);
    this.scene.scale.on("resize", this.handleResize, this);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off("resize", this.handleResize, this);
    });
  }

  handleResize() {
    this.layout();
  }

  layout() {
    const cam = this.getCamera();
    const view = cam.worldView;

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.layoutBlackScreen(view);

    const bossBarY = height - 38;
    const bossNameY = height - 88;
    const bossSubtitleY = height - 64;

    const barCenter = this.screenToWorld(width / 2, bossBarY);
    const barLeft = this.screenToWorld(width / 2 - this.barWidth / 2, bossBarY);
    const bossNamePos = this.screenToWorld(width / 2, bossNameY);
    const bossSubtitlePos = this.screenToWorld(width / 2, bossSubtitleY);

    const authPos = this.screenToWorld(width / 2, height * 0.22);
    const phasePos = this.screenToWorld(width / 2, height * 0.17);
    const phaseSubPos = this.screenToWorld(width / 2, height * 0.27);
    const gameOverPos = this.screenToWorld(width / 2, height / 2 - 60);

    if (this.authText) {
      this.authText.setPosition(authPos.x, authPos.y);
      this.setScreenTextScale(this.authText);
    }

    if (this.bossBarBack) {
      this.bossBarBack.setPosition(barCenter.x, barCenter.y);
      this.bossBarBack.setSize(
        this.screenSizeToWorld(this.barWidth),
        this.screenSizeToWorld(this.barHeight)
      );
    }

    if (this.bossBarFill) {
      this.bossBarFill.setPosition(barLeft.x, barLeft.y);
      this.bossBarFill.setSize(
        this.screenSizeToWorld(this.currentBarScreenWidth),
        this.screenSizeToWorld(this.barFillHeight)
      );
    }

    if (this.bossBarGlow) {
      this.bossBarGlow.setPosition(barLeft.x, barLeft.y);
      this.bossBarGlow.setSize(
        this.screenSizeToWorld(this.currentBarScreenWidth),
        this.screenSizeToWorld(22)
      );
    }

    if (this.bossNameText) {
      this.bossNameText.setPosition(bossNamePos.x, bossNamePos.y);
      this.setScreenTextScale(this.bossNameText);
    }

    if (this.bossSubtitleText) {
      this.bossSubtitleText.setPosition(bossSubtitlePos.x, bossSubtitlePos.y);
      this.setScreenTextScale(this.bossSubtitleText);
    }

    if (this.phaseText) {
      this.phaseText.setPosition(phasePos.x, phasePos.y);
      this.setScreenTextScale(this.phaseText);
    }

    if (this.phaseSubText) {
      this.phaseSubText.setPosition(phaseSubPos.x, phaseSubPos.y);
      this.setScreenTextScale(this.phaseSubText);
    }

    if (this.gameOverText) {
      this.gameOverText.setPosition(gameOverPos.x, gameOverPos.y);
      this.setScreenTextScale(this.gameOverText);
    }

    this.layoutPlayerHud(width, height);
    this.layoutAbilityCooldownHud(width, height);
  }

  layoutPlayerHud(width, height) {
    const panelPos = this.screenToWorld(24, 46);
    const labelPos = this.screenToWorld(46, 25);

    if (this.playerHudPanel) {
      this.playerHudPanel.setPosition(panelPos.x, panelPos.y);
      this.playerHudPanel.setScale(1 / this.getZoom());
    }

    if (this.playerHudLabel) {
      this.playerHudLabel.setPosition(labelPos.x, labelPos.y);
      this.setScreenTextScale(this.playerHudLabel);
    }

    this.hpCells.forEach((cell, index) => {
      const cellPos = this.screenToWorld(52 + index * 36, 54);
      cell.setPosition(cellPos.x, cellPos.y);
      cell.setScale(1 / this.getZoom());
    });
  }

  layoutAbilityCooldownHud(width, height) {
    if (!this.cooldownWidgets?.length) return;

    this.cooldownWidgets.forEach((widget, index) => {
      const screenX = 64 + index * 104;
      const screenY = 118;
      const pos = this.screenToWorld(screenX, screenY);
      const zoomScale = 1 / this.getZoom();

      widget.box.setPosition(pos.x, pos.y).setScale(zoomScale);
      widget.title.setPosition(pos.x, pos.y - 19 / this.getZoom()).setScale(zoomScale);
      widget.value.setPosition(pos.x, pos.y + 5 / this.getZoom()).setScale(zoomScale);
      widget.sub.setPosition(pos.x, pos.y + 24 / this.getZoom()).setScale(zoomScale);
    });
  }

  layoutBlackScreen(view) {
    if (!this.blackScreen) return;

    const padding = 2400;

    this.blackScreen.setPosition(view.centerX, view.centerY);
    this.blackScreen.setSize(view.width + padding, view.height + padding);
  }

  setBossHudAlpha(multiplier = 1) {
    for (const item of this.bossHudElements) {
      if (!item.object || !item.object.active) continue;
      item.object.setAlpha(item.alpha * multiplier);
    }
  }

  hideBossHud(duration = 0) {
    this.bossHudShown = false;

    for (const item of this.bossHudElements) {
      if (!item.object || !item.object.active) continue;

      this.scene.tweens.killTweensOf(item.object);

      if (duration <= 0) {
        item.object.setAlpha(0);
        continue;
      }

      this.scene.tweens.add({
        targets: item.object,
        alpha: 0,
        duration,
        ease: "Sine.easeOut"
      });
    }
  }

  showBossHud(duration = 700) {
    this.bossHudShown = true;
    this.bossIdentityHidden = false;
    this.layout();

    for (const item of this.bossHudElements) {
      if (!item.object || !item.object.active) continue;

      this.scene.tweens.killTweensOf(item.object);
      item.object.setAlpha(0);

      this.scene.tweens.add({
        targets: item.object,
        alpha: item.alpha,
        duration,
        ease: "Sine.easeOut"
      });
    }
  }

  fadeBossIdentity(duration = 700) {
    this.bossIdentityHidden = true;
    const targets = [this.bossNameText, this.bossSubtitleText].filter((obj) => obj && obj.active);
    if (!targets.length) return;

    this.scene.tweens.killTweensOf(targets);
    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration,
      ease: "Sine.easeOut"
    });
  }

  showBossIdentity(duration = 500) {
    this.bossIdentityHidden = false;
    const targets = [this.bossNameText, this.bossSubtitleText].filter((obj) => obj && obj.active);
    if (!targets.length) return;

    this.scene.tweens.killTweensOf(targets);
    this.scene.tweens.add({
      targets: this.bossNameText,
      alpha: this.hudAlpha.name,
      duration,
      ease: "Sine.easeOut"
    });
    this.scene.tweens.add({
      targets: this.bossSubtitleText,
      alpha: this.hudAlpha.subtitle,
      duration,
      ease: "Sine.easeOut"
    });
  }

  update(bossIntegrity, bossMaxIntegrity, bossPhase) {
    if (!this.bossBarFill) return;

    const phase = Phaser.Math.Clamp(bossPhase || 1, 1, 4);
    const colors = this.phaseColors[phase];

    const hpRatio = Phaser.Math.Clamp(bossIntegrity / bossMaxIntegrity, 0, 1);
    this.currentBarScreenWidth = this.barWidth * hpRatio;

    this.layout();

    this.bossBarBack.fillColor = colors.back;
    this.bossBarBack.setStrokeStyle(3, colors.stroke, 0.58);

    this.bossBarFill.fillColor = colors.fill;
    this.bossBarGlow.fillColor = colors.glow;

    this.bossNameText.setText(this.bossDisplayName);
    this.bossNameText.setColor(colors.name);

    this.bossSubtitleText.setText(
      `${this.bossSystemTitle} // ${this.phaseSubtitles[phase]}`
    );
    this.bossSubtitleText.setColor(colors.subtitle);

    this.updatePlayerHud();
    this.updateAbilityCooldownHud();

    if (this.bossIdentityHidden) {
      this.bossNameText?.setAlpha?.(0);
      this.bossSubtitleText?.setAlpha?.(0);
    }

    if (!this.bossHudShown) {
      this.setBossHudAlpha(0);
    }
  }

  updateAbilityCooldownHud() {
    if (!this.cooldownWidgets?.length) return;

    const scene = this.scene;
    const hidden = scene.controlsLocked || scene.gameOver;
    this.cooldownWidgets.forEach((widget) => {
      widget.box.setVisible(!hidden);
      widget.title.setVisible(!hidden);
      widget.value.setVisible(!hidden);
      widget.sub.setVisible(!hidden);
    });
    if (hidden) return;

    const pc = scene.playerController;
    const dash = pc?.directionalDash;
    const blink = pc?.blinkAbility;
    const now = scene.time?.now || 0;

    const cooldownState = {
      dashH: this.getCooldownDisplay(now, dash?.lastDash?.horizontal, pc?.config?.dashCooldownHorizontal),
      dashV: this.getCooldownDisplay(now, Math.max(dash?.lastDash?.up ?? -99999, dash?.lastDash?.down ?? -99999), Math.max(pc?.config?.dashCooldownUp ?? 0, pc?.config?.dashCooldownDown ?? 0)),
      blink: this.getCooldownDisplay(now, blink?.lastBlinkTime, pc?.config?.blinkCooldown)
    };

    this.cooldownWidgets.forEach((widget) => {
      const state = cooldownState[widget.key] || { ready: true, text: "READY" };
      widget.value.setText(state.text);
      widget.value.setColor(state.ready ? "#baffba" : "#ffd39a");
      widget.box.setAlpha(state.ready ? 0.78 : 0.48);
    });
  }

  getCooldownDisplay(now, lastUsed = -99999, cooldown = 0) {
    if (!Number.isFinite(lastUsed) || !Number.isFinite(cooldown) || cooldown <= 0) {
      return { ready: true, text: "READY" };
    }

    const remainingMs = Math.max(0, cooldown - (now - lastUsed));
    if (remainingMs <= 0) return { ready: true, text: "READY" };
    return { ready: false, text: `${Math.ceil(remainingMs / 1000)}s` };
  }

  updatePlayerHud() {
    const hp = Math.max(0, this.scene.playerHp || 0);
    const maxHp = Math.max(1, this.scene.playerMaxHp || 1);

    this.updateLowHealthVignette(hp, maxHp);

    this.hpCells.forEach((cell, index) => {
      if (!cell || !cell.active) return;
      cell.setVisible(index < maxHp);
      cell.setAlpha(index < hp ? 0.92 : 0.18);
    });
  }

  forceBlackScreenVisible() {
    if (!this.blackScreen) return;

    this.layout();
    this.blackScreen.setAlpha(1);
    this.blackScreen.setDepth(this.blackDepth);
  }

  showGameOver(text, duration = 700) {
    this.layout();
    this.gameOverText.setText(text);

    this.scene.tweens.add({
      targets: this.gameOverText,
      alpha: 1,
      duration,
      ease: "Linear"
    });
  }

  fadeAuthTextOut(duration = 700) {
    this.scene.tweens.add({
      targets: this.authText,
      alpha: 0,
      duration,
      ease: "Linear"
    });
  }

  hideGameOver(duration = 300) {
    this.scene.tweens.add({
      targets: this.gameOverText,
      alpha: 0,
      duration,
      ease: "Linear"
    });
  }
}
