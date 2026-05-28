const DISABLED_PLAYER_CUES = Object.freeze(new Set());

const DEFAULT_DIRECT_CUES = Object.freeze({
  annihilationSlashAftershock: { key: "tumie_aftershock_clean", volume: 0.52, cooldownMs: 180 },
  annihilationSlashCharge: { key: "tumie_execution_charge_clean", volume: 0.58, cooldownMs: 700 },
  annihilationSlashHit: { key: "tumie_cut_impact_clean", volume: 0.70, cooldownMs: 220 },
  annihilationSlashWarning: { key: "tumie_servo_warning_clean", volume: 0.62, cooldownMs: 780 },
  bossDamage: { key: "turret_deploy_clean", volume: 0.14, cooldownMs: 260 },
  bossDeathFinal: { key: "boss_core_shutdown_clean", volume: 0.78, cooldownMs: 1500 },
  bossDeathPulse: {
    keys: [
      "boss_death_pulse_1_clean",
      "boss_death_pulse_2_clean",
      "boss_death_pulse_3_clean",
      "boss_death_pulse_4_clean"
    ],
    volume: 0.62,
    cooldownMs: 520,
    sequence: true
  },
  bossDeathPulse1: { key: "boss_death_pulse_1_clean", volume: 0.56, cooldownMs: 520 },
  bossDeathPulse2: { key: "boss_death_pulse_2_clean", volume: 0.60, cooldownMs: 520 },
  bossDeathPulse3: { key: "boss_death_pulse_3_clean", volume: 0.64, cooldownMs: 520 },
  bossDeathPulse4: { key: "boss_death_pulse_4_clean", volume: 0.68, cooldownMs: 520 },
  bossIntroPowerup: { key: "boss_intro_reactor_wake_clean", volume: 0.66, cooldownMs: 1800 },
  bossLandingImpact: { key: "boss_landing_impact_clean", volume: 0.86, cooldownMs: 1200 },
  bossMachineBedPhase1: { key: "boss_machine_bed_phase_1_clean", volume: 0.15, cooldownMs: 300, loop: true },
  bossMachineBedPhase2: { key: "boss_machine_bed_phase_2_clean", volume: 0.19, cooldownMs: 300, loop: true },
  bossMachineBedPhase3: { key: "boss_machine_bed_phase_3_clean", volume: 0.25, cooldownMs: 300, loop: true },
  bossPhaseTransition: { key: "boss_phase_overload_clean", volume: 0.72, cooldownMs: 1100 },
  bossVoiceGlitch: { key: "boss_phase_overload_clean", volume: 0.18, cooldownMs: 1400 },
  bulletVolley: { key: "turret_shot_clean", volume: 0.25, cooldownMs: 160 },
  destructionBlastCharge: { key: "destruction_charge_clean", volume: 0.60, cooldownMs: 650 },
  destructionBlastFire: { key: "destruction_fire_clean", volume: 0.76, cooldownMs: 450 },
  droneBombExplode: { key: "drone_bomb_explosion_clean", volume: 0.58, cooldownMs: 130 },
  droneBombFall: { key: "drone_bomb_fall_clean", volume: 0.30, cooldownMs: 120 },
  droneLocking: { key: "drone_locking_beep_clean", volume: 0.48, cooldownMs: 145 },
  droneSweepWarning: { key: "drone_locking_beep_clean", volume: 0.46, cooldownMs: 900 },
  gravityFieldCollapse: { key: "gravity_collapse_clean", volume: 0.66, cooldownMs: 1200 },
  gravityFieldStart: { key: "gravity_start_clean", volume: 0.62, cooldownMs: 1000 },
  gravityFieldLoop: { key: "gravity_loop_clean", volume: 0.22, cooldownMs: 1000 },
  laserCharge: { key: "laser_charge_clean", volume: 0.62, cooldownMs: 520 },
  laserFire: { key: "laser_fire_clean", volume: 0.74, cooldownMs: 340 },
  menacingAdvanceCharge: { key: "menacing_charge_clean", volume: 0.60, cooldownMs: 800 },
  menacingAdvanceDash: { key: "menacing_dash_clean", volume: 0.72, cooldownMs: 420 },
  phaseTitle: { key: "boss_phase_overload_clean", volume: 0.30, cooldownMs: 1000 },
  rayWarningLineLock: { key: "laser_charge_clean", volume: 0.28, cooldownMs: 520 },
  treeBreak: { key: "tree_barrier_break_clean", volume: 0.58, cooldownMs: 260 },
  playerJump: { key: "player_dash_clean", volume: 0.18, cooldownMs: 120 },
  playerDoubleJump: { key: "player_blink_clean", volume: 0.16, cooldownMs: 140 },
  playerLand: { key: "tree_barrier_break_clean", volume: 0.12, cooldownMs: 140 },
  treeCast: { key: "tree_barrier_raise_clean", volume: 0.54, cooldownMs: 300 },
  treeGrow: { key: "tree_barrier_raise_clean", volume: 0.38, cooldownMs: 380 },
  treeHit: { key: "tree_barrier_break_clean", volume: 0.22, cooldownMs: 150 },
  turretDestroy: { key: "drone_bomb_explosion_clean", volume: 0.36, cooldownMs: 220 },
  turretShot: { key: "turret_shot_clean", volume: 0.25, cooldownMs: 75 },
  turretSpawn: { key: "turret_deploy_clean", volume: 0.50, cooldownMs: 300 },
  uiWarning: { key: "laser_charge_clean", volume: 0.20, cooldownMs: 300 }
});

