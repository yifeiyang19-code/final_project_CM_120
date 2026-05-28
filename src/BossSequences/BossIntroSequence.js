export default class BossIntroSequence {
  constructor(scene) {
    this.scene = scene;
  }

  startArenaEntrance() {
    const scene = this.scene;

    scene.cameras.main.setZoom(0.62);
    scene.cameras.main.centerOn(scene.player.x, scene.player.y - 180);

    scene.time.delayedCall(500, () => {
      scene.tweens.add({
        targets: scene.blackScreen,
        alpha: 0,
        duration: 900,
        ease: "Linear"
      });

      scene.cameras.main.startFollow(scene.player, true, 0.08, 0.08);
      scene.cameras.main.setFollowOffset(0, scene.cameraFollowOffsetY);

      scene.player.setFlipX(false);

      if (scene.playerController) {
        scene.playerController.updateHitbox();
      } else if (scene.updatePlayerHitbox) {
        scene.updatePlayerHitbox();
      }

      scene.player.play("player_walk_anim", true);
      scene.player.setVelocityX(120);

      scene.time.delayedCall(900, () => {
        scene.player.setVelocityX(0);
        scene.player.play("player_idle_anim", true);

        scene.time.delayedCall(500, () => {
          this.startBossIntro();
        });
      });
    });
  }

  startBossIntro() {
    const scene = this.scene;

    scene.audioCues?.play?.("bossIntroPowerup", { volume: 0.46, cooldownMs: 1400 });
    scene.cameras.main.stopFollow();

    const landingPoint = scene.bossLandingPoint || scene.bossSpawn || {
      x: scene.player.x + 620,
      y: scene.player.y
    };
    const entryPoint = scene.bossEntrySpawn || scene.bossSpawn || {
      x: landingPoint.x,
      y: Math.max(120, landingPoint.y - 640)
    };

    const landingX = Phaser.Math.Clamp(
      landingPoint.x,
      160,
      scene.map.widthInPixels - 160
    );

    const landingY = Phaser.Math.Clamp(
      landingPoint.y,
      120,
      scene.map.heightInPixels - 120
    );

    const entranceX = Phaser.Math.Clamp(
      entryPoint.x,
      160,
      scene.map.widthInPixels - 160
    );

    const entranceY = Phaser.Math.Clamp(
      entryPoint.y,
      80,
      scene.map.heightInPixels - 160
    );

    scene.boss.setPosition(entranceX, entranceY);
    scene.boss.setVelocity(0, 0);
    scene.boss.body.allowGravity = false;
    scene.boss.setTexture("blue_land", 5);
    scene.boss.setTint(0x050510);
    scene.boss.setFlipX(scene.player.x < scene.boss.x);

    scene.cameras.main.pan(
      (scene.player.x + landingX) * 0.5,
      Math.min(landingY - 160, entranceY + 120),
      850,
      "Sine.easeInOut"
    );

    scene.time.delayedCall(650, () => {
      scene.bossSpeak(
        "Unauthorized motion inside Morningstar Port.",
        2600,
        {
          anchorToSpeaker: true,
          fontSize: "38px",
          boxWidth: 880,
          boxHeight: 126,
          depth: 7200
        }
      );

      if (scene.anims.exists("blue_fly_up_anim")) {
        scene.boss.play("blue_fly_up_anim", true);
      }

      this.spawnEntranceLightning(landingX, landingY);

      scene.tweens.add({
        targets: scene.boss,
        x: landingX,
        y: landingY,
        duration: 1800,
        ease: "Cubic.easeIn",
        onComplete: () => {
          scene.boss.body.allowGravity = false;
          scene.boss.setVelocity(0, 0);
          scene.audioCues?.play?.("bossLandingImpact", { volume: 0.70, cooldownMs: 900 });
          scene.boss.setTexture("blue_land", 5);

          scene.cameras.main.flash(280, 140, 210, 255);
          scene.cameras.main.shake(650, 0.018 * (scene.screenShakeMultiplier || 1));

          scene.tweens.add({
            targets: scene.boss,
            scaleX: 2.52,
            scaleY: 2.08,
            duration: 160,
            yoyo: true,
            ease: "Sine.easeOut"
          });

          scene.time.delayedCall(650, () => {
            this.playAuthorizationSequence();
          });
        }
      });
    });
  }

  spawnEntranceLightning(x, y) {
    const scene = this.scene;

    if (!scene.anims.exists("phase_lightning_anim")) return;

    for (let i = 0; i < 4; i++) {
      scene.time.delayedCall(i * 180, () => {
        const bolt = scene.add.sprite(
          x + Phaser.Math.Between(-220, 220),
          y - Phaser.Math.Between(80, 220),
          "phase_lightning_1"
        );

        bolt.setDepth(1000);
        bolt.setScale(1.2);
        bolt.setAlpha(0.82);
        bolt.setBlendMode(Phaser.BlendModes.ADD);

        bolt.play("phase_lightning_anim");

        bolt.once("animationcomplete", () => {
          bolt.destroy();
        });
      });
    }
  }

  destroyVerticalLandingPath(x, fromY, toY, width = 260) {
    
  }

  destroyLandingImpactArea(x, y) {
    
  }

  playAuthorizationSequence() {
    const scene = this.scene;

    scene.cameras.main.stopFollow();
    scene.cameras.main.pan(scene.boss.x, scene.boss.y - 140, 600, "Sine.easeOut");

    scene.authText.setStyle({
      fontSize: "46px",
      color: "#dff8ff",
      fontFamily: "'Cinzel', serif",
      fontStyle: "bold",
      stroke: "#001018",
      strokeThickness: 10
    });

    scene.authText.setText("GUARDIAN NETWORK ACTIVE");

    scene.tweens.add({
      targets: scene.authText,
      alpha: 1,
      duration: 500,
      ease: "Linear"
    });

    scene.time.delayedCall(850, () => {
      scene.bossSpeak(
        "Three guardian units remain. One command survives.",
        3000,
        {
          anchorToSpeaker: true,
          fontSize: "38px",
          boxWidth: 900,
          boxHeight: 126,
          depth: 7200
        }
      );

      scene.audioCues?.play?.("phaseTitle", { volume: 0.38, cooldownMs: 900 });
      scene.cameras.main.flash(620, 120, 190, 255);
      scene.cameras.main.shake(700, 0.016);

      scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 2200,
        onUpdate: (tween) => {
          const v = tween.getValue() / 100;

          const r = Phaser.Math.Interpolation.Linear([10, 205], v);
          const g = Phaser.Math.Interpolation.Linear([18, 245], v);
          const b = Phaser.Math.Interpolation.Linear([32, 255], v);

          scene.boss.setTint(
            Phaser.Display.Color.GetColor(r, g, b)
          );
        }
      });

      let activationResolved = false;
      const resolveActivation = () => {
        if (activationResolved) return;
        activationResolved = true;

        if (!scene.boss || !scene.boss.active || scene.gameOver) return;

        scene.boss.clearTint();
        if (scene.anims.exists("blue_idle_anim")) {
          scene.boss.play("blue_idle_anim", true);
        }

        scene.time.delayedCall(280, () => {
          if (scene.gameOver || scene.controlsLocked === false) return;
          scene.bossSpeak(
            "Protect the port. Remove the trespasser.",
            2600,
            {
              anchorToSpeaker: true,
              fontSize: "38px",
              boxWidth: 880,
              boxHeight: 126,
              depth: 7200
            }
          );
        });

        scene.time.delayedCall(1300, () => {
          this.finishBossIntro();
        });
      };

      if (scene.anims.exists("blue_activate")) {
        scene.boss.once(Phaser.Animations.Events.ANIMATION_COMPLETE, resolveActivation);
        scene.boss.play("blue_activate");
        scene.time.delayedCall(2600, resolveActivation);
      } else {
        scene.time.delayedCall(500, resolveActivation);
      }
    });
  }

  finishBossIntro() {
    const scene = this.scene;

    if (this.__finishStarted) return;
    this.__finishStarted = true;

    scene.tweens.add({
      targets: scene.authText,
      alpha: 0,
      duration: 700,
      ease: "Linear"
    });

    scene.time.delayedCall(500, () => {
      scene.cameras.main.stopFollow();

      scene.cameras.main.pan(
        scene.player.x,
        scene.player.y - 180,
        850,
        "Sine.easeInOut"
      );

      scene.tweens.add({
        targets: scene.cameras.main,
        zoom: scene.combatZoom,
        duration: 850,
        ease: "Sine.easeInOut"
      });

      scene.time.delayedCall(900, () => {
        scene.cameras.main.startFollow(scene.player, true, 0.08, 0.08);
        scene.cameras.main.setFollowOffset(0, scene.cameraFollowOffsetY);

        if (scene.ui && scene.ui.showBossHud) {
          scene.ui.showBossHud(700);
        }

        scene.controlsLocked = false;
        scene.combatStartTime = scene.time.now;
        scene.combatStartRealTime = performance.now();
        scene.showCombatHintOverlay?.(3400);
        scene.fadeBossIdentityAfterDelay?.(4200, 900);

        scene.bossSpeak(
          "SYSTEM: Core unstable. Survive. Block. Outlast.",
          2600,
          {
            anchorToSpeaker: false,
            x: scene.scale.width - 290,
            y: 170,
            fontFamily: "monospace",
            fontSize: "19px",
            boxWidth: 500,
            boxHeight: 78,
            backgroundAlpha: 0.66,
            strokeWidth: 2,
            depth: 7600,
            ignoreOnce: true,
            flashSpeaker: false
          }
        );

        if (!scene.hasStartedAttackCycle) {
          scene.hasStartedAttackCycle = true;

          scene.time.delayedCall(1200, () => {
            if (scene.attackLoop) {
              scene.attackLoop.start();
            } else {
              scene.startBossAttackLoop();
            }
          });
        }
      });
    });
  }
}
