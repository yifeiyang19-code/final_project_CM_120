export default class PlayerMovement {
  constructor(scene, player, config, updateHitbox, stateMachine = null) {
    this.scene = scene;
    this.player = player;
    this.config = config;
    this.updateHitbox = updateHitbox;
    this.stateMachine = stateMachine;

    this.isClimbing = false;
    this.climbSpeed = this.config.ladderClimbSpeed ?? 560;
    this.wasOnGround = false;
    this.previousVelocityY = 0;
    this.autoStepHeights = this.config.autoStepHeights ?? [18, 34, 52, 66];
    this.lastAutoStepAt = 0;
  }

  update(time, delta) {
    const scene = this.scene;
    const player = this.player;

    if (!player || !player.active || !player.body) return;

    if (this.updateLadderMovement(time, delta)) {
      return;
    }

    const jumpPower =
      time < scene.gravityDebuffUntil
        ? Math.max(this.config.jumpPower + 160, -500)
        : this.config.jumpPower;

    const doubleJumpPower =
      time < scene.gravityDebuffUntil
        ? Math.max(this.config.doubleJumpPower + 140, -500)
        : this.config.doubleJumpPower;

    const onGround = player.body.blocked.down || player.body.touching.down;

    if (onGround && !this.wasOnGround && this.previousVelocityY > 260) {
      scene.audioCues?.play?.("playerLand", {
        volume: Phaser.Math.Clamp(this.previousVelocityY / 1200, 0.32, 0.72),
        cooldownMs: 140
      });
      scene.playerParticleJuice?.emitJumpBurst?.("land");
    }

    if (onGround) {
      scene.jumpCount = 0;
    }

    player.setVelocityX(0);

    let moving = false;

    if (scene.keyA.isDown) {
      moving = true;
      player.setVelocityX(-this.config.runSpeed);
      player.setFlipX(true);
      this.updateHitbox();

      this.playMovement("run");
      if (onGround) scene.playerParticleJuice?.emitRunDust?.(time, -1);
    } else if (scene.keyD.isDown) {
      moving = true;
      player.setVelocityX(this.config.runSpeed);
      player.setFlipX(false);
      this.updateHitbox();

      this.playMovement("run");
      if (onGround) scene.playerParticleJuice?.emitRunDust?.(time, 1);
    }

    if (onGround && moving) {
      this.tryAutoStep(time);
    }

    const gravityMovementLocked = time < (scene.gravityMovementLockUntil || scene.gravityDebuffUntil || 0);
    const jumpPressed = Boolean(scene.inputState?.jumpPressed) && !gravityMovementLocked;

    if (jumpPressed && this.stateMachine?.isActionLocked?.()) {
      this.stateMachine.bufferAction("jump", {}, 140);
    }

    if (
      (jumpPressed || this.stateMachine?.consumeBufferedAction?.("jump")) &&
      !this.stateMachine?.isActionLocked?.() &&
      scene.jumpCount < scene.maxJumps
    ) {
      const power = scene.jumpCount === 0
        ? jumpPower
        : doubleJumpPower;

      player.setVelocityY(power);
      const jumpKind = scene.jumpCount === 0 ? "jump" : "double";
      scene.audioCues?.play?.(scene.jumpCount === 0 ? "playerJump" : "playerDoubleJump");
      scene.playerParticleJuice?.emitJumpBurst?.(jumpKind);
      scene.jumpCount++;
      this.playMovement("jump");
    }

    if (player.body.velocity.y > this.config.maxFallSpeed) {
      player.setVelocityY(this.config.maxFallSpeed);
    }

    if (!onGround) {
      this.playMovement(player.body.velocity.y > 0 ? "fall" : "jump");
    } else if (!moving) {
      this.playMovement("idle");
    }

    this.wasOnGround = onGround;
    this.previousVelocityY = player.body.velocity.y;
  }

  updateLadderMovement(time, delta) {
    const scene = this.scene;
    const player = this.player;

    const onLadder = scene.isPlayerInLadderZone
      ? scene.isPlayerInLadderZone(player)
      : false;

    const upHeld = scene.keyW?.isDown || scene.cursors?.up?.isDown;
    const downHeld = scene.keyS?.isDown || scene.cursors?.down?.isDown;
    const verticalHeld = upHeld || downHeld;

    if (!onLadder) {
      if (this.isClimbing) {
        this.stopClimbing(true);
      }
      return false;
    }

    const gravityMovementLocked = time < (scene.gravityMovementLockUntil || scene.gravityDebuffUntil || 0);
    const jumpPressed = Boolean(scene.inputState?.jumpPressed) && !gravityMovementLocked;

    if (jumpPressed && this.isClimbing) {
      this.stopClimbing(true);
      player.setVelocityY(this.config.jumpPower * 0.72);
      scene.audioCues?.play?.("playerJump");
      scene.playerParticleJuice?.emitLadderJumpBurst?.();
      scene.jumpCount = 1;

      this.playMovement("jump");

      return true;
    }

    if (!verticalHeld && !this.isClimbing) {
      if (scene.showLadderHint) {
        scene.showLadderHint(player.x, player.y - 92);
      }
      return false;
    }

    this.isClimbing = true;
    scene.playerIsClimbing = true;
    scene.jumpCount = 0;

    const gravitySlowed = time < (scene.gravityDebuffUntil || 0);
    const ladderSlowMultiplier = gravitySlowed ? 0.34 : 1;

    player.body.allowGravity = false;
    player.setVelocity(0, 0);

    if (scene.keyA?.isDown) {
      player.setVelocityX(-this.config.runSpeed * 0.72 * ladderSlowMultiplier);
      player.setFlipX(true);
      this.updateHitbox();
    } else if (scene.keyD?.isDown) {
      player.setVelocityX(this.config.runSpeed * 0.72 * ladderSlowMultiplier);
      player.setFlipX(false);
      this.updateHitbox();
    }

    if (upHeld && !downHeld) {
      player.setVelocityY(-this.climbSpeed * ladderSlowMultiplier);
    } else if (downHeld && !upHeld) {
      player.setVelocityY(this.climbSpeed * ladderSlowMultiplier);
    } else {
      player.setVelocityY(0);
    }

    if (scene.anims.exists("player_walk_anim")) {
      if (verticalHeld || Math.abs(player.body.velocity.x) > 0) {
        this.playMovement("climb");
      } else {
        player.anims.pause();
      }
    } else if (scene.anims.exists("player_idle_anim")) {
      this.playMovement("idle");
    }

    if (scene.showLadderHint) {
      scene.showLadderHint(player.x, player.y - 92);
    }

    return true;
  }


  tryAutoStep(time) {
    const scene = this.scene;
    const player = this.player;
    const body = player?.body;

    if (!player || !body || !scene.isBlockingSolidAtWorld || !scene.isPlayerAreaEmptyAt) return false;
    if (time < (this.lastAutoStepAt || 0) + 90) return false;

    const dir = body.velocity.x < -10 ? -1 : body.velocity.x > 10 ? 1 : 0;
    if (!dir) return false;

    const halfWidth = Math.max(14, body.width * 0.5 - 2);
    const halfHeight = Math.max(24, body.height * 0.5 - 2);
    const probeX = body.center.x + dir * (halfWidth + 7);
    const footY = body.bottom - 2;

    const lowBlocked = scene.isBlockingSolidAtWorld(probeX, footY);
    const midBlocked = scene.isBlockingSolidAtWorld(probeX, body.center.y + 6);

    if (!lowBlocked && !midBlocked) return false;

    for (const stepHeight of this.autoStepHeights) {
      const nextCenterX = player.x + dir * 10;
      const nextCenterY = player.y - stepHeight;
      const frontCheckY = footY - stepHeight;

      if (scene.isBlockingSolidAtWorld(probeX, frontCheckY)) {
        continue;
      }

      if (!scene.isPlayerAreaEmptyAt(nextCenterX, nextCenterY, halfWidth, halfHeight)) {
        continue;
      }

      player.setPosition(nextCenterX, nextCenterY);
      body.reset(nextCenterX, nextCenterY);
      body.setVelocityX(dir * this.config.runSpeed);
      this.lastAutoStepAt = time;
      return true;
    }

    return false;
  }

  playMovement(state) {
    if (this.stateMachine) {
      this.stateMachine.requestMovement(state);
      return;
    }

    const animationKey = {
      idle: "player_idle_anim",
      run: "player_run_anim",
      walk: "player_walk_anim",
      jump: "player_jump_anim",
      fall: "player_jump_anim",
      climb: "player_walk_anim"
    }[state] || "player_idle_anim";

    if (this.scene.anims.exists(animationKey)) {
      this.player.play(animationKey, true);
    }
  }

  stopClimbing(restoreGravity = true) {
    const scene = this.scene;
    const player = this.player;

    this.isClimbing = false;
    scene.playerIsClimbing = false;

    if (player && player.body && restoreGravity) {
      player.body.allowGravity = true;
    }

    if (player && player.anims && player.anims.isPaused) {
      player.anims.resume();
    }
  }
}
