import BossScene from "./BossScene.js";

const TRAINING_SKILLS = [
  { key: "destructionBlast", label: "Destruction Blast", phase: 1, interval: 6800, note: "straight blast / cover timing" },
  { key: "annihilationSlash", label: "Annihilation Slash", phase: 1, interval: 7200, note: "arc warning / lateral dodge" },
  { key: "massEnergyTurrets", label: "Mass-Energy Turrets", phase: 2, interval: 9000, note: "screen threat tracking" },
  { key: "gravityField", label: "Gravity Field", phase: 2, interval: 9000, note: "escape pull zone" },
  { key: "groundSuppression", label: "Ground Suppression", phase: 2, interval: 8800, note: "climb / vertical dash drill" },
  { key: "holyClearance", label: "Holy Clearance", phase: 2, interval: 7600, note: "small-hitbox dodge drill" },
  { key: "menacingAdvance", label: "Menacing Advance", phase: 2, interval: 7600, note: "charge reaction" },
  { key: "rayOfOblivion", label: "Ray of Oblivion", phase: 3, interval: 8200, note: "beam line-of-sight" },
  { key: "purgeProtocol", label: "Purge Protocol", phase: 3, interval: 13200, note: "drone barrage movement" }
];

export default class TrainingScene extends BossScene {
  constructor() {
    super("TrainingScene");
  }

  init(data = {}) {
    this.restartReason = "training";
    this.trainingMode = true;
    this.trainingSkillKey = data.trainingSkill || null;
    const selected = this.getTrainingSkillDefinition(this.trainingSkillKey);
    const requestedPhase = Number.isFinite(data.devStartPhase) ? data.devStartPhase : selected?.phase || 1;
    this.devStartPhase = Phaser.Math.Clamp(requestedPhase || 1, 1, 3);
    this.skipBossIntro = true;
  }

  create() {
    this.trainingMode = true;
    this.trainingHitCount = 0;
    this.trainingCastCount = 0;
    this.trainingLoopEvent = null;
    this.trainingInvulnerableUntil = 0;
    super.create();
    this.input.topOnly = true;
    this.hideCombatHintOverlay?.(0);
    this.createTrainingOverlay();
    this.input.keyboard?.on?.("keydown-M", () => this.returnToMainMenu());
    this.input.keyboard?.on?.("keydown-T", () => this.showTrainingSelector());

    if (this.trainingSkillKey) {
      this.selectTrainingSkill(this.trainingSkillKey);
    } else {
      this.showTrainingSelector();
    }
  }

  startBossAttackLoop() {
    
    
  }

  updateBossPatrol() {
    
  }

  updateBossIntegrity() {
    this.bossIntegrity = this.bossMaxIntegrity;
    if (this.phaseManager) {
      this.phaseManager.integrity = this.bossMaxIntegrity;
    }
  }

  damageBossIntegrity() {
    
  }

  damagePlayer(amount = 1) {
    const now = this.time?.now || 0;
    if (now < (this.trainingInvulnerableUntil || 0)) {
      this.showAlmostHitFeedback?.();
      return false;
    }

    this.trainingInvulnerableUntil = now + 650;
    this.trainingHitCount += Math.max(1, amount || 1);
    this.playPlayerDamageFeedback();
    this.refreshTrainingStatus();
    return true;
  }

