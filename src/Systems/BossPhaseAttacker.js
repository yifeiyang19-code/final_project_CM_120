export default class BossPhaseAttacker {
  constructor(scene, config = {}) {
    this.scene = scene;

    this.maxIntegrity = config.maxIntegrity ?? 100;
    this.integrity = config.integrity ?? this.maxIntegrity;
    this.phase = config.phase ?? 1;

    this.decayRate = config.decayRate ?? 0.95;
    this.phase2DecayRate = config.phase2DecayRate ?? 1.55;
    this.phase3DecayRate = config.phase3DecayRate ?? 1.60;
    this.phase4DecayRate = config.phase4DecayRate ?? 1.85;

    this.phase2Threshold = config.phase2Threshold ?? 0.7;
    this.phase3Threshold = config.phase3Threshold ?? 0.35;
    this.phase4Threshold = config.phase4Threshold ?? config.ultimateThreshold ?? 0.10;

    this.attackSpeedMultiplier = config.attackSpeedMultiplier ?? 1.65;
    this.phase2AttackSpeedMultiplier = config.phase2AttackSpeedMultiplier ?? 1.15;
    this.phase3AttackSpeedMultiplier = config.phase3AttackSpeedMultiplier ?? 1.25;
    this.phase4AttackSpeedMultiplier = config.phase4AttackSpeedMultiplier ?? 1.0;

    this.transitioning = false;
    this.ultimateStarted = false;
    this.ultimateProtocolLineEvent = null;
    this.ultimateProtocolLineIndex = 0;
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

    if (
      scene.gameOver ||
      scene.bossIntegrity <= 0 ||
      scene.isPhaseTransitioning ||
      this.transitioning
    ) {
      return;
    }

    const decayPerSecond = scene.bossDecayRate ?? this.decayRate;
    const amount = decayPerSecond * (delta / 1000);

    this.damage(amount);
  }

  damage(amount) {
    const scene = this.scene;

    if (
      scene.gameOver ||
      scene.bossIntegrity <= 0 ||
      scene.isPhaseTransitioning ||
      this.transitioning
    ) {
      return;
    }

    scene.bossIntegrity = Phaser.Math.Clamp(
      scene.bossIntegrity - amount,
      0,
      scene.bossMaxIntegrity
    );

    if (scene.bossPhase >= 4) {
      scene.bossIntegrity = Math.max(scene.bossIntegrity, scene.bossMaxIntegrity * 0.04);
      return;
    }

    if (scene.bossIntegrity <= 0) {
      this.enterUltimateBerserk();
      return;
    }

    this.checkPhaseChange();
  }

  checkPhaseChange() {
    const scene = this.scene;

    if (
      scene.gameOver ||
      scene.bossIntegrity <= 0 ||
      scene.isPhaseTransitioning ||
      this.transitioning
    ) {
      return;
    }

    const ratio = scene.bossIntegrity / scene.bossMaxIntegrity;

    if (scene.bossPhase === 1 && ratio <= this.phase2Threshold) {
      this.enterPhaseTwo();
      return;
    }

    if (scene.bossPhase === 2 && ratio <= this.phase3Threshold) {
      this.enterPhaseThree();
      return;
    }

    if (scene.bossPhase === 3 && ratio <= this.phase4Threshold) {
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
    scene.attackLoop?.cancel?.();
    scene.attackLoop?.skillCooldowns?.set?.("massEnergyTurrets", (scene.time?.now || 0) - 99999);
    scene.__ultimateFinaleStarted = false;

    this.playTransition(
      "ULTIMATE BERSERK",
      "LAST GUARDIAN DIRECTIVE",
      0xffffff,
      []
    );

    scene.time.delayedCall(5200, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.startUltimateVisualPulse();
        this.startUltimateProtocolLines();
      }
    });

    scene.time.delayedCall(24500, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.startUltimateBerserkFinale();
      }
    });

    scene.time.delayedCall(31500, () => {
      if (!scene.gameOver && scene.bossPhase === 4 && !scene.__ultimateFinaleStarted) {
        this.startUltimateBerserkFinale();
      }
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

    scene.rayOfOblivionSkill?.cleanup?.({ endCast: false });
    scene.bossMovement?.cleanupRayVisuals?.({ endCast: false });
    scene.cleanupRayHostileObjects?.();

    scene.audioCues?.play?.("bossPhaseTransition", { volume: 0.56, cooldownMs: 1000 });
    scene.audioCues?.play?.("phaseTitle", { volume: 0.42, cooldownMs: 1000 });
    this.transitioning = true;
    scene.isPhaseTransitioning = true;
    scene.__phaseTransitionStartedAt = scene.time?.now || 0;
    scene.controlsLocked = true;
    scene.setBossCasting?.(true);

    if (scene.attackLoop) {
      scene.attackLoop.cancel();
    } else {
      scene.attackLoopToken++;
    }

    if (scene.stopAllBossActions) {
      scene.stopAllBossActions({
        stopCameraFollow: true,
        freezeBoss: true,
        clearHostiles: true,
        clearTurrets: true,
        keepGravityField: false
      });
    }

    scene.rayOfOblivionSkill?.cleanup?.({ endCast: false });
    scene.bossMovement?.cleanupRayVisuals?.({ endCast: false });
    scene.cleanupRayHostileObjects?.();

    if (scene.player) {
      scene.player.setVelocity(0, 0);
    }

    if (scene.boss) {
      scene.tweens.killTweensOf(scene.boss);
      scene.boss.setVelocity(0, 0);
      scene.boss.body.allowGravity = false;
    }

    const anchor = scene.getPhaseBossAnchor
      ? scene.getPhaseBossAnchor(scene.bossPhase || this.phase)
      : { x: scene.boss?.x || scene.player.x, y: scene.boss?.y || scene.player.y };

    scene.moveBossToPhaseAnchor?.(scene.bossPhase || this.phase, 760);

    scene.cameras.main.stopFollow();

    const focusX = anchor.x;
    const focusY = anchor.y - 120;

    
    
    scene.cameras.main.pan(focusX, focusY, 760, "Sine.easeInOut");

    scene.time.delayedCall(800, () => {
      if (!scene.gameOver && scene.isPhaseTransitioning) {
        scene.cameras.main.pan(focusX, focusY, 260, "Sine.easeOut");
      }
    });

    scene.tweens.add({
      targets: scene.cameras.main,
      zoom: scene.phaseZoom,
      duration: 500,
      ease: "Sine.easeOut"
    });

    if (scene.phaseText) {
      scene.phaseText.setText(title);
      scene.phaseText.setColor("#ffffff");
      scene.phaseText.setStroke("#000000", 12);
      scene.phaseText.setAlpha(0);
    }

    if (scene.phaseSubText) {
      scene.phaseSubText.setText(subtitle);
      scene.phaseSubText.setColor(this.hexToCss(color));
      scene.phaseSubText.setStroke("#000000", 8);
      scene.phaseSubText.setAlpha(0);
    }

    scene.time.delayedCall(350, () => {
      this.createPhaseShockwave(color);

      if (scene.phaseText && scene.phaseSubText) {
        scene.tweens.add({
          targets: [scene.phaseText, scene.phaseSubText],
          alpha: 1,
          duration: 350,
          ease: "Sine.easeOut"
        });
      }

      if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.flash(450, 255, 255, 255);
        scene.cameras.main.shake(650, 0.025);
      }

      if (scene.boss) {
        scene.tweens.add({
          targets: scene.boss,
          scaleX: 2.65,
          scaleY: 2.65,
          duration: 180,
          yoyo: true,
          ease: "Sine.easeOut"
        });

        scene.tweens.addCounter({
          from: 0,
          to: 100,
          duration: 650,
          onUpdate: (tween) => {
            const t = tween.getValue() / 100;
            const base = Phaser.Display.Color.ValueToColor(0xffffff);
            const target = Phaser.Display.Color.ValueToColor(color);

            const r = Phaser.Math.Interpolation.Linear([base.red, target.red], t);
            const g = Phaser.Math.Interpolation.Linear([base.green, target.green], t);
            const b = Phaser.Math.Interpolation.Linear([base.blue, target.blue], t);

            scene.boss.setTint(Phaser.Display.Color.GetColor(r, g, b));
          },
          onComplete: () => {
            if (scene.boss && scene.boss.active) {
              scene.boss.clearTint();
            }
          }
        });
      }
    });

    scene.time.delayedCall(3200, () => {
      if (scene.phaseText && scene.phaseSubText) {
        scene.tweens.add({
          targets: [scene.phaseText, scene.phaseSubText],
          alpha: 0,
          duration: 450,
          ease: "Sine.easeIn"
        });
      }

      scene.tweens.add({
        targets: scene.cameras.main,
        zoom: scene.combatZoom,
        duration: 700,
        ease: "Sine.easeInOut"
      });

      scene.cameras.main.pan(
        scene.player.x,
        scene.player.y - 180,
        700,
        "Sine.easeInOut"
      );

      scene.time.delayedCall(760, () => {
        scene.cameras.main.startFollow(scene.player, true, 0.08, 0.08);
        scene.cameras.main.setFollowOffset(0, scene.cameraFollowOffsetY);

        const finalScriptedPhase = false;
        scene.controlsLocked = false;
        scene.setBossCasting?.(false);
        scene.isPhaseTransitioning = false;
        scene.__phaseTransitionStartedAt = 0;
        this.transitioning = false;

        if (scene.boss && scene.boss.active) {
          scene.boss.body.allowGravity = false;

          if (scene.anims.exists("blue_idle_anim")) {
            scene.boss.play("blue_idle_anim", true);
          }
        }

        scene.atmosphere?.onPhaseTransitionComplete?.();
        if (scene.bossPhase >= 4) {
          scene.thunderstorm?.startFinalStorm?.();
        }
        this.playTransitionDialogue(dialogueLines);
        if (scene.healthPacks && !scene.healthPacks.nextSpawnEvent) {
          scene.healthPacks.scheduleNext?.(2200);
        }

        if (!scene.gameOver && scene.attackLoop) {
          scene.time.delayedCall(scene.bossPhase >= 4 ? 350 : 900, () => {
            if (!scene.gameOver && !scene.isPhaseTransitioning) {
              scene.attackLoop.start();
            }
          });
        }
      });
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
