export default class InputBuffer {
  constructor(scene, defaultWindowMs = 130) {
    this.scene = scene;
    this.defaultWindowMs = defaultWindowMs;
    this.buffer = new Map();
  }

  push(action, payload = {}, windowMs = this.defaultWindowMs) {
    this.buffer.set(action, {
      action,
      payload,
      expiresAt: this.scene.time.now + windowMs
    });
  }

  has(action) {
    this.expire();
    return this.buffer.has(action);
  }

  consume(action) {
    this.expire();
    const entry = this.buffer.get(action);
    if (!entry) return null;
    this.buffer.delete(action);
    return entry;
  }

  clear(action = null) {
    if (action) {
      this.buffer.delete(action);
      return;
    }
    this.buffer.clear();
  }

  expire() {
    const now = this.scene.time.now;
    for (const [action, entry] of this.buffer.entries()) {
      if (entry.expiresAt <= now) this.buffer.delete(action);
    }
  }
}