  failTrial() {
    
    this.trainingHitCount += 1;
    this.trainingInvulnerableUntil = (this.time?.now || 0) + 650;
    this.playPlayerDamageFeedback();
    if (this.player?.active) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(1920, 1220);
    }
    this.refreshTrainingStatus();
  }

  requestRestart() {
    if (this.trainingSkillKey) {
      this.selectTrainingSkill(this.trainingSkillKey);
    } else {
      this.showTrainingSelector();
    }
  }

  returnToMainMenu() {
    if (this.__returningToMenu) return;
    this.__returningToMenu = true;

    
    
    
    
    
    this.forceResumeSceneClock?.();
    if (this.physics?.world) {
      this.physics.world.timeScale = 1;
      this.physics.world.resume?.();
    }
    if (this.time) this.time.timeScale = 1;

    this.trainingLoopEvent?.remove(false);
    this.trainingLoopEvent = null;
    this.trainingSelector?.setVisible(false);
    this.controlsLocked = true;

    try {
      this.stopAllBossActions?.({
        clearHostiles: true,
        clearTurrets: true,
        keepGravityField: false,
        freezeBoss: true
      });
      this.cleanupAllBattleObjects?.();
      this.bgm?.fadeOut?.(80);
    } catch (error) {
      console.warn("[TrainingScene] Recovered while returning to menu", error);
    }

    if (typeof window !== "undefined" && window.location?.reload) {
      window.location.reload();
      return;
    }

    this.scene.start("MenuScene");
  }

  createTrainingOverlay() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.trainingUiLayer = this.createScreenSpaceLayer(9600);

    this.trainingHeader = this.add.text(30, 210, "TRAINING ROOM", {
      fontFamily: "monospace",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 8
    });

    this.trainingStatusText = this.add.text(30, 256, "", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#f4feff",
      lineSpacing: 8,
      stroke: "#001018",
      strokeThickness: 6,
      wordWrap: { width: Math.min(720, w - 60) }
    });

    this.trainingUiLayer.add([this.trainingHeader, this.trainingStatusText]);
    this.createTrainingHudButtons();

    this.trainingSelector = this.createScreenSpaceLayer(12000)
      .setVisible(false);

    const panelW = Math.min(1180, w - 56);
    const panelH = Math.min(740, h - 44);
    const centerX = w / 2;
    const centerY = h / 2;
    const topY = centerY - panelH / 2;
    const bottomY = centerY + panelH / 2;

    const shade = this.add.rectangle(0, 0, w, h, 0x000000, 0.82)
      .setOrigin(0, 0)
      .setInteractive();
    const panel = this.add.rectangle(centerX, centerY, panelW, panelH, 0x02070b, 0.985)
      .setStrokeStyle(5, 0xb8f7ff, 0.96);
    const title = this.add.text(centerX, topY + 52, "TRAINING ROOM // SELECT ONE SKILL", {
      fontFamily: "monospace",
      fontSize: "40px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 9
    }).setOrigin(0.5);
    const subtitle = this.add.text(centerX, topY + 104,
      "Practice one readable Boss pattern at a time. The guardian will not decay; you cannot die here.",
      {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#f1fcff",
        stroke: "#001018",
        strokeThickness: 6,
        align: "center",
        wordWrap: { width: Math.min(960, panelW - 100) }
      }).setOrigin(0.5);

    this.trainingSelector.add([shade, panel, title, subtitle]);

    const columns = TRAINING_SKILLS.length > 8 ? 3 : 2;
    const rows = Math.ceil(TRAINING_SKILLS.length / columns);
    const buttonW = Math.min(330, (panelW - 150) / columns);
    const colGap = buttonW + 38;
    const startX = centerX - ((columns - 1) * colGap) / 2;
    const startY = topY + 172;
    const rowH = Math.min(76, (panelH - 350) / Math.max(1, rows - 1));

    TRAINING_SKILLS.forEach((skill, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const bx = startX + col * colGap;
      const by = startY + row * rowH;
      this.addTrainingSkillButton(bx, by, skill, buttonW);
    });

    this.addTrainingUtilityButton(centerX - 135, bottomY - 54, 250, "MAIN MENU", () => this.returnToMainMenu());
    this.addTrainingUtilityButton(centerX + 135, bottomY - 54, 250, "CLOSE", () => this.hideTrainingSelector());
  }

  createTrainingHudButtons() {
    const makeButton = (x, y, width, label, callback) => {
      const rect = this.add.rectangle(x, y, width, 42, 0x061b28, 0.94)
        .setStrokeStyle(3, 0xb8f7ff, 0.82)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#001018",
        strokeThickness: 4
      }).setOrigin(0.5);

      rect.on("pointerover", () => rect.setFillStyle(0x15506a, 1));
      rect.on("pointerout", () => rect.setFillStyle(0x061b28, 0.94));
      rect.on("pointerup", (_pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        callback();
      });
      rect.on("pointerdown", (_pointer, _lx, _ly, event) => event?.stopPropagation?.());

      this.trainingUiLayer.add([rect, text]);
      return { rect, text };
    };

    const h = this.scale.height;
    makeButton(120, h - 38, 180, "SELECT DRILL", () => this.showTrainingSelector());
    makeButton(318, h - 38, 170, "MAIN MENU", () => this.returnToMainMenu());
  }

  addTrainingStageButton(x, y, width, label, phase) {
    const rect = this.add.rectangle(x, y, width, 48, 0x142534, 0.98)
      .setStrokeStyle(4, 0xffe6a8, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#fff4cf",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 5
    }).setOrigin(0.5);

    rect.on("pointerover", () => rect.setFillStyle(0x2a4b62, 1));
    rect.on("pointerout", () => rect.setFillStyle(0x142534, 0.98));
    rect.on("pointerup", (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      this.selectFirstTrainingSkillForPhase(phase);
    });
    rect.on("pointerdown", (_pointer, _lx, _ly, event) => event?.stopPropagation?.());
    this.trainingSelector.add([rect, text]);
  }

  selectFirstTrainingSkillForPhase(phase) {
    const safePhase = Phaser.Math.Clamp(phase || 1, 1, 3);
    const firstSkillForPhase = TRAINING_SKILLS.find((skill) => skill.phase === safePhase) || TRAINING_SKILLS[0];
    if (firstSkillForPhase) {
      this.selectTrainingSkill(firstSkillForPhase.key);
    }
  }

  addTrainingSkillButton(x, y, skill, width = 390) {
    const rect = this.add.rectangle(x, y, width, 68, 0x092839, 0.98)
      .setStrokeStyle(4, 0xb8f7ff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y - 10, skill.label, {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 5
    }).setOrigin(0.5);
    const note = this.add.text(x, y + 17, `Phase ${skill.phase} · ${skill.note}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffe6b8",
      stroke: "#001018",
      strokeThickness: 4
    }).setOrigin(0.5);

    rect.on("pointerover", () => rect.setFillStyle(0x15506a, 1));
    rect.on("pointerout", () => rect.setFillStyle(0x092839, 0.98));
    rect.on("pointerup", (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      this.selectTrainingSkill(skill.key);
    });
    rect.on("pointerdown", (_pointer, _lx, _ly, event) => event?.stopPropagation?.());
    this.trainingSelector.add([rect, text, note]);
  }

  addTrainingUtilityButton(x, y, width, label, callback) {
    const rect = this.add.rectangle(x, y, width, 54, 0x061b28, 0.98)
      .setStrokeStyle(4, 0xb8f7ff, 0.9)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 5
    }).setOrigin(0.5);
    rect.on("pointerover", () => rect.setFillStyle(0x15506a, 1));
    rect.on("pointerout", () => rect.setFillStyle(0x061b28, 0.98));
    rect.on("pointerup", (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();
      callback();
    });
    rect.on("pointerdown", (_pointer, _lx, _ly, event) => event?.stopPropagation?.());
    this.trainingSelector.add([rect, text]);
  }

  getTrainingSkillDefinition(key) {
    return TRAINING_SKILLS.find((skill) => skill.key === key) || null;
  }

  showTrainingSelector() {
    this.hideCombatHintOverlay?.(0);
    this.trainingSelector?.setVisible(true);
    this.trainingSelector?.bringToTop?.();
    this.controlsLocked = true;
    this.trainingLoopEvent?.remove(false);
    this.trainingLoopEvent = null;
    this.stopAllBossActions({ clearHostiles: true, clearTurrets: true, keepGravityField: false, freezeBoss: true });
    this.refreshTrainingStatus();
  }

  hideTrainingSelector() {
    this.trainingSelector?.setVisible(false);
    this.controlsLocked = false;
    this.input.topOnly = true;
  }

  selectTrainingSkill(key) {
    const skill = this.getTrainingSkillDefinition(key);
    if (!skill) return;

    this.trainingSkillKey = skill.key;
    this.trainingHitCount = 0;
    this.trainingCastCount = 0;
    this.trainingLoopEvent?.remove(false);
    this.trainingLoopEvent = null;

    this.bossPhase = skill.phase;
    if (this.phaseManager) {
      this.phaseManager.phase = skill.phase;
      this.phaseManager.integrity = this.bossMaxIntegrity;
      this.phaseManager.attackSpeedMultiplier = skill.phase >= 3
        ? this.phaseManager.phase3AttackSpeedMultiplier
        : skill.phase >= 2
          ? this.phaseManager.phase2AttackSpeedMultiplier
          : 1.0;
    }
    this.attackSpeedMultiplier = this.phaseManager?.attackSpeedMultiplier ?? 1.0;
    this.bossIntegrity = this.bossMaxIntegrity;
    this.bgm?.setPhase?.(skill.phase, true);
    this.atmosphere?.setPhase?.(skill.phase, { force: true });
    this.moveBossToPhaseAnchor?.(skill.phase, 260);
    this.hideTrainingSelector();
    this.showCombatHintOverlay(6000);
    this.refreshTrainingStatus();

    this.time.delayedCall(700, () => this.castTrainingSkillOnce());
    this.trainingLoopEvent = this.time.addEvent({
      delay: skill.interval,
      loop: true,
      callback: () => this.castTrainingSkillOnce()
    });
  }

  castTrainingSkillOnce() {
    const skill = this.getTrainingSkillDefinition(this.trainingSkillKey);
    if (!skill || this.gameOver || this.__pauseMenuOpen || this.trainingSelector?.visible) return;

    this.trainingCastCount += 1;
    this.refreshTrainingStatus();

    if (skill.key === "groundSuppression") {
      this.castGroundSuppression();
      return;
    }

    this.castSkill(skill.key);
  }

  refreshTrainingStatus() {
    if (!this.trainingStatusText) return;
    const skill = this.getTrainingSkillDefinition(this.trainingSkillKey);
    this.trainingStatusText.setText([
      skill ? `Current drill: ${skill.label}` : "Current drill: none selected",
      skill ? `Focus: ${skill.note}` : "Choose a skill from the selector.",
      `Casts: ${this.trainingCastCount || 0} · Hits taken: ${this.trainingHitCount || 0}`,
      "ESC pause · H hint · R reset drill · M main menu / refresh"
    ].join("\n"));
  }

  openTrainingRoom() {
    this.showTrainingSelector();
  }

  restartFromSelectedPhase(phase) {
    this.forceResumeSceneClock?.();
    this.hidePauseMenu?.();
    this.cleanupAllBattleObjects();
    this.selectFirstTrainingSkillForPhase(phase);
  }

  cleanupAllBattleObjects() {
    this.trainingLoopEvent?.remove(false);
    this.trainingLoopEvent = null;
    super.cleanupAllBattleObjects();
  }
}
