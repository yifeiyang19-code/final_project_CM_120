export default class BossBgmManager {
  constructor(scene) {
    this.scene = scene;
    this.music = null;
    this.machineBed = null;
    this.currentMachineBedCue = null;
    this.started = false;
    this.currentPhase = 1;
    this.config = scene.registry.get("gameConfig")?.audio?.bgm || {};
  }

  start() {
    if (this.started || this.scene.gameOver) return;
    if (!this.scene.sound || !this.scene.cache.audio.exists("bgm_boss_main")) {
      console.warn("[BossBgmManager] Missing bgm_boss_main audio asset.");
      return;
    }

    const audioConfig = this.scene.registry.get("gameConfig")?.audio || {};
    if (audioConfig.enabled === false) return;

    const volume = Number.isFinite(this.config.volume)
      ? this.config.volume
      : Phaser.Math.Clamp((audioConfig.masterVolume ?? 0.35) * 0.72, 0, 1);

    this.music = this.scene.sound.add("bgm_boss_main", {
      loop: Boolean(this.config.loop ?? false),
      volume: 0
    });

    this.music.play();
    this.scene.tweens.add({
      targets: this.music,
      volume,
      duration: this.config.fadeInMs ?? 1200,
      ease: "Sine.easeOut"
    });

    this.started = true;
    this.setPhase(this.scene.bossPhase || 1, true);
  }

  getMachineBedCue(phase) {
    if (phase >= 3) return "bossMachineBedPhase3";
    if (phase >= 2) return "bossMachineBedPhase2";
    return "bossMachineBedPhase1";
  }

  setPhase(phase, immediate = false) {
    this.currentPhase = phase;

    
    
    
    if (!this.started || !this.scene.audioCues) return;

    const cueName = this.getMachineBedCue(phase);
    if (cueName === this.currentMachineBedCue) return;

    const oldCue = this.currentMachineBedCue;
    this.currentMachineBedCue = cueName;

    if (oldCue) {
      this.scene.audioCues.stopLoop(oldCue, immediate ? 0 : 450);
    }

    const phaseVolume = phase >= 3 ? 0.10 : phase >= 2 ? 0.07 : 0.04;
    this.machineBed = this.scene.audioCues.startLoop(cueName, {
      volume: phaseVolume
    });
  }

  fadeOut(duration = 900) {
    if (this.currentMachineBedCue) {
      this.scene.audioCues?.stopLoop?.(this.currentMachineBedCue, Math.min(duration, 450));
      this.currentMachineBedCue = null;
      this.machineBed = null;
    }

    if (!this.music) return;

    this.scene.tweens.killTweensOf(this.music);
    this.scene.tweens.add({
      targets: this.music,
      volume: 0,
      duration,
      ease: "Sine.easeIn",
      onComplete: () => this.stop()
    });
  }

  stop() {
    if (this.currentMachineBedCue) {
      this.scene.audioCues?.stopLoop?.(this.currentMachineBedCue, 0);
      this.currentMachineBedCue = null;
      this.machineBed = null;
    }

    if (this.music) {
      this.scene.tweens.killTweensOf(this.music);
      this.music.stop();
      this.music.destroy();
      this.music = null;
    }
    this.started = false;
  }

  destroy() {
    this.stop();
  }
}
