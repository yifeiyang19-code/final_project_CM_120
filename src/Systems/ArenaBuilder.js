import {
  ARENA,
  ARENA_POLYGONS,
  ARENA_PLATFORM_COLLIDERS,
  ARENA_SOLID_COLLIDERS,
  COLLISION_TUNING,
  LADDER_ZONES,
  RENDERING
} from "../Utils/constants.js";

const TILESET_NAMES = [
  "collision_warning_clear_32",
  "dead_port_collision_tiles",
  "collision_tiles"
];
const COLLISION_TILESET_KEY = "collision_tiles";

export default class ArenaBuilder {
  constructor(scene) {
    this.scene = scene;
    this.tiledMapActive = false;
    this.solidLayer = null;
    this.platformLayer = null;
    this.solidRects = ARENA_SOLID_COLLIDERS.map((rect) => [...rect]);
    this.platformRects = ARENA_PLATFORM_COLLIDERS.map((rect) => [...rect]);
    this.allRects = [...this.solidRects, ...this.platformRects];
  }

  build() {
    const scene = this.scene;

    scene.map = this.createTiledMapOrAdapter();

    this.createParallaxBackground();
    scene.deadPortBackground = this.createStaticArenaLayer();

    scene.backDecorLayer = null;
    scene.destructibleLayer = null;
    scene.creatableLayer = null;
    scene.hazardLayer = null;
    scene.ladderLayer = null;
    scene.frontDecorLayer = null;

    scene.solidBodies = scene.physics.add.staticGroup();
    scene.platformBodies = scene.physics.add.staticGroup();
    scene.hazardBodies = null;
    scene.ladderZones = [];
    scene.ladderHintText = null;
    scene.ladderHintHideEvent = null;
    scene.coverObjects = [];
    scene.explosiveObjects = [];
    scene.transporterObjects = [];
    scene.cullableArenaObjects = [];
    scene.collisionDebugBodies = [];

    scene.groundLayer = this.createGroundLayerAdapter();

    this.createStaticCollisionBodies();
    this.createLadderZones();

    const worldWidth = scene.map.widthInPixels || ARENA.WIDTH;
    const worldHeight = scene.map.heightInPixels || ARENA.HEIGHT;

    scene.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    scene.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    scene.defaultGravityY = scene.physics.world.gravity.y;

    scene.playerSpawn = this.readSpawn("PlayerSpawn") || { ...ARENA.PLAYER_SPAWN };
    scene.bossSpawn =
      this.readSpawn("BossSpawn") ||
      this.readSpawn("BossEntrySpawn") ||
      { ...ARENA.BOSS_SPAWN };
    scene.bossEntrySpawn = scene.bossSpawn;
    scene.bossLandingPoint =
      this.readSpawn("BossLandingPoint") ||
      this.readSpawn("BossLanding") ||
      { ...scene.bossSpawn };

    scene.bossIntroTrigger = null;
    scene.toxicSeaKillZone = null;
    scene.hangingBridgeZone = null;

    return this;
  }