export default class AudioCueManager {
  constructor(scene) {
    this.scene = scene;
    const config = scene.registry.get("gameConfig") || {};
    this.audioConfig = config.audio || {};
    this.enabled = this.audioConfig.enabled !== false;
    this.masterVolume = Number.isFinite(this.audioConfig.masterVolume)
      ? this.audioConfig.masterVolume
      : 0.35;
    this.cues = this.audioConfig.cues || {};
    this.directCues = { ...DEFAULT_DIRECT_CUES, ...(this.audioConfig.directCues || {}) };
    this.lastPlayedAt = new Map();
    this.activeLoops = new Map();
    this.sequenceCounters = new Map();
    this.listener = (payload) => this.playFrameCue(payload);
  }

  start() {
    if (!this.enabled) return this;
    this.scene.events.on("sprite-frame-sound", this.listener);
    return this;
  }

  stop() {
    this.scene.events.off("sprite-frame-sound", this.listener);
    for (const sound of this.activeLoops.values()) {
      sound?.destroy?.();
    }
    this.activeLoops.clear();
  }

  play(cueName, options = {}) {
    if (!this.enabled || !cueName || DISABLED_PLAYER_CUES.has(cueName)) return null;

    const cue = this.directCues[cueName] || this.cues[cueName];
    if (!cue) return null;

    const key = this.resolveCueKey(cue, cueName, options);
    if (!key) return null;

    return this.playKey(key, {
      ...cue,
      ...options,
      cooldownName: options.cooldownName || cueName
    });
  }

  resolveCueKey(cue, cueName = "cue", options = {}) {
    if (cue.key) return cue.key;
    const keys = cue.keys || cue.keyList;
    if (!Array.isArray(keys) || keys.length <= 0) return null;

    if (Number.isInteger(options.index)) {
      return keys[Phaser.Math.Clamp(options.index, 0, keys.length - 1)];
    }

    if (cue.sequence) {
      const current = this.sequenceCounters.get(cueName) || 0;
      this.sequenceCounters.set(cueName, current + 1);
      return keys[current % keys.length];
    }

    return Phaser.Utils.Array.GetRandom(keys);
  }

  playKey(key, options = {}) {
    if (!this.enabled || !key) return null;

    const audioCache = this.scene.cache?.audio;
    const hasAudio = Boolean(audioCache?.exists?.(key) || audioCache?.has?.(key));
    if (!hasAudio) return null;

    const now = this.scene.time?.now || 0;
    const cooldownMs = Number.isFinite(options.cooldownMs) ? options.cooldownMs : 80;
    const cooldownName = options.cooldownName || key;
    const last = this.lastPlayedAt.get(cooldownName) || -Infinity;
    if (now - last < cooldownMs) return null;
    this.lastPlayedAt.set(cooldownName, now);

    return this.scene.sound.play(key, {
      volume: (Number.isFinite(options.volume) ? options.volume : 1) * this.masterVolume,
      rate: Number.isFinite(options.rate) ? options.rate : 1,
      detune: Number.isFinite(options.detune) ? options.detune : 0
    });
  }

  startLoop(cueName, options = {}) {
    if (!this.enabled || !cueName || DISABLED_PLAYER_CUES.has(cueName) || this.activeLoops.has(cueName)) return null;
    const cue = this.directCues[cueName] || this.cues[cueName];
    if (!cue) return null;
    const key = this.resolveCueKey(cue, cueName, options);
    if (!key) return null;
    const audioCache = this.scene.cache?.audio;
    const hasAudio = Boolean(audioCache?.exists?.(key) || audioCache?.has?.(key));
    if (!hasAudio) return null;

    const sound = this.scene.sound.add(key, {
      loop: true,
      volume: (Number.isFinite(options.volume) ? options.volume : (cue.volume ?? 1)) * this.masterVolume,
      rate: options.rate ?? cue.rate ?? 1
    });
    sound.play();
    this.activeLoops.set(cueName, sound);
    return sound;
  }

  stopLoop(cueName, fadeMs = 0) {
    const sound = this.activeLoops.get(cueName);
    if (!sound) return;
    this.activeLoops.delete(cueName);

    if (fadeMs > 0 && this.scene.tweens) {
      this.scene.tweens.add({
        targets: sound,
        volume: 0,
        duration: fadeMs,
        onComplete: () => sound.destroy()
      });
    } else {
      sound.destroy();
    }
  }

  playFrameCue(payload = {}) {
    if (!this.enabled || !payload.sound || DISABLED_PLAYER_CUES.has(payload.sound)) return;

    const cue = this.cues[payload.sound] || this.directCues[payload.sound];
    if (!cue) return;
    const key = this.resolveCueKey(cue, payload.sound, payload);
    if (!key) return;
    const audioCache = this.scene.cache?.audio;
    const hasAudio = Boolean(audioCache?.exists?.(key) || audioCache?.has?.(key));
    if (!hasAudio) return;

    const now = this.scene.time?.now || 0;
    const cooldownMs = Number.isFinite(cue.cooldownMs) ? cue.cooldownMs : 80;
    const cooldownKey = `${payload.spriteKey || "sprite"}:${payload.sequenceKey || "sequence"}:${payload.sound}`;
    const last = this.lastPlayedAt.get(cooldownKey) || -Infinity;
    if (now - last < cooldownMs) return;
    this.lastPlayedAt.set(cooldownKey, now);

    this.scene.sound.play(key, {
      volume: (Number.isFinite(cue.volume) ? cue.volume : 1) * this.masterVolume,
      rate: Number.isFinite(cue.rate) ? cue.rate : 1
    });
  }
}
