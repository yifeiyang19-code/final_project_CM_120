import AssetManager, { DEFAULT_GAME_CONFIG } from "../Managers/AssetManager.js";
import { loadDeadPortSfx } from "../AudioKeys.js";
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.createLoadingScreen();

    this.assetManager = new AssetManager(this);
    this.assetManager.preloadCoreConfig();
    this.load.json("sprite_metadata", DEFAULT_GAME_CONFIG.assets.json.sprite_metadata);

    
    
    
    
    
    
    this.load.image(
      "arena_background",
      DEFAULT_GAME_CONFIG.assets.images.arena_background || DEFAULT_GAME_CONFIG.assets.images.dead_port_bg
    );
    this.load.image(
      "dead_port_bg",
      DEFAULT_GAME_CONFIG.assets.images.dead_port_bg
    );
    this.load.image(
      "menu_last_moment_bg",
      "assets/backgrounds/menu_last_moment_background.png"
    );
    this.load.image(
      "collision_tiles",
      DEFAULT_GAME_CONFIG.assets.images.collision_tiles
    );
    this.load.tilemapTiledJSON(
      "arena_map",
      DEFAULT_GAME_CONFIG.assets.tilemaps.arena_map
    );

    
    
    
    this.load.spritesheet("player_idle", "assets/images/player/player_idle.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_walk", "assets/images/player/player_walk.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_run", "assets/images/player/player_run.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_jump", "assets/images/player/player_jump.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_defend", "assets/images/player/player_defend.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_hurt", "assets/images/player/player_hurt.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("player_dead", "assets/images/player/player_dead.png", {
      frameWidth: 128,
      frameHeight: 128
    });

    this.load.spritesheet("blessing_tree", "assets/images/player/tree_growth_single.png", {
      frameWidth: 64,
      frameHeight: 112
    });

    this.load.image(
      "blessing_tree_icon",
      "assets/images/player/blessing_tree_icon.png"
    );

    this.load.image("hud_panel", DEFAULT_GAME_CONFIG.assets.images.hud_panel);
    this.load.image("hp_cell", DEFAULT_GAME_CONFIG.assets.images.hp_cell);
    this.load.image("health_pack", "assets/images/ui/health_pack.png");

    
    
    
    this.load.audio("bgm_boss_main", DEFAULT_GAME_CONFIG.assets.audio.bgm_boss_main || "assets/audio/boss_bgm_protocol_for_nothing.mp3");
    this.load.audio("bgm_menu_weight_of_stone", "assets/audio/The_Weight_of_Stone.mp3");

    
    
    loadDeadPortSfx(this);

    
    
    
    this.load.spritesheet("blue_death", "assets/images/boss/blue_death.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("blue_idle", "assets/images/boss/blue_idle.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("blue_fly_up", "assets/images/boss/blue_fly_up.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("blue_land", "assets/images/boss/blue_land.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    
    
    
    this.load.spritesheet("boss_hurt", "assets/images/boss/blue_hurt.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("boss_walk", "assets/images/boss/blue_walk.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("boss_walk_attack", "assets/images/boss/blue_walk_attack.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("boss_attack", "assets/images/boss/blue_attack.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("boss_attack2_effect", "assets/images/boss/blue_attack2_effect.png", {
      frameWidth: 180,
      frameHeight: 72
    });

    this.load.image("blue_bullet_1", "assets/images/boss/blue_bullet_1.png");
    this.load.image("blue_bullet_2", "assets/images/boss/blue_bullet_2.png");
    this.load.image("blue_bullet_3", "assets/images/boss/blue_bullet_3.png");
    this.load.image("blue_bullet_4", "assets/images/boss/blue_bullet_4.png");
    this.load.image("blue_bullet_5", "assets/images/boss/blue_bullet_5.png");

    
    
    
    for (let i = 1; i <= 6; i++) {
      this.load.image(
        `phase_lightning_${i}`,
        `assets/images/effects/phase_lightning_${i}.png`
      );
    }

    
    
    
    this.load.spritesheet("purple_idle", "assets/images/brothers/purple_idle.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("purple_attack", "assets/images/brothers/purple_attack.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("purple_warning", "assets/images/brothers/purple_warning.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("purple_bullet", "assets/images/brothers/purple_bullet.png", {
      frameWidth: 102,
      frameHeight: 102
    });

    
    
    
    this.load.spritesheet("green_fly_up", "assets/images/brothers/green_fly_up.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    this.load.spritesheet("green_warning", "assets/images/brothers/green_warning.png", {
      frameWidth: 96,
      frameHeight: 96
    });

    
    
    
    this.load.spritesheet("turret_attack", "assets/images/brothers/turret_attack.png", {
      frameWidth: 72,
      frameHeight: 72
    });

    this.load.image("turret_bullet", "assets/images/brothers/turret_bullet.png");

    
    
    
    
    
    this.load.spritesheet("purge_drone_back", "assets/images/drone/Back.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_forward", "assets/images/drone/Forward.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_idle", "assets/images/drone/Idle.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_walk", "assets/images/drone/Walk.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_walk_scan", "assets/images/drone/Walk_scan.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_scan", "assets/images/drone/Scan.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_drop", "assets/images/drone/Drop.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_death", "assets/images/drone/Death.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_fire1", "assets/images/drone/Fire1.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_fire2", "assets/images/drone/Fire2.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_drone_fire3", "assets/images/drone/Fire3.png", {
      frameWidth: 48,
      frameHeight: 48
    });

    this.load.spritesheet("purge_bomb", "assets/images/drone/Bomb.png", {
      frameWidth: 16,
      frameHeight: 16
    });

    
    
    
    for (let i = 0; i < 10; i++) {
      this.load.image(`Explosion_${i}`, `assets/images/effects/Explosion_${i}.png`);
    }

    for (let i = 0; i < 10; i++) {
      this.load.image(`Slash_${i}`, `assets/images/effects/Slash_${i}.png`);
    }

    
    
    
    
    this.load.spritesheet("purge_blast", "assets/images/effects/blast2.png", {
      frameWidth: 72,
      frameHeight: 72
    });

    this.load.spritesheet("purge_big_blast", "assets/images/effects/blast.png", {
      frameWidth: 96,
      frameHeight: 96
    });
  }

  create() {
    const gameConfig = this.assetManager?.readCoreConfig?.() || DEFAULT_GAME_CONFIG;
    this.registry.set("gameConfig", gameConfig);
    this.applyPersistedRuntimeSettings(gameConfig);

    if (this.physics?.world && Number.isFinite(gameConfig.physics?.gravityY)) {
      this.physics.world.gravity.y = gameConfig.physics.gravityY;
    }

    this.createPlayerAnimations();
    this.createBossAnimations();
    this.createBrotherAnimations();
    this.createTurretAnimations();
    this.createPurgeDroneAnimations();
    this.createEffectAnimations();

    const params = new URLSearchParams(window.location.search);
    const navigationEntry = performance?.getEntriesByType?.("navigation")?.[0];
    const isHardRefresh = navigationEntry?.type === "reload";

    
    
    
    if (isHardRefresh && window.location.search && !params.has("scene")) {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.scene.start("MenuScene");
      return;
    }

    const directScene = params.get("scene");
    if (directScene === "boss") {
      const phase = Number.parseInt(params.get("phase") || "1", 10);
      this.scene.start("BossScene", { devStartPhase: Number.isFinite(phase) ? phase : 1 });
      return;
    }

    if (directScene === "training") {
      const skill = params.get("skill") || null;
      const phase = Number.parseInt(params.get("phase") || "1", 10);
      this.scene.start("TrainingScene", { trainingSkill: skill, devStartPhase: Number.isFinite(phase) ? phase : 1 });
      return;
    }

    this.scene.start("MenuScene");
  }


  applyPersistedRuntimeSettings(gameConfig) {
    gameConfig.accessibility = gameConfig.accessibility || {};
    gameConfig.audio = gameConfig.audio || {};
    gameConfig.audio.bgm = gameConfig.audio.bgm || {};

    const storedShake = Number.parseFloat(localStorage.getItem("morningstarScreenShakeMultiplier") || "");
    if (Number.isFinite(storedShake)) {
      gameConfig.accessibility.screenShakeMultiplier = Phaser.Math.Clamp(storedShake, 0, 2);
    }

    const storedColor = localStorage.getItem("morningstarColorBlindMode");
    if (storedColor === "1" || storedColor === "0") {
      gameConfig.accessibility.colorBlindMode = storedColor === "1";
    }

    const storedBgm = Number.parseFloat(localStorage.getItem("morningstarBossBgmVolume") || "");
    if (Number.isFinite(storedBgm)) {
      gameConfig.audio.bgm.volume = Phaser.Math.Clamp(storedBgm, 0, 1);
    }

    this.registry.set("gameConfig", gameConfig);
  }

  createLoadingScreen() {
    const { width, height } = this.scale;
    const boxWidth = Math.min(520, width * 0.62);
    const boxHeight = 18;
    const x = (width - boxWidth) * 0.5;
    const y = height * 0.62;

    const title = this.add.text(width * 0.5, height * 0.44, "MorningPort Defense System preparing...", {
      fontFamily: "monospace",
      fontSize: "30px",
      color: "#d8fbff",
      stroke: "#001319",
      strokeThickness: 6
    }).setOrigin(0.5);

    const label = this.add.text(width * 0.5, y - 34, "Loading assets...", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#9fb7c0"
    }).setOrigin(0.5);

    const border = this.add.rectangle(x, y, boxWidth, boxHeight, 0x13202c, 0.85)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0x7df9ff, 0.75);
    const fill = this.add.rectangle(x + 3, y, 2, Math.max(2, boxHeight - 6), 0x7df9ff, 0.9)
      .setOrigin(0, 0.5);

    this.load.on("progress", (value) => {
      fill.width = Math.max(2, (boxWidth - 6) * value);
    });

    this.load.once("complete", () => {
      title.destroy();
      label.destroy();
      border.destroy();
      fill.destroy();
    });
  }

  createPlayerAnimations() {
    this.anims.create({
      key: "player_idle_anim",
      frames: this.anims.generateFrameNumbers("player_idle", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: "player_walk_anim",
      frames: this.anims.generateFrameNumbers("player_walk", { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "player_run_anim",
      frames: this.anims.generateFrameNumbers("player_run", { start: 0, end: 6 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: "player_jump_anim",
      frames: this.anims.generateFrameNumbers("player_jump", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0
    });

    this.anims.create({
      key: "player_defend_anim",
      frames: this.anims.generateFrameNumbers("player_defend", { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "player_hurt_anim",
      frames: this.anims.generateFrameNumbers("player_hurt", { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "player_dead_anim",
      frames: this.anims.generateFrameNumbers("player_dead", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "blessing_tree_grow",
      frames: this.anims.generateFrameNumbers("blessing_tree", { start: 1, end: 4 }),
      frameRate: 10,
      repeat: 0
    });
  }

  createBossAnimations() {
    this.anims.create({
      key: "blue_activate",
      frames: this.anims.generateFrameNumbers("blue_death", { start: 0, end: 5 }).reverse(),
      frameRate: 4,
      repeat: 0
    });

    this.anims.create({
      key: "blue_idle_anim",
      frames: this.anims.generateFrameNumbers("blue_idle", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: "blue_fly_up_anim",
      frames: this.anims.generateFrameNumbers("blue_fly_up", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "blue_land_anim",
      frames: this.anims.generateFrameNumbers("blue_land", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "blue_die",
      frames: this.anims.generateFrameNumbers("blue_death", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "boss_hurt_anim",
      frames: this.anims.generateFrameNumbers("boss_hurt", { start: 0, end: 1 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "boss_walk_anim",
      frames: this.anims.generateFrameNumbers("boss_walk", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "boss_walk_attack_anim",
      frames: this.anims.generateFrameNumbers("boss_walk_attack", { start: 0, end: 5 }),
      frameRate: 9,
      repeat: 0
    });

    this.anims.create({
      key: "boss_attack_anim",
      frames: this.anims.generateFrameNumbers("boss_attack", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0
    });

    this.anims.create({
      key: "boss_attack2_effect_anim",
      frames: this.anims.generateFrameNumbers("boss_attack2_effect", { start: 0, end: 3 }),
      frameRate: 14,
      repeat: 0
    });

    this.anims.create({
      key: "phase_lightning_anim",
      frames: Array.from({ length: 6 }, (_, i) => ({
        key: `phase_lightning_${i + 1}`
      })),
      frameRate: 16,
      repeat: 0
    });
  }

  createBrotherAnimations() {
    this.anims.create({
      key: "purple_idle_anim",
      frames: this.anims.generateFrameNumbers("purple_idle", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: "purple_attack_anim",
      frames: this.anims.generateFrameNumbers("purple_attack", { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "purple_warning_anim",
      frames: this.anims.generateFrameNumbers("purple_warning", { start: 0, end: 1 }),
      frameRate: 6,
      repeat: 0
    });

    this.anims.create({
      key: "purple_bullet_anim",
      frames: this.anims.generateFrameNumbers("purple_bullet", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1
    });

    this.anims.create({
      key: "green_fly_up_anim",
      frames: this.anims.generateFrameNumbers("green_fly_up", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0
    });

    this.anims.create({
      key: "green_warning_anim",
      frames: this.anims.generateFrameNumbers("green_warning", { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1
    });
  }

  createTurretAnimations() {
    this.anims.create({
      key: "turret_attack_anim",
      frames: this.anims.generateFrameNumbers("turret_attack", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
  }

  createPurgeDroneAnimations() {
    this.anims.create({
      key: "purge_drone_back_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_back", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_forward_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_forward", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_idle_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_idle", { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_walk_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_walk", { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_walk_scan_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_walk_scan", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_scan_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_scan", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1
    });

    this.anims.create({
      key: "purge_drone_drop_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_drop", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0
    });

    this.anims.create({
      key: "purge_drone_death_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_death", { start: 0, end: 7 }),
      frameRate: 12,
      repeat: 0
    });

    this.anims.create({
      key: "purge_drone_fire1_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_fire1", { start: 0, end: 15 }),
      frameRate: 16,
      repeat: 0
    });

    this.anims.create({
      key: "purge_drone_fire2_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_fire2", { start: 0, end: 15 }),
      frameRate: 16,
      repeat: 0
    });

    this.anims.create({
      key: "purge_drone_fire3_anim",
      frames: this.anims.generateFrameNumbers("purge_drone_fire3", { start: 0, end: 15 }),
      frameRate: 16,
      repeat: 0
    });

    this.anims.create({
      key: "purge_bomb_spin_anim",
      frames: this.anims.generateFrameNumbers("purge_bomb", { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1
    });
  }

  createEffectAnimations() {
    this.anims.create({
      key: "explosion_anim",
      frames: Array.from({ length: 10 }, (_, i) => ({
        key: `Explosion_${i}`
      })),
      frameRate: 16,
      repeat: 0
    });

    this.anims.create({
      key: "slash_anim",
      frames: Array.from({ length: 10 }, (_, i) => ({
        key: `Slash_${i}`
      })),
      frameRate: 18,
      repeat: 0
    });

    this.anims.create({
      key: "purge_blast_anim",
      frames: this.anims.generateFrameNumbers("purge_blast", { start: 0, end: 7 }),
      frameRate: 14,
      repeat: 0
    });

    this.anims.create({
      key: "purge_big_blast_anim",
      frames: this.anims.generateFrameNumbers("purge_big_blast", { start: 0, end: 7 }),
      frameRate: 14,
      repeat: 0
    });
  }
}
