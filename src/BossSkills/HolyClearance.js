export default class HolyClearance {
  constructor(scene) {
    this.scene = scene;
  }

  cast() {
    const scene = this.scene;

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    scene.bossSpeakRandom("holyClearance", 2200);

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.setFlipX(scene.player.x < scene.boss.x);

    const playerBody = scene.player?.body;
    const playerFast = Math.abs(playerBody?.velocity?.x || 0) > 240 || Math.abs(playerBody?.velocity?.y || 0) > 320;
    const playerAirborne = !playerBody?.blocked?.down && !playerBody?.touching?.down;
    const volleyCount = scene.bossPhase >= 4
      ? playerFast || playerAirborne ? 7 : 6
      : scene.bossPhase >= 3
        ? playerFast || playerAirborne ? 4 : 3
        : scene.bossPhase >= 2
          ? playerFast || playerAirborne ? 3 : 2
          : 1;
    const delayBetween = scene.bossPhase >= 4 ? 260 : scene.bossPhase >= 3 ? 380 : scene.bossPhase >= 2 ? 470 : 620;

    if (scene.anims.exists("boss_attack_anim")) {
      scene.boss.play("boss_attack_anim", true);
    }

    this.showClearanceWarning(playerFast, playerAirborne);
    scene.audioCues?.play?.("uiWarning", { volume: 0.32, cooldownMs: 300 });

    for (let i = 0; i < volleyCount; i++) {
      scene.time.delayedCall(i * delayBetween, () => {
        if (
          !scene.boss ||
          !scene.boss.active ||
          scene.gameOver ||
          scene.isPhaseTransitioning
        ) {
          return;
        }

        const spreadCount = this.getVolleySpreadCount(i, playerFast, playerAirborne);
        this.fireVolley(spreadCount, i, volleyCount);
      });
    }

    scene.time.delayedCall(volleyCount * delayBetween + 420, () => {
      if (scene.gameOver || scene.isPhaseTransitioning) return;

      scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);

      if (scene.boss && scene.boss.active) {
        scene.boss.play("blue_idle_anim", true);
      }
    });
  }

  getVolleySpreadCount(index, playerFast, playerAirborne) {
    const scene = this.scene;

    if (scene.bossPhase >= 4) {
      if (playerFast || playerAirborne) return index % 2 === 0 ? 4 : 3;
      return index % 2 === 0 ? 3 : 2;
    }

    if (scene.bossPhase >= 3) {
      if (playerFast || playerAirborne) return index % 2 === 0 ? 3 : 2;
      return index % 2 === 0 ? 2 : 1;
    }

    if (scene.bossPhase >= 2) {
      if (playerFast || playerAirborne) return index % 2 === 0 ? 2 : 1;
      return 1;
    }

    return 1;
  }

  showClearanceWarning(playerFast = false, playerAirborne = false) {
    const scene = this.scene;
    const detail = playerAirborne
      ? "Airborne path suppression active."
      : playerFast
        ? "High-mobility suppression active."
        : scene.bossPhase >= 3
          ? "Suppression volleys intensifying."
          : "Suppressive volley incoming.";

  }

  fireVolley(count = 1, volleyIndex = 0, volleyTotal = 1) {
    const scene = this.scene;

    scene.audioCues?.play?.("bulletVolley", { volume: 0.35, cooldownMs: 150 });

    if (
      !scene.boss ||
      !scene.boss.active ||
      scene.gameOver ||
      scene.isPhaseTransitioning
    ) {
      return;
    }

    const startX = scene.boss.x;
    const startY = scene.boss.y - 20;
    const player = scene.player;
    const body = player?.body;
    const speed = scene.bossPhase >= 4 ? 610 : scene.bossPhase >= 3 ? 510 : scene.bossPhase >= 2 ? 430 : 360;
    const leadTime = scene.bossPhase >= 4 ? 0.56 : scene.bossPhase >= 3 ? 0.40 : scene.bossPhase >= 2 ? 0.30 : 0.14;
    const leadX = Phaser.Math.Clamp((body?.velocity?.x || 0) * leadTime, -190, 190);
    const leadY = Phaser.Math.Clamp((body?.velocity?.y || 0) * leadTime, -160, 160);
    const alternatingOffset = (volleyIndex - (volleyTotal - 1) / 2) * (scene.bossPhase >= 3 ? 18 : 10);
    const targetX = player.x + leadX + alternatingOffset;
    const targetY = player.y - 20 + leadY * 0.45;

    const baseAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const bulletKey = Phaser.Utils.Array.GetRandom(scene.bossBulletKeys);
    const spread = Phaser.Math.DegToRad(scene.bossPhase >= 3 ? 12 : scene.bossPhase >= 2 ? 9 : 10);

    scene.playBossEnergyEffect(
      scene.bossPhase >= 3 ? 0xff3333 : 0x7df9ff,
      scene.bossPhase >= 2 ? 1.55 : 1.35,
      75
    );

    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2;
      const microCorrection = Math.sin((volleyIndex + 1) * 1.7 + i) * Phaser.Math.DegToRad(scene.bossPhase >= 3 ? 4 : 2);
      const angle = baseAngle + offsetIndex * spread + microCorrection;

      const bullet = scene.physics.add.sprite(startX, startY, bulletKey);
      scene.trackHostileObject?.(bullet);

      bullet.setScale(scene.bossPhase >= 3 ? 1.08 : scene.bossPhase >= 2 ? 0.98 : 0.9);
      bullet.setDepth(50);
      bullet.body.allowGravity = false;
      bullet.rotation = angle;
      bullet.__lastX = startX;
      bullet.__lastY = startY;

      if (bullet.body) {
        const radius = scene.bossPhase >= 3 ? 5 : 4;
        const size = radius * 2;
        bullet.body.setSize(size, size, true);
        if (bullet.body.setCircle) {
          bullet.body.setCircle(radius, (bullet.width - size) * 0.5, (bullet.height - size) * 0.5);
        }
      }

      bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      bullet.__treeBlockInflateX = scene.bossPhase >= 3 ? 40 : 32;
      bullet.__treeBlockInflateY = scene.bossPhase >= 3 ? 40 : 32;

      scene.registerProjectileVsTrees?.(bullet, 1, true);

      scene.physics.add.overlap(bullet, scene.player, () => {
        if (!bullet || !bullet.active || scene.gameOver) return;

        bullet.destroy();
        scene.damagePlayer(1);
      });

      scene.time.delayedCall(9000, () => {
        if (bullet && bullet.active) {
          bullet.destroy();
        }
      });
    }
  }
}
