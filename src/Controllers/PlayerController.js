import PlayerAbilityConfig from "../PlayerAbilities/PlayerAbilityConfig.js";
import PlayerMovement from "../PlayerAbilities/PlayerMovement.js";
import DirectionalDash from "../PlayerAbilities/DirectionalDash.js";
import BlinkAbility from "../PlayerAbilities/BlinkAbility.js";
import BlessingTreeAbility from "../PlayerAbilities/BlessingTreeAbility.js";
import { PLAYER_STATS } from "../Utils/constants.js";
import SpriteMetadataRegistry from "../Systems/SpriteMetadataRegistry.js";
import PlayerAnimationStateMachine from "../Systems/PlayerAnimationStateMachine.js";
import GhostTrail from "../Systems/GhostTrail.js";
import FixedStepRunner from "../Systems/FixedStepRunner.js";
import InputBuffer from "../Systems/InputBuffer.js";
import PlayerParticleJuice from "../Systems/PlayerParticleJuice.js";

export default class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = null;

    this.config = PlayerAbilityConfig;

    this.movement = null;
    this.directionalDash = null;
    this.blinkAbility = null;
    this.blessingTreeAbility = null;
    this.spriteMetadata = null;
    this.animationStateMachine = null;
    this.ghostTrail = null;
    this.fixedStepRunner = null;
    this.inputBuffer = null;
    this.rootScarGraphics = null;
    this.treeSummonCount = 0;
    this.particleJuice = null;
  }

  create() {
    const scene = this.scene;

    const spawn = scene.arena?.resolveActorSpawn
      ? scene.arena.resolveActorSpawn(scene.playerSpawn, 52, 18)
      : scene.playerSpawn;

    this.player = scene.physics.add.sprite(
      spawn.x,
      spawn.y,
      "player_idle"
    );

    this.player.setScale(1);
    this.player.setCollideWorldBounds(true);

    scene.spriteMetadataRegistry = scene.spriteMetadataRegistry || new SpriteMetadataRegistry(scene);
    this.spriteMetadata = scene.spriteMetadataRegistry.attach(this.player, "player", {
      
      
      
      
      applyHitbox: false
    });
    this.spriteMetadata?.applyCurrentFrame?.();
    this.updateHitbox();

    
    
    if (scene.arena?.resolveActorSpawn && this.player.body) {
      const safeSpawn = scene.arena.resolveActorSpawn(
        scene.playerSpawn,
        Math.max(34, this.player.body.height * 0.5 + 4),
        Math.max(16, this.player.body.width * 0.5 + 4)
      );
      this.player.setPosition(safeSpawn.x, safeSpawn.y);
      this.player.body.reset(safeSpawn.x, safeSpawn.y);
    }

    this.animationStateMachine = new PlayerAnimationStateMachine(scene, this.player, {
      bufferWindowMs: 140
    });
    scene.playerFsm = this.animationStateMachine;

    this.ghostTrail = new GhostTrail(scene, this.player, {
      velocityThreshold: 1150,
      minIntervalMs: 80,
      lifeMs: 170,
      maxGhosts: 10
    });
    scene.playerGhostTrail = this.ghostTrail;

    this.particleJuice = new PlayerParticleJuice(scene, this.player);
    scene.playerParticleJuice = this.particleJuice;

    const gameConfig = scene.registry.get("gameConfig") || {};
    this.fixedStepRunner = new FixedStepRunner({
      stepSeconds: gameConfig.physics?.fixedStepSeconds || 1 / 60,
      maxStepsPerFrame: gameConfig.physics?.maxFixedStepsPerFrame || 4
    });

    if (scene.anims.exists("player_idle_anim")) {
      this.animationStateMachine.requestMovement("idle");
    }

    scene.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    scene.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    scene.keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    scene.keyS = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    scene.keyQ = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    scene.keyR = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    scene.cursors = scene.input.keyboard.createCursorKeys();

    this.inputBuffer = new InputBuffer(scene, this.config.inputBufferMs ?? 130);
    scene.inputBuffer = this.inputBuffer;

    scene.jumpCount = 0;
    scene.maxJumps = this.config.maxJumps;

    const playerStats = scene.registry.get("gameConfig")?.player || {};
    scene.playerMaxHp = playerStats.maxHp || PLAYER_STATS.MAX_HP;
    scene.playerHp = scene.playerMaxHp;
    scene.playerInvulnerableUntil = 0;

    scene.input.mouse.disableContextMenu();

    this.movement = new PlayerMovement(
      scene,
      this.player,
      this.config,
      () => this.updateHitbox(),
      this.animationStateMachine
    );

    this.directionalDash = new DirectionalDash(
      scene,
      this.player,
      this.config,
      (x, y, color) => this.flash(x, y, color)
    );

    this.blinkAbility = new BlinkAbility(
      scene,
      this.player,
      this.config,
      (x, y, color) => this.flash(x, y, color)
    );

    this.blessingTreeAbility = new BlessingTreeAbility(
      scene,
      this.player,
      this.config
    );

    this.rootScarGraphics = scene.add.graphics().setDepth(999);

    return this.player;
  }

  sampleInput() {
    const scene = this.scene;
    const buffer = this.inputBuffer;
    const windowMs = this.config.inputBufferMs ?? 130;

    if (scene.cursors?.space && Phaser.Input.Keyboard.JustDown(scene.cursors.space)) {
      buffer.push("jump", {}, windowMs);
    }

    if (scene.keyQ && Phaser.Input.Keyboard.JustDown(scene.keyQ)) {
      buffer.push("blink", {}, windowMs);
    }

    for (const keyName of ["A", "D", "W", "S"]) {
      const key = scene[`key${keyName}`];
      if (key && Phaser.Input.Keyboard.JustDown(key)) {
        buffer.push(`dash:${keyName}`, {}, windowMs);
      }
    }

    scene.inputState = {
      jumpPressed: Boolean(buffer.consume("jump")),
      blinkPressed: Boolean(buffer.consume("blink")),
      dashTap: {
        A: Boolean(buffer.consume("dash:A")),
        D: Boolean(buffer.consume("dash:D")),
        W: Boolean(buffer.consume("dash:W")),
        S: Boolean(buffer.consume("dash:S"))
      }
    };
  }

  update(time, delta) {
    const scene = this.scene;

    if (!this.player || !this.player.active) return;

    this.sampleInput();

    this.animationStateMachine?.update();
    this.ghostTrail?.update(time);
    this.spriteMetadata?.applyCurrentFrame();
    this.blessingTreeAbility?.update();
    this.updateRootScars();

    if (scene.controlsLocked || scene.gameOver) return;

    if (
      this.directionalDash?.isDashing ||
      this.blinkAbility?.isBlinking
    ) {
      return;
    }

    const gravityMovementLocked = time < (scene.gravityMovementLockUntil || scene.gravityDebuffUntil || 0);

    if (scene.inputState?.blinkPressed && !gravityMovementLocked) {
      this.blinkAbility.tryBlink();
      return;
    }

    if (!gravityMovementLocked) {
      this.directionalDash.update();
    }

    if (this.directionalDash?.isDashing) {
      return;
    }

    
    
    
    this.movement.update(time, delta);
  }

  registerTreeSummon() {
    this.treeSummonCount += 1;
    this.scene.treeSummonCount = this.treeSummonCount;
    this.updateRootScars(true);
  }

  updateRootScars(flash = false) {
    const g = this.rootScarGraphics;
    const player = this.player;
    if (!g || !player || !player.active) return;

    g.clear();
    const visibleMarks = Phaser.Math.Clamp(Math.ceil(this.treeSummonCount / 5), 0, 7);
    if (visibleMarks <= 0) return;

    g.lineStyle(flash ? 3 : 2, 0xf4fff4, flash ? 0.86 : 0.55);
    const facing = player.flipX ? -1 : 1;
    const baseX = player.x + facing * 2;
    const baseY = player.y + 18;

    for (let i = 0; i < visibleMarks; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const y = baseY - i * 9;
      g.beginPath();
      g.moveTo(baseX + side * 5, y);
      g.lineTo(baseX + side * (13 + i * 1.2), y - 7);
      g.lineTo(baseX + side * (8 + i * 1.5), y - 16);
      g.strokePath();
    }

    if (flash) {
      this.scene.tweens.add({
        targets: g,
        alpha: 0.25,
        duration: 120,
        yoyo: true,
        repeat: 1,
        onComplete: () => g.setAlpha(1)
      });
    }
  }

  updateHitbox() {
    const player = this.player;

    if (!player || !player.body) return;

    
    
    
    const bodyWidth = 34;
    const bodyHeight = 70;
    const baseOffsetX = 12;
    const frameWidth = player.frame?.realWidth || player.frame?.width || 128;
    const offsetX = player.flipX
      ? Math.max(0, frameWidth - baseOffsetX - bodyWidth)
      : baseOffsetX;

    player.body.setSize(bodyWidth, bodyHeight);
    player.body.setOffset(offsetX, 46);
  }

  flash(x, y, color) {
    const scene = this.scene;

    const c = scene.add.circle(x, y, 32, color, 0.7);
    c.setDepth(1000);

    scene.tweens.add({
      targets: c,
      scale: 2.4,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (c && c.active) c.destroy();
      }
    });
  }

  damagePlayer(amount = 1) {
    const scene = this.scene;
    const now = scene.time.now;

    if (scene.gameOver) {
      return false;
    }

    if (now < scene.playerInvulnerableUntil) {
      const iframeAge = now - (scene.playerIframeStartedAt ?? -99999);
      if (iframeAge >= 0 && iframeAge <= 100) {
        scene.showAlmostHitFeedback?.();
      }
      return false;
    }

    const wasDashingOrBlinking = Boolean(
      this.directionalDash?.isDashing ||
      this.blinkAbility?.isBlinking
    );

    this.directionalDash?.interrupt?.();
    this.blinkAbility?.interrupt?.();

    
    
    
    
    
    
    scene.tweens.killTweensOf(this.player);
    if (this.player?.body) {
      this.player.body.allowGravity = true;
      if (wasDashingOrBlinking) {
        this.player.setVelocity(0, 0);
      }
    }

    scene.audioCues?.play?.("playerHurt");
    scene.playerHp -= amount;
    const playerStats = scene.registry.get("gameConfig")?.player || {};
    scene.playerInvulnerableUntil = now + (playerStats.iframeMs || PLAYER_STATS.IFRAME_MS);
    scene.playerIframeStartedAt = now;

    scene.playPlayerDamageFeedback?.();
    scene.cameras.main.shake(120, 0.0045);

    if (scene.anims.exists("player_hurt_anim")) {
      this.animationStateMachine?.requestAction("hurt", { lockMs: 180 });
    }

    scene.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 80,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        if (this.player && this.player.active) {
          this.player.setAlpha(1);
        }
      }
    });

    if (scene.playerHp <= 0) {
      scene.audioCues?.play?.("playerDeath", { cooldownMs: 1200 });
      if (scene.anims.exists("player_dead_anim")) {
        this.animationStateMachine?.requestAction("dead", { lockMs: 999999 });
      }

      scene.handlePlayerDefeat?.("damagePlayer") ?? scene.failTrial();
    }

    return true;
  }
}
