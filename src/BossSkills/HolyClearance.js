export default class HolyClearance {
  constructor(scene) {
    this.scene = scene;
    this.activeBullets = new Set();
    this.blockCorridorWidth = 260;
    this.treeImmediateRadius = 260;
  }

  cast() {
    const scene = this.scene;
    if (!scene.boss?.active || scene.gameOver || scene.isPhaseTransitioning) return;

    scene.setBossCasting?.(true) ?? (scene.isBossCasting = true);
    scene.boss.setVelocity(0, 0);
    scene.boss.setFlipX(scene.player.x < scene.boss.x);

    if (scene.anims.exists("boss_attack_anim")) scene.boss.play("boss_attack_anim", true);

    const phase = scene.bossPhase || 1;
    const volleyCount = Math.min(4, phase >= 4 ? 4 : phase >= 3 ? 3 : phase >= 2 ? 2 : 1);
    const delayBetween = phase >= 4 ? 760 : phase >= 3 ? 840 : phase >= 2 ? 920 : 1020;


    for (let i = 0; i < volleyCount; i++) {
      scene.time.delayedCall(i * delayBetween, () => {
        if (!scene.boss?.active || scene.gameOver || scene.isPhaseTransitioning) return;
        const count = phase >= 4 ? 4 : phase >= 3 ? 3 : phase >= 2 ? 2 : 1;
        this.fireVolley(Math.min(4, count), i, volleyCount);
      });
    }

    scene.time.delayedCall(volleyCount * delayBetween + 360, () => {
      if (scene.gameOver || scene.isPhaseTransitioning) return;
      scene.setBossCasting?.(false) ?? (scene.isBossCasting = false);
      if (scene.boss?.active && scene.anims.exists("blue_idle_anim")) scene.boss.play("blue_idle_anim", true);
    });
  }

  fireVolley(count = 1, volleyIndex = 0, volleyTotal = 1) {
    const scene = this.scene;
    if (!scene.boss?.active || !scene.player?.active || scene.gameOver || scene.isPhaseTransitioning) return;

    scene.audioCues?.play?.("bulletVolley", { volume: 0.32, cooldownMs: 140 });
    scene.playBossEnergyEffect?.(scene.bossPhase >= 3 ? 0xff4444 : 0x7df9ff, scene.bossPhase >= 2 ? 1.45 : 1.25, 70);

    const startX = scene.boss.x;
    const startY = scene.boss.y - 22;
    const player = scene.player;
    const body = player.body;
    const phase = scene.bossPhase || 1;
    const speed = phase >= 4 ? 270 : phase >= 3 ? 258 : phase >= 2 ? 246 : 235;
    const leadTime = phase >= 4 ? 0.10 : phase >= 3 ? 0.08 : phase >= 2 ? 0.05 : 0.02;
    const leadX = Phaser.Math.Clamp((body?.velocity?.x || 0) * leadTime, -64, 64);
    const leadY = Phaser.Math.Clamp((body?.velocity?.y || 0) * leadTime, -52, 52);
    const targetX = player.x + leadX + (volleyIndex - (volleyTotal - 1) / 2) * (phase >= 3 ? 10 : 6);
    const targetY = player.y - 20 + leadY * 0.3;
    const baseAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
    const spread = Phaser.Math.DegToRad(phase >= 3 ? 4.0 : 3.5);
    const bulletKey = scene.bossBulletKeys?.[0] || Phaser.Utils.Array.GetRandom(scene.bossBulletKeys || ["blue_bullet_1"]);

    count = Math.min(4, Math.max(1, count));
    for (let i = 0; i < count; i++) {
      const offsetIndex = i - (count - 1) / 2;
      const angle = baseAngle + offsetIndex * spread;
      this.spawnBullet(startX, startY, angle, speed, bulletKey);
    }
  }

  spawnBullet(startX, startY, angle, speed, bulletKey) {
    const scene = this.scene;
    const bullet = scene.physics.add.sprite(startX, startY, bulletKey);
    scene.trackHostileObject?.(bullet);
    this.activeBullets.add(bullet);

    bullet.setScale(0.76);
    bullet.setDepth(50);
    bullet.rotation = angle;
    bullet.body.allowGravity = false;
    bullet.__holyClearance = true;
    bullet.__spawnX = startX;
    bullet.__spawnY = startY;
    bullet.__lastX = startX;
    bullet.__lastY = startY;

    if (bullet.body) {
      const radius = 3;
      const size = radius * 2;
      bullet.body.setSize(size, size, true);
      bullet.body.setCircle?.(radius, (bullet.width - size) * 0.5, (bullet.height - size) * 0.5);
    }

    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    const updateCheck = () => {
      if (!bullet.active || bullet.__treeBlocked || scene.gameOver) {
        cleanup();
        return;
      }
      if (this.blockBulletWithTrees(bullet, false)) {
        cleanup();
        return;
      }
      bullet.__lastX = bullet.x;
      bullet.__lastY = bullet.y;
    };

    const cleanup = () => {
      this.activeBullets.delete(bullet);
      scene.events?.off?.(Phaser.Scenes.Events.UPDATE, updateCheck);
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, updateCheck);
    bullet.once?.(Phaser.GameObjects.Events.DESTROY, cleanup);

    scene.physics.add.overlap(bullet, scene.player, () => {
      if (!bullet.active || bullet.__treeBlocked || scene.gameOver) return;
      if (this.blockBulletWithTrees(bullet, true)) return;
      bullet.destroy();
      scene.damagePlayer?.(1);
    });

    scene.time.delayedCall(9000, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  blockBulletWithTrees(bullet, beforePlayerHit = false) {
    const tree = this.findBlockingTree(bullet, beforePlayerHit);
    if (!tree) return false;

    bullet.__treeBlocked = true;
    this.scene.treeBlocksThisRun = (this.scene.treeBlocksThisRun || 0) + 1;
    this.scene.damageTreeFromHostile?.(tree, 1);
    if (bullet.active) bullet.destroy();
    return true;
  }

  findBlockingTree(bullet, beforePlayerHit = false) {
    const scene = this.scene;
    const trees = scene.playerTrees?.getChildren?.() || [];
    if (!bullet?.active || !trees.length) return null;

    const player = scene.player;
    const boss = scene.boss;
    const bx = bullet.x;
    const by = bullet.y;
    const lx = Number.isFinite(bullet.__lastX) ? bullet.__lastX : bx;
    const ly = Number.isFinite(bullet.__lastY) ? bullet.__lastY : by;
    const sx = Number.isFinite(bullet.__spawnX) ? bullet.__spawnX : (boss?.x ?? lx);
    const sy = Number.isFinite(bullet.__spawnY) ? bullet.__spawnY : ((boss?.y ?? ly) - 22);
    const px = player?.active ? player.x : bx;
    const py = player?.active ? player.y - 18 : by;

    const bulletStep = new Phaser.Geom.Line(lx, ly, bx, by);
    const bulletToPlayer = new Phaser.Geom.Line(bx, by, px, py);
    const bossToPlayer = new Phaser.Geom.Line(sx, sy, px, py);
    const spawnToNow = new Phaser.Geom.Line(sx, sy, bx, by);
    const bulletBounds = bullet.getBounds?.();

    let best = null;
    let bestDistance = Infinity;

    for (const tree of trees) {
      if (!tree?.active || !tree.blessingTree) continue;
      const bounds = this.getTreeBounds(tree, beforePlayerHit ? 260 : 220, beforePlayerHit ? 290 : 250);
      if (!bounds) continue;

      const direct = bulletBounds && Phaser.Geom.Intersects.RectangleToRectangle(bulletBounds, bounds);
      const step = Phaser.Geom.Intersects.LineToRectangle(bulletStep, bounds);
      const sinceSpawn = Phaser.Geom.Intersects.LineToRectangle(spawnToNow, bounds);
      const future = Phaser.Geom.Intersects.LineToRectangle(bulletToPlayer, bounds);
      const shield = Phaser.Geom.Intersects.LineToRectangle(bossToPlayer, bounds);
      const nearBullet = this.distancePointToRect(bx, by, bounds) <= this.treeImmediateRadius;

      if (!direct && !step && !sinceSpawn && !future && !shield && !nearBullet) continue;

      const distance = Phaser.Math.Distance.Between(sx, sy, tree.x, tree.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = tree;
      }
    }

    return best;
  }

  getTreeBounds(tree, inflateX = 220, inflateY = 250) {
    let bounds = this.scene.getTreeBlockBounds?.(tree, inflateX, inflateY) || tree.getBounds?.();
    if (!bounds) return null;
    if (!(bounds instanceof Phaser.Geom.Rectangle)) {
      bounds = new Phaser.Geom.Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    return bounds;
  }

  distancePointToRect(x, y, rect) {
    const cx = Phaser.Math.Clamp(x, rect.left, rect.right);
    const cy = Phaser.Math.Clamp(y, rect.top, rect.bottom);
    return Phaser.Math.Distance.Between(x, y, cx, cy);
  }

  clearBulletsBlockedByTree(tree) {
    if (!tree?.active) return;
    const bounds = this.getTreeBounds(tree, 280, 310);
    if (!bounds) return;

    const bullets = [
      ...Array.from(this.activeBullets || []),
      ...(this.scene.activeHostileObjects || []).filter((obj) => obj?.active && obj.__holyClearance)
    ];

    for (const bullet of bullets) {
      if (!bullet?.active || bullet.__treeBlocked) continue;
      const player = this.scene.player;
      const line = new Phaser.Geom.Line(bullet.x, bullet.y, player?.x ?? bullet.x, (player?.y ?? bullet.y) - 18);
      const direct = bullet.getBounds?.() && Phaser.Geom.Intersects.RectangleToRectangle(bullet.getBounds(), bounds);
      const future = Phaser.Geom.Intersects.LineToRectangle(line, bounds);
      const near = this.distancePointToRect(bullet.x, bullet.y, bounds) <= this.treeImmediateRadius;
      if (direct || future || near) this.blockBulletWithTrees(bullet, true);
    }
  }
}
