import EffectManager from "../Systems/EffectManager.js";
import DialogueManager from "../Systems/DialogueManager.js";
import BossUiManager from "../Systems/BossUiManager.js";
import BossPhaseAttacker from "../Systems/BossPhaseAttacker.js";
import BossAttackLoop from "../Systems/BossAttackLoop.js";
import HitStopManager from "../Systems/HitStopManager.js";
import HealthPackManager from "../Systems/HealthPackManager.js";
import BossBgmManager from "../Systems/BossBgmManager.js";
import PhaseAtmosphereManager from "../Systems/PhaseAtmosphereManager.js";
import Phase4ThunderstormSystem from "../Systems/Phase4ThunderstormSystem.js";
import AudioCueManager from "../Managers/AudioCueManager.js";
import DebugDraw from "../Systems/DebugDraw.js";
import ArenaBuilder from "../Systems/ArenaBuilder.js";
import { ARENA, BOSS_STATS } from "../Utils/constants.js";

import PlayerController from "../Controllers/PlayerController.js";
import BossMovementController from "../Controllers/BossMovementController.js";

import DestructionBlastSkill from "../BossSkills/DestructionBlastSkill.js";
import AnnihilationSlashSkill from "../BossSkills/AnnihilationSlashSkill.js";
import MassEnergyTurretsSkill from "../BossSkills/MassEnergyTurretsSkill.js";
import GravityFieldSkill from "../BossSkills/GravityFieldSkill.js";
import HolyClearance from "../BossSkills/HolyClearance.js";
import MenacingAdvance from "../BossSkills/MenacingAdvance.js";
import RayOfOblivion from "../BossSkills/RayOfOblivion.js";
import PurgeProtocolSkill from "../BossSkills/PurgeProtocolSkill.js";

import BossIntroSequence from "../BossSequences/BossIntroSequence.js";
import BossDeathSequence from "../BossSequences/BossDeathSequence.js";

export default class BossScene extends Phaser.Scene {
  constructor(sceneKey = "BossScene") {
    super(sceneKey);
  }

  init(data = {}) {
    const restartReason = data.restartReason || "firstEntry";
    const requestedPhase = Number.isFinite(data.devStartPhase) ? data.devStartPhase : 1;

    this.restartReason = restartReason;
    
    
    this.devStartPhase = Phaser.Math.Clamp(requestedPhase || 1, 1, 4);
    this.skipBossIntro = restartReason !== "firstEntry";
  }

  create() {
    
    this.debugMapBodies = false;
    this.debugDrawEnabled = false;

    this.createMap();
    this.createCoreValues();
    this.patchTrackedBattleTimers();
    this.applyAccessibilityRuntimeSettings();
    this.createSystems();
    this.createActors();
    this.atmosphere?.setPhase?.(this.bossPhase || 1);
    this.keyF1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F1);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    
    this.createMapColliders();

    this.healthPacks?.start?.();
    this.createPlayerTreeSystem();
    this.createSkills();
    this.createSequences();
    this.registerRestartInput();
    this.registerSceneCleanup();
    this.createCombatHintOverlay();
    this.createPauseMenu();
    this.createOffscreenThreatIndicators();
    
    

