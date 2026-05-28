export default class HitStopManager {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.timeoutId = null;
  }

  trigger(durationMs = 50, timeScale = 0.04) {
    const scene = this.scene;
    if (!scene || this.active || durationMs <= 0) return;

    this.active = true;
    const previousClockScale = scene.time.timeScale ?? 1;
    const previousPhysicsScale = scene.physics?.world?.timeScale ?? 1;

    scene.time.timeScale = timeScale;
    if (scene.physics?.world) {
      scene.physics.world.timeScale = timeScale;
    }

    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      if (!scene.sys?.isActive()) {
        this.active = false;
        return;
      }

      
      
      scene.time.timeScale = scene.__pauseMenuOpen ? 0 : Math.max(previousClockScale, 1);
      if (scene.physics?.world) {
        scene.physics.world.timeScale = Math.max(previousPhysicsScale, 1);
      }
      this.active = false;
    }, durationMs);
  }

  destroy() {
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.active = false;
    if (this.scene?.time) this.scene.time.timeScale = 1;
    if (this.scene?.physics?.world) this.scene.physics.world.timeScale = 1;
  }
}
