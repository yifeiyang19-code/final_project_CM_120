export default class BlessingTreeAbility {
  constructor(scene, player, config) {
    this.scene = scene;
    this.player = player;
    this.config = config;

    this.pointerStart = null;
    this.activeTrees = [];

    this.treeBodyWidth = 58;
    this.treeBodyHeight = 112;

    this.maxCharges = this.config.blessingTreeMaxCharges ?? 2;
    this.charges = this.maxCharges;
    this.nextChargeReadyTime = 0;

    this.uiRoot = null;
    this.uiIcon = null;
    this.uiLabel = null;
    this.uiCooldownText = null;
    this.uiCooldownMask = null;

    this.uiBackSize = 66;
    this.uiInnerSize = 58;
    this.uiIconSize = 48;
    this.uiMaskSize = 58;

    this.createTreeGroup();
    this.createSkillUi();
    this.boundPointerDown = null;
    this.boundPointerUp = null;
    this.bindPointerInput();
    this.registerCleanup();

    scene.damagePlayerTree = (tree, amount = 1) => {
      this.damageTree(tree, amount);
    };
  }

  createTreeGroup() {
    const scene = this.scene;

    if (!scene.playerTrees) {
      scene.playerTrees = scene.physics.add.staticGroup();
    }
  }

  createSkillUi() {
    const scene = this.scene;

    this.uiRoot = scene.add.container(0, 0);
    this.uiRoot.setDepth(6200);
    this.uiRoot.setVisible(false);

    const back = scene.add.rectangle(
      0,
      0,
      this.uiBackSize,
      this.uiBackSize,
      0x08120a,
      0.82
    );
    back.setStrokeStyle(4, 0x7cff7c, 0.9);

    const inner = scene.add.rectangle(
      0,
      0,
      this.uiInnerSize,
      this.uiInnerSize,
      0x14331a,
      0.72
    );
    inner.setStrokeStyle(2, 0xbaffba, 0.55);

    this.uiIcon = scene.add.image(0, 0, "blessing_tree_icon");
    this.uiIcon.setDisplaySize(this.uiIconSize, this.uiIconSize);
    this.uiIcon.setAlpha(0.95);

    this.uiCooldownMask = scene.add.rectangle(
      0,
      0,
      this.uiMaskSize,
      this.uiMaskSize,
      0x000000,
      0.58
    );
    this.uiCooldownMask.setVisible(false);

    this.uiLabel = scene.add.text(0, 62, "2/2", {
      fontSize: "16px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#d8ffd8",
      stroke: "#001500",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.uiCooldownText = scene.add.text(0, 0, "", {
      fontSize: "20px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#001500",
      strokeThickness: 6
    }).setOrigin(0.5);

    const nameText = scene.add.text(-62, -36, "FLEETING\nLIFELIHOOD", {
      fontSize: "12px",
      fontFamily: "monospace",
      fontStyle: "bold",
      color: "#baffba",
      stroke: "#001500",
      strokeThickness: 4,
      align: "right"
    }).setOrigin(1, 0.5);

    this.uiRoot.add([
      back,
      inner,
      this.uiIcon,
      this.uiCooldownMask,
      this.uiCooldownText,
      this.uiLabel,
      nameText
    ]);

    this.updateSkillUi();
  }

  bindPointerInput() {
    const scene = this.scene;

    this.boundPointerDown = (pointer) => {
      if (scene.controlsLocked || scene.gameOver) return;
      if (!pointer.leftButtonDown()) return;

      const worldPoint = pointer.positionToCamera(scene.cameras.main);

      this.pointerStart = {
        x: worldPoint.x,
        y: worldPoint.y,
        time: scene.time.now
      };
    };

    this.boundPointerUp = (pointer) => {
      if (scene.controlsLocked || scene.gameOver) return;
      if (!this.pointerStart) return;

      const worldPoint = pointer.positionToCamera(scene.cameras.main);

      const start = this.pointerStart;
      this.pointerStart = null;

      const dx = worldPoint.x - start.x;
      const dy = worldPoint.y - start.y;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absY < this.config.blessingSwipeMinDistance) {
        return;
      }

      if (absY < absX * 1.2) {
        return;
      }

      if (dy < 0) {
        this.tryCreateTree(start.x, start.y, "up");
      } else {
        this.tryCreateTree(start.x, start.y, "down");
      }
    };

    scene.input.on("pointerdown", this.boundPointerDown);
    scene.input.on("pointerup", this.boundPointerUp);
  }

  registerCleanup() {
    const cleanup = () => this.destroy();
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  }

  destroy() {
    const scene = this.scene;
    if (scene?.input) {
      if (this.boundPointerDown) scene.input.off("pointerdown", this.boundPointerDown);
      if (this.boundPointerUp) scene.input.off("pointerup", this.boundPointerUp);
    }

    if (scene?.damagePlayerTree) scene.damagePlayerTree = null;
    this.uiRoot?.destroy?.(true);
    this.uiRoot = null;

    for (const tree of this.activeTrees || []) {
      if (tree?.hpBarBack?.active) tree.hpBarBack.destroy();
      if (tree?.hpBarFill?.active) tree.hpBarFill.destroy();
    }

    this.boundPointerDown = null;
    this.boundPointerUp = null;
    this.pointerStart = null;
  }

  update() {
    this.updateCharges();
    this.updateSkillUi();
    this.updateTreeHpBars();
  }

  updateCharges() {
    const scene = this.scene;
    const now = scene.time.now;

    if (this.charges >= this.maxCharges) {
      this.charges = this.maxCharges;
      this.nextChargeReadyTime = 0;
      return;
    }

    if (this.nextChargeReadyTime <= 0) {
      this.nextChargeReadyTime = now + this.config.blessingTreeCooldown;
      return;
    }

    while (
      this.charges < this.maxCharges &&
      this.nextChargeReadyTime > 0 &&
      now >= this.nextChargeReadyTime
    ) {
      this.charges++;

      if (this.charges < this.maxCharges) {
        this.nextChargeReadyTime += this.config.blessingTreeCooldown;
      } else {
        this.nextChargeReadyTime = 0;
      }
    }
  }

  updateSkillUi() {
    if (!this.uiRoot || !this.uiRoot.active) return;

    if (this.scene.controlsLocked || this.scene.gameOver) {
      this.uiRoot.setVisible(false);
      return;
    }

    this.uiRoot.setVisible(true);
    this.layoutSkillUi();

    const scene = this.scene;
    const now = scene.time.now;

    this.uiLabel.setText(`${this.charges}/${this.maxCharges}`);

    const hasCharge = this.charges > 0;
    this.uiIcon.setAlpha(hasCharge ? 1 : 0.42);

    if (this.charges >= this.maxCharges) {
      this.uiCooldownMask.setVisible(false);
      this.uiCooldownText.setText("");
      return;
    }

    const remainingMs = Math.max(0, this.nextChargeReadyTime - now);
    const remainingSec = Math.ceil(remainingMs / 1000);

    this.uiCooldownMask.setVisible(true);
    this.uiCooldownText.setText(`${remainingSec}`);

    const progress = Phaser.Math.Clamp(
      1 - remainingMs / this.config.blessingTreeCooldown,
      0,
      1
    );

    this.uiCooldownMask.height = this.uiMaskSize * (1 - progress);
    this.uiCooldownMask.y =
      -this.uiMaskSize / 2 + this.uiCooldownMask.height / 2;
  }

  layoutSkillUi() {
    if (!this.uiRoot || !this.uiRoot.active) return;

    const scene = this.scene;
    const cam = scene.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom || 1;

    const offsetX = this.config.blessingTreeUiX ?? 70;
    const screenY = this.config.blessingTreeUiY ?? 70;
    const screenX = this.config.blessingTreeUiAnchorX === "right"
      ? scene.scale.width - offsetX
      : offsetX;

    this.uiRoot.setPosition(
      view.left + screenX / zoom,
      view.top + screenY / zoom
    );

    this.uiRoot.setScale(1 / zoom);
  }

  tryCreateTree(worldX, worldY, direction) {
    const scene = this.scene;

    this.updateCharges();

    if (this.charges <= 0) {
      this.showFailedCast(worldX, worldY);
      scene.audioCues?.play?.("abilityFail");
      this.flashSkillUi(false);
      return false;
    }

    this.cleanupInactiveTrees();

    if (this.activeTrees.length >= this.config.blessingTreeMaxActive) {
      const oldestTree = this.activeTrees.shift();

      if (oldestTree && oldestTree.active) {
        this.destroyTree(oldestTree, false);
      }
    }

    const placement = this.findValidPlacement(worldX, worldY, direction);

    if (!placement) {
      this.showFailedCast(worldX, worldY);
      scene.audioCues?.play?.("abilityFail");
      this.flashSkillUi(false);
      return false;
    }

    this.charges--;

    if (this.charges < this.maxCharges && this.nextChargeReadyTime <= 0) {
      this.nextChargeReadyTime = scene.time.now + this.config.blessingTreeCooldown;
    }

    this.spawnTree(placement.x, placement.y, direction);
    this.flashSkillUi(true);
    this.updateSkillUi();

    return true;
  }

  findValidPlacement(worldX, worldY, direction) {
    const scene = this.scene;

    const acceptSurface = (surface) => {
      if (!surface) return null;

      const tileX = Math.floor(surface.x / scene.map.tileWidth);
      const tileY = Math.floor(surface.y / scene.map.tileHeight);

      if (this.isTreeAlreadyNearTile(tileX, tileY)) {
        return null;
      }

      return surface;
    };

    
    
    
    
    
    if (scene.findNearestSolidSurfaceForTree) {
      const surface = acceptSurface(
        scene.findNearestSolidSurfaceForTree(worldX, worldY, direction)
      );

      if (surface) {
        return surface;
      }
    }

    const layer = scene.groundLayer;

    if (!layer) return null;

    const baseTileX = layer.worldToTileX(worldX);
    const baseTileY = layer.worldToTileY(worldY);
    const slideTiles = this.config.blessingTreeVerticalSlideTiles ?? 10;

    const candidateOffsets = [0];
    for (let i = 1; i <= slideTiles; i++) {
      candidateOffsets.push(-i, i);
    }

    for (const offset of candidateOffsets) {
      const tileX = baseTileX;
      const tileY = baseTileY + offset;

      if (this.isTreeAlreadyNearTile(tileX, tileY)) {
        continue;
      }

      const hereSolid = this.isSolidAtTile(tileX, tileY);
      if (hereSolid) {
        continue;
      }

      if (direction === "up") {
        const belowSolid = this.isSolidAtTile(tileX, tileY + 1);
        if (!belowSolid) continue;

        const worldPoint = layer.tileToWorldXY(tileX, tileY);
        return {
          x: worldPoint.x + scene.map.tileWidth / 2,
          y: worldPoint.y + scene.map.tileHeight
        };
      }

      if (direction === "down") {
        const aboveSolid = this.isSolidAtTile(tileX, tileY - 1);
        if (!aboveSolid) continue;

        const worldPoint = layer.tileToWorldXY(tileX, tileY);
        return {
          x: worldPoint.x + scene.map.tileWidth / 2,
          y: worldPoint.y
        };
      }
    }

    return null;
  }

  isTreeAlreadyNearTile(tileX, tileY) {
    const scene = this.scene;
    const worldX = tileX * scene.map.tileWidth + scene.map.tileWidth / 2;
    const worldY = tileY * scene.map.tileHeight + scene.map.tileHeight / 2;

    for (const tree of this.activeTrees) {
      if (!tree || !tree.active) continue;

      const distance = Phaser.Math.Distance.Between(
        worldX,
        worldY,
        tree.x,
        tree.y
      );

      if (distance < 48) {
        return true;
      }
    }

    return false;
  }

  isSolidAtTile(tileX, tileY) {
    const scene = this.scene;

    const worldX = tileX * scene.map.tileWidth + scene.map.tileWidth * 0.5;
    const worldY = tileY * scene.map.tileHeight + scene.map.tileHeight * 0.5;

    if (scene.isSolidAtWorld && scene.isSolidAtWorld(worldX, worldY)) {
      return true;
    }

    const layers = [
      scene.groundLayer,
      scene.destructibleLayer,
      scene.creatableLayer
    ];

    for (const layer of layers) {
      if (!layer || !layer.getTileAt) continue;

      const tile = layer.getTileAt(tileX, tileY, true);

      if (tile && tile.index !== -1 && tile.collides) {
        return true;
      }
    }

    return false;
  }

  spawnTree(x, y, direction) {
    const scene = this.scene;
    const scale = this.config.blessingTreeScale ?? 1;

    scene.audioCues?.play?.("treeCast");

    const tree = scene.playerTrees.create(x, y, "blessing_tree");

    tree.setScale(scale);
    tree.setDepth(28);

    tree.blessingTree = true;
    tree.treeHp = this.config.blessingTreeMaxHp;
    tree.treeMaxHp = this.config.blessingTreeMaxHp;
    tree.treeDirection = direction;
    this.createTreeHpBar(tree);
    this.createTreeLifePips(tree);

    if (direction === "up") {
      tree.setOrigin(0.5, 1);
      tree.setFlipY(false);
    } else {
      tree.setOrigin(0.5, 0);
      tree.setFlipY(true);
    }

    if (scene.anims.exists("blessing_tree_grow")) {
      tree.play("blessing_tree_grow");
    } else {
      tree.setFrame(4);
    }

    tree.refreshBody();

    this.configureTreeBody(tree, direction, scale);

    this.activeTrees.push(tree);

    scene.playerController?.registerTreeSummon?.();
    scene.bossSpeakRandom?.("playerBlessingTree", 2200, { anchorToSpeaker: true, fontSize: "25px", boxWidth: 820, boxHeight: 106, offsetY: -150 });

    scene.playerParticleJuice?.emitTreeBirth?.(x, y, direction, scale);
    this.playCreateEffect(x, y, direction);
    this.playWitherFlicker(tree);
    scene.time.delayedCall(130, () => scene.audioCues?.play?.("treeGrow", { volume: 0.34 }));

    scene.time.delayedCall(this.config.blessingTreeDuration, () => {
      if (tree && tree.active) {
        this.destroyTree(tree, true);
      }
    });

    return tree;
  }

  createTreeHpBar(tree) {
    const scene = this.scene;
    const scale = this.config.blessingTreeScale ?? 1;
    const width = 54 * scale;
    const height = 6 * scale;

    tree.hpBarBack = scene.add.rectangle(tree.x, tree.y, width, height, 0x001500, 0.70)
      .setOrigin(0.5)
      .setDepth(31)
      .setStrokeStyle(1.5 * scale, 0xbaffba, 0.55);

    tree.hpBarFill = scene.add.rectangle(tree.x, tree.y, width, height, 0x7cff7c, 0.92)
      .setOrigin(0.5)
      .setDepth(32);
  }

  updateTreeHpBars() {
    this.cleanupInactiveTrees();

    for (const tree of this.activeTrees) {
      if (!tree || !tree.active) continue;

      const scale = this.config.blessingTreeScale ?? 1;
      const width = 54 * scale;
      const offsetY = tree.treeDirection === "up" ? -118 * scale : 118 * scale;
      const ratio = Phaser.Math.Clamp((tree.treeHp ?? 0) / Math.max(1, tree.treeMaxHp ?? 1), 0, 1);

      if (tree.hpBarBack?.active) {
        tree.hpBarBack.setPosition(tree.x, tree.y + offsetY);
        tree.hpBarBack.setVisible(true);
      }

      if (tree.hpBarFill?.active) {
        tree.hpBarFill.setPosition(tree.x - width * (1 - ratio) * 0.5, tree.y + offsetY);
        tree.hpBarFill.setSize(width * ratio, 6 * scale);
        tree.hpBarFill.setVisible(true);
      }

      this.updateTreeLifePips(tree);
    }
  }


  createTreeLifePips(tree) {
    const scene = this.scene;
    const scale = this.config.blessingTreeScale ?? 1;
    tree.lifePips = [];
    const maxHp = Math.max(1, tree.treeMaxHp || this.config.blessingTreeMaxHp || 4);
    for (let i = 0; i < maxHp; i++) {
      const pip = scene.add.circle(tree.x, tree.y, 4.2 * scale, 0xffffff, 0.92)
        .setDepth(33)
        .setStrokeStyle(1.2 * scale, 0x9fffe4, 0.78)
        .setBlendMode?.(Phaser.BlendModes.ADD) || null;
      if (pip) tree.lifePips.push(pip);
    }
  }

  updateTreeLifePips(tree) {
    if (!tree?.lifePips?.length) return;
    const scale = this.config.blessingTreeScale ?? 1;
    const maxHp = Math.max(1, tree.treeMaxHp || tree.lifePips.length);
    const alive = Math.max(0, tree.treeHp || 0);
    const offsetY = tree.treeDirection === "up" ? -137 * scale : 137 * scale;
    const spacing = 14 * scale;
    const startX = tree.x - ((maxHp - 1) * spacing) * 0.5;
    tree.lifePips.forEach((pip, index) => {
      if (!pip?.active) return;
      pip.setPosition(startX + index * spacing, tree.y + offsetY);
      pip.setVisible(true);
      pip.setAlpha(index < alive ? 0.92 : 0.12);
      pip.setScale(index < alive ? 1 : 0.72);
    });
  }

  playWitherFlicker(tree) {
    if (!tree || !tree.active) return;
    const scene = this.scene;
    scene.tweens.add({
      targets: tree,
      angle: { from: -2.5, to: 2.5 },
      alpha: { from: 0.78, to: 1 },
      duration: 80,
      yoyo: true,
      repeat: 3,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (tree?.active) {
          tree.setAngle(0);
          tree.setAlpha(1);
        }
      }
    });

    for (let i = 0; i < 6; i++) {
      scene.time.delayedCall(90 + i * 35, () => {
        if (!tree?.active) return;
        const leaf = scene.add.circle(
          tree.x + Phaser.Math.Between(-28, 28),
          tree.y + (tree.treeDirection === "up" ? -Phaser.Math.Between(44, 110) : Phaser.Math.Between(44, 110)),
          Phaser.Math.Between(2, 4),
          0xf2fff2,
          0.52
        ).setDepth(34);
        scene.tweens.add({
          targets: leaf,
          y: leaf.y + (tree.treeDirection === "up" ? 28 : -28),
          x: leaf.x + Phaser.Math.Between(-10, 10),
          alpha: 0,
          duration: 520,
          ease: "Sine.easeIn",
          onComplete: () => leaf.destroy()
        });
      });
    }
  }

  configureTreeBody(tree, direction, scale) {
    const bodyW = this.treeBodyWidth * scale;
    const bodyH = this.treeBodyHeight * scale;

    tree.body.setSize(bodyW, bodyH);

    const displayW = 64 * scale;
    const displayH = 112 * scale;

    const offsetX = (displayW - bodyW) / 2;

    if (direction === "up") {
      const offsetY = displayH - bodyH;
      tree.body.setOffset(offsetX, offsetY);
    } else {
      tree.body.setOffset(offsetX, 0);
    }

    tree.refreshBody();
  }

  damageTree(tree, amount = 1) {
    if (!tree || !tree.active || !tree.blessingTree) return;

    tree.treeHp -= amount;
    this.updateTreeHpBars();
    this.playBlockImpact(tree.x, tree.y, tree.treeDirection);
    this.scene.audioCues?.play?.("treeHit", { volume: 0.42, cooldownMs: 70 });

    this.scene.tweens.add({
      targets: tree,
      alpha: 0.45,
      duration: 60,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        if (tree && tree.active) {
          tree.setAlpha(1);
        }
      }
    });

    if (tree.treeHp <= 0) {
      this.destroyTree(tree, true);
    }
  }

  destroyTree(tree, withEffect = true) {
    if (!tree || !tree.active) return;

    this.activeTrees = this.activeTrees.filter((t) => t !== tree);

    if (withEffect) {
      this.scene.audioCues?.play?.("treeBreak");
      this.playDestroyEffect(tree.x, tree.y);
    }

    if (tree.hpBarBack?.active) tree.hpBarBack.destroy();
    if (tree.hpBarFill?.active) tree.hpBarFill.destroy();
    if (Array.isArray(tree.lifePips)) {
      for (const pip of tree.lifePips) pip?.destroy?.();
    }
    tree.destroy();
  }

  cleanupInactiveTrees() {
    this.activeTrees = this.activeTrees.filter((tree) => {
      return tree && tree.active;
    });
  }

  flashSkillUi(success = true) {
    if (!this.uiRoot || !this.uiRoot.active || !this.uiRoot.visible) return;

    const color = success ? 0x7cff7c : 0xff3b3b;

    const flash = this.scene.add.rectangle(
      this.uiRoot.x,
      this.uiRoot.y,
      this.uiBackSize / this.getZoom(),
      this.uiBackSize / this.getZoom(),
      color,
      0.35
    );

    flash.setDepth(6199);

    this.scene.tweens.add({
      targets: flash,
      scale: 1.25,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (flash && flash.active) flash.destroy();
      }
    });
  }

  getZoom() {
    const cam = this.scene.cameras.main;
    return cam && cam.zoom ? cam.zoom : 1;
  }


  playBlockImpact(x, y, direction = "up") {
    const scene = this.scene;
    const scaleY = direction === "up" ? 0.72 : 0.52;
    const ring = scene.add.circle(x, y + (direction === "up" ? -54 : 54), 18, 0xffffff, 0.46);
    ring.setDepth(34);
    ring.setBlendMode?.(Phaser.BlendModes.ADD);

    scene.tweens.add({
      targets: ring,
      scaleX: 2.9,
      scaleY,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  playCreateEffect(x, y, direction) {
    const scene = this.scene;

    const ring = scene.add.circle(x, y, 20, 0x7cff7c, 0.35);
    ring.setDepth(29);

    scene.tweens.add({
      targets: ring,
      scaleX: 2.4,
      scaleY: 0.7,
      alpha: 0,
      duration: 260,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (ring && ring.active) ring.destroy();
      }
    });
  }

  playDestroyEffect(x, y) {
    const scene = this.scene;

    const burst = scene.add.circle(x, y, 28, 0x7cff7c, 0.28);
    burst.setDepth(29);

    scene.tweens.add({
      targets: burst,
      scale: 2.2,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (burst && burst.active) burst.destroy();
      }
    });
  }

  showFailedCast(x, y) {
    const scene = this.scene;

    const mark = scene.add.circle(x, y, 18, 0xff3b3b, 0.45);
    mark.setDepth(1000);

    scene.tweens.add({
      targets: mark,
      scale: 1.8,
      alpha: 0,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (mark && mark.active) mark.destroy();
      }
    });
  }
}