  createTiledMapOrAdapter() {
    const scene = this.scene;

    try {
      if (scene.cache?.tilemap?.exists?.("arena_map")) {
        const map = scene.make.tilemap({ key: "arena_map" });
        const tileset = this.addCollisionTileset(map);

        if (!tileset) {
          throw new Error("Missing collision tileset. Expected collision_warning_clear_32 -> collision_tiles.");
        }

        this.solidLayer =
          this.createHiddenTileLayer(map, "Solid", tileset, "solid") ||
          this.createHiddenTileLayer(map, "Collision_Solid", tileset, "solid");
        this.platformLayer =
          this.createHiddenTileLayer(map, "Platforms", tileset, "platform") ||
          this.createHiddenTileLayer(map, "Collision_Platforms", tileset, "platform");

        const solidObjectRects = this.readRectObjects("SolidObjects");
        const platformObjectRects = this.readRectObjects("PlatformObjects");
        const solidTileRects = this.extractMergedRectsFromTileLayer(this.solidLayer);
        const platformTileRects = this.extractMergedRectsFromTileLayer(this.platformLayer);

        this.solidRects = solidObjectRects.length > 0 ? solidObjectRects : solidTileRects;
        this.platformRects = platformObjectRects.length > 0 ? platformObjectRects : platformTileRects;

        if (this.solidRects.length <= 0 && this.platformRects.length <= 0) {
          throw new Error("Tiled map loaded, but no Solid / collision objects were found.");
        }

        this.allRects = [...this.solidRects, ...this.platformRects];
        this.tiledMapActive = true;
        return map;
      }
    } catch (error) {
      console.warn("[ArenaBuilder] MorningStarPort Tiled arena unavailable; using fallback constants.", error);
    }

    this.tiledMapActive = false;
    this.solidRects = ARENA_SOLID_COLLIDERS.map((rect) => [...rect]);
    this.platformRects = ARENA_PLATFORM_COLLIDERS.map((rect) => [...rect]);
    this.allRects = [...this.solidRects, ...this.platformRects];
    return this.createMapAdapter();
  }

  addCollisionTileset(map) {
    for (const name of TILESET_NAMES) {
      const tileset = map.addTilesetImage(name, COLLISION_TILESET_KEY);
      if (tileset) return tileset;
    }
    return null;
  }

  hasTileLayer(map, layerName) {
    return Boolean(map?.layers?.some((layer) => layer?.name === layerName));
  }

  createHiddenTileLayer(map, layerName, tileset, kind) {
    
    
    
    if (!this.hasTileLayer(map, layerName)) return null;

    const layer = map.createLayer(layerName, tileset, 0, 0);
    if (!layer) return null;

    layer.setVisible(false);
    layer.setDepth(-90);
    layer.collisionKind = kind;

    if (kind === "platform") {
      layer.forEachTile((tile) => {
        if (!tile || tile.index < 0) return;
        tile.properties = {
          ...tile.properties,
          collides: true,
          oneWay: true,
          kind: "platform"
        };
        tile.setCollision(true, false, false, false);
      });
    } else {
      layer.setCollisionByExclusion([-1]);
    }

    return layer;
  }

  extractMergedRectsFromTileLayer(layer) {
    if (!layer || typeof layer.getTileAt !== "function") return [];

    const tileWidth = this.scene.map?.tileWidth || ARENA.TILE_WIDTH;
    const tileHeight = this.scene.map?.tileHeight || ARENA.TILE_HEIGHT;
    const width = layer.layer?.width || this.scene.map?.width || 0;
    const height = layer.layer?.height || this.scene.map?.height || 0;
    const occupied = [];

    for (let y = 0; y < height; y++) {
      occupied[y] = [];
      for (let x = 0; x < width; x++) {
        const tile = layer.getTileAt(x, y, false);
        occupied[y][x] = Boolean(tile && tile.index !== -1);
      }
    }

    const visited = Array.from({ length: height }, () => Array(width).fill(false));
    const rects = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!occupied[y][x] || visited[y][x]) continue;

        let runWidth = 1;
        while (x + runWidth < width && occupied[y][x + runWidth] && !visited[y][x + runWidth]) {
          runWidth++;
        }

        let runHeight = 1;
        outer: while (y + runHeight < height) {
          for (let xx = x; xx < x + runWidth; xx++) {
            if (!occupied[y + runHeight][xx] || visited[y + runHeight][xx]) break outer;
          }
          runHeight++;
        }

        for (let yy = y; yy < y + runHeight; yy++) {
          for (let xx = x; xx < x + runWidth; xx++) {
            visited[yy][xx] = true;
          }
        }

