export const DEFAULT_GAME_CONFIG = Object.freeze({
  version: 1,
  physics: {
    gravityY: 900,
    friction: 0.8,
    fixedStepSeconds: 1 / 60,
    maxFixedStepsPerFrame: 4
  },
  player: {
    maxHp: 7,
    iframeMs: 1250,
    contactDamage: 1,
    states: {
      idle: { animation: "player_idle_anim", layer: "movement" },
      run: { animation: "player_run_anim", layer: "movement" },
      jump: { animation: "player_jump_anim", layer: "movement" },
      fall: { animation: "player_jump_anim", layer: "movement" },
      climb: { animation: "player_walk_anim", layer: "movement" },
      hurt: { animation: "player_hurt_anim", layer: "action", lockMs: 180 },
      dead: { animation: "player_dead_anim", layer: "action", lockMs: 999999 }
    }
  },
  boss: {
    maxIntegrity: 100,
    phase2Threshold: 0.7,
    phase3Threshold: 0.35,
    phase1DecayRate: 0.75,
    phase2DecayRate: 0.875,
    phase3DecayRate: 0.333,
    phase4Threshold: 0.10,
    phase4DecayRate: 0,
    phaseTimelineSeconds: { phase2: 43, phase3: 83, phase4: 133 },
    phase4CountdownSeconds: 18
  },
  input: {
    bufferMs: 140
  },
  accessibility: {
    colorBlindMode: false,
    screenShakeMultiplier: 1.0,
    colorBlindPalette: {
      phase2: { fill: "0xe6d04a", glow: "0xf6e58d", stroke: "0xe6d04a", subtitle: "#fff0a8" },
      phase3: { fill: "0xb56cff", glow: "0xd8b4ff", stroke: "0xb56cff", subtitle: "#e1c4ff" }
    }
  },
  audio: {
    enabled: true,
    masterVolume: 0.35,
    bgm: { key: "bgm_boss_main", volume: 0.28, loop: false, fadeInMs: 1200 },
    cues: {},
    playerSfxEnabled: true
  },
  rendering: {
    backgroundChunkSize: 512,
    cullingPadding: 256,
    parallax: { far: 0.2, mid: 0.5 }
  },
  assets: {
    images: {
      arena_background: "assets/backgrounds/MorningStarPort_Background.png",
      dead_port_bg: "assets/backgrounds/MorningStarPort_Background.png",
      collision_tiles: "assets/tilesets/collision_warning_clear_32.png",
      hud_panel: "assets/images/ui/hud_panel.png",
      hp_cell: "assets/images/ui/hp_cell.png"
    },
    audio: {
      bgm_boss_main: "assets/audio/Iron_Liturgy.mp3"
    },
    json: {
      sprite_metadata: "assets/data/sprite_metadata.json"
    },
    tilemaps: {
      arena_map: "assets/tilemaps/MorningStarPort.json"
    }
  }
});

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return structuredClone(base);
  const out = Array.isArray(base) ? [...base] : { ...base };

  Object.keys(override).forEach((key) => {
    const baseValue = base?.[key];
    const overrideValue = override[key];
    if (
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue) &&
      overrideValue &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue)
    ) {
      out[key] = deepMerge(baseValue, overrideValue);
    } else {
      out[key] = overrideValue;
    }
  });

  return out;
}

export default class AssetManager {
  constructor(scene) {
    this.scene = scene;
    this.config = structuredClone(DEFAULT_GAME_CONFIG);
  }

  preloadCoreConfig() {
    this.scene.load.json("game_config", "assets/data/game_config.json");
  }

  readCoreConfig() {
    try {
      const loaded = this.scene.cache.json.get("game_config");
      if (!loaded || typeof loaded !== "object") {
        throw new Error("game_config missing or not an object");
      }
      this.config = deepMerge(DEFAULT_GAME_CONFIG, loaded);
    } catch (error) {
      console.warn("[AssetManager] Using fallback game configuration.", error);
      this.config = structuredClone(DEFAULT_GAME_CONFIG);
    }

    this.scene.registry.set("gameConfig", this.config);
    return this.config;
  }

  preloadFromConfig(config = this.config) {
    const assets = config.assets || DEFAULT_GAME_CONFIG.assets;

    Object.entries(assets.json || {}).forEach(([key, path]) => {
      if (!this.scene.cache.json.exists(key)) {
        this.scene.load.json(key, this.normalize(path));
      }
    });

    Object.entries(assets.images || {}).forEach(([key, path]) => {
      if (!this.scene.textures.exists(key)) {
        this.scene.load.image(key, this.normalize(path));
      }
    });

    Object.entries(assets.audio || {}).forEach(([key, path]) => {
      const audioCache = this.scene.cache?.audio;
      const hasAudio = Boolean(audioCache?.exists?.(key) || audioCache?.has?.(key));
      if (!hasAudio) {
        this.scene.load.audio(key, this.normalize(path));
      }
    });

    Object.entries(assets.tilemaps || {}).forEach(([key, path]) => {
      const tilemapCache = this.scene.cache?.tilemap;
      const alreadyLoaded = Boolean(
        tilemapCache?.exists?.(key) ||
        tilemapCache?.has?.(key)
      );

      if (!alreadyLoaded) {
        this.scene.load.tilemapTiledJSON(key, this.normalize(path));
      }
    });
  }

  normalize(path) {
    return String(path || "").replace(/\\/g, "/").replace(/^\.\//, "");
  }

  getPath(group, key) {
    return this.config?.assets?.[group]?.[key] || DEFAULT_GAME_CONFIG.assets?.[group]?.[key] || null;
  }

  static readJson(scene, key, fallback = {}) {
    try {
      const value = scene.cache.json.get(key);
      if (!value || typeof value !== "object") throw new Error(`${key} is missing`);
      return value;
    } catch (error) {
      console.warn(`[AssetManager] Falling back for JSON key: ${key}`, error);
      return structuredClone(fallback);
    }
  }
}