    if (this.skipBossIntro) {
      this.startCombatImmediately();
    } else {
      this.introSequence.startArenaEntrance();
    }
  }

  createMap() {
    this.arena = new ArenaBuilder(this).build();
  }

  getStableCollisionRects() {
    return this.arena.getStableCollisionRects();
  }

  isSolidAtWorld(x, y) {
    return this.arena.isSolidAtWorld(x, y);
  }

  isBlockingSolidAtWorld(x, y) {
    return this.arena.isBlockingSolidAtWorld(x, y);
  }

  isPlayerAreaEmptyAt(x, y, radiusX = 18, radiusY = 34) {
    return this.arena.isPlayerAreaEmptyAt(x, y, radiusX, radiusY);
  }

  findNearestSolidSurfaceForTree(worldX, worldY, direction = "up") {
    return this.arena.findNearestSolidSurfaceForTree(worldX, worldY, direction);
  }

  findMapObject(layerName, objectName) {
    return this.arena.findMapObject(layerName, objectName);
  }

  isPlayerInLadderZone(player = this.player) {
    return this.arena.isPlayerInLadderZone(player);
  }

  showLadderHint(x, y) {
    return this.arena.showLadderHint(x, y);
  }

  createMapColliders() {
    return this.arena.addActorColliders();
  }

  createScreenSpaceLayer(depth = 9000) {
    this.__screenSpaceLayers = this.__screenSpaceLayers || new Set();
    const layer = this.add.container(0, 0)
      .setDepth(depth)
      .setScrollFactor(1);
    layer.__screenSpaceLayer = true;
    this.__screenSpaceLayers.add(layer);
    this.layoutScreenSpaceLayer(layer);
    return layer;
  }

  layoutScreenSpaceLayer(layer) {
    const cam = this.cameras?.main;
    if (!layer || !cam || !cam.worldView) return;
    const zoom = cam.zoom || 1;
    layer.setPosition(cam.worldView.left, cam.worldView.top);
    layer.setScale(1 / zoom);
  }

  updateScreenSpaceLayers() {
    if (!this.__screenSpaceLayers) return;
    for (const layer of Array.from(this.__screenSpaceLayers)) {
      if (!layer || !layer.active) {
        this.__screenSpaceLayers.delete(layer);
        continue;
      }
      this.layoutScreenSpaceLayer(layer);
    }
  }

  destroyScreenSpaceLayer(layer) {
    if (!layer) return;
    this.__screenSpaceLayers?.delete?.(layer);
    layer.destroy?.();
  }

  createCombatHintOverlay() {
    const w = this.scale.width;

    
    
    const panelW = Math.min(300, Math.max(250, w * 0.19));
    const panelH = 104;
    const x = Math.max(18, w - panelW - 26);
    const y = 126;

    const lines = [
      "SURVIVE THE TRIAL",
      "A/D move - SPACE jump",
      "Dash: double-tap direction",
      "Q blink - mouse = tree",
      "H help - ENTER/F retry"
    ];

    this.hintLayer = this.createScreenSpaceLayer(9500);

    this.hintPanel = this.add.rectangle(x, y, panelW, panelH, 0x02070b, 0.62)
      .setOrigin(0, 0)
      .setDepth(0)
      .setStrokeStyle(2, 0xb8f7ff, 0.58)
      .setAlpha(0);

    this.hintText = this.add.text(x + 14, y + 12, lines.join("\n"), {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff",
      stroke: "#001018",
      strokeThickness: 3,
      lineSpacing: 3,
      wordWrap: { width: panelW - 28 }
    })
      .setOrigin(0, 0)
      .setDepth(1)
      .setAlpha(0);

    this.hintLayer.add([this.hintPanel, this.hintText]);

    this.keyH = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.__hintVisible = false;
  }

  showCombatHintOverlay(duration = 10500) {
    if (!this.hintPanel || !this.hintText) return;

    this.__hintVisible = true;
    this.hintPanel.setVisible(true);
    this.hintText.setVisible(true);
    this.tweens.killTweensOf([this.hintPanel, this.hintText]);
    this.tweens.add({ targets: [this.hintPanel, this.hintText], alpha: 1, duration: 260, ease: "Sine.easeOut" });

    if (duration > 0) {
      this.time.delayedCall(duration, () => {
        if (this.__hintVisible) this.hideCombatHintOverlay(650);
      });
    }
  }

  hideCombatHintOverlay(duration = 260) {
    if (!this.hintPanel || !this.hintText) return;
    this.__hintVisible = false;
    this.tweens.killTweensOf([this.hintPanel, this.hintText]);
    this.tweens.add({
      targets: [this.hintPanel, this.hintText],
      alpha: 0,
      duration,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (!this.__hintVisible) {
          this.hintPanel?.setVisible(false);
          this.hintText?.setVisible(false);
        }
      }
    });
  }

  toggleCombatHintOverlay() {
    if (this.__hintVisible) {
      this.hideCombatHintOverlay(200);
    } else {
      this.showCombatHintOverlay(0);
    }
  }

  fadeBossIdentityAfterDelay(delay = 4200, duration = 900) {
    this.time.delayedCall(delay, () => {
      this.ui?.fadeBossIdentity?.(duration);
    });
  }

  startCombatImmediately() {
    this.blackScreen?.setAlpha?.(0);
    this.authText?.setAlpha?.(0);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(this.combatZoom);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(0, this.cameraFollowOffsetY);

    if (this.boss && this.bossLandingPoint) {
      this.boss.setPosition(this.bossLandingPoint.x, this.bossLandingPoint.y);
      this.boss.clearTint?.();
      this.boss.setVelocity(0, 0);
      this.boss.body.allowGravity = false;
      if (this.anims.exists("blue_idle_anim")) this.boss.play("blue_idle_anim", true);
    }

    this.ui?.showBossHud?.(250);
    this.controlsLocked = false;
    this.combatStartTime = this.time.now;
    this.__bossCombatStartedAt = this.time.now;
    this.__phaseTimelineStartedAt = this.time.now;
    this.combatStartRealTime = performance.now();
    this.bgm?.start?.();
    this.showCombatHintOverlay(3400);
    this.fadeBossIdentityAfterDelay(4200, 900);

    if (!this.hasStartedAttackCycle) {
      this.hasStartedAttackCycle = true;
      this.time.delayedCall(650, () => this.startBossAttackLoop());
    }
  }

  cleanupMapGameplayBodies() {
    return this.arena.cleanup();
  }

  createCoreValues() {
    this.destroyedTileRepairDelay = 0;
    this.tileRepairWarningTime = 0;

    this.combatZoom = 0.46;
    this.phaseZoom = 0.78;
    this.cameraFollowOffsetY = 250;

    this.fullArenaZoom = Phaser.Math.Clamp(
      Math.min(
        this.scale.width / this.map.widthInPixels,
        this.scale.height / this.map.heightInPixels
      ) * 0.92,
      0.26,
      0.5
    );

    this.controlsLocked = true;
    this.gameOver = false;
    this.__restartQueued = false;
    this.combatStartTime = 0;
    this.__bossCombatStartedAt = 0;
    this.__phaseTimelineStartedAt = 0;
    this.combatStartRealTime = 0;
    this.treeBlocksThisRun = 0;
    this.__playerDamageVignette = null;
    this.__almostHitCooldownUntil = 0;
    this.playerIframeStartedAt = -99999;
    this.__pauseMenuOpen = false;
    this.__wasControlsLockedBeforePause = false;
    this.__trackedBattleTimers = new Set();
    this.__timePluginPatched = false;
    this.__screenThreatIndicators = [];
    this.__lastBossCastingAt = 0;
    this.__phaseTransitionStartedAt = 0;
    this.__lastHostilePruneAt = 0;
    this.__lastTimerPressureLogAt = 0;
    this.hasStartedAttackCycle = false;
    this.attackLoopToken = 0;
    this.isBossCasting = false;
    this.bossInvincible = false;
    this.savedBossPosition = { x: 0, y: 0 };
    this.isPhaseTransitioning = false;

    const gameConfig = this.registry.get("gameConfig") || {};
    this.bossMaxIntegrity = gameConfig.boss?.maxIntegrity || BOSS_STATS.MAX_INTEGRITY;
    this.bossIntegrity = this.bossMaxIntegrity;
    this.bossPhase = 1;
    this.bossDecayRate = 0.4;
    this.attackSpeedMultiplier = 1.05;

    this.phase2Threshold = gameConfig.boss?.phase2Threshold || BOSS_STATS.PHASE2_THRESHOLD;
    this.phase3Threshold = gameConfig.boss?.phase3Threshold || BOSS_STATS.PHASE3_THRESHOLD;

    this.nextBossPatrolTime = 0;
    this.bossPatrolCooldown = 1700;
    this.bossScareDashChance = 0.20;
    this.bossChargeAttackChance = 0.28;
    this.bossLaserAttackChance = 0.18;
    this.bossBulletAttackChance = 0.24;

    this.bossBulletKeys = [
      "blue_bullet_1",
      "blue_bullet_2",
      "blue_bullet_3",
      "blue_bullet_4",
      "blue_bullet_5"
    ];

    this.activeTurrets = [];
    this.activeHostileObjects = [];

    this.gravityFieldActive = false;
    this.gravityFieldCenter = null;
    this.gravityFieldRadius = 380;
    this.gravityFieldEndTime = 0;
    this.gravityDebuffUntil = 0;
    this.gravityMovementLockUntil = 0;
    this.gravityVisual = null;
    this.gravityRing = null;
    this.gravityOverlay = null;
  }

  applyAccessibilityRuntimeSettings() {
    const accessibility = this.registry.get("gameConfig")?.accessibility || {};
    const multiplier = Number.isFinite(accessibility.screenShakeMultiplier)
      ? Phaser.Math.Clamp(accessibility.screenShakeMultiplier, 0, 2)
      : 1;

    this.screenShakeMultiplier = multiplier;

    const cam = this.cameras?.main;
    if (!cam || cam.__morningstarShakePatched) return;

    const originalShake = cam.shake.bind(cam);
    cam.shake = (duration, intensity, force, callback, context) => {
      const scaledIntensity = (Number.isFinite(intensity) ? intensity : 0) * this.screenShakeMultiplier;
      if (scaledIntensity <= 0 || duration <= 0) return cam;
      return originalShake(duration, scaledIntensity, force, callback, context);
    };

    cam.__morningstarShakePatched = true;
  }

  createSystems() {
    this.effects = new EffectManager(this);
    this.hitStop = new HitStopManager(this);
    this.audioCues = new AudioCueManager(this).start();
    this.sfx = this.audioCues;
    this.bgm = new BossBgmManager(this);
    this.atmosphere = new PhaseAtmosphereManager(this).create();
    this.thunderstorm = new Phase4ThunderstormSystem(this).create();
    this.debugDraw = new DebugDraw(this);
    this.healthPacks = new HealthPackManager(this, {
      minRespawnMs: 6800,
      maxRespawnMs: 7600,
      maxActive: 3
    });

    this.ui = new BossUiManager(this).create();
    this.authText = this.ui.authText;
    this.blackScreen = this.ui.blackScreen;
    this.bossBarBack = this.ui.bossBarBack;
    this.bossBarFill = this.ui.bossBarFill;
    this.bossNameText = this.ui.bossNameText;
    this.bossSubtitleText = this.ui.bossSubtitleText;
    this.phaseText = this.ui.phaseText;
    this.phaseSubText = this.ui.phaseSubText;
    this.gameOverText = this.ui.gameOverText;

    this.dialogue = new DialogueManager(this, () => this.boss || this.player);

    const gameConfig = this.registry.get("gameConfig") || {};
    this.phaseManager = new BossPhaseAttacker(this, {
      maxIntegrity: gameConfig.boss?.maxIntegrity || BOSS_STATS.MAX_INTEGRITY,
      integrity: gameConfig.boss?.maxIntegrity || BOSS_STATS.MAX_INTEGRITY,
      phase: 1,
      decayRate: gameConfig.boss?.phase1DecayRate ?? 0.75,
      phase2DecayRate: gameConfig.boss?.phase2DecayRate ?? 0.875,
      phase3DecayRate: gameConfig.boss?.phase3DecayRate ?? 0.333,
      phase4DecayRate: gameConfig.boss?.phase4DecayRate ?? 0,
      phaseTimelineSeconds: gameConfig.boss?.phaseTimelineSeconds,
      phase4CountdownSeconds: gameConfig.boss?.phase4CountdownSeconds ?? 15,
      phaseTimingGraceSeconds: gameConfig.boss?.phaseTimingGraceSeconds ?? 6,
      phase2Threshold: gameConfig.boss?.phase2Threshold || BOSS_STATS.PHASE2_THRESHOLD,
      phase3Threshold: gameConfig.boss?.phase3Threshold || BOSS_STATS.PHASE3_THRESHOLD,
      phase4Threshold: gameConfig.boss?.phase4Threshold ?? 0.12,
      attackSpeedMultiplier: 1.08,
      phase2AttackSpeedMultiplier: 0.88,
      phase3AttackSpeedMultiplier: 0.74,
      phase4AttackSpeedMultiplier: 0.82
    });

    this.phaseManager.syncToScene();
    this.attackLoop = new BossAttackLoop(this);
  }

  createActors() {
    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();

    this.createBoss();
    this.bossMovement = new BossMovementController(this);
    this.applyDevPhaseOverride();
  }

  applyDevPhaseOverride() {
    if (!Number.isFinite(this.devStartPhase) || this.devStartPhase <= 1) return;

    this.bossPhase = Phaser.Math.Clamp(this.devStartPhase, 1, 4);
    if (this.phaseManager) {
      this.phaseManager.phase = this.bossPhase;
    }
    this.bgm?.setPhase?.(this.bossPhase);
    this.atmosphere?.setPhase?.(this.bossPhase);

    if (this.bossPhase === 2) {
      this.bossIntegrity = this.bossMaxIntegrity * 0.69;
      this.bossDecayRate = this.phaseManager?.phase2DecayRate ?? this.bossDecayRate;
      this.attackSpeedMultiplier = this.phaseManager?.phase2AttackSpeedMultiplier ?? 1.45;
    } else if (this.bossPhase === 3) {
      this.bossIntegrity = this.bossMaxIntegrity * 0.34;
      this.bossDecayRate = this.phaseManager?.phase3DecayRate ?? this.bossDecayRate;
      this.attackSpeedMultiplier = this.phaseManager?.phase3AttackSpeedMultiplier ?? 1.25;
    } else if (this.bossPhase === 4) {
      this.bossIntegrity = this.bossMaxIntegrity * 0.10;
      this.bossDecayRate = this.phaseManager?.phase4DecayRate ?? 0;
      this.attackSpeedMultiplier = this.phaseManager?.phase4AttackSpeedMultiplier ?? 1.0;
    }

    if (this.phaseManager) {
      this.phaseManager.decayRate = this.bossDecayRate;
      this.phaseManager.attackSpeedMultiplier = this.attackSpeedMultiplier;
    }
  }

  createPlayerTreeSystem() {
    if (!this.playerTrees) {
      this.playerTrees = this.physics.add.staticGroup();
    }
  }

  registerRestartInput() {
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyEnterRetry = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keyFRetry = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.__lastRestartRequestAt = -99999;

    this.isRetryKeyEvent = (event) => {
      const keyCode = event?.keyCode ?? event?.which;
      const key = String(event?.key || "").toLowerCase();
      return (
        keyCode === Phaser.Input.Keyboard.KeyCodes.R ||
        keyCode === Phaser.Input.Keyboard.KeyCodes.ENTER ||
        keyCode === Phaser.Input.Keyboard.KeyCodes.F ||
        key === "r" ||
        key === "enter" ||
        key === "f"
      );
    };

    this.handleRestartKey = (event) => {
      if (!this.isRetryKeyEvent(event)) return;
      this.requestRestart("keyboard-retry");
    };

    this.input.keyboard.on("keydown", this.handleRestartKey);
    this.handlePhaserRestartKey = () => this.requestRestart("phaser-retry");
    this.input.keyboard.on("keydown-R", this.handlePhaserRestartKey);
    this.input.keyboard.on("keydown-ENTER", this.handlePhaserRestartKey);
    this.input.keyboard.on("keydown-F", this.handlePhaserRestartKey);

    
    
    
    this.handleDomRestartKey = (event) => {
      if (!this.isRetryKeyEvent(event)) return;
      this.requestRestart("dom-retry");
    };
    window.addEventListener("keydown", this.handleDomRestartKey, true);
  }

  requestRestart(reason = "manual") {
    if (!this.gameOver && !this.__allowRestartInput) return;

    const now = this.time?.now ?? performance.now();
    if (now - (this.__lastRestartRequestAt ?? -99999) < 250) return;
    this.__lastRestartRequestAt = now;

    this.hardRestartGame(reason);
  }

  hardRestartGame(reason = "manual") {
    if (this.__restartQueued) return;

    this.__restartQueued = true;
    this.gameOver = true;
    this.controlsLocked = true;
    this.forceResumeSceneClock?.();
    this.cleanupAllBattleObjects?.();

    if (typeof window !== "undefined" && window.location?.reload) {
      window.location.reload();
      return;
    }

    this.scene.start("MenuScene");
  }

  restartCurrentFight(reason = "manual") {
    this.hardRestartGame(reason);
  }

  safeReturnToMainMenu(source = "main-menu") {
    if (this.__returningToMenu) return;
    this.__returningToMenu = true;

    const safeCall = (fn) => {
      try {
        fn?.();
      } catch (error) {
        console.warn(`[BossScene] Recovered while returning to main menu from ${source}`, error);
      }
    };

    safeCall(() => this.forceResumeSceneClock?.());
    safeCall(() => {
      if (this.time) this.time.timeScale = 1;
      if (this.physics?.world) {
        this.physics.world.resume?.();
        this.physics.world.timeScale = 1;
      }
    });
    safeCall(() => this.hidePauseMenu?.());
    safeCall(() => {
      this.__pauseMenuOpen = false;
      this.pauseMenuContainer?.setVisible?.(false);
      this.controlsLocked = true;
      this.gameOver = true;
      this.__allowRestartInput = false;
    });
    safeCall(() => this.cancelPendingBattleTimers?.());
    safeCall(() => this.trainingLoopEvent?.remove?.(false));
    safeCall(() => {
      this.trainingLoopEvent = null;
      this.trainingSelector?.setVisible?.(false);
    });
    safeCall(() => this.attackLoop?.cancel?.());
    safeCall(() => { this.attackLoopToken = (this.attackLoopToken || 0) + 1; });
    safeCall(() => this.thunderstorm?.stop?.());
    safeCall(() => this.phase4Thunderstorm?.stop?.());
    safeCall(() => this.stopPhase4PressureSystems?.());
    safeCall(() => this.cleanupPhase4PressureSystems?.());
    safeCall(() => this.cleanupPhase4SweepObjects?.());
    safeCall(() => this.cleanupRayHostileObjects?.());
    safeCall(() => this.cleanupHostileObjects?.());
    safeCall(() => this.safeDeactivateGravityField?.());
    safeCall(() => this.massEnergyTurretsSkill?.cleanupTurrets?.(true));
    safeCall(() => this.purgeProtocolSkill?.cleanup?.());
    safeCall(() => this.rayOfOblivionSkill?.cleanup?.({ preserveForcedPhase4Radial: false }));
    safeCall(() => this.menacingAdvanceSkill?.cleanupChargeObjects?.());
    safeCall(() => this.bossMovement?.cleanup?.());
    safeCall(() => this.healthPacks?.cleanup?.());
    safeCall(() => this.dialogue?.clear?.());
    safeCall(() => this.audioCues?.stop?.());
    safeCall(() => this.bgm?.destroy?.());
    safeCall(() => {
      this.cameras?.main?.resetFX?.();
      this.cameras?.main?.setZoom?.(1);
      this.cameras?.main?.stopFollow?.();
    });
    safeCall(() => this.input?.keyboard?.resetKeys?.());

    safeCall(() => {
      this.tweens?.killAll?.();
      this.sound?.stopAll?.();
    });

    this.time?.delayedCall?.(0, () => {
      safeCall(() => this.scene.stop(this.scene.key));
      safeCall(() => this.scene.start("MenuScene", { fromGameplay: true }));
    });
  }

  returnToMainMenu() {
    this.safeReturnToMainMenu("boss-scene");
  }

  registerSceneCleanup() {
    const destroySceneOnlyObjects = () => {
      this.bossThreatIndicator?.destroy?.();
      this.hostileThreatIndicator?.destroy?.();
      this.bossThreatIndicator = null;
      this.hostileThreatIndicator = null;
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input?.keyboard && this.handleRestartKey) {
        this.input.keyboard.off("keydown", this.handleRestartKey);
      }
      if (this.input?.keyboard && this.handlePhaserRestartKey) {
        this.input.keyboard.off("keydown-R", this.handlePhaserRestartKey);
        this.input.keyboard.off("keydown-ENTER", this.handlePhaserRestartKey);
        this.input.keyboard.off("keydown-F", this.handlePhaserRestartKey);
      }
      if (this.handleDomRestartKey) {
        window.removeEventListener("keydown", this.handleDomRestartKey, true);
      }
      this.cleanupAllBattleObjects();
      this.cleanupMapGameplayBodies?.();
      this.restoreTrackedBattleTimers?.();
      this.hitStop?.destroy?.();
      this.audioCues?.stop?.();
      this.bgm?.destroy?.();
      this.atmosphere?.destroy?.();
      this.thunderstorm?.destroy?.();
      destroySceneOnlyObjects();
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.cleanupAllBattleObjects();
      this.cleanupMapGameplayBodies?.();
      this.restoreTrackedBattleTimers?.();
      this.hitStop?.destroy?.();
      this.audioCues?.stop?.();
      this.bgm?.destroy?.();
      this.atmosphere?.destroy?.();
      this.thunderstorm?.destroy?.();
      destroySceneOnlyObjects();
    });
  }

  registerProjectileVsTrees(projectile, damage = 1, destroyProjectile = true) {
    if (!projectile || !this.playerTrees) return;

    this.physics.add.overlap(projectile, this.playerTrees, (proj, tree) => {
      if (!tree || !tree.active || !tree.blessingTree || proj?.__treeBlocked) return;

      proj.__treeBlocked = true;
      this.treeBlocksThisRun = (this.treeBlocksThisRun || 0) + 1;
      this.damageTreeFromHostile(tree, damage);

      if (destroyProjectile && proj && proj.active) {
        proj.destroy();
      }
    });

    this.registerProjectileTreeSweep(projectile, damage, destroyProjectile);
  }

  registerProjectileTreeSweep(projectile, damage = 1, destroyProjectile = true) {
    if (!projectile || !this.playerTrees || !this.events) return;

    let lastX = projectile.x;
    let lastY = projectile.y;

    const cleanup = () => {
      this.events?.off?.(Phaser.Scenes.Events.UPDATE, check);
    };

    const check = () => {
      if (!projectile || !projectile.active || projectile.__treeBlocked || !this.playerTrees) {
        cleanup();
        return;
      }

      const blocked = this.tryBlockProjectileWithTree(
        projectile,
        damage,
        destroyProjectile,
        lastX,
        lastY,
        projectile.x,
        projectile.y,
        {
          inflateX: projectile.__treeBlockInflateX ?? 18,
          inflateY: projectile.__treeBlockInflateY ?? 18,
          requireBetween: false
        }
      );

      if (blocked) {
        cleanup();
        return;
      }

      lastX = projectile.x;
      lastY = projectile.y;
    };

    this.events.on(Phaser.Scenes.Events.UPDATE, check);
    projectile.once?.(Phaser.GameObjects.Events.DESTROY, cleanup);
  }

  tryBlockProjectileWithTree(
    projectile,
    damage = 1,
    destroyProjectile = true,
    startX = projectile?.x,
    startY = projectile?.y,
    endX = projectile?.x,
    endY = projectile?.y,
    options = {}
  ) {
    if (!projectile || !projectile.active || projectile.__treeBlocked || !this.playerTrees) {
      return false;
    }

    const trees = this.playerTrees.getChildren?.() || [];
    const sx = Number.isFinite(startX) ? startX : projectile.x;
    const sy = Number.isFinite(startY) ? startY : projectile.y;
    const ex = Number.isFinite(endX) ? endX : projectile.x;
    const ey = Number.isFinite(endY) ? endY : projectile.y;
    const travelLine = new Phaser.Geom.Line(sx, sy, ex, ey);
    const projectileBounds = projectile.getBounds?.();

    const inflateX = options.inflateX ?? projectile.__treeBlockInflateX ?? 120;
    const inflateY = options.inflateY ?? projectile.__treeBlockInflateY ?? 140;
    const requireBetween = options.requireBetween === true;

    for (const tree of trees) {
      if (!tree || !tree.active || !tree.blessingTree) continue;

      const bounds = this.getTreeBlockBounds(tree, inflateX, inflateY);
      if (!bounds) continue;

      const overlaps = projectileBounds
        ? Phaser.Geom.Intersects.RectangleToRectangle(projectileBounds, bounds)
        : bounds.contains(ex, ey);
      const crossed = Phaser.Geom.Intersects.LineToRectangle(travelLine, bounds);
      const closeToBeam = this.isTreeCloseToProjectilePath(tree, sx, sy, ex, ey, bounds, requireBetween);

      if (!overlaps && !crossed && !closeToBeam) continue;

      projectile.__treeBlocked = true;
      this.treeBlocksThisRun = (this.treeBlocksThisRun || 0) + 1;
      this.damageTreeFromHostile(tree, damage);

      if (destroyProjectile && projectile.active) {
        projectile.destroy();
      }

      return true;
    }

    return false;
  }

  getTreeBlockBounds(tree, inflateX = 18, inflateY = 18) {
    if (!tree || !tree.active) return null;

    let bounds = null;

    if (tree.body) {
      bounds = new Phaser.Geom.Rectangle(
        tree.body.x,
        tree.body.y,
        tree.body.width,
        tree.body.height
      );
    } else if (tree.getBounds) {
      bounds = tree.getBounds();
    }

    if (!bounds) return null;

    Phaser.Geom.Rectangle.Inflate(bounds, Math.max(inflateX, 96), Math.max(inflateY, 120));
    return bounds;
  }

  isTreeCloseToProjectilePath(tree, startX, startY, endX, endY, bounds, requireBetween = false) {
    if (!tree || !bounds) return false;

    const ax = startX;
    const ay = startY;
    const bx = endX;
    const by = endY;
    const px = bounds.centerX;
    const py = bounds.centerY;
    const abx = bx - ax;
    const aby = by - ay;
    const lenSq = abx * abx + aby * aby;

    if (lenSq <= 1) {
      return Phaser.Math.Distance.Between(px, py, bx, by) <= Math.max(bounds.width, bounds.height) * 0.55;
    }

    const rawT = ((px - ax) * abx + (py - ay) * aby) / lenSq;

    if (requireBetween && (rawT < -0.08 || rawT > 1.08)) {
      return false;
    }

    const t = Phaser.Math.Clamp(rawT, 0, 1);
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    const distance = Phaser.Math.Distance.Between(px, py, closestX, closestY);
    const allowed = Math.max(bounds.width, bounds.height) * 0.72;

    return distance <= allowed;
  }

  registerProjectileGroupVsTrees(
    projectileGroup,
    damage = 1,
    destroyProjectile = true
  ) {
    if (!projectileGroup || !this.playerTrees) return;

    this.physics.add.overlap(projectileGroup, this.playerTrees, (proj, tree) => {
      if (!tree || !tree.active || !tree.blessingTree) return;

      this.treeBlocksThisRun = (this.treeBlocksThisRun || 0) + 1;
      this.damageTreeFromHostile(tree, damage);

      if (destroyProjectile && proj && proj.active) {
        proj.destroy();
      }
    });
  }

  damageTreeFromHostile(tree, damage = 1) {
    if (!tree || !tree.active || !tree.blessingTree) return;

    if (this.damagePlayerTree) {
      this.damagePlayerTree(tree, damage);
      return;
    }

    tree.destroy();
  }

  findTreeBlockingLine(startX, startY, endX, endY) {
    if (!this.playerTrees) return null;

    const line = new Phaser.Geom.Line(startX, startY, endX, endY);
    const trees = this.playerTrees.getChildren();

    let closestTree = null;
    let closestDistance = Infinity;

    for (const tree of trees) {
      if (!tree || !tree.active || !tree.blessingTree) continue;

      const bounds = this.getTreeBlockBounds?.(tree, 150, 170) || tree.getBounds();
      const hit = Phaser.Geom.Intersects.LineToRectangle(line, bounds);

      if (!hit) continue;

      const distance = Phaser.Math.Distance.Between(
        startX,
        startY,
        tree.x,
        tree.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTree = tree;
      }
    }

    return closestTree;
  }

  cleanupPlayerTrees() {
    if (!this.playerTrees) return;

    const trees = this.playerTrees.getChildren();

    for (const tree of trees) {
      if (tree && tree.active) {
        tree.destroy();
      }
    }
  }

  createBoss() {
    const spawn = this.bossEntrySpawn || this.bossSpawn || ARENA.BOSS_SPAWN;

    
    this.boss = this.physics.add.sprite(spawn.x, spawn.y, "blue_idle");

    this.boss.setScale(2.25);
    this.boss.setFrame(0);
    this.boss.setFlipX(true);
    this.boss.setTint(0x050510);
    this.boss.setDepth(30);
    this.boss.body.allowGravity = false;
    this.boss.setImmovable(true);
    this.boss.setCollideWorldBounds(true);
    this.spriteMetadataRegistry?.attach?.(this.boss, "boss");


  }

  createSkills() {
    this.skills = {
      destructionBlast: new DestructionBlastSkill(this),
      annihilationSlash: new AnnihilationSlashSkill(this),
      massEnergyTurrets: new MassEnergyTurretsSkill(this),
      gravityField: new GravityFieldSkill(this),
      holyClearance: new HolyClearance(this),
      menacingAdvance: new MenacingAdvance(this),
      rayOfOblivion: new RayOfOblivion(this),
      purgeProtocol: new PurgeProtocolSkill(this)
    };

    this.destructionBlastSkill = this.skills.destructionBlast;
    this.annihilationSlashSkill = this.skills.annihilationSlash;
    this.massEnergyTurretsSkill = this.skills.massEnergyTurrets;
    this.gravityFieldSkill = this.skills.gravityField;
    this.holyClearanceSkill = this.skills.holyClearance;
    this.menacingAdvanceSkill = this.skills.menacingAdvance;
    this.rayOfOblivionSkill = this.skills.rayOfOblivion;
    this.purgeProtocolSkill = this.skills.purgeProtocol;
  }

  castSkill(key, ...args) {
    if (this.gameOver || this.isPhaseTransitioning) return undefined;

    const skill = this.skills?.[key];
    if (!skill || typeof skill.cast !== "function") return undefined;

    return skill.cast(...args);
  }

  createSequences() {
    this.introSequence = new BossIntroSequence(this);
    this.deathSequence = new BossDeathSequence(this);
  }

  update(time, delta) {
    this.updateScreenSpaceLayers();
    this.updateUi();

    if (this.keyEsc && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.togglePauseMenu();
      return;
    }

    if (this.__pauseMenuOpen) {
      return;
    }

    if (this.gameOver && this.keyR && this.keyR.isDown) {
      this.requestRestart("poll");
      return;
    }

    if (this.gameOver) {
      return;
    }

    if (this.keyF1 && Phaser.Input.Keyboard.JustDown(this.keyF1)) {
      this.debugDrawEnabled = this.debugDraw?.toggle?.() || false;
      this.debugMapBodies = this.debugDrawEnabled;
    }

    if (this.keyH && Phaser.Input.Keyboard.JustDown(this.keyH)) {
      this.toggleCombatHintOverlay();
    }

    this.arena?.update?.(time, delta);
    this.debugDraw?.update?.();
    this.boss?.getData?.("spriteMetadata")?.applyCurrentFrame?.();
    this.massEnergyTurretsSkill?.updateTurretPointers?.();
    this.updateOffscreenThreatIndicators?.();
    this.gravityFieldSkill?.update?.();
    this.atmosphere?.update?.(time, delta);
    this.thunderstorm?.update?.(time, delta);
    this.runSceneWatchdogs?.(time);

    if (!this.isPhaseTransitioning) {
      this.updateBossIntegrity(delta);
      this.updateBossPatrol(time);
    }

    if (this.playerController) {
      this.playerController.update(time, delta);
    }
  }

  updateUi() {
    if (!this.ui) return;
    this.ui.update(this.bossIntegrity, this.bossMaxIntegrity, this.bossPhase);
  }

  updateBossIntegrity(delta) {
    this.phaseManager.update(delta);
  }

  updateBossPhase() {
    this.phaseManager.checkPhaseChange();
  }

  phaseBurst(text, color) {
    this.stopAllBossActions({
      stopCameraFollow: true,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });

    this.phaseManager.playTransition(text, color);
  }

  playBossPhaseTransition(text, color) {
    this.stopAllBossActions({
      stopCameraFollow: true,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });

    this.phaseManager.playTransition(text, color);
  }

  startBossAttackLoop() {
    if (this.gameOver || this.bossIntegrity <= 0 || this.isPhaseTransitioning) return;
    this.attackLoop.start();
  }

  isLoopTokenValid(token) {
    return this.attackLoop.isValid(token);
  }

  damageBossIntegrity(amount) {
    if (this.gameOver || this.bossIntegrity <= 0) return;
    this.hitStop?.trigger?.(50, 0.04);
    this.audioCues?.play?.("bossDamage", { volume: 0.22, cooldownMs: 180 });
    this.phaseManager.damage(amount);
  }


  showPlayerStatusVoice(text, options = {}) {
    if (!text || !this.player || !this.player.active || this.gameOver) return;

    if (this.__playerStatusVoice && this.__playerStatusVoice.active) {
      this.tweens?.killTweensOf?.(this.__playerStatusVoice);
      this.__playerStatusVoice.destroy();
    }

    const color = options.color || "#f2fbff";
    const voice = this.add.text(this.player.x, this.player.y - 172, text, {
      fontFamily: "monospace",
      fontSize: "42px",
      color,
      fontStyle: "bold",
      align: "center",
      stroke: "#001018",
      strokeThickness: 12,
      wordWrap: { width: 780 }
    }).setOrigin(0.5).setDepth(7350);

    const bg = this.add.rectangle(this.player.x, this.player.y - 172, Math.min(880, Math.max(520, text.length * 27)), 74, 0x001018, 0.72)
      .setOrigin(0.5)
      .setDepth(7349)
      .setStrokeStyle(3, 0xcdf8ff, 0.62);

    this.__playerStatusVoice = voice;
    this.__playerStatusVoiceBg = bg;
    this.audioCues?.play?.("bossVoiceGlitch", { volume: 0.10, cooldownMs: 1400 });

    const followEvent = this.time.addEvent({
      delay: 33,
      repeat: 66,
      callback: () => {
        if (!voice.active || !this.player || !this.player.active) return;
        const x = this.player.x;
        const y = this.player.y - 172;
        voice.setPosition(x, y);
        if (bg.active) bg.setPosition(x, y);
      }
    });

    this.tweens.add({
      targets: [voice, bg],
      y: "-=26",
      alpha: 0,
      duration: 2300,
      ease: "Sine.easeOut",
      onComplete: () => {
        followEvent.remove(false);
        if (voice.active) voice.destroy();
        if (bg.active) bg.destroy();
        if (this.__playerStatusVoice === voice) this.__playerStatusVoice = null;
        if (this.__playerStatusVoiceBg === bg) this.__playerStatusVoiceBg = null;
      }
    });
  }

  getSurvivedSeconds() {
    if (this.combatStartRealTime && this.combatStartRealTime > 0) {
      return Math.max(0, Math.floor((performance.now() - this.combatStartRealTime) / 1000));
    }
    return Math.max(0, Math.floor(((this.time?.now || 0) - (this.combatStartTime || this.time?.now || 0)) / 1000));
  }

  bossSpeakRandom(skillKey, duration = 2600, options = {}) {
    
    
    if (options?.forceDialogue && this.dialogue?.random) {
      return this.dialogue.random(skillKey, duration, options);
    }
    return null;
  }

  bossSpeak(text, duration = 2600, options = {}) {
    if ((this.gameOver && !options.allowDuringGameOver) || !this.dialogue || !text) return null;

    const dialogueOptions = {
      fontSize: options.anchorToSpeaker ? "22px" : "30px",
      boxWidth: options.anchorToSpeaker ? 600 : undefined,
      boxHeight: options.anchorToSpeaker ? 82 : undefined,
      offsetY: options.anchorToSpeaker ? -128 : undefined,
      machineVoice: true,
      ...options
    };

    if (typeof this.dialogue.sayOnce === "function") {
      return this.dialogue.sayOnce(text, duration, dialogueOptions);
    }

    if (typeof this.dialogue.say === "function") {
      return this.dialogue.say(text, duration, dialogueOptions);
    }

    if (typeof this.dialogue.show === "function") {
      return this.dialogue.show(text, duration, dialogueOptions);
    }

    return null;
  }

  playBossEnergyEffect(color = 0x7df9ff, scale = 2.0, depth = 70) {
    if (this.gameOver || this.isPhaseTransitioning) return;
    this.effects.bossEnergy(this.boss, color, scale, depth);
  }

  playBossHurtFeedback() {
    if (!this.boss || !this.boss.active || this.gameOver) return;

    if (this.anims.exists("boss_hurt_anim") && !this.bossInvincible) {
      this.boss.play("boss_hurt_anim", true);
      this.boss.once("animationcomplete", () => {
        if (!this.gameOver && this.boss.active && !this.isPhaseTransitioning) {
          this.boss.play("blue_idle_anim", true);
        }
      });
    }

    this.tweens.add({
      targets: this.boss,
      tint: 0xffffff,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        if (this.boss && this.boss.active) {
          this.boss.clearTint();
        }
      }
    });
  }

  damagePlayer(amount = 1) {
    if (this.gameOver) return false;
    return this.playerController.damagePlayer(amount);
  }


  showAlmostHitFeedback() {
    const now = this.time?.now || 0;
    if (now < (this.__almostHitCooldownUntil || 0)) return;
    this.__almostHitCooldownUntil = now + 260;

    this.cameras.main.shake(45, 0.0035 * (this.screenShakeMultiplier || 1));

    const player = this.player;
    if (!player || !player.active) return;

    const text = this.add.text(player.x, player.y - 96, "CLOSE!", {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 6
    })
      .setOrigin(0.5)
      .setDepth(7600);

    this.tweens.add({
      targets: text,
      y: text.y - 34,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => text.destroy()
    });
  }

  playPlayerDamageFeedback() {
    if (!this.__playerDamageVignette || !this.__playerDamageVignette.active) {
      this.__playerDamageVignetteLayer = this.createScreenSpaceLayer(9400);
      this.__playerDamageVignette = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xff1d1d, 0)
        .setOrigin(0, 0);
      this.__playerDamageVignetteLayer.add(this.__playerDamageVignette);
    }

    const vignette = this.__playerDamageVignette;
    vignette.setSize(this.scale.width, this.scale.height);
    this.tweens.killTweensOf(vignette);
    vignette.setAlpha(0.38);
    this.tweens.add({ targets: vignette, alpha: 0, duration: 60, ease: "Sine.easeOut" });
    this.cameras.main.shake(60, 0.009 * (this.screenShakeMultiplier || 1));

    this.ui?.hpCells?.forEach?.((cell) => {
      this.tweens.add({ targets: cell, scaleX: (cell.scaleX || 1) * 1.18, scaleY: (cell.scaleY || 1) * 1.18, duration: 60, yoyo: true });
    });
  }

  updateBossPatrol(time) {
    if (this.gameOver || this.isPhaseTransitioning || this.isBossCasting) return;
    this.bossMovement.update(time);
  }

  setBossCasting(value) {
    this.isBossCasting = !!value;
    if (this.isBossCasting) {
      this.__lastBossCastingAt = this.time?.now || 0;
    }
  }

  runSceneWatchdogs(time = this.time?.now || 0) {
    if (this.gameOver) return;

    this.pruneDestroyedHostiles?.(time);
    this.checkTimerPressure?.(time);

    if (this.isPhaseTransitioning) {
      if (!this.__phaseTransitionStartedAt) this.__phaseTransitionStartedAt = time;
      if (time - this.__phaseTransitionStartedAt > 9000) {
        console.warn("[BossScene] Phase transition watchdog recovered a stuck transition.");
        this.recoverFromStuckPhaseTransition();
      }
    } else {
      this.__phaseTransitionStartedAt = 0;
    }

    if (this.isBossCasting) {
      if (!this.__lastBossCastingAt) this.__lastBossCastingAt = time;
      if (time - this.__lastBossCastingAt > 16000) {
        console.warn("[BossScene] Boss casting watchdog cleared a stuck skill state.");
        this.recoverFromStuckBossCast();
      }
    } else {
      this.__lastBossCastingAt = 0;
    }
  }

  recoverFromStuckPhaseTransition() {
    this.forceResumeSceneClock();
    this.stopAllBossActions({
      stopCameraFollow: false,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });
    this.controlsLocked = false;
    this.isPhaseTransitioning = false;
    this.phaseManager.transitioning = false;
    this.setBossCasting(false);
    this.cameras.main.resetFX?.();
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(this.combatZoom || this.phaseZoom || 0.78);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(0, this.cameraFollowOffsetY);
    this.atmosphere?.setPhase?.(this.bossPhase || 1, { force: true });
    this.time.delayedCall(500, () => this.startBossAttackLoop());
  }

  recoverFromStuckBossCast() {
    this.stopAllBossActions({
      stopCameraFollow: false,
      freezeBoss: false,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });
    this.setBossCasting(false);
    if (!this.gameOver && !this.isPhaseTransitioning) {
      this.time.delayedCall(650, () => this.startBossAttackLoop());
    }
  }

  pruneDestroyedHostiles(time = this.time?.now || 0) {
    if (!this.activeHostileObjects || time < (this.__lastHostilePruneAt || 0)) return;
    this.__lastHostilePruneAt = time + 1000;
    this.activeHostileObjects = this.activeHostileObjects.filter((obj) => obj && obj.active);
  }

  checkTimerPressure(time = this.time?.now || 0) {
    const timers = this.__trackedBattleTimers;
    if (!timers || time < (this.__lastTimerPressureLogAt || 0)) return;
    this.__lastTimerPressureLogAt = time + 3000;

    
    
    
    
    for (const event of Array.from(timers)) {
      if (!event || event.pendingRemove || (event.hasDispatched && !event.loop && !event.repeat)) {
        timers.delete(event);
      }
    }

    if (timers.size >= 180 && time >= (this.__nextTimerPressureWarnAt || 0)) {
      this.__nextTimerPressureWarnAt = time + 10000;
      console.warn(`[BossScene] High tracked timer count: ${timers.size}. Active loops are being preserved.`);
    }
  }

  bossPerformTransition(nextAction) {
    if (this.gameOver || this.isPhaseTransitioning) return;
    this.bossMovement.performTransition(nextAction);
  }

  performBossPatrolStep() {
    if (this.gameOver || this.isPhaseTransitioning) return;
    this.bossMovement.patrolStep();
  }

  performBossScareDash() {
    if (this.gameOver || this.isPhaseTransitioning) return;
    this.bossMovement.scareDash();
  }

  performBossChargeAttack() {
    return this.castSkill("menacingAdvance");
  }

  castPhaseTwoPressureCombo() {
    if (this.gameOver || this.isPhaseTransitioning) return;

    this.bossSpeakRandom("pressureCombo", 2600);
    this.castSkill("destructionBlast");

    this.time.delayedCall(900, () => {
      if (!this.gameOver && !this.isPhaseTransitioning) {
        this.castSkill("annihilationSlash");
      }
    });
  }

  castPhaseThreePressureCombo() {
    if (this.gameOver || this.isPhaseTransitioning) return;

    this.bossSpeakRandom("pressureCombo", 2600);
    this.castSkill("destructionBlast");

    this.time.delayedCall(700, () => {
      if (!this.gameOver && !this.isPhaseTransitioning) {
        this.castSkill("annihilationSlash");
      }
    });

    this.time.delayedCall(1500, () => {
      if (!this.gameOver && !this.isPhaseTransitioning) {
        this.castSkill("rayOfOblivion");
      }
    });
  }

  trackHostileObject(obj) {
    if (!obj) return obj;
    this.activeHostileObjects = this.activeHostileObjects || [];
    this.activeHostileObjects.push(obj);
    return obj;
  }


  cleanupRayHostileObjects() {
    try {
      const children = this.children?.list || [];
      for (const obj of [...children]) {
        const name = obj?.name || "";
        const isRayVisual =
          name.startsWith("ray_") ||
          name.startsWith("phase4_horizontal_sweep") ||
          name.startsWith("phase4_vertical_sweep") ||
          name.startsWith("phase4_radial_sweep") ||
          name.startsWith("phase4_radial_preview") ||
          name === "legacy_ray_visual" ||
          name.startsWith("legacy_ray");

        if (!isRayVisual) continue;
        this.tweens?.killTweensOf?.(obj);
        if (obj.active) obj.destroy();
      }
    } catch (_error) {
      
    }
  }

  cleanupHostileObjects() {
    if (this.activeHostileObjects && this.activeHostileObjects.length > 0) {
      for (const obj of this.activeHostileObjects) {
        if (obj && obj.active) {
          this.tweens?.killTweensOf?.(obj);
          obj.destroy();
        }
      }
    }

    this.activeHostileObjects = [];
  }

  cleanupGravityFieldVisuals() {
    this.gravityFieldActive = false;
    this.gravityFieldCenter = null;
    this.gravityFieldEndTime = 0;
    this.gravityDebuffUntil = 0;
    this.gravityMovementLockUntil = 0;
    if (this.physics?.world?.gravity) {
      this.physics.world.gravity.y = this.defaultGravityY;
    }

    const visuals = [
      this.gravityVisual,
      this.gravityRing,
      this.gravityOverlay
    ];

    for (const visual of visuals) {
      if (!visual) continue;
      this.tweens?.killTweensOf?.(visual);
      if (visual.active) {
        visual.destroy();
      }
    }

    const children = this.children?.list || [];
    for (const obj of [...children]) {
      const name = obj?.name || "";
      if (!name.startsWith("gravity_")) continue;
      this.tweens?.killTweensOf?.(obj);
      if (obj.active) obj.destroy();
    }

    this.gravityVisual = null;
    this.gravityRing = null;
    this.gravityOverlay = null;
  }

  safeDeactivateGravityField() {
    if (this.__gravityCleanupRunning) return;
    this.__gravityCleanupRunning = true;

    try {
      if (this.gravityFieldSkill && typeof this.gravityFieldSkill.deactivate === "function") {
        this.gravityFieldSkill.deactivate();
      } else {
        this.cleanupGravityFieldVisuals();
      }
    } catch (error) {
      console.warn("[BossScene] Gravity cleanup recovered after scene shutdown", error);
      this.cleanupGravityFieldVisuals();
    } finally {
      this.__gravityCleanupRunning = false;
    }
  }

  cleanupAllBattleObjects() {
    if (this.attackLoop) {
      this.attackLoop.cancel();
    } else {
      this.attackLoopToken++;
    }

    this.setBossCasting?.(false);

    this.thunderstorm?.stop?.();
    this.cancelPendingBattleTimers?.();
    this.bossMovement?.cleanup?.();

    if (this.menacingAdvanceSkill && this.menacingAdvanceSkill.cleanupChargeObjects) {
      this.menacingAdvanceSkill.cleanupChargeObjects();
    }

    if (this.purgeProtocolSkill && this.purgeProtocolSkill.cleanup) {
      this.purgeProtocolSkill.cleanup();
    }

    if (this.rayOfOblivionSkill && this.rayOfOblivionSkill.cleanup) {
      this.rayOfOblivionSkill.cleanup();
    }

    this.safeDeactivateGravityField();

    if (this.massEnergyTurretsSkill && this.massEnergyTurretsSkill.cleanupTurrets) {
      this.massEnergyTurretsSkill.cleanupTurrets(false);
    }

    this.cleanupRayHostileObjects?.();
    this.cleanupHostileObjects();
    this.healthPacks?.cleanup?.();
    this.cleanupPlayerTrees();
    
    
    
    
    

    if (this.dialogue && this.dialogue.clear) {
      this.dialogue.clear();
    }

    if (this.boss && this.boss.active) {
      this.tweens.killTweensOf(this.boss);
      this.boss.setVelocity(0, 0);
    }

    if (this.player && this.player.active) {
      this.tweens.killTweensOf(this.player);
    }
  }

  stopAllBossActions({
    stopCameraFollow = false,
    freezeBoss = false,
    clearHostiles = true,
    clearTurrets = true,
    keepGravityField = false
  } = {}) {
    if (this.attackLoop) {
      this.attackLoop.cancel();
    } else {
      this.attackLoopToken++;
    }

    this.setBossCasting?.(false);

    if (clearHostiles) {
      this.cancelPendingBattleTimers?.();
    }
    this.bossMovement?.cleanup?.();

    if (this.menacingAdvanceSkill && this.menacingAdvanceSkill.cleanupChargeObjects) {
      this.menacingAdvanceSkill.cleanupChargeObjects();
    }

    if (clearHostiles && this.purgeProtocolSkill && this.purgeProtocolSkill.cleanup) {
      this.purgeProtocolSkill.cleanup();
    }

    if (clearHostiles && this.rayOfOblivionSkill && this.rayOfOblivionSkill.cleanup) {
      this.rayOfOblivionSkill.cleanup();
    }

    if (clearTurrets && this.massEnergyTurretsSkill) {
      this.massEnergyTurretsSkill?.cleanupTurrets?.(true);
    }

    if (clearHostiles) {
      this.cleanupRayHostileObjects?.();
      this.cleanupHostileObjects();
    }

    if (!keepGravityField) {
      if (this.gravityFieldSkill && this.gravityFieldSkill.deactivate) {
        this.gravityFieldSkill.deactivate();
      } else {
        this.cleanupGravityFieldVisuals();
      }
    }

    if (this.dialogue && this.dialogue.clear) {
      this.dialogue.clear();
    }

    if (this.boss && this.boss.active) {
      this.tweens.killTweensOf(this.boss);
      this.boss.setVelocity(0, 0);
      this.boss.body.allowGravity = false;
    }

    if (stopCameraFollow) {
      this.cameras.main.stopFollow();
    }
  }




  createNarrativeProps() {
    if (this.__narrativePropsCreated) return;
    this.__narrativePropsCreated = true;
    this.__narrativeProps = [];

    const add = (obj) => {
      if (obj) this.__narrativeProps.push(obj);
      return obj;
    };

    const makeSign = (x, y, text, width = 250) => {
      const c = this.add.container(x, y).setDepth(21).setAlpha(0.82);
      const bg = this.add.rectangle(0, 0, width, 48, 0x120909, 0.72)
        .setStrokeStyle(2, 0xffb04a, 0.58);
      const label = this.add.text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffd39a",
        align: "center",
        stroke: "#000000",
        strokeThickness: 3,
        wordWrap: { width: width - 20 }
      }).setOrigin(0.5);
      c.add([bg, label]);
      return add(c);
    };

    
    
    const toy = this.add.container(735, 1470).setDepth(24).setAlpha(0.86);
    const body = this.add.triangle(0, 0, -18, 10, 24, 0, -18, -10, 0x2d2d34, 0.95)
      .setStrokeStyle(2, 0xd7d7d7, 0.42);
    const wing = this.add.triangle(-10, 6, -42, 22, -8, 12, 0x1b1b21, 0.9);
    const burn = this.add.circle(18, 0, 7, 0x000000, 0.72);
    toy.add([body, wing, burn]);
    add(toy);

    makeSign(1080, 1315, "DO NOT ENTER\nINVESTIGATION PENDING", 260);
    makeSign(1920, 468, "TRANSPORT PLATFORM\nUPLINK: MAINTENANCE", 300);
    makeSign(2920, 1410, "EMERGENCY LANE BLOCKED\nTEMPORARY CARGO", 310);

    const tags = this.add.container(2760, 1514).setDepth(24).setAlpha(0.78);
    const bag = this.add.rectangle(0, 0, 64, 34, 0xd6d0bd, 0.55).setStrokeStyle(2, 0x3a2a1c, 0.62);
    const tag1 = this.add.rectangle(-36, 24, 38, 12, 0xf4ead2, 0.72).setAngle(-12);
    const tag2 = this.add.rectangle(18, 31, 42, 12, 0xf4ead2, 0.72).setAngle(8);
    const name = this.add.text(-4, 0, "NAMES", { fontFamily: "monospace", fontSize: "9px", color: "#17110d" }).setOrigin(0.5);
    tags.add([bag, tag1, tag2, name]);
    add(tags);

    const streamer = this.add.container(1760, 392).setDepth(20).setAlpha(0.72);
    for (let i = 0; i < 8; i++) {
      const flag = this.add.triangle(i * 28, Math.sin(i) * 5, -8, 0, 8, 0, 0, 18, i % 2 ? 0xffdf8b : 0xff5b4d, 0.62);
      streamer.add(flag);
    }
    add(streamer);
  }

  patchTrackedBattleTimers() {
    if (!this.time || this.__timePluginPatched) return;
    this.__timePluginPatched = true;

    const originalDelayedCall = this.time.delayedCall.bind(this.time);
    const originalAddEvent = this.time.addEvent.bind(this.time);
    this.__originalDelayedCall = originalDelayedCall;
    this.__originalAddEvent = originalAddEvent;

    this.time.delayedCall = (delay, callback, args, callbackScope) => {
      let event = null;
      const wrapped = (...callbackArgs) => {
        if (event) this.__trackedBattleTimers?.delete?.(event);
        if (typeof callback === "function") {
          return callback.apply(callbackScope || this, callbackArgs);
        }
        return undefined;
      };
      event = originalDelayedCall(delay, wrapped, args, callbackScope);
      this.trackBattleTimer(event);
      return event;
    };

    this.time.addEvent = (config = {}) => {
      if (!config || typeof config !== "object") {
        const event = originalAddEvent(config);
        this.trackBattleTimer(event);
        return event;
      }

      const originalCallback = config.callback;
      let event = null;
      const wrappedConfig = {
        ...config,
        callback: (...callbackArgs) => {
          if (event && !event.loop && !event.repeat) this.__trackedBattleTimers?.delete?.(event);
          if (typeof originalCallback === "function") {
            return originalCallback.apply(config.callbackScope || this, callbackArgs);
          }
          return undefined;
        }
      };

      event = originalAddEvent(wrappedConfig);
      this.trackBattleTimer(event);
      return event;
    };
  }

  restoreTrackedBattleTimers() {
    this.cancelPendingBattleTimers?.();

    if (this.time && this.__timePluginPatched) {
      if (this.__originalDelayedCall) this.time.delayedCall = this.__originalDelayedCall;
      if (this.__originalAddEvent) this.time.addEvent = this.__originalAddEvent;
    }

    this.__timePluginPatched = false;
    this.__originalDelayedCall = null;
    this.__originalAddEvent = null;
  }

  trackBattleTimer(event) {
    if (!event) return event;
    this.__trackedBattleTimers = this.__trackedBattleTimers || new Set();

    if (!event.__morningstarTrackedRemove) {
      const originalRemove = event.remove?.bind(event);
      event.__morningstarTrackedRemove = true;
      event.remove = (dispatchCallback = false) => {
        this.__trackedBattleTimers?.delete?.(event);
        if (typeof originalRemove === "function") {
          return originalRemove(dispatchCallback);
        }
        return undefined;
      };
    }

    this.__trackedBattleTimers.add(event);
    return event;
  }

  forceResumeSceneClock() {
    if (this.time) this.time.timeScale = 1;
    if (this.physics?.world) {
      this.physics.world.timeScale = 1;
      this.physics.world.resume?.();
    }

    
    
    
    
    this.pauseMenuContainer?.setVisible?.(false);
    this.__pauseMenuOpen = false;
  }

  createOffscreenThreatIndicators() {
    this.offscreenIndicatorLayer = this.createScreenSpaceLayer(9700);

    const makeIndicator = (label, color = 0xffef9a) => {
      const container = this.add.container(0, 0)
        .setVisible(false);
      const arrow = this.add.triangle(0, 0, 0, -18, 32, 0, 0, 18, color, 0.92)
        .setStrokeStyle(3, 0x000000, 0.95);
      const text = this.add.text(0, 30, label, {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#fff4c8",
        fontStyle: "bold",
        stroke: "#001018",
        strokeThickness: 5
      }).setOrigin(0.5, 0);
      container.add([arrow, text]);
      this.offscreenIndicatorLayer.add(container);
      return container;
    };

    this.bossThreatIndicator = makeIndicator("BOSS", 0xffef9a);
    this.hostileThreatIndicator = makeIndicator("THREAT", 0xff5a5a);
    this.__screenThreatIndicators = [this.bossThreatIndicator, this.hostileThreatIndicator];
  }

  updateOffscreenThreatIndicators() {
    if (!this.cameras?.main || this.__pauseMenuOpen || this.gameOver) {
      this.bossThreatIndicator?.setVisible(false);
      this.hostileThreatIndicator?.setVisible(false);
      return;
    }

    this.updateOneOffscreenIndicator(this.bossThreatIndicator, this.boss, "BOSS");

    const offscreenHostile = this.findNearestOffscreenHostile();
    this.updateOneOffscreenIndicator(this.hostileThreatIndicator, offscreenHostile, "THREAT");
  }

  findNearestOffscreenHostile() {
    const player = this.player;
    if (!player || !this.activeHostileObjects) return null;
    const view = this.cameras.main.worldView;
    let best = null;
    let bestDistance = Infinity;

    for (const obj of this.activeHostileObjects) {
      if (!obj || !obj.active || !Number.isFinite(obj.x) || !Number.isFinite(obj.y)) continue;
      if (view.contains(obj.x, obj.y)) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, obj.x, obj.y);
      if (dist < bestDistance) {
        best = obj;
        bestDistance = dist;
      }
    }

    return best;
  }

  updateOneOffscreenIndicator(indicator, target, label = "THREAT") {
    if (!indicator || !target || !target.active || !Number.isFinite(target.x) || !Number.isFinite(target.y)) {
      indicator?.setVisible(false);
      return;
    }

    const cam = this.cameras.main;
    const view = cam.worldView;
    if (view.contains(target.x, target.y)) {
      indicator.setVisible(false);
      return;
    }

    const screenCenterX = this.scale.width / 2;
    const screenCenterY = this.scale.height / 2;
    const targetScreenX = (target.x - view.x) * cam.zoom;
    const targetScreenY = (target.y - view.y) * cam.zoom;
    const dx = targetScreenX - screenCenterX;
    const dy = targetScreenY - screenCenterY;
    const angle = Math.atan2(dy, dx);
    const margin = 52;
    const maxX = screenCenterX - margin;
    const maxY = screenCenterY - margin;
    const scale = Math.min(
      maxX / Math.max(Math.abs(Math.cos(angle)), 0.001),
      maxY / Math.max(Math.abs(Math.sin(angle)), 0.001)
    );

    const x = screenCenterX + Math.cos(angle) * scale;
    const y = screenCenterY + Math.sin(angle) * scale;
    indicator.setPosition(x, y).setRotation(angle).setVisible(true);

    const text = indicator.list?.[1];
    if (text?.setText) {
      text.setRotation(-angle);
      text.setText(label);
    }
  }

  createPauseMenu() {
    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(1180, width - 96);
    const panelHeight = Math.min(660, height - 96);
    const x = width / 2;
    const y = height / 2;
    const left = x - panelWidth / 2;
    const top = y - panelHeight / 2;
    const rightColX = left + panelWidth * 0.58;
    const bottom = y + panelHeight / 2;

    this.pauseMenuContainer = this.createScreenSpaceLayer(9800)
      .setVisible(false)
      .setAlpha(0);

    const shade = this.add.rectangle(0, 0, width, height, 0x000000, 0.80)
      .setOrigin(0, 0)
      .setInteractive();

    const panel = this.add.rectangle(x, y, panelWidth, panelHeight, 0x02070b, 0.985)
      .setStrokeStyle(4, 0x7df9ff, 0.86);

    const title = this.add.text(x, top + 46, "PAUSED // BITTER RAIN", {
      fontFamily: "monospace",
      fontSize: "32px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 6
    }).setOrigin(0.5);

    const controls = this.add.text(left + 48, top + 96,
      [
        "CONTROL QUICK REFERENCE",
        "A/D move",
        "Double-tap A/D: horizontal dash",
        "Double-tap W/S: vertical dash",
        "SPACE: jump / double jump",
        "W/S: climb ladders",
        "Q: blink to cursor",
        "Mouse swipe up/down: Blessing Tree",
        "ENTER/F: retry · H: combat hint",
        "",
        "RULE",
        "You do not attack.",
        "Survive until the core decays."
      ].join("\n"),
      {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#f6feff",
        lineSpacing: 7,
        stroke: "#001018",
        strokeThickness: 3,
        wordWrap: { width: panelWidth * 0.46 }
      }
    ).setOrigin(0, 0);

    this.pauseOptionText = this.add.text(rightColX, top + 112, "", {
      fontFamily: "monospace",
      fontSize: "18px",
      color: "#ffe8b8",
      lineSpacing: 9,
      stroke: "#001018",
      strokeThickness: 3,
      wordWrap: { width: panelWidth * 0.34 }
    }).setOrigin(0, 0);

    const divider = this.add.rectangle(rightColX - 30, top + 105, 2, panelHeight - 235, 0x7df9ff, 0.36)
      .setOrigin(0.5, 0);

    this.pauseMenuContainer.add([shade, panel, title, controls, divider, this.pauseOptionText]);

    const makeButton = (bx, by, bw, bh, label, callback) => {
      const rect = this.add.rectangle(bx, by, bw, bh, 0x08202c, 0.96)
        .setStrokeStyle(3, 0x7df9ff, 0.72)
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(bx, by, label, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#001018",
        strokeThickness: 4
      }).setOrigin(0.5);
      rect.on("pointerover", () => rect.setFillStyle(0x12384a, 0.98));
      rect.on("pointerout", () => rect.setFillStyle(0x08202c, 0.96));
      rect.on("pointerdown", (_pointer, _lx, _ly, event) => {
        event?.stopPropagation?.();
        callback?.();
      });
      rect.on("pointerup", (_pointer, _lx, _ly, event) => event?.stopPropagation?.());
      this.pauseMenuContainer.add([rect, text]);
      return { rect, text };
    };

    const buttonW = Math.min(210, (panelWidth - 150) / 4);
    const buttonH = 44;
    const gap = 28;
    const startX = x - (buttonW * 4 + gap * 3) / 2 + buttonW / 2;
    const row1 = bottom - 120;
    const row2 = bottom - 62;

    makeButton(startX + 0 * (buttonW + gap), row1, buttonW, buttonH, "SHAKE", () => this.cycleScreenShakeSetting());
    makeButton(startX + 1 * (buttonW + gap), row1, buttonW, buttonH, "COLOR MODE", () => this.toggleColorBlindSetting());
    makeButton(startX + 2 * (buttonW + gap), row1, buttonW, buttonH, "BGM VOL", () => this.cycleBossBgmVolumeSetting());
    makeButton(startX + 3 * (buttonW + gap), row1, buttonW, buttonH, "TRAINING", () => this.openTrainingRoom());
    makeButton(startX + 0 * (buttonW + gap), row2, buttonW, buttonH, "RESTART", () => this.hardRestartGame("pause-restart"));
    makeButton(startX + 1 * (buttonW + gap), row2, buttonW, buttonH, "MAIN MENU", () => this.returnToMainMenu());
    makeButton(startX + 2 * (buttonW + gap), row2, buttonW, buttonH, "RESUME", () => this.hidePauseMenu());

    this.refreshPauseMenuText();
  }

  togglePauseMenu() {
    if (this.gameOver) return;
    if (this.__pauseMenuOpen) {
      this.hidePauseMenu();
    } else {
      this.showPauseMenu();
    }
  }

  showPauseMenu() {
    if (!this.pauseMenuContainer || this.__pauseMenuOpen) return;

    this.__pauseMenuOpen = true;
    this.__wasControlsLockedBeforePause = !!this.controlsLocked;
    this.controlsLocked = true;
    this.time.timeScale = 0;
    if (this.physics?.world) this.physics.world.pause();

    this.refreshPauseMenuText();
    this.pauseMenuContainer.setVisible(true).setAlpha(1);
  }

  hidePauseMenu() {
    if (!this.pauseMenuContainer || !this.__pauseMenuOpen) return;

    this.__pauseMenuOpen = false;
    this.time.timeScale = 1;
    if (this.physics?.world) this.physics.world.resume();
    this.controlsLocked = this.__wasControlsLockedBeforePause;
    this.pauseMenuContainer.setVisible(false);
  }

  refreshPauseMenuText() {
    if (!this.pauseOptionText) return;

    const config = this.registry.get("gameConfig") || {};
    const accessibility = config.accessibility || {};
    const shake = Number.isFinite(accessibility.screenShakeMultiplier)
      ? accessibility.screenShakeMultiplier
      : this.screenShakeMultiplier ?? 1;
    const colorMode = accessibility.colorBlindMode ? "ON" : "OFF";
    const bgmVolume = Number.isFinite(config.audio?.bgm?.volume) ? config.audio.bgm.volume : 0.28;

    this.pauseOptionText.setText([
      "ACCESSIBILITY",
      `Shake: ${shake}`,
      `Color-blind palette: ${colorMode}`,
      `Boss BGM: ${Math.round(bgmVolume * 100)}%`,
      "",
      "RETRY",
      "End screen retry performs a clean page refresh.",
      "No phase/stage save shortcuts are included.",
      "Training opens the drill room."
    ].join("\n"));
  }

  cycleScreenShakeSetting() {
    const config = this.registry.get("gameConfig") || {};
    config.accessibility = config.accessibility || {};
    const values = [0, 0.5, 1, 1.5, 2];
    const current = Number.isFinite(config.accessibility.screenShakeMultiplier)
      ? config.accessibility.screenShakeMultiplier
      : this.screenShakeMultiplier ?? 1;
    const index = values.findIndex((value) => Math.abs(value - current) < 0.01);
    config.accessibility.screenShakeMultiplier = values[(index + 1 + values.length) % values.length];
    localStorage.setItem("morningstarScreenShakeMultiplier", String(config.accessibility.screenShakeMultiplier));
    this.registry.set("gameConfig", config);
    this.applyAccessibilityRuntimeSettings();
    this.refreshPauseMenuText();
  }

  toggleColorBlindSetting() {
    const config = this.registry.get("gameConfig") || {};
    config.accessibility = config.accessibility || {};
    config.accessibility.colorBlindMode = !config.accessibility.colorBlindMode;
    localStorage.setItem("morningstarColorBlindMode", config.accessibility.colorBlindMode ? "1" : "0");
    this.registry.set("gameConfig", config);
    this.refreshPauseMenuText();

    if (this.ui && typeof this.ui.applyColorBlindPalette === "function") {
      if (config.accessibility.colorBlindMode) {
        this.ui.applyColorBlindPalette(config.accessibility.colorBlindPalette || {});
      } else {
        this.ui.resetPhasePalette?.();
      }
      this.ui.update(this.bossIntegrity, this.bossMaxIntegrity, this.bossPhase);
    }
  }


  cycleBossBgmVolumeSetting() {
    const config = this.registry.get("gameConfig") || {};
    config.audio = config.audio || {};
    config.audio.bgm = config.audio.bgm || {};
    const values = [0, 0.14, 0.28, 0.42, 0.56];
    const current = Number.isFinite(config.audio.bgm.volume) ? config.audio.bgm.volume : 0.28;
    const index = values.findIndex((value) => Math.abs(value - current) < 0.015);
    config.audio.bgm.volume = values[(index + 1 + values.length) % values.length];
    localStorage.setItem("morningstarBossBgmVolume", String(config.audio.bgm.volume));
    this.registry.set("gameConfig", config);

    if (this.bgm?.music) {
      this.bgm.music.setVolume(config.audio.bgm.volume);
    }

    this.refreshPauseMenuText();
  }

  openTrainingRoom(skillKey = null) {
    this.forceResumeSceneClock();
    this.hidePauseMenu?.();
    this.cleanupAllBattleObjects?.();
    this.bgm?.fadeOut?.(250);
    this.scene.start("TrainingScene", { trainingSkill: skillKey || null, devStartPhase: this.bossPhase || 1 });
  }

  restartFromSelectedPhase(phase) {
    phase = Phaser.Math.Clamp(phase || 1, 1, 4);
    this.forceResumeSceneClock();
    this.hidePauseMenu();
    this.scene.restart({ devStartPhase: phase, restartReason: "manual" });
  }

  getPhaseBossAnchor(phase = this.bossPhase || 1) {
    const anchors = {
      1: { x: 1920, y: 946 },
      2: { x: 1920, y: 422 },
      3: { x: 1920, y: 1282 },
      4: { x: 1920, y: 946 }
    };

    return anchors[Phaser.Math.Clamp(phase || 1, 1, 4)] || anchors[1];
  }

  moveBossToPhaseAnchor(phase = this.bossPhase || 1, duration = 620) {
    if (!this.boss || !this.boss.active) return;
    const anchor = this.getPhaseBossAnchor(phase);
    this.tweens.killTweensOf(this.boss);
    this.boss.body.allowGravity = false;
    this.boss.setVelocity(0, 0);
    this.tweens.add({
      targets: this.boss,
      x: anchor.x,
      y: anchor.y,
      duration,
      ease: "Sine.easeInOut"
    });
  }

  cancelPendingBattleTimers() {
    const timers = Array.from(this.__trackedBattleTimers || []);
    for (const event of timers) {
      if (!event) continue;
      try {
        event.remove(false);
      } catch (error) {
        console.warn("[BossScene] Failed to remove tracked timer", error);
      }
    }
    this.__trackedBattleTimers?.clear?.();
  }

  startArenaEntrance() {
    this.introSequence.startArenaEntrance();
  }

  startBossIntro() {
    this.stopAllBossActions({
      stopCameraFollow: false,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });

    this.introSequence.startBossIntro();
  }

  playAuthorizationSequence() {
    this.introSequence.playAuthorizationSequence();
  }

  finishBossIntro() {
    this.introSequence.finishBossIntro();
  }

  endBossFight() {
    if (this.gameOver) return;

    this.cleanupPlayerTrees();
    this.bgm?.fadeOut?.(1200);

    this.stopAllBossActions({
      stopCameraFollow: true,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });

    this.deathSequence.endBossFight();
  }

  runBossDeathPulseSequence() {
    this.deathSequence.runBossDeathPulseSequence();
  }

  createDeathPulse(color, index) {
    this.deathSequence.createDeathPulse(color, index);
  }

  cleanupPhaseFourForPlayerDefeat() {
    this.__ultimateFinaleStarted = true;
    this.isPhaseTransitioning = false;
    this.phaseManager?.stopUltimateProtocolLines?.();
    this.phaseManager?.stopUltimateCountdown?.();

    if (this.__phase4BrotherPressureEvent) {
      this.__phase4BrotherPressureEvent.remove(false);
      this.__phase4BrotherPressureEvent = null;
    }

    this.purgeProtocolSkill?.stopPhase4EndlessBarrage?.();
    this.thunderstorm?.stop?.();
    this.phase4ThunderstormSystem?.stop?.();
    this.rayOfOblivionSkill?.forceClearPhase4SweepVisuals?.();
    this.rayOfOblivionSkill?.cleanup?.({ preserveForcedPhase4Radial: false });
    this.massEnergyTurretsSkill?.cleanupTurrets?.(true);
    this.cancelPendingBattleTimers?.();
    this.cleanupRayHostileObjects?.();
    this.cleanupHostileObjects?.();
    this.safeDeactivateGravityField?.();
    this.cameras?.main?.resetFX?.();
    this.forceResumeSceneClock?.();
    this.setBossCasting?.(false);
  }

  handlePlayerDefeat(reason = "player-defeat") {
    if (this.__playerDefeatStarted || this.__failureSequenceStarted) return false;
    this.__playerDefeatStarted = true;
    this.__lastPlayerDefeatReason = reason;
    this.cleanupPhaseFourForPlayerDefeat();
    this.failTrial();
    return true;
  }

  failTrial() {
    if (this.__failureSequenceStarted) return;
    this.cleanupPhaseFourForPlayerDefeat?.();
    const survived = this.getSurvivedSeconds?.() ?? Math.max(0, Math.floor(((this.time?.now || 0) - (this.combatStartTime || this.time?.now || 0)) / 1000));
    const integrity = Math.max(0, Math.ceil((this.bossIntegrity / this.bossMaxIntegrity) * 100));
    if (this.ui?.gameOverText) {
      this.ui.gameOverText.setText(`TRIAL FAILED
Survived: ${survived}s · Guardian integrity: ${integrity}%
Trees blocked: ${this.treeBlocksThisRun || 0}
Press ENTER or F to retry from Phase I`);
    }

    this.cleanupPlayerTrees();
    this.bgm?.fadeOut?.(500);

    this.stopAllBossActions({
      stopCameraFollow: true,
      freezeBoss: true,
      clearHostiles: true,
      clearTurrets: true,
      keepGravityField: false
    });

    this.deathSequence.failTrial();
  }
}
