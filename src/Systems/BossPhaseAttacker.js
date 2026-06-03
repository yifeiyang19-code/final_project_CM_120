export default class BossPhaseAttacker {
  constructor(scene, config = {}) {
    this.scene = scene;

    this.maxIntegrity = config.maxIntegrity ?? 100;
    this.integrity = config.integrity ?? this.maxIntegrity;
    this.phase = config.phase ?? 1;

    this.decayRate = config.decayRate ?? 0.95;
    this.phase2DecayRate = config.phase2DecayRate ?? 0.875;
    this.phase3DecayRate = config.phase3DecayRate ?? 0.333;
    this.phase4DecayRate = config.phase4DecayRate ?? 0;

    this.phase2Threshold = config.phase2Threshold ?? 0.7;
    this.phase3Threshold = config.phase3Threshold ?? 0.35;
    this.phase4Threshold = config.phase4Threshold ?? config.ultimateThreshold ?? 0.10;

    this.phaseTimelineSeconds = {
      phase2: config.phaseTimelineSeconds?.phase2 ?? 43,
      phase3: config.phaseTimelineSeconds?.phase3 ?? 83,
      phase4: config.phaseTimelineSeconds?.phase4 ?? 133
    };
    this.phase4CountdownSeconds = config.phase4CountdownSeconds ?? 38;
    this.phaseTimingGraceSeconds = config.phaseTimingGraceSeconds ?? 6;

    this.attackSpeedMultiplier = config.attackSpeedMultiplier ?? 1.30;
    this.phase2AttackSpeedMultiplier = config.phase2AttackSpeedMultiplier ?? 1.03;
    this.phase3AttackSpeedMultiplier = config.phase3AttackSpeedMultiplier ?? 0.90;
    this.phase4AttackSpeedMultiplier = config.phase4AttackSpeedMultiplier ?? 0.82;

    this.transitioning = false;
    this.ultimateStarted = false;
    this.ultimateProtocolLineEvent = null;
    this.ultimateProtocolLineIndex = 0;
    this.ultimateCountdownEvent = null;
    this.ultimateCountdownText = null;
    this.ultimateCountdownStartedAt = 0;
    this.ultimateCountdownDuration = this.phase4CountdownSeconds * 1000;
  }

  syncToScene() {
    const scene = this.scene;

    scene.bossMaxIntegrity = this.maxIntegrity;
    scene.bossIntegrity = this.integrity;
    scene.bossPhase = this.phase;
    scene.bossDecayRate = this.decayRate;
    scene.attackSpeedMultiplier = this.attackSpeedMultiplier;
  }

  update(delta) {
    const scene = this.scene;

    if (scene.gameOver || scene.bossIntegrity <= 0) {
      return;
    }

    this.ensureTimelineStarted();
    this.checkPhaseChange();

    if (scene.isPhaseTransitioning || this.transitioning) {
      return;
    }

    const decayPerSecond = scene.bossDecayRate ?? this.decayRate;
    const amount = decayPerSecond * (delta / 1000);

    if (amount > 0) {
      this.applyDisplayDecay(amount);
    }

    this.checkPhaseChange();
  }

  ensureTimelineStarted() {
    const scene = this.scene;
    const now = scene.time?.now || 0;
    if (!Number.isFinite(scene.__bossCombatStartedAt) || scene.__bossCombatStartedAt <= 0) {
      scene.__bossCombatStartedAt = now;
    }
    if (!Number.isFinite(scene.__phaseTimelineStartedAt) || scene.__phaseTimelineStartedAt <= 0) {
      scene.__phaseTimelineStartedAt = scene.__bossCombatStartedAt;
    }
  }

  applyDisplayDecay(amount) {
    const scene = this.scene;
    if (scene.bossPhase >= 4) {
      scene.bossIntegrity = Math.max(scene.bossIntegrity, scene.bossMaxIntegrity * 0.04);
      return;
    }

    scene.bossIntegrity = Phaser.Math.Clamp(
      scene.bossIntegrity - amount,
      1,
      scene.bossMaxIntegrity
    );
  }

  damage(amount) {
    const scene = this.scene;

    if (scene.gameOver || scene.bossIntegrity <= 0) {
      return;
    }

    this.ensureTimelineStarted();
    this.applyDisplayDecay(Math.max(0, amount || 0));
    this.checkPhaseChange();
  }

  getCombatElapsedSeconds() {
    this.ensureTimelineStarted();
    const scene = this.scene;
    const now = scene.time?.now || 0;
    const startedAt = scene.__bossCombatStartedAt || scene.__phaseTimelineStartedAt || now;
    return Math.max(0, (now - startedAt) / 1000);
  }

  getPhaseMarkerSeconds(phase) {
    if (phase === 2) return this.phaseTimelineSeconds.phase2;
    if (phase === 3) return this.phaseTimelineSeconds.phase3;
    if (phase === 4) return this.phaseTimelineSeconds.phase4;
    return 0;
  }

  getCurrentPhaseFloorRatio() {
    const elapsed = this.getCombatElapsedSeconds();
    const buffer = 0.012;
    if (this.phase === 1 && elapsed < this.phaseTimelineSeconds.phase2 - this.phaseTimingGraceSeconds) return this.phase2Threshold + buffer;
    if (this.phase === 2 && elapsed < this.phaseTimelineSeconds.phase3 - this.phaseTimingGraceSeconds) return this.phase3Threshold + buffer;
    if (this.phase === 3 && elapsed < this.phaseTimelineSeconds.phase4 - this.phaseTimingGraceSeconds) return this.phase4Threshold + buffer;
    return 0;
  }

  enforcePhaseTimingFloor() {
    const scene = this.scene;
    const floorRatio = this.getCurrentPhaseFloorRatio();
    if (floorRatio <= 0 || scene.bossPhase >= 4) return;
    const floorIntegrity = scene.bossMaxIntegrity * floorRatio;
    if (scene.bossIntegrity < floorIntegrity) {
      scene.bossIntegrity = floorIntegrity;
    }
  }

  canAdvanceToPhase(phase) {
    return this.getCombatElapsedSeconds() >= this.getPhaseMarkerSeconds(phase);
  }

  canAdvanceByHealth(phase, ratio, threshold) {
    const marker = this.getPhaseMarkerSeconds(phase);
    const elapsed = this.getCombatElapsedSeconds();
    return ratio <= threshold && elapsed >= marker - this.phaseTimingGraceSeconds;
  }

  checkPhaseChange() {
    const scene = this.scene;

    if (
      scene.gameOver ||
      scene.isPhaseTransitioning ||
      this.transitioning
    ) {
      return;
    }

    if (scene.bossPhase === 1 && this.canAdvanceToPhase(2)) {
      this.enterPhaseTwo();
      return;
    }

    if (scene.bossPhase === 2 && this.canAdvanceToPhase(3)) {
      this.enterPhaseThree();
      return;
    }

    if (scene.bossPhase === 3 && this.canAdvanceToPhase(4)) {
      this.enterUltimateBerserk();
    }
  }

  enterPhaseTwo() {
    const scene = this.scene;

    scene.bossPhase = 2;
    scene.bossDecayRate = this.phase2DecayRate;
    scene.attackSpeedMultiplier = this.phase2AttackSpeedMultiplier;

    this.phase = 2;
    this.decayRate = this.phase2DecayRate;
    this.attackSpeedMultiplier = this.phase2AttackSpeedMultiplier;

    scene.bgm?.setPhase?.(2);
    scene.atmosphere?.setPhase?.(2);

    this.playTransition(
      "PHASE II",
      "EMERGENCY DEFENSE ESCALATION",
      this.getPhaseTransitionColor(2, 0xffb04a),
      [
        "Containment failure increasing.",
        "Morningstar defense grid escalating response.",
        "All guardian units remain active."
      ]
    );
  }

  enterPhaseThree() {
    const scene = this.scene;

    scene.bossPhase = 3;
    scene.bossDecayRate = this.phase3DecayRate;
    scene.attackSpeedMultiplier = this.phase3AttackSpeedMultiplier;

    this.phase = 3;
    this.decayRate = this.phase3DecayRate;
    this.attackSpeedMultiplier = this.phase3AttackSpeedMultiplier;

    scene.bgm?.setPhase?.(3);
    scene.atmosphere?.setPhase?.(3, { deferRain: true });

    this.playTransition(
      "PHASE III",
      "FINAL EXCLUSION PROTOCOL",
      this.getPhaseTransitionColor(3, 0xff3d3d),
      [
        "Central correction failed.",
        "Final exclusion protocol released.",
        "No exit route remains authorized."
      ]
    );
  }

  enterUltimateBerserk() {
    const scene = this.scene;

    if (this.ultimateStarted || scene.gameOver) return;

    this.ultimateStarted = true;
    scene.bossPhase = 4;
    scene.bossIntegrity = Math.max(scene.bossIntegrity, scene.bossMaxIntegrity * 0.08);
    scene.bossDecayRate = this.phase4DecayRate;
    scene.attackSpeedMultiplier = this.phase4AttackSpeedMultiplier;

    this.phase = 4;
    this.decayRate = this.phase4DecayRate;
    this.attackSpeedMultiplier = this.phase4AttackSpeedMultiplier;

    scene.bgm?.setPhase?.(4);
    scene.atmosphere?.setPhase?.(4, { force: true });
    this.moveBossToPhaseFourCenter();
    scene.attackLoop?.cancel?.();
    scene.massEnergyTurretsSkill?.cleanupTurrets?.(true);
    scene.attackLoop?.skillCooldowns?.set?.("massEnergyTurrets", (scene.time?.now || 0) + 999999);
    scene.__ultimateFinaleStarted = false;
    if (scene.rayOfOblivionSkill) scene.rayOfOblivionSkill.__phase4OpeningRadialStarted = false;

    this.playTransition(
      "ULTIMATE BERSERK",
      "LAST GUARDIAN DIRECTIVE",
      0xffffff,
      []
    );

    scene.time.delayedCall(1760, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.startUltimateVisualPulse();
        this.startUltimateProtocolLines();
        this.startUltimateCountdown(this.phase4CountdownSeconds);
        scene.rayOfOblivionSkill?.startPhase4OpeningRadialSweep?.();
        scene.rayOfOblivionSkill?.startPhase4ScriptedLaserWalls?.();
        this.startPhase4BrotherPressure();
        scene.purgeProtocolSkill?.startPhase4EndlessBarrage?.();
      }
    });
  }

  moveBossToPhaseFourCenter() {
    const scene = this.scene;
    if (!scene.boss?.active || !scene.cameras?.main) return;
    const view = scene.cameras.main.worldView;
    const targetX = view.centerX;
    const targetY = Phaser.Math.Clamp(view.centerY - 80, view.top + 150, view.bottom - 180);
    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;
    scene.tweens.killTweensOf(scene.boss);
    scene.tweens.add({
      targets: scene.boss,
      x: targetX,
      y: targetY,
      duration: 420,
      ease: "Cubic.easeOut"
    });
  }

  startPhase4BrotherPressure() {
    const scene = this.scene;
    if (scene.__phase4BrotherPressureEvent) scene.__phase4BrotherPressureEvent.remove(false);

    const fire = () => {
      if (scene.gameOver || scene.bossPhase !== 4 || scene.__ultimateFinaleStarted) {
        scene.__phase4BrotherPressureEvent?.remove(false);
        scene.__phase4BrotherPressureEvent = null;
        return;
      }
      scene.destructionBlastSkill?.castSingle?.(true, 0);
      scene.time.delayedCall(520, () => {
        if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
          scene.annihilationSlashSkill?.castSingle?.(0xffffff, 0.88, 0);
        }
      });
    };

    scene.time.delayedCall(1100, fire);
    scene.__phase4BrotherPressureEvent = scene.time.addEvent({
      delay: 4300,
      loop: true,
      callback: fire
    });
  }

  startUltimateBerserkFinale() {
    const scene = this.scene;

    if (scene.gameOver || scene.__ultimateFinaleStarted) return;

    if (scene.isPhaseTransitioning || this.transitioning) {
      scene.time.delayedCall(700, () => this.startUltimateBerserkFinale());
      return;
    }

    scene.__ultimateFinaleStarted = true;
    this.stopUltimateProtocolLines();
    this.stopUltimateCountdown();
    if (scene.__phase4BrotherPressureEvent) {
      scene.__phase4BrotherPressureEvent.remove(false);
      scene.__phase4BrotherPressureEvent = null;
    }
    scene.purgeProtocolSkill?.stopPhase4EndlessBarrage?.();
    scene.attackLoop?.cancel?.();
    scene.stopAllBossActions?.({
      stopCameraFollow: false,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });
    scene.controlsLocked = true;
    scene.setBossCasting?.(true);
    scene.audioCues?.play?.("bossPhaseTransition", { volume: 0.46, cooldownMs: 900 });
    scene.cameras.main.shake(520, 0.014);
    scene.atmosphere?.phaseFlash?.(0xffffff, 0.24);

    scene.time.delayedCall(1250, () => {
      if (scene.gameOver) return;
      scene.skipBossDeathTransmissionBossLines = true;
      scene.heroFinalLine = "NO ONE WAS.";
      scene.bossIntegrity = 0;
      scene.endBossFight();
    });
  }


  startUltimateCountdown(seconds = 17) {
    const scene = this.scene;
    if (this.ultimateCountdownEvent || scene.gameOver) return;

    this.ultimateCountdownDuration = Math.max(8, seconds) * 1000;
    this.ultimateCountdownStartedAt = scene.time?.now || 0;

    const screenPos = this.getCountdownScreenPosition();
    this.ultimateCountdownText = scene.add.text(screenPos.x, screenPos.y, String(Math.ceil(this.ultimateCountdownDuration / 1000)), {
      fontFamily: "monospace",
      fontSize: "44px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 10
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

    this.ultimateCountdownEvent = scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => this.updateUltimateCountdown()
    });
    this.updateUltimateCountdown();
  }

  updateUltimateCountdown() {
    const scene = this.scene;
    if (scene.gameOver || scene.bossPhase < 4 || scene.__ultimateFinaleStarted) {
      this.stopUltimateCountdown();
      return;
    }

    const elapsed = (scene.time?.now || 0) - this.ultimateCountdownStartedAt;
    const remainMs = Math.max(0, this.ultimateCountdownDuration - elapsed);
    const remain = Math.ceil(remainMs / 1000);

    if (this.ultimateCountdownText?.active) {
      const pos = this.getCountdownScreenPosition();
      this.ultimateCountdownText
        .setText(String(remain))
        .setPosition(pos.x, pos.y)
        .setColor(remain <= 10 ? "#ff3344" : "#ffffff")
        .setScale(remain <= 10 ? 1.18 : 1.0);
    }

    if (remainMs <= 0) {
      this.startUltimateBerserkFinale();
    }
  }


  getCountdownScreenPosition() {
    const scene = this.scene;
    const cam = scene.cameras?.main;
    const width = scene.scale?.width || cam?.width || 1280;
    if (!scene.boss?.active || !cam) {
      return { x: width * 0.5, y: 120 };
    }
    return {
      x: Phaser.Math.Clamp(scene.boss.x - cam.scrollX, 80, width - 80),
      y: Phaser.Math.Clamp(scene.boss.y - cam.scrollY - 104, 70, 190)
    };
  }

  stopUltimateCountdown() {
    if (this.ultimateCountdownEvent) {
      this.ultimateCountdownEvent.remove(false);
      this.ultimateCountdownEvent = null;
    }
    if (this.ultimateCountdownText?.active) {
      this.ultimateCountdownText.destroy();
    }
    this.ultimateCountdownText = null;
  }


  startUltimateProtocolLines() {
    const scene = this.scene;
    if (this.ultimateProtocolLineEvent || scene.gameOver || scene.bossPhase !== 4) return;

    this.ultimateProtocolLineIndex = 0;
    this.speakUltimateProtocolLine();
    this.ultimateProtocolLineEvent = scene.time.addEvent({
      delay: 6800,
      loop: true,
      callback: () => {
        if (scene.gameOver || scene.bossPhase !== 4 || scene.__ultimateFinaleStarted) {
          this.stopUltimateProtocolLines();
          return;
        }
        this.speakUltimateProtocolLine();
      }
    });
  }

  speakUltimateProtocolLine() {
    const scene = this.scene;
    if (!scene.boss?.active) return;

    const lines = [
      "Please remain calm. Do not panic.",
      "Help is on the way.",
      "You will be safe.",
      "Emergency protocol active.",
      "Missing personnel registry incomplete.",
      "Protection order survives. Trespasser purge continues."
    ];
    const line = lines[this.ultimateProtocolLineIndex % lines.length];
    this.ultimateProtocolLineIndex += 1;

    scene.bossSpeak?.(line, 3000, {
      ignoreOnce: true,
      anchorToSpeaker: true,
      fontSize: "27px",
      boxWidth: 880,
      boxHeight: 116,
      offsetY: -154,
      depth: 7600,
      color: "#ffffff",
      strokeColor: 0x7df9ff
    });
    scene.audioCues?.play?.("bossVoiceGlitch", { volume: 0.16, cooldownMs: 1300 });
  }

  stopUltimateProtocolLines() {
    if (this.ultimateProtocolLineEvent) {
      this.ultimateProtocolLineEvent.remove(false);
      this.ultimateProtocolLineEvent = null;
    }
  }


  startUltimateVisualPulse() {
    const scene = this.scene;
    if (scene.__ultimateVisualPulseEvent) {
      scene.__ultimateVisualPulseEvent.remove(false);
    }

    scene.__ultimateVisualPulseEvent = scene.time.addEvent({
      delay: 950,
      loop: true,
      callback: () => {
        if (scene.gameOver || scene.bossPhase !== 4 || scene.__ultimateFinaleStarted) {
          scene.__ultimateVisualPulseEvent?.remove(false);
          scene.__ultimateVisualPulseEvent = null;
          return;
        }
        this.playUltimatePulse();
      }
    });
  }

  playUltimatePulse() {
    const scene = this.scene;
    if (!scene.boss || !scene.boss.active) return;

    const x = scene.boss.x;
    const y = scene.boss.y;
    const ring = scene.add.circle(x, y, 42, 0xffffff, 0.08)
      .setDepth(880)
      .setStrokeStyle(6, 0xffffff, 0.88)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: ring,
      radius: 420,
      alpha: 0,
      duration: 620,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy()
    });

    scene.cameras.main.shake(160, 0.005);
    scene.atmosphere?.phaseFlash?.(0xffffff, 0.08);
  }



  cleanupActiveSkillBeforeTransition() {
    const scene = this.scene;
    try {
      scene.cancelPendingBattleTimers?.();
      scene.menacingAdvanceSkill?.cleanupChargeObjects?.();
      scene.purgeProtocolSkill?.cleanup?.();
      scene.rayOfOblivionSkill?.cleanup?.({ endCast: false });
      scene.bossMovement?.cleanupRayVisuals?.({ endCast: false });
      scene.cleanupRayHostileObjects?.();
      scene.cleanupHostileObjects?.();
      scene.safeDeactivateGravityField?.();
      scene.massEnergyTurretsSkill?.cleanupTurrets?.(true);
      scene.thunderstorm?.stop?.();
      if (scene.__phase4BrotherPressureEvent) {
        scene.__phase4BrotherPressureEvent.remove(false);
        scene.__phase4BrotherPressureEvent = null;
      }
      scene.purgeProtocolSkill?.stopPhase4EndlessBarrage?.();
      if (scene.__ultimateVisualPulseEvent) {
        scene.__ultimateVisualPulseEvent.remove(false);
        scene.__ultimateVisualPulseEvent = null;
      }
    } catch (_error) {
    }
  }

  getPhaseTransitionColor(phase, fallback) {
    const accessibility = this.scene.registry.get("gameConfig")?.accessibility || {};
    if (!accessibility.colorBlindMode) return fallback;

    const key = phase === 2 ? "phase2" : "phase3";
    const configured = accessibility.colorBlindPalette?.[key]?.fill;
    if (typeof configured === "string") {
      const parsed = Number.parseInt(configured.replace(/^0x/, ""), 16);
      if (Number.isFinite(parsed)) return parsed;
    }

    return phase === 2 ? 0xe6d04a : 0xb56cff;
  }

  playTransition(
    title = "PHASE SHIFT",
    subtitle = "DEFENSE PATTERN CHANGED",
    color = 0x7df9ff,
    dialogueLines = []
  ) {
    const scene = this.scene;

    if (scene.gameOver || this.transitioning) return;

    this.transitioning = true;
    scene.isPhaseTransitioning = true;
    scene.__phaseTransitionStartedAt = scene.time?.now || 0;
    scene.controlsLocked = true;
    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    if (scene.player?.body) scene.player.setVelocity(0, 0);
    scene.playerController?.directionalDash?.cancel?.();
    scene.playerController?.blinkAbility?.cancel?.();

    scene.attackLoop?.cancel?.();
    if (!scene.attackLoop) scene.attackLoopToken++;

    this.cleanupActiveSkillBeforeTransition();

    if (scene.boss?.active) {
      scene.tweens.killTweensOf(scene.boss);
      scene.boss.setVelocity(0, 0);
      scene.boss.body.allowGravity = false;
      if (scene.anims.exists("blue_idle_anim")) scene.boss.play("blue_idle_anim", true);
      const cam = scene.cameras?.main;
      if (cam) {
        scene.__phaseTransitionCameraZoom = scene.combatZoom || scene.phaseZoom || cam.zoom || 0.78;
        cam.stopFollow();
        cam.pan(scene.boss.x, scene.boss.y - 70, 360, "Sine.easeInOut", true);
        cam.setZoom(scene.__phaseTransitionCameraZoom);
      }
    }

    scene.audioCues?.play?.("bossPhaseTransition", { volume: 0.54, cooldownMs: 900 });
    scene.audioCues?.play?.("phaseTitle", { volume: 0.42, cooldownMs: 900 });

    const cam = scene.cameras?.main;
    const width = scene.scale?.width || cam?.width || 1280;
    const height = scene.scale?.height || cam?.height || 720;
    const centerX = width * 0.5;
    const centerY = height * 0.43;

    const overlay = scene.add.rectangle(centerX, centerY, width, height, color, 0.0)
      .setScrollFactor(0)
      .setDepth(9100)
      .setBlendMode(Phaser.BlendModes.ADD);

    const panel = scene.add.rectangle(centerX, centerY, Math.min(1180, width - 40), 248, 0x04070c, 0.88)
      .setScrollFactor(0)
      .setDepth(9103)
      .setStrokeStyle(4, color, 0.96);

    const titleText = scene.add.text(centerX, centerY - 38, title, {
      fontFamily: "monospace",
      fontSize: "96px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 14,
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9104);

    const subText = scene.add.text(centerX, centerY + 38, subtitle, {
      fontFamily: "monospace",
      fontSize: "48px",
      fontStyle: "bold",
      color: this.hexToCss(color),
      stroke: "#000000",
      strokeThickness: 9,
      align: "center"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9104);

    const objects = [overlay, panel, titleText, subText];
    panel.setScale(0.86, 1);
    titleText.setAlpha(0);
    subText.setAlpha(0);

    if (cam) {
      cam.flash(90, 255, 255, 255);
      cam.shake(180, 0.0055);
    }

    const pulseAt = (delay, index) => {
      scene.time.delayedCall(delay, () => {
        if (scene.gameOver || !scene.boss?.active) return;
        scene.boss.setVelocity(0, 0);
        scene.boss.body.allowGravity = false;
        scene.boss.setTint?.(color);
        const ring = scene.add.circle(scene.boss.x, scene.boss.y, 38, color, 0.12)
          .setDepth(880)
          .setStrokeStyle(7, color, 0.98)
          .setBlendMode(Phaser.BlendModes.ADD);
        const core = scene.add.circle(scene.boss.x, scene.boss.y, 18, 0xffffff, 0.22)
          .setDepth(881)
          .setBlendMode(Phaser.BlendModes.ADD);
        const scanX = scene.add.rectangle(scene.boss.x, scene.boss.y, 18, 520 + index * 90, color, 0.34)
          .setDepth(879)
          .setBlendMode(Phaser.BlendModes.ADD);
        const scanY = scene.add.rectangle(scene.boss.x, scene.boss.y, 620 + index * 120, 14, color, 0.26)
          .setDepth(879)
          .setBlendMode(Phaser.BlendModes.ADD);
        objects.push(ring, core, scanX, scanY);
        scene.tweens.add({ targets: ring, radius: 440 + index * 135, alpha: 0, duration: 620, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
        scene.tweens.add({ targets: core, radius: 118 + index * 34, alpha: 0, duration: 420, ease: "Quad.easeOut", onComplete: () => core.destroy() });
        scene.tweens.add({ targets: [scanX, scanY], scaleX: 1.35, scaleY: 1.35, alpha: 0, duration: 520, ease: "Sine.easeOut", onComplete: () => { scanX.destroy(); scanY.destroy(); } });
        scene.tweens.add({ targets: scene.boss, scaleX: 2.42, scaleY: 2.42, duration: 130, yoyo: true, ease: "Sine.easeInOut" });
        scene.cameras.main.shake(120, 0.0028 + index * 0.001);
        scene.audioCues?.play?.("bossPhaseTransition", { volume: 0.22, cooldownMs: 120 });
      });
    };

    pulseAt(120, 0);
    pulseAt(560, 1);
    pulseAt(1000, 2);

    scene.tweens.add({ targets: overlay, alpha: 0.18, duration: 120, yoyo: true, repeat: 2, ease: "Sine.easeOut" });
    scene.tweens.add({ targets: panel, scaleX: 1, duration: 180, ease: "Back.easeOut" });
    scene.tweens.add({ targets: [titleText, subText], alpha: 1, duration: 160, ease: "Sine.easeOut" });

    scene.time.delayedCall(1420, () => {
      scene.tweens.add({ targets: [panel, titleText, subText], alpha: 0, duration: 220, ease: "Sine.easeIn" });
      scene.tweens.add({ targets: overlay, alpha: 0, duration: 180, ease: "Sine.easeIn" });
    });

    scene.time.delayedCall(1680, () => {
      objects.forEach((obj) => obj?.destroy?.());

      scene.controlsLocked = false;
      scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);
      scene.isPhaseTransitioning = false;
      scene.__phaseTransitionStartedAt = 0;
      this.transitioning = false;

      if (scene.boss?.active) {
        scene.boss.body.allowGravity = false;
        scene.boss.setVelocity(0, 0);
        scene.boss.clearTint?.();
        if (scene.anims.exists("blue_idle_anim")) scene.boss.play("blue_idle_anim", true);
      }

      const cam = scene.cameras.main;
      cam.resetFX?.();
      cam.stopFollow();
      cam.setZoom(scene.combatZoom || scene.phaseZoom || scene.__phaseTransitionCameraZoom || 0.78);
      cam.startFollow(scene.player, true, 0.08, 0.08);
      cam.setFollowOffset(0, scene.cameraFollowOffsetY);
      scene.__phaseTransitionCameraZoom = null;
      scene.atmosphere?.onPhaseTransitionComplete?.();
      if (scene.bossPhase >= 4) scene.thunderstorm?.startFinalStorm?.();
      this.playTransitionDialogue(dialogueLines);

      if (scene.healthPacks && !scene.healthPacks.nextSpawnEvent) {
        scene.healthPacks.scheduleNext?.(1700);
      }

      if (!scene.gameOver && scene.attackLoop) {
        scene.time.delayedCall(scene.bossPhase >= 4 ? 180 : 260, () => {
          if (!scene.gameOver && !scene.isPhaseTransitioning) scene.attackLoop.start();
        });
      }
    });
  }

  playTransitionDialogue(dialogueLines) {
    const scene = this.scene;

    if (!dialogueLines || dialogueLines.length === 0) return;

    const [firstLine, ...remainingLines] = dialogueLines;

    scene.time.delayedCall(260, () => {
      if (!scene.gameOver && firstLine) {
        scene.bossSpeak?.(firstLine, 2600, {
          anchorToSpeaker: true,
          fontSize: "22px",
          boxWidth: 620,
          boxHeight: 82,
          offsetY: -138,
          depth: 7300
        });
      }
    });

    remainingLines.forEach((line, index) => {
      scene.time.delayedCall(700 + index * 520, () => {
        if (!scene.gameOver) {
        }
      });
    });
  }

  createPhaseShockwave(color = 0x7df9ff) {
    const scene = this.scene;

    if (!scene.boss || !scene.boss.active) return;

    const x = scene.boss.x;
    const y = scene.boss.y;

    const ring = scene.add.circle(x, y, 40, color, 0.12)
      .setDepth(850)
      .setStrokeStyle(5, color, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: ring,
      radius: 620,
      alpha: 0,
      duration: 850,
      ease: "Sine.easeOut",
      onComplete: () => {
        ring.destroy();
      }
    });

    const inner = scene.add.circle(x, y, 20, 0xffffff, 0.18)
      .setDepth(849)
      .setBlendMode(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: inner,
      radius: 360,
      alpha: 0,
      duration: 600,
      ease: "Quad.easeOut",
      onComplete: () => {
        inner.destroy();
      }
    });
  }

  hexToCss(hex) {
    const color = Phaser.Display.Color.ValueToColor(hex);
    return Phaser.Display.Color.RGBToString(
      color.red,
      color.green,
      color.blue,
      0,
      "#"
    );
  }
}
