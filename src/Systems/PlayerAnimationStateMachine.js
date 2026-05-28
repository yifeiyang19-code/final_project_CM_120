import InputBuffer from "./InputBuffer.js";

export default class PlayerAnimationStateMachine {
  constructor(scene, player, options = {}) {
    this.scene = scene;
    this.player = player;
    this.buffer = new InputBuffer(scene, options.bufferWindowMs ?? 140);
    this.stateDefinitions = scene.registry.get("gameConfig")?.player?.states || this.defaultStateDefinitions();
    this.movementLayer = "idle";
    this.actionLayer = "none";
    this.actionLockedUntil = 0;
    this.lastAnimation = null;
  }

  defaultStateDefinitions() {
    return {
      idle: { animation: "player_idle_anim", layer: "movement" },
      run: { animation: "player_run_anim", layer: "movement" },
      walk: { animation: "player_walk_anim", layer: "movement" },
      jump: { animation: "player_jump_anim", layer: "movement" },
      fall: { animation: "player_jump_anim", layer: "movement" },
      climb: { animation: "player_walk_anim", layer: "movement" },
      hurt: { animation: "player_hurt_anim", layer: "action", lockMs: 180 },
      dead: { animation: "player_dead_anim", layer: "action", lockMs: 999999 },
      defend: { animation: "player_defend_anim", layer: "action", lockMs: 0 }
    };
  }

  update() {
    this.buffer.expire();

    if (this.actionLayer !== "none" && this.scene.time.now >= this.actionLockedUntil) {
      this.actionLayer = "none";
    }
  }

  isActionLocked() {
    this.update();
    return this.actionLayer !== "none" && this.scene.time.now < this.actionLockedUntil;
  }

  requestMovement(state) {
    this.update();
    this.movementLayer = state;

    if (this.isActionLocked()) return false;

    const animationKey = this.animationForState(state, "movement");
    if (!animationKey) return false;

    return this.play(animationKey, true);
  }

  requestAction(state, options = {}) {
    const definition = this.stateDefinitions[state] || {};
    const duration = options.lockMs ?? definition.lockMs ?? 0;
    this.actionLayer = state;
    this.actionLockedUntil = this.scene.time.now + duration;

    const animationKey = this.animationForState(state, "action");
    if (animationKey) {
      this.play(animationKey, options.ignoreIfPlaying !== false);
    }

    return true;
  }

  bufferAction(action, payload = {}, windowMs = 140) {
    this.buffer.push(action, payload, windowMs);
  }

  consumeBufferedAction(action) {
    if (this.isActionLocked()) return null;
    return this.buffer.consume(action);
  }

  animationForState(state, expectedLayer) {
    const definition = this.stateDefinitions[state];
    if (!definition) return null;
    if (expectedLayer && definition.layer && definition.layer !== expectedLayer) return null;
    return definition.animation || null;
  }

  play(animationKey, restart = true) {
    if (!this.player || !this.player.active) return false;
    if (!this.scene.anims.exists(animationKey)) return false;

    this.player.play(animationKey, restart);
    this.lastAnimation = animationKey;
    return true;
  }
}
