export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.state = "mainMenu";
    this.isTransitioning = false;
    this.canEnterBossScene = false;

    this.viewportWidth = this.scale.width || 1280;
    this.viewportHeight = this.scale.height || 720;
    this.groundY = this.viewportHeight * 0.79;

    this.torches = [];
    this.rainLines = [];
    this.portalParticles = [];
    this.activeTree = null;
    this.lastDPressTime = -9999;
    this.wasDDown = false;
    this.portalOpened = false;
    this.portalReady = false;
    this.treeTutorialComplete = false;
    this.pointerStart = null;
    this.tutorialTorch = null;
    this.tutorialTree = null;
    this.crawlSpeed = 82;
    this.portalThresholdX = this.viewportWidth * 0.72;
    this.nextAmbientSparkTime = 0;
    this.nextWarningJoltTime = 0;
    this.lastATapTime = -9999;
    this.lastWTapTime = -9999;
    this.wasADown = false;
    this.wasWDown = false;
    this.wasQDown = false;
    this.wasSpaceDown = false;
    this.openingTutorialStepDone = false;

    this.cameras.main.setBounds(0, 0, this.viewportWidth, this.viewportHeight);
    this.physics.world.setBounds(0, 0, this.viewportWidth, this.viewportHeight);

    this.createLayers();
    this.createEmptyLand();
    this.createHero();
    this.createPortal();
    this.createText();
    this.createInputs();
    this.createMainMenuOverlay();
    this.startMenuBgm();

    this.cameras.main.fadeIn(700, 0, 0, 0);
  }

  createMainMenuOverlay() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const cx = w * 0.5;

    this.mainMenuOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(2000);
    const shade = this.add.rectangle(0, 0, w, h, 0x000000, 0.78).setOrigin(0, 0);
    const title = this.add.text(cx, 108, "MORNINGSTAR PORT", {
      fontFamily: "monospace",
      fontSize: "62px",
      color: "#f2fbff",
      fontStyle: "bold",
      align: "center",
      stroke: "#001018",
      strokeThickness: 12
    }).setOrigin(0.5);
    const subtitle = this.add.text(cx, 171, "THE @-R4d1-CAT0R", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#b8f7ff",
      align: "center",
      stroke: "#001018",
      strokeThickness: 7
    }).setOrigin(0.5);
    const panel = this.add.rectangle(cx, 332, 980, 196, 0x06131b, 0.9)
      .setStrokeStyle(4, 0xb8f7ff, 0.78);
    const condition = this.add.text(cx, 332, [
      "VICTORY CONDITION",
      "Survive the four-phase guardian fight.",
      "Use dash, blink, ladders, health packs, and white trees.",
      "White trees can block Holy Clearance and hostile projectiles.",
      "Defeat the final protocol and endure the self-destruction sequence."
    ].join("\n"), {
      fontFamily: "monospace",
      fontSize: "23px",
      color: "#e8fbff",
      align: "center",
      lineSpacing: 10,
      stroke: "#001018",
      strokeThickness: 5,
      wordWrap: { width: 900 }
    }).setOrigin(0.5);

    const start = this.makeMainMenuButton(cx - 190, 540, 300, 72, "START GAME", () => this.beginStoryFromMainMenu());
    const training = this.makeMainMenuButton(cx + 190, 540, 300, 72, "TRAINING", () => this.enterTrainingScene());
    const hint = this.add.text(cx, 622, "ENTER: Start Story     T: Training", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#d8f8ff",
      align: "center",
      stroke: "#001018",
      strokeThickness: 5
    }).setOrigin(0.5);

    this.mainMenuOverlay.add([shade, title, subtitle, panel, condition, ...start, ...training, hint]);
    this.input.keyboard.on("keydown-T", () => {
      if (this.state === "mainMenu") this.enterTrainingScene();
    });
  }

  makeMainMenuButton(x, y, w, h, label, callback) {
    const rect = this.add.rectangle(x, y, w, h, 0x08202c, 0.95)
      .setStrokeStyle(4, 0xb8f7ff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 7
    }).setOrigin(0.5);

    rect.on("pointerover", () => rect.setFillStyle(0x14506a, 1));
    rect.on("pointerout", () => rect.setFillStyle(0x08202c, 0.95));
    rect.on("pointerdown", callback);
    return [rect, text];
  }

  beginStoryFromMainMenu() {
    if (this.isTransitioning || this.state !== "mainMenu") return;
    const overlay = this.mainMenuOverlay;
    this.mainMenuOverlay = null;
    if (overlay) {
      this.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 260,
        ease: "Sine.easeOut",
        onComplete: () => overlay.destroy()
      });
    }
    this.startPlayableOpening();
  }


  createMenuUtilityButtons() {
    if (this.menuUtilityButtonsCreated) return;
    this.menuUtilityButtonsCreated = true;
    const makeButton = (x, y, label, callback) => {
      const rect = this.add.rectangle(x, y, 168, 44, 0x062536, 0.92)
        .setScrollFactor(0)
        .setDepth(101)
        .setStrokeStyle(3, 0xb8f7ff, 0.88)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#001018",
        strokeThickness: 5
      }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
      rect.on("pointerover", () => rect.setFillStyle(0x14506a, 1));
      rect.on("pointerout", () => rect.setFillStyle(0x062536, 0.92));
      rect.on("pointerdown", callback);
      return { rect, text };
    };

    const bottomY = this.viewportHeight - 34;
    makeButton(104, bottomY, "SETTINGS", () => this.showSettingsPanel());
    makeButton(288, bottomY, "TRAINING", () => this.enterTrainingScene());
    makeButton(472, bottomY, "SKIP STORY", () => this.skipOpeningStory());

    this.createSettingsPanel();
  }

  createSettingsPanel() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const panelW = 560;
    const panelH = 330;
    const x = w * 0.5;
    const y = h * 0.5;

    this.settingsPanel = this.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false);

    const shade = this.add.rectangle(0, 0, w, h, 0x000000, 0.62).setOrigin(0, 0).setInteractive();
    const panel = this.add.rectangle(x, y, panelW, panelH, 0x02070b, 0.95)
      .setStrokeStyle(3, 0x8ee8ff, 0.72);
    const title = this.add.text(x, y - panelH / 2 + 42, "SETTINGS", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#e8fbff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 6
    }).setOrigin(0.5);

    this.settingsInfoText = this.add.text(x - panelW / 2 + 42, y - 76, "", {
      fontFamily: "monospace",
      fontSize: "17px",
      color: "#dff8ff",
      lineSpacing: 9,
      stroke: "#001018",
      strokeThickness: 3
    }).setOrigin(0, 0);

    this.settingsPanel.add([shade, panel, title, this.settingsInfoText]);

    const makePanelButton = (bx, by, bw, label, callback) => {
      const rect = this.add.rectangle(bx, by, bw, 42, 0x08202c, 0.94)
        .setStrokeStyle(2, 0x8ee8ff, 0.62)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(bx, by, label, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#e8fbff",
        fontStyle: "bold",
        stroke: "#001018",
        strokeThickness: 4
      }).setOrigin(0.5);
      rect.on("pointerover", () => rect.setFillStyle(0x12384a, 0.98));
      rect.on("pointerout", () => rect.setFillStyle(0x08202c, 0.94));
      rect.on("pointerdown", callback);
      this.settingsPanel.add([rect, text]);
    };

    makePanelButton(x - 170, y + 78, 150, "SHAKE", () => this.cycleMenuScreenShakeSetting());
    makePanelButton(x, y + 78, 150, "COLOR", () => this.toggleMenuColorBlindSetting());
    makePanelButton(x + 170, y + 78, 150, "BGM VOL", () => this.cycleMenuBossBgmVolumeSetting());
    makePanelButton(x, y + 136, 180, "CLOSE", () => this.hideSettingsPanel());

    this.refreshSettingsPanel();
  }

  showSettingsPanel() {
    if (!this.settingsPanel) return;
    this.isSettingsOpen = true;
    this.time.timeScale = 0;
    this.refreshSettingsPanel();
    this.settingsPanel.setVisible(true);
  }

  hideSettingsPanel() {
    this.isSettingsOpen = false;
    this.time.timeScale = 1;
    this.settingsPanel?.setVisible(false);
  }

  getRuntimeConfig() {
    const config = this.registry.get("gameConfig") || {};
    config.accessibility = config.accessibility || {};
    config.audio = config.audio || {};
    config.audio.bgm = config.audio.bgm || {};
    return config;
  }

  refreshSettingsPanel() {
    if (!this.settingsInfoText) return;
    const config = this.getRuntimeConfig();
    const shake = Number.isFinite(config.accessibility.screenShakeMultiplier) ? config.accessibility.screenShakeMultiplier : 1;
    const colorMode = config.accessibility.colorBlindMode ? "ON" : "OFF";
    const bgm = Number.isFinite(config.audio.bgm.volume) ? config.audio.bgm.volume : 0.28;
    this.settingsInfoText.setText([
      "These settings also apply inside the Boss fight.",
      `Screen shake multiplier: ${shake}`,
      `Color-blind phase palette: ${colorMode}`,
      `Boss BGM volume: ${Math.round(bgm * 100)}%`,
      "Use TRAINING to practice one Boss skill at a time."
    ].join("\n"));
  }

  cycleMenuScreenShakeSetting() {
    const config = this.getRuntimeConfig();
    const values = [0, 0.5, 1, 1.5, 2];
    const current = Number.isFinite(config.accessibility.screenShakeMultiplier) ? config.accessibility.screenShakeMultiplier : 1;
    const index = values.findIndex((value) => Math.abs(value - current) < 0.01);
    config.accessibility.screenShakeMultiplier = values[(index + 1 + values.length) % values.length];
    localStorage.setItem("morningstarScreenShakeMultiplier", String(config.accessibility.screenShakeMultiplier));
    this.registry.set("gameConfig", config);
    this.refreshSettingsPanel();
  }

  toggleMenuColorBlindSetting() {
    const config = this.getRuntimeConfig();
    config.accessibility.colorBlindMode = !config.accessibility.colorBlindMode;
    localStorage.setItem("morningstarColorBlindMode", config.accessibility.colorBlindMode ? "1" : "0");
    this.registry.set("gameConfig", config);
    this.refreshSettingsPanel();
  }

  cycleMenuBossBgmVolumeSetting() {
    const config = this.getRuntimeConfig();
    const values = [0, 0.14, 0.28, 0.42, 0.56];
    const current = Number.isFinite(config.audio.bgm.volume) ? config.audio.bgm.volume : 0.28;
    const index = values.findIndex((value) => Math.abs(value - current) < 0.015);
    config.audio.bgm.volume = values[(index + 1 + values.length) % values.length];
    localStorage.setItem("morningstarBossBgmVolume", String(config.audio.bgm.volume));
    this.registry.set("gameConfig", config);
    this.refreshSettingsPanel();
  }


  skipOpeningStory() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.time.timeScale = 1;
    this.stopMenuBgm(true);
    this.tweens.killAll();
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("BossScene", { restartReason: "skipOpening" });
    });
  }

  enterTrainingScene() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.time.timeScale = 1;
    this.stopMenuBgm(true);
    this.tweens.killAll();
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("TrainingScene");
    });
  }

  startMenuBgm() {
    try {
      if (!this.sound || !this.cache.audio.exists("bgm_menu_weight_of_stone")) return;
      this.menuBgm = this.sound.add("bgm_menu_weight_of_stone", {
        volume: 0.0,
        loop: true
      });
      this.menuBgm.play();
      this.tweens.add({
        targets: this.menuBgm,
        volume: 0.34,
        duration: 1200,
        ease: "Sine.easeInOut"
      });
    } catch (_error) {
    }
  }

  stopMenuBgm(immediate = false) {
    if (!this.menuBgm) return;
    const bgm = this.menuBgm;
    this.menuBgm = null;

    if (immediate) {
      try {
        bgm.stop();
        bgm.destroy();
      } catch (_error) {
      }
      return;
    }

    this.tweens.add({
      targets: bgm,
      volume: 0,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        try {
          bgm.stop();
          bgm.destroy();
        } catch (_error) {
        }
      }
    });
  }

  createLayers() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    this.bgLayer = this.add.container(0, 0).setDepth(-50);
    this.worldLayer = this.add.container(0, 0).setDepth(0);
    this.fxLayer = this.add.container(0, 0).setDepth(30);
    this.rainLayer = this.add.graphics().setDepth(55).setScrollFactor(0).setAlpha(0);
    this.textLayer = this.add.container(0, 0).setDepth(90);

    this.flashLayer = this.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setOrigin(0, 0)
      .setDepth(115)
      .setScrollFactor(0);

    this.huntFlashLayer = this.add.rectangle(0, 0, w, h, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(86)
      .setScrollFactor(0);

    this.fadeLayer = this.add.rectangle(0, 0, w, h, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(120)
      .setScrollFactor(0);
  }

  createEmptyLand() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    this.menuBackground = this.add.image(w * 0.5, h * 0.5, "menu_last_moment_bg")
      .setOrigin(0.5)
      .setDepth(-60);

    this.fitImageToViewport(this.menuBackground, w, h);

    this.menuBackgroundShade = this.add.rectangle(0, 0, w, h, 0x020308, 0.26)
      .setOrigin(0, 0)
      .setDepth(-55);

    this.leftHeatHaze = this.add.rectangle(0, 0, w * 0.38, h, 0x2d0602, 0.16)
      .setOrigin(0, 0)
      .setDepth(-54);

    this.portalColdGlow = this.add.rectangle(w * 0.73, 0, w * 0.35, h, 0x08233c, 0.12)
      .setOrigin(0, 0)
      .setDepth(-53);

    this.vignette = this.add.rectangle(0, 0, w, h, 0x000000, 0.40)
      .setOrigin(0, 0)
      .setDepth(40)
      .setScrollFactor(0);

    this.bgLayer.add([
      this.menuBackground,
      this.menuBackgroundShade,
      this.leftHeatHaze,
      this.portalColdGlow
    ]);
  }

  fitImageToViewport(image, viewportWidth, viewportHeight) {
    const texture = this.textures.get(image.texture.key);
    const source = texture && texture.getSourceImage ? texture.getSourceImage() : null;
    const imageWidth = source?.width || viewportWidth;
    const imageHeight = source?.height || viewportHeight;
    const coverScale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight);

    image.setScale(coverScale);
  }

  createHero() {
    this.hero = this.add.sprite(this.viewportWidth * 0.13, this.groundY - 34, "player_hurt", 0)
      .setScale(1.08)
      .setAngle(-7)
      .setTint(0xe8f7ff)
      .setDepth(12);

    if (this.anims.exists("player_hurt_anim")) {
      this.hero.play("player_hurt_anim");
    }

    this.heroShadow = this.add.ellipse(this.hero.x + 8, this.groundY + 26, 100, 18, 0x000000, 0.46)
      .setDepth(9);

    this.heroRootGlow = this.add.graphics().setDepth(13).setAlpha(0.6);
    this.drawWeakRoot(this.heroRootGlow, this.hero.x + 18, this.groundY + 6, 0.7);
  }

  createPortal() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    this.portalTargetX = w + 95;
    this.portalX = w + 245;
    this.portalY = h * 0.53;
    this.portalMotion = { x: this.portalX };

    this.portalBack = this.add.ellipse(this.portalX, this.portalY, 190, 470, 0x02040a, 0).setDepth(5);
    this.portalGlow = this.add.ellipse(this.portalX, this.portalY, 250, 560, 0x3b8cff, 0).setDepth(6);
    this.portalCore = this.add.ellipse(this.portalX, this.portalY, 40, 205, 0x9feaff, 0).setDepth(7);
    this.portalRing = this.add.graphics().setDepth(18).setAlpha(0);
    this.portalParticleGraphics = this.add.graphics().setDepth(19).setAlpha(0);

    for (let i = 0; i < 72; i++) {
      this.portalParticles.push({
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        radius: Phaser.Math.FloatBetween(50, 148),
        speed: Phaser.Math.FloatBetween(0.45, 1.25),
        size: Phaser.Math.FloatBetween(1.4, 4.2)
      });
    }
  }

  createText() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    this.titleText = this.add.text(w * 0.5, h * 0.11, "", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "40px",
      color: "#f7fbff",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.promptText = this.add.text(w * 0.5, h * 0.88, "", {
      fontFamily: "monospace",
      fontSize: "26px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.warningX = w * 0.27;
    this.warningY = h * 0.56;
    this.warningGlow = this.add.rectangle(this.warningX, this.warningY, Math.min(270, w * 0.22), 92, 0xbff7ff, 0.0)
      .setOrigin(0.5)
      .setAlpha(0);

    this.warningBox = this.add.rectangle(this.warningX, this.warningY, Math.min(248, w * 0.20), 78, 0x041018, 0.0)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xbff7ff, 0.0)
      .setAlpha(0);

    this.warningText = this.add.text(this.warningX, this.warningY - 42, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.warningSubText = this.add.text(this.warningX, this.warningY + 43, "", {
      fontFamily: "monospace",
      fontSize: "9px",
      color: "#ffe6b8",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 3,
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.arrowPromptGlow = this.add.rectangle(this.warningX, this.warningY + 2, 112, 54, 0xbff7ff, 0.18)
      .setOrigin(0.5)
      .setAlpha(0);
    this.arrowPromptBox = this.add.rectangle(this.warningX, this.warningY + 2, 96, 42, 0x041018, 0.72)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xbff7ff, 0.70)
      .setAlpha(0);
    this.arrowPromptText = this.add.text(this.warningX, this.warningY + 5, "\u279C", {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "36px",
      color: "#ffffff",
      stroke: "#00151c",
      strokeThickness: 6,
      align: "center"
    }).setOrigin(0.5).setAlpha(0);

    this.narrationText = this.add.text(w * 0.5, h * 0.18, "", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "21px",
      color: "#dce9f0",
      stroke: "#000000",
      strokeThickness: 6,
      align: "center",
      wordWrap: { width: Math.min(960, w * 0.8) },
      lineSpacing: 8
    }).setOrigin(0.5, 0).setAlpha(0);

    this.systemText = this.add.text(w * 0.08, h * 0.13, "", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#9feaff",
      stroke: "#001018",
      strokeThickness: 4,
      align: "left",
      wordWrap: { width: Math.min(420, w * 0.32) },
      lineSpacing: 4
    }).setOrigin(0, 0).setAlpha(0);

    this.dialogueText = this.add.text(w * 0.5, h * 0.17, "", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: "26px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 8,
      align: "center",
      wordWrap: { width: Math.min(980, w * 0.82) },
      lineSpacing: 8
    }).setOrigin(0.5).setAlpha(0);

    this.textLayer.add([
      this.titleText,
      this.promptText,
      this.warningGlow,
      this.warningBox,
      this.warningText,
      this.warningSubText,
      this.arrowPromptGlow,
      this.arrowPromptBox,
      this.arrowPromptText,
      this.narrationText,
      this.systemText,
      this.dialogueText
    ]);
  }


  createInputs() {
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    this.input.keyboard.on("keydown-ENTER", () => this.skipOrStart());
    this.input.keyboard.on("keydown-SPACE", () => this.skipOrStart());
    this.input.keyboard.on("keydown-E", () => this.skipOrStart());
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.settingsPanel?.visible) this.hideSettingsPanel();
    });

    this.input.on("pointerdown", (pointer) => {
      if (this.state !== "treeTutorial") return;
      this.pointerStart = { x: pointer.x, y: pointer.y, time: this.time.now };
    });

    this.input.on("pointerup", (pointer) => {
      if (this.state !== "treeTutorial" || !this.pointerStart) return;
      const start = this.pointerStart;
      this.pointerStart = null;
      const dx = pointer.x - start.x;
      const dy = pointer.y - start.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absY >= 28 && absY >= absX * 1.2) {
        this.completeTreeTutorial(dy < 0 ? "up" : "down");
      } else {
        this.showSystemText("Vertical mouse swipe required. Drag UP or DOWN to grow a Blessing Tree.", 1200);
        this.cameras.main.shake(90, 0.0028);
      }
    });
  }

  startPlayableOpening() {
    this.createMenuUtilityButtons();
    this.startTreeTutorial();
  }

  startTreeTutorial() {
    this.state = "treeTutorial";
    this.setWarningInstruction("MOUSE SWIPE UP / DOWN: BLESSING TREE");
    this.arrowPromptText?.setText("↕");
    this.tweens.add({ targets: [this.arrowPromptGlow, this.arrowPromptBox, this.arrowPromptText], alpha: 1, duration: 260, delay: 180 });
    this.showNarration("A white blessing answers vertical motion.\nCast the tree yourself before the torch lands.", 2600);
    this.time.delayedCall(650, () => this.spawnTutorialTorch());
    this.time.addEvent({ delay: 1120, loop: true, callback: () => this.spawnAmbientAshAndEmbers() });
  }

  beginCrawlTutorial() {
    this.state = "crawl";
    this.setWarningInstruction("HOLD D TO CRAWL");
    this.arrowPromptText?.setText("D");
    this.tweens.add({ targets: [this.arrowPromptGlow, this.arrowPromptBox, this.arrowPromptText], alpha: 1, duration: 260, delay: 180 });
    this.tweens.add({
      targets: this.arrowPromptText,
      alpha: 0.22,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 240,
      delay: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: this.arrowPromptBox,
      alpha: 0.42,
      duration: 260,
      delay: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: this.arrowPromptGlow,
      alpha: 0.04,
      scaleX: 1.24,
      scaleY: 1.32,
      duration: 320,
      delay: 420,
      yoyo: true,
      repeat: -1,
      ease: "Quad.easeOut"
    });

    this.showNarration("They do not need to be seen.\nTheir hatred arrives before their bodies.", 2600);

    this.time.delayedCall(650, () => this.startPortalOpening());
    this.time.addEvent({ delay: 720, loop: true, callback: () => this.spawnTorchWave() });
    this.time.addEvent({ delay: 760, loop: true, callback: () => this.spawnOffscreenInsult() });
    this.time.addEvent({ delay: 1120, loop: true, callback: () => this.spawnAmbientAshAndEmbers() });
  }


  spawnTutorialTorch() {
    if (this.state !== "treeTutorial" || this.treeTutorialComplete) return;

    const startX = -160;
    const startY = this.viewportHeight * 0.33;
    const targetX = this.hero.x + 120;
    const targetY = this.groundY - 92;

    const torch = this.add.container(startX, startY).setDepth(24);
    const glow = this.add.circle(24, -4, 44, 0xff5d17, 0.30);
    const shaft = this.add.rectangle(-15, 3, 74, 6, 0x2b180c, 1);
    shaft.setStrokeStyle(2, 0x8a4c1f, 0.85);
    const wrap = this.add.rectangle(24, 2, 15, 13, 0x100906, 0.98);
    const flameOuter = this.add.triangle(34, -13, -14, 24, 8, -24, 22, 22, 0xff4414, 0.94);
    const flameMid = this.add.triangle(38, -17, -8, 18, 7, -18, 16, 19, 0xff9e27, 0.98);
    const flameInner = this.add.triangle(41, -19, -4, 12, 5, -12, 10, 13, 0xfff0a8, 0.98);
    torch.add([glow, shaft, wrap, flameOuter, flameMid, flameInner]);

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    torch.setRotation(angle);
    this.tutorialTorch = torch;

    this.tweens.add({
      targets: torch,
      x: targetX,
      y: targetY,
      rotation: angle + 2.4,
      duration: 1450,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (this.state === "treeTutorial" && !this.treeTutorialComplete) {
          this.showSystemText("Swipe vertically to cast the tree before the torch lands.", 1300);
          torch.destroy();
          this.time.delayedCall(450, () => this.spawnTutorialTorch());
        }
      }
    });
  }

  completeTreeTutorial(direction = "up") {
    if (this.treeTutorialComplete) return;
    this.treeTutorialComplete = true;

    const x = this.hero.x + 104;
    const y = direction === "up" ? this.groundY + 10 : this.groundY - 150;
    this.drawManualTutorialTree(x, y, direction);

    if (this.tutorialTorch?.active) {
      this.tweens.killTweensOf(this.tutorialTorch);
      this.tutorialTorch.destroy();
    }

    this.cameras.main.flash(160, 230, 255, 255);
    this.cameras.main.shake(170, 0.004);
    this.showSystemText("BLESSING TREE CAST. It blocks bullets, missiles, and some beams.", 1700);

    this.time.delayedCall(900, () => this.beginJumpTutorial());
  }

  drawManualTutorialTree(x, y, direction = "up") {
    const tree = this.add.graphics().setDepth(27);
    this.tutorialTree = tree;

    const flip = direction === "up" ? -1 : 1;
    const draw = (s) => {
      tree.clear();
      tree.lineStyle(Math.max(4, 18 * s), 0xf8fdff, 0.98);
      tree.lineBetween(x, y, x + 6 * s, y + flip * 170 * s);
      tree.lineStyle(Math.max(2, 7 * s), 0xdff7ff, 0.92);
      tree.lineBetween(x + 4 * s, y + flip * 46 * s, x - 72 * s, y + flip * 92 * s);
      tree.lineBetween(x + 5 * s, y + flip * 66 * s, x + 78 * s, y + flip * 104 * s);
      tree.lineBetween(x + 5 * s, y + flip * 96 * s, x - 46 * s, y + flip * 150 * s);
      tree.lineBetween(x + 6 * s, y + flip * 112 * s, x + 46 * s, y + flip * 168 * s);
      tree.fillStyle(0xffffff, 0.72);
      for (let i = 0; i < 12; i++) {
        tree.fillCircle(x + Phaser.Math.Between(-74, 78) * s, y + flip * Phaser.Math.Between(70, 170) * s, Phaser.Math.FloatBetween(1.2, 3.4) * s);
      }
    };

    const state = { s: 0.04 };
    draw(state.s);
    this.tweens.add({ targets: state, s: 1, duration: 260, ease: "Back.easeOut", onUpdate: () => draw(state.s) });
  }

  setWarningInstruction(text) {
    const normalized = String(text || "").toUpperCase();
    const isTree = normalized.includes("BLESSING TREE") || normalized.includes("SWIPE");
    const isDoubleTap = normalized.includes("DOUBLE-TAP") || normalized.includes("RE-LEAVE");
    const isJump = normalized.includes("SPACE");
    const isBlink = normalized.includes("BLINK") || normalized.includes("Q");
    const isLeftDash = normalized.includes(" A") || normalized.includes("LEFT DASH");
    const isUpDash = normalized.includes(" W") || normalized.includes("UP DASH");

    let subText = "HOLD D TO MOVE RIGHT";
    let keyText = "D";

    if (isTree) {
      subText = "DRAG VERTICALLY WITH THE MOUSE TO CAST COVER";
      keyText = "↕";
    } else if (isJump) {
      subText = "PRESS SPACE ONCE";
      keyText = "SPACE";
    } else if (isLeftDash) {
      subText = "PRESS A TWICE QUICKLY";
      keyText = "A A";
    } else if (isUpDash) {
      subText = "PRESS W TWICE QUICKLY";
      keyText = "W W";
    } else if (isBlink) {
      subText = "PRESS Q ONCE";
      keyText = "Q";
    } else if (isDoubleTap) {
      subText = "PRESS D TWICE QUICKLY";
      keyText = "D D";
    }

    if (this.warningText) {
      this.warningText.setText(text);
      this.warningText.setAlpha(1);
    }
    if (this.warningSubText) {
      this.warningSubText.setText(subText);
      this.warningSubText.setAlpha(1);
    }

    if (this.arrowPromptText) {
      this.arrowPromptText.setText(keyText);
      this.arrowPromptText.setColor("#ffffff");
      this.arrowPromptText.setStroke("#00151c", keyText.length >= 4 ? 6 : 8);
      this.arrowPromptText.setFontSize(keyText.length >= 4 ? "24px" : "34px");
    }

    this.warningBox?.setAlpha(1);
    this.warningGlow?.setAlpha(0.20);
    this.updateArrowPromptPosition();
    this.warningBox?.setStrokeStyle(2, isDoubleTap ? 0x66f3ff : 0xbff7ff, 0.82);
    this.warningBox?.setFillStyle(isDoubleTap ? 0x00131a : 0x041018, 0.70);
    this.arrowPromptBox?.setStrokeStyle(2, isDoubleTap ? 0x66f3ff : 0xbff7ff, 0.78);
    this.arrowPromptBox?.setFillStyle(isDoubleTap ? 0x00131a : 0x041018, 0.70);
    this.arrowPromptGlow?.setFillStyle(isDoubleTap ? 0x5edfff : 0xbff7ff, 0.16);
    this.cameras.main.shake(70, isDoubleTap ? 0.0032 : 0.0018);
  }


  beginJumpTutorial() {
    this.state = "jumpTutorial";
    this.setWarningInstruction("PRESS SPACE TO RISE");
    this.showNarration("The last strength in him is not speed.\nIt is the refusal to fall where they left him.", 2600);
  }

  completeJumpTutorial() {
    if (this.openingTutorialStepDone) return;
    this.openingTutorialStepDone = true;
    this.showSystemText("JUMP RECORDED. Vertical movement buys time.", 1450);
    this.cameras.main.shake(120, 0.003);

    const startY = this.hero.y;
    if (this.anims.exists("player_jump_anim")) this.hero.play("player_jump_anim", true);
    this.tweens.add({
      targets: [this.hero, this.heroShadow],
      y: "-=74",
      duration: 260,
      ease: "Sine.easeOut",
      yoyo: true,
      onComplete: () => {
        this.hero.y = startY;
        this.heroShadow.y = this.groundY + 26;
        if (this.anims.exists("player_hurt_anim")) this.hero.play("player_hurt_anim", true);
        this.openingTutorialStepDone = false;
        this.time.delayedCall(420, () => this.beginLeftDashTutorial());
      }
    });
  }

  beginLeftDashTutorial() {
    this.state = "leftDashTutorial";
    this.lastATapTime = -9999;
    this.setWarningInstruction("DOUBLE-TAP A: LEFT DASH");
    this.showNarration("A backward burst is sometimes the only prayer left.", 2400);
  }

  completeLeftDashTutorial() {
    if (this.openingTutorialStepDone) return;
    this.openingTutorialStepDone = true;
    this.showSystemText("LEFT DASH RECORDED. Retreat can be survival.", 1450);
    this.playMenuDashEffect(this.hero.x, this.hero.y, -1, 0);
    this.cameras.main.shake(140, 0.004);
    if (this.anims.exists("player_run_anim")) this.hero.play("player_run_anim", true);
    this.tweens.add({
      targets: [this.hero, this.heroShadow],
      x: "-=88",
      duration: 140,
      ease: "Cubic.easeOut",
      yoyo: true,
      hold: 120,
      onComplete: () => {
        if (this.anims.exists("player_hurt_anim")) this.hero.play("player_hurt_anim", true);
        this.openingTutorialStepDone = false;
        this.time.delayedCall(420, () => this.beginUpDashTutorial());
      }
    });
  }

  beginUpDashTutorial() {
    this.state = "upDashTutorial";
    this.lastWTapTime = -9999;
    this.setWarningInstruction("DOUBLE-TAP W: UP DASH");
    this.showNarration("When the ground becomes accusation, leave the ground.", 2400);
  }

  completeUpDashTutorial() {
    if (this.openingTutorialStepDone) return;
    this.openingTutorialStepDone = true;
    this.showSystemText("UP DASH RECORDED. Rise above incoming fire.", 1450);
    this.playMenuDashEffect(this.hero.x, this.hero.y, 0, -1);
    this.cameras.main.shake(150, 0.004);
    if (this.anims.exists("player_jump_anim")) this.hero.play("player_jump_anim", true);
    this.tweens.add({
      targets: this.hero,
      y: "-=118",
      duration: 160,
      ease: "Cubic.easeOut",
      yoyo: true,
      hold: 130,
      onComplete: () => {
        if (this.anims.exists("player_hurt_anim")) this.hero.play("player_hurt_anim", true);
        this.openingTutorialStepDone = false;
        this.time.delayedCall(420, () => this.beginBlinkTutorial());
      }
    });
  }

  beginBlinkTutorial() {
    this.state = "blinkTutorial";
    this.setWarningInstruction("PRESS Q TO BLINK");
    this.showNarration("The final step is not walking.\nIt is leaving a wound in space behind him.", 2600);
  }

  completeBlinkTutorial() {
    if (this.openingTutorialStepDone) return;
    this.openingTutorialStepDone = true;
    this.showSystemText("BLINK RECORDED. Distance can be made instantly.", 1450);
    this.playMenuBlinkEffect(this.hero.x, this.hero.y);
    this.cameras.main.flash(130, 170, 245, 255);
    this.cameras.main.shake(160, 0.004);
    this.tweens.add({
      targets: [this.hero, this.heroShadow],
      x: "+=84",
      duration: 120,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.playMenuBlinkEffect(this.hero.x, this.hero.y);
        this.openingTutorialStepDone = false;
        this.time.delayedCall(520, () => this.beginCrawlTutorial());
      }
    });
  }

  playMenuDashEffect(x, y, dirX = 1, dirY = 0) {
    const g = this.add.graphics().setDepth(32);
    g.lineStyle(5, 0xbff7ff, 0.62);
    for (let i = 0; i < 5; i++) {
      const ox = -dirX * (18 + i * 18);
      const oy = -dirY * (18 + i * 18);
      g.lineBetween(x + ox, y + oy, x + ox - dirX * 52, y + oy - dirY * 52);
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 320, ease: "Sine.easeOut", onComplete: () => g.destroy() });
  }

  playMenuBlinkEffect(x, y) {
    const ring = this.add.circle(x, y, 18, 0xbff7ff, 0.12).setDepth(34).setStrokeStyle(4, 0xbff7ff, 0.74);
    this.tweens.add({ targets: ring, radius: 88, alpha: 0, duration: 260, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
  }

  updateIntegratedHeroTutorial(time) {
    if (this.state === "morningstar" || this.isTransitioning) return;

    const aDown = Boolean(this.keyA?.isDown);
    const wDown = Boolean(this.keyW?.isDown);
    const qDown = Boolean(this.keyQ?.isDown);
    const spaceDown = Boolean(this.keySpace?.isDown);

    if (this.state === "jumpTutorial" && spaceDown && !this.wasSpaceDown) {
      this.completeJumpTutorial();
    }

    if (aDown && !this.wasADown) {
      if (this.state === "leftDashTutorial" && time - this.lastATapTime <= 360) {
        this.completeLeftDashTutorial();
      }
      this.lastATapTime = time;
    }

    if (wDown && !this.wasWDown) {
      if (this.state === "upDashTutorial" && time - this.lastWTapTime <= 360) {
        this.completeUpDashTutorial();
      }
      this.lastWTapTime = time;
    }

    if (this.state === "blinkTutorial" && qDown && !this.wasQDown) {
      this.completeBlinkTutorial();
    }

    this.wasADown = aDown;
    this.wasWDown = wDown;
    this.wasQDown = qDown;
    this.wasSpaceDown = spaceDown;
  }


  pulseHuntPressure() {
  }

  skipOrStart() {
    if (this.isTransitioning) return;
    if (this.state === "mainMenu") {
      this.beginStoryFromMainMenu();
      return;
    }
    if (this.canEnterBossScene) {
      this.enterBossScene();
    }
  }

  startPortalOpening() {
    if (this.portalOpened) return;
    this.portalOpened = true;

    this.tweens.add({
      targets: [this.portalBack, this.portalGlow, this.portalCore, this.portalMotion],
      x: this.portalTargetX,
      duration: 5200,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.portalX = this.portalMotion.x;
      }
    });
    this.tweens.add({ targets: this.portalBack, alpha: 0.8, duration: 3800, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.portalGlow, alpha: 0.34, duration: 5200, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.portalCore, alpha: 0.78, duration: 6200, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.portalRing, alpha: 1, duration: 4600, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.portalParticleGraphics, alpha: 1, duration: 5200, ease: "Sine.easeOut" });

    this.time.delayedCall(5400, () => {
      this.portalReady = true;
      this.showSystemText("PLEASE REMAIN CALM...\nDO NOT PANIC...\nHELP IS ON THE WAY...", 2400);
    });
  }

  handleDPress(time) {
    if (this.state !== "crawl" && this.state !== "flashPrompt") return;

    if (this.state === "flashPrompt" && time - this.lastDPressTime <= 360) {
      this.flashIntoPortal();
      this.lastDPressTime = -9999;
      return;
    }

    this.lastDPressTime = time;
  }

  updateCrawl(dt) {
    if (this.state !== "crawl" && this.state !== "flashPrompt") return;

    const moving = this.keyD.isDown;
    if (moving && this.state === "crawl") {
      this.hero.x += this.crawlSpeed * dt;
      this.heroShadow.x = this.hero.x + 8;
      this.heroRootGlow.x = 0;
      this.hero.setAngle(-4 + Math.sin(this.time.now * 0.014) * 3);
      this.hero.y = this.groundY - 34 + Math.sin(this.time.now * 0.012) * 2;
      this.heroShadow.y = this.groundY + 26;
      if (this.anims.exists("player_walk_anim") && this.hero.anims?.currentAnim?.key !== "player_walk_anim") {
        this.hero.play("player_walk_anim", true);
      }
    } else if (this.state === "crawl") {
      if (this.anims.exists("player_hurt_anim") && this.hero.anims?.currentAnim?.key !== "player_hurt_anim") {
        this.hero.play("player_hurt_anim", true);
      }
    }

    this.drawWeakRoot(this.heroRootGlow, this.hero.x + 18, this.groundY + 6, 0.65);

    if (this.state === "crawl" && this.portalReady && this.hero.x >= this.portalThresholdX) {
      this.state = "flashPrompt";
      this.setWarningInstruction("DOUBLE-TAP D TO RE-LEAVE");
      this.arrowPromptText?.setAlpha(1);
      this.arrowPromptBox?.setAlpha(1);
      this.arrowPromptGlow?.setAlpha(1);
      this.showNarration("Space opens like a scar.\nHe is not escaping. He is being released for one more moment.", 3600);
      this.cameras.main.shake(220, 0.0035);
    }
  }

  spawnOffscreenInsult() {
    if (this.state !== "crawl" && this.state !== "flashPrompt") return;

    const insults = [
      "KILL HIM.",
      "KILL HIM NOW.",
      "DO NOT LET HIM REACH THE GATE.",
      "BREAK HIS LEGS.",
      "BURN THE FALSE SAINT.",
      "DRAG HIM BACK.",
      "Kill the frost-bearer.",
      "Cut him down.",
      "Make him pay.",
      "The one who lived.",
      "Pale frost bearer.",
      "Return our dead.",
      "Coward.",
      "Bridge-breaker.",
      "You let them drown.",
      "You ran from the fall.",
      "No mercy for the marked.",
      "Let no sinner pass.",
      "Drag him back.",
      "He hid beneath the white roots.",
      "The children waited.",
      "KILL THE ONE WHO LIVED.",
      "Burn the pale roots.",
      "He owes us bodies.",
      "No grave for the coward.",
      "Cut out the blessing.",
      "Make the sinner crawl.",
      "He promised to return.",
      "He survived. They did not.",
      "Break his white tree."
    ];

    const count = Phaser.Math.Between(1, 2);
    for (let i = 0; i < count; i++) {
      const fromLeft = true;
      const x = -60;
      const y = Phaser.Math.Between(80, Math.floor(this.viewportHeight * 0.68));
      const phrase = Phaser.Utils.Array.GetRandom(insults);
      const text = this.add.text(x, y, phrase, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: phrase.includes("KILL") || phrase.includes("NOW") ? "42px" : (phrase.length <= 14 ? "34px" : "28px"),
        color: phrase.includes("KILL") || phrase.includes("Burn") || phrase.includes("Cut") ? "#ff3f2f" : "#ffb7a8",
        stroke: "#000000",
        strokeThickness: phrase.includes("KILL") || phrase.includes("NOW") ? 10 : 7,
        alpha: 0.95
      }).setOrigin(fromLeft ? 0 : 1, 0.5).setDepth(88).setAlpha(0);

      this.tweens.add({
        targets: text,
        alpha: phrase.includes("KILL") ? 1 : 0.9,
        x: Phaser.Math.Between(46, 220),
        duration: Phaser.Math.Between(190, 360),
        ease: "Quad.easeOut"
      });
      this.tweens.add({
        targets: text,
        alpha: 0,
        y: y - Phaser.Math.Between(10, 26),
        duration: Phaser.Math.Between(560, 980),
        delay: Phaser.Math.Between(420, 820),
        onComplete: () => text.destroy()
      });
    }

    this.playSyntheticWhisper();
  }

  playSyntheticWhisper() {
    try {
      const manager = this.sound;
      const context = manager?.context;
      if (!context || manager.locked) return;

      const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.18), context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }

      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = Phaser.Math.Between(450, 950);
      filter.Q.value = 5;
      const gain = context.createGain();
      gain.gain.value = 0.025;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
    } catch (_error) {
    }
  }

  spawnTorchWave() {
    if (this.state !== "crawl" && this.state !== "flashPrompt") return;

    const volley = Phaser.Math.Between(2, 3);
    for (let i = 0; i < volley; i++) {
      const fromLeft = true;
      const startX = -220 - i * 52;
      const startY = Phaser.Math.Between(52, Math.floor(this.viewportHeight * 0.52));
      const treeX = Phaser.Math.Clamp(this.hero.x + Phaser.Math.Between(58, 148), 150, this.viewportWidth - 90);
      const treeY = this.groundY - Phaser.Math.Between(52, 112);
      this.time.delayedCall(i * Phaser.Math.Between(70, 115), () => this.throwTorch(startX, startY, treeX, treeY, fromLeft));
    }
  }

  throwTorch(startX, startY, targetX, targetY, fromLeft) {
    const torch = this.add.container(startX, startY).setDepth(22);
    const glow = this.add.circle(24, -4, 44, 0xff5d17, 0.28);
    const shaft = this.add.rectangle(-15, 3, 74, 6, 0x2b180c, 1);
    shaft.setStrokeStyle(2, 0x8a4c1f, 0.85);
    const wrap = this.add.rectangle(24, 2, 15, 13, 0x100906, 0.98);
    const flameOuter = this.add.triangle(34, -13, -14, 24, 8, -24, 22, 22, 0xff4414, 0.94);
    const flameMid = this.add.triangle(38, -17, -8, 18, 7, -18, 16, 19, 0xff9e27, 0.98);
    const flameInner = this.add.triangle(41, -19, -4, 12, 5, -12, 10, 13, 0xfff0a8, 0.98);
    torch.add([glow, shaft, wrap, flameOuter, flameMid, flameInner]);

    const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    torch.setRotation(angle);

    const trail = this.add.graphics().setDepth(21);
    this.torches.push({ torch, trail, glow, flameOuter, flameMid, flameInner, active: true });

    this.tweens.add({
      targets: torch,
      x: targetX,
      y: targetY,
      rotation: angle + (fromLeft ? 2.4 : -2.4),
      duration: Phaser.Math.Between(390, 540),
      ease: "Quad.easeIn",
      onUpdate: () => {
        trail.clear();
        trail.lineStyle(3, 0xff7b2c, 0.32);
        trail.lineBetween(torch.x - Math.cos(angle) * 22, torch.y - Math.sin(angle) * 22, torch.x - Math.cos(angle) * 96, torch.y - Math.sin(angle) * 96);
      },
      onComplete: () => {
        this.autoBlockTorch(torch, trail, targetX, targetY);
      }
    });
  }

  autoBlockTorch(torch, trail, x, y) {
    trail.clear();
    this.cameras.main.shake(170, 0.004);
    this.growAutoTree(x - 18, this.groundY + 8);

    const shock = this.add.circle(x, y, 12, 0xffffff, 0.42).setDepth(29);
    this.tweens.add({ targets: shock, radius: 72, alpha: 0, duration: 260, ease: "Quad.easeOut", onComplete: () => shock.destroy() });

    const burst = this.add.graphics().setDepth(28);
    burst.fillStyle(0xff7a20, 0.85);
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      burst.fillCircle(x + Math.cos(a) * Phaser.Math.Between(8, 28), y + Math.sin(a) * Phaser.Math.Between(8, 28), Phaser.Math.Between(2, 5));
    }
    this.tweens.add({ targets: burst, alpha: 0, duration: 420, onComplete: () => burst.destroy() });

    const cross = this.add.graphics().setDepth(30);
    cross.lineStyle(4, 0xf9ffff, 0.66);
    cross.lineBetween(x - 46, y, x + 46, y);
    cross.lineBetween(x, y - 46, x, y + 46);
    this.tweens.add({ targets: cross, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: 260, ease: "Quad.easeOut", onComplete: () => cross.destroy() });

    this.tweens.add({
      targets: torch,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 180,
      onComplete: () => torch.destroy()
    });
  }

  growAutoTree(x, y) {
    if (this.activeTree?.active) {
      this.activeTree.destroy();
    }

    const tree = this.add.graphics().setDepth(24);
    this.activeTree = tree;

    const draw = (s) => {
      tree.clear();
      tree.fillStyle(0xeafcff, 0.12 * s);
      tree.fillCircle(x + 8 * s, y - 130 * s, 112 * s);
      tree.lineStyle(Math.max(4, 20 * s), 0xf8fdff, 0.98);
      tree.lineBetween(x, y, x + 8 * s, y - 220 * s);
      tree.lineStyle(Math.max(2, 8 * s), 0xdff7ff, 0.9);
      tree.lineBetween(x + 5 * s, y - 54 * s, x - 82 * s, y - 114 * s);
      tree.lineBetween(x + 7 * s, y - 78 * s, x + 92 * s, y - 135 * s);
      tree.lineBetween(x + 7 * s, y - 112 * s, x - 54 * s, y - 202 * s);
      tree.lineBetween(x + 8 * s, y - 126 * s, x + 54 * s, y - 224 * s);
      tree.lineStyle(Math.max(1, 4 * s), 0xffffff, 0.62);
      for (let i = 0; i < 18; i++) {
        const bx = x + Phaser.Math.Between(-88, 100) * s;
        const by = y - Phaser.Math.Between(88, 224) * s;
        tree.lineBetween(bx, by, bx + Phaser.Math.Between(-24, 26) * s, by - Phaser.Math.Between(12, 36) * s);
      }
      tree.fillStyle(0xffffff, 0.72 * s);
      for (let i = 0; i < 14; i++) {
        tree.fillCircle(x + Phaser.Math.Between(-92, 98) * s, y - Phaser.Math.Between(82, 224) * s, Phaser.Math.FloatBetween(1.2, 3.8) * s);
      }
    };

    const state = { s: 0.04 };
    draw(state.s);
    this.tweens.add({
      targets: state,
      s: 1,
      duration: 260,
      ease: "Back.easeOut",
      onUpdate: () => draw(state.s),
      onComplete: () => {
        this.tweens.add({
          targets: tree,
          alpha: 0,
          x: 22,
          duration: 780,
          delay: 330,
          ease: "Cubic.easeIn",
          onComplete: () => {
            tree.destroy();
            if (this.activeTree === tree) this.activeTree = null;
          }
        });
      }
    });
  }


  spawnAmbientAshAndEmbers() {
    if (this.state !== "crawl" && this.state !== "flashPrompt" && this.state !== "treeTutorial") return;

    const count = Phaser.Math.Between(4, 9);
    for (let i = 0; i < count; i++) {
      const fromFireSide = Math.random() < 0.72;
      const x = fromFireSide ? Phaser.Math.Between(-30, Math.floor(this.viewportWidth * 0.35)) : Phaser.Math.Between(0, this.viewportWidth);
      const y = Phaser.Math.Between(Math.floor(this.viewportHeight * 0.18), Math.floor(this.viewportHeight * 0.84));
      const ember = this.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 3.6), fromFireSide ? 0xff6c1a : 0xdff8ff, fromFireSide ? 0.72 : 0.38)
        .setDepth(31);

      this.tweens.add({
        targets: ember,
        x: x + Phaser.Math.Between(70, 210),
        y: y - Phaser.Math.Between(25, 92),
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(0.2, 0.55),
        scaleY: Phaser.Math.FloatBetween(0.2, 0.55),
        duration: Phaser.Math.Between(520, 1050),
        ease: "Quad.easeOut",
        onComplete: () => ember.destroy()
      });
    }

  }

  cleanupOpeningTrees() {
    const trees = [this.tutorialTree, this.activeTree];
    for (const tree of trees) {
      if (!tree || !tree.active) continue;
      this.tweens.killTweensOf(tree);
      tree.destroy();
    }
    this.tutorialTree = null;
    this.activeTree = null;
  }

  flashIntoPortal() {
    if (this.state === "portalFlash" || this.isTransitioning) return;
    this.state = "portalFlash";
    this.tweens.killTweensOf(this.promptText);
    this.tweens.killTweensOf(this.warningText);
    this.tweens.killTweensOf(this.warningBox);
    this.promptText.setAlpha(0);
    this.warningText?.setAlpha(0);
    this.warningSubText?.setAlpha(0);
    this.warningBox?.setAlpha(0);
    this.warningGlow?.setAlpha(0);
    this.arrowPromptText?.setAlpha(0);
    this.arrowPromptBox?.setAlpha(0);
    this.arrowPromptGlow?.setAlpha(0);
    this.destroyArrowPrompt();
    this.cleanupOpeningTrees();
    this.showNarration("He did not rise.\nHe descended toward another cry.", 1900);

    if (this.anims.exists("player_run_anim")) {
      this.hero.play("player_run_anim", true);
    }
    this.hero.setAngle(0);

    this.tweens.add({ targets: this.flashLayer, alpha: 0.72, duration: 90, yoyo: true, repeat: 1 });
    this.tweens.add({
      targets: [this.hero, this.heroShadow],
      x: this.viewportWidth + 42,
      y: (target, key) => {
        if (target === this.heroShadow && key === "y") return this.portalY + 96;
        if (target === this.hero && key === "y") return this.portalY + 42;
        return target[key];
      },
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeIn",
      onComplete: () => this.transitionToMorningstar()
    });
  }

  transitionToMorningstar() {
    this.tweens.add({
      targets: this.fadeLayer,
      alpha: 1,
      duration: 550,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.buildMorningstarOpening();
        this.tweens.add({ targets: this.fadeLayer, alpha: 0, duration: 850, ease: "Sine.easeOut" });
      }
    });
  }

  buildMorningstarOpening() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    this.state = "morningstar";
    this.destroyArrowPrompt();
    this.cleanupOpeningTrees();

    this.bgLayer.removeAll(true);
    this.worldLayer.removeAll(true);
    this.fxLayer.removeAll(true);
    this.torches = [];
    this.portalParticles = [];
    this.vignette?.destroy?.();
    this.heroRootGlow?.destroy?.();
    this.portalRing?.destroy?.();
    this.portalParticleGraphics?.destroy?.();

    const bg = this.add.image(0, 0, "arena_background").setOrigin(0, 0).setDepth(-60);
    bg.setDisplaySize(w, h);
    const dark = this.add.rectangle(0, 0, w, h, 0x000712, 0.58).setOrigin(0, 0).setDepth(-25);
    this.bgLayer.add([bg, dark]);

    this.startRain(0.52);

    this.hero = this.add.sprite(w * 0.28, h * 0.74, "player_hurt", 0)
      .setScale(1.08)
      .setAngle(-6)
      .setTint(0xe8f7ff)
      .setDepth(14)
      .setAlpha(1);
    if (this.anims.exists("player_hurt_anim")) {
      this.hero.play("player_hurt_anim", true);
    }
    this.heroShadow = this.add.ellipse(this.hero.x + 8, this.hero.y + 48, 102, 18, 0x000000, 0.58).setDepth(9);
    this.drawMorningstarRoot();

    this.titleText.setText("").setAlpha(0);
    this.narrationText.setText("").setAlpha(0);
    this.systemText.setText("").setAlpha(0);
    this.dialogueText.setText("").setAlpha(0);

    this.time.delayedCall(520, () => this.heroWalksIntoPort());
    this.time.delayedCall(1850, () => this.showDialogue("Hero", "Where am I?"));
    this.time.delayedCall(4200, () => this.showDialogue("Hero", "Another place reached too late..."));
    this.time.delayedCall(6550, () => this.showDialogue("Hero", "If no dawn can cleanse the night, then let me bear the wound."));
    this.time.delayedCall(8500, () => this.descendBoss());
    this.time.delayedCall(10300, () => this.showSystemText("UNAUTHORIZED LIFE SIGN DETECTED\nMORNINGSTAR PORT REMAINS UNDER PROTECTION\nELIMINATE ALL TRESPASSERS", 3300));
    this.time.delayedCall(12450, () => {
      this.hideOpeningControlChecklist?.(500);
      this.enterBossScene(true);
    });
  }

  heroWalksIntoPort() {
    if (!this.hero?.active) return;

    this.hero.setAngle(-2);
    if (this.anims.exists("player_walk_anim")) {
      this.hero.play("player_walk_anim", true);
    }

    this.tweens.add({
      targets: [this.hero, this.heroShadow],
      x: "+=96",
      duration: 1150,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.hero.setAngle(-5);
        if (this.anims.exists("player_hurt_anim")) {
          this.hero.play("player_hurt_anim", true);
        }
      }
    });
  }

  showDialogue(speaker, line) {
    this.dialogueText.setText(`${speaker}: ${line}`);
    this.tweens.killTweensOf(this.dialogueText);
    this.dialogueText.setAlpha(0);
    this.tweens.add({ targets: this.dialogueText, alpha: 1, duration: 360 });
    this.tweens.add({ targets: this.dialogueText, alpha: 0, duration: 700, delay: 1900 });
  }

  descendBoss() {
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    const entryPoint = { x: w * 0.84, y: -170 };
    const landingPoint = { x: w * 0.68, y: h * 0.38 };

    const boss = this.add.sprite(entryPoint.x, entryPoint.y, "blue_fly_up", 0)
      .setScale(3.1)
      .setFlipX(true)
      .setTint(0xbfdcff)
      .setDepth(16)
      .setAlpha(0.96);

    if (this.anims.exists("blue_fly_up_anim")) {
      boss.play("blue_fly_up_anim", true);
    }

    const scan = this.add.rectangle(boss.x, h * 0.47, 160, h * 0.9, 0xff1f2d, 0.0)
      .setDepth(11)
      .setAngle(-4);

    this.tweens.add({ targets: scan, alpha: 0.18, duration: 450, yoyo: true, repeat: 4 });
    this.tweens.add({
      targets: boss,
      x: landingPoint.x,
      y: landingPoint.y,
      duration: 1550,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.cameras.main.shake(360, 0.009);
        boss.setTexture("blue_land", 5);
        this.time.delayedCall(650, () => {
          if (this.anims.exists("blue_idle_anim")) boss.play("blue_idle_anim", true);
        });
      }
    });
  }

  drawMorningstarRoot() {
    const root = this.add.graphics().setDepth(15);
    const x = this.hero.x + 20;
    const y = this.hero.y + 48;
    root.lineStyle(3, 0xf6fbff, 0.82);
    root.lineBetween(x, y, x + 34, y - 10);
    root.lineStyle(2, 0xdff8ff, 0.5);
    root.lineBetween(x + 18, y - 5, x + 60, y - 26);
    root.lineBetween(x + 18, y - 5, x + 46, y + 10);
    this.worldLayer.add(root);
    this.tweens.add({ targets: root, alpha: 0.34, duration: 950, yoyo: true, repeat: -1 });
  }

  drawWeakRoot(graphics, x, y, scale = 1) {
    graphics.clear();
    graphics.lineStyle(3 * scale, 0xf5fbff, 0.55);
    graphics.lineBetween(x, y, x + 28 * scale, y - 8 * scale);
    graphics.lineBetween(x + 11 * scale, y - 4 * scale, x + 39 * scale, y - 25 * scale);
    graphics.lineBetween(x + 13 * scale, y - 2 * scale, x + 35 * scale, y + 9 * scale);
  }

  showNarration(text, holdMs = 2600) {
    this.narrationText.setText(text);
    this.tweens.killTweensOf(this.narrationText);
    this.narrationText.setAlpha(0);
    this.tweens.add({ targets: this.narrationText, alpha: 1, duration: 380 });
    this.tweens.add({ targets: this.narrationText, alpha: 0, duration: 650, delay: holdMs });
  }

  showSystemText(text, holdMs = 2600) {
    this.systemText.setText(text);
    this.tweens.killTweensOf(this.systemText);
    this.systemText.setAlpha(0);
    this.systemText.setScale(1);
    this.tweens.add({ targets: this.systemText, alpha: 1, duration: 140 });
    this.tweens.add({
      targets: this.systemText,
      alpha: 0.28,
      scaleX: 1.035,
      scaleY: 1.035,
      duration: 130,
      yoyo: true,
      repeat: Math.max(3, Math.floor(holdMs / 260)),
      ease: "Stepped"
    });
    this.tweens.add({ targets: this.systemText, alpha: 0, duration: 450, delay: holdMs });
  }

  showFinalPrompt() {
    this.canEnterBossScene = true;
    this.promptText.setText("PRESS SPACE / E TO ANSWER THE CALL");
    this.promptText.setAlpha(0);
    this.tweens.killTweensOf(this.promptText);
    this.tweens.add({ targets: this.promptText, alpha: 1, duration: 550 });
    this.tweens.add({ targets: this.promptText, alpha: 0.38, duration: 850, yoyo: true, repeat: -1 });
  }

  hideOpeningControlChecklist(duration = 300) {
    const targets = [
      this.warningText,
      this.warningSubText,
      this.warningBox,
      this.warningGlow,
      this.arrowPromptText,
      this.arrowPromptBox,
      this.arrowPromptGlow,
      this.promptText
    ].filter(Boolean);

    this.tweens.killTweensOf(targets);
    if (duration <= 0) {
      targets.forEach((target) => target?.setAlpha?.(0));
      return;
    }

    this.tweens.add({
      targets,
      alpha: 0,
      duration,
      ease: "Sine.easeOut"
    });
  }

  enterBossScene(force = false) {
    if (this.isTransitioning) return;
    if (!force && !this.canEnterBossScene) return;
    this.isTransitioning = true;
    this.time.timeScale = 1;
    this.stopMenuBgm(true);
    this.tweens.killAll();

    let started = false;
    const startBoss = () => {
      if (started) return;
      started = true;
      this.scene.start("BossScene");
    };

    this.cameras.main.fadeOut(650, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, startBoss);
    this.time.delayedCall(950, startBoss);
  }

  startRain(alpha = 0.4) {
    this.rainLayer.setAlpha(alpha);
    this.rainLines = [];
    const count = 380;
    for (let i = 0; i < count; i++) {
      this.rainLines.push({
        x: Phaser.Math.Between(-280, this.viewportWidth + 320),
        y: Phaser.Math.Between(-240, this.viewportHeight + 240),
        len: Phaser.Math.Between(20, 52),
        speed: Phaser.Math.FloatBetween(420, 820),
        slant: Phaser.Math.FloatBetween(-18, -38),
        alpha: Phaser.Math.FloatBetween(0.14, 0.44)
      });
    }
  }

  updatePortal(time, dt) {
    if (!this.portalRing || this.portalRing.alpha <= 0.01) return;

    this.portalRing.clear();
    this.portalRing.lineStyle(11, 0x081018, 0.95);
    this.portalRing.strokeEllipse(this.portalX, this.portalY, 160, 430);
    this.portalRing.lineStyle(4, 0x8ee8ff, 0.58 + Math.sin(time * 0.006) * 0.18);
    this.portalRing.strokeEllipse(this.portalX, this.portalY, 118 + Math.sin(time * 0.004) * 8, 374 + Math.cos(time * 0.004) * 18);
    this.portalRing.lineStyle(2, 0xff342a, 0.34);
    for (let i = 0; i < 11; i++) {
      const a = time * 0.001 + i * 0.57;
      this.portalRing.strokeCircle(this.portalX + Math.cos(a) * 78, this.portalY + Math.sin(a) * 208, 4);
    }

    this.portalParticleGraphics.clear();
    for (const p of this.portalParticles) {
      p.angle += p.speed * dt;
      const x = this.portalX + Math.cos(p.angle) * p.radius * 0.56;
      const y = this.portalY + Math.sin(p.angle) * p.radius * 1.72;
      this.portalParticleGraphics.fillStyle(0xbff7ff, 0.42);
      this.portalParticleGraphics.fillCircle(x, y, p.size);
    }
  }

  updateTorches(time) {
    for (const item of this.torches) {
      if (!item?.torch?.active) continue;
      const f = 0.82 + Math.sin(time * 0.035 + item.torch.x) * 0.15 + Math.random() * 0.06;
      item.glow.setAlpha(0.14 + Math.random() * 0.14);
      item.flameOuter.setAlpha(Phaser.Math.Clamp(f, 0.35, 0.98));
      item.flameMid.setScale(Phaser.Math.FloatBetween(0.86, 1.12), Phaser.Math.FloatBetween(0.88, 1.18));
      item.flameInner.setScale(Phaser.Math.FloatBetween(0.82, 1.08), Phaser.Math.FloatBetween(0.82, 1.12));
    }
  }

  updateRain(dt) {
    if (!this.rainLayer || this.rainLayer.alpha <= 0.01) return;

    this.rainLayer.clear();
    for (const drop of this.rainLines) {
      drop.y += drop.speed * dt;
      drop.x += drop.slant * dt * 4;

      if (drop.y > this.viewportHeight + 210) {
        drop.y = Phaser.Math.Between(-240, -20);
        drop.x = Phaser.Math.Between(-320, this.viewportWidth + 320);
      }
      if (drop.x < -340) {
        drop.x = this.viewportWidth + Phaser.Math.Between(120, 340);
      }

      this.rainLayer.lineStyle(1, 0xc7edff, drop.alpha);
      this.rainLayer.lineBetween(drop.x, drop.y, drop.x + drop.slant, drop.y + drop.len);
    }
  }


  updateArrowPromptPosition() {
    if (!this.hero?.active || !this.arrowPromptText?.active) return;
    const tutorialStates = ["crawl", "flashPrompt", "treeTutorial", "jumpTutorial", "leftDashTutorial", "upDashTutorial", "blinkTutorial"];
    if (!tutorialStates.includes(this.state)) return;

    const offsetX = this.state === "treeTutorial" ? 190 : 118;
    const offsetY = this.state === "treeTutorial" ? -145 : -96;
    const targetX = Phaser.Math.Clamp(this.hero.x + offsetX, 104, this.viewportWidth - 104);
    const targetY = Phaser.Math.Clamp(this.hero.y + offsetY, 126, this.viewportHeight - 104);

    this.arrowPromptText.setPosition(targetX, targetY + 5);
    this.arrowPromptBox?.setPosition(targetX, targetY);
    this.arrowPromptGlow?.setPosition(targetX, targetY);
    this.warningText?.setPosition(targetX, targetY - 48);
    this.warningSubText?.setPosition(targetX, targetY + 50);
    this.warningBox?.setPosition(targetX, targetY);
    this.warningGlow?.setPosition(targetX, targetY);
  }

  destroyArrowPrompt() {
    const targets = [this.arrowPromptText, this.arrowPromptBox, this.arrowPromptGlow];
    this.tweens.killTweensOf(targets);
    for (const target of targets) {
      if (target?.active) {
        target.destroy();
      }
    }
    this.arrowPromptText = null;
    this.arrowPromptBox = null;
    this.arrowPromptGlow = null;
  }

  updateWarningPulse(time) {
    if (!this.arrowPromptBox?.active || !this.arrowPromptText?.active || this.arrowPromptBox.alpha <= 0.02) return;

    this.updateArrowPromptPosition();

    const isDoubleTap = this.state === "flashPrompt";
    const dangerColor = isDoubleTap ? 0x62eaff : 0xbff7ff;
    const pulse = 0.55 + Math.sin(time * 0.016) * 0.45;
    this.arrowPromptBox.setFillStyle(isDoubleTap ? 0x00131a : 0x041018, 0.72 + pulse * 0.22);
    this.arrowPromptBox.setStrokeStyle(3, dangerColor, 0.68 + pulse * 0.18);
    this.arrowPromptGlow?.setAlpha(0.10 + pulse * 0.20);
    this.arrowPromptText?.setAlpha(0.72 + pulse * 0.28);

    if (time > this.nextWarningJoltTime) {
      this.nextWarningJoltTime = time + Phaser.Math.Between(760, 1180);
      this.tweens.add({
        targets: this.arrowPromptText,
        angle: Phaser.Math.Between(-5, 5),
        duration: 44,
        yoyo: true,
        ease: "Stepped",
        onComplete: () => this.arrowPromptText?.setAngle(0)
      });
    }
  }


  update(time, delta) {
    if (this.isSettingsOpen || this.state === "mainMenu") return;

    const dt = Math.min(delta / 1000, 0.05);

    const dDown = this.keyD?.isDown;
    if (dDown && !this.wasDDown) {
      this.handleDPress(time);
    }
    this.wasDDown = dDown;

    this.updateIntegratedHeroTutorial(time);
    this.updateCrawl(dt);
    this.updateTorches(time);
    this.updatePortal(time, dt);
    this.updateRain(dt);
    this.updateWarningPulse(time);
  }
}