        rects.push([
          x * tileWidth,
          y * tileHeight,
          runWidth * tileWidth,
          runHeight * tileHeight
        ]);
      }
    }

    return rects;
  }

  createParallaxBackground() {
    const scene = this.scene;
    const width = scene.map?.widthInPixels || ARENA.WIDTH;
    const height = scene.map?.heightInPixels || ARENA.HEIGHT;

    scene.farParallaxLayer = scene.add.rectangle(
      width * 0.5,
      height * 0.34,
      width,
      height * 0.7,
      0x050610,
      0.25
    )
      .setDepth(-130)
      .setScrollFactor(RENDERING.PARALLAX.FAR);

    scene.midParallaxLayer = scene.add.rectangle(
      width * 0.5,
      height * 0.48,
      width,
      height * 0.52,
      0x150f16,
      0.12
    )
      .setDepth(-120)
      .setScrollFactor(RENDERING.PARALLAX.MID);
  }

  createStaticArenaLayer() {
    const scene = this.scene;
    const key = scene.textures.exists("arena_background") ? "arena_background" : "dead_port_bg";
    const width = scene.map?.widthInPixels || ARENA.WIDTH;
    const height = scene.map?.heightInPixels || ARENA.HEIGHT;

    const background = scene.add.image(0, 0, key)
      .setOrigin(0, 0)
      .setDepth(-100);

    background.name = "MorningStarPort_Background";
    background.setDisplaySize(width, height);
    background.cullBounds = new Phaser.Geom.Rectangle(0, 0, width, height);
    scene.backgroundChunks = [background];

    return background;
  }

  update() {
    this.updateViewportCulling();
  }

  updateViewportCulling() {
    const scene = this.scene;
    const camera = scene.cameras?.main;
    if (!camera) return;

    const pad = RENDERING.CULLING_PADDING;
    const view = new Phaser.Geom.Rectangle(
      camera.worldView.x - pad,
      camera.worldView.y - pad,
      camera.worldView.width + pad * 2,
      camera.worldView.height + pad * 2
    );

    [scene.coverObjects, scene.explosiveObjects, scene.transporterObjects].forEach((group) => {
      if (!Array.isArray(group)) return;
      group.forEach((object) => {
        if (!object || !object.active || typeof object.setVisible !== "function") return;
        const bounds = object.cullBounds || new Phaser.Geom.Rectangle(object.x, object.y, 1, 1);
        object.setVisible(Phaser.Geom.Intersects.RectangleToRectangle(view, bounds));
      });
    });
  }

  createMapAdapter() {
    const tileWidth = ARENA.TILE_WIDTH;
    const tileHeight = ARENA.TILE_HEIGHT;
    const width = Math.ceil(ARENA.WIDTH / tileWidth);
    const height = Math.ceil(ARENA.HEIGHT / tileHeight);

    return {
      width,
      height,
      tileWidth,
      tileHeight,
      widthInPixels: ARENA.WIDTH,
      heightInPixels: ARENA.HEIGHT,
      getObjectLayer: () => null,
      worldToTileX: (worldX) => Math.floor(worldX / tileWidth),
      worldToTileY: (worldY) => Math.floor(worldY / tileHeight),
      tileToWorldX: (tileX) => tileX * tileWidth,
      tileToWorldY: (tileY) => tileY * tileHeight,
      tileToWorldXY: (tileX, tileY) => ({
        x: tileX * tileWidth,
        y: tileY * tileHeight
      })
    };
  }

  createGroundLayerAdapter() {
    const scene = this.scene;
    const map = scene.map;
    const tileWidth = map.tileWidth || ARENA.TILE_WIDTH;
    const tileHeight = map.tileHeight || ARENA.TILE_HEIGHT;
    const width = map.width || Math.ceil(ARENA.WIDTH / tileWidth);
    const height = map.height || Math.ceil(ARENA.HEIGHT / tileHeight);

    const getLayerTile = (layer, tileX, tileY) => {
      if (!layer || typeof layer.getTileAt !== "function") return null;
      const tile = layer.getTileAt(tileX, tileY, false);
      return tile && tile.index !== -1 ? tile : null;
    };

    const makeSyntheticTile = (tileX, tileY, properties = {}) => ({
      index: properties.oneWay ? 2 : 1,
      x: tileX,
      y: tileY,
      pixelX: tileX * tileWidth,
      pixelY: tileY * tileHeight,
      width: tileWidth,
      height: tileHeight,
      properties,
      collides: true,
      canCollide: true,
      getCenterX() { return this.pixelX + this.width * 0.5; },
      getCenterY() { return this.pixelY + this.height * 0.5; }
    });

    const adapter = {
      layer: { name: "MorningStarPortCollision" },
      width,
      height,
      tileWidth,
      tileHeight,
      visible: false,
      setVisible() { return this; },
      setDepth() { return this; },
      setCollisionByExclusion() { return this; },
      getTileAt: (tileX, tileY) => {
        if (tileX < 0 || tileY < 0 || tileX >= width || tileY >= height) return null;

        const solidTile = getLayerTile(this.solidLayer, tileX, tileY);
        if (solidTile) return solidTile;

        const platformTile = getLayerTile(this.platformLayer, tileX, tileY);
        if (platformTile) return platformTile;

        const worldX = tileX * tileWidth + tileWidth * 0.5;
        const worldY = tileY * tileHeight + tileHeight * 0.5;
        if (this.isSolidAtWorld(worldX, worldY)) {
          return makeSyntheticTile(tileX, tileY, { collides: true, kind: "solid" });
        }

        return null;
      },
      getTileAtWorldXY: (worldX, worldY) => adapter.getTileAt(
        Math.floor(worldX / tileWidth),
        Math.floor(worldY / tileHeight)
      ),
      worldToTileX: (worldX) => Math.floor(worldX / tileWidth),
      worldToTileY: (worldY) => Math.floor(worldY / tileHeight),
      tileToWorldX: (tileX) => tileX * tileWidth,
      tileToWorldY: (tileY) => tileY * tileHeight,
      tileToWorldXY: (tileX, tileY) => ({
        x: tileX * tileWidth,
        y: tileY * tileHeight
      })
    };

    return adapter;
  }

  createStaticCollisionBodies() {
    this.solidRects.forEach(([x, y, width, height], index) => {
      this.createStaticRect(`solid_collision_${index}`, x, y, width, height, this.scene.solidBodies, {
        color: COLLISION_TUNING.DEBUG_SOLID_COLOR,
        kind: "solid"
      });
    });

    this.platformRects.forEach(([x, y, width, height], index) => {
      this.createStaticRect(`platform_collision_${index}`, x, y, width, height, this.scene.platformBodies, {
        color: COLLISION_TUNING.DEBUG_PLATFORM_COLOR,
        kind: "platform",
        oneWay: true
      });
    });
  }

  createStaticRect(name, x, y, width, height, group = this.scene.solidBodies, options = {}) {
    const scene = this.scene;
    const rect = scene.add.rectangle(
      x + width * 0.5,
      y + height * 0.5,
      width,
      height,
      options.color || 0xffff00,
      scene.debugMapBodies ? (options.alpha ?? 0.16) : 0
    );

    rect.setOrigin(0.5);
    rect.setDepth(scene.debugMapBodies ? 2000 : -40);
    rect.name = name;

    scene.physics.add.existing(rect, true);

    if (rect.body) {
      rect.body.setSize(width, height);
      rect.body.updateFromGameObject();
    }

    rect.collisionKind = options.kind || "solid";
    rect.oneWayPlatform = Boolean(options.oneWay);
    rect.cullBounds = new Phaser.Geom.Rectangle(x, y, width, height);

    if (rect.body && rect.oneWayPlatform) {
      rect.body.checkCollision.up = true;
      rect.body.checkCollision.down = false;
      rect.body.checkCollision.left = false;
      rect.body.checkCollision.right = false;
    }

    group.add(rect);
    scene.collisionDebugBodies.push(rect);
    return rect;
  }

  createLadderZones() {
    const objects = [
      ...this.readObjectLayer("Ladders"),
      ...this.readObjectLayer("LadderZones")
    ].filter((object) => Number(object.width) > 0 && Number(object.height) > 0);

    if (objects.length > 0) {
      objects.forEach((object) => {
        this.createZone(
          object.name || `ladder_${object.id}`,
          Number(object.x) || 0,
          Number(object.y) || 0,
          Number(object.width) || 1,
          Number(object.height) || 1
        );
      });
      return;
    }

    LADDER_ZONES.forEach((zone) => this.createZone(zone.name, zone.x, zone.y, zone.width, zone.height));
  }

  createZone(name, x, y, width, height, color = 0x00ccff, alpha = 0.12) {
    const scene = this.scene;
    const zone = scene.add.zone(x + width * 0.5, y + height * 0.5, width, height);

    zone.name = name;
    zone.cullBounds = new Phaser.Geom.Rectangle(x, y, width, height);
    scene.ladderZones.push(zone);

    if (scene.debugMapBodies) {
      scene.add.rectangle(x + width * 0.5, y + height * 0.5, width, height, color, alpha)
        .setDepth(2001);
    }

    return zone;
  }

  readObjectLayer(layerName) {
    const layer = this.scene.map?.getObjectLayer?.(layerName);
    return Array.isArray(layer?.objects) ? layer.objects : [];
  }

  readRectObjects(layerName) {
    return this.readObjectLayer(layerName)
      .filter((object) => Number(object.width) > 0 && Number(object.height) > 0)
      .map((object) => [
        Number(object.x) || 0,
        Number(object.y) || 0,
        Number(object.width) || 0,
        Number(object.height) || 0
      ]);
  }

  readSpawn(name) {
    const object = this.findMapObject("Spawns", name);
    if (!object) return null;

    const x = (Number(object.x) || 0) + (Number(object.width) || 0) * 0.5;
    const y = (Number(object.y) || 0) + (Number(object.height) || 0) * 0.5;

    return {
      x,
      y,
      name,
      isPoint: Boolean(object.point),
      rawY: Number(object.y) || 0
    };
  }

  resolveActorSpawn(spawn, actorHalfHeight = 52, actorHalfWidth = 18) {
    const scene = this.scene;
    const width = scene.map?.widthInPixels || ARENA.WIDTH;
    const height = scene.map?.heightInPixels || ARENA.HEIGHT;
    const x = Phaser.Math.Clamp(spawn?.x ?? ARENA.PLAYER_SPAWN.x, actorHalfWidth + 4, width - actorHalfWidth - 4);

    
    
    
    const authoredY = Number(spawn?.y ?? ARENA.PLAYER_SPAWN.y);
    const initialY = spawn?.isPoint ? authoredY - actorHalfHeight : authoredY;

    const fits = (cx, cy) => this.isPlayerAreaEmptyAt(cx, cy, actorHalfWidth, actorHalfHeight);
    const hasSupportBelow = (cx, cy) => {
      const footY = cy + actorHalfHeight + 3;
      return (
        this.isBlockingSolidAtWorld(cx, footY) ||
        this.isBlockingSolidAtWorld(cx - actorHalfWidth * 0.75, footY) ||
        this.isBlockingSolidAtWorld(cx + actorHalfWidth * 0.75, footY)
      );
    };

    let best = null;
    for (let offset = 0; offset <= 320; offset += 4) {
      const candidates = offset === 0 ? [initialY] : [initialY - offset, initialY + offset];
      for (const cyRaw of candidates) {
        const cy = Phaser.Math.Clamp(cyRaw, actorHalfHeight + 4, height - actorHalfHeight - 4);
        if (fits(x, cy)) {
          if (hasSupportBelow(x, cy)) return { x, y: cy };
          best = best || { x, y: cy };
        }
      }
    }

    return best || { x, y: Phaser.Math.Clamp(initialY, actorHalfHeight + 4, height - actorHalfHeight - 4) };
  }

  findSurfaceYAtX(worldX, fallbackY = 0, options = {}) {
    const width = this.scene.map?.widthInPixels || ARENA.WIDTH;
    const height = this.scene.map?.heightInPixels || ARENA.HEIGHT;
    const x = Phaser.Math.Clamp(worldX, 0, width);
    const searchTop = Number.isFinite(options.searchTop) ? options.searchTop : 0;
    const searchBottom = Number.isFinite(options.searchBottom) ? options.searchBottom : height;

    const surfaces = this.solidRects
      .filter(([rx, ry, rw, rh]) => {
        return x >= rx && x <= rx + rw && ry >= searchTop && ry <= searchBottom;
      })
      .map(([rx, ry, rw, rh]) => ({ x, y: ry, distance: Math.abs(ry - fallbackY) }))
      .sort((a, b) => a.distance - b.distance);

    if (surfaces.length > 0) {
      return Phaser.Math.Clamp(surfaces[0].y, 48, height - 48);
    }

    return Phaser.Math.Clamp(fallbackY + 40, 80, height - 80);
  }

  getStableCollisionRects() {
    return this.allRects;
  }

  isSolidAtWorld(x, y) {
    const inRect = this.allRects.some(([rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
    if (inRect) return true;

    return ARENA_POLYGONS.some((polygon) => {
      const points = polygon.points?.map((point) => new Phaser.Geom.Point(point.x, point.y)) || [];
      return points.length >= 3 && Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(points), x, y);
    });
  }

  isBlockingSolidAtWorld(x, y) {
    return this.solidRects.some(([rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh);
  }

  isPlayerAreaEmptyAt(x, y, radiusX = 18, radiusY = 34) {
    return (
      !this.isBlockingSolidAtWorld(x, y) &&
      !this.isBlockingSolidAtWorld(x - radiusX, y - radiusY) &&
      !this.isBlockingSolidAtWorld(x + radiusX, y - radiusY) &&
      !this.isBlockingSolidAtWorld(x - radiusX, y + radiusY) &&
      !this.isBlockingSolidAtWorld(x + radiusX, y + radiusY)
    );
  }

  findNearestSolidSurfaceForTree(worldX, worldY, direction = "up") {
    const width = this.scene.map?.widthInPixels || ARENA.WIDTH;
    const x = Phaser.Math.Clamp(worldX, 32, width - 32);
    const maxSlide = 320;

    const candidates = this.solidRects
      .filter(([rx, , rw]) => x >= rx + 4 && x <= rx + rw - 4)
      .flatMap(([rx, ry, rw, rh]) => ([
        { x, y: ry, type: "top", distance: Math.abs(ry - worldY) },
        { x, y: ry + rh, type: "bottom", distance: Math.abs(ry + rh - worldY) }
      ]))
      .filter((surface) => surface.distance <= maxSlide)
      .sort((a, b) => a.distance - b.distance);

    if (direction === "up") {
      const floor = candidates.find((surface) => surface.type === "top");
      return floor ? { x: floor.x, y: floor.y } : null;
    }

    const ceiling = candidates.find((surface) => surface.type === "bottom");
    return ceiling ? { x: ceiling.x, y: ceiling.y } : null;
  }

  findMapObject(layerName, objectName) {
    const objects = this.readObjectLayer(layerName);
    return objects.find((object) => object.name === objectName) || null;
  }

  isPlayerInLadderZone(player = this.scene.player) {
    const scene = this.scene;
    if (!player || !player.active || !scene.ladderZones || scene.ladderZones.length <= 0) return false;

    const body = player.body;
    const px = player.x;
    const py = player.y;
    const halfWidth = body ? Math.max(16, body.width * 0.5) : 18;
    const halfHeight = body ? Math.max(34, body.height * 0.5) : 36;

    return scene.ladderZones.some((zone) => {
      if (!zone || !zone.active) return false;
      const left = zone.x - zone.width * 0.5;
      const right = zone.x + zone.width * 0.5;
      const top = zone.y - zone.height * 0.5;
      const bottom = zone.y + zone.height * 0.5;
      return px + halfWidth > left && px - halfWidth < right && py + halfHeight > top && py - halfHeight < bottom;
    });
  }

  showLadderHint(x, y) {
    const scene = this.scene;

    if (!scene.ladderHintText) {
      scene.ladderHintText = scene.add.text(x, y, "W / S  CLIMB", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#d8fbff",
        stroke: "#001319",
        strokeThickness: 6,
        align: "center"
      })
        .setOrigin(0.5)
        .setDepth(1500)
        .setAlpha(0);
    }

    scene.ladderHintText.setPosition(x, y).setAlpha(0.88);

    if (scene.ladderHintHideEvent) scene.ladderHintHideEvent.remove(false);
    scene.ladderHintHideEvent = scene.time.delayedCall(140, () => {
      if (scene.ladderHintText) scene.ladderHintText.setAlpha(0);
    });
  }

  addActorColliders() {
    const scene = this.scene;
    const player = scene.player || scene.playerController?.player;

    if (this.scene.debugMapBodies) {
      console.info("MorningStarPort collider setup", {
        source: this.tiledMapActive ? "tiled:assets/tilemaps/MorningStarPort.json" : "fallback:constants",
        hasPlayer: Boolean(player),
        solidBodies: scene.solidBodies ? scene.solidBodies.getChildren().length : 0,
        platformBodies: scene.platformBodies ? scene.platformBodies.getChildren().length : 0,
        ladders: scene.ladderZones?.length || 0,
        playerSpawn: scene.playerSpawn,
        bossSpawn: scene.bossSpawn,
        bossLandingPoint: scene.bossLandingPoint
      });
    }

    if (player) {
      if (scene.solidBodies) scene.physics.add.collider(player, scene.solidBodies);
      if (scene.platformBodies) {
        scene.physics.add.collider(player, scene.platformBodies, null, this.processOneWayPlatform, this);
      }
    }

    if (scene.boss) {
      if (scene.solidBodies) scene.physics.add.collider(scene.boss, scene.solidBodies);
      if (scene.platformBodies) {
        scene.physics.add.collider(scene.boss, scene.platformBodies, null, this.processOneWayPlatform, this);
      }
    }
  }

  processOneWayPlatform(actor, platform) {
    if (!actor || !actor.body || !platform || !platform.body) return false;
    if (actor === this.scene.player && this.scene.playerIsClimbing) return false;

    const body = actor.body;
    const platformTop = platform.body.top;
    const actorBottom = body.bottom;
    const prevBottom = (body.prev?.y ?? body.y) + body.height;
    const tolerance = COLLISION_TUNING.PLATFORM_ONE_WAY_TOLERANCE;

    const movingDown = body.velocity.y >= -8;
    const cameFromAbove = prevBottom <= platformTop + tolerance;
    const notDeepInside = actorBottom <= platformTop + tolerance * 1.6;

    return movingDown && cameFromAbove && notDeepInside;
  }

  cleanup() {
    const scene = this.scene;
    [scene.solidBodies, scene.platformBodies].forEach((group) => {
      if (!group) return;
      group.getChildren().forEach((child) => {
        if (child && child.active) child.destroy();
      });
      group.clear(true, true);
    });

    scene.ladderZones = [];
    scene.ladderHintText = null;
    scene.ladderHintHideEvent = null;
    scene.coverObjects = [];
    scene.explosiveObjects = [];
    scene.transporterObjects = [];
    scene.cullableArenaObjects = [];
    scene.collisionDebugBodies = [];
  }
}
