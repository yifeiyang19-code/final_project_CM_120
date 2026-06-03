export default class BossDeathSequence {
  constructor(scene) {
    this.scene = scene;
    this.sequenceFinished = false;
    this.timers = [];
    this.objects = [];
  }

  endBossFight() {
    const scene = this.scene;
    if (scene.gameOver) return;

    this.resetCinematicState();
    this.sequenceFinished = false;
    scene.forceResumeSceneClock?.();

    scene.gameOver = true;
    scene.controlsLocked = true;
    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.bossInvincible = true;

    scene.attackLoop?.cancel?.();
    if (!scene.attackLoop) scene.attackLoopToken++;
    scene.massEnergyTurretsSkill?.cleanupTurrets?.(true);
    scene.cleanupHostileObjects?.();
    scene.cleanupGravityFieldVisuals?.();
    scene.phase4ThunderstormSystem?.stop?.();

    if (scene.physics?.world) scene.physics.world.gravity.y = scene.defaultGravityY;
    scene.player?.setVelocity?.(0, 0);

    if (!scene.boss?.active) {
      this.showVictoryText();
      return;
    }

    scene.tweens?.killTweensOf?.(scene.boss);
    scene.boss.setVelocity?.(0, 0);
    if (scene.boss.body) scene.boss.body.allowGravity = false;
    scene.boss.clearTint?.();

    const targetX = Phaser.Math.Clamp(scene.map?.widthInPixels ? scene.map.widthInPixels / 2 : scene.boss.x, 220, (scene.map?.widthInPixels || 1600) - 220);
    const targetY = Phaser.Math.Clamp(scene.player ? scene.player.y - 220 : scene.boss.y - 120, 180, (scene.map?.heightInPixels || 1200) - 220);

    scene.cameras.main.stopFollow();
    scene.cameras.main.pan(targetX, targetY, 850, "Sine.easeInOut");
    scene.tweens.add({ targets: scene.cameras.main, zoom: Math.max(scene.phaseZoom || 1, 1.06), duration: 850, ease: "Sine.easeInOut" });

    scene.boss.setFlipX?.(targetX < scene.boss.x);
    if (scene.anims.exists("blue_fly_up_anim")) scene.boss.play("blue_fly_up_anim", true);
    scene.tweens.add({ targets: scene.boss, x: targetX, y: targetY, duration: 900, ease: "Sine.easeInOut" });

    this.later(950, () => this.startFinalProtocol());
    this.later(13800, () => this.forceFinishIfNeeded());
  }

  runBossDeathPulseSequence() {
    this.startFinalProtocol();
  }

  runSilentCollapseSequence() {
    this.startFinalProtocol();
  }

  startFinalProtocol() {
    const scene = this.scene;
    if (this.sequenceFinished) return;
    scene.forceResumeSceneClock?.();

    if (!scene.boss?.active) {
      this.playHeroLine();
      this.later(1800, () => this.showVictoryText());
      return;
    }

    scene.__bossFinalSelfDestructStarted = true;
    scene.boss.setVelocity?.(0, 0);
    if (scene.boss.body) scene.boss.body.allowGravity = false;
    if (scene.anims.exists("blue_idle_anim")) scene.boss.play("blue_idle_anim", true);

    scene.cameras.main.stopFollow();
    scene.cameras.main.pan(scene.boss.x, scene.boss.y - 40, 500, "Sine.easeInOut");
    scene.tweens.add({ targets: scene.cameras.main, zoom: Math.max(scene.phaseZoom || 1, 1.1), duration: 500, ease: "Sine.easeInOut" });

    scene.bossSpeak?.("Intruder cannot be purged. Final protocol initiated.", 2300, {
      allowDuringGameOver: true,
      ignoreOnce: true,
      anchorToSpeaker: true,
      fontSize: "32px",
      boxWidth: 980,
      boxHeight: 132,
      offsetY: -170,
      depth: 8500,
      strokeColor: 0xff3333,
      color: "#ffffff"
    });

    this.selfDestructCharge();
    this.finalStormBurst();
    this.later(2800, () => this.whiteTreesRise());
    this.later(6900, () => this.containExplosion());
    this.later(8500, () => this.playHeroLine());
    this.later(11000, () => this.finishDeathAnimation());
  }

  selfDestructCharge() {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    scene.audioCues?.play?.("bossDeathPulse3", { volume: 0.72, cooldownMs: 300 });
    scene.cameras.main.flash(180, 255, 80, 80);
    scene.cameras.main.shake(450, 0.018);

    const ring = this.track(scene.add.circle(boss.x, boss.y, 80, 0xff1f1f, 0.12)
      .setDepth(2100)
      .setStrokeStyle(8, 0xff3333, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD));
    const core = this.track(scene.add.circle(boss.x, boss.y, 34, 0xffffff, 0.55)
      .setDepth(2101)
      .setBlendMode(Phaser.BlendModes.ADD));

    scene.tweens.add({ targets: ring, radius: 700, alpha: 0.6, duration: 4800, ease: "Cubic.easeIn" });
    scene.tweens.add({ targets: core, radius: 170, alpha: 0.94, duration: 4800, ease: "Cubic.easeIn" });
    scene.tweens.add({ targets: boss, scaleX: 2.8, scaleY: 2.8, duration: 210, yoyo: true, repeat: 18, ease: "Sine.easeInOut" });

    for (let i = 0; i < 9; i++) {
      this.later(360 + i * 430, () => {
        if (!boss.active) return;
        boss.setTint(i % 2 === 0 ? 0xff3333 : 0xffffff);
        scene.cameras.main.shake(160, 0.011 + i * 0.002);
        scene.audioCues?.play?.("bossDeathPulse2", { volume: 0.35 + i * 0.04, cooldownMs: 110 });
      });
    }
  }

  finalStormBurst() {
    const scene = this.scene;
    scene.cameras.main.flash(100, 210, 238, 255);

    for (let i = 0; i < 18; i++) {
      this.later(120 + i * 360, () => this.skyLightning());
    }
    for (let i = 0; i < 10; i++) {
      this.later(420 + i * 570, () => this.battlefieldLightning());
    }
  }

  skyLightning() {
    const scene = this.scene;
    const cam = scene.cameras.main;
    const width = scene.scale.width || cam.width || 1280;
    const height = scene.scale.height || cam.height || 720;
    const x = Phaser.Math.Between(90, Math.max(120, width - 90));
    const y = Phaser.Math.Between(-20, 70);
    const length = Phaser.Math.Between(Math.floor(height * 0.32), Math.floor(height * 0.56));

    const g = this.track(scene.add.graphics().setScrollFactor(0).setDepth(9310).setBlendMode(Phaser.BlendModes.ADD));
    let px = x;
    let py = y;
    g.lineStyle(8, 0xffffff, 0.28);
    g.beginPath();
    g.moveTo(px, py);
    for (let i = 1; i <= 6; i++) {
      px += Phaser.Math.Between(-36, 36);
      py = y + (length / 6) * i;
      g.lineTo(px, py);
    }
    g.strokePath();
    g.lineStyle(3, 0xbdf7ff, 0.9);
    g.strokePath();
    scene.cameras.main.flash(70, 210, 238, 255);
    scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
  }

  battlefieldLightning() {
    const scene = this.scene;
    const boss = scene.boss;
    const view = scene.cameras.main.worldView;
    if (!boss?.active || !view) return;

    const x = boss.x + Phaser.Math.Between(-360, 360);
    const y = Phaser.Math.Clamp(boss.y + Phaser.Math.Between(110, 310), view.top + 180, view.bottom - 90);
    const marker = this.track(scene.add.ellipse(x, y, 170, 54, 0xbdf7ff, 0.12)
      .setDepth(7680)
      .setStrokeStyle(4, 0xffffff, 0.72)
      .setBlendMode(Phaser.BlendModes.ADD));
    scene.tweens.add({ targets: marker, scaleX: 1.35, scaleY: 1.45, alpha: 0.38, duration: 95, yoyo: true, repeat: 3 });

    this.later(360, () => {
      marker.destroy();
      const topY = Math.max(0, y - 760);
      let bolt;
      if (scene.textures.exists("phase_lightning_1")) {
        bolt = scene.add.sprite(x, (topY + y) * 0.5, "phase_lightning_1");
        bolt.setScale(2.3, Math.max(3.3, (y - topY) / 150));
        if (scene.anims.exists("phase_lightning_anim")) bolt.play("phase_lightning_anim");
      } else {
        bolt = scene.add.rectangle(x, (topY + y) * 0.5, 18, Math.max(360, y - topY), 0xffffff, 0.86);
      }
      this.track(bolt.setDepth(7690).setAlpha(0.95).setBlendMode(Phaser.BlendModes.ADD));
      const shock = this.track(scene.add.ellipse(x, y, 250, 84, 0xffffff, 0.34).setDepth(7688).setStrokeStyle(5, 0xbdf7ff, 0.82).setBlendMode(Phaser.BlendModes.ADD));
      scene.cameras.main.shake(140, 0.005);
      scene.tweens.add({ targets: shock, scaleX: 1.55, scaleY: 1.7, alpha: 0, duration: 300, onComplete: () => shock.destroy() });
      this.later(250, () => bolt.destroy());
    });
  }

  whiteTreesRise() {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    scene.__whiteTreeContainmentStarted = true;
    scene.audioCues?.play?.("treeCast", { volume: 0.86, cooldownMs: 200 });
    scene.cameras.main.flash(240, 220, 250, 255);
    scene.cameras.main.shake(600, 0.022);

    const groundY = Math.min(scene.map?.heightInPixels ? scene.map.heightInPixels - 180 : boss.y + 450, boss.y + 450);
    const offsets = [-330, 315, -270, 255, -205, 190, -145, 130, -84, 74, -34, 28];
    offsets.forEach((offset, index) => {
      this.later(index * 170, () => {
        const targetY = boss.y + Phaser.Math.Between(-80, 86);
        this.spawnTreeRoot(boss.x + offset, groundY, boss.x + offset * 0.22, targetY, index);
        this.spawnBindingVine(index, groundY, offset);
      });
    });

    this.later(1850, () => {
      this.wrapBoss();
      this.heroShield();
    });
  }

  spawnTreeRoot(baseX, baseY, targetX, targetY, index = 0) {
    const scene = this.scene;
    let tree;
    if (scene.textures.exists("blessing_tree")) {
      tree = scene.add.sprite(baseX, baseY + 130, "blessing_tree").setOrigin(0.5, 1).setScale(3.2).setTint(0xeaffff);
      if (scene.anims.exists("blessing_tree_grow")) tree.play("blessing_tree_grow");
    } else {
      tree = scene.add.rectangle(baseX, baseY + 130, 34, 240, 0xeaffff, 0.82).setOrigin(0.5, 1);
    }
    this.track(tree.setDepth(2150 + index).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD));

    const line = this.track(scene.add.graphics().setDepth(2148 + index).setBlendMode(Phaser.BlendModes.ADD));
    const side = baseX < targetX ? -1 : 1;
    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 980,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        const t = tween.getValue();
        const currentX = Phaser.Math.Interpolation.CubicBezier(t, baseX, baseX + side * 80, targetX - side * 70, targetX);
        const currentY = Phaser.Math.Interpolation.CubicBezier(t, baseY, baseY - 170, targetY + 160, targetY + 22);
        tree.setPosition(currentX, currentY + 128).setAlpha(0.2 + t * 0.78);
        line.clear();
        line.lineStyle(15, 0xdff8ff, 0.50);
        line.beginPath();
        line.moveTo(baseX, baseY);
        for (let step = 1; step <= 12; step++) {
          const q = t * (step / 12);
          const x = Phaser.Math.Interpolation.CubicBezier(q, baseX, baseX + side * 80, targetX - side * 70, targetX);
          const y = Phaser.Math.Interpolation.CubicBezier(q, baseY, baseY - 170, targetY + 160, targetY + 22);
          line.lineTo(x, y);
        }
        line.strokePath();
        line.lineStyle(4, 0xffffff, 0.88);
        line.strokePath();
      }
    });
  }

  spawnBindingVine(index, groundY, offset) {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    const fromLeft = index % 2 === 0;
    const startX = boss.x + offset;
    const startY = groundY;
    const endX = boss.x + (fromLeft ? 74 : -74);
    const endY = boss.y - 86 + index * 24;
    const controlX1 = boss.x + (fromLeft ? -260 : 260);
    const controlY1 = boss.y + 210;
    const controlX2 = boss.x + (fromLeft ? 205 : -205);
    const controlY2 = boss.y - 145 + index * 16;
    const vine = this.track(scene.add.graphics().setDepth(2190 + index).setBlendMode(Phaser.BlendModes.ADD));

    scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 1180,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => {
        const t = tween.getValue();
        vine.clear();
        vine.lineStyle(18, 0xdff8ff, 0.42);
        vine.beginPath();
        vine.moveTo(startX, startY);
        for (let step = 1; step <= 18; step++) {
          const q = t * (step / 18);
          const x = Phaser.Math.Interpolation.CubicBezier(q, startX, controlX1, controlX2, endX);
          const y = Phaser.Math.Interpolation.CubicBezier(q, startY, controlY1, controlY2, endY);
          vine.lineTo(x, y);
        }
        vine.strokePath();
        vine.lineStyle(5, 0xffffff, 0.82);
        vine.strokePath();
      },
      onComplete: () => {
        scene.audioCues?.play?.("treeGrow", { volume: 0.18, cooldownMs: 90 });
        if (boss.active) {
          boss.setTint(0xeaffff);
          scene.cameras.main.shake(90, 0.004);
        }
      }
    });
  }

  wrapBoss() {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    boss.setTint(0xeaffff);
    for (let i = 0; i < 10; i++) {
      this.later(i * 135, () => {
        if (!boss.active) return;
        const wrap = this.track(scene.add.ellipse(boss.x, boss.y + 6, 170 + i * 26, 66 + i * 20)
          .setDepth(2210 + i)
          .setStrokeStyle(9 - Math.min(i, 5), i % 2 === 0 ? 0xdff8ff : 0xffffff, 0)
          .setBlendMode(Phaser.BlendModes.ADD));
        wrap.rotation = (i % 2 === 0 ? -0.72 : 0.68) + i * 0.06;
        wrap.setScale(0.12);
        scene.tweens.add({
          targets: wrap,
          scaleX: 1,
          scaleY: 1,
          alpha: 0.96,
          duration: 620,
          ease: "Back.easeOut"
        });
        scene.audioCues?.play?.("treeGrow", { volume: 0.16, cooldownMs: 70 });
      });
    }
    scene.tweens.add({ targets: boss, angle: { from: -2, to: 2 }, duration: 120, yoyo: true, repeat: 16, ease: "Sine.easeInOut" });
  }

  heroShield() {
    const scene = this.scene;
    if (!scene.player?.active) return;
    const shield = this.track(scene.add.circle(scene.player.x, scene.player.y, 44, 0xdff8ff, 0.12)
      .setDepth(2200)
      .setStrokeStyle(5, 0xdff8ff, 0.86)
      .setBlendMode(Phaser.BlendModes.ADD));
    scene.tweens.add({ targets: shield, radius: 150, alpha: 0.55, duration: 860, yoyo: true, repeat: 4, ease: "Sine.easeInOut" });
  }

  containExplosion() {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    scene.audioCues?.play?.("bossDeathPulse4", { volume: 0.64, cooldownMs: 300 });
    scene.cameras.main.flash(360, 235, 255, 255);
    scene.cameras.main.shake(700, 0.03);
    this.createDeathPulse(0xdff8ff, 2);

    const containment = this.track(scene.add.circle(boss.x, boss.y, 260, 0xdff8ff, 0.14)
      .setDepth(2190)
      .setStrokeStyle(10, 0xffffff, 0.9)
      .setBlendMode(Phaser.BlendModes.ADD));
    scene.tweens.add({ targets: containment, radius: 80, alpha: 0.85, duration: 1180, ease: "Cubic.easeIn" });
  }

  playHeroLine() {
    const scene = this.scene;
    const width = Math.min(880, (scene.scale.width || 1280) - 96);
    const box = this.track(scene.add.rectangle((scene.scale.width || 1280) / 2, (scene.scale.height || 720) * 0.5, width, 150, 0x02070b, 0.82)
      .setScrollFactor(0)
      .setDepth(9400)
      .setAlpha(0)
      .setStrokeStyle(2, 0xdff8ff, 0.62));
    const text = this.track(scene.add.text((scene.scale.width || 1280) / 2, (scene.scale.height || 720) * 0.5, "HERO: NO ONE WAS.", {
      fontFamily: "'Cinzel', 'Marcellus SC', serif",
      fontSize: "38px",
      color: "#dff8ff",
      align: "center",
      stroke: "#000000",
      strokeThickness: 8,
      wordWrap: { width: width - 60 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9401).setAlpha(0));

    scene.audioCues?.play?.("treeCast", { volume: 0.18, cooldownMs: 180 });
    scene.tweens.add({ targets: [box, text], alpha: 1, duration: 320, ease: "Sine.easeOut" });
    this.later(2300, () => scene.tweens.add({ targets: [box, text], alpha: 0, duration: 520 }));
  }

  finishDeathAnimation() {
    const scene = this.scene;
    if (this.sequenceFinished) return;
    this.sequenceFinished = true;

    const boss = scene.boss;
    if (!boss?.active) {
      this.showVictoryText();
      return;
    }

    scene.tweens?.killTweensOf?.(boss);
    boss.setVelocity?.(0, 0);
    if (boss.body) boss.body.allowGravity = false;
    if (scene.anims.exists("blue_death_anim")) boss.play("blue_death_anim", true);

    scene.audioCues?.play?.("bossDeathFinal", { volume: 0.5, cooldownMs: 1400 });
    scene.cameras.main.flash(520, 255, 255, 255);
    scene.cameras.main.shake(760, 0.022);
    scene.tweens.add({ targets: boss, alpha: 0, scaleX: 1.75, scaleY: 1.75, duration: 1000, ease: "Cubic.easeIn" });

    this.later(1050, () => {
      boss.destroy?.();
      this.showVictoryText();
    });
  }

  forceFinishIfNeeded() {
    if (!this.sequenceFinished) {
      this.finishDeathAnimation();
    }
  }

  createDeathPulse(color, index = 0) {
    const scene = this.scene;
    const boss = scene.boss;
    if (!boss?.active) return;

    const ring = this.track(scene.add.circle(boss.x, boss.y, 60, color, 0.1)
      .setDepth(2000)
      .setStrokeStyle(7, color, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD));
    scene.tweens.add({ targets: ring, radius: 760 + index * 120, alpha: 0, duration: 900, ease: "Sine.easeOut", onComplete: () => ring.destroy() });

    const flash = this.track(scene.add.circle(boss.x, boss.y, 32, 0xffffff, 0.32)
      .setDepth(1999)
      .setBlendMode(Phaser.BlendModes.ADD));
    scene.tweens.add({ targets: flash, radius: 260 + index * 90, alpha: 0, duration: 560, ease: "Quad.easeOut", onComplete: () => flash.destroy() });
  }

  showVictoryText() {
    const scene = this.scene;
    this.sequenceFinished = true;
    scene.forceResumeSceneClock?.();
    scene.cameras.main.stopFollow();

    this.later(1200, () => this.resetCinematicState());

    if (scene.blackScreen) {
      scene.blackScreen.setDepth(9000);
      scene.tweens.add({ targets: scene.blackScreen, alpha: 0.72, duration: 650, ease: "Linear" });
    }

    if (scene.gameOverText) {
      scene.gameOverText.setText("SEAL BROKEN\nBITTER RAIN CONTINUES\n\nPRESS R / ENTER / F TO RESTART");
      scene.gameOverText.setColor("#dff8ff");
      scene.gameOverText.setStroke("#001018", 10);
      scene.tweens.add({ targets: scene.gameOverText, alpha: 1, duration: 700, ease: "Linear" });
    }

    scene.keyR = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    scene.keyEnterRetry = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    scene.keyFRetry = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  }

  failTrial() {
    const scene = this.scene;
    if (scene.__failureSequenceStarted) return;
    scene.__failureSequenceStarted = true;

    this.resetCinematicState();
    scene.gameOver = true;
    scene.controlsLocked = true;
    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.attackLoop?.cancel?.();
    if (!scene.attackLoop) scene.attackLoopToken++;
    scene.massEnergyTurretsSkill?.cleanupTurrets?.(true);
    scene.cleanupHostileObjects?.();
    scene.cleanupGravityFieldVisuals?.();
    if (scene.physics?.world) scene.physics.world.gravity.y = scene.defaultGravityY;

    scene.player?.setVelocity?.(0, 0);
    scene.player?.setTint?.(0xff3333);
    scene.cameras.main.stopFollow();
    scene.cameras.main.shake(700, 0.03);

    scene.bossSpeak?.("Exclusion enforced. The sealed zone remains closed.", 3000, {
      allowDuringGameOver: true,
      ignoreOnce: true,
      anchorToSpeaker: true,
      fontSize: "30px",
      boxWidth: 900,
      boxHeight: 126,
      offsetY: -150,
      depth: 7600,
      strokeColor: 0xff3333,
      color: "#ffe8e8"
    });

    this.later(1000, () => {
      if (scene.blackScreen) {
        scene.blackScreen.setDepth(9000);
        scene.tweens.add({ targets: scene.blackScreen, alpha: 0.78, duration: 700, ease: "Linear" });
      }
      if (scene.gameOverText) {
        const survived = scene.getSurvivedSeconds?.() ?? 0;
        const integrity = Math.max(0, Math.ceil((scene.bossIntegrity / scene.bossMaxIntegrity) * 100));
        scene.gameOverText.setText(`EXCLUSION ENFORCED\nSurvived: ${survived}s · Guardian integrity: ${integrity}%\nTrees blocked: ${scene.treeBlocksThisRun || 0}\n\nPRESS R / ENTER / F TO RESTART`);
        scene.gameOverText.setColor("#ffe8e8");
        scene.gameOverText.setStroke("#140000", 10);
        scene.tweens.add({ targets: scene.gameOverText, alpha: 1, duration: 700, ease: "Linear" });
      }
      scene.keyR = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      scene.keyEnterRetry = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      scene.keyFRetry = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    });
  }

  later(delay, callback) {
    const timer = this.scene.time.delayedCall(delay, () => {
      this.timers = this.timers.filter((item) => item !== timer);
      callback?.();
    });
    this.timers.push(timer);
    return timer;
  }

  track(obj) {
    if (!obj) return obj;
    this.objects.push(obj);
    obj.once?.(Phaser.GameObjects.Events.DESTROY, () => {
      this.objects = this.objects.filter((item) => item !== obj);
    });
    return obj;
  }

  resetCinematicState() {
    for (const timer of this.timers) timer?.remove?.(false);
    this.timers = [];
    for (const obj of this.objects) {
      this.scene.tweens?.killTweensOf?.(obj);
      obj?.destroy?.();
    }
    this.objects = [];
  }
}
